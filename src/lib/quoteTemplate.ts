/**
 * quoteTemplate.ts — HTML template for client price quote (doplatok/doplatek).
 *
 * Light gold brand design. Used by the HTML→PDF pipeline (puppeteer/playwright).
 * Produces identical content to quotePdf.ts but with the new visual style.
 */

import {
  GOLD, GOLD_LIGHT, GOLD_DARK,
  FONT_HEADING, FONT_BODY,
  LT_BG_PAGE, LT_BG_CARD, LT_BORDER_CARD, LT_SHADOW_CARD,
  LT_GOLD, LT_GOLD_TABLE, LT_TEXT_PRIMARY, LT_TEXT_BODY,
  LT_TEXT_SECONDARY, LT_TEXT_MUTED, LT_TEXT_LABEL,
  LT_BORDER_ROW, LT_TABLE_ALT, LT_BG_HEADER,
  ltPageShell, ltSectionHeader, ltCard, ltGoldDivider,
  ltSummaryStat, ltFooter, payerBadge, logoHtmlLight,
  ltThStyle, ltTdStyle,
} from '@/lib/pdfBrandUtils'

// ── Re-export input type ──────────────────────────────────────────────────────
export type { QuotePdfInput } from './quotePdf'
import type { QuotePdfInput } from './quotePdf'
import type { ClientPriceQuote } from '@/components/portal/ClientPriceQuote'

// ── Locale strings ────────────────────────────────────────────────────────────

interface HtmlLocale {
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
  vatLaborLabel: string
  vatMaterialLabel: string
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
  emergencyLabel: string
  generatedLabel: string
}

const CZ_LOCALE: HtmlLocale = {
  title: 'Cenová nabídka',
  orderLabel: 'Zakázka č.',
  issuedLabel: 'Vydáno',
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
  vatLaborLabel: 'DPH práce',
  vatMaterialLabel: 'DPH materiál',
  vatLabel: 'DPH',
  grandTotalLabel: 'Celkem s DPH',
  deductionsSection: 'Odpočty',
  coverageLabel: '− Pojistné krytí (hradí pojišťovna)',
  coverageVatNote: 'vč. DPH',
  discountLabel: '− Sleva',
  surchargeLabel: 'Váš doplatek (částka nad rámec pojistného krytí)',
  surchargeVatNote: 'Částka je uvedena včetně DPH',
  noteText:
    'Tento doplatek vám bude předložen k podpisu při dokončení opravy. ' +
    'Uhradíte ho přímo technikovi na místě. ' +
    'V případě dotazů nás neváhejte kontaktovat.',
  footerCompany: 'Zlatí Řemeslníci',
  orderFooter: 'Zakázka',
  dateLocale: 'cs-CZ',
  laborCoveredBanner: 'Práce a cestovné jsou plně hrazeny pojišťovnou.',
  materialNotCoveredNote:
    'Pojistné krytí se nevztahuje na tyto druhy materiálu. ' +
    'Jejich úhradu provádí zákazník přímo technikovi.',
  emergencyLabel: 'Pohotovostní příplatek',
  generatedLabel: 'Generováno',
}

const SK_LOCALE: HtmlLocale = {
  title: 'Cenová ponuka',
  orderLabel: 'Zákazka č.',
  issuedLabel: 'Vydané',
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
  vatLaborLabel: 'DPH práca',
  vatMaterialLabel: 'DPH materiál',
  vatLabel: 'DPH',
  grandTotalLabel: 'Celkom s DPH',
  deductionsSection: 'Odpočty',
  coverageLabel: '− Poistné krytie (hradí poisťovňa)',
  coverageVatNote: 'vr. DPH',
  discountLabel: '− Zľava',
  surchargeLabel: 'Váš doplatok (suma nad rámec poistného krytia)',
  surchargeVatNote: 'Suma je uvedená vrátane DPH',
  noteText:
    'Tento doplatok vám bude predložený k podpisu pri dokončení opravy. ' +
    'Uhradíte ho priamo technikovi na mieste. ' +
    'V prípade otázok nás neváhajte kontaktovať.',
  footerCompany: 'Zlatí Řemeslníci',
  orderFooter: 'Zákazka',
  dateLocale: 'sk-SK',
  laborCoveredBanner: 'Práca a cestovné sú plne hradené poisťovňou.',
  materialNotCoveredNote:
    'Poistné krytie sa nevzťahuje na tieto druhy materiálu. ' +
    'Ich úhradu vykonáva zákazník priamo technikovi.',
  emergencyLabel: 'Príplatok za pohotovosť',
  generatedLabel: 'Generované',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateQuoteHtml(input: QuotePdfInput): string {
  const { quote } = input
  const L = input.country?.toUpperCase() === 'SK' ? SK_LOCALE : CZ_LOCALE

  const fmt = (n: number): string =>
    quote.currency === 'EUR'
      ? `${n.toLocaleString(L.dateLocale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`
      : `${n.toLocaleString(L.dateLocale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Kč`

  const pct = (r: number): string => `${Math.round(r * 100)} %`

  const issuedDate = new Date(quote.generatedAt).toLocaleDateString(L.dateLocale)
  const generatedAt = new Date().toLocaleString(L.dateLocale)

  // ── Section: Header ─────────────────────────────────────────────────────────
  const headerHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:14px;">
        ${logoHtmlLight(52)}
        <div>
          <div style="font-family:${FONT_HEADING};font-size:18px;font-weight:700;color:${LT_TEXT_PRIMARY};letter-spacing:1px;line-height:1.1;">Zlatí Řemeslníci</div>
          <div style="font-family:${FONT_HEADING};font-size:11px;color:${LT_GOLD};letter-spacing:2px;text-transform:uppercase;margin-top:2px;">${escapeHtml(L.title)}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:${LT_TEXT_SECONDARY};margin-bottom:2px;">${escapeHtml(L.orderLabel)} <strong style="color:${LT_TEXT_PRIMARY};">${escapeHtml(input.referenceNumber)}</strong></div>
        <div style="font-size:10px;color:${LT_TEXT_MUTED};">${escapeHtml(L.issuedLabel)}: ${issuedDate}</div>
      </div>
    </div>
  `

  // ── Section: Customer info ───────────────────────────────────────────────────
  const infoRows = [
    { label: L.nameLabel,     value: input.customerName },
    { label: L.addressLabel,  value: `${input.customerAddress}, ${input.customerCity}` },
    { label: L.categoryLabel, value: input.category },
    { label: L.insurerLabel,  value: quote.insurancePartner },
  ]

  const customerHtml = `
    <div style="margin-bottom:16px;">
      ${ltSectionHeader(L.customerSection)}
      ${ltCard(`
        <table style="width:100%;border-collapse:collapse;">
          <tbody>
            ${infoRows.map((row, i) => `
              <tr style="${i % 2 === 1 ? `background:${LT_TABLE_ALT};` : ''}">
                <td style="${ltTdStyle(`width:30%;color:${LT_TEXT_LABEL};font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;`)}">
                  ${escapeHtml(row.label)}
                </td>
                <td style="${ltTdStyle(`font-weight:500;font-size:11px;${i === infoRows.length - 1 ? 'border-bottom:none;' : ''}`)}">
                  ${escapeHtml(row.value || '—')}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `)}
    </div>
  `

  // ── Simplified mode: client pays only materials ──────────────────────────────
  if (quote.surchargeOnlyMaterials && quote.materials.length > 0) {
    const matContent = buildMaterialsOnlySection(quote, input, L, fmt, pct)
    const content = headerHtml + customerHtml + matContent
    return ltPageShell(L.title, content)
  }

  // ── Section: Cost breakdown ──────────────────────────────────────────────────
  const rate1 = quote.laborRate1 ?? quote.laborHourlyRate
  const rate2 = quote.laborRate2 ?? quote.laborRate1 ?? quote.laborHourlyRate

  const laborDesc1 = `1 ${L.hourUnit} × ${fmt(rate1)}${L.hourUnitPer}`
  const extraHours = quote.laborHours > 1 ? quote.laborHours - 1 : 0
  const laborDesc2 = extraHours > 0
    ? `${extraHours % 1 === 0 ? extraHours : extraHours.toFixed(1)} ${L.hourUnit} × ${fmt(rate2)}${L.hourUnitPer}`
    : null

  // Travel row
  let travelRow = ''
  if (!quote.travelCovered && quote.travelTotal > 0) {
    const travelNoVat = round2(quote.travelTotal / (1 + quote.vatRateLabor))
    const isZoneTravel = quote.travelRatePerKm === 0 && quote.travelTotal > 0
    const travelDesc = isZoneTravel
      ? `${quote.travelVisits} ${L.tripUnit} × ${quote.travelKm} km`
      : `${quote.travelVisits} ${L.tripUnit} × ${quote.travelKm} km × ${fmt(quote.travelRatePerKm)}/km`
    travelRow = costRow(L.tripLabel, travelDesc, fmt(travelNoVat), false)
  } else if (quote.travelCovered) {
    travelRow = costRow(L.tripLabel, `<em style="color:${LT_TEXT_MUTED};">${escapeHtml(L.travelCovered)}</em>`, '—', false)
  }
  // isCalloutExtra (travelCovered=false, travelTotal=0): nothing shown

  // Emergency surcharge row
  let emergencyRow = ''
  if (quote.emergencyTotal > 0) {
    const emergencyNoVat = round2(quote.emergencyTotal / (1 + quote.vatRateLabor))
    emergencyRow = costRow(L.emergencyLabel, '', fmt(emergencyNoVat), true)
  }

  // Material rows grouped by type
  const TYPE_LABELS: Record<string, string> = {
    drobny_material: L.matDrobny,
    nahradny_diel:   L.matNahradne,
    material:        L.matMaterial,
    other:           L.matOther,
  }
  const MATERIAL_GROUPS = ['drobny_material', 'nahradny_diel', 'material', 'other'] as const

  let materialRowsHtml = ''
  for (const groupType of MATERIAL_GROUPS) {
    const items = quote.materials.filter(m => (m.type ?? 'other') === groupType)
    if (items.length === 0) continue
    materialRowsHtml += subHeadingRow(TYPE_LABELS[groupType])
    for (const m of items) {
      const desc = `${m.qty} ${m.unit} × ${fmt(m.unitPrice)}`
      materialRowsHtml += costRow(m.name, desc, fmt(m.total), true)
    }
  }

  // VAT rows
  let vatRowsHtml: string
  if (quote.vatRateLabor !== quote.vatRateMaterial && quote.materialVat > 0) {
    vatRowsHtml =
      costRow(`${L.vatLaborLabel} (${pct(quote.vatRateLabor)})`, '', fmt(quote.laborVat), false) +
      costRow(`${L.vatMaterialLabel} (${pct(quote.vatRateMaterial)})`, '', fmt(quote.materialVat), false)
  } else {
    vatRowsHtml = costRow(`${L.vatLabel} (${pct(quote.vatRateLabor)})`, '', fmt(quote.vatTotal), false)
  }

  const costsHtml = `
    <div style="margin-bottom:16px;">
      ${ltSectionHeader(L.costSection)}
      ${ltCard(`
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="${ltThStyle('width:40%;')}">Položka</th>
              <th style="${ltThStyle('width:35%;')}">Popis</th>
              <th style="${ltThStyle('text-align:right;width:25%;')}">Suma</th>
            </tr>
          </thead>
          <tbody>
            ${costRow(L.laborLabel, laborDesc1, fmt(rate1), false)}
            ${laborDesc2 ? costRow('', laborDesc2, fmt(extraHours * rate2), true) : ''}
            ${travelRow}
            ${emergencyRow}
            ${materialRowsHtml}
            ${dividerRow()}
            ${costRow(L.subtotalLabel, '', fmt(quote.subtotalBeforeVat), false, true)}
            ${vatRowsHtml}
            ${grandTotalRow(L.grandTotalLabel, fmt(quote.grandTotal))}
          </tbody>
        </table>
      `)}
    </div>
  `

  // ── Section: Deductions ──────────────────────────────────────────────────────
  const coverageNote = `(${L.coverageVatNote} ${pct(quote.vatRateLabor)})`
  const deductionsHtml = `
    <div style="margin-bottom:16px;">
      ${ltSectionHeader(L.deductionsSection)}
      ${ltCard(`
        <table style="width:100%;border-collapse:collapse;">
          <tbody>
            ${coverageRow(L.coverageLabel, coverageNote, fmt(quote.coverageWithVat))}
            ${(quote.discount ?? 0) > 0 ? coverageRow(L.discountLabel, '', fmt(quote.discount)) : ''}
          </tbody>
        </table>
      `)}
    </div>
  `

  // ── Section: Final surcharge box ─────────────────────────────────────────────
  const surchargeHtml = buildSurchargeBox(quote, L, fmt)

  // ── Section: Note ────────────────────────────────────────────────────────────
  const noteHtml = `
    <div style="margin-bottom:16px;padding:12px 14px;background:rgba(191,149,63,0.04);border-left:3px solid rgba(191,149,63,0.3);border-radius:0 4px 4px 0;">
      <p style="font-size:10px;color:${LT_TEXT_SECONDARY};line-height:1.6;margin:0;">${escapeHtml(L.noteText)}</p>
    </div>
  `

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footerMeta = `${L.generatedLabel}: ${generatedAt} · ${L.orderFooter} ${escapeHtml(input.referenceNumber)}`
  const footerHtml = ltFooter(footerMeta)

  const content = headerHtml + customerHtml + costsHtml + deductionsHtml + surchargeHtml + noteHtml + footerHtml
  return ltPageShell(L.title, content)
}

// ── Local sub-builders ────────────────────────────────────────────────────────

/** One cost row in the breakdown table. */
function costRow(
  label: string,
  desc: string,
  amount: string,
  indent: boolean,
  muted = false,
): string {
  const labelStyle = `
    font-size:${indent ? '10' : '11'}px;
    font-weight:${indent ? '400' : '500'};
    color:${indent ? LT_TEXT_SECONDARY : LT_TEXT_BODY};
    padding-left:${indent ? '20px' : '10px'};
    padding-top:7px; padding-bottom:7px;
    border-bottom:1px solid ${LT_BORDER_ROW};
  `
  const descStyle = `
    font-size:10px; color:${LT_TEXT_MUTED};
    padding:7px 10px;
    border-bottom:1px solid ${LT_BORDER_ROW};
  `
  const amtStyle = `
    font-size:${muted ? '10' : '11'}px;
    font-weight:${muted ? '400' : '500'};
    color:${muted ? LT_TEXT_MUTED : LT_TEXT_PRIMARY};
    text-align:right; padding:7px 10px;
    border-bottom:1px solid ${LT_BORDER_ROW};
  `
  return `<tr>
    <td style="${labelStyle}">${escapeHtml(label)}</td>
    <td style="${descStyle}">${desc}</td>
    <td style="${amtStyle}">${escapeHtml(amount)}</td>
  </tr>`
}

/** Sub-heading row inside cost table (material group label). */
function subHeadingRow(label: string): string {
  return `<tr style="background:${LT_TABLE_ALT};">
    <td colspan="3" style="
      font-size:9px; font-weight:600; color:${LT_GOLD_TABLE};
      text-transform:uppercase; letter-spacing:1px;
      padding:5px 10px 5px 14px;
      border-bottom:1px solid rgba(191,149,63,0.1);
    ">${escapeHtml(label)}</td>
  </tr>`
}

/** Thin divider row between items and totals. */
function dividerRow(): string {
  return `<tr>
    <td colspan="3" style="padding:0;border-bottom:2px solid rgba(191,149,63,0.15);"></td>
  </tr>`
}

/** Grand total row — highlighted with gold bg. */
function grandTotalRow(label: string, amount: string): string {
  return `<tr style="background:${LT_BG_HEADER};">
    <td style="
      font-family:${FONT_HEADING}; font-size:11px; font-weight:700;
      color:${LT_GOLD}; letter-spacing:0.5px;
      padding:10px 10px 10px 10px; border-top:1px solid rgba(191,149,63,0.2);
    " colspan="2">${escapeHtml(label)}</td>
    <td style="
      font-size:14px; font-weight:700; color:${LT_GOLD};
      text-align:right; padding:10px;
      border-top:1px solid rgba(191,149,63,0.2);
    ">${escapeHtml(amount)}</td>
  </tr>`
}

/** Coverage / discount deduction row (green tint). */
function coverageRow(label: string, note: string, amount: string): string {
  return `<tr style="background:rgba(22,163,74,0.04);">
    <td style="
      font-size:11px; font-weight:500; color:${LT_TEXT_BODY};
      padding:9px 10px; border-bottom:1px solid ${LT_BORDER_ROW};
    ">
      ${escapeHtml(label)}
      ${note ? `<span style="font-size:9px;color:${LT_TEXT_MUTED};margin-left:6px;">${escapeHtml(note)}</span>` : ''}
    </td>
    <td style="
      font-size:12px; font-weight:700; color:#16a34a;
      text-align:right; padding:9px 10px;
      border-bottom:1px solid ${LT_BORDER_ROW};
    ">−${escapeHtml(amount)}</td>
  </tr>`
}

/** Orange surcharge/doplatok highlighted box. */
function buildSurchargeBox(quote: ClientPriceQuote, L: HtmlLocale, fmt: (n: number) => string): string {
  return `
    <div style="
      margin-bottom:16px;
      background:rgba(224,123,48,0.06);
      border:1.5px solid rgba(224,123,48,0.35);
      border-radius:6px;
      padding:18px 20px;
      text-align:center;
      box-shadow:0 2px 8px rgba(224,123,48,0.08);
    ">
      <div style="font-size:10px;color:#92400e;font-weight:500;margin-bottom:8px;font-family:${FONT_BODY};">
        ${escapeHtml(L.surchargeLabel)}
      </div>
      <div style="font-family:${FONT_HEADING};font-size:30px;font-weight:700;color:#c05621;letter-spacing:1px;line-height:1.1;">
        ${escapeHtml(fmt(quote.clientDoplatok))}
      </div>
      <div style="font-size:9px;color:#b45309;margin-top:6px;">
        ${escapeHtml(L.surchargeVatNote)}
      </div>
    </div>
  `
}

/** Materials-only simplified section (when surchargeOnlyMaterials = true). */
function buildMaterialsOnlySection(
  quote: ClientPriceQuote,
  input: QuotePdfInput,
  L: HtmlLocale,
  fmt: (n: number) => string,
  pct: (r: number) => string,
): string {
  const round2Local = (n: number) => Math.round(n * 100) / 100

  // Green banner — labor+travel covered
  const bannerHtml = `
    <div style="
      display:flex; align-items:center; gap:10px;
      background:rgba(22,163,74,0.08);
      border:1px solid rgba(22,163,74,0.2);
      border-radius:6px;
      padding:10px 14px;
      margin-bottom:12px;
    ">
      <span style="font-size:16px;">✓</span>
      <span style="font-size:11px;font-weight:600;color:#15803d;">${escapeHtml(L.laborCoveredBanner)}</span>
    </div>
  `

  // Note about materials not covered
  const noteHtml = `
    <div style="
      margin-bottom:14px;
      padding:10px 14px;
      background:rgba(191,149,63,0.04);
      border-left:3px solid rgba(191,149,63,0.3);
      border-radius:0 4px 4px 0;
    ">
      <p style="font-size:10px;color:${LT_TEXT_SECONDARY};line-height:1.6;margin:0;">${escapeHtml(L.materialNotCoveredNote)}</p>
    </div>
  `

  // Material rows grouped by type
  const TYPE_LABELS: Record<string, string> = {
    drobny_material: L.matDrobny,
    nahradny_diel:   L.matNahradne,
    material:        L.matMaterial,
    other:           L.matOther,
  }
  const MATERIAL_GROUPS = ['drobny_material', 'nahradny_diel', 'material', 'other'] as const

  let materialRowsHtml = ''
  for (const groupType of MATERIAL_GROUPS) {
    const items = quote.materials.filter(m => (m.type ?? 'other') === groupType)
    if (items.length === 0) continue
    materialRowsHtml += subHeadingRow(TYPE_LABELS[groupType])
    for (const m of items) {
      const desc = `${m.qty} ${m.unit} × ${fmt(m.unitPrice)}`
      materialRowsHtml += costRow(m.name, desc, fmt(m.total), true)
    }
  }

  const matSubtotalNoVat = quote.materials.reduce((sum, m) => sum + m.total, 0)
  const matVat = round2Local(matSubtotalNoVat * quote.vatRateMaterial)

  const costsHtml = `
    <div style="margin-bottom:16px;">
      ${ltSectionHeader(L.costSection)}
      ${ltCard(`
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="${ltThStyle('width:40%;')}">Položka</th>
              <th style="${ltThStyle('width:35%;')}">Popis</th>
              <th style="${ltThStyle('text-align:right;width:25%;')}">Suma</th>
            </tr>
          </thead>
          <tbody>
            ${materialRowsHtml}
            ${dividerRow()}
            ${costRow(L.subtotalLabel, '', fmt(matSubtotalNoVat), false, true)}
            ${costRow(`${L.vatLabel} (${pct(quote.vatRateMaterial)})`, '', fmt(matVat), false)}
          </tbody>
        </table>
      `)}
    </div>
  `

  const surchargeHtml = buildSurchargeBox(quote, L, fmt)

  const closingNoteHtml = `
    <div style="margin-bottom:16px;padding:12px 14px;background:rgba(191,149,63,0.04);border-left:3px solid rgba(191,149,63,0.3);border-radius:0 4px 4px 0;">
      <p style="font-size:10px;color:${LT_TEXT_SECONDARY};line-height:1.6;margin:0;">${escapeHtml(L.noteText)}</p>
    </div>
  `

  const generatedAt = new Date().toLocaleString(L.dateLocale)
  const footerMeta = `${L.generatedLabel}: ${generatedAt} · ${L.orderFooter} ${escapeHtml(input.referenceNumber)}`

  return bannerHtml + noteHtml + costsHtml + surchargeHtml + closingNoteHtml + ltFooter(footerMeta)
}
