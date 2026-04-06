/**
 * invoiceTemplate.ts
 *
 * Generates inline-CSS HTML for a Czech tax invoice (daňový doklad).
 * All styles are inline — suitable for browser print and iframe preview.
 * Light gold ZR brand — warm white page, Cinzel headings, Montserrat body.
 *
 * For server-side PDF generation use generateInvoicePdf() from invoicePdf.ts.
 *
 * Usage:
 *   import { generateInvoiceHtml } from '@/lib/invoiceTemplate'
 *   const html = generateInvoiceHtml(invoiceData)
 *   // display in iframe for preview or use window.print()
 */

import type { InvoiceData, TechnicianBillingData, CompanyBuyerData } from '@/types/dispatch'
import {
  GOLD, GOLD_LIGHT, GOLD_DARK, FONT_HEADING, FONT_BODY,
  LT_BG_PAGE, LT_BG_CARD, LT_BORDER_CARD, LT_SHADOW_CARD,
  LT_GOLD, LT_GOLD_TABLE, LT_TEXT_PRIMARY, LT_TEXT_BODY,
  LT_TEXT_SECONDARY, LT_TEXT_MUTED, LT_BG_HEADER,
  GOOGLE_FONTS_LINK, goldBar, logoHtmlLight, ltGoldDivider,
} from '@/lib/pdfBrandUtils'

/** Format number as currency string: 1 234,50 Kč or 1 234,50 EUR */
function formatCzk(amount: number, currency?: string): string {
  const suffix = currency === 'EUR' ? 'EUR' : 'Kč'
  return (
    amount
      .toFixed(2)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + `\u00a0${suffix}`
  )
}

/** Format date from ISO string to DD.MM.YYYY */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

/** Build address block for supplier (technician billing) */
function supplierBlock(s: TechnicianBillingData): string {
  const lines: string[] = []
  if (s.billing_name) lines.push(`<strong style="font-size:12px;color:${LT_TEXT_PRIMARY};">${esc(s.billing_name)}</strong>`)
  if (s.billing_street) lines.push(esc(s.billing_street))
  if (s.billing_city || s.billing_psc) {
    lines.push(esc([s.billing_psc, s.billing_city].filter(Boolean).join(' ')))
  }
  if (s.ico) lines.push(`IČO: ${esc(s.ico)}`)
  if (s.dic) lines.push(`DIČ: ${esc(s.dic)}`)
  if (s.ic_dph) lines.push(`IČ DPH: ${esc(s.ic_dph)}`)
  if (s.registration) lines.push(`Reg.: ${esc(s.registration)}`)
  if (!s.platca_dph) lines.push('<span style="color:#b45309;font-weight:600;">Neplátce DPH</span>')
  return lines.join('<br/>')
}

/** Build address block for buyer (our company) */
function buyerBlock(b: CompanyBuyerData): string {
  return [
    `<strong style="font-size:12px;color:${LT_TEXT_PRIMARY};">${esc(b.name)}</strong>`,
    esc(b.street),
    esc(`${b.psc} ${b.city}`),
    `IČO: ${esc(b.ico)}`,
    `DIČ: ${esc(b.dic)}`,
  ].join('<br/>')
}

/** Build bank details for supplier — Czech format prioritized */
function bankBlock(s: TechnicianBillingData): string {
  const lines: string[] = []
  // Czech bank account (primary for CZ invoices)
  if (s.bank_account_number) {
    const acct = s.bank_code
      ? `${s.bank_account_number}/${s.bank_code}`
      : s.bank_account_number
    lines.push(`<strong>Č. účtu: ${esc(acct)}</strong>`)
  }
  // IBAN only as secondary (smaller)
  if (s.iban) {
    lines.push(`<span style="font-size:9px;color:${LT_TEXT_SECONDARY};">IBAN: ${esc(s.iban)}</span>`)
  }
  return lines.length ? lines.join('<br/>') : '—'
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

// ─── Main export ───────────────────────────────────────────────────────

/**
 * Generate complete HTML string for a Czech tax invoice.
 * All CSS is inline — ready for browser print or iframe preview.
 */
export function generateInvoiceHtml(data: InvoiceData): string {
  const {
    invoiceNumber,
    issueDate,
    taxableDate,
    dueDate,
    variabilniSymbol,
    dphRate,
    supplier,
    buyer,
    items,
    subtotal,
    vatTotal,
    grandTotal,
    note,
    jobCategory,
    payBySquareQr,
    invoiceBySquareQr,
    paymentBreakdown,
  } = data

  const isVatInvoice = dphRate !== 'non_vat_payer'
  const docType = isVatInvoice ? 'FAKTURA — DAŇOVÝ DOKLAD' : 'FAKTURA'

  // ── 2. Header — logo left, company name, doc type right ────────────
  const headerHtml = `
    <div style="display:table;width:100%;margin-top:20px;margin-bottom:20px;">
      <div style="display:table-cell;vertical-align:middle;width:50%;">
        <div style="display:inline-flex;align-items:center;gap:10px;">
          ${logoHtmlLight(42)}
          <div>
            <div style="font-family:${FONT_HEADING};font-size:13px;font-weight:700;color:${LT_GOLD};letter-spacing:1.5px;line-height:1.2;">
              Zlatí Řemeslníci
            </div>
            <div style="font-family:${FONT_BODY};font-size:10px;color:${LT_TEXT_SECONDARY};margin-top:2px;">
              ${esc(supplier.billing_name || '')}
            </div>
          </div>
        </div>
      </div>
      <div style="display:table-cell;vertical-align:middle;width:50%;text-align:right;">
        <div style="font-family:${FONT_HEADING};font-size:14px;font-weight:700;letter-spacing:2px;color:${LT_TEXT_PRIMARY};margin-bottom:4px;">
          ${docType}
        </div>
        <div style="font-family:${FONT_BODY};font-size:12px;color:${LT_TEXT_SECONDARY};font-weight:600;">
          č. ${esc(invoiceNumber || '—')}
        </div>
      </div>
    </div>
  `

  // ── Divider: after header, before parties ──────────────────────────
  const divider1 = ltGoldDivider()

  // ── 3. Parties section — two-column ────────────────────────────────
  const partiesHtml = `
    <div style="display:table;width:100%;margin-top:16px;margin-bottom:20px;">
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

  // ── 4. Dates row — three columns ───────────────────────────────────
  const datesHtml = `
    <div style="display:table;width:100%;margin-bottom:20px;">
      <div style="display:table-cell;width:33%;vertical-align:top;">
        <div style="font-family:${FONT_BODY};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:${LT_TEXT_MUTED};margin-bottom:4px;">
          Datum vystavení
        </div>
        <div style="font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${LT_TEXT_PRIMARY};">
          ${formatDate(issueDate)}
        </div>
      </div>
      <div style="display:table-cell;width:33%;vertical-align:top;">
        <div style="font-family:${FONT_BODY};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:${LT_TEXT_MUTED};margin-bottom:4px;">
          DUZP
        </div>
        <div style="font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${LT_TEXT_PRIMARY};">
          ${formatDate(taxableDate)}
        </div>
      </div>
      <div style="display:table-cell;width:34%;vertical-align:top;">
        <div style="font-family:${FONT_BODY};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:${LT_TEXT_MUTED};margin-bottom:4px;">
          Datum splatnosti
        </div>
        <div style="font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${LT_TEXT_PRIMARY};">
          ${formatDate(dueDate)}
        </div>
      </div>
    </div>
  `

  // ── 4b. Work type — druh vykonané práce ─────────────────────────────
  const workTypeHtml = jobCategory ? `
    <div style="margin-bottom:12px;">
      <div style="font-family:${FONT_BODY};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:${LT_TEXT_MUTED};margin-bottom:4px;">
        Druh vykonané práce
      </div>
      <div style="font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${LT_TEXT_PRIMARY};">
        ${esc(jobCategory)}
      </div>
    </div>
  ` : ''

  // ── 5. Payment info row — three columns ────────────────────────────
  const paymentHtml = `
    <div style="display:table;width:100%;margin-bottom:8px;">
      <div style="display:table-cell;width:33%;vertical-align:top;">
        <div style="font-family:${FONT_BODY};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:${LT_TEXT_MUTED};margin-bottom:4px;">
          Variabilní symbol
        </div>
        <div style="font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${LT_TEXT_PRIMARY};">
          ${esc(variabilniSymbol || '—')}
        </div>
      </div>
      <div style="display:table-cell;width:33%;vertical-align:top;">
        <div style="font-family:${FONT_BODY};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:${LT_TEXT_MUTED};margin-bottom:4px;">
          Forma úhrady
        </div>
        <div style="font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${LT_TEXT_PRIMARY};">
          Bankovní převod
        </div>
      </div>
      <div style="display:table-cell;width:34%;vertical-align:top;">
        <div style="font-family:${FONT_BODY};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:${LT_TEXT_MUTED};margin-bottom:4px;">
          Bankovní spojení
        </div>
        <div style="background:${LT_BG_CARD};border:1px solid ${LT_BORDER_CARD};border-left:3px solid ${GOLD};border-radius:4px;padding:8px 12px;font-family:${FONT_BODY};font-size:12px;font-weight:600;color:${LT_TEXT_PRIMARY};line-height:1.6;box-shadow:${LT_SHADOW_CARD};">
          ${bankBlock(supplier)}
        </div>
      </div>
    </div>
  `

  // ── Divider: between payment and items table ───────────────────────
  const divider2 = `<div style="margin-bottom:20px;">${ltGoldDivider()}</div>`

  // ── 6. Line items table ────────────────────────────────────────────
  const thStyle = `background:${LT_BG_HEADER};color:${LT_GOLD_TABLE};padding:8px 10px;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1px;text-align:left;border:none;border-bottom:1px solid rgba(191,149,63,0.15);font-family:${FONT_BODY};`
  const thRightStyle = `${thStyle}text-align:right;`

  const itemRows = items
    .map(
      (item, i) => {
        const bg = i % 2 === 0 ? LT_BG_CARD : 'rgba(0,0,0,0.015)'
        const tdBase = `padding:8px 10px;font-family:${FONT_BODY};font-size:11px;color:${LT_TEXT_BODY};border:none;border-bottom:1px solid rgba(0,0,0,0.04);background:${bg};`
        const tdR = `${tdBase}text-align:right;font-variant-numeric:tabular-nums;`
        return `
      <tr>
        <td style="${tdBase}">${esc(item.description)}</td>
        <td style="${tdR}">${item.quantity}</td>
        <td style="${tdBase}text-align:center;">${esc(item.unit)}</td>
        <td style="${tdR}">${formatCzk(item.unitPrice)}</td>
        <td style="${tdR}">${formatCzk(item.totalWithoutVat)}</td>
        <td style="${tdR}">${dphLabel(item.vatRate)}</td>
        <td style="${tdR}">${formatCzk(item.vatAmount)}</td>
        <td style="${tdR}font-weight:600;">${formatCzk(item.totalWithVat)}</td>
      </tr>`
      }
    )
    .join('')

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;page-break-inside:avoid;border-radius:6px;overflow:hidden;box-shadow:${LT_SHADOW_CARD};">
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
  `

  // ── 7. Summary section ─────────────────────────────────────────────
  const pb = paymentBreakdown
  // Only show breakdown when grandTotal ≠ paymentFromZR (no negative line item present)
  const hasBreakdown = pb && pb.clientSurcharge > 0 && Math.abs(grandTotal - pb.paymentFromZR) > 1

  const breakdownHtml = hasBreakdown ? `
    <div style="margin-top:16px;margin-bottom:24px;background:${LT_BG_CARD};border:1px solid ${LT_BORDER_CARD};border-radius:8px;padding:16px 20px;page-break-inside:avoid;box-shadow:${LT_SHADOW_CARD};">
      <div style="font-family:${FONT_HEADING};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${LT_GOLD};margin-bottom:12px;">
        Rozklad platby
      </div>
      <div style="display:table;width:100%;margin-bottom:6px;">
        <div style="display:table-cell;font-family:${FONT_BODY};font-size:12px;color:${LT_TEXT_BODY};">Celkem k úhradě (s DPH):</div>
        <div style="display:table-cell;text-align:right;width:120px;font-family:${FONT_BODY};font-size:12px;font-weight:600;color:${LT_TEXT_PRIMARY};">${formatCzk(grandTotal)}</div>
      </div>
      <div style="display:table;width:100%;margin-bottom:6px;">
        <div style="display:table-cell;font-family:${FONT_BODY};font-size:12px;color:#DC2626;">Z toho hradí klient (doplatek s DPH):</div>
        <div style="display:table-cell;text-align:right;width:120px;font-family:${FONT_BODY};font-size:12px;font-weight:600;color:#DC2626;">−${formatCzk(pb.clientSurchargeWithVat)}</div>
      </div>
      <div style="border-top:1px solid rgba(191,149,63,0.3);margin-top:8px;padding-top:8px;display:table;width:100%;">
        <div style="display:table-cell;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${LT_TEXT_PRIMARY};">K úhradě od Zlatí Řemeslníci:</div>
        <div style="display:table-cell;text-align:right;width:120px;font-family:${FONT_BODY};font-size:14px;font-weight:700;color:${LT_TEXT_PRIMARY};">${formatCzk(grandTotal - pb.clientSurchargeWithVat)}</div>
      </div>
    </div>
  ` : ''

  const summaryHtml = `
    <div style="display:table;width:100%;margin-bottom:6px;">
      <div style="display:table-cell;text-align:right;">
        <div style="display:inline-block;width:340px;">
          <div style="display:table;width:100%;margin-bottom:6px;">
            <div style="display:table-cell;text-align:right;padding-right:16px;font-family:${FONT_BODY};font-size:12px;color:${LT_TEXT_SECONDARY};">
              Celkem bez DPH:
            </div>
            <div style="display:table-cell;width:140px;text-align:right;font-family:${FONT_BODY};font-size:12px;font-weight:600;color:${LT_TEXT_PRIMARY};">
              ${formatCzk(subtotal)}
            </div>
          </div>
          <div style="display:table;width:100%;margin-bottom:10px;">
            <div style="display:table-cell;text-align:right;padding-right:16px;font-family:${FONT_BODY};font-size:12px;color:${LT_TEXT_SECONDARY};">
              DPH:
            </div>
            <div style="display:table-cell;width:140px;text-align:right;font-family:${FONT_BODY};font-size:12px;font-weight:600;color:${LT_TEXT_PRIMARY};">
              ${formatCzk(vatTotal)}
            </div>
          </div>
          <div style="border-top:1px solid rgba(0,0,0,0.08);padding-top:10px;display:table;width:100%;margin-bottom:${hasBreakdown ? '10' : '28'}px;">
            <div style="display:table-cell;text-align:right;padding-right:16px;font-family:${FONT_HEADING};font-size:11px;font-weight:700;color:${LT_TEXT_PRIMARY};white-space:nowrap;letter-spacing:1px;">
              CELKEM K ÚHRADĚ:
            </div>
            <div style="display:table-cell;width:140px;text-align:right;">
              <span style="background:linear-gradient(135deg,${GOLD},${GOLD_DARK});color:#ffffff;font-family:${FONT_BODY};font-size:15px;font-weight:700;padding:8px 20px;border-radius:4px;white-space:nowrap;display:inline-block;">
                ${formatCzk(grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${breakdownHtml}
  `

  // ── 8. QR codes section ────────────────────────────────────────────
  let qrHtml = ''
  if (payBySquareQr || invoiceBySquareQr) {
    const leftQr = payBySquareQr
      ? `<div style="display:table-cell;width:50%;vertical-align:top;text-align:center;padding-right:12px;">
          <div style="font-family:${FONT_HEADING};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${LT_GOLD};margin-bottom:8px;">
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
          <div style="font-family:${FONT_HEADING};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${LT_GOLD};margin-bottom:8px;">
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

  // ── 9. Note section ────────────────────────────────────────────────
  const noteHtml = note
    ? `<div style="margin-bottom:24px;padding:12px 16px;background:${LT_BG_CARD};border:1px solid ${LT_BORDER_CARD};border-left:3px solid ${GOLD};border-radius:4px;box-shadow:${LT_SHADOW_CARD};font-family:${FONT_BODY};font-size:11px;color:${LT_TEXT_BODY};line-height:1.6;">
        ${esc(note)}
      </div>`
    : ''

  const invoiceNoteHtml = supplier.invoice_note
    ? `<div style="margin-bottom:24px;padding:12px 16px;background:rgba(250,249,247,0.8);border:1px solid ${LT_BORDER_CARD};border-left:3px solid ${GOLD};border-radius:4px;font-family:${FONT_BODY};font-size:11px;color:${LT_TEXT_BODY};line-height:1.6;">
        ${esc(supplier.invoice_note)}
      </div>`
    : ''

  // ── 10. Footer ─────────────────────────────────────────────────────
  const footerHtml = `
    <div style="margin-top:32px;text-align:center;">
      <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(191,149,63,0.4),transparent);margin-bottom:10px;"></div>
      <div style="font-family:${FONT_HEADING};font-size:9px;color:rgba(154,123,46,0.6);letter-spacing:2px;margin-bottom:3px;">
        Zlatí Řemeslníci
      </div>
      <div style="font-family:${FONT_BODY};font-size:8px;color:${LT_TEXT_MUTED};letter-spacing:0.3px;">
        Vystaveno elektronicky${invoiceNumber ? ` \u00b7 ${esc(invoiceNumber)}` : ''}
      </div>
    </div>
  `

  // ── Assemble — light page shell ────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Faktura ${esc(invoiceNumber || '')} — Zlatí Řemeslníci</title>
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
    @media print { body { background: white; } }
  </style>
</head>
<body>
<div style="
  width:210mm; min-height:297mm; margin:0 auto;
  background:${LT_BG_PAGE}; padding:0; position:relative; overflow:hidden;
">
  ${goldBar(4)}
  <div style="position:absolute;top:4px;left:0;right:0;height:200px;background:radial-gradient(ellipse at 50% 0%,rgba(191,149,63,0.05) 0%,transparent 70%);pointer-events:none;"></div>
  <div style="padding:0 36px 28px 36px;position:relative;z-index:1;">
    ${headerHtml}
    ${divider1}
    ${partiesHtml}
    ${datesHtml}
    ${workTypeHtml}
    ${paymentHtml}
    ${divider2}
    ${tableHtml}
    ${summaryHtml}
    ${qrHtml}
    ${noteHtml}
    ${invoiceNoteHtml}
    ${footerHtml}
  </div>
  <div style="height:3px;background:linear-gradient(90deg,${GOLD_DARK},${GOLD},${GOLD_LIGHT},${GOLD},${GOLD_DARK});position:absolute;bottom:0;left:0;right:0;"></div>
</div>
</body>
</html>`
}
