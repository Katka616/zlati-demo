/**
 * Accountant Email Service — sends invoices to the accountant.
 *
 * Sends email with:
 * - ISDOC XML file(s) as attachments (for Premier import)
 * - Original invoice PDF/image as attachment (for archiving)
 * - Summary of what's included
 *
 * PRIMARY: Gmail API (uses same OAuth2 as intake, supports aliases)
 * FALLBACK: SMTP via nodemailer (legacy, for when Gmail not configured)
 *
 * Config:
 * - Gmail: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
 * - SMTP fallback: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * - ACCOUNTANT_EMAIL (default recipient)
 * - ACCOUNTANT_FROM_ALIAS (optional — Gmail "Send As" alias for accountant emails)
 */

import nodemailer from 'nodemailer'
import type { InvoiceData } from '@/types/dispatch'
import { generateIsdocXml, getIsdocFilename } from '@/lib/isdocExport'
import { generatePremierXml, getPremierFilename } from '@/lib/premierExport'
import { isConfigured as isGmailConfigured, sendEmail as gmailSendEmail } from '@/lib/gmail'

function esc(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface AccountantEmailOpts {
  to?: string               // override ACCOUNTANT_EMAIL
  subject?: string           // custom subject
  invoices: Array<{
    invoiceData: InvoiceData
    originalPdfDataUrl?: string  // base64 data URL of original PDF
    originalFilename?: string
    jobReference?: string
    jobCategory?: string
    technicianName?: string
  }>
  batchId?: string           // if sending a whole batch
  note?: string              // custom message
  csvFields?: string[] | null    // which CSV fields to include (null = all)
  outputFormats?: string[] | null // which file formats to attach: 'csv', 'isdoc', 'pdf' (null = all)
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// ---------------------------------------------------------------------------
// CSV generation — uses field definitions from accountantCsvFields.ts
// ---------------------------------------------------------------------------

import { ACCOUNTANT_CSV_FIELDS } from '@/lib/accountantCsvFields'

type InvoiceRow = AccountantEmailOpts['invoices'][number]

const dphRegimeLabel = (rate: string | null | undefined): string => {
  if (!rate) return ''
  if (rate === 'reverse_charge') return 'Reverse charge (§92a)'
  if (rate === 'non_vat_payer') return 'Neplatce DPH'
  return 'Standardni'
}

const dphRateLabel = (rate: string | null | undefined): string => {
  if (!rate) return ''
  if (rate === 'reverse_charge') return '0'
  if (rate === 'non_vat_payer') return '0'
  return `${rate}%`
}

/** Map field key → value getter */
const FIELD_GETTERS: Record<string, (inv: InvoiceRow) => string> = {
  invoiceNumber:    inv => inv.invoiceData.invoiceNumber || '',
  evidencniCislo:   inv => inv.invoiceData.evidencniCislo || '',
  issueDate:        inv => inv.invoiceData.issueDate || '',
  taxableDate:      inv => inv.invoiceData.taxableDate || '',
  dueDate:          inv => inv.invoiceData.dueDate || '',
  supplier:         inv => inv.invoiceData.supplier?.billing_name || '',
  ico:              inv => inv.invoiceData.supplier?.ico || '',
  dic:              inv => inv.invoiceData.supplier?.dic || '',
  variabilniSymbol: inv => inv.invoiceData.variabilniSymbol || '',
  subtotal:         inv => inv.invoiceData.subtotal?.toFixed(2) || '0.00',
  dphRate:          inv => dphRateLabel(inv.invoiceData.dphRate),
  vatTotal:         inv => inv.invoiceData.vatTotal?.toFixed(2) || '0.00',
  grandTotal:       inv => inv.invoiceData.grandTotal?.toFixed(2) || '0.00',
  currency:         inv => inv.invoiceData.currency || 'CZK',
  dphRegime:        inv => dphRegimeLabel(inv.invoiceData.dphRate),
  iban:             inv => inv.invoiceData.supplier?.iban || '',
  jobReference:     inv => inv.jobReference || '',
  technicianName:   inv => inv.technicianName || '',
}

/**
 * Generate CSV summary of invoices for Premier accounting software.
 * UTF-8 with BOM, semicolon-separated (CZ/SK locale standard).
 *
 * @param enabledKeys — which fields to include (from app_settings). null = all fields.
 */
function generateAccountantCsv(
  invoices: AccountantEmailOpts['invoices'],
  enabledKeys: string[] | null
): string {
  const BOM = '\uFEFF'
  const SEP = ';'

  // Filter fields by enabled keys (preserve definition order)
  const fields = enabledKeys
    ? ACCOUNTANT_CSV_FIELDS.filter(f => enabledKeys.includes(f.key))
    : ACCOUNTANT_CSV_FIELDS

  const csvEscape = (val: string): string => {
    if (val.includes(SEP) || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const headerLine = fields.map(f => f.header).join(SEP)
  const rows = invoices.map(inv =>
    fields.map(f => csvEscape((FIELD_GETTERS[f.key] || (() => ''))(inv))).join(SEP)
  )

  return BOM + headerLine + '\n' + rows.join('\n') + '\n'
}

function getTransporter() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

/**
 * Send invoices to the accountant via email.
 *
 * Attachments per invoice:
 * 1. ISDOC XML file (for Premier import)
 * 2. Original PDF/image (for archiving)
 */
export async function sendToAccountant(opts: AccountantEmailOpts): Promise<EmailResult> {
  if (!isGmailConfigured() && !getTransporter()) {
    return { success: false, error: 'Neither Gmail API nor SMTP configured' }
  }

  const to = opts.to || process.env.ACCOUNTANT_EMAIL
  if (!to) {
    return { success: false, error: 'No recipient — set ACCOUNTANT_EMAIL or provide "to" parameter' }
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@zlatiremeslnici.cz'
  const invoiceCount = opts.invoices.length
  const totalAmount = opts.invoices.reduce((sum, inv) => sum + (inv.invoiceData.grandTotal || 0), 0)
  const fmtKc = (n: number) => new Intl.NumberFormat('cs-CZ').format(Math.round(n)) + ' Kc'

  // Build subject
  const now = new Date()
  const timeStr = now.toISOString().slice(0, 16).replace('T', ' ') // "2026-04-04 14:32"

  const subject = opts.subject || (opts.batchId
    ? `Faktúry — dávka ${opts.batchId} — ${timeStr} (${invoiceCount} faktúr, ${fmtKc(totalAmount)})`
    : `Faktúry od technikov — ${timeStr} — ${invoiceCount} faktúr (${fmtKc(totalAmount)})`)

  // Determine which output formats to include
  const formats = opts.outputFormats && opts.outputFormats.length > 0
    ? new Set(opts.outputFormats)
    : new Set(['csv', 'isdoc', 'pdf']) // default = all

  const includeCsv = formats.has('csv')
  const includeIsdoc = formats.has('isdoc')
  const includePdf = formats.has('pdf')
  const includePremier = formats.has('premier')

  // Build HTML body — simple text, details are in attachments
  const pdfCount = includePdf ? opts.invoices.filter(i => i.originalPdfDataUrl).length : 0

  const attachmentList: string[] = []
  if (includeCsv) attachmentList.push('1&times; CSV prehled faktur')
  if (includeIsdoc) attachmentList.push(`${invoiceCount}&times; ISDOC XML (pro import do Premier)`)
  if (includePremier) attachmentList.push(`${invoiceCount}&times; Premier XML (pre import do Premier)`)
  if (pdfCount > 0) attachmentList.push(`${pdfCount}&times; PDF original faktur`)

  // Build invoice details table for the email body
  const invoiceRows = opts.invoices.map(inv => {
    const num = esc(inv.invoiceData.invoiceNumber || '')
    const techName = esc(inv.technicianName || inv.invoiceData.supplier?.billing_name || '')
    const jobRef = esc(inv.jobReference || '')
    const vs = esc(inv.invoiceData.variabilniSymbol || '')
    const total = inv.invoiceData.grandTotal != null ? fmtKc(inv.invoiceData.grandTotal) : ''
    return `<tr style="border-bottom:1px solid #eee">
        <td style="padding:4px 8px;font-size:13px">${num}</td>
        <td style="padding:4px 8px;font-size:13px">${techName}</td>
        <td style="padding:4px 8px;font-size:13px">${jobRef}</td>
        <td style="padding:4px 8px;font-size:13px">${vs}</td>
        <td style="padding:4px 8px;font-size:13px;text-align:right">${total}</td>
      </tr>`
  }).join('\n')

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:700px">
      <h2 style="color:#333;margin-bottom:4px">Zlatí Řemeslníci — Faktúry od technikov</h2>
      ${opts.batchId ? `<p style="color:#666;margin-top:0">Dávka: <strong>${esc(String(opts.batchId))}</strong></p>` : ''}
      ${opts.note ? `<p style="color:#666">${esc(opts.note)}</p>` : ''}

      <p>Dobrý den, v příloze posíláme <strong>${invoiceCount} faktur</strong> (celkem <strong>${fmtKc(totalAmount)}</strong>).</p>

      <table style="width:100%;border-collapse:collapse;margin:12px 0">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:6px 8px;font-size:12px;text-align:left;border-bottom:2px solid #ddd">Číslo faktúry</th>
            <th style="padding:6px 8px;font-size:12px;text-align:left;border-bottom:2px solid #ddd">Technik</th>
            <th style="padding:6px 8px;font-size:12px;text-align:left;border-bottom:2px solid #ddd">Zákazka</th>
            <th style="padding:6px 8px;font-size:12px;text-align:left;border-bottom:2px solid #ddd">Var. symbol</th>
            <th style="padding:6px 8px;font-size:12px;text-align:right;border-bottom:2px solid #ddd">Suma</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceRows}
        </tbody>
        <tfoot>
          <tr style="background:#f5f5f5;font-weight:bold">
            <td colspan="4" style="padding:6px 8px;font-size:13px">Celkem</td>
            <td style="padding:6px 8px;font-size:13px;text-align:right">${fmtKc(totalAmount)}</td>
          </tr>
        </tfoot>
      </table>

      ${attachmentList.length > 0 ? `
      <p style="color:#666;font-size:13px">
        Přílohy:<br>
        ${attachmentList.map(a => `&bull; ${a}`).join('<br>\n        ')}
      </p>` : ''}

      <p style="color:#999;font-size:11px;margin-top:24px">
        Odesláno automaticky ze systému Zlatí Řemeslníci CRM
      </p>
    </div>
  `

  // Build attachments based on selected formats
  const attachments: Array<{ filename: string; content: string | Buffer; contentType?: string }> = []

  for (const inv of opts.invoices) {
    // ISDOC XML
    if (includeIsdoc) {
      try {
        const isdocXml = generateIsdocXml(inv.invoiceData)
        const isdocFilename = getIsdocFilename(inv.invoiceData.invoiceNumber || `invoice-${Date.now()}`)
        attachments.push({
          filename: isdocFilename,
          content: isdocXml,
          contentType: 'application/xml',
        })
      } catch (err) {
        console.error('[AccountantEmail] ISDOC generation failed for', inv.invoiceData.invoiceNumber, err)
      }
    }

    // Premier XML
    if (includePremier) {
      try {
        const premierXml = generatePremierXml(inv.invoiceData, {
          jobReference: inv.jobReference,
          jobCategory: inv.jobCategory,
        })
        const premierFilename = getPremierFilename(inv.invoiceData.invoiceNumber || `invoice-${Date.now()}`)
        attachments.push({
          filename: premierFilename,
          content: premierXml,
          contentType: 'application/xml',
        })
      } catch (err) {
        console.error('[AccountantEmail] Premier XML generation failed for', inv.invoiceData.invoiceNumber, err)
      }
    }

    // Original PDF/image
    if (includePdf && inv.originalPdfDataUrl) {
      try {
        const match = inv.originalPdfDataUrl.match(/^data:([^;]+);base64,(.+)$/)
        if (match) {
          const [, mimeType, base64Data] = match
          if (!base64Data) {
            console.warn('[AccountantEmail] PDF data URL has empty base64 content — skipping')
            continue
          }
          const ext = mimeType === 'application/pdf' ? 'pdf' : mimeType.split('/')[1] || 'bin'
          attachments.push({
            filename: inv.originalFilename || `faktura-${inv.invoiceData.invoiceNumber || 'original'}.${ext}`,
            content: Buffer.from(base64Data, 'base64'),
            contentType: mimeType,
          })
        }
      } catch (err) {
        console.error('[AccountantEmail] PDF attachment failed:', err)
      }
    }
  }

  // CSV summary — first attachment for easy access
  if (includeCsv) {
    const today = new Date().toISOString().slice(0, 10)
    const csvContent = generateAccountantCsv(opts.invoices, opts.csvFields ?? null)
    attachments.unshift({
      filename: `faktury-prehled-${today}.csv`,
      content: csvContent,
      contentType: 'text/csv',
    })
  }

  console.log(
    `[AccountantEmail] Prepared ${attachments.length} attachment(s):`,
    attachments.map(a => `${a.filename} (${a.contentType})`).join(', ')
  )

  // Try Gmail API first, then SMTP fallback
  if (isGmailConfigured()) {
    try {
      const gmailAttachments = attachments.map(a => ({
        filename: a.filename,
        content: typeof a.content === 'string' ? Buffer.from(a.content, 'utf-8') : a.content as Buffer,
        mimeType: a.contentType || 'application/octet-stream',
      }))

      const fromAlias = process.env.ACCOUNTANT_FROM_ALIAS || undefined
      const result = await gmailSendEmail({
        to,
        subject,
        body: html,
        fromAlias: fromAlias,
        attachments: gmailAttachments,
      })
      console.log(`[AccountantEmail] Sent via Gmail API: ${result.id}`)
      return { success: true, messageId: result.id }
    } catch (err) {
      console.error('[AccountantEmail] Gmail API send failed, trying SMTP fallback:', (err as Error).message)
    }
  }

  // SMTP fallback
  const smtpTransporter = getTransporter()
  if (!smtpTransporter) {
    return { success: false, error: 'Neither Gmail API nor SMTP configured' }
  }

  try {
    const info = await smtpTransporter.sendMail({
      from,
      to,
      subject,
      html,
      attachments,
    })
    return { success: true, messageId: info.messageId }
  } catch (err) {
    console.error('[AccountantEmail] SMTP send failed:', (err as Error).message)
    return { success: false, error: (err as Error).message }
  }
}

/**
 * Check if email sending is available (Gmail API or SMTP).
 */
export function isSmtpConfigured(): boolean {
  return isGmailConfigured() || !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}
