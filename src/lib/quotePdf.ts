/**
 * quotePdf.ts — Server-side PDF generation for client price quotes (doplatok).
 *
 * Uses jsPDF with embedded Roboto font for SK/CZ diacritics.
 * Returns base64-encoded PDF string.
 *
 * Called by GET /api/jobs/[id]/quote-pdf when client_price_quote exists.
 */

import { jsPDF } from 'jspdf'
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from './fonts/roboto-base64'
import { CINZEL_REGULAR_BASE64, CINZEL_BOLD_BASE64 } from './fonts/cinzel-base64'
import type { ClientPriceQuote } from '@/components/portal/ClientPriceQuote'

// ── Constants ──────────────────────────────────────────────────────
const MARGIN    = 15

function round2(n: number): number { return Math.round(n * 100) / 100 }
const PAGE_W    = 210
const PAGE_H    = 297
const CONTENT_W = PAGE_W - 2 * MARGIN
const LINE_H    = 5

const GOLD       = '#D4A843'
const GOLD_DARK  = '#aa771c'
const LT_GOLD    = '#9a7b2e'
const DARK       = '#1a1a1a'
const BODY_TEXT  = '#333333'
const GRAY       = '#888888'
const MUTED      = '#999999'
const LIGHT_GRAY = 'rgba(0,0,0,0.07)'
const PAGE_BG_R = 250, PAGE_BG_G = 249, PAGE_BG_B = 247 // #faf9f7
const TABLE_HEADER_BG_R = 245, TABLE_HEADER_BG_G = 242, TABLE_HEADER_BG_B = 233
const CARD_BG    = '#FFFFFF'
const ORANGE     = '#E07B30'
const GREEN_BG_R = 232, GREEN_BG_G = 248, GREEN_BG_B = 238
const ORANGE_BG_R = 255, ORANGE_BG_G = 243, ORANGE_BG_B = 224

// ── Input ──────────────────────────────────────────────────────────

export interface QuotePdfInput {
  referenceNumber: string
  customerName: string
  customerAddress: string
  customerCity: string
  category: string
  quote: ClientPriceQuote
  country?: string // 'CZ' | 'SK' — determines language (defaults to CZ)
  /** When provided, adds consent section with signature to the PDF */
  clientSignature?: string  // base64 PNG, no data URI prefix
  approvedAt?: string       // ISO timestamp — when client approved
  insurerName?: string      // pojišťovna name for consent text
}

// ── Locale strings ──────────────────────────────────────────────────
interface PdfLocale {
  title: string
  orderLabel: string
  issuedLabel: string
  customerSection: string
  nameLabel: string
  addressLabel: string
  categoryLabel: string
  insurerLabel: string
  costSection: string
  laborLabel: string
  hourUnit: string
  hourUnitPer: string
  tripLabel: string
  tripUnit: string
  travelCovered: string
  matDrobny: string
  matNahradne: string
  matMaterial: string
  matOther: string
  subtotalLabel: string
  vatLabel: string
  grandTotalLabel: string
  deductionsSection: string
  coverageLabel: string
  coverageVatNote: string
  discountLabel: string
  surchargeLabel: string
  surchargeVatNote: string
  noteText: string
  footerCompany: string
  orderFooter: string
  dateLocale: string
  laborCoveredBanner: string
  materialNotCoveredNote: string
  // Consent section (when signed)
  consentSection: string
  consentText: (amount: string) => string
  consentDateLabel: string
  consentSignatureLabel: string
  consentPortalNote: string
}

const CZ_LOCALE: PdfLocale = {
  title: 'Cenová nabídka — Doplatek',
  orderLabel: 'Zakázka č.',
  issuedLabel: 'Vydáno:',
  customerSection: 'Zákazník',
  nameLabel: 'Jméno',
  addressLabel: 'Adresa',
  categoryLabel: 'Kategorie',
  insurerLabel: 'Pojišťovna',
  costSection: 'Rozpis nákladů',
  laborLabel: 'Práce',
  hourUnit: 'hod.',
  hourUnitPer: '/hod.',
  tripLabel: 'Cestovné',
  tripUnit: 'výjezd',
  travelCovered: 'hradí pojišťovna',
  matDrobny: 'Drobný materiál',
  matNahradne: 'Náhradní díly',
  matMaterial: 'Materiál',
  matOther: 'Ostatní materiál',
  subtotalLabel: 'Mezisoučet (bez DPH)',
  vatLabel: 'DPH',
  grandTotalLabel: 'Celkem s DPH',
  deductionsSection: 'Odpočty',
  coverageLabel: '− Pojistné krytí (hradí pojišťovna)',
  coverageVatNote: 'vč. DPH',
  discountLabel: '− Sleva',
  surchargeLabel: 'Váš doplatek (částka nad rámec pojistného krytí)',
  surchargeVatNote: 'Částka je uvedena včetně DPH',
  noteText: 'Tento doplatek vám bude předložen k podpisu při dokončení opravy. ' +
    'Uhradíte ho přímo technikovi na místě. ' +
    'V případě dotazů nás neváhejte kontaktovat.',
  footerCompany: 'Zlatí Řemeslníci',
  orderFooter: 'Zakázka',
  dateLocale: 'cs-CZ',
  laborCoveredBanner: 'Práce a cestovné jsou plně hrazeny pojišťovnou.',
  materialNotCoveredNote: 'Pojistné krytí se nevztahuje na tyto druhy materiálu. Jejich úhradu provádí zákazník přímo technikovi.',
  consentSection: 'Souhlas s doplatkem',
  consentText: (amount: string) =>
    `Svým podpisem potvrzuji, že souhlasím s doplatkem ve výši ${amount} včetně DPH.`,
  consentDateLabel: 'Datum a čas schválení:',
  consentSignatureLabel: 'Podpis zákazníka',
  consentPortalNote: 'Souhlas byl udělen prostřednictvím klientského portálu Zlatí Řemeslníci.',
}

const SK_LOCALE: PdfLocale = {
  title: 'Cenová ponuka — Doplatok',
  orderLabel: 'Zákazka č.',
  issuedLabel: 'Vydané:',
  customerSection: 'Zákazník',
  nameLabel: 'Meno',
  addressLabel: 'Adresa',
  categoryLabel: 'Kategória',
  insurerLabel: 'Poisťovňa',
  costSection: 'Rozpis nákladov',
  laborLabel: 'Práca',
  hourUnit: 'hod.',
  hourUnitPer: '/hod.',
  tripLabel: 'Cestovné',
  tripUnit: 'výjazd',
  travelCovered: 'hradí poisťovňa',
  matDrobny: 'Drobný materiál',
  matNahradne: 'Náhradné diely',
  matMaterial: 'Materiál',
  matOther: 'Ostatný materiál',
  subtotalLabel: 'Medzisúčet (bez DPH)',
  vatLabel: 'DPH',
  grandTotalLabel: 'Celkom s DPH',
  deductionsSection: 'Odpočty',
  coverageLabel: '− Poistné krytie (hradí poisťovňa)',
  coverageVatNote: 'vr. DPH',
  discountLabel: '− Zľava',
  surchargeLabel: 'Váš doplatok (suma nad rámec poistného krytia)',
  surchargeVatNote: 'Suma je uvedená vrátane DPH',
  noteText: 'Tento doplatok vám bude predložený k podpisu pri dokončení opravy. ' +
    'Uhradíte ho priamo technikovi na mieste. ' +
    'V prípade otázok nás neváhajte kontaktovať.',
  footerCompany: 'Zlatí Řemeslníci',
  orderFooter: 'Zákazka',
  dateLocale: 'sk-SK',
  laborCoveredBanner: 'Práca a cestovné sú plne hradené poisťovňou.',
  materialNotCoveredNote: 'Poistné krytie sa nevzťahuje na tieto druhy materiálu. Ich úhradu vykonáva zákazník priamo technikovi.',
  consentSection: 'Súhlas s doplatkom',
  consentText: (amount: string) =>
    `Svojím podpisom potvrdzujem, že súhlasím s doplatkom vo výške ${amount} vrátane DPH.`,
  consentDateLabel: 'Dátum a čas schválenia:',
  consentSignatureLabel: 'Podpis zákazníka',
  consentPortalNote: 'Súhlas bol udelený prostredníctvom klientskeho portálu Zlatí Řemeslníci.',
}

// ── Main ───────────────────────────────────────────────────────────

export function generateQuotePdf(input: QuotePdfInput): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64)
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
  doc.addFileToVFS('Cinzel-Regular.ttf', CINZEL_REGULAR_BASE64)
  doc.addFont('Cinzel-Regular.ttf', 'Cinzel', 'normal')
  doc.addFileToVFS('Cinzel-Bold.ttf', CINZEL_BOLD_BASE64)
  doc.addFont('Cinzel-Bold.ttf', 'Cinzel', 'bold')
  doc.setFont('Roboto', 'normal')

  // Fill page background
  doc.setFillColor(PAGE_BG_R, PAGE_BG_G, PAGE_BG_B)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')

  const { quote } = input
  const L = input.country?.toUpperCase() === 'SK' ? SK_LOCALE : CZ_LOCALE
  const fmt = (n: number) => quote.currency === 'EUR'
    ? `${n.toLocaleString(L.dateLocale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`
    : `${n.toLocaleString(L.dateLocale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Kč`
  const pct = (r: number) => `${Math.round(r * 100)} %`

  let y = MARGIN

  // ── Gold top band (full-width, matching protocolPdf) ─────────────
  doc.setFillColor(GOLD)
  doc.rect(0, 0, PAGE_W, 3, 'F')
  y += 3

  // ── Title ────────────────────────────────────────────────────────
  doc.setFont('Cinzel', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(LT_GOLD)
  doc.text('Zlatí Řemeslníci', MARGIN, y)

  doc.setFont('Cinzel', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(DARK)
  doc.text(L.title, MARGIN, y + 6)

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(MUTED)
  y += 13
  doc.text(`${L.orderLabel} ${input.referenceNumber}`, MARGIN, y)
  doc.text(
    `${L.issuedLabel} ${new Date(quote.generatedAt).toLocaleDateString(L.dateLocale)}`,
    PAGE_W - MARGIN, y, { align: 'right' },
  )
  y += 8

  // ── Customer info ────────────────────────────────────────────────
  y = drawSectionHeading(doc, y, L.customerSection)
  y = drawInfoRow(doc, y, L.nameLabel, input.customerName)
  y = drawInfoRow(doc, y, L.addressLabel, `${input.customerAddress}, ${input.customerCity}`)
  y = drawInfoRow(doc, y, L.categoryLabel, input.category)
  y = drawInfoRow(doc, y, L.insurerLabel, quote.insurancePartner)
  y += 8

  // ── Zjednodušený mód: klient platí len materiál ──────────────────
  // Keď práca + cestovné sú plne kryté a doplatok je len za materiál,
  // zobrazíme len rozpis materiálu + info že poisťovňa nekryje tieto druhy materiálu.
  if (quote.surchargeOnlyMaterials && quote.materials.length > 0) {
    // Green banner — práca a cestovné kryté
    doc.setFillColor(GREEN_BG_R, GREEN_BG_G, GREEN_BG_B)
    doc.roundedRect(MARGIN, y - 2, CONTENT_W, 10, 2, 2, 'F')
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(10)
    doc.setTextColor('#2e7d32')
    doc.text(`✓ ${L.laborCoveredBanner}`, MARGIN + 4, y + 4)
    doc.setFont('Roboto', 'normal')
    doc.setTextColor(BODY_TEXT)
    y += 14

    // Info — poisťovňa nekryje materiál
    doc.setFontSize(9)
    doc.setTextColor(MUTED)
    const noteLines = doc.splitTextToSize(L.materialNotCoveredNote, CONTENT_W - 6)
    doc.text(noteLines, MARGIN + 3, y)
    y += noteLines.length * 4 + 4

    // Materiálové položky
    y = drawSectionHeading(doc, y, L.costSection)
    const TYPE_LABELS_M: Record<string, string> = {
      drobny_material: L.matDrobny,
      nahradny_diel:   L.matNahradne,
      material:        L.matMaterial,
      other:           L.matOther,
    }
    const groups = ['drobny_material', 'nahradny_diel', 'material', 'other'] as const
    for (const groupType of groups) {
      const items = quote.materials.filter(m => (m.type ?? 'other') === groupType)
      if (items.length === 0) continue
      y = checkPageBreak(doc, y, 8 + items.length * (LINE_H + 2))
      y = drawSubHeading(doc, y, TYPE_LABELS_M[groupType])
      for (const m of items) {
        const desc = `${m.qty} ${m.unit} × ${fmt(m.unitPrice)}`
        y = checkPageBreak(doc, y, LINE_H + 2)
        y = drawCostRow(doc, y, m.name, desc, fmt(m.total), true)
      }
    }

    // DPH + doplatok
    const matSubtotalNoVat = quote.materials.reduce((sum, m) => sum + m.total, 0)
    const matVat = round2(matSubtotalNoVat * quote.vatRateMaterial)
    y += 2
    doc.setDrawColor(212, 168, 67) // GOLD divider
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y, MARGIN + 50, y)
    doc.setDrawColor(200, 195, 180) // light continuation
    doc.setLineWidth(0.2)
    doc.line(MARGIN + 50, y, PAGE_W - MARGIN, y)
    y += 4
    y = drawCostRow(doc, y, L.subtotalLabel, '', fmt(matSubtotalNoVat))
    y = drawCostRow(doc, y, `${L.vatLabel} (${pct(quote.vatRateMaterial)})`, '', fmt(matVat))

    // Doplatok box
    y = checkPageBreak(doc, y, 34)
    y += 4
    doc.setFillColor(ORANGE_BG_R, ORANGE_BG_G, ORANGE_BG_B)
    doc.setDrawColor(ORANGE)
    doc.setLineWidth(0.8)
    doc.roundedRect(MARGIN, y, CONTENT_W, 28, 2, 2, 'FD')
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(MUTED)
    doc.text(L.surchargeLabel, MARGIN + 4, y + 6)
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(ORANGE)
    doc.text(fmt(quote.clientDoplatok), PAGE_W / 2, y + 16, { align: 'center' })
    // DPH note
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(MUTED)
    doc.text(L.surchargeVatNote, PAGE_W / 2, y + 22, { align: 'center' })
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(MUTED)
    y += 32

    // Consent / Note + footer
    if (input.clientSignature && input.approvedAt) {
      y = drawConsentSection(doc, y, input, L, fmt)
    } else {
      y = checkPageBreak(doc, y, 18)
      y += 4
      const lines = doc.splitTextToSize(L.noteText, CONTENT_W)
      doc.text(lines, MARGIN, y)
      y += lines.length * 3.5 + 6
    }

    // Footer
    doc.setFillColor(212, 168, 67)
    doc.rect(0, 294, PAGE_W, 3, 'F')
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(GRAY)
    doc.text(`${L.footerCompany} · ${L.orderFooter} ${input.referenceNumber}`, PAGE_W / 2, PAGE_H - 8, { align: 'center' })

    return Buffer.from(doc.output('arraybuffer')).toString('base64')
  }

  // ── Cost table ───────────────────────────────────────────────────
  y = drawSectionHeading(doc, y, L.costSection)

  // Labor — two-rate breakdown (1st hour + subsequent), same as admin pricing card
  y = checkPageBreak(doc, y, 10)
  const rate1 = quote.laborRate1 ?? quote.laborHourlyRate
  const rate2 = quote.laborRate2 ?? quote.laborRate1 ?? quote.laborHourlyRate
  const laborDesc1 = `1 ${L.hourUnit} × ${fmt(rate1)}${L.hourUnitPer}`
  y = drawCostRow(doc, y, L.laborLabel, laborDesc1, fmt(rate1))
  if (quote.laborHours > 1) {
    y = checkPageBreak(doc, y, 10)
    const extraHours = quote.laborHours - 1
    const laborDesc2 = `${extraHours % 1 === 0 ? extraHours : extraHours.toFixed(1)} ${L.hourUnit} × ${fmt(rate2)}${L.hourUnitPer}`
    y = drawCostRow(doc, y, '', laborDesc2, fmt(extraHours * rate2), true)
  }

  // Travel — skip entirely when isCalloutExtra (travelTotal === 0, not customer's concern)
  if (!quote.travelCovered && quote.travelTotal > 0) {
    y = checkPageBreak(doc, y, 10)
    const travelNoVat = round2(quote.travelTotal / (1 + quote.vatRateLabor))
    const travelDesc = `${quote.travelVisits} ${L.tripUnit} × ${quote.travelKm} km × ${fmt(quote.travelRatePerKm)}/km`
    y = drawCostRow(doc, y, L.tripLabel, travelDesc, fmt(travelNoVat))
  } else if (quote.travelCovered) {
    y = checkPageBreak(doc, y, 10)
    y = drawCostRow(doc, y, L.tripLabel, L.travelCovered, '—')
  }
  // isCalloutExtra: travelCovered=false, travelTotal=0 → nothing shown

  // Emergency/on-call surcharge (weekend, night, holiday)
  if (quote.emergencyTotal > 0) {
    y = checkPageBreak(doc, y, 10)
    const emergencyNoVat = round2(quote.emergencyTotal / (1 + quote.vatRateLabor))
    y = drawCostRow(doc, y, 'Pohotovostní příplatek', '', fmt(emergencyNoVat))
  }

  // Materials — itemized (bez DPH), grouped by type, DPH applied only on total
  if (quote.materials.length > 0) {
    const TYPE_LABELS: Record<string, string> = {
      drobny_material: L.matDrobny,
      nahradny_diel:   L.matNahradne,
      material:        L.matMaterial,
      other:           L.matOther,
    }
    const groups = ['drobny_material', 'nahradny_diel', 'material', 'other'] as const
    for (const groupType of groups) {
      const items = quote.materials.filter(m => (m.type ?? 'other') === groupType)
      if (items.length === 0) continue
      y = checkPageBreak(doc, y, 8 + items.length * (LINE_H + 2))
      y = drawSubHeading(doc, y, TYPE_LABELS[groupType])
      for (const m of items) {
        const desc = `${m.qty} ${m.unit} × ${fmt(m.unitPrice)}`
        y = checkPageBreak(doc, y, LINE_H + 2)
        y = drawCostRow(doc, y, m.name, desc, fmt(m.total), true)
      }
    }
  }

  // Divider
  y += 2
  doc.setDrawColor(212, 168, 67) // GOLD divider
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, MARGIN + 50, y)
  doc.setDrawColor(200, 195, 180) // light continuation
  doc.setLineWidth(0.2)
  doc.line(MARGIN + 50, y, PAGE_W - MARGIN, y)
  y += 4

  // Subtotal before VAT
  y = checkPageBreak(doc, y, 6)
  y = drawCostRow(doc, y, L.subtotalLabel, '', fmt(quote.subtotalBeforeVat))

  // VAT
  if (quote.vatRateLabor !== quote.vatRateMaterial && quote.materialVat > 0) {
    y = checkPageBreak(doc, y, 12)
    y = drawCostRow(doc, y, `${L.vatLabel} ${L.laborLabel.toLowerCase()} (${pct(quote.vatRateLabor)})`, '', fmt(quote.laborVat))
    y = drawCostRow(doc, y, `${L.vatLabel} ${L.matMaterial.toLowerCase()} (${pct(quote.vatRateMaterial)})`, '', fmt(quote.materialVat))
  } else {
    y = checkPageBreak(doc, y, 6)
    y = drawCostRow(doc, y, `${L.vatLabel} (${pct(quote.vatRateLabor)})`, '', fmt(quote.vatTotal))
  }

  // Grand total — gold gradient badge
  y = checkPageBreak(doc, y, 10)
  y += 2
  doc.setFillColor(TABLE_HEADER_BG_R, TABLE_HEADER_BG_G, TABLE_HEADER_BG_B)
  doc.roundedRect(MARGIN, y - 4, CONTENT_W, 8, 1.5, 1.5, 'F')
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(MUTED)
  doc.text(L.grandTotalLabel, MARGIN + 3, y)
  doc.setTextColor(DARK)
  doc.text(fmt(quote.grandTotal), PAGE_W - MARGIN - 3, y, { align: 'right' })
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  y += 8

  // ── Deductions ───────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 20)
  y = drawSectionHeading(doc, y, L.deductionsSection)

  doc.setFillColor(GREEN_BG_R, GREEN_BG_G, GREEN_BG_B)
  doc.rect(MARGIN, y - 3, CONTENT_W, 7, 'F')
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(BODY_TEXT)
  doc.text(L.coverageLabel, MARGIN + 3, y)
  // DPH note next to coverage label
  const coverageLabelW = doc.getTextWidth(L.coverageLabel)
  doc.setFontSize(7)
  doc.setTextColor(MUTED)
  doc.text(`(${L.coverageVatNote} ${pct(quote.vatRateLabor)})`, MARGIN + 3 + coverageLabelW + 2, y)
  // Amount
  doc.setTextColor('#2e7d32')
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(9)
  doc.text(`−${fmt(quote.coverageWithVat)}`, PAGE_W - MARGIN - 3, y, { align: 'right' })
  doc.setFont('Roboto', 'normal')
  doc.setTextColor(BODY_TEXT)
  y += 7

  // Effective discount: same calculation as portal component
  // grandTotal - coverage - discount = clientDoplatok → discount = grandTotal - coverage - clientDoplatok
  const effectiveDiscount = Math.round(quote.grandTotal - quote.coverageWithVat - quote.clientDoplatok)
  if (effectiveDiscount > 0) {
    y = checkPageBreak(doc, y, 8)
    doc.setFillColor(GREEN_BG_R, GREEN_BG_G, GREEN_BG_B)
    doc.rect(MARGIN, y - 3, CONTENT_W, 7, 'F')
    doc.setTextColor(BODY_TEXT)
    doc.text(L.discountLabel, MARGIN + 3, y)
    doc.setTextColor('#2e7d32')
    doc.setFont('Roboto', 'bold')
    doc.text(`−${fmt(effectiveDiscount)}`, PAGE_W - MARGIN - 3, y, { align: 'right' })
    doc.setFont('Roboto', 'normal')
    doc.setTextColor(BODY_TEXT)
    y += 7
  }

  // ── Final doplatok — highlighted box ────────────────────────────
  y = checkPageBreak(doc, y, 34)
  y += 4
  doc.setFillColor(ORANGE_BG_R, ORANGE_BG_G, ORANGE_BG_B)
  doc.setDrawColor(ORANGE)
  doc.setLineWidth(0.8)
  doc.roundedRect(MARGIN, y, CONTENT_W, 28, 2, 2, 'FD')

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(MUTED)
  doc.text(L.surchargeLabel, MARGIN + 4, y + 6)

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(ORANGE)
  doc.text(fmt(quote.clientDoplatok), PAGE_W / 2, y + 16, { align: 'center' })

  // DPH note under surcharge amount
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(MUTED)
  doc.text(L.surchargeVatNote, PAGE_W / 2, y + 22, { align: 'center' })

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(MUTED)
  y += 32

  // ── Consent / Note ──────────────────────────────────────────────
  if (input.clientSignature && input.approvedAt) {
    y = drawConsentSection(doc, y, input, L, fmt)
  } else {
    y = checkPageBreak(doc, y, 18)
    y += 4
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(GRAY)
    const lines = doc.splitTextToSize(L.noteText, CONTENT_W) as string[]
    doc.text(lines, MARGIN, y)
    y += lines.length * 4 + 4
  }

  // ── Footer ───────────────────────────────────────────────────────
  // Gold bottom band on all pages
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFillColor(212, 168, 67) // GOLD
    doc.rect(0, 294, PAGE_W, 3, 'F')
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(GRAY)
    doc.text(
      `Generované: ${new Date().toLocaleString(L.dateLocale)}  |  ${L.footerCompany}  |  ${L.orderFooter} ${input.referenceNumber}`,
      PAGE_W / 2, PAGE_H - 13, { align: 'center' },
    )
  }

  return doc.output('datauristring').split(',')[1]
}

// ── Drawing Helpers ────────────────────────────────────────────────

function drawSectionHeading(doc: jsPDF, y: number, title: string): number {
  doc.setFont('Cinzel', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(LT_GOLD)
  doc.text(title.toUpperCase(), MARGIN, y)
  y += 1.5
  doc.setDrawColor(212, 168, 67) // GOLD
  doc.setLineWidth(0.6)
  doc.line(MARGIN, y, MARGIN + 50, y)
  doc.setDrawColor(200, 195, 180) // lighter continuation
  doc.setLineWidth(0.2)
  doc.line(MARGIN + 50, y, PAGE_W - MARGIN, y)
  y += 4
  return y
}

function drawSubHeading(doc: jsPDF, y: number, title: string): number {
  doc.setFont('Cinzel', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(LT_GOLD)
  doc.text(title, MARGIN + 3, y)
  return y + LINE_H
}

function drawInfoRow(doc: jsPDF, y: number, label: string, value: string): number {
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(MUTED)
  doc.text(label, MARGIN + 2, y)
  doc.setFont('Roboto', 'bold')
  doc.setTextColor(BODY_TEXT)
  doc.text(value || '—', MARGIN + 36, y)
  doc.setFont('Roboto', 'normal')
  return y + LINE_H + 0.5
}

// Fixed column positions for consistent table alignment
const COL_LABEL = MARGIN + 3
const COL_LABEL_INDENT = MARGIN + 8
const COL_DESC  = MARGIN + 55    // all descriptions start at same X
const COL_AMT   = PAGE_W - MARGIN - 3  // right-aligned

function drawCostRow(
  doc: jsPDF, y: number,
  label: string, desc: string, amount: string,
  indent = false,
): number {
  const labelX = indent ? COL_LABEL_INDENT : COL_LABEL

  // Label
  doc.setFont('Roboto', indent ? 'normal' : 'bold')
  doc.setFontSize(indent ? 8.5 : 9)
  doc.setTextColor(BODY_TEXT)
  if (label) doc.text(label, labelX, y)

  // Description — always same column
  if (desc) {
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(MUTED)
    doc.text(desc, COL_DESC, y)
  }

  // Amount — right-aligned, always same position
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(DARK)
  doc.text(amount, COL_AMT, y, { align: 'right' })
  doc.setFont('Roboto', 'normal')
  return y + LINE_H + 1.5
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN - 15) {
    doc.addPage()
    // Re-fill page background on new page
    doc.setFillColor(PAGE_BG_R, PAGE_BG_G, PAGE_BG_B)
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
    return MARGIN
  }
  return y
}

// ── Consent Section (signed quote) ────────────────────────────────

function drawConsentSection(
  doc: jsPDF,
  y: number,
  input: QuotePdfInput,
  L: PdfLocale,
  fmt: (n: number) => string,
): number {
  const { quote } = input

  // Pre-calculate total height needed for entire consent section
  // so it stays on one page: heading(12) + text(~16) + date(12) + sig label(6) + sig box(35) + name(10) + note(10) = ~101
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(11)
  const consentStr = L.consentText(fmt(quote.clientDoplatok))
  const consentLines = doc.splitTextToSize(consentStr, CONTENT_W - 4) as string[]
  const totalConsentHeight = 12 + consentLines.length * 5.5 + 4 + 12 + 6 + 35 + 10 + 10
  y = checkPageBreak(doc, y, totalConsentHeight)

  // Section heading
  y += 6
  y = drawSectionHeading(doc, y, L.consentSection)

  // Consent text (large, bold)
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(DARK)
  doc.text(consentLines, MARGIN + 2, y)
  y += consentLines.length * 5.5 + 4

  // Date and time of approval
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(BODY_TEXT)
  const approvedDate = new Date(input.approvedAt!)
  const dateStr = approvedDate.toLocaleDateString(L.dateLocale, {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const timeStr = approvedDate.toLocaleTimeString(L.dateLocale, {
    hour: '2-digit', minute: '2-digit',
  })
  doc.text(`${L.consentDateLabel} ${dateStr}, ${timeStr}`, MARGIN + 2, y)
  y += 8

  // Signature box (no page break — already reserved space above)
  const sigBoxW = 80
  const sigBoxH = 35
  const sigBoxX = PAGE_W - MARGIN - sigBoxW

  // Label above signature
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(MUTED)
  doc.text(L.consentSignatureLabel, sigBoxX, y)
  y += 3

  // Signature background box
  doc.setFillColor(TABLE_HEADER_BG_R, TABLE_HEADER_BG_G, TABLE_HEADER_BG_B)
  doc.roundedRect(sigBoxX, y, sigBoxW, sigBoxH, 2, 2, 'F')
  doc.setDrawColor(200, 195, 180)
  doc.setLineWidth(0.3)
  doc.roundedRect(sigBoxX, y, sigBoxW, sigBoxH, 2, 2, 'S')

  // Embed signature image
  if (input.clientSignature) {
    try {
      let imgData = input.clientSignature
      // Add data URI prefix if missing
      if (!imgData.startsWith('data:')) {
        const isJpeg = imgData.startsWith('/9j/')
        imgData = `data:image/${isJpeg ? 'jpeg' : 'png'};base64,${imgData}`
      }
      doc.addImage(imgData, sigBoxX + 2, y + 2, sigBoxW - 4, sigBoxH - 4)
    } catch (sigErr) {
      console.error('[QuotePdf] Failed to embed signature image:', sigErr)
      // Fallback: show placeholder text
      doc.setFont('Roboto', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(MUTED)
      doc.text('(podpis)', sigBoxX + sigBoxW / 2, y + sigBoxH / 2, { align: 'center' })
    }
  }

  // Signer name under signature box
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(BODY_TEXT)
  doc.text(input.customerName, sigBoxX + sigBoxW / 2, y + sigBoxH + 5, { align: 'center' })
  y += sigBoxH + 10

  // Portal note (small gray italic — space already reserved above)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(GRAY)
  doc.text(L.consentPortalNote, MARGIN, y)
  y += 6

  return y
}
