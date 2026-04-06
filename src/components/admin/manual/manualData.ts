/**
 * manualData.ts — Obsah systémovej príručky Zlatí Řemeslníci
 *
 * Štruktúrované dáta pre ManualViewerScreen.
 * Aktualizované: 2026-04-01
 */

export interface ManualSubsection {
  id: string
  title: string
  content: string
}

export interface ManualSection {
  id: string
  number: number
  title: string
  intro?: string
  subsections: ManualSubsection[]
}

export const MANUAL_SECTIONS: ManualSection[] = [
  // ─── 1. ÚVOD ───────────────────────────────────────────────────
  {
    id: 'intro',
    number: 1,
    title: 'Úvod a prehľad systému',
    intro: `<strong>Zlatí Řemeslníci</strong> je komplexný CRM systém pre poistných havarijných technikov pôsobiacich na Slovensku a v Českej republike. Spája tri rozhrania — administrátorský panel, mobilnú appku pre technikov a klientský portál — v jednom systéme s jednou databázou a jedným stavovým strojom.`,
    subsections: [
      {
        id: 'intro-tech',
        title: 'Technológie',
        content: `<ul>
<li><strong>Next.js 14 App Router</strong> — React framework s SSR a API routes</li>
<li><strong>PostgreSQL</strong> — relačná databáza (raw pg Pool, bez ORM)</li>
<li><strong>PWA</strong> — Progressive Web App, funguje offline, dá sa nainštalovať na mobil</li>
<li><strong>TypeScript strict</strong> — typová bezpečnosť v celom kóde</li>
<li><strong>CSS Custom Properties</strong> — Gold Design System (žiadny Tailwind, žiadne CSS moduly)</li>
</ul>`,
      },
      {
        id: 'intro-roles',
        title: 'Tri roly v systéme',
        content: `<div class="manual-cards">
<div class="manual-card">
  <div class="manual-card-icon">&#128421;&#65039;</div>
  <div class="manual-card-title">Operátor</div>
  <div class="manual-card-desc">Dispočer/administrátor. Prijíma zákazky, priraduje technikov, kontroluje ceny, komunikuje s poisťovňami a klientmi.</div>
</div>
<div class="manual-card">
  <div class="manual-card-icon">&#128295;</div>
  <div class="manual-card-title">Technik</div>
  <div class="manual-card-desc">Servisný technik v teréne. Prijíma zákazky cez marketplace, sleduje navigáciu, vypĺňa protokoly, posiela fotodokumentáciu.</div>
</div>
<div class="manual-card">
  <div class="manual-card-icon">&#128100;</div>
  <div class="manual-card-title">Zákazník</div>
  <div class="manual-card-desc">Klient poisťovne. Sleduje stav zákazky cez tokenovú URL, schvaľuje/odmieta doplatky, hodnotí servis.</div>
</div>
</div>`,
      },
      {
        id: 'intro-interfaces',
        title: 'Štyri rozhrania',
        content: `<table class="manual-table">
<thead><tr><th>Rozhranie</th><th>URL</th><th>Prístup</th><th>Určené pre</th></tr></thead>
<tbody>
<tr><td>Admin CRM</td><td><code>/admin/*</code></td><td>SMS kód + JWT cookie</td><td>Operátori</td></tr>
<tr><td>Dispatch App</td><td><code>/dispatch/*</code></td><td>SMS kód + JWT cookie</td><td>Technici</td></tr>
<tr><td>Klientský portál</td><td><code>/client/[token]</code></td><td>Token v URL, bez prihlásenia</td><td>Zákazníci</td></tr>
<tr><td>Protokolový wizard</td><td><code>/protocol/[token]</code></td><td>Token v URL, bez prihlásenia</td><td>Technici (offline)</td></tr>
</tbody>
</table>`,
      },
    ],
  },

  // ─── 2. PIPELINE ───────────────────────────────────────────────
  {
    id: 'pipeline',
    number: 2,
    title: 'Pipeline — Životný cyklus zákazky',
    intro: 'Každá zákazka prechádza presne definovanými <strong>15 krokmi CRM pipeline</strong>. Stavový stroj riadi všetky prechody a validuje, či daná rola môže vykonať daný prechod.',
    subsections: [
      {
        id: 'pipeline-steps',
        title: '15 krokov CRM pipeline',
        content: `<div class="manual-timeline">
<div class="manual-step"><span class="manual-step-num">00</span><div><strong>Príjem</strong> — Zákazka prijatá z emailu, webhookom alebo manuálne operátorom.</div></div>
<div class="manual-step"><span class="manual-step-num">01</span><div><strong>Dispatching</strong> — Zákazka dostupná v marketplace. Matching engine odosiela push notifikácie technikov.</div></div>
<div class="manual-step"><span class="manual-step-num">02</span><div><strong>Naplánované</strong> — Technik zákazku prijal. Klient dostane SMS s menom technika a odhadovaným časom.</div></div>
<div class="manual-step"><span class="manual-step-num">03</span><div><strong>Na mieste</strong> — Technik dorazil. Diagnostikuje, fotí, vypracúva cenový odhad.</div></div>
<div class="manual-step"><span class="manual-step-num">04</span><div><strong>Schvaľovanie ceny</strong> — Technik odoslal odhad. Operátor alebo poisťovňa schvaľuje cenu.</div></div>
<div class="manual-step"><span class="manual-step-num">05</span><div><strong>Ponuka klientovi</strong> — Ak je doplatok nad rámec krytia, klient schvaľuje výšku doplatku cez portál.</div></div>
<div class="manual-step"><span class="manual-step-num">06</span><div><strong>Práca</strong> — Technik aktívne pracuje na oprave. Stav sa mení keď technik klikne „Začínam".</div></div>
<div class="manual-step"><span class="manual-step-num">07</span><div><strong>Rozpracovaná</strong> — Práca nie je dokončená jednou návštevou. Čaká na ďalší výjazd.</div></div>
<div class="manual-step"><span class="manual-step-num">08</span><div><strong>Dokončené</strong> — Práca dokončená, protokol odoslaný. Technik odišiel z miesta.</div></div>
<div class="manual-step"><span class="manual-step-num gold">09</span><div><strong>Zúčtovanie</strong> — Systém porovná odhad vs. skutočné náklady (tolerancia 5%). Vypočíta odmenu technika.</div></div>
<div class="manual-step"><span class="manual-step-num">10</span><div><strong>Cenová kontrola</strong> — Operátor finálne skontroluje všetky náklady a schváli pre fakturáciu.</div></div>
<div class="manual-step"><span class="manual-step-num">11</span><div><strong>EA Odhláška</strong> — Len pre Europ Assistance. Automaticky sa odošle odhláška poisťovni.</div></div>
<div class="manual-step"><span class="manual-step-num">12</span><div><strong>Fakturácia</strong> — Vygeneruje sa faktúra pre poisťovňu (s QR kódom pre CZ). Zákazník dostane doklad.</div></div>
<div class="manual-step"><span class="manual-step-num">13</span><div><strong>Uhradené</strong> — Platba prijatá. SEPA XML pre banku na výplatu technika.</div></div>
<div class="manual-step"><span class="manual-step-num dark">14</span><div><strong>Uzavreté</strong> — Zákazka uzavretá, archivovaná. Klient mohol ohodnotiť servis.</div></div>
</div>
<div class="manual-info">
<strong>Mimo-pipeline stavy:</strong> <code>cancelled</code> (zrušená), <code>on_hold</code> (pozastavená), <code>reklamacia</code> (reklamačný proces), <code>archived</code> (archivovaná).
</div>`,
      },
      {
        id: 'pipeline-tech-phases',
        title: 'Tech fázy technika',
        content: `<p>Paralelne s CRM pipeline existujú <strong>tech fázy</strong> — granulárne stavy technika v teréne. Mapujú sa na CRM kroky cez stavový stroj. Celkovo 38 tech fáz pokrývajúcich každý mikroskopický krok technika.</p>
<table class="manual-table">
<thead><tr><th>CRM Krok</th><th>Tech fázy</th></tr></thead>
<tbody>
<tr><td>01 Dispatching</td><td>offer_sent</td></tr>
<tr><td>02 Naplánované</td><td>offer_accepted, en_route</td></tr>
<tr><td>03 Na mieste</td><td>arrived, diagnostics</td></tr>
<tr><td>04 Schv. ceny</td><td>estimate_sent, estimate_approved</td></tr>
<tr><td>05 Ponuka klientovi</td><td>client_approval_pending, client_approval_granted</td></tr>
<tr><td>06 Práca</td><td>working, break</td></tr>
<tr><td>08 Dokončené</td><td>protocol_draft, protocol_sent</td></tr>
<tr><td>09 Zúčtovanie</td><td>settlement_pending, settlement_approved</td></tr>
</tbody>
</table>`,
      },
      {
        id: 'pipeline-portal',
        title: 'Portálové fázy (klient)',
        content: `<p>Klientský portál zobrazuje zjednodušený pohľad na stav zákazky cez <strong>7 portálových fáz</strong>:</p>
<div class="manual-badges">
<span class="manual-badge blue">Diagnostika</span>
<span class="manual-badge orange">Technik priradený</span>
<span class="manual-badge green">Prebieha práca</span>
<span class="manual-badge purple">Doplatok</span>
<span class="manual-badge teal">Protokol</span>
<span class="manual-badge gold">Hodnotenie</span>
<span class="manual-badge gray">Uzavreté</span>
</div>`,
      },
    ],
  },

  // ─── 3. ADMIN CRM ─────────────────────────────────────────────
  {
    id: 'admin',
    number: 3,
    title: 'Admin CRM — Operátorské rozhranie',
    intro: 'Administrátorský panel je hlavné pracovné prostredie dispečera. Poskytuje kompletný prehľad zákaziek, technikov, financií a komunikácie.',
    subsections: [
      {
        id: 'admin-dashboard',
        title: 'Dashboard (/admin)',
        content: `<p>Hlavná stránka zobrazuje <strong>prevádzkový prehľad</strong>:</p>
<ul>
<li><strong>KPI metriky</strong> — nové zákazky, aktívne zákazky, dokončené dnes, priemerná doba riešenia</li>
<li><strong>Pipeline prehľad</strong> — vizuálne rozloženie zákaziek v pipeline krokoch</li>
<li><strong>Ranný briefing</strong> — AI-generovaný prehľad na začiatku dňa</li>
<li><strong>Quick Actions</strong> — rýchle akcie: nová zákazka, dispatch, vyhľadávanie</li>
<li><strong>Prispôsobiteľné rozloženie</strong> — drag-and-drop widgety, uložené presety</li>
</ul>`,
      },
      {
        id: 'admin-jobs',
        title: 'Zákazky (/admin/jobs)',
        content: `<p>Zoznam všetkých zákaziek s pokročilým filtrovaním:</p>
<ul>
<li><strong>Smart filtre</strong> — podľa statusu, partnera, technika, dátumu, priority, kategórie</li>
<li><strong>Fulltext vyhľadávanie</strong> — meno zákazníka, adresa, referenčné číslo</li>
<li><strong>Uložené pohľady</strong> — vlastné filtrovacie presety pre rýchly prístup</li>
<li><strong>Bulk akcie</strong> — hromadná zmena statusu, priradenie, export</li>
<li><strong>Mobilný režim</strong> — karty namiesto tabuľky na malom displeji</li>
</ul>
<p><strong>Detail zákazky</strong> (<code>/admin/jobs/[id]</code>) obsahuje:</p>
<ul>
<li><strong>Status Pipeline</strong> — vizuálna šipka s aktuálnym krokom, click-to-advance</li>
<li><strong>Zákaznícke údaje</strong> — meno, telefón, adresa, poznámky</li>
<li><strong>Priradenie technika</strong> — matching engine, manuálne priradenie</li>
<li><strong>Časová os</strong> — kompletná história všetkých akcií na zákazke</li>
<li><strong>Pricing karty</strong> — live kalkulácia cien (práca, materiál, cestovné, doplatok)</li>
<li><strong>Dokumenty a fotky</strong> — nahrané z terénu technikou</li>
<li><strong>AI diagnostický panel</strong> — AI-generovaný prehľad a odporúčania</li>
<li><strong>Poznámky a pripomienky</strong> — interné poznámky + automatické reminders</li>
<li><strong>Chat</strong> — trojkanálová komunikácia (operátor-technik, operátor-klient, technik-klient)</li>
</ul>`,
      },
      {
        id: 'admin-technicians',
        title: 'Technici (/admin/technicians)',
        content: `<ul>
<li><strong>Profil technika</strong> — osobné údaje, IČO, DIČ, IBAN, hodinová sadzba, cestovné</li>
<li><strong>Špecializácie</strong> — 20 kategórií (elektro, voda, plyn, kúrenie, zámočník...)</li>
<li><strong>GPS a dosah</strong> — výjazdová oblasť, domáca adresa, aktuálna poloha</li>
<li><strong>Štatistiky</strong> — počet zákaziek, hodnotenia, priemerná doba odozvy</li>
<li><strong>AI hodnotenie</strong> — automatické hodnotenie kvality a spoľahlivosti</li>
<li><strong>Rozvrh</strong> — kalendár plánovaných zákaziek, pracovná dostupnosť</li>
</ul>`,
      },
      {
        id: 'admin-partners',
        title: 'Partneri (poisťovne)',
        content: `<table class="manual-table">
<thead><tr><th>Partner</th><th>Kód</th><th>Krajina</th><th>Cestovné</th><th>Pohotovostný príplatok</th></tr></thead>
<tbody>
<tr><td>AXA</td><td>AXA</td><td>CZ</td><td>Zónové</td><td>Víkend deň 50 € / Víkend noc 100 € / Pracovný 17-20h 50 € / Po 20h 100 €</td></tr>
<tr><td>Europ Assistance</td><td>EA</td><td>CZ</td><td>Per-km</td><td>Max 50 € celkovo</td></tr>
<tr><td>Security Support (Allianz)</td><td>SEC</td><td>CZ/SK</td><td>Zónové</td><td>0 €</td></tr>
</tbody>
</table>
<p><strong>DPH:</strong> CZ = 12% (stavebné práce), 21% (materiál). SK = 23% (všetko).</p>`,
      },
      {
        id: 'admin-chat',
        title: 'Chat (/admin/chat)',
        content: `<p>Trojkanálový komunikačný systém:</p>
<ul>
<li><strong>Dispatch kanál</strong> — operátor ↔ technik (interná komunikácia)</li>
<li><strong>Client kanál</strong> — operátor ↔ zákazník</li>
<li><strong>Tech-client kanál</strong> — technik ↔ zákazník (priama komunikácia v teréne)</li>
</ul>
<p>Funkcie:</p>
<ul>
<li>Príkazy cez lomítko (<code>/</code>) — rýchle akcie priamo z chatu</li>
<li>Prílohy — fotky, dokumenty</li>
<li>Prepojenie na WhatsApp — správy sa synchronizujú</li>
<li>Filtrovanie podľa zákazky, technika, zákazníka</li>
</ul>`,
      },
      {
        id: 'admin-payments',
        title: 'Platby (/admin/payments)',
        content: `<ul>
<li><strong>Splatné</strong> — zoznam technikov čakajúcich na výplatu</li>
<li><strong>Dávky</strong> — SEPA XML dávky pre banku (KB-kompatibilný pain.001.001.03 formát)</li>
<li><strong>Archív</strong> — história všetkých platieb</li>
<li><strong>Import bankových výpisov</strong> — automatické párovanie platby s faktúrou</li>
<li><strong>QR platby</strong> — CZ = QR Platba/SPD, SK = Pay by Square</li>
</ul>`,
      },
      {
        id: 'admin-operations',
        title: 'Operačné centrum (/admin/operations)',
        content: `<p>Centrálne riadenie prevádzky:</p>
<ul>
<li><strong>SLA monitoring</strong> — sledovanie dodržiavania lehôt</li>
<li><strong>Eskalácia</strong> — automatická eskalácia pri prekročení SLA</li>
<li><strong>Hromadné akcie</strong> — batch operácie na zákazkach</li>
<li><strong>Export dát</strong> — CSV, PDF reporty</li>
</ul>`,
      },
      {
        id: 'admin-ai',
        title: 'AI Mozog',
        content: `<p>AI systém integrovaný do celého CRM:</p>
<ul>
<li><strong>AI Extrakcia</strong> — automatické rozpoznanie údajov z emailovej objednávky</li>
<li><strong>AI Diagnostika</strong> — návrh riešenia podľa popisu škody a znalostnej databázy</li>
<li><strong>AI Polia</strong> — automaticky generované metadata zákazky (kategórie, priorita, odhad)</li>
<li><strong>AI Suggestions</strong> — proaktívne odporúčania pre operátora</li>
<li><strong>AI Chat asistent</strong> — pomáha operátorom s otázkami o systéme</li>
<li><strong>Voicebot</strong> — AI telefónny asistent pre príjem hovorov</li>
</ul>`,
      },
      {
        id: 'admin-settings',
        title: 'Nastavenia (/admin/settings)',
        content: `<div class="manual-cards">
<div class="manual-card">
  <div class="manual-card-title">Kritériá priraďovania</div>
  <div class="manual-card-desc">Presety, pravidlá matching-u a automatické notifikovanie technikov.</div>
</div>
<div class="manual-card">
  <div class="manual-card-title">AI Polia</div>
  <div class="manual-card-desc">Definície AI polí, modely, triggery a zobrazenie v CRM.</div>
</div>
<div class="manual-card">
  <div class="manual-card-title">Vlastné polia</div>
  <div class="manual-card-desc">Dodatočné polia pre zákazky, technikov a partnerov.</div>
</div>
<div class="manual-card">
  <div class="manual-card-title">Automatizácie</div>
  <div class="manual-card-desc">Vlastné pravidlá, triggery a automatické akcie pre zákazky.</div>
</div>
<div class="manual-card">
  <div class="manual-card-title">SMS šablóny</div>
  <div class="manual-card-desc">Texty SMS správ — CZ/SK varianty, aktivácia/deaktivácia.</div>
</div>
<div class="manual-card">
  <div class="manual-card-title">Znalostná databáza</div>
  <div class="manual-card-desc">Príručky, chybové kódy, postupy opráv.</div>
</div>
<div class="manual-card">
  <div class="manual-card-title">Voicebot</div>
  <div class="manual-card-desc">Systémové prompty a nastavenia AI telefónneho asistenta.</div>
</div>
<div class="manual-card">
  <div class="manual-card-title">Fakturácia</div>
  <div class="manual-card-desc">VS formáty, platobné podmienky, šablóny a kategórie faktúr.</div>
</div>
</div>`,
      },
    ],
  },

  // ─── 4. DISPATCH APP ──────────────────────────────────────────
  {
    id: 'dispatch',
    number: 4,
    title: 'Dispatch App — Technická appka',
    intro: 'Mobilná PWA pre technikov v teréne. Uber-štýl rozhranie optimalizované pre jednoručné ovládanie.',
    subsections: [
      {
        id: 'dispatch-home',
        title: 'Domov (/dispatch)',
        content: `<ul>
<li><strong>Moje zákazky</strong> — aktívne priradené zákazky s ETA a navigáciou</li>
<li><strong>Notifikácie</strong> — push, WhatsApp, SMS upozornenia</li>
<li><strong>Rýchle akcie</strong> — „Som na ceste", „Som na mieste", „Začínam prácu"</li>
<li><strong>Kalendár</strong> — plánované zákazky na týždeň</li>
</ul>`,
      },
      {
        id: 'dispatch-marketplace',
        title: 'Marketplace (/dispatch/marketplace)',
        content: `<p>Uber-štýl systém prideľovania zákaziek:</p>
<ul>
<li><strong>Dostupné zákazky</strong> — zákazky zodpovedajúce špecializácii a lokácii technika</li>
<li><strong>Detail zákazky</strong> — popis škody, adresa, kontakt, kategória</li>
<li><strong>Jedno kliknutie</strong> — prijatie zákazky jedným klikom</li>
<li><strong>Vlnový systém</strong> — zákazka sa postupne ponúka technikov od najbližšieho po najvzdialenejšieho</li>
</ul>`,
      },
      {
        id: 'dispatch-protocol',
        title: 'Protokoly — 5-krokový wizard',
        content: `<p>6 typov protokolov podľa druhu opravy:</p>
<div class="manual-badges">
<span class="manual-badge blue">Štandardný</span>
<span class="manual-badge green">Revízny</span>
<span class="manual-badge orange">Havarijný</span>
<span class="manual-badge purple">Diagnostický</span>
<span class="manual-badge teal">Servisný</span>
<span class="manual-badge gold">Kontrolný</span>
</div>
<p><strong>5 krokov wizardu:</strong></p>
<ol>
<li><strong>Základné info</strong> — typ opravy, popis závady</li>
<li><strong>Fotodokumentácia</strong> — pred/po fotky, detail poškodenia</li>
<li><strong>Materiál a práca</strong> — použitý materiál, odpracované hodiny</li>
<li><strong>Podpis zákazníka</strong> — digitálny podpis na displeji</li>
<li><strong>Odoslanie</strong> — generovanie PDF, odoslanie klientovi a operátorovi</li>
</ol>`,
      },
      {
        id: 'dispatch-settlement',
        title: 'Zúčtovanie — 5-krokový flow',
        content: `<p>Po dokončení práce technik vyplní zúčtovanie:</p>
<ol>
<li><strong>Odpracované hodiny</strong> — začiatok, koniec, prestávky</li>
<li><strong>Materiál</strong> — spotrebovaný materiál s cenami</li>
<li><strong>Cestovné</strong> — najazdené km, parkovné</li>
<li><strong>Doplatok</strong> — suma vybraná od zákazníka</li>
<li><strong>Súhrn a odoslanie</strong> — kontrola a potvrdenie</li>
</ol>`,
      },
      {
        id: 'dispatch-profile',
        title: 'Profil (/dispatch/profile)',
        content: `<p>8 sekcií profilu technika:</p>
<ul>
<li>Osobné údaje a kontakt</li>
<li>Fakturačné údaje (IČO, DIČ, IBAN)</li>
<li>Špecializácie a certifikáty</li>
<li>Výjazdová oblasť a GPS</li>
<li>Hodinové sadzby</li>
<li>Pracovná dostupnosť</li>
<li>Podpis (digitálny)</li>
<li>Nastavenia notifikácií</li>
</ul>`,
      },
    ],
  },

  // ─── 5. KLIENTSKÝ PORTÁL ──────────────────────────────────────
  {
    id: 'portal',
    number: 5,
    title: 'Klientský portál',
    intro: 'Verejný portál pre zákazníkov dostupný cez unikátnu tokenovú URL. Bez registrácie, bez hesla.',
    subsections: [
      {
        id: 'portal-phases',
        title: '7 fáz portálu',
        content: `<div class="manual-timeline">
<div class="manual-step"><span class="manual-step-num blue-bg">1</span><div><strong>Diagnostika</strong> — Zákazník vidí, že jeho zákazka bola prijatá. Môže doplniť fotky a informácie.</div></div>
<div class="manual-step"><span class="manual-step-num orange-bg">2</span><div><strong>Technik priradený</strong> — Zákazník vidí meno technika, odhadovaný čas príjazdu a kontakt.</div></div>
<div class="manual-step"><span class="manual-step-num green-bg">3</span><div><strong>Prebieha práca</strong> — Live sledovanie stavu opravy.</div></div>
<div class="manual-step"><span class="manual-step-num purple-bg">4</span><div><strong>Doplatok</strong> — Ak je potrebný doplatok, zákazník schvaľuje alebo odmieta sumu.</div></div>
<div class="manual-step"><span class="manual-step-num teal-bg">5</span><div><strong>Protokol</strong> — Zákazník si môže stiahnuť protokol o oprave.</div></div>
<div class="manual-step"><span class="manual-step-num gold-bg">6</span><div><strong>Hodnotenie</strong> — Zákazník hodnotí technika hviezdičkami a komentárom.</div></div>
<div class="manual-step"><span class="manual-step-num gray-bg">7</span><div><strong>Uzavreté</strong> — Zákazka uzavretá, archivovaná.</div></div>
</div>`,
      },
      {
        id: 'portal-chat',
        title: 'Portálový chat',
        content: `<p>Zákazník môže komunikovať s operátorom a technikom priamo cez portál (fázy 2–5). Správy sa synchronizujú s admin chatom a WhatsApp kanálom.</p>`,
      },
    ],
  },

  // ─── 6. AUTOMATIZÁCIE ─────────────────────────────────────────
  {
    id: 'automations',
    number: 6,
    title: 'Automatizácie',
    intro: 'Systém obsahuje množstvo automatizácií, ktoré znižujú manuálnu prácu operátora.',
    subsections: [
      {
        id: 'auto-email',
        title: 'Email → Zákazka',
        content: `<p>Automatický príjem zákaziek z emailov partnerov:</p>
<ol>
<li>Gmail API monitoruje schránku na nové emaily od partnerov</li>
<li>AI extrahuje údaje — meno, adresa, telefón, kategória, popis škody</li>
<li>Vytvorí sa zákazka v pipeline (krok 0 — Príjem)</li>
<li>Operátor dostane notifikáciu o novej zákazke</li>
</ol>`,
      },
      {
        id: 'auto-dispatch',
        title: 'Auto-dispatch (Vlnový systém)',
        content: `<p>Automatické priraďovanie technikov:</p>
<ul>
<li><strong>Vlna 1</strong> — technici do 15 km so zodpovedajúcou špecializáciou</li>
<li><strong>Vlna 2</strong> — technici do 30 km</li>
<li><strong>Vlna 3</strong> — technici do 50 km</li>
<li><strong>Eskalácia</strong> — ak nikto neprijme, operátor dostane upozornenie</li>
</ul>
<p>Kaskáda notifikácií: <strong>Push → WhatsApp → SMS</strong></p>`,
      },
      {
        id: 'auto-pricing',
        title: 'Cenový engine',
        content: `<p><code>pricing-engine.ts</code> je <strong>jediný zdroj pravdy</strong> pre všetky finančné výpočty.</p>
<ul>
<li>Kalkulácia podľa partnera (AXA/EA/SEC — rôzne cenníky)</li>
<li>Automatické DPH podľa krajiny (CZ 12%/21%, SK 23%)</li>
<li>Pohotovostné príplatky podľa dňa a hodiny</li>
<li>Cestovné — zónové alebo per-km podľa partnera</li>
<li>Coverage limit — kontrola krytia poisťovne</li>
<li>Auto-reprice pri zmene pipeline krokov 4–9</li>
</ul>`,
      },
      {
        id: 'auto-invoicing',
        title: 'Fakturácia a platby',
        content: `<ul>
<li><strong>Automatická faktúra</strong> — generovanie PDF s QR kódom</li>
<li><strong>SEPA XML</strong> — KB-kompatibilný pain.001.001.03 formát pre hromadné platby</li>
<li><strong>Bank import</strong> — automatické párovanie platieb s faktúrami</li>
<li><strong>EA Odhláška</strong> — automatické hlásenie pre Europ Assistance</li>
</ul>`,
      },
      {
        id: 'auto-notifications',
        title: 'Notifikácie a komunikácia',
        content: `<table class="manual-table">
<thead><tr><th>Kanál</th><th>Použitie</th><th>Provider</th></tr></thead>
<tbody>
<tr><td>Web Push</td><td>Primárny kanál pre technikov</td><td>VAPID / Service Worker</td></tr>
<tr><td>WhatsApp</td><td>Fallback pre technikov + komunikácia s klientmi</td><td>WA Business API</td></tr>
<tr><td>SMS</td><td>Garantovaný fallback, notifikácie zákazníkom</td><td>Bulkgate</td></tr>
<tr><td>Email</td><td>Objednávky od partnerov, faktúry</td><td>Gmail API</td></tr>
<tr><td>SSE</td><td>Real-time aktualizácie v admin UI</td><td>Vlastný Event Bus</td></tr>
<tr><td>SIP/Voicebot</td><td>AI telefónny asistent</td><td>SIP klient</td></tr>
</tbody>
</table>
<p><strong>Kaskáda pre technikov:</strong> Push → WhatsApp (ak má) → SMS (vždy).</p>`,
      },
      {
        id: 'auto-rules',
        title: 'Automatizačné pravidlá',
        content: `<p>Konfigurovateľné pravidlá v <code>/admin/settings/automations</code>:</p>
<ul>
<li><strong>Trigger</strong> — zmena statusu, časový limit, akcia používateľa</li>
<li><strong>Podmienka</strong> — partner, kategória, priorita, hodnota poľa</li>
<li><strong>Akcia</strong> — send_push, send_sms, send_email, call_webhook, call_voicebot, change_status</li>
<li><strong>Auto-eskalácia</strong> — automatické eskalovanie pri prekročení SLA</li>
<li><strong>Auto-archív</strong> — automatická archivácia uzavretých zákaziek</li>
<li><strong>Follow-up engine</strong> — automatické pripomienky a follow-up akcie</li>
</ul>`,
      },
    ],
  },

  // ─── 7. CENOVÝ SYSTÉM ─────────────────────────────────────────
  {
    id: 'pricing',
    number: 7,
    title: 'Cenový systém',
    intro: 'Cenový engine je centrálny modul pre všetky finančné výpočty.',
    subsections: [
      {
        id: 'pricing-structure',
        title: 'Štruktúra ceny',
        content: `<table class="manual-table">
<thead><tr><th>Položka</th><th>Popis</th></tr></thead>
<tbody>
<tr><td>Práca</td><td>Hodinová sadzba × odpracované hodiny (prvá hodina + ďalšie hodiny)</td></tr>
<tr><td>Materiál</td><td>Jednotlivé položky materiálu s DPH</td></tr>
<tr><td>Cestovné</td><td>Obojsmerné km × sadzba (zónové alebo per-km)</td></tr>
<tr><td>Pohotovostný príplatok</td><td>Podľa partnera — víkend, noc, sviatky</td></tr>
<tr><td>Doplatok zákazníka</td><td>Suma nad rámec krytia poisťovne</td></tr>
</tbody>
</table>`,
      },
      {
        id: 'pricing-flow',
        title: 'Tok cenovej kalkulácie',
        content: `<ol>
<li><strong>Odhad technika</strong> (krok 4) — technik pošle cenový odhad z terénu</li>
<li><strong>Schválenie</strong> (krok 4–5) — operátor/klient schváli</li>
<li><strong>Zúčtovanie</strong> (krok 9) — technik vyplní skutočné náklady</li>
<li><strong>Auto-reprice</strong> — systém prepočíta pri kroky 4–9</li>
<li><strong>Cenová kontrola</strong> (krok 10) — finálna kontrola operátorom</li>
<li><strong>Fakturácia</strong> (krok 12) — generovanie faktúry</li>
</ol>
<div class="manual-warning">
<strong>Dôležité:</strong> Sadzby na faktúre sa berú z <code>pricingResult.input</code>, NIE z profilu technika. Pricing engine vracia celé Kč — konverzia na haléře cez <code>pricingApiToDisplayPricing()</code>.
</div>`,
      },
    ],
  },

  // ─── 8. BEZPEČNOSŤ ────────────────────────────────────────────
  {
    id: 'security',
    number: 8,
    title: 'Bezpečnosť a prístup',
    subsections: [
      {
        id: 'security-auth',
        title: 'Autentifikácia',
        content: `<ul>
<li><strong>Admin/Dispatch</strong> — telefónne číslo + SMS overovací kód → JWT token (jose) v httpOnly cookie, platnosť 90 dní</li>
<li><strong>Portál/Protokol</strong> — UUID token v URL, žiadna autentifikácia</li>
<li><strong>Roly</strong> — <code>technician</code> (technik) a <code>operator</code> (dispečer)</li>
<li><strong>Middleware</strong> — chráni všetky <code>/dispatch/*</code> a <code>/admin/*</code> routes</li>
</ul>`,
      },
      {
        id: 'security-data',
        title: 'Ochrana dát',
        content: `<ul>
<li><strong>Body size limit</strong> — 100KB na request (výnimky pre file upload cesty)</li>
<li><strong>Rate limiting</strong> — ochrana API endpointov pred zneužitím</li>
<li><strong>Strip insurer data</strong> — technik nikdy nevidí interné poisťovňové údaje</li>
<li><strong>GDPR</strong> — minimálny zber dát, token-based prístup bez registrácie</li>
</ul>`,
      },
    ],
  },
]

export const MANUAL_VERSION = '2.0'
export const MANUAL_LAST_UPDATED = '2026-04-01'
