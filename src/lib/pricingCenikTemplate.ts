/**
 * pricingCenikTemplate.ts
 *
 * Generates a luxury branded HTML pricing sheet (ceník) for Zlatí Řemeslníci.
 * Dark theme with gold accents — matches the app design system.
 * All CSS is inline — ready for html2pdf.js or browser print-to-PDF.
 *
 * Usage:
 *   import { generateCenikHtml } from '@/lib/pricingCenikTemplate'
 *   const html = generateCenikHtml()        // default current prices
 *   const html = generateCenikHtml(opts)    // custom prices / date
 */

import {
  GOLD, GOLD_LIGHT, GOLD_DARK, BG_PAGE, BG_CARD, BG_HEADER,
  BORDER_CARD, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED,
  FONT_HEADING, FONT_BODY,
  logoHtml, goldDivider, GOOGLE_FONTS_LINK, pageHeaderDecorations,
} from './pdfBrandUtils'

const BADGE_BG = 'rgba(191,149,63,0.12)'
const BADGE_BORDER = 'rgba(191,149,63,0.35)'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CenikOptions {
  /** Exchange rate EUR→CZK (default: 24.46) */
  exchangeRate?: number
  /** Discount percentage shown on badge (default: 5) */
  discountPercent?: number
  /** Date string for "Platný od" (default: '1. dubna 2026') */
  validFrom?: string
  /** Date for exchange rate reference (default: '25. 3. 2026') */
  rateDate?: string
}

interface PriceRow {
  label: string
  priceCzk: string
  eurRef?: string       // e.g. "z 60 €"
  perUnit?: string      // e.g. "za 1 km"
  hasDiscount?: boolean
}

interface PricingSection {
  title: string
  rows: PriceRow[]
}

// ─── Default pricing data ─────────────────────────────────────────────────────

/** Round to nearest 10 Kč */
function roundCzk10(n: number): number {
  return Math.round(n / 10) * 10
}

/** Format CZK with spaces: 1 390 Kč */
function fmtCzk(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + ' Kč'
}

/** EUR base rates (before discount) */
const EUR_RATES = {
  travelFlat: 33,       // no discount
  perKm: 1,             // no discount
  diagHour: 60,
  stdHour1: 100,
  stdHourN: 60,
  specHour1: 130,
  specHourN: 60,
  drainHour1: 200,
  drainHourN: 100,
  eveningSurcharge: 50,
  nightSurcharge: 100,
} as const

function buildSections(rate: number, discountPct: number): PricingSection[] {
  const d = 1 - discountPct / 100
  const czk = (eur: number, applyDiscount: boolean) =>
    fmtCzk(roundCzk10(eur * rate * (applyDiscount ? d : 1)))

  return [
    {
      title: 'DOPRAVA',
      rows: [
        {
          label: 'Paušál výjezdu technika (do 33 km celkově najetých)',
          priceCzk: czk(EUR_RATES.travelFlat, false),
        },
        {
          label: 'Každý další km nad 33 km (obousměrně)',
          priceCzk: '25 Kč',
          perUnit: 'za 1 km',
        },
      ],
    },
    {
      title: 'INSTALATÉR · TOPENÁŘ · ELEKTRIKÁŘ',
      rows: [
        {
          label: 'Diagnostika (bez opravy)',
          priceCzk: czk(EUR_RATES.diagHour, true),
        },
        {
          label: 'Práce na místě — první započatá hodina',
          priceCzk: czk(EUR_RATES.stdHour1, true),
        },
        {
          label: 'Každá další započatá hodina práce',
          priceCzk: czk(EUR_RATES.stdHourN, true),
        },
      ],
    },
    {
      title: 'SERVIS KOTLŮ · SPOTŘEBIČE · ZÁMEČNÍK · PLYNAŘ · DDD',
      rows: [
        {
          label: 'Diagnostika (bez opravy)',
          priceCzk: '1\u00a0900 Kč',
        },
        {
          label: 'Práce na místě — první započatá hodina',
          priceCzk: czk(EUR_RATES.specHour1, true),
        },
        {
          label: 'Každá další započatá hodina práce',
          priceCzk: czk(EUR_RATES.specHourN, true),
        },
      ],
    },
    {
      title: 'STROJOVÉ ČIŠTĚNÍ ODPADŮ',
      rows: [
        {
          label: 'Práce na místě — první započatá hodina',
          priceCzk: czk(EUR_RATES.drainHour1, true),
        },
        {
          label: 'Každá další započatá hodina práce',
          priceCzk: czk(EUR_RATES.drainHourN, true),
        },
      ],
    },
    {
      title: 'OSTATNÍ',
      rows: [
        {
          label: 'Marný výjezd',
          priceCzk: '1\u00a0200 Kč',
        },
        {
          label: 'Úspěšná oprava po konzultaci s technikem bez výjezdu',
          priceCzk: '1\u00a0200 Kč',
        },
      ],
    },
    {
      title: 'PŘÍPLATKY ZA VÝJEZD MIMO PRACOVNÍ DOBU',
      rows: [
        {
          label: 'Pracovní dny po 17:00, víkendy + svátky do 17:00',
          priceCzk: czk(EUR_RATES.eveningSurcharge, true),
        },
        {
          label: 'Pracovní dny po 20:00, víkendy + svátky po 17:00',
          priceCzk: czk(EUR_RATES.nightSurcharge, true),
        },
      ],
    },
  ]
}

// ─── HTML Generators ──────────────────────────────────────────────────────────

function discountBadge(percent: number): string {
  return `<span style="
    display: inline-block;
    padding: 1px 8px;
    font-size: 9px;
    font-weight: 700;
    font-family: ${FONT_BODY};
    color: ${GOLD};
    background: ${BADGE_BG};
    border: 1px solid ${BADGE_BORDER};
    border-radius: 4px;
    letter-spacing: 0.5px;
    margin-left: 10px;
    vertical-align: middle;
  ">&minus;${percent} %</span>`
}

function priceRowHtml(row: PriceRow, discount: number, isLast: boolean): string {
  const borderBottom = isLast
    ? ''
    : `border-bottom: 1px solid rgba(255,255,255,0.04);`

  return `
    <tr>
      <td style="
        padding: 6px 0 6px 16px;
        font-size: 11px;
        font-family: ${FONT_BODY};
        color: ${TEXT_PRIMARY};
        line-height: 1.4;
        ${borderBottom}
        vertical-align: middle;
      ">
        ${row.label}${row.hasDiscount ? discountBadge(discount) : ''}
      </td>
      <td style="
        padding: 6px 16px 6px 0;
        font-size: 13px;
        font-weight: 700;
        font-family: ${FONT_BODY};
        color: ${GOLD};
        text-align: right;
        white-space: nowrap;
        ${borderBottom}
        vertical-align: middle;
        line-height: 1.3;
      ">
        ${row.priceCzk}
        ${row.eurRef || row.perUnit ? `<br/><span style="font-size: 10px; font-weight: 400; color: ${TEXT_MUTED};">${row.eurRef || row.perUnit}</span>` : ''}
      </td>
    </tr>
  `
}

function sectionHtml(section: PricingSection, discount: number): string {
  const rows = section.rows
    .map((r, i) => priceRowHtml(r, discount, i === section.rows.length - 1))
    .join('')

  return `
    <div style="
      margin-bottom: 8px;
      border: 1px solid ${BORDER_CARD};
      border-radius: 8px;
      overflow: hidden;
      background: ${BG_CARD};
    ">
      <!-- Section header -->
      <div style="
        background: ${BG_HEADER};
        padding: 7px 16px;
        border-bottom: 1px solid rgba(191,149,63,0.12);
      ">
        <span style="
          font-family: ${FONT_BODY};
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2.5px;
          color: ${GOLD};
          text-transform: uppercase;
        ">${section.title}</span>
      </div>
      <!-- Rows -->
      <table style="width: 100%; border-collapse: collapse;">
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function generateCenikHtml(opts?: CenikOptions): string {
  const {
    exchangeRate = 24.46,
    discountPercent = 5,
    validFrom = '1. dubna 2026',
    rateDate = '25. 3. 2026',
  } = opts || {}

  const sections = buildSections(exchangeRate, discountPercent)

  const sectionsHtml = sections.map(s => sectionHtml(s, discountPercent)).join('')

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ceník služeb — Zlatí Řemeslníci</title>
  ${GOOGLE_FONTS_LINK}
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: ${BG_PAGE};
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
  </style>
</head>
<body>
  <div style="
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: ${BG_PAGE};
    padding: 0;
    position: relative;
    overflow: hidden;
  ">
    ${pageHeaderDecorations()}

    <!-- Content -->
    <div style="padding: 18px 34px 16px 34px;">

      <!-- Logo -->
      <div style="text-align: center; margin-bottom: 6px;">
        ${logoHtml(76)}
      </div>

      <!-- Company name -->
      <div style="text-align: center; margin-bottom: 2px;">
        <span style="
          font-family: ${FONT_HEADING};
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 5px;
          color: ${TEXT_PRIMARY};
        ">ZLATÍ ŘEMESLNÍCI</span>
      </div>

      <!-- Subtitle -->
      <div style="text-align: center; margin-bottom: 10px;">
        <span style="
          font-family: ${FONT_BODY};
          font-size: 8px;
          font-weight: 500;
          letter-spacing: 4.5px;
          color: ${TEXT_MUTED};
          text-transform: uppercase;
        ">SPOLEHLIVÍ ŘEMESLNÍCI</span>
      </div>

      <!-- Gold divider -->
      ${goldDivider()}

      <!-- Title -->
      <div style="text-align: center; margin: 8px 0 3px 0;">
        <span style="
          font-family: ${FONT_HEADING};
          font-size: 17px;
          font-weight: 600;
          letter-spacing: 3.5px;
          color: ${TEXT_PRIMARY};
        ">CENÍK SLUŽEB</span>
      </div>

      <!-- Metadata line -->
      <div style="text-align: center; margin-bottom: 12px;">
        <span style="
          font-family: ${FONT_BODY};
          font-size: 10px;
          font-weight: 400;
          color: ${TEXT_MUTED};
          letter-spacing: 0.5px;
        ">Platný od ${validFrom}&ensp;·&ensp;Ceny v CZK bez DPH</span>
      </div>

      <!-- Pricing sections -->
      ${sectionsHtml}

      <!-- Footer: note + divider + company info — compact single block -->
      <div style="text-align: center; margin-top: 6px; font-family: ${FONT_BODY};">
        <div style="font-size: 8px; color: ${TEXT_MUTED}; letter-spacing: 0.3px; margin-bottom: 6px;">
          Ceny bez DPH
        </div>
        ${goldDivider()}
        <div style="
          font-family: ${FONT_HEADING};
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2.5px;
          color: ${TEXT_SECONDARY};
          margin: 6px 0 4px 0;
        ">ZLATÍ ŘEMESLNÍCI S.R.O.</div>
        <div style="font-size: 9px; color: ${TEXT_SECONDARY}; line-height: 1.8; letter-spacing: 0.3px;">
          Školská 660/3, 110 00 Praha 1&ensp;·&ensp;IČO: 22524894&ensp;·&ensp;DIČ: CZ22524894<br/>
          <span style="color: ${GOLD}; font-weight: 600; font-size: 10px;">Katarína Lacinová</span>&ensp;·&ensp;<span style="font-weight: 500;">+421 903 328 882</span>&ensp;·&ensp;<span style="font-weight: 500;">katarina.lacinova@zlatiremeslnici.com</span>&ensp;·&ensp;<span style="font-weight: 500;">www.zlatiremeslnici.com</span>
        </div>
      </div>

    </div>

    <!-- Bottom gold accent bar -->
    <div style="
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK});
    "></div>
  </div>
</body>
</html>`
}
