/**
 * protocolPdf.ts — Server-side PDF generation for protocol documents.
 *
 * Uses jsPDF with embedded Roboto font for SK/CZ diacritics.
 * Called after client signs the protocol (from portal action API).
 *
 * Returns base64-encoded PDF string.
 */

import { jsPDF } from 'jspdf'
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from './fonts/roboto-base64'
import { CINZEL_REGULAR_BASE64, CINZEL_BOLD_BASE64 } from './fonts/cinzel-base64'
import { getCategoryLabel } from './constants'

// ── Types (subset of ProtocolFormData for PDF rendering) ───────────

interface PdfVisit {
  date: string
  arrival?: string
  departure?: string
  hours: number
  km: number
}

interface PdfMaterial {
  name: string
  qty: number
  unit: string
  price: number
  payer: string
}

interface PdfPhoto {
  label: string
  data: string // base64
}

export interface PdfProtocolInput {
  // Job info
  referenceNumber: string
  category: string
  customerName: string
  customerAddress: string
  customerCity: string
  insurance: string

  // Protocol content
  protocolType: string
  visits: PdfVisit[]
  workDescription: string
  materials: PdfMaterial[]
  photos: PdfPhoto[]

  // Totals
  totalHours: number
  totalKm: number

  // Multi-visit
  visitNumber?: number
  totalVisitsPlanned?: number
  isMultiVisit?: boolean
  nextVisitPlan?: string
  nextVisitReason?: string
  nextVisitDate?: string

  // Signatures
  techSignature?: string    // base64 PNG
  techSignerName?: string
  clientSignature?: string  // base64 PNG
  clientSignerName?: string

  // Signing metadata
  signingLocation?: string  // city where signed
  techNotes?: string        // technician notes

  // Client surcharge (doplatok)
  clientSurcharge?: number         // suma doplatku (bez DPH)
  clientSurchargeWithVat?: number  // suma doplatku (s DPH)
  surchargeIncludesVat?: boolean   // true = zobrazená suma je s DPH (technik je plátca)
  currency?: string                // 'Kč' | '€'

  // Metadata
  createdAt?: string        // ISO timestamp
  signedAt?: string         // ISO timestamp
}

// ── Constants ──────────────────────────────────────────────────────

const MARGIN = 20
const PAGE_W = 210 // A4 mm
const CONTENT_W = PAGE_W - 2 * MARGIN
const LINE_H = 5.5
const SECTION_GAP = 6

// Colors
const GOLD = '#D4A843'
const GOLD_LIGHT = '#F5F0E3'
const GOLD_DARK = '#aa771c'
const LT_GOLD = '#9a7b2e'
const DARK = '#1a1a1a'
const BODY_TEXT = '#333333'
const GRAY = '#888888'
const MUTED = '#999999'
const LIGHT_GRAY = '#E9E9E9'   // rgba(0,0,0,0.07) on white
const PAGE_BG = '#faf9f7'  // warm white
const TABLE_HEADER_BG = '#F8F4EE'   // rgba(191,149,63,0.08) on white
const TABLE_HEADER_TEXT = '#8a6b1e'
const TABLE_ALT_ROW = '#FCFCFC'   // rgba(0,0,0,0.015) on white
const GREEN = '#16a34a'
const WHITE = '#FFFFFF'
const CARD_BG = '#FFFFFF'

// ── Helpers ────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return iso }
}

function formatPrice(n: number): string {
  return `${n.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`
}

function protocolTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    standard_work: 'Standardní oprava',
    surcharge: 'Oprava s doplatkem',
    diagnostic_only: 'Pouze diagnostika',
    special_diagnostic: 'Speciální diagnostika',
    multi_visit: 'Částečný protokol (více návštěv)',
    completed_surcharge: 'Dokončení s doplatkem',
  }
  return labels[type] || type
}

// ── Main PDF Generator ────────────────────────────────────────────

export function generateProtocolPdf(input: PdfProtocolInput): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Register Roboto fonts for SK/CZ diacritics
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64)
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
  doc.addFileToVFS('Cinzel-Regular.ttf', CINZEL_REGULAR_BASE64)
  doc.addFont('Cinzel-Regular.ttf', 'Cinzel', 'normal')
  doc.addFileToVFS('Cinzel-Bold.ttf', CINZEL_BOLD_BASE64)
  doc.addFont('Cinzel-Bold.ttf', 'Cinzel', 'bold')

  doc.setFont('Roboto', 'normal')

  // Fill page with warm white background
  doc.setFillColor(250, 249, 247) // #faf9f7
  doc.rect(0, 0, PAGE_W, 297, 'F')

  let y = MARGIN

  // ── Header Band ─────────────────────────────────────────────
  // Gold top band
  doc.setFillColor(GOLD)
  doc.rect(0, 0, PAGE_W, 3, 'F')

  // Header background — white card with gold left accent
  doc.setFillColor(255, 255, 255)
  doc.rect(MARGIN, y, CONTENT_W, 22, 'F')
  doc.setFillColor(GOLD)
  doc.rect(MARGIN, y, 2, 22, 'F')

  // Company name
  doc.setFont('Cinzel', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(LT_GOLD)
  doc.text('ZLATÍ ŘEMESLNÍCI', MARGIN + 6, y + 8)

  // Document title
  doc.setFont('Cinzel', 'normal')
  doc.setFontSize(13)
  doc.setTextColor(DARK)
  doc.text('Protokol o provedení opravy', MARGIN + 6, y + 17)

  // Visit number badge (top-right in header)
  if (input.visitNumber) {
    doc.setFillColor(GOLD)
    const badgeText = input.isMultiVisit
      ? `Návštěva ${input.visitNumber}${input.totalVisitsPlanned ? ` z ${input.totalVisitsPlanned}` : ''}`
      : `Návštěva ${input.visitNumber}`
    const badgeW = doc.getTextWidth(badgeText) + 8
    doc.roundedRect(PAGE_W - MARGIN - badgeW - 4, y + 4, badgeW, 7, 1, 1, 'F')
    doc.setFontSize(8)
    doc.setTextColor(DARK)
    doc.text(badgeText, PAGE_W - MARGIN - badgeW / 2 - 4, y + 9, { align: 'center' })
  }

  y += 26

  // Reference number + dates bar
  doc.setFillColor(TABLE_HEADER_BG)  // #F8F4EE — subtle gold tint
  doc.rect(MARGIN, y, CONTENT_W, 9, 'F')
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(LT_GOLD)
  doc.text(`Zakázka: #${input.referenceNumber}`, MARGIN + 4, y + 6)
  doc.setFont('Roboto', 'normal')
  doc.setTextColor(GRAY)
  const dateInfo = `${protocolTypeLabel(input.protocolType)}  |  Vytvořeno: ${formatDate(input.createdAt)}${input.signedAt ? `  |  Podepsáno: ${formatDate(input.signedAt)}` : ''}`
  doc.text(dateInfo, PAGE_W - MARGIN - 4, y + 6, { align: 'right' })

  y += 13

  // ── Customer Info (card style) ──────────────────────────────
  y = drawSectionHeading(doc, y, 'Zákazník')

  // Info card with border
  const cardH = 24
  doc.setDrawColor(LIGHT_GRAY)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN, y - 1, CONTENT_W, cardH, 2, 2, 'S')

  const col1X = MARGIN + 4
  const col1ValX = MARGIN + 30
  const col2X = MARGIN + CONTENT_W / 2 + 4
  const col2ValX = MARGIN + CONTENT_W / 2 + 30

  y += 4
  drawCardRow(doc, col1X, col1ValX, y, 'Jméno:', input.customerName)
  drawCardRow(doc, col2X, col2ValX, y, 'Asistence:', input.insurance)
  y += 7
  drawCardRow(doc, col1X, col1ValX, y, 'Adresa:', `${input.customerAddress}, ${input.customerCity}`)
  drawCardRow(doc, col2X, col2ValX, y, 'Kategorie:', getCategoryLabel(input.category))
  y += 7 + SECTION_GAP

  // ── Visits Table ─────────────────────────────────────────────
  if (input.visits.length > 0) {
    y = checkPageBreak(doc, y, 30, input.referenceNumber)
    y = drawSectionHeading(doc, y, 'Výjezdy')

    const colWidths = [38, 30, 30, 36, 36]
    const headers = ['Datum', 'Příjezd', 'Odjezd', 'Hodiny', 'km']
    const rightAlignCols = [3, 4] // Hodiny, km — right-aligned

    // Table header
    doc.setFillColor(TABLE_HEADER_BG)
    doc.roundedRect(MARGIN, y - 4, CONTENT_W, 7, 1, 1, 'F')
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(TABLE_HEADER_TEXT)
    let x = MARGIN + 4
    headers.forEach((h, i) => {
      if (rightAlignCols.includes(i)) {
        doc.text(h, x + colWidths[i] - 4, y, { align: 'right' })
      } else {
        doc.text(h, x, y)
      }
      x += colWidths[i]
    })
    y += 5

    // Table rows
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8.5)
    for (let ri = 0; ri < input.visits.length; ri++) {
      const v = input.visits[ri]
      y = checkPageBreak(doc, y, 7, input.referenceNumber)

      // Alternate row bg
      if (ri % 2 === 0) {
        doc.setFillColor(TABLE_ALT_ROW)
        doc.rect(MARGIN, y - 3.5, CONTENT_W, 6.5, 'F')
      }

      doc.setTextColor(BODY_TEXT)
      x = MARGIN + 4
      doc.text(v.date || '—', x, y); x += colWidths[0]
      doc.text(v.arrival || '—', x, y); x += colWidths[1]
      doc.text(v.departure || '—', x, y); x += colWidths[2]
      doc.setFont('Roboto', 'bold')
      doc.text(`${v.hours.toLocaleString('cs-CZ')} h`, x + colWidths[3] - 4, y, { align: 'right' }); x += colWidths[3]
      doc.text(`${v.km.toLocaleString('cs-CZ')} km`, x + colWidths[4] - 4, y, { align: 'right' })
      doc.setFont('Roboto', 'normal')
      y += LINE_H
    }

    // Bottom border
    doc.setDrawColor(LIGHT_GRAY)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2)
    y += SECTION_GAP
  }

  // ── Work Description ─────────────────────────────────────────
  y = checkPageBreak(doc, y, 25, input.referenceNumber)
  y = drawSectionHeading(doc, y, 'Popis provedené práce')

  // Description box
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(DARK)
  const descLines = doc.splitTextToSize(input.workDescription || '—', CONTENT_W - 10)
  const descH = Math.max(descLines.length * LINE_H + 6, 15)

  doc.setDrawColor(LIGHT_GRAY)
  doc.setLineWidth(0.3)
  doc.setFillColor(CARD_BG)
  doc.roundedRect(MARGIN, y - 1, CONTENT_W, descH, 2, 2, 'FD')

  // Gold left accent
  doc.setFillColor(GOLD)
  doc.rect(MARGIN, y - 1, 1.5, descH, 'F')

  let descY = y + 4
  for (const line of descLines) {
    descY = checkPageBreak(doc, descY, 5, input.referenceNumber)
    doc.text(line, MARGIN + 6, descY)
    descY += LINE_H
  }
  y = descY + SECTION_GAP - 2

  // ── Tech Notes ───────────────────────────────────────────────
  if (input.techNotes?.trim()) {
    y = checkPageBreak(doc, y, 20, input.referenceNumber)
    y = drawSectionHeading(doc, y, 'POZNÁMKY TECHNIKA')

    const notesLines = doc.splitTextToSize(input.techNotes.trim(), CONTENT_W - 10)
    const notesH = Math.max(notesLines.length * LINE_H + 6, 15)

    doc.setDrawColor('#F2EBDC')  // rgba(191,149,63,0.15) on white
    doc.setLineWidth(0.3)
    doc.setFillColor('#FBF9F5')  // rgba(191,149,63,0.04) on white
    doc.roundedRect(MARGIN, y - 1, CONTENT_W, notesH, 2, 2, 'FD')

    // Gold left accent
    doc.setFillColor(GOLD)
    doc.rect(MARGIN, y - 1, 1.5, notesH, 'F')

    doc.setFont('Roboto', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(DARK)
    let notesY = y + 4
    for (const line of notesLines) {
      notesY = checkPageBreak(doc, notesY, 5, input.referenceNumber)
      doc.text(line, MARGIN + 6, notesY)
      notesY += LINE_H
    }
    y = notesY + SECTION_GAP - 2
  }

  // ── Materials Table ──────────────────────────────────────────
  const filledMaterials = input.materials.filter(m => m.name?.trim())
  if (filledMaterials.length > 0) {
    y = checkPageBreak(doc, y, 20, input.referenceNumber)
    y = drawSectionHeading(doc, y, 'Materiál')

    const mColW = [68, 16, 20, 34, 32]
    const mHeaders = ['Název', 'Mn.', 'Jedn.', 'Cena', 'Plátce']
    const mRightCols = [1, 3] // Mn., Cena — right-aligned

    // Table header
    doc.setFillColor(TABLE_HEADER_BG)
    doc.roundedRect(MARGIN, y - 4, CONTENT_W, 7, 1, 1, 'F')
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(TABLE_HEADER_TEXT)
    let mx = MARGIN + 4
    mHeaders.forEach((h, i) => {
      if (mRightCols.includes(i)) {
        doc.text(h, mx + mColW[i] - 4, y, { align: 'right' })
      } else {
        doc.text(h, mx, y)
      }
      mx += mColW[i]
    })
    y += 5

    doc.setFontSize(8.5)
    let materialTotal = 0
    for (let ri = 0; ri < filledMaterials.length; ri++) {
      const m = filledMaterials[ri]
      y = checkPageBreak(doc, y, 7, input.referenceNumber)

      if (ri % 2 === 0) {
        doc.setFillColor(TABLE_ALT_ROW)
        doc.rect(MARGIN, y - 3.5, CONTENT_W, 6.5, 'F')
      }

      mx = MARGIN + 4
      doc.setFont('Roboto', 'normal')
      doc.setTextColor(BODY_TEXT)
      const name = m.name.length > 38 ? m.name.substring(0, 36) + '...' : m.name
      doc.text(name, mx, y); mx += mColW[0]
      doc.text(`${m.qty}`, mx + mColW[1] - 4, y, { align: 'right' }); mx += mColW[1]
      doc.text(m.unit, mx, y); mx += mColW[2]
      doc.text(formatPrice(m.price), mx + mColW[3] - 4, y, { align: 'right' }); mx += mColW[3]

      // Payer with color badge
      const isPojistovna = m.payer === 'pojistovna' || m.payer === 'insurance'
        || m.payer.toLowerCase().includes('poist') || m.payer.toLowerCase().includes('pojist')
        || m.payer.toLowerCase().includes('asisten')
      doc.setFont('Roboto', 'bold')
      doc.setTextColor(isPojistovna ? GREEN : LT_GOLD)
      doc.text(m.payer, mx, y, { maxWidth: mColW[4] - 4 })
      doc.setTextColor(DARK)
      doc.setFont('Roboto', 'normal')
      materialTotal += m.price * m.qty
      y += LINE_H
    }

    // Total row
    doc.setDrawColor(LIGHT_GRAY)
    doc.line(MARGIN, y - 1, PAGE_W - MARGIN, y - 1)
    y += 3
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(DARK)
    doc.text('Materiál celkem:', MARGIN + 4, y)
    doc.text(formatPrice(materialTotal), PAGE_W - MARGIN - 4, y, { align: 'right' })
    y += SECTION_GAP + 2
  } else {
    y = checkPageBreak(doc, y, 14, input.referenceNumber)
    y = drawSectionHeading(doc, y, 'Materiál')
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(GRAY)
    doc.text('Bez použitého materiálu', MARGIN + 4, y)
    y += SECTION_GAP + 4
  }

  // ── Summary Card ────────────────────────────────────────────
  y = checkPageBreak(doc, y, 28, input.referenceNumber)
  y = drawSectionHeading(doc, y, 'Souhrn')

  // Summary card
  const summaryH = 20
  doc.setFillColor(CARD_BG)
  doc.setDrawColor(LIGHT_GRAY)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN, y - 1, CONTENT_W, summaryH, 2, 2, 'FD')

  const sumCol1 = MARGIN + 8
  const sumCol2 = MARGIN + CONTENT_W / 3
  const sumCol3 = MARGIN + (CONTENT_W * 2) / 3

  y += 5
  // Hours
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(GRAY)
  doc.text('Celkem hodin', sumCol1, y)
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(DARK)
  doc.text(`${(isNaN(input.totalHours) ? 0 : input.totalHours).toLocaleString('cs-CZ')} h`, sumCol1, y + 7)

  // Km
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(GRAY)
  doc.text('Celkem km', sumCol2, y)
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(DARK)
  doc.text(`${(isNaN(input.totalKm) ? 0 : input.totalKm).toLocaleString('cs-CZ')} km`, sumCol2, y + 7)

  // Material total
  if (filledMaterials.length > 0) {
    const total = filledMaterials.reduce((s, m) => s + m.price * m.qty, 0)
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(GRAY)
    doc.text('Materiál celkem', sumCol3, y)
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(DARK)
    doc.text(formatPrice(total), sumCol3, y + 7)
  }

  y += summaryH - 1 + SECTION_GAP

  // ── Multi-visit Note ─────────────────────────────────────────
  if (input.isMultiVisit && input.nextVisitPlan) {
    // Calculate box height dynamically: title (10mm) + content lines (5mm each) + bottom padding (5mm)
    const noteLines = 1 + (input.nextVisitReason ? 1 : 0) + (input.nextVisitDate ? 1 : 0)
    const noteH = 10 + noteLines * 5 + 5
    y = checkPageBreak(doc, y, noteH + 4, input.referenceNumber)
    doc.setFillColor('#FEF3C7')
    doc.setDrawColor('#F59E0B')
    doc.setLineWidth(0.5)
    doc.roundedRect(MARGIN, y - 2, CONTENT_W, noteH, 2, 2, 'FD')

    doc.setFont('Roboto', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor('#92400E')
    doc.text('Částečný protokol — práce přerušena', MARGIN + 5, y + 4)
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(DARK)
    let noteY = y + 10
    if (input.nextVisitReason) {
      doc.text(`Důvod přerušení: ${input.nextVisitReason}`, MARGIN + 5, noteY)
      noteY += 5
    }
    doc.text(`Plán další návštěvy: ${input.nextVisitPlan}`, MARGIN + 5, noteY)
    if (input.nextVisitDate) {
      noteY += 5
      doc.text(`Plánovaný termín: ${input.nextVisitDate}`, MARGIN + 5, noteY)
    }
    y += noteH + SECTION_GAP
  }

  // ── Photos ───────────────────────────────────────────────────
  const validPhotos = input.photos.filter(p => p.data && p.data.length > 50)
  if (validPhotos.length > 0) {
    y = checkPageBreak(doc, y, 55, input.referenceNumber)
    y = drawSectionHeading(doc, y, 'Fotodokumentace')

    const photoW = (CONTENT_W - 6) / 2
    const photoH = 50

    for (let i = 0; i < validPhotos.length; i += 2) {
      y = checkPageBreak(doc, y, photoH + 12, input.referenceNumber)

      for (let j = 0; j < 2 && i + j < validPhotos.length; j++) {
        const photo = validPhotos[i + j]
        const px = MARGIN + j * (photoW + 6)

        // Photo frame
        doc.setDrawColor(LIGHT_GRAY)
        doc.setLineWidth(0.3)
        doc.roundedRect(px, y, photoW, photoH + 8, 1, 1, 'S')

        try {
          let imgData = photo.data
          let format: 'PNG' | 'JPEG' = 'PNG'
          if (imgData.startsWith('data:image/jpeg') || imgData.startsWith('data:image/jpg')) {
            format = 'JPEG'
          }
          if (imgData.includes(',')) {
            imgData = imgData.split(',')[1]
          }
          doc.addImage(imgData, format, px + 1, y + 1, photoW - 2, photoH - 2)
        } catch {
          doc.setFillColor(TABLE_ALT_ROW)
          doc.rect(px + 1, y + 1, photoW - 2, photoH - 2, 'F')
          doc.setFontSize(8)
          doc.setTextColor(GRAY)
          doc.text(photo.label, px + photoW / 2, y + photoH / 2, { align: 'center' })
        }

        // Label
        doc.setFont('Roboto', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(GRAY)
        doc.text(photo.label, px + 3, y + photoH + 5, { maxWidth: photoW - 6 })
      }
      y += photoH + 12
    }
    y += SECTION_GAP
  }

  // ── Client surcharge (doplatok) ─────────────────────────────
  const displaySurcharge = input.surchargeIncludesVat
    ? (input.clientSurchargeWithVat ?? input.clientSurcharge ?? 0)
    : (input.clientSurcharge ?? 0)

  if (displaySurcharge > 0) {
    y = checkPageBreak(doc, y, 25, input.referenceNumber)
    y = drawSectionHeading(doc, y, 'Doplatek klienta')

    const cur = input.currency || 'Kč'
    const vatNote = input.surchargeIncludesVat ? ' (s DPH)' : ''
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(DARK)
    doc.text(`Schválený doplatek${vatNote}: ${displaySurcharge.toLocaleString('cs-CZ')} ${cur}`, MARGIN, y)
    y += LINE_H + SECTION_GAP
  }

  // ── Signing location + date ──────────────────────────────────
  y = checkPageBreak(doc, y, 20, input.referenceNumber)
  const sigLocation = input.signingLocation || input.customerCity || ''
  const sigDateTime = input.signedAt
    ? new Date(input.signedAt).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(DARK)
  doc.text(`Místo a datum podpisu: ${sigLocation}, ${sigDateTime}`, MARGIN, y)
  y += LINE_H + 2

  // ── Acceptance declaration ─────────────────────────────────
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(GRAY)
  doc.text(
    'Podpisem níže odběratel potvrzuje provedení opravy a souhlasí s rozsahem a kvalitou provedené práce.',
    MARGIN, y, { maxWidth: CONTENT_W }
  )
  y += 10

  // ── Signatures ───────────────────────────────────────────────
  y = checkPageBreak(doc, y, 55, input.referenceNumber)
  y = drawSectionHeading(doc, y, 'Podpisy')

  const sigW = (CONTENT_W - 12) / 2
  const sigH = 32

  // Technician signature box
  doc.setDrawColor(LIGHT_GRAY)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN, y, sigW, sigH + 14, 2, 2, 'S')

  // Header strip
  doc.setFillColor(TABLE_HEADER_BG)  // #F8F4EE — subtle gold tint
  doc.roundedRect(MARGIN, y, sigW, 8, 2, 2, 'F')
  // Cover bottom corners of header
  doc.rect(MARGIN, y + 4, sigW, 4, 'F')

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(DARK)
  doc.text('Technik', MARGIN + 4, y + 5.5)

  if (input.techSignature) {
    try {
      let imgData = input.techSignature
      const fmt = imgData.startsWith('/9j/') || imgData.startsWith('FFD8') ? 'JPEG' : 'PNG'
      if (imgData.includes(',')) imgData = imgData.split(',')[1]
      doc.addImage(imgData, fmt, MARGIN + 4, y + 10, sigW - 8, sigH - 8)
    } catch (err) { console.warn('[ProtocolPdf] Tech signature render failed:', err) }
  }

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(DARK)
  doc.text(input.techSignerName || '—', MARGIN + 4, y + sigH + 10)

  // Client signature box
  const rightX = MARGIN + sigW + 12
  doc.setDrawColor(LIGHT_GRAY)
  doc.roundedRect(rightX, y, sigW, sigH + 14, 2, 2, 'S')

  doc.setFillColor(TABLE_HEADER_BG)  // #F8F4EE — subtle gold tint
  doc.roundedRect(rightX, y, sigW, 8, 2, 2, 'F')
  doc.rect(rightX, y + 4, sigW, 4, 'F')

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(DARK)
  doc.text('Zákazník', rightX + 4, y + 5.5)

  if (input.clientSignature) {
    try {
      let imgData = input.clientSignature
      const fmt = imgData.startsWith('/9j/') || imgData.startsWith('FFD8') ? 'JPEG' : 'PNG'
      if (imgData.includes(',')) imgData = imgData.split(',')[1]
      doc.addImage(imgData, fmt, rightX + 4, y + 10, sigW - 8, sigH - 8)
    } catch (err) { console.warn('[ProtocolPdf] Client signature render failed:', err) }
  }

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(DARK)
  doc.text(input.clientSignerName || '—', rightX + 4, y + sigH + 10)

  y += sigH + 18

  // ── Footer ───────────────────────────────────────────────────
  const footerY = 287 // fixed position near A4 bottom (297mm)

  // Gold bottom accent
  doc.setFillColor(GOLD)
  doc.rect(MARGIN, footerY - 4, CONTENT_W, 0.5, 'F')

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(GRAY)  // #888888
  doc.text(
    `Generováno: ${new Date().toLocaleString('cs-CZ')}  |  Ref: ${input.referenceNumber}  |  Zlatí Řemeslníci s.r.o.`,
    PAGE_W / 2, footerY, { align: 'center' }
  )

  // Gold bottom band on page
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFillColor(GOLD)
    doc.rect(0, 294, PAGE_W, 3, 'F')
  }

  // Return as base64
  return doc.output('datauristring').split(',')[1]
}

// ── Drawing Helpers ────────────────────────────────────────────────

function drawSectionHeading(doc: jsPDF, y: number, title: string): number {
  doc.setFont('Cinzel', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(LT_GOLD)
  doc.text(title.toUpperCase(), MARGIN, y)
  y += 1.5
  // Gold underline (full width)
  doc.setDrawColor(GOLD)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, y, MARGIN + 50, y)
  // Thin continuation line — lighter
  doc.setDrawColor('#EDE4CD')  // rgba(191,149,63,0.2) on white — lighter gold
  doc.setLineWidth(0.2)
  doc.line(MARGIN + 50, y, PAGE_W - MARGIN, y)
  y += 4
  return y
}

function drawCardRow(doc: jsPDF, labelX: number, valX: number, y: number, label: string, value: string): void {
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(MUTED)
  doc.text(label, labelX, y)
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(DARK)
  // Truncate long values to prevent overflow
  const maxW = 50
  const truncated = doc.getTextWidth(value || '—') > maxW
    ? value.substring(0, 30) + '...'
    : (value || '—')
  doc.text(truncated, valX, y)
}

function checkPageBreak(doc: jsPDF, y: number, needed: number, ref?: string): number {
  const pageH = 297 // A4 height
  if (y + needed > pageH - MARGIN - 3) { // 3mm extra for bottom band
    doc.addPage()
    // Fill new page with warm white background
    doc.setFillColor(250, 249, 247) // PAGE_BG #faf9f7
    doc.rect(0, 0, PAGE_W, 297, 'F')
    // Minimal header bar on continuation pages
    const currentRef = ref || ''
    doc.setFillColor(255, 255, 255)
    doc.rect(MARGIN, MARGIN - 2, CONTENT_W, 8, 'F')
    doc.setFillColor(GOLD)
    doc.rect(MARGIN, MARGIN - 2, 2, 8, 'F')
    doc.setFont('Cinzel', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(LT_GOLD)
    doc.text(`ZLATÍ ŘEMESLNÍCI${currentRef ? ` — ${currentRef}` : ''}`, MARGIN + 4, MARGIN + 3)
    doc.setTextColor(DARK)
    return MARGIN + 10
  }
  return y
}
