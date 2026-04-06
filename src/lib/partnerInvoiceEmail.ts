/**
 * partnerInvoiceEmail.ts — Send partner invoices via email.
 *
 * Renders subject/body from partner-specific templates,
 * collects configured attachments (PDF, protocol, photos),
 * and sends via Gmail API.
 */

import { isConfigured as isGmailConfigured, sendEmail } from '@/lib/gmail'
import { getPartnerInvoiceConfig } from '@/lib/db/invoiceConfigs'
import { query } from '@/lib/db'
import type { DBPartnerInvoiceConfig } from '@/lib/db/types'

// ── Template variables ──────────────────────────────────────────────────────

interface TemplateVars {
  INVOICE_NUMBER: string
  VS: string
  SUMA: string
  SUMA_BEZ_DPH: string
  JOB_REF: string
  PARTNER_NAME: string
  DUZP: string
  SPLATNOST: string
  KATEGORIA: string
  ZAKAZNIK: string
}

function renderTemplate(template: string, vars: TemplateVars): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value || '')
  }
  return result
}

const DEFAULT_BODY = `<p>Dobrý deň,</p>
<p>v prílohe zasielame faktúru č. <strong>{INVOICE_NUMBER}</strong> za zákazku {JOB_REF}.</p>
<ul>
  <li>Suma: {SUMA}</li>
  <li>Splatnosť: {SPLATNOST}</li>
  <li>VS: {VS}</li>
</ul>
<p>S pozdravom,<br>Zlatí Řemeslníci s.r.o.</p>`

// ── Attachment helpers ──────────────────────────────────────────────────────

interface EmailAttachment {
  filename: string
  content: Buffer | string
  mimeType: string
}

async function collectAttachments(
  invoiceId: number,
  jobId: number,
  config: DBPartnerInvoiceConfig,
  invoiceNumber: string
): Promise<EmailAttachment[]> {
  const attachments: EmailAttachment[] = []

  // PDF faktúry
  if (config.attach_pdf) {
    const pdfResult = await query<{ pdf_data: string }>(
      `SELECT pdf_data FROM partner_invoices WHERE id = $1 AND pdf_data IS NOT NULL`,
      [invoiceId]
    )
    if (pdfResult.rows[0]?.pdf_data) {
      const base64 = pdfResult.rows[0].pdf_data.replace(/^data:application\/pdf;base64,/, '')
      attachments.push({
        filename: `${invoiceNumber.replace(/\//g, '-')}.pdf`,
        content: base64,
        mimeType: 'application/pdf',
      })
    } else {
      console.warn(`[PartnerInvoiceEmail] PDF chýba pre faktúru ${invoiceId}, preskakujem PDF prílohu`)
    }
  }

  // Servisný protokol (fotky so source='protocol')
  if (config.attach_protocol) {
    const protocolPhotos = await query<{ filename: string; mime_type: string; data: string }>(
      `SELECT filename, mime_type, encode(data, 'base64') as data
       FROM job_photos WHERE job_id = $1 AND source = 'protocol' ORDER BY created_at ASC LIMIT 5`,
      [jobId]
    )
    for (const photo of protocolPhotos.rows) {
      attachments.push({
        filename: photo.filename || 'protokol.jpg',
        content: photo.data,
        mimeType: photo.mime_type || 'image/jpeg',
      })
    }
  }

  // Fotodokumentácia
  if (config.attach_photos) {
    const photos = await query<{ filename: string; mime_type: string; data: string }>(
      `SELECT filename, mime_type, encode(data, 'base64') as data
       FROM job_photos WHERE job_id = $1 AND source IN ('before', 'after', 'diagnostic')
       ORDER BY created_at ASC LIMIT 10`,
      [jobId]
    )
    for (const photo of photos.rows) {
      attachments.push({
        filename: photo.filename || 'foto.jpg',
        content: photo.data,
        mimeType: photo.mime_type || 'image/jpeg',
      })
    }
  }

  return attachments
}

// ── Main send function ──────────────────────────────────────────────────────

interface SendPartnerInvoiceEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send a partner invoice email. Call this after status transitions to 'issued'.
 * Returns { success: false } if email is not configured or sending fails.
 * Does NOT throw — caller handles the result.
 */
export async function sendPartnerInvoiceEmail(invoiceId: number): Promise<SendPartnerInvoiceEmailResult> {
  try {
    if (!isGmailConfigured()) {
      return { success: false, error: 'Gmail not configured' }
    }

    // Load invoice + job + partner data
    const invoiceResult = await query<Record<string, unknown>>(
      `SELECT pi.*, j.reference_number, j.customer_name, j.category,
              p.name AS partner_name, p.code AS partner_code, p.id AS p_id
       FROM partner_invoices pi
       JOIN jobs j ON j.id = pi.job_id
       JOIN partners p ON p.id = pi.partner_id
       WHERE pi.id = $1`,
      [invoiceId]
    )

    const inv = invoiceResult.rows[0]
    if (!inv) {
      return { success: false, error: `Invoice ${invoiceId} not found` }
    }

    // Load partner email config
    const config = await getPartnerInvoiceConfig(inv.p_id as number)
    if (!config || !config.auto_send_on_issue || !config.email_to) {
      return { success: false, error: 'Auto-send not configured for this partner' }
    }

    // Check PDF exists if configured
    if (config.attach_pdf) {
      const pdfCheck = await query<{ has_pdf: boolean }>(
        `SELECT (pdf_data IS NOT NULL) as has_pdf FROM partner_invoices WHERE id = $1`,
        [invoiceId]
      )
      if (!pdfCheck.rows[0]?.has_pdf) {
        console.warn(`[PartnerInvoiceEmail] PDF chýba pre faktúru ${invoiceId}, email nebude odoslaný`)
        return { success: false, error: 'PDF not generated yet' }
      }
    }

    // Build template variables
    const pricingSnapshot = inv.pricing_snapshot as Record<string, unknown> | null
    const totalWithVat = pricingSnapshot?.totalWithVat ?? inv.total_amount ?? 0
    const totalWithoutVat = pricingSnapshot?.totalWithoutVat ?? inv.amount ?? 0

    const vars: TemplateVars = {
      INVOICE_NUMBER: (inv.invoice_number as string) || '',
      VS: (inv.vs as string) || '',
      SUMA: `${Number(totalWithVat).toLocaleString('cs-CZ')} Kč`,
      SUMA_BEZ_DPH: `${Number(totalWithoutVat).toLocaleString('cs-CZ')} Kč`,
      JOB_REF: (inv.reference_number as string) || '',
      PARTNER_NAME: (inv.partner_name as string) || '',
      DUZP: inv.duzp ? new Date(inv.duzp as string).toLocaleDateString('cs-CZ') : '',
      SPLATNOST: inv.due_date ? new Date(inv.due_date as string).toLocaleDateString('cs-CZ') : '',
      KATEGORIA: (inv.category as string) || '',
      ZAKAZNIK: (inv.customer_name as string) || '',
    }

    // Render templates
    const subject = renderTemplate(config.email_subject_template, vars)
    const body = renderTemplate(config.email_body_template || DEFAULT_BODY, vars)

    // Collect attachments
    const attachments = await collectAttachments(
      invoiceId,
      inv.job_id as number,
      config,
      (inv.invoice_number as string) || `faktura-${invoiceId}`
    )

    // Parse CC addresses
    const ccAddresses = config.email_cc
      ? config.email_cc.split(',').map(e => e.trim()).filter(Boolean)
      : undefined

    // Send via Gmail
    const fromAlias = process.env.ACCOUNTANT_FROM_ALIAS || undefined
    const result = await sendEmail({
      to: config.email_to,
      cc: ccAddresses,
      subject,
      body,
      fromAlias,
      attachments: attachments.map(a => ({
        filename: a.filename,
        content: a.content,
        mimeType: a.mimeType,
      })),
    })

    console.log(`[PartnerInvoiceEmail] Email odoslaný pre faktúru ${invoiceId} → ${config.email_to}, messageId=${result.id}`)
    return { success: true, messageId: result.id }
  } catch (err) {
    console.error(`[PartnerInvoiceEmail] Chyba pri odosielaní emailu pre faktúru ${invoiceId}:`, err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
