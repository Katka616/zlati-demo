/**
 * onePagerTemplate.ts
 *
 * Generates a luxury branded HTML one-pager for Zlatí Řemeslníci.
 * Focus: technology platform, quality, value for insurance partners.
 * Dark theme with gold accents — matches the app design system.
 * All CSS inline — ready for Puppeteer print-to-PDF.
 */

import {
  GOLD, GOLD_LIGHT, GOLD_DARK, BG_PAGE, BG_CARD, BG_HEADER,
  BORDER_CARD, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED,
  FONT_HEADING, FONT_BODY,
  logoHtml, goldDivider, GOOGLE_FONTS_LINK, pageHeaderDecorations,
} from './pdfBrandUtils'

// ─── SVG Icons (no emoji) ───────────────────────────────────────────────────────

function svgIcon(type: 'dispatch' | 'ai' | 'check' | 'portal'): string {
  const icons: Record<string, string> = {
    dispatch: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.4 7.05 11.5 7.35 11.76a1 1 0 0 0 1.3 0C13 21.5 20 15.4 20 10a8 8 0 0 0-8-8z"/></svg>`,
    ai: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h.01M15 9h.01M9 15c.83.67 2 1 3 1s2.17-.33 3-1"/></svg>`,
    check: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
    portal: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  }
  return icons[type] || ''
}

// ─── Feature card ───────────────────────────────────────────────────────────────

interface FeatureCard {
  icon: string
  title: string
  description: string
  bullets: string[]
}

function featureCardHtml(card: FeatureCard): string {
  const bulletItems = card.bullets
    .map(b => `<li style="
      margin-bottom: 3px;
      color: ${TEXT_SECONDARY};
      font-size: 9.5px;
      line-height: 1.4;
    ">${b}</li>`)
    .join('')

  return `<div style="
    flex: 1;
    border: 1px solid ${BORDER_CARD};
    border-radius: 10px;
    background: ${BG_CARD};
    overflow: hidden;
  ">
    <div style="text-align: center; padding: 10px 10px 5px 10px;">
      <div style="margin-bottom: 4px;">${card.icon}</div>
      <div style="
        font-family: ${FONT_BODY};
        font-size: 11px;
        font-weight: 700;
        color: ${TEXT_PRIMARY};
        margin-bottom: 5px;
      ">${card.title}</div>
      <div style="
        font-family: ${FONT_BODY};
        font-size: 9.5px;
        color: ${TEXT_SECONDARY};
        line-height: 1.4;
        margin-bottom: 5px;
      ">${card.description}</div>
    </div>
    <ul style="
      padding: 0 12px 10px 26px;
      margin: 0;
      font-family: ${FONT_BODY};
    ">${bulletItems}</ul>
  </div>`
}

// ─── Stat block ─────────────────────────────────────────────────────────────────

function statBlock(value: string, label: string): string {
  return `<div style="text-align: center; flex: 1;">
    <div style="
      font-family: ${FONT_HEADING};
      font-size: 26px;
      font-weight: 700;
      color: ${GOLD};
      line-height: 1.1;
    ">${value}</div>
    <div style="
      font-family: ${FONT_BODY};
      font-size: 9px;
      font-weight: 500;
      color: ${TEXT_SECONDARY};
      letter-spacing: 0.5px;
      margin-top: 3px;
    ">${label}</div>
  </div>`
}

// ─── Deliverables row ───────────────────────────────────────────────────────────

function deliverableItem(text: string): string {
  return `<span style="
    font-family: ${FONT_BODY};
    font-size: 10px;
    color: ${TEXT_SECONDARY};
  ">${text}</span>`
}

// ─── Main Export ────────────────────────────────────────────────────────────────

export function generateOnePagerHtml(): string {
  const features: FeatureCard[] = [
    {
      icon: svgIcon('dispatch'),
      title: 'Smart Dispatching',
      description: 'GPS poloha techniků v reálném čase. Systém automaticky přiřadí nejbližšího technika k nové zakázce a slučuje trasy — více oprav na jednu cestu.',
      bullets: [
        'Rychlejší příjezd technika',
        'Nižší náklady na dopravu',
        'GPS verifikace ujetých km — platforma sleduje polohu technika po celou dobu výjezdu; technik povoluje sdílení polohy ve svém zařízení',
      ],
    },
    {
      icon: svgIcon('ai'),
      title: 'AI diagnostika před příjezdem',
      description: 'Klient popíše závadu online ještě před příjezdem technika. AI identifikuje typ havárie a připraví kompletní brief: popis závady, postup opravy, seznam dílů.',
      bullets: [
        'Technik přijede připravený se správným nářadím',
        'Eliminace zbytečných výjezdů',
        'Méně opakovaných návštěv = nižší náklady',
      ],
    },
    {
      icon: svgIcon('check'),
      title: 'AI kontrola kvality oprav',
      description: 'Po dokončení opravy systém automaticky porovná fotografie před opravou a po ní. Ověří deklarované práce, zkontroluje vykázaný materiál.',
      bullets: [
        'Ochrana proti nadhodnoceným fakturám',
        'Nulová manuální revize',
        'Transparentní reporting s důkazy',
      ],
    },
    {
      icon: svgIcon('portal'),
      title: 'Klientský portál',
      description: 'Každý klient dostane SMS s&nbsp;unikátním odkazem — bez registrace, bez hesla. Vidí celý průběh v reálném čase. Schválení doplatku, podpis protokolu — vše online.',
      bullets: [
        'Spokojený pojištěnec se neodhlašuje',
        'Redukce hovorů na klientské lince o 90 %',
        'Kvalita servisu chrání vaši retenci',
      ],
    },
  ]

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zlatí Řemeslníci — Technologická platforma</title>
  ${GOOGLE_FONTS_LINK}
  <style>
    @page { size: A4; margin: 0; }
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
    height: 297mm;
    margin: 0 auto;
    background: ${BG_PAGE};
    padding: 0;
    position: relative;
    overflow: hidden;
  ">
    ${pageHeaderDecorations()}

    <!-- Content — uses flex column to fill entire A4 page evenly -->
    <div style="
      padding: 20px 36px 18px 36px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: calc(297mm - 4px);
    ">

      <!-- Logo -->
      <div style="text-align: center; margin-bottom: 6px;">
        ${logoHtml()}
      </div>

      <!-- Company name -->
      <div style="text-align: center; margin-bottom: 4px;">
        <div style="
          font-family: ${FONT_HEADING};
          font-size: 26px;
          font-weight: 700;
          letter-spacing: 7px;
          color: ${GOLD};
        ">ZLATÍ ŘEMESLNÍCI</div>
        <div style="
          font-family: ${FONT_BODY};
          font-size: 8px;
          font-weight: 500;
          letter-spacing: 5px;
          color: ${TEXT_MUTED};
          text-transform: uppercase;
          margin-top: 2px;
        ">SPOLEHLIVÍ ŘEMESLNÍCI</div>
      </div>

      ${goldDivider()}

      <!-- Tagline -->
      <div style="
        text-align: center;
        font-family: ${FONT_BODY};
        font-size: 13px;
        font-weight: 500;
        color: ${TEXT_PRIMARY};
        margin: 12px 0 6px 0;
        line-height: 1.5;
      ">
        <strong>Kompletní řešení havarijních oprav pro asistenční společnosti</strong><br/>
        <span style="color: ${TEXT_SECONDARY}; font-size: 11px;">Od nahlášení po vyúčtování, jeden partner, žádné starosti.</span>
      </div>

      <!-- Kdo jsme + Stats row -->
      <div style="
        display: flex;
        align-items: center;
        gap: 20px;
        margin: 12px 0;
        padding: 14px 18px;
        border: 1px solid ${BORDER_CARD};
        border-radius: 10px;
        background: ${BG_CARD};
      ">
        <div style="flex: 1.3;">
          <div style="
            font-family: ${FONT_BODY};
            font-size: 12px;
            font-weight: 700;
            color: ${GOLD};
            margin-bottom: 6px;
          ">Kdo jsme</div>
          <div style="
            font-family: ${FONT_BODY};
            font-size: 10.5px;
            color: ${TEXT_SECONDARY};
            line-height: 1.55;
          ">
            Klíčová osoba: <span style="color: ${TEXT_PRIMARY}; font-weight: 600;">Katarína Lacinová</span>, jeden ze zakladatelů Hodinový Manžel s.r.o.<br/>
            Celá ČR pod jednou střechou — instalatér, elektrikář, plynař, zámečník, tepelná čerpadla, klimatizace, kotle, DDD a další.
          </div>
        </div>
        <div style="flex: 1; display: flex; gap: 6px;">
          ${statBlock('4', 'Roky provozu')}
          ${statBlock('20K+', 'Dokončených zakázek')}
          ${statBlock('1K+', 'Techniků v síti')}
          ${statBlock('13', 'Specializací')}
        </div>
      </div>

      <!-- Section title -->
      <div style="
        font-family: ${FONT_HEADING};
        font-size: 15px;
        font-weight: 700;
        color: ${GOLD};
        margin: 10px 0 8px 0;
      ">Podstatné součásti technologické platformy</div>

      <!-- 4 Feature cards in 2x2 grid -->
      <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        ${featureCardHtml(features[0])}
        ${featureCardHtml(features[1])}
      </div>
      <div style="display: flex; gap: 10px; margin-bottom: 14px;">
        ${featureCardHtml(features[2])}
        ${featureCardHtml(features[3])}
      </div>

      <!-- What partner gets -->
      <div style="
        padding: 12px 18px;
        border: 1px solid ${BORDER_CARD};
        border-radius: 10px;
        background: ${BG_HEADER};
        margin-bottom: 10px;
      ">
        <div style="
          font-family: ${FONT_BODY};
          font-size: 11px;
          font-weight: 700;
          color: ${TEXT_PRIMARY};
          margin-bottom: 6px;
        ">Co partner dostává okamžitě po každé zakázce:</div>
        <div style="
          font-family: ${FONT_BODY};
          font-size: 10px;
          color: ${TEXT_SECONDARY};
          line-height: 1.6;
        ">
          ${deliverableItem('Servisní protokol (PDF)')}
          &ensp;<span style="color: ${GOLD};">·</span>&ensp;${deliverableItem('Fotodokumentace ověřená AI')}
          &ensp;<span style="color: ${GOLD};">·</span>&ensp;${deliverableItem('Cenový rozpis přesně podle vašeho ceníku')}<br/>
          ${deliverableItem('Elektronický podpis klienta')}
          &ensp;<span style="color: ${GOLD};">·</span>&ensp;${deliverableItem('Statistiky zakázky (čas odezvy, doba opravy, km)')}
        </div>
      </div>

      <!-- Odborná garance -->
      <div style="
        padding: 12px 18px;
        border: 1px solid rgba(191,149,63,0.2);
        border-radius: 10px;
        background: rgba(191,149,63,0.04);
        margin-bottom: 14px;
      ">
        <div style="
          font-family: ${FONT_BODY};
          font-size: 10.5px;
          color: ${TEXT_SECONDARY};
          line-height: 1.55;
        ">
          <span style="color: ${GOLD}; font-weight: 600;">Odborná garance:</span>
          Pro vázané a licencované činnosti disponujeme nasmlouvaným odborným garantem, což nám umožňuje legální fakturaci těchto prací a zajištění odborných konzultací v případě potřeby.
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin-bottom: 10px;">
        <div style="
          font-family: ${FONT_BODY};
          font-size: 13px;
          font-weight: 600;
          color: ${TEXT_PRIMARY};
          line-height: 1.6;
        ">
          Vyšší transparentnost. Minimální administrativa.<br/>
          <span style="color: ${GOLD};">Vyzkoušejte nás.</span>
        </div>
      </div>

      ${goldDivider()}

      <!-- Footer -->
      <div style="text-align: center; margin-top: 8px; font-family: ${FONT_BODY};">
        <div style="
          font-family: ${FONT_HEADING};
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2.5px;
          color: ${TEXT_SECONDARY};
          margin-bottom: 5px;
        ">ZLATÍ ŘEMESLNÍCI S.R.O.</div>
        <div style="font-size: 9.5px; color: ${TEXT_MUTED}; line-height: 1.7; letter-spacing: 0.2px;">
          Školská 660/3, 110 00 Praha 1&ensp;·&ensp;IČO: 22524894&ensp;·&ensp;DIČ: CZ22524894<br/>
          <span style="color: ${GOLD}; font-weight: 600;">Katarína Lacinová</span>&ensp;·&ensp;+421 903 328 882&ensp;·&ensp;katarina.lacinova@zlatiremeslnici.com&ensp;·&ensp;www.zlatiremeslnici.com
        </div>
      </div>

    </div><!-- /Content -->
  </div><!-- /Page -->
</body>
</html>`
}
