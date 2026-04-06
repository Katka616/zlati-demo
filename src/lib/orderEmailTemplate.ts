/**
 * orderEmailTemplate.ts — HTML email template for technician job order.
 *
 * Inline CSS, table-based layout (email-client safe).
 * Logo embedded as CID attachment (cid:logo).
 * ZR dark+gold brand design.
 */

import czStrings from '@/i18n/cz.json'
import skStrings from '@/i18n/sk.json'

// ── Types ──────────────────────────────────────────────────────────

export interface OrderEmailData {
  jobId: number
  referenceNumber: string
  category: string
  urgency: string
  scheduledDate: string | null
  scheduledTime: string | null
  proposedSchedule: { date: string; time: string; status: string } | null
  customerName: string
  customerPhone: string
  customerAddress: string
  customerCity: string
  customerPsc: string
  description: string
  appUrl: string
}

type Locale = 'cs' | 'sk'

// ── Helpers ────────────────────────────────────────────────────────

function t(locale: Locale, key: string): string {
  const strings = locale === 'sk' ? skStrings : czStrings
  const parts = key.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let val: any = strings
  for (const p of parts) {
    val = val?.[p]
  }
  return typeof val === 'string' ? val : key
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDateForEmail(dateStr: string | null, timeStr: string | null, locale: Locale): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    const lang = locale === 'sk' ? 'sk-SK' : 'cs-CZ'
    const dayNum = d.getDate()
    const monthName = d.toLocaleDateString(lang, { month: 'long' })
    const year = d.getFullYear()
    const weekday = d.toLocaleDateString(lang, { weekday: 'long' })
    const capitalWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
    const time = timeStr || ''
    return `${dayNum}. ${monthName} ${year}, ${capitalWeekday}${time ? ` · ${time}` : ''}`
  } catch {
    return dateStr
  }
}

function formatDay(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).getDate().toString()
  } catch {
    return '—'
  }
}

function isUrgent(urgency: string): boolean {
  return urgency === 'urgent' || urgency === 'emergency' || urgency === 'asap'
}

function gmapsLink(address: string, city: string, psc: string): string {
  const q = encodeURIComponent(`${address}, ${city}, ${psc}`)
  return `https://maps.google.com/?q=${q}`
}

// ── Template ───────────────────────────────────────────────────────

export function buildOrderEmailHtml(data: OrderEmailData, locale: Locale = 'cs'): string {
  const urgent = isUrgent(data.urgency)
  const urgencyLabel = urgent ? t(locale, 'orderEmail.urgent') : t(locale, 'orderEmail.standard')
  const urgencyColor = urgent ? '#ff8a50' : '#4a9eff'
  const urgencyBg = urgent ? 'rgba(255,87,34,0.12)' : 'rgba(74,158,255,0.08)'
  const urgencyBorder = urgent ? 'rgba(255,87,34,0.35)' : 'rgba(74,158,255,0.25)'
  const fullAddress = `${esc(data.customerAddress)}, ${esc(data.customerCity)}, ${esc(data.customerPsc)}`
  const mapsUrl = gmapsLink(data.customerAddress, data.customerCity, data.customerPsc)
  const hasProposed = !data.scheduledDate && data.proposedSchedule
  const effectiveDate = data.scheduledDate || (data.proposedSchedule?.date ?? null)
  const effectiveTime = data.scheduledTime || (data.proposedSchedule?.time ?? null)
  const dateFormatted = formatDateForEmail(effectiveDate, effectiveTime, locale)
  const dayNum = formatDay(effectiveDate)
  const dateLabel = hasProposed ? t(locale, 'orderEmail.proposedDate') : t(locale, 'orderEmail.plannedDate')
  const dispatchUrl = `${data.appUrl}/dispatch/job/${data.jobId}`

  return `<!DOCTYPE html>
<html lang="${locale === 'sk' ? 'sk' : 'cs'}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#111111;font-family:'Montserrat','Segoe UI','Helvetica Neue',Arial,sans-serif;color:#e0e0e0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111111;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#0a0a0a;border:1px solid rgba(212,168,67,0.25);border-radius:6px;overflow:hidden;">

<!-- Gold strip -->
<tr><td style="height:3px;background:linear-gradient(90deg,#aa771c,#D4A843,#fcf6ba,#D4A843,#aa771c);font-size:0;line-height:0;">&nbsp;</td></tr>

<!-- Header -->
<tr><td style="padding:28px 32px;background:linear-gradient(160deg,#0a0a0a 0%,#14110a 60%,#1a1510 100%);border-bottom:1px solid rgba(212,168,67,0.2);">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td valign="middle">
      <div style="font-family:'Cinzel','Georgia','Times New Roman',serif;font-size:22px;font-weight:700;color:#D4A843;letter-spacing:1.5px;">${t(locale, 'orderEmail.newOrder')}</div>
      <div style="font-size:11px;color:#888;margin-top:5px;letter-spacing:2px;text-transform:uppercase;font-weight:500;">${t(locale, 'orderEmail.companyName')}</div>
    </td>
  </tr></table>
</td></tr>

<!-- Urgency bar -->
<tr><td style="padding:12px 32px;background:rgba(212,168,67,0.05);border-bottom:1px solid rgba(255,255,255,0.04);">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="padding:5px 14px;border-radius:3px;background:${urgencyBg};border:1px solid ${urgencyBorder};color:${urgencyColor};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;white-space:nowrap;">${urgent ? '&#9889; ' : ''}${urgencyLabel}</td>
    <td style="padding-left:14px;font-size:13px;color:#777;">${t(locale, 'orderEmail.orderNumber')}: <strong style="color:#D4A843;font-weight:600;">${esc(data.referenceNumber)}</strong></td>
  </tr></table>
</td></tr>

<!-- Basic info -->
<tr><td style="padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.04);">
  <div style="font-family:'Cinzel','Georgia',serif;font-size:12px;font-weight:700;color:#D4A843;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;">${t(locale, 'orderEmail.basicInfo')}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="50%" valign="top" style="padding-bottom:14px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#888;margin-bottom:4px;">${t(locale, 'orderEmail.category')}</div>
        <div style="font-size:14px;color:#e8e8e8;">${esc(data.category)}</div>
      </td>
      <td width="50%" valign="top" style="padding-bottom:14px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#888;margin-bottom:4px;">${t(locale, 'orderEmail.jobNumber')}</div>
        <div style="font-size:14px;color:#e8e8e8;">#${data.jobId}</div>
      </td>
    </tr>
    <tr><td colspan="2">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#888;margin-bottom:8px;">${dateLabel}</div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="background:rgba(212,168,67,0.06);border:1px solid rgba(212,168,67,0.15);border-radius:6px;">
        <tr>
          <td style="padding:14px 0 14px 18px;font-family:'Cinzel','Georgia',serif;font-size:30px;font-weight:700;color:#D4A843;line-height:1;padding-right:14px;">${dayNum}</td>
          <td style="padding:14px 18px 14px 0;">
            <div style="font-size:13px;font-weight:600;color:#e0e0e0;">${dateFormatted}</div>${hasProposed ? `
            <div style="font-size:11px;color:#ff8a50;margin-top:6px;font-weight:500;">${t(locale, 'orderEmail.proposedDatePending')}</div>` : ''}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</td></tr>

<!-- Client -->
<tr><td style="padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.04);">
  <div style="font-family:'Cinzel','Georgia',serif;font-size:12px;font-weight:700;color:#D4A843;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;">${t(locale, 'orderEmail.client')}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="50%" valign="top" style="padding-bottom:14px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#888;margin-bottom:4px;">${t(locale, 'orderEmail.name')}</div>
        <div style="font-size:14px;color:#e8e8e8;">${esc(data.customerName)}</div>
      </td>
      <td width="50%" valign="top" style="padding-bottom:14px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#888;margin-bottom:4px;">${t(locale, 'orderEmail.phone')}</div>
        <div style="font-size:14px;"><a href="tel:${esc(data.customerPhone)}" style="color:#5ba8ff;font-weight:500;text-decoration:none;">${esc(data.customerPhone)}</a></div>
      </td>
    </tr>
    <tr><td colspan="2">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#888;margin-bottom:4px;">${t(locale, 'orderEmail.address')}</div>
      <div style="font-size:14px;"><a href="${mapsUrl}" target="_blank" style="color:#D4A843;text-decoration:none;border-bottom:1px solid rgba(212,168,67,0.2);padding-bottom:1px;">${fullAddress}</a></div>
    </td></tr>
  </table>
</td></tr>

<!-- Description -->
<tr><td style="padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.04);">
  <div style="font-family:'Cinzel','Georgia',serif;font-size:12px;font-weight:700;color:#D4A843;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;">${t(locale, 'orderEmail.faultDescription')}</div>
  <div style="background:rgba(212,168,67,0.03);border:1px solid rgba(212,168,67,0.1);border-left:3px solid #D4A843;border-radius:4px;padding:16px 18px;font-size:13px;line-height:1.7;color:#bbb;">${esc(data.description || '—')}</div>
</td></tr>

<!-- Instructions -->
<tr><td style="padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.04);">
  <div style="font-family:'Cinzel','Georgia',serif;font-size:12px;font-weight:700;color:#D4A843;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;">${t(locale, 'orderEmail.importantInstructions')}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <!-- App instruction -->
    <tr><td style="padding-bottom:16px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="34" valign="top"><div style="width:34px;height:34px;border-radius:50%;background:rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.25);text-align:center;line-height:34px;font-size:15px;">&#128241;</div></td>
        <td style="padding-left:14px;">
          <div style="font-size:13px;font-weight:600;color:#e0e0e0;margin-bottom:4px;">${t(locale, 'orderEmail.instructionApp')}</div>
          <div style="font-size:12px;color:#888;line-height:1.6;">${t(locale, 'orderEmail.instructionAppDesc')}</div>
        </td>
      </tr></table>
    </td></tr>
    <!-- Protocol instruction -->
    <tr><td style="padding-bottom:16px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="34" valign="top"><div style="width:34px;height:34px;border-radius:50%;background:rgba(255,152,0,0.1);border:1px solid rgba(255,152,0,0.25);text-align:center;line-height:34px;font-size:15px;">&#9997;&#65039;</div></td>
        <td style="padding-left:14px;">
          <div style="font-size:13px;font-weight:600;color:#e0e0e0;margin-bottom:4px;">${t(locale, 'orderEmail.instructionProtocol')}</div>
          <div style="font-size:12px;color:#888;line-height:1.6;">${t(locale, 'orderEmail.instructionProtocolDesc')}</div>
        </td>
      </tr></table>
    </td></tr>
    <!-- Photos instruction -->
    <tr><td>
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="34" valign="top"><div style="width:34px;height:34px;border-radius:50%;background:rgba(74,158,255,0.08);border:1px solid rgba(74,158,255,0.2);text-align:center;line-height:34px;font-size:15px;">&#128248;</div></td>
        <td style="padding-left:14px;">
          <div style="font-size:13px;font-weight:600;color:#e0e0e0;margin-bottom:4px;">${t(locale, 'orderEmail.instructionPhotos')}</div>
          <div style="font-size:12px;color:#888;line-height:1.6;">${t(locale, 'orderEmail.instructionPhotosDesc')}</div>
        </td>
      </tr></table>
    </td></tr>
  </table>
</td></tr>

<!-- Backup protocol attachment -->
<tr><td style="padding:20px 32px;background:rgba(0,0,0,0.15);border-bottom:1px solid rgba(255,255,255,0.04);">
  <div style="font-family:'Cinzel','Georgia',serif;font-size:12px;font-weight:700;color:#D4A843;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">${t(locale, 'orderEmail.backupProtocol')}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:rgba(212,168,67,0.04);border:1px dashed rgba(212,168,67,0.2);border-radius:6px;">
    <tr>
      <td width="38" valign="middle" style="padding:14px 0 14px 18px;">
        <div style="width:38px;height:46px;background:linear-gradient(135deg,#D4A843,#b8912e);border-radius:3px;text-align:center;line-height:46px;font-size:10px;font-weight:800;color:#0a0a0a;">PDF</div>
      </td>
      <td style="padding:14px 18px 14px 14px;">
        <div style="font-size:12px;color:#ccc;font-weight:600;margin-bottom:3px;">${t(locale, 'orderEmail.backupProtocolFile')}</div>
        <div style="font-size:11px;color:#777;line-height:1.5;">${t(locale, 'orderEmail.backupProtocolDesc')}</div>
      </td>
    </tr>
  </table>
</td></tr>

<!-- CTA -->
<tr><td style="padding:30px 32px;text-align:center;background:linear-gradient(180deg,rgba(212,168,67,0.03),rgba(212,168,67,0.06));border-top:1px solid rgba(212,168,67,0.12);">
  <a href="${dispatchUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#D4A843 0%,#c49a36 50%,#b8912e 100%);color:#0a0a0a;font-family:'Cinzel','Georgia',serif;font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:15px 44px;border-radius:4px;">${t(locale, 'orderEmail.ctaButton')} &rarr;</a>
  <div style="font-size:11px;color:#888;margin-top:12px;">${t(locale, 'orderEmail.ctaHint')}</div>
</td></tr>

<!-- Footer -->
<tr><td style="padding:22px 32px;background:rgba(0,0,0,0.4);border-top:1px solid rgba(255,255,255,0.04);text-align:center;">
  <div style="font-family:'Cinzel','Georgia',serif;font-size:11px;color:#D4A843;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Zlatí Řemeslníci s.r.o.</div>
  <div style="font-size:10px;color:#777;line-height:1.8;">
    Školská 660/3, 110 00 Praha 1<br>
    <a href="tel:+420228222061" style="color:#777;text-decoration:none;">+420 228 222 061</a> &middot;
    <a href="mailto:objednavky@zlatiremeslnici.com" style="color:#777;text-decoration:none;">objednavky@zlatiremeslnici.com</a><br>
    IČO: 22524894 &middot; DIČ: CZ22524894
  </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}
