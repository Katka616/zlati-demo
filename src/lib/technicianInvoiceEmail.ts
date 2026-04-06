/**
 * technicianInvoiceEmail.ts
 *
 * Sends invoice email to a CZ technician after system invoice generation.
 * Attachments: invoice PDF + ISDOC XML.
 * Fire-and-forget — caller must .catch() the returned Promise.
 */

import { isConfigured as isGmailConfigured, sendEmail } from '@/lib/gmail'
import { generateInvoicePdf } from '@/lib/invoicePdf'
import { generateIsdocXml, getIsdocFilename } from '@/lib/isdocExport'
import { renderTechnicianInvoice } from '@/lib/emailTemplates/templates'
import type { InvoiceData } from '@/types/dispatch'

export interface TechnicianInvoiceEmailOpts {
  invoiceData: InvoiceData
  technicianName: string
  technicianEmail: string
  jobRef: string
  method: 'system_generated' | 'self_issued'
}

export async function sendTechnicianInvoiceEmail(
  opts: TechnicianInvoiceEmailOpts
): Promise<void> {
  const { invoiceData, technicianName, technicianEmail, jobRef, method } = opts

  if (!isGmailConfigured()) {
    console.warn('[TechInvoiceEmail] Gmail not configured — skipping')
    return
  }

  const invoiceNumber = invoiceData.invoiceNumber || `ZR-${jobRef}`
  const grandTotal = `${invoiceData.grandTotal.toLocaleString('cs-CZ')} ${invoiceData.currency === 'EUR' ? '€' : 'Kč'}`
  const dueDate = invoiceData.dueDate
    ? invoiceData.dueDate.split('-').reverse().join('.')
    : '—'

  const attachments: Array<{ filename: string; content: Buffer | string; mimeType: string }> = []
  let hasIsdoc = false

  // PDF — only for system_generated (self_issued tech already has their own)
  if (method === 'system_generated') {
    try {
      const pdfBase64 = generateInvoicePdf(invoiceData)
      const safeNumber = invoiceNumber.replace(/[/\\:*?"<>|]/g, '-')
      attachments.push({
        filename: `${safeNumber}.pdf`,
        content: pdfBase64,
        mimeType: 'application/pdf',
      })
    } catch (err) {
      console.error('[TechInvoiceEmail] PDF generation failed:', err)
    }
  }

  // ISDOC XML — for both methods, but only if items exist and dphRate is set
  if (invoiceData.items.length > 0 && invoiceData.dphRate) {
    try {
      const xmlString = generateIsdocXml(invoiceData)
      const isdocFilename = invoiceData.invoiceNumber
        ? getIsdocFilename(invoiceData.invoiceNumber)
        : `ISDOC_${jobRef.replace(/[/\\:*?"<>|]/g, '_')}.xml`
      attachments.push({
        filename: isdocFilename,
        content: Buffer.from(xmlString, 'utf-8'),
        mimeType: 'application/xml',
      })
      hasIsdoc = true
    } catch (err) {
      console.error('[TechInvoiceEmail] ISDOC generation failed:', err)
    }
  }

  if (attachments.length === 0) {
    console.warn('[TechInvoiceEmail] No attachments generated — skipping email')
    return
  }

  const { subject, bodyHtml, bodyText } = renderTechnicianInvoice({
    techName: technicianName,
    invoiceNumber,
    grandTotal,
    dueDate,
    jobRef,
    hasIsdoc,
  })

  await sendEmail({
    to: technicianEmail,
    subject,
    body: bodyHtml,
    textBody: bodyText,
    attachments,
    fromAlias: process.env.ACCOUNTANT_FROM_ALIAS,
  })

  console.log(`[TechInvoiceEmail] Sent invoice ${invoiceNumber} to ${technicianEmail}`)
}
