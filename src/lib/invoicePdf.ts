/**
 * invoicePdf.ts — Server-side PDF generation for technician invoices.
 *
 * Uses jsPDF with embedded Roboto + Cinzel fonts for SK/CZ diacritics.
 * Mirrors the visual design of invoiceTemplate.ts (light ZR brand).
 * Called server-side from /api/dispatch/invoice/pdf/route.ts.
 *
 * Returns base64-encoded PDF string.
 */

import { jsPDF } from 'jspdf'
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from './fonts/roboto-base64'
import { CINZEL_REGULAR_BASE64, CINZEL_BOLD_BASE64 } from './fonts/cinzel-base64'
import { getLogoBase64 } from './pdfBrandUtils'
import type { InvoiceData, InvoiceLineItem, TechnicianBillingData, CompanyBuyerData } from '@/types/dispatch'

// ── Page constants ─────────────────────────────────────────────────────────

const MARGIN   = 18
const PAGE_W   = 210
const PAGE_H   = 297
const CONTENT_W = PAGE_W - 2 * MARGIN
const LINE_H   = 5.5

// ── Color palette (light ZR brand) ────────────────────────────────────────

const GOLD           = '#D4A843'
const GOLD_DARK      = '#aa771c'
const LT_GOLD        = '#9a7b2e'
const DARK           = '#1a1a1a'
const BODY_TEXT      = '#333333'
const GRAY           = '#888888'
const MUTED          = '#999999'
const LIGHT_GRAY_R   = 233
const LIGHT_GRAY_G   = 233
const LIGHT_GRAY_B   = 233
const PAGE_BG_R      = 250
const PAGE_BG_G      = 249
const PAGE_BG_B      = 247
const TABLE_HDR_R    = 248
const TABLE_HDR_G    = 244
const TABLE_HDR_B    = 238
const CARD_BG_R      = 255
const CARD_BG_G      = 255
const CARD_BG_B      = 255
const TOTAL_BG_R     = 212
const TOTAL_BG_G     = 168
const TOTAL_BG_B     = 67

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    const [y, m, d] = iso.split('-')
    return `${d}.${m}.${y}`
  } catch {
    return iso
  }
}

function formatCzk(amount: number, currency?: 'CZK' | 'EUR'): string {
  const suffix = currency === 'EUR' ? ' EUR' : ' Kč'
  return amount
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + suffix
}

function dphLabel(rate: number): string {
  if (rate === 0) return '0 %'
  return `${rate} %`
}

// ── Font setup helper ──────────────────────────────────────────────────────

function setupFonts(doc: jsPDF): void {
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64)
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
  doc.addFileToVFS('Cinzel-Regular.ttf', CINZEL_REGULAR_BASE64)
  doc.addFont('Cinzel-Regular.ttf', 'Cinzel', 'normal')
  doc.addFileToVFS('Cinzel-Bold.ttf', CINZEL_BOLD_BASE64)
  doc.addFont('Cinzel-Bold.ttf', 'Cinzel', 'bold')
  doc.setFont('Roboto', 'normal')
}

// ── Section heading (gold underline, Cinzel) ───────────────────────────────

function drawSectionHeading(doc: jsPDF, y: number, title: string): number {
  doc.setFont('Cinzel', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(LT_GOLD)
  doc.text(title.toUpperCase(), MARGIN, y)
  y += 1.5
  doc.setDrawColor(GOLD)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, y, MARGIN + 45, y)
  doc.setDrawColor('#EDE4CD')
  doc.setLineWidth(0.2)
  doc.line(MARGIN + 45, y, PAGE_W - MARGIN, y)
  y += 4
  return y
}

// ── Page break guard ───────────────────────────────────────────────────────

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN - 8) {
    doc.addPage()
    doc.setFillColor(PAGE_BG_R, PAGE_BG_G, PAGE_BG_B)
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
    // Continuation header
    doc.setFillColor(CARD_BG_R, CARD_BG_G, CARD_BG_B)
    doc.rect(MARGIN, MARGIN - 2, CONTENT_W, 7, 'F')
    doc.setFillColor(GOLD)
    doc.rect(MARGIN, MARGIN - 2, 2, 7, 'F')
    doc.setFont('Cinzel', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(LT_GOLD)
    doc.text('ZLATÍ ŘEMESLNÍCI', MARGIN + 4, MARGIN + 2.5)
    doc.setTextColor(DARK)
    return MARGIN + 9
  }
  return y
}

// ── Supplier block ─────────────────────────────────────────────────────────

function drawSupplierBlock(doc: jsPDF, x: number, y: number, w: number, s: TechnicianBillingData): number {
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(DARK)
  if (s.billing_name) {
    doc.text(s.billing_name, x + 4, y + 5)
    y += 5
  }
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(BODY_TEXT)
  const suppLines: string[] = []
  if (s.billing_street) suppLines.push(s.billing_street)
  if (s.billing_psc || s.billing_city) suppLines.push([s.billing_psc, s.billing_city].filter(Boolean).join(' '))
  if (s.ico) suppLines.push(`IČO: ${s.ico}`)
  if (s.dic) suppLines.push(`DIČ: ${s.dic}`)
  if (s.ic_dph) suppLines.push(`IČ DPH: ${s.ic_dph}`)
  if (s.registration) suppLines.push(`Reg.: ${s.registration}`)
  if (!s.platca_dph) suppLines.push('Neplátce DPH')
  for (const line of suppLines) {
    doc.text(line, x + 4, y + 4, { maxWidth: w - 8 })
    y += 4.5
  }
  return y
}

// ── Buyer block ────────────────────────────────────────────────────────────

function drawBuyerBlock(doc: jsPDF, x: number, y: number, w: number, b: CompanyBuyerData): number {
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(DARK)
  doc.text(b.name, x + 4, y + 5)
  y += 5
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(BODY_TEXT)
  const buyerLines = [
    b.street,
    `${b.psc} ${b.city}`,
    `IČO: ${b.ico}`,
    `DIČ: ${b.dic}`,
  ]
  for (const line of buyerLines) {
    doc.text(line, x + 4, y + 4, { maxWidth: w - 8 })
    y += 4.5
  }
  return y
}

// ── Bank details ───────────────────────────────────────────────────────────

function bankLine(s: TechnicianBillingData): string {
  const parts: string[] = []
  if (s.bank_account_number) {
    const acct = s.bank_code
      ? `${s.bank_account_number}/${s.bank_code}`
      : s.bank_account_number
    parts.push(`Č. účtu: ${acct}`)
  }
  if (s.iban) parts.push(`IBAN: ${s.iban}`)
  return parts.join('  ·  ') || '—'
}

// ── Main PDF Generator ─────────────────────────────────────────────────────

export function generateInvoicePdf(data: InvoiceData): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  setupFonts(doc)

  // Page background
  doc.setFillColor(PAGE_BG_R, PAGE_BG_G, PAGE_BG_B)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')

  const currency = data.currency || 'CZK'
  const fmt = (n: number) => formatCzk(n, currency)
  const isVatInvoice = data.dphRate !== 'non_vat_payer'
  const docType = isVatInvoice ? 'FAKTURA — DAŇOVÝ DOKLAD' : 'FAKTURA'

  let y = MARGIN

  // ── Gold top band ──────────────────────────────────────────────────────
  doc.setFillColor(GOLD)
  doc.rect(0, 0, PAGE_W, 3, 'F')
  y += 3

  // ── Header: logo + company name (left) + doc type (right) ─────────────
  const headerTop = y + 3
  let logoOffsetX = 0

  // Logo (circular, gold-bordered)
  const logoB64 = getLogoBase64()
  if (logoB64) {
    const logoSize = 12
    try {
      doc.addImage(logoB64, 'PNG', MARGIN, headerTop - 3, logoSize, logoSize)
      logoOffsetX = logoSize + 3
    } catch {
      // Logo render failed — continue without it
    }
  }

  doc.setFont('Cinzel', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(LT_GOLD)
  doc.text('Zlatí Řemeslníci', MARGIN + logoOffsetX, headerTop)

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(MUTED)
  if (data.supplier.billing_name) {
    doc.text(data.supplier.billing_name, MARGIN + logoOffsetX, headerTop + 5)
  }

  // Right side: doc type + invoice number
  doc.setFont('Cinzel', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(DARK)
  doc.text(docType, PAGE_W - MARGIN, headerTop, { align: 'right' })
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(MUTED)
  doc.text(`č. ${data.invoiceNumber || '—'}`, PAGE_W - MARGIN, headerTop + 6, { align: 'right' })

  y = headerTop + 12

  // ── Gold divider ───────────────────────────────────────────────────────
  doc.setDrawColor(GOLD)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, y, MARGIN + 50, y)
  doc.setDrawColor('#EDE4CD')
  doc.setLineWidth(0.2)
  doc.line(MARGIN + 50, y, PAGE_W - MARGIN, y)
  y += 6

  // ── Parties: Dodavatel (left) / Odběratel (right) ─────────────────────
  const halfW = (CONTENT_W - 6) / 2

  // Supplier card
  doc.setFillColor(CARD_BG_R, CARD_BG_G, CARD_BG_B)
  doc.setDrawColor(LIGHT_GRAY_R, LIGHT_GRAY_G, LIGHT_GRAY_B)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN, y, halfW, 36, 2, 2, 'FD')
  doc.setFillColor(GOLD)
  doc.rect(MARGIN, y, 2, 36, 'F')

  // Buyer card
  doc.setFillColor(CARD_BG_R, CARD_BG_G, CARD_BG_B)
  doc.setDrawColor(LIGHT_GRAY_R, LIGHT_GRAY_G, LIGHT_GRAY_B)
  doc.roundedRect(MARGIN + halfW + 6, y, halfW, 36, 2, 2, 'FD')

  // Label: Dodavatel
  doc.setFont('Cinzel', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(LT_GOLD)
  doc.text('DODAVATEL', MARGIN + 4, y - 1)

  // Label: Odběratel
  doc.text('ODBĚRATEL', MARGIN + halfW + 10, y - 1)

  // Supplier content
  const supplierStartY = y + 2
  drawSupplierBlock(doc, MARGIN, supplierStartY, halfW, data.supplier)

  // Buyer content
  const buyerStartY = y + 2
  drawBuyerBlock(doc, MARGIN + halfW + 6, buyerStartY, halfW, data.buyer)

  y += 40

  // ── Dates + payment row ───────────────────────────────────────────────
  y = checkPageBreak(doc, y, 16)

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(MUTED)

  const dateColW = CONTENT_W / 4
  const dateLabels = ['Datum vystavení', 'DUZP', 'Datum splatnosti', 'Var. symbol']
  const dateValues = [
    formatDate(data.issueDate),
    formatDate(data.taxableDate),
    formatDate(data.dueDate),
    data.variabilniSymbol || '—',
  ]
  for (let i = 0; i < 4; i++) {
    const dx = MARGIN + i * dateColW
    doc.text(dateLabels[i], dx, y)
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(DARK)
    doc.text(dateValues[i], dx, y + 5)
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(MUTED)
  }
  y += 10

  // Bank details row
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(MUTED)
  doc.text('Bankovní spojení', MARGIN, y)
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(DARK)
  doc.text(bankLine(data.supplier), MARGIN, y + 4.5)
  y += 10

  // ── Gold divider before items table ───────────────────────────────────
  doc.setDrawColor(GOLD)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, y, MARGIN + 50, y)
  doc.setDrawColor('#EDE4CD')
  doc.setLineWidth(0.2)
  doc.line(MARGIN + 50, y, PAGE_W - MARGIN, y)
  y += 6

  // ── Items table ───────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 20)
  y = drawSectionHeading(doc, y, 'Položky faktury')

  // Column widths: Description | Qty | Unit | Unit price | Base | Rate | VAT | Total
  const cols = [58, 12, 12, 22, 22, 12, 18, 18]
  const colHeaders = ['Popis', 'Mn.', 'Jedn.', 'Jedn. cena', 'Základ DPH', 'Sazba', 'DPH', 'Celkem']
  const rightAlignCols = [1, 3, 4, 5, 6, 7]

  // Table header row
  doc.setFillColor(TABLE_HDR_R, TABLE_HDR_G, TABLE_HDR_B)
  doc.rect(MARGIN, y - 4, CONTENT_W, 7, 'F')
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(LT_GOLD)

  let cx = MARGIN + 2
  colHeaders.forEach((h, i) => {
    if (rightAlignCols.includes(i)) {
      doc.text(h, cx + cols[i] - 2, y, { align: 'right' })
    } else {
      doc.text(h, cx, y)
    }
    cx += cols[i]
  })
  y += 5

  // Table rows
  doc.setFontSize(8)
  for (let ri = 0; ri < data.items.length; ri++) {
    const item: InvoiceLineItem = data.items[ri]
    y = checkPageBreak(doc, y, 7)

    if (ri % 2 === 0) {
      doc.setFillColor(CARD_BG_R, CARD_BG_G, CARD_BG_B)
      doc.rect(MARGIN, y - 3.5, CONTENT_W, 6.5, 'F')
    } else {
      doc.setFillColor(250, 250, 250)
      doc.rect(MARGIN, y - 3.5, CONTENT_W, 6.5, 'F')
    }

    doc.setFont('Roboto', 'normal')
    doc.setTextColor(BODY_TEXT)
    cx = MARGIN + 2

    // Description (truncate if needed)
    const desc = item.description.length > 34 ? item.description.substring(0, 32) + '…' : item.description
    doc.text(desc, cx, y); cx += cols[0]

    // Qty — right aligned
    doc.text(`${item.quantity}`, cx + cols[1] - 2, y, { align: 'right' }); cx += cols[1]

    // Unit — centered
    doc.text(item.unit || '', cx + cols[2] / 2, y, { align: 'center' }); cx += cols[2]

    // Unit price — right aligned
    doc.text(fmt(item.unitPrice), cx + cols[3] - 2, y, { align: 'right' }); cx += cols[3]

    // Total without VAT — right aligned
    doc.text(fmt(item.totalWithoutVat), cx + cols[4] - 2, y, { align: 'right' }); cx += cols[4]

    // VAT rate
    doc.text(dphLabel(item.vatRate), cx + cols[5] - 2, y, { align: 'right' }); cx += cols[5]

    // VAT amount
    doc.text(fmt(item.vatAmount), cx + cols[6] - 2, y, { align: 'right' }); cx += cols[6]

    // Total with VAT — bold
    doc.setFont('Roboto', 'bold')
    doc.text(fmt(item.totalWithVat), cx + cols[7] - 2, y, { align: 'right' })
    doc.setFont('Roboto', 'normal')

    y += LINE_H
  }

  // Bottom border of table
  doc.setDrawColor(LIGHT_GRAY_R, LIGHT_GRAY_G, LIGHT_GRAY_B)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y - 1, PAGE_W - MARGIN, y - 1)
  y += 4

  // ── Summary: subtotal / VAT / grand total ─────────────────────────────
  y = checkPageBreak(doc, y, 30)

  const sumW = 90
  const sumX = PAGE_W - MARGIN - sumW

  // Subtotal without VAT
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(MUTED)
  doc.text('Celkem bez DPH:', sumX, y)
  doc.setFont('Roboto', 'bold')
  doc.setTextColor(DARK)
  doc.text(fmt(data.subtotal), PAGE_W - MARGIN, y, { align: 'right' })
  y += LINE_H + 1

  // VAT
  doc.setFont('Roboto', 'normal')
  doc.setTextColor(MUTED)
  doc.text('DPH:', sumX, y)
  doc.setFont('Roboto', 'bold')
  doc.setTextColor(DARK)
  doc.text(fmt(data.vatTotal), PAGE_W - MARGIN, y, { align: 'right' })
  y += LINE_H + 2

  // Grand total — gold badge
  doc.setFillColor(TOTAL_BG_R, TOTAL_BG_G, TOTAL_BG_B)
  doc.roundedRect(sumX - 4, y - 4, sumW + 4, 10, 2, 2, 'F')
  doc.setFont('Cinzel', 'bold')
  doc.setFontSize(9)
  doc.setTextColor('#ffffff')
  doc.text('CELKEM K ÚHRADĚ:', sumX, y)
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(11)
  doc.text(fmt(data.grandTotal), PAGE_W - MARGIN - 2, y, { align: 'right' })
  y += 12

  // ── Payment breakdown (if surcharge split) ────────────────────────────
  // Faktúra technika obsahuje LEN čo ZR platí (paymentFromZR).
  // Doplatok klienta nie je na faktúre — grandTotal = paymentFromZR.
  // Rozklad platby sa zobrazí len ak grandTotal ≠ paymentFromZR (edge case).
  const pb = data.paymentBreakdown
  if (pb && pb.clientSurcharge > 0 && Math.abs(data.grandTotal - pb.paymentFromZR) > 1) {
    y = checkPageBreak(doc, y, 40)
    y += 2
    y = drawSectionHeading(doc, y, 'Rozklad platby')

    doc.setFont('Roboto', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(BODY_TEXT)
    doc.text('Celkem k úhradě (s DPH):', MARGIN + 4, y)
    doc.setFont('Roboto', 'bold')
    doc.text(fmt(data.grandTotal), PAGE_W - MARGIN, y, { align: 'right' })
    y += LINE_H + 1

    doc.setFont('Roboto', 'normal')
    doc.setTextColor('#DC2626')
    doc.text('Z toho hradí klient (doplatek s DPH):', MARGIN + 4, y)
    doc.setFont('Roboto', 'bold')
    doc.text(`−${fmt(pb.clientSurchargeWithVat)}`, PAGE_W - MARGIN, y, { align: 'right' })
    y += LINE_H + 3

    doc.setDrawColor(GOLD)
    doc.setLineWidth(0.3)
    doc.line(MARGIN + 4, y - 1, PAGE_W - MARGIN, y - 1)

    doc.setFont('Roboto', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(DARK)
    doc.text('K úhradě od Zlatí Řemeslníci:', MARGIN + 4, y + 3)
    doc.text(fmt(pb.paymentFromZR), PAGE_W - MARGIN, y + 3, { align: 'right' })
    y += LINE_H + 6
  }

  // ── QR codes (payment + accounting import) ─────────────────────────────
  if (data.payBySquareQr || data.invoiceBySquareQr) {
    y = checkPageBreak(doc, y, 50)
    y += 2

    const halfW = CONTENT_W / 2
    const qrSize = 30
    const qrStartY = y

    // Left: QR Platba
    if (data.payBySquareQr) {
      doc.setFont('Cinzel', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(LT_GOLD)
      doc.text('QR PLATBA', MARGIN + halfW / 2, y, { align: 'center' })

      try {
        let qrData = data.payBySquareQr
        if (qrData.includes(',')) qrData = qrData.split(',')[1]
        doc.addImage(qrData, 'PNG', MARGIN + (halfW - qrSize) / 2, y + 3, qrSize, qrSize)
        doc.setFont('Roboto', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(MUTED)
        doc.text('Naskenujte v bankovní aplikaci', MARGIN + halfW / 2, y + qrSize + 6, { align: 'center' })
        doc.text('pro okamžitou platbu', MARGIN + halfW / 2, y + qrSize + 10, { align: 'center' })
      } catch {
        // QR render failed — skip silently
      }
    }

    // Right: Import do účetnictví
    if (data.invoiceBySquareQr) {
      const rightX = MARGIN + halfW
      doc.setFont('Cinzel', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(LT_GOLD)
      doc.text('IMPORT DO ÚČETNICTVÍ', rightX + halfW / 2, y, { align: 'center' })

      try {
        let qrData = data.invoiceBySquareQr
        if (qrData.includes(',')) qrData = qrData.split(',')[1]
        doc.addImage(qrData, 'PNG', rightX + (halfW - qrSize) / 2, y + 3, qrSize, qrSize)
        doc.setFont('Roboto', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(MUTED)
        doc.text('Naskenujte pro automatický', rightX + halfW / 2, y + qrSize + 6, { align: 'center' })
        doc.text('import faktury', rightX + halfW / 2, y + qrSize + 10, { align: 'center' })
      } catch {
        // QR render failed — skip silently
      }
    }

    y = qrStartY + qrSize + 16
  }

  // ── Note sections ─────────────────────────────────────────────────────
  if (data.note) {
    y = checkPageBreak(doc, y, 15)
    y += 2
    doc.setFillColor(CARD_BG_R, CARD_BG_G, CARD_BG_B)
    doc.setDrawColor(LIGHT_GRAY_R, LIGHT_GRAY_G, LIGHT_GRAY_B)
    doc.setLineWidth(0.3)
    const noteLines = doc.splitTextToSize(data.note, CONTENT_W - 10)
    const noteH = noteLines.length * 4.5 + 8
    doc.roundedRect(MARGIN, y - 2, CONTENT_W, noteH, 2, 2, 'FD')
    doc.setFillColor(GOLD)
    doc.rect(MARGIN, y - 2, 2, noteH, 'F')
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(BODY_TEXT)
    for (const line of noteLines) {
      doc.text(line, MARGIN + 5, y + 2)
      y += 4.5
    }
    y += 6
  }

  if (data.supplier.invoice_note) {
    y = checkPageBreak(doc, y, 15)
    y += 2
    const invNoteLines = doc.splitTextToSize(data.supplier.invoice_note, CONTENT_W - 10)
    const invNoteH = invNoteLines.length * 4.5 + 8
    doc.setFillColor(PAGE_BG_R, PAGE_BG_G, PAGE_BG_B)
    doc.setDrawColor(LIGHT_GRAY_R, LIGHT_GRAY_G, LIGHT_GRAY_B)
    doc.setLineWidth(0.3)
    doc.roundedRect(MARGIN, y - 2, CONTENT_W, invNoteH, 2, 2, 'FD')
    doc.setFillColor(GOLD)
    doc.rect(MARGIN, y - 2, 2, invNoteH, 'F')
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(BODY_TEXT)
    for (const line of invNoteLines) {
      doc.text(line, MARGIN + 5, y + 2)
      y += 4.5
    }
    y += 6
  }

  // DPH legal note for reverse charge / non-vat
  // Skip if data.note already contains the § 92a text (avoid duplication)
  if (data.dphRate === 'reverse_charge' && !(data.note && data.note.includes('92a'))) {
    y = checkPageBreak(doc, y, 10)
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(MUTED)
    doc.text('Daň odvede zákazník dle § 92a zákona o DPH', MARGIN, y)
    y += LINE_H + 2
  } else if (data.dphRate === 'non_vat_payer') {
    y = checkPageBreak(doc, y, 10)
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(MUTED)
    doc.text('Dodavatel není plátcem DPH. Faktura není daňovým dokladem.', MARGIN, y)
    y += LINE_H + 2
  }

  // ── Footer on all pages ───────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    // Gold bottom band
    doc.setFillColor(GOLD_DARK)
    doc.rect(0, 294, PAGE_W, 3, 'F')
    // Footer text
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(GRAY)
    const footerText = `Generováno: ${new Date().toLocaleString('cs-CZ')}  ·  ${data.invoiceNumber || ''}  ·  Zlatí Řemeslníci`
    doc.text(footerText, PAGE_W / 2, PAGE_H - 5, { align: 'center' })
  }

  return doc.output('datauristring').split(',')[1]
}
