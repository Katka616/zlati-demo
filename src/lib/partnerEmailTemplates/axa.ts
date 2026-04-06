/**
 * AXA Assistance — 5 automated email templates (Czech).
 *
 * All emails: FROM axa@zlatiremeslnici.com → TO info.tech@axa-assistance.cz
 * Subject always contains reference_number.
 * NEVER reveals technician name.
 */

import type { AxaEmailData, AxaTriggerKey, PartnerEmailResult } from './index'

// ---------------------------------------------------------------------------
// Utilities (same pattern as emailTemplates/templates.ts)
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&middot;/g, '·')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ---------------------------------------------------------------------------
// HTML fragments — branded dark/gold layout
// ---------------------------------------------------------------------------

function logoHeader(): string {
  return `<tr><td align="center" style="padding:0 0 4px;">
    <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#D4A843;letter-spacing:3px;">ZLATÍ ŘEMESLNÍCI</span>
  </td></tr>
  <tr><td align="center" style="padding:0 0 20px;">
    <span style="font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:500;color:#777777;letter-spacing:4px;text-transform:uppercase;">SPOLEHLIVÍ ŘEMESLNÍCI</span>
  </td></tr>`
}

function htmlWrapper(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="cs" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a0a0a;">
<tr><td style="height:4px;background:linear-gradient(90deg,#aa771c,#D4A843,#fcf6ba,#D4A843,#aa771c);font-size:0;line-height:0;">&nbsp;</td></tr>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a0a0a;">
<tr><td align="center" style="padding:24px 16px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">

  ${logoHeader()}

  <tr><td align="center" style="padding:0 0 24px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="60">
    <tr><td style="height:2px;background:linear-gradient(90deg,#aa771c,#D4A843,#aa771c);border-radius:1px;"></td></tr>
    </table>
  </td></tr>

  <tr><td style="background-color:#151515;border:1px solid #2a2a2a;border-radius:16px;padding:32px 28px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${body}
    </table>
  </td></tr>

  <tr><td height="24"></td></tr>

  <tr><td align="center" style="border-top:1px solid #222222;padding-top:20px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="font-family:Georgia,'Times New Roman',serif;font-size:10px;font-weight:700;color:#D4A843;letter-spacing:2px;padding-bottom:8px;">
      ZLATÍ ŘEMESLNÍCI S.R.O.
    </td></tr>
    <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#666666;text-align:center;line-height:18px;">
      Školská 660/3, 110 00 Praha 1 &middot; IČO: 22524894 &middot; DIČ: CZ22524894
    </td></tr>
    <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#666666;text-align:center;line-height:18px;padding-top:4px;">
      <a href="tel:+420228222061" style="color:#D4A843;text-decoration:none;">+420 228 222 061</a> &middot;
      <a href="mailto:axa@zlatiremeslnici.com" style="color:#D4A843;text-decoration:none;">axa@zlatiremeslnici.com</a> &middot;
      <a href="https://www.zlatiremeslnici.com" style="color:#D4A843;text-decoration:none;">www.zlatiremeslnici.com</a>
    </td></tr>
    </table>
  </td></tr>

</table>

</td></tr>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a0a0a;">
<tr><td style="height:3px;background:linear-gradient(90deg,#aa771c,#D4A843,#fcf6ba,#D4A843,#aa771c);font-size:0;line-height:0;">&nbsp;</td></tr>
</table>

</body>
</html>`
}

function heading(text: string): string {
  return `    <tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#ffffff;padding-bottom:20px;">
      ${text}
    </td></tr>`
}

function paragraph(text: string): string {
  return `    <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:26px;color:#cccccc;padding-bottom:20px;">
      ${text}
    </td></tr>`
}

function infoBox(rows: Array<[string, string]>): string {
  const rowsHtml = rows.map(([label, value]) => `
        <tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#999999;padding:6px 12px 6px 0;white-space:nowrap;vertical-align:top;">${label}</td>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#ffffff;padding:6px 0;">${value}</td>
        </tr>`).join('')
  return `    <tr><td style="padding-bottom:20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1a1a1a;border:1px solid #333333;border-radius:10px;padding:16px 20px;">
        ${rowsHtml}
      </table>
    </td></tr>`
}

function signature(): string {
  return `    <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#cccccc;padding-top:12px;border-top:1px solid #2a2a2a;">
      S pozdravem,<br>
      <strong style="color:#D4A843;font-family:Georgia,'Times New Roman',serif;">Zlatí Řemeslníci</strong><br>
      <a href="tel:+420228222061" style="color:#D4A843;text-decoration:none;font-size:13px;">+420 228 222 061</a><br>
      <a href="mailto:axa@zlatiremeslnici.com" style="color:#D4A843;text-decoration:none;font-size:13px;">axa@zlatiremeslnici.com</a>
    </td></tr>`
}

function buildInfoRows(data: AxaEmailData): Array<[string, string]> {
  const rows: Array<[string, string]> = []
  if (data.category) rows.push(['Kategorie:', escapeHtml(data.category)])
  const addr = [data.customer_address, data.customer_city].filter(Boolean).join(', ')
  if (addr) rows.push(['Adresa:', escapeHtml(addr)])
  if (data.description) rows.push(['Popis závady:', escapeHtml(data.description)])
  return rows
}

// ---------------------------------------------------------------------------
// Template 1 — unassigned_1h
// ---------------------------------------------------------------------------

function renderUnassigned1h(data: AxaEmailData): PartnerEmailResult {
  const subject = `Zákazka ${data.ref} — Pracujeme na přiřazení technika`

  const rows = buildInfoRows(data)
  const body = [
    heading('Pracujeme na přiřazení technika'),
    paragraph(`Vážení kolegové,<br><br>potvrzujeme přijetí Vaší objednávky č. <strong style="color:#D4A843;">${escapeHtml(data.ref)}</strong>.<br><br>Na zakázce intenzivně pracujeme a hledáme nejvhodnějšího technika pro danou lokalitu a typ poruchy.`),
    rows.length > 0 ? infoBox(rows) : '',
    paragraph('O přiřazení technika a dohodnutém termínu Vás budeme neprodleně informovat.'),
    signature(),
  ].join('\n')

  const bodyHtml = htmlWrapper(subject, body)
  return { subject, bodyHtml, bodyText: stripHtml(bodyHtml) }
}

// ---------------------------------------------------------------------------
// Template 2 — tech_assigned
// ---------------------------------------------------------------------------

function renderTechAssigned(data: AxaEmailData): PartnerEmailResult {
  const dateStr = data.scheduled_date || 'bude upřesněn'
  const subject = `Zákazka ${data.ref} — Technik přiřazen, termín ${dateStr}`

  const scheduleText = data.scheduled_time
    ? `${dateStr} v ${escapeHtml(data.scheduled_time)}`
    : dateStr

  const rows: Array<[string, string]> = [
    ['Dohodnutý termín:', scheduleText],
  ]
  if (data.category) rows.push(['Kategorie:', escapeHtml(data.category)])
  const addr = [data.customer_address, data.customer_city].filter(Boolean).join(', ')
  if (addr) rows.push(['Adresa:', escapeHtml(addr)])

  const body = [
    heading('Technik přiřazen'),
    paragraph(`Vážení kolegové,<br><br>k zakázce č. <strong style="color:#D4A843;">${escapeHtml(data.ref)}</strong> byl přiřazen technik.`),
    infoBox(rows),
    paragraph('O průběhu opravy Vás budeme dále informovat.'),
    signature(),
  ].join('\n')

  const bodyHtml = htmlWrapper(subject, body)
  return { subject, bodyHtml, bodyText: stripHtml(bodyHtml) }
}

// ---------------------------------------------------------------------------
// Template 3 — repair_completed
// ---------------------------------------------------------------------------

function renderRepairCompleted(data: AxaEmailData): PartnerEmailResult {
  const subject = `Zákazka ${data.ref} — Oprava úspěšně dokončena`

  const rows: Array<[string, string]> = []
  if (data.category) rows.push(['Kategorie:', escapeHtml(data.category)])
  const addr = [data.customer_address, data.customer_city].filter(Boolean).join(', ')
  if (addr) rows.push(['Adresa:', escapeHtml(addr)])

  const body = [
    heading('Oprava úspěšně dokončena'),
    paragraph(`Vážení kolegové,<br><br>zakázka č. <strong style="color:#D4A843;">${escapeHtml(data.ref)}</strong> byla úspěšně dokončena.`),
    rows.length > 0 ? infoBox(rows) : '',
    paragraph('Protokol a dokumentaci obdržíte společně s fakturou.'),
    signature(),
  ].join('\n')

  const bodyHtml = htmlWrapper(subject, body)
  return { subject, bodyHtml, bodyText: stripHtml(bodyHtml) }
}

// ---------------------------------------------------------------------------
// Template 4 — diagnostic_only
// ---------------------------------------------------------------------------

function renderDiagnosticOnly(data: AxaEmailData): PartnerEmailResult {
  const subject = `Zákazka ${data.ref} — Ukončeno diagnostikou`

  const reason = data.diagnostic_reason || 'Neuvedeno'
  const rows: Array<[string, string]> = [
    ['Důvod:', escapeHtml(reason)],
  ]
  if (data.category) rows.push(['Kategorie:', escapeHtml(data.category)])
  const addr = [data.customer_address, data.customer_city].filter(Boolean).join(', ')
  if (addr) rows.push(['Adresa:', escapeHtml(addr)])

  const body = [
    heading('Ukončeno diagnostikou'),
    paragraph(`Vážení kolegové,<br><br>zakázka č. <strong style="color:#D4A843;">${escapeHtml(data.ref)}</strong> byla ukončena ve fázi diagnostiky.`),
    infoBox(rows),
    paragraph('Protokol a dokumentaci obdržíte společně s fakturou.'),
    signature(),
  ].join('\n')

  const bodyHtml = htmlWrapper(subject, body)
  return { subject, bodyHtml, bodyText: stripHtml(bodyHtml) }
}

// ---------------------------------------------------------------------------
// Template 5 — multi_visit
// ---------------------------------------------------------------------------

function renderMultiVisit(data: AxaEmailData): PartnerEmailResult {
  const nextDate = data.next_visit_date || null
  const subjectDate = nextDate ? nextDate : 'bude upřesněno'
  const subject = `Zákazka ${data.ref} — Přerušeno, pokračování ${subjectDate}`

  const rows: Array<[string, string]> = [
    ['Předpokládaný termín:', nextDate ? escapeHtml(nextDate) : 'Bude upřesněn'],
  ]
  if (data.category) rows.push(['Kategorie:', escapeHtml(data.category)])
  const addr = [data.customer_address, data.customer_city].filter(Boolean).join(', ')
  if (addr) rows.push(['Adresa:', escapeHtml(addr)])

  const body = [
    heading('Přerušeno — pokračování opravy'),
    paragraph(`Vážení kolegové,<br><br>zakázka č. <strong style="color:#D4A843;">${escapeHtml(data.ref)}</strong> vyžaduje další návštěvu.<br><br>Čeká se na materiál / oprava vyžaduje pokračování.`),
    infoBox(rows),
    paragraph('O dalším průběhu Vás budeme informovat.'),
    signature(),
  ].join('\n')

  const bodyHtml = htmlWrapper(subject, body)
  return { subject, bodyHtml, bodyText: stripHtml(bodyHtml) }
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const RENDERERS: Record<AxaTriggerKey, (data: AxaEmailData) => PartnerEmailResult> = {
  unassigned_1h: renderUnassigned1h,
  tech_assigned: renderTechAssigned,
  repair_completed: renderRepairCompleted,
  diagnostic_only: renderDiagnosticOnly,
  multi_visit: renderMultiVisit,
}

/**
 * Render an AXA email template by trigger key.
 */
export function renderAxaEmail(
  triggerKey: AxaTriggerKey,
  data: AxaEmailData
): PartnerEmailResult {
  const renderer = RENDERERS[triggerKey]
  if (!renderer) {
    throw new Error(`[AxaTemplates] Unknown trigger key: ${triggerKey}`)
  }
  return renderer(data)
}
