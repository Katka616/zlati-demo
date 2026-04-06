/**
 * partnerInvoiceTemplate.ts
 *
 * Generates inline-CSS HTML for a partner invoice (ZR → poisťovňa / ZR → partner).
 * Direction: ZR is SUPPLIER (dodavatel), partner/insurance is BUYER (odběratel).
 * DPH is ALWAYS 21 % — ZR is a zprostředkovatel (§47 odst. 1 písm. a) ZDPH).
 *
 * All styles are inline — suitable for browser print and iframe preview.
 * Light gold ZR brand layout (ltPageShell + light theme tokens).
 *
 * Usage:
 *   import { generatePartnerInvoiceHtml } from '@/lib/partnerInvoiceTemplate'
 *   const html = generatePartnerInvoiceHtml(invoiceData)
 *   // display in iframe for preview or use window.print()
 */

import {
  GOLD, GOLD_LIGHT, GOLD_DARK, FONT_HEADING, FONT_BODY,
  LT_BG_PAGE, LT_BG_CARD, LT_BORDER_CARD, LT_SHADOW_CARD,
  LT_GOLD, LT_GOLD_TABLE, LT_TEXT_PRIMARY, LT_TEXT_BODY,
  LT_TEXT_SECONDARY, LT_TEXT_MUTED, LT_BG_HEADER,
  GOOGLE_FONTS_LINK, goldBar, logoHtmlLight, ltGoldDivider,
} from '@/lib/pdfBrandUtils'

// ─── Types ────────────────────────────────────────────────────────────

export interface PartnerInvoiceHtmlData {
  invoiceNumber: string
  issueDate: string        // YYYY-MM-DD
  taxableDate: string      // DUZP
  dueDate: string
  variabilniSymbol: string
  supplier: {
    name: string
    street: string
    city: string
    psc: string
    ico: string
    dic: string
    iban: string
    bankAccount: string
    bankCode: string
  }
  buyer: {
    name: string
    street: string
    city: string
    psc: string
    ico: string
    dic: string
  }
  items: Array<{
    description: string
    quantity: number
    unit: string
    unitPrice: number
    totalWithoutVat: number
    vatRate: number
    vatAmount: number
    totalWithVat: number
  }>
  subtotal: number
  vatTotal: number
  grandTotal: number
  note: string
  currency?: string          // 'CZK' (default) or 'EUR' for SK partners
  payBySquareQr?: string     // base64 PNG data URI
  invoiceBySquareQr?: string // base64 PNG data URI
  jobCategory?: string       // Předmět činnosti
  partnerClaimNumber?: string | null  // Číslo objednávky / pojistného případu
  reverseCharge?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────

/** Format number as currency string: 1 234,50 Kč or 1 234,50 EUR */
function formatCzk(amount: number, currency?: string): string {
  const suffix = currency === 'EUR' ? 'EUR' : 'Kč'
  return (
    amount
      .toFixed(2)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + '\u00a0' + suffix
  )
}

/** Format date from ISO string to DD.MM.YYYY */
function formatDate(iso: string): string {
  if (!iso || !iso.includes('-')) return iso || '—'
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

/** Escape HTML special characters */
function esc(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** DPH rate label for display */
function dphLabel(rate: number): string {
  if (rate === 0) return '0\u00a0%'
  return `${rate}\u00a0%`
}

/** Build address block for supplier (ZR company) */
function supplierBlock(s: PartnerInvoiceHtmlData['supplier']): string {
  return [
    `<strong style="font-size:12px;color:${LT_TEXT_PRIMARY};">${esc(s.name)}</strong>`,
    esc(s.street),
    esc(`${s.psc} ${s.city}`),
    `IČO: ${esc(s.ico)}`,
    `DIČ: ${esc(s.dic)}`,
  ].join('<br/>')
}

/** Build address block for buyer (partner/insurance company) */
function buyerBlock(b: PartnerInvoiceHtmlData['buyer']): string {
  return [
    `<strong style="font-size:12px;color:${LT_TEXT_PRIMARY};">${esc(b.name)}</strong>`,
    esc(b.street),
    esc(`${b.psc} ${b.city}`),
    `IČO: ${esc(b.ico)}`,
    `DIČ: ${esc(b.dic)}`,
  ].join('<br/>')
}

/** Build bank details block for ZR — Czech account primary, IBAN secondary */
function bankBlock(s: PartnerInvoiceHtmlData['supplier']): string {
  const lines: string[] = []
  if (s.bankAccount) {
    const acct = s.bankCode ? `${s.bankAccount}/${s.bankCode}` : s.bankAccount
    lines.push(`<strong>Č. účtu: ${esc(acct)}</strong>`)
  }
  if (s.iban) {
    lines.push(`<span style="font-size:9px;color:${LT_TEXT_SECONDARY};">IBAN: ${esc(s.iban)}</span>`)
  }
  return lines.length ? lines.join('<br/>') : '—'
}

// ─── Main export ──────────────────────────────────────────────────────

/**
 * Generate complete HTML string for a Czech partner tax invoice.
 * ZR is the supplier; partner/insurance is the buyer.
 * DPH is always 21 % (zprostředkování, §47 ZDPH).
 * All CSS is inline — ready for browser print or iframe preview.
 */
export function generatePartnerInvoiceHtml(data: PartnerInvoiceHtmlData): string {
  const {
    invoiceNumber,
    issueDate,
    taxableDate,
    dueDate,
    variabilniSymbol,
    supplier,
    buyer,
    items,
    subtotal,
    vatTotal,
    grandTotal,
    note,
    currency,
    payBySquareQr,
    invoiceBySquareQr,
    jobCategory,
    partnerClaimNumber,
    reverseCharge,
  } = data

  // ── 1. Header — logo + ZR name on left, document type + number on right
  const headerHtml = `
    <div style="display:table;width:100%;margin-top:20px;margin-bottom:20px;">
      <div style="display:table-cell;vertical-align:middle;width:50%;">
        <div style="display:flex;align-items:center;gap:10px;">
          ${logoHtmlLight(42)}
          <div>
            <div style="font-family:${FONT_HEADING};font-size:13px;font-weight:700;color:${LT_GOLD};letter-spacing:1px;">
              Zlatí Řemeslníci
            </div>
            <div style="font-family:${FONT_BODY};font-size:10px;color:${LT_TEXT_MUTED};margin-top:2px;">
              ${esc(supplier.name)}
            </div>
          </div>
        </div>
      </div>
      <div style="display:table-cell;vertical-align:middle;width:50%;text-align:right;">
        <div style="font-family:${FONT_HEADING};font-size:16px;font-weight:700;letter-spacing:2px;color:${LT_TEXT_PRIMARY};margin-bottom:4px;">
          FAKTURA — DAŇOVÝ DOKLAD
        </div>
        <div style="font-family:${FONT_BODY};font-size:12px;color:${LT_TEXT_SECONDARY};font-weight:600;">
          č. ${esc(invoiceNumber || '—')}
        </div>
      </div>
    </div>
  `

  // ── 2. Gold divider after header ─────────────────────────────────────
  const divider1 = ltGoldDivider()

  // ── 3. Parties — Dodavatel (ZR) on left, Odběratel (partner) on right
  const partiesHtml = `
    <div style="display:table;width:100%;margin-top:16px;margin-bottom:16px;">
      <div style="display:table-cell;width:48%;vertical-align:top;padding-right:2%;">
        <div style="font-family:${FONT_HEADING};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${LT_GOLD};margin-bottom:8px;">
          Dodavatel
        </div>
        <div style="background:${LT_BG_CARD};border:1px solid ${LT_BORDER_CARD};border-left:3px solid ${GOLD};border-radius:6px;padding:12px 14px;box-shadow:${LT_SHADOW_CARD};font-family:${FONT_BODY};font-size:11px;line-height:1.7;color:${LT_TEXT_BODY};">
          ${supplierBlock(supplier)}
        </div>
      </div>
      <div style="display:table-cell;width:48%;vertical-align:top;padding-left:2%;">
        <div style="font-family:${FONT_HEADING};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${LT_GOLD};margin-bottom:8px;">
          Odběratel
        </div>
        <div style="background:${LT_BG_CARD};border:1px solid ${LT_BORDER_CARD};border-radius:6px;padding:12px 14px;box-shadow:${LT_SHADOW_CARD};font-family:${FONT_BODY};font-size:11px;line-height:1.7;color:${LT_TEXT_BODY};">
          ${buyerBlock(buyer)}
        </div>
      </div>
    </div>
  `

  // ── 4. Gold divider after parties ────────────────────────────────────
  const divider2 = ltGoldDivider()

  // ── 5. Dates row — three columns ─────────────────────────────────────
  const datesHtml = `
    <div style="display:table;width:100%;margin-top:14px;margin-bottom:14px;">
      <div style="display:table-cell;width:33%;vertical-align:top;">
        <div style="font-family:${FONT_HEADING};font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${LT_TEXT_MUTED};margin-bottom:4px;">
          Datum vystavení
        </div>
        <div style="font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${LT_TEXT_PRIMARY};">
          ${formatDate(issueDate)}
        </div>
      </div>
      <div style="display:table-cell;width:33%;vertical-align:top;">
        <div style="font-family:${FONT_HEADING};font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${LT_TEXT_MUTED};margin-bottom:4px;">
          DUZP
        </div>
        <div style="font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${LT_TEXT_PRIMARY};">
          ${formatDate(taxableDate)}
        </div>
      </div>
      <div style="display:table-cell;width:34%;vertical-align:top;">
        <div style="font-family:${FONT_HEADING};font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${LT_TEXT_MUTED};margin-bottom:4px;">
          Datum splatnosti
        </div>
        <div style="font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${LT_TEXT_PRIMARY};">
          ${formatDate(dueDate)}
        </div>
      </div>
    </div>
  `

  // ── 5b. Předmět činnosti + Číslo objednávky ──────────────────────────
  const jobInfoHtml = (jobCategory || partnerClaimNumber) ? `
    <div style="display:table;width:100%;margin-bottom:14px;">
      ${jobCategory ? `
      <div style="display:table-cell;width:50%;vertical-align:top;">
        <div style="font-family:${FONT_HEADING};font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${LT_TEXT_MUTED};margin-bottom:4px;">
          Předmět činnosti
        </div>
        <div style="font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${LT_TEXT_PRIMARY};">
          ${esc(jobCategory)}
        </div>
      </div>` : ''}
      ${partnerClaimNumber ? `
      <div style="display:table-cell;width:50%;vertical-align:top;">
        <div style="font-family:${FONT_HEADING};font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${LT_TEXT_MUTED};margin-bottom:4px;">
          Číslo objednávky
        </div>
        <div style="font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${LT_TEXT_PRIMARY};">
          ${esc(partnerClaimNumber)}
        </div>
      </div>` : ''}
    </div>
  ` : ''

  // ── 6. Payment info row ─────────────────────────────────────────────
  const paymentHtml = `
    <div style="display:table;width:100%;margin-bottom:20px;">
      <div style="display:table-cell;width:33%;vertical-align:top;">
        <div style="font-family:${FONT_HEADING};font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${LT_TEXT_MUTED};margin-bottom:4px;">
          Variabilní symbol
        </div>
        <div style="font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${LT_TEXT_PRIMARY};">
          ${esc(variabilniSymbol || '—')}
        </div>
      </div>
      <div style="display:table-cell;width:33%;vertical-align:top;">
        <div style="font-family:${FONT_HEADING};font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${LT_TEXT_MUTED};margin-bottom:4px;">
          Forma úhrady
        </div>
        <div style="font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${LT_TEXT_PRIMARY};">
          Bankovní převod
        </div>
      </div>
      <div style="display:table-cell;width:34%;vertical-align:top;">
        <div style="font-family:${FONT_HEADING};font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${LT_TEXT_MUTED};margin-bottom:4px;">
          Bankovní spojení
        </div>
        <div style="background:${LT_BG_CARD};border:1px solid ${LT_BORDER_CARD};border-left:3px solid ${GOLD};border-radius:4px;padding:8px 12px;font-family:${FONT_BODY};font-size:12px;font-weight:600;color:${LT_TEXT_PRIMARY};line-height:1.6;box-shadow:${LT_SHADOW_CARD};">
          ${bankBlock(supplier)}
        </div>
      </div>
    </div>
  `

  // ── 7. Gold divider before table ─────────────────────────────────────
  const divider3 = ltGoldDivider()

  // ── 8. Line items table ───────────────────────────────────────────────
  const thStyle = `background:${LT_BG_HEADER};color:${LT_GOLD_TABLE};font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1px;padding:8px 10px;text-align:left;border-bottom:1px solid rgba(191,149,63,0.15);border:none;`
  const thRightStyle = `background:${LT_BG_HEADER};color:${LT_GOLD_TABLE};font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1px;padding:8px 10px;text-align:right;border-bottom:1px solid rgba(191,149,63,0.15);border:none;`

  const itemRows = items
    .map((item, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : 'rgba(0,0,0,0.015)'
      const tdBase = `padding:8px 10px;font-family:${FONT_BODY};font-size:11px;color:${LT_TEXT_BODY};border:none;border-bottom:1px solid rgba(0,0,0,0.04);background:${bg};`
      const tdR = `${tdBase}text-align:right;font-variant-numeric:tabular-nums;`
      return `
      <tr>
        <td style="${tdBase}">${esc(item.description)}</td>
        <td style="${tdR}">${item.quantity}</td>
        <td style="${tdBase}text-align:center;">${esc(item.unit)}</td>
        <td style="${tdR}">${formatCzk(item.unitPrice, currency)}</td>
        <td style="${tdR}">${formatCzk(item.totalWithoutVat, currency)}</td>
        <td style="${tdR}">${dphLabel(item.vatRate)}</td>
        <td style="${tdR}">${formatCzk(item.vatAmount, currency)}</td>
        <td style="${tdR}font-weight:600;">${formatCzk(item.totalWithVat, currency)}</td>
      </tr>`
    })
    .join('')

  const tableHtml = `
    <div style="margin-top:14px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;page-break-inside:avoid;">
        <thead>
          <tr>
            <th style="${thStyle}">Popis</th>
            <th style="${thRightStyle}">Množ.</th>
            <th style="${thStyle}text-align:center;">Jedn.</th>
            <th style="${thRightStyle}">Jedn. cena</th>
            <th style="${thRightStyle}">Základ DPH</th>
            <th style="${thRightStyle}">Sazba</th>
            <th style="${thRightStyle}">DPH</th>
            <th style="${thRightStyle}">Celkem</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>
  `

  // ── 9. Summary section ───────────────────────────────────────────────
  const summaryHtml = `
    <div style="display:table;width:100%;margin-bottom:6px;">
      <div style="display:table-cell;text-align:right;">
        <div style="display:inline-block;width:340px;">
          <div style="display:table;width:100%;margin-bottom:6px;">
            <div style="display:table-cell;text-align:right;padding-right:16px;font-family:${FONT_BODY};font-size:12px;color:${LT_TEXT_SECONDARY};">
              Celkem bez DPH:
            </div>
            <div style="display:table-cell;width:140px;text-align:right;font-family:${FONT_BODY};font-size:12px;font-weight:600;color:${LT_TEXT_PRIMARY};">
              ${formatCzk(subtotal, currency)}
            </div>
          </div>
          <div style="display:table;width:100%;margin-bottom:10px;">
            <div style="display:table-cell;text-align:right;padding-right:16px;font-family:${FONT_BODY};font-size:12px;color:${LT_TEXT_SECONDARY};">
              DPH:
            </div>
            <div style="display:table-cell;width:140px;text-align:right;font-family:${FONT_BODY};font-size:12px;font-weight:600;color:${LT_TEXT_PRIMARY};">
              ${formatCzk(vatTotal, currency)}
            </div>
          </div>
          <div style="border-top:1px solid rgba(191,149,63,0.25);padding-top:10px;display:table;width:100%;margin-bottom:28px;">
            <div style="display:table-cell;text-align:right;padding-right:16px;font-family:${FONT_HEADING};font-size:11px;font-weight:700;color:${LT_TEXT_PRIMARY};white-space:nowrap;letter-spacing:0.5px;">
              CELKEM K ÚHRADĚ:
            </div>
            <div style="display:table-cell;width:140px;text-align:right;">
              <span style="background:linear-gradient(135deg,${GOLD},${GOLD_DARK});color:#ffffff;font-family:${FONT_BODY};font-size:15px;font-weight:700;padding:8px 20px;border-radius:4px;white-space:nowrap;display:inline-block;">
                ${formatCzk(grandTotal, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `

  // ── 10. QR codes section ──────────────────────────────────────────────
  let qrHtml = ''
  if (payBySquareQr || invoiceBySquareQr) {
    const leftQr = payBySquareQr
      ? `<div style="display:table-cell;width:50%;vertical-align:top;text-align:center;padding-right:12px;">
          <div style="font-family:${FONT_HEADING};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${LT_TEXT_MUTED};margin-bottom:8px;">
            QR Platba
          </div>
          <img src="${esc(payBySquareQr)}" style="width:120px;height:120px;" />
          <div style="font-family:${FONT_BODY};font-size:9px;color:${LT_TEXT_SECONDARY};margin-top:6px;line-height:1.4;">
            Naskenujte v bankovní aplikaci<br/>pro okamžitou platbu
          </div>
        </div>`
      : '<div style="display:table-cell;width:50%;"></div>'

    const rightQr = invoiceBySquareQr
      ? `<div style="display:table-cell;width:50%;vertical-align:top;text-align:center;padding-left:12px;">
          <div style="font-family:${FONT_HEADING};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${LT_TEXT_MUTED};margin-bottom:8px;">
            Import do účetnictví
          </div>
          <img src="${esc(invoiceBySquareQr)}" style="width:120px;height:120px;" />
          <div style="font-family:${FONT_BODY};font-size:9px;color:${LT_TEXT_SECONDARY};margin-top:6px;line-height:1.4;">
            Naskenujte pro automatický<br/>import faktury
          </div>
        </div>`
      : '<div style="display:table-cell;width:50%;"></div>'

    qrHtml = `
      <div style="display:table;width:100%;margin-bottom:24px;page-break-inside:avoid;">
        ${leftQr}
        ${rightQr}
      </div>
    `
  }

  // ── 11. Note section ──────────────────────────────────────────────────
  const noteHtml = note
    ? `<div style="margin-bottom:20px;padding:12px 16px;background:${LT_BG_CARD};border:1px solid ${LT_BORDER_CARD};border-left:3px solid ${GOLD};border-radius:4px;box-shadow:${LT_SHADOW_CARD};font-family:${FONT_BODY};font-size:11px;color:${LT_TEXT_BODY};line-height:1.6;">
        ${esc(note)}
      </div>`
    : ''

  // ── 12. Footer ────────────────────────────────────────────────────────
  const footerHtml = `
    <div style="margin-top:24px;">
      <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(191,149,63,0.4),transparent);margin-bottom:10px;"></div>
      <div style="text-align:center;">
        <div style="font-family:${FONT_HEADING};font-size:9px;color:rgba(154,123,46,0.6);letter-spacing:2px;margin-bottom:3px;">
          Zlatí Řemeslníci
        </div>
        <div style="font-family:${FONT_BODY};font-size:8px;color:${LT_TEXT_MUTED};">
          Vystaveno elektronicky${invoiceNumber ? ` \u00b7 ${esc(invoiceNumber)}` : ''}
        </div>
      </div>
    </div>
  `

  // ── Assemble in light page shell ──────────────────────────────────────
  const content = `
    ${headerHtml}
    ${divider1}
    ${partiesHtml}
    ${divider2}
    ${datesHtml}
    ${jobInfoHtml}
    ${paymentHtml}
    ${divider3}
    ${tableHtml}
    ${summaryHtml}
    ${qrHtml}
    ${noteHtml}
    ${footerHtml}
  `

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Faktura ${esc(invoiceNumber)} — Zlatí Řemeslníci</title>
  ${GOOGLE_FONTS_LINK}
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #e8e4de;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      font-family: ${FONT_BODY};
      color: ${LT_TEXT_PRIMARY};
    }
    @media print { body { background: white; } .zr-page { margin: 0; box-shadow: none; } }
  </style>
</head>
<body>
<div class="zr-page" style="
  width:210mm; min-height:297mm; margin:0 auto;
  background:${LT_BG_PAGE}; padding:0; position:relative; overflow:hidden;
">
  ${goldBar(4)}
  <div style="position:absolute;top:4px;left:0;right:0;height:200px;background:radial-gradient(ellipse at 50% 0%,rgba(191,149,63,0.05) 0%,transparent 70%);pointer-events:none;"></div>
  <div style="padding:0 32px 28px 32px;position:relative;z-index:1;">
    ${content}
  </div>
  ${goldBar(3)}
</div>
</body>
</html>`
}
