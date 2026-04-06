/**
 * protocolTemplate.ts — HTML template for protocol PDFs.
 *
 * Generates a complete HTML document using the LIGHT gold brand design.
 * Used by the PDF generation pipeline after protocol signing.
 */

import {
  GOLD, GOLD_LIGHT, GOLD_DARK, FONT_HEADING, FONT_BODY,
  LT_BG_PAGE, LT_BG_CARD, LT_BORDER_CARD, LT_SHADOW_CARD,
  LT_GOLD, LT_GOLD_TABLE, LT_TEXT_PRIMARY, LT_TEXT_BODY,
  LT_TEXT_SECONDARY, LT_TEXT_MUTED, LT_TEXT_LABEL,
  LT_BORDER_ROW, LT_TABLE_ALT, LT_BG_HEADER,
  ltPageShell, ltSectionHeader, ltCard, ltGoldDivider,
  ltSummaryStat, ltFooter, payerBadge, logoHtmlLight,
  ltThStyle, ltTdStyle,
} from '@/lib/pdfBrandUtils'

import { getCategoryLabel } from '@/lib/constants'
import type { PdfProtocolInput } from '@/lib/protocolPdf'

// ── Local helpers ───────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}. ${month}. ${year}`
  } catch {
    return iso
  }
}

function formatPrice(n: number): string {
  return n.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč'
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

// ── Main generator ──────────────────────────────────────────────────

export function generateProtocolHtml(input: PdfProtocolInput): string {
  const filledMaterials = input.materials.filter(m => m.name?.trim())
  const validPhotos = input.photos.filter(p => p.data && p.data.length > 50)

  // ── 1. Header ────────────────────────────────────────────────────
  const visitBadge = input.visitNumber
    ? `<div style="
        position:absolute;top:0;right:0;
        background:linear-gradient(135deg,${GOLD_DARK},${GOLD});
        color:#1a1a1a;font-family:${FONT_BODY};font-size:9px;font-weight:700;
        padding:5px 12px;border-radius:0 6px 0 10px;
        letter-spacing:0.5px;white-space:nowrap;
      ">${input.isMultiVisit
        ? `Návštěva ${input.visitNumber}${input.totalVisitsPlanned ? ` z ${input.totalVisitsPlanned}` : ''}`
        : `Návštěva ${input.visitNumber}`
      }</div>`
    : ''

  const header = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;position:relative;padding-right:120px;">
      ${logoHtmlLight(52)}
      <div>
        <div style="font-family:${FONT_HEADING};font-size:14px;font-weight:700;color:${LT_GOLD};letter-spacing:2px;line-height:1.2;">Zlatí Řemeslníci</div>
        <div style="font-family:${FONT_HEADING};font-size:16px;font-weight:600;color:${LT_TEXT_PRIMARY};margin-top:2px;line-height:1.2;">Protokol o provedení opravy</div>
      </div>
      ${visitBadge}
    </div>`

  // ── 2. Reference bar ─────────────────────────────────────────────
  const refBar = `
    <div style="
      background:rgba(191,149,63,0.06);border:1px solid rgba(191,149,63,0.2);
      border-radius:6px;padding:8px 14px;margin-bottom:12px;
      display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;
    ">
      <div>
        <span style="font-size:9px;color:${LT_TEXT_LABEL};text-transform:uppercase;letter-spacing:1px;">Zakázka</span>
        <span style="font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${LT_GOLD};margin-left:8px;">#${esc(input.referenceNumber)}</span>
        <span style="font-size:9px;color:${LT_TEXT_SECONDARY};margin-left:10px;">${esc(protocolTypeLabel(input.protocolType))}</span>
      </div>
      <div style="font-size:9px;color:${LT_TEXT_MUTED};text-align:right;white-space:nowrap;">
        ${input.createdAt ? `Vytvořeno: <strong>${formatDate(input.createdAt)}</strong>` : ''}
        ${input.signedAt ? `&nbsp;·&nbsp; Podepsáno: <strong>${formatDate(input.signedAt)}</strong>` : ''}
      </div>
    </div>`

  // ── 3. Customer card ─────────────────────────────────────────────
  const customerCard = `
    <div style="margin-bottom:12px;">
      ${ltSectionHeader('Zákazník')}
      ${ltCard(`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
          <div style="padding:9px 14px;border-right:1px solid ${LT_BORDER_ROW};border-bottom:1px solid ${LT_BORDER_ROW};">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${LT_TEXT_LABEL};margin-bottom:3px;">Jméno</div>
            <div style="font-size:10.5px;font-weight:600;color:${LT_TEXT_PRIMARY};">${esc(input.customerName || '—')}</div>
          </div>
          <div style="padding:9px 14px;border-bottom:1px solid ${LT_BORDER_ROW};">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${LT_TEXT_LABEL};margin-bottom:3px;">Asistence</div>
            <div style="font-size:10.5px;font-weight:600;color:${LT_GOLD};">${esc(input.insurance || '—')}</div>
          </div>
          <div style="padding:9px 14px;border-right:1px solid ${LT_BORDER_ROW};">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${LT_TEXT_LABEL};margin-bottom:3px;">Adresa</div>
            <div style="font-size:10.5px;font-weight:600;color:${LT_TEXT_PRIMARY};">${esc([input.customerAddress, input.customerCity].filter(Boolean).join(', ') || '—')}</div>
          </div>
          <div style="padding:9px 14px;">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${LT_TEXT_LABEL};margin-bottom:3px;">Kategorie</div>
            <div style="font-size:10.5px;font-weight:600;color:${LT_TEXT_PRIMARY};">${esc(getCategoryLabel(input.category) || input.category || '—')}</div>
          </div>
        </div>
      `)}
    </div>`

  // ── 4. Visits table ──────────────────────────────────────────────
  let visitsSection = ''
  if (input.visits.length > 0) {
    const visitRows = input.visits.map((v, i) => `
      <tr style="background:${i % 2 === 1 ? LT_TABLE_ALT : 'transparent'};">
        <td style="${ltTdStyle()}">${esc(v.date || '—')}</td>
        <td style="${ltTdStyle()}">${esc(v.arrival || '—')}</td>
        <td style="${ltTdStyle()}">${esc(v.departure || '—')}</td>
        <td style="${ltTdStyle('text-align:right;font-weight:600;')}">${isNaN(v.hours) ? '—' : v.hours.toLocaleString('cs-CZ')} h</td>
        <td style="${ltTdStyle('text-align:right;font-weight:600;')}">${isNaN(v.km) ? '—' : v.km.toLocaleString('cs-CZ')} km</td>
      </tr>`).join('')

    visitsSection = `
      <div style="margin-bottom:12px;">
        ${ltSectionHeader('Výjezdy')}
        ${ltCard(`
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="${ltThStyle()}">Datum</th>
                <th style="${ltThStyle()}">Příjezd</th>
                <th style="${ltThStyle()}">Odjezd</th>
                <th style="${ltThStyle('text-align:right;')}">Hodiny</th>
                <th style="${ltThStyle('text-align:right;')}">km</th>
              </tr>
            </thead>
            <tbody>${visitRows}</tbody>
          </table>
        `)}
      </div>`
  }

  // ── 5. Work description ──────────────────────────────────────────
  const workSection = `
    <div style="margin-bottom:12px;">
      ${ltSectionHeader('Popis provedené práce')}
      <div style="
        background:${LT_BG_CARD};border:1px solid ${LT_BORDER_CARD};border-radius:6px;
        box-shadow:${LT_SHADOW_CARD};overflow:hidden;
        border-left:3px solid #D4A843;
        padding:12px 14px;
        font-size:10px;line-height:1.65;color:${LT_TEXT_BODY};
        white-space:pre-wrap;
      ">${esc(input.workDescription || '—')}</div>
    </div>`

  // ── 6. Tech notes (conditional) ──────────────────────────────────
  let techNotesSection = ''
  if (input.techNotes?.trim()) {
    techNotesSection = `
      <div style="margin-bottom:12px;">
        ${ltSectionHeader('Poznámky technika')}
        <div style="
          background:rgba(191,149,63,0.04);border:1px solid rgba(191,149,63,0.15);border-radius:6px;
          border-left:3px solid #D4A843;
          padding:10px 14px;
          font-size:10px;line-height:1.65;color:${LT_TEXT_BODY};font-style:italic;
          white-space:pre-wrap;
        ">${esc(input.techNotes.trim())}</div>
      </div>`
  }

  // ── 7. Materials table ───────────────────────────────────────────
  let materialsSection = ''
  if (filledMaterials.length > 0) {
    const materialTotal = filledMaterials.reduce((s, m) => s + (m.price * m.qty), 0)
    const matRows = filledMaterials.map((m, i) => `
      <tr style="background:${i % 2 === 1 ? LT_TABLE_ALT : 'transparent'};">
        <td style="${ltTdStyle()}">${esc(m.name)}</td>
        <td style="${ltTdStyle('text-align:center;')}">${m.qty}</td>
        <td style="${ltTdStyle('text-align:center;')}">${esc(m.unit || '—')}</td>
        <td style="${ltTdStyle('text-align:right;font-weight:600;')}">${formatPrice(m.price)}</td>
        <td style="${ltTdStyle('text-align:right;')}">${payerBadge(m.payer)}</td>
      </tr>`).join('')

    materialsSection = `
      <div style="margin-bottom:12px;">
        ${ltSectionHeader('Materiál')}
        ${ltCard(`
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="${ltThStyle()}">Název</th>
                <th style="${ltThStyle('text-align:center;')}">Mn.</th>
                <th style="${ltThStyle('text-align:center;')}">Jedn.</th>
                <th style="${ltThStyle('text-align:right;')}">Cena</th>
                <th style="${ltThStyle('text-align:right;')}">Plátce</th>
              </tr>
            </thead>
            <tbody>
              ${matRows}
              <tr style="background:rgba(191,149,63,0.04);border-top:1px solid rgba(191,149,63,0.2);">
                <td colspan="3" style="${ltTdStyle('font-weight:700;font-size:10px;')}">Materiál celkem</td>
                <td style="${ltTdStyle('text-align:right;font-weight:700;color:' + LT_GOLD + ';font-size:11px;')}">${formatPrice(materialTotal)}</td>
                <td style="${ltTdStyle()}"></td>
              </tr>
            </tbody>
          </table>
        `)}
      </div>`
  } else {
    materialsSection = `
      <div style="margin-bottom:12px;">
        ${ltSectionHeader('Materiál')}
        <div style="
          background:${LT_BG_CARD};border:1px solid ${LT_BORDER_CARD};border-radius:6px;
          padding:10px 14px;font-size:10px;color:${LT_TEXT_MUTED};font-style:italic;
        ">Bez použitého materiálu</div>
      </div>`
  }

  // ── 8. Summary ───────────────────────────────────────────────────
  const materialTotalForSummary = filledMaterials.reduce((s, m) => s + (m.price * m.qty), 0)
  const summarySection = `
    <div style="margin-bottom:12px;">
      ${ltSectionHeader('Souhrn')}
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
        ${ltSummaryStat('Celkem hodin', (isNaN(input.totalHours) ? 0 : input.totalHours).toLocaleString('cs-CZ'), 'h')}
        ${ltSummaryStat('Celkem km', (isNaN(input.totalKm) ? 0 : input.totalKm).toLocaleString('cs-CZ'), 'km')}
        ${ltSummaryStat('Materiál celkem', materialTotalForSummary.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'Kč')}
      </div>
    </div>`

  // ── 9. Multi-visit note (conditional) ────────────────────────────
  let multiVisitSection = ''
  if (input.isMultiVisit && input.nextVisitPlan) {
    multiVisitSection = `
      <div style="
        margin-bottom:12px;
        background:#fffbeb;border:1px solid #f59e0b;border-radius:6px;
        padding:12px 14px;
      ">
        <div style="font-size:10px;font-weight:700;color:#92400e;margin-bottom:6px;">
          Částečný protokol — práce přerušena
        </div>
        ${input.nextVisitReason ? `<div style="font-size:9.5px;color:#78350f;margin-bottom:3px;"><strong>Důvod přerušení:</strong> ${esc(input.nextVisitReason)}</div>` : ''}
        <div style="font-size:9.5px;color:#78350f;margin-bottom:3px;"><strong>Plán další návštěvy:</strong> ${esc(input.nextVisitPlan)}</div>
        ${input.nextVisitDate ? `<div style="font-size:9.5px;color:#78350f;"><strong>Plánovaný termín:</strong> ${esc(input.nextVisitDate)}</div>` : ''}
      </div>`
  }

  // ── 10. Photos (conditional) ─────────────────────────────────────
  let photosSection = ''
  if (validPhotos.length > 0) {
    const photoItems = validPhotos.map(photo => {
      const src = photo.data.startsWith('data:')
        ? photo.data
        : `data:image/png;base64,${photo.data}`
      return `
        <div style="break-inside:avoid;">
          <div style="
            background:${LT_BG_CARD};border:1px solid ${LT_BORDER_CARD};
            border-radius:6px;overflow:hidden;box-shadow:${LT_SHADOW_CARD};
          ">
            <img src="${src}" alt="${esc(photo.label)}" style="
              width:100%;height:auto;max-height:160px;object-fit:cover;display:block;
            " />
            <div style="padding:5px 8px;font-size:8.5px;color:${LT_TEXT_SECONDARY};border-top:1px solid ${LT_BORDER_ROW};">
              ${esc(photo.label)}
            </div>
          </div>
        </div>`
    }).join('')

    photosSection = `
      <div style="margin-bottom:12px;">
        ${ltSectionHeader('Fotodokumentace')}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${photoItems}
        </div>
      </div>`
  }

  // ── 11. Signing info ─────────────────────────────────────────────
  const sigLocation = input.signingLocation || input.customerCity || ''
  const sigDateTime = input.signedAt
    ? new Date(input.signedAt).toLocaleString('cs-CZ', {
        day: 'numeric', month: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : new Date().toLocaleString('cs-CZ', {
        day: 'numeric', month: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })

  // ── 11b. Client surcharge (doplatok) ────────────────────────────
  const displaySurcharge = input.surchargeIncludesVat
    ? (input.clientSurchargeWithVat ?? input.clientSurcharge ?? 0)
    : (input.clientSurcharge ?? 0)
  const surchargeSection = displaySurcharge > 0 ? `
    <div style="margin-bottom:14px;">
      ${ltSectionHeader('Doplatek klienta')}
      ${ltCard(`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;">
          <span style="font-size:11px;color:${LT_TEXT_BODY};">Schválený doplatek${input.surchargeIncludesVat ? ' (s DPH)' : ''}</span>
          <span style="font-size:14px;font-weight:700;color:${GOLD_DARK};">${displaySurcharge.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${esc(input.currency || 'Kč')}</span>
        </div>
      `)}
    </div>` : ''

  const signingInfo = `
    <div style="margin-bottom:10px;">
      <div style="font-size:9.5px;color:${LT_TEXT_BODY};margin-bottom:4px;">
        <strong>Místo a datum podpisu:</strong> ${esc(sigLocation)}${sigLocation ? ', ' : ''}${sigDateTime}
      </div>
      <div style="font-size:9px;color:${LT_TEXT_SECONDARY};line-height:1.5;">
        Podpisem níže odběratel potvrzuje provedení opravy a souhlasí s rozsahem a kvalitou provedené práce.
      </div>
    </div>`

  // ── 12. Signatures ───────────────────────────────────────────────
  const techSigContent = input.techSignature
    ? `<img src="${input.techSignature.startsWith('data:') ? input.techSignature : 'data:image/png;base64,' + input.techSignature}"
         alt="Podpis technika"
         style="max-width:100%;max-height:64px;object-fit:contain;display:block;margin:8px auto;" />`
    : `<div style="height:64px;display:flex;align-items:center;justify-content:center;color:${LT_TEXT_MUTED};font-size:9px;font-style:italic;">Podpis technika</div>`

  const clientSigContent = input.clientSignature
    ? `<img src="${input.clientSignature.startsWith('data:') ? input.clientSignature : 'data:image/png;base64,' + input.clientSignature}"
         alt="Podpis zákazníka"
         style="max-width:100%;max-height:64px;object-fit:contain;display:block;margin:8px auto;" />`
    : `<div style="height:64px;display:flex;align-items:center;justify-content:center;color:${LT_TEXT_MUTED};font-size:9px;font-style:italic;">Podpis zákazníka</div>`

  const signaturesSection = `
    <div style="margin-bottom:14px;">
      ${ltSectionHeader('Podpisy')}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="
          background:${LT_BG_CARD};border:1px solid ${LT_BORDER_CARD};
          border-radius:6px;overflow:hidden;box-shadow:${LT_SHADOW_CARD};
        ">
          <div style="
            background:linear-gradient(135deg,rgba(191,149,63,0.12),rgba(191,149,63,0.06));
            border-bottom:1px solid rgba(191,149,63,0.15);
            padding:6px 12px;
            font-family:${FONT_HEADING};font-size:9px;font-weight:700;
            color:${LT_GOLD};letter-spacing:1px;text-transform:uppercase;
          ">Technik</div>
          <div style="padding:4px 12px 10px 12px;">
            ${techSigContent}
            <div style="
              font-size:9.5px;font-weight:600;color:${LT_TEXT_PRIMARY};
              text-align:center;margin-top:6px;border-top:1px solid ${LT_BORDER_ROW};padding-top:5px;
            ">${esc(input.techSignerName || '—')}</div>
          </div>
        </div>
        <div style="
          background:${LT_BG_CARD};border:1px solid ${LT_BORDER_CARD};
          border-radius:6px;overflow:hidden;box-shadow:${LT_SHADOW_CARD};
        ">
          <div style="
            background:linear-gradient(135deg,rgba(191,149,63,0.12),rgba(191,149,63,0.06));
            border-bottom:1px solid rgba(191,149,63,0.15);
            padding:6px 12px;
            font-family:${FONT_HEADING};font-size:9px;font-weight:700;
            color:${LT_GOLD};letter-spacing:1px;text-transform:uppercase;
          ">Zákazník</div>
          <div style="padding:4px 12px 10px 12px;">
            ${clientSigContent}
            <div style="
              font-size:9.5px;font-weight:600;color:${LT_TEXT_PRIMARY};
              text-align:center;margin-top:6px;border-top:1px solid ${LT_BORDER_ROW};padding-top:5px;
            ">${esc(input.clientSignerName || '—')}</div>
          </div>
        </div>
      </div>
    </div>`

  // ── 13. Footer ───────────────────────────────────────────────────
  const footerMeta = `Generováno: ${new Date().toLocaleString('cs-CZ')} &nbsp;·&nbsp; Ref: ${esc(input.referenceNumber)} &nbsp;·&nbsp; Zlatí Řemeslníci s.r.o.`

  // ── Assemble ─────────────────────────────────────────────────────
  const content = [
    header,
    refBar,
    customerCard,
    visitsSection,
    workSection,
    techNotesSection,
    materialsSection,
    summarySection,
    multiVisitSection,
    photosSection,
    surchargeSection,
    signingInfo,
    signaturesSection,
    ltFooter(footerMeta),
  ].join('\n')

  return ltPageShell('Protokol o provedení opravy', content)
}
