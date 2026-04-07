/**
 * Static help content for all admin and dispatch pages.
 * Used by HelpPanel (admin), HelpTip (dispatch), and Walkthrough (dispatch).
 */

import type { WalkthroughStep } from '@/hooks/useWalkthrough'

// ── Types ────────────────────────────────────────────────────────────────

export type Lang = 'sk' | 'cz'

export interface HelpAction {
  label: string
  description: string
  icon?: string
}

export interface HelpContent {
  title: string
  description: string
  actions: HelpAction[]
  tips: string[]
  relatedPages?: { label: string; href: string }[]
}

// ── Admin CRM Help ───────────────────────────────────────────────────────

const ADMIN_HELP: Record<string, HelpContent> = {
  '/admin': {
    title: 'Dashboard',
    description: 'Hlavný prehľad CRM — KPI metriky, pipeline zákaziek, ranný briefing, follow-up upomienky a rýchle akcie.',
    actions: [
      { label: 'Ranný briefing', description: 'Zobrazí prehľad dnešných úloh, urgentných zákaziek a nadchádzajúcich termínov.', icon: '☀️' },
      { label: 'Rýchle akcie', description: 'Vytvorenie novej zákazky, pridanie technika, import z emailu.', icon: '⚡' },
      { label: 'Pipeline prehľad', description: 'Vizuálny prehľad zákaziek v jednotlivých krokoch CRM pipeline.', icon: '📊' },
    ],
    tips: [
      'Dashboard sa automaticky obnovuje každých 30 sekúnd.',
      'Kliknutím na číslo v pipeline sa zobrazí zoznam zákaziek v danom kroku.',
      'Červené upozornenia znamenajú zákazky po termíne — riešiť prioritne.',
    ],
    relatedPages: [
      { label: 'Zákazky', href: '/admin/jobs' },
      { label: 'Pripomienky', href: '/admin/reminders' },
    ],
  },

  '/admin/jobs': {
    title: 'Zoznam zákaziek',
    description: 'Kompletný zoznam všetkých zákaziek s filtrami, vyhľadávaním, pipeline pohľadom a hromadnými akciami.',
    actions: [
      { label: 'Filtrovanie', description: 'Filtrujte podľa stavu, partnera, technika, dátumu, priority a ďalších kritérií.', icon: '🔍' },
      { label: 'Kanban pohľad', description: 'Prepnite na vizuálny pipeline pohľad so stĺpcami pre každý CRM krok.', icon: '📋' },
      { label: 'Export', description: 'Exportujte filtrované zákazky do CSV súboru.', icon: '📥' },
      { label: 'Hromadné akcie', description: 'Vyberte viacero zákaziek a vykonajte hromadnú zmenu stavu.', icon: '✅' },
    ],
    tips: [
      'Použite Ctrl+K pre rýchle vyhľadávanie zákazky podľa čísla alebo mena zákazníka.',
      'Kliknutím na riadok zákazky otvoríte jej detail.',
      'Červená vlajka označuje urgentné zákazky s vysokou prioritou.',
    ],
    relatedPages: [
      { label: 'Nová zákazka', href: '/admin/jobs/new' },
      { label: 'Dashboard', href: '/admin' },
    ],
  },

  '/admin/jobs/new': {
    title: 'Nová zákazka',
    description: 'Vytvorenie novej zákazky — manuálne alebo importom z emailovej objednávky poisťovne.',
    actions: [
      { label: 'Manuálne vyplnenie', description: 'Vyplňte formulár s údajmi zákazníka, adresou, kategóriou práce a poisťovňou.', icon: '✏️' },
      { label: 'Import z emailu', description: 'Vložte text emailovej objednávky a AI automaticky vyplní polia formulára.', icon: '📧' },
    ],
    tips: [
      'Panel "Importovať z objednávky" nájdete v hornej časti formulára — stačí vložiť text emailu.',
      'AI rozpoznáva objednávky od AXA, Europ Assistance aj Security Support.',
      'Po importe skontrolujte a prípadne opravte automaticky vyplnené polia.',
    ],
    relatedPages: [
      { label: 'Zákazky', href: '/admin/jobs' },
    ],
  },

  '/admin/jobs/[id]': {
    title: 'Detail zákazky',
    description: 'Kompletný kontext zákazky — 13-krokový pipeline, kontaktné údaje, cenový widget, chat, dokumenty, aktivitný log a AI polia.',
    actions: [
      { label: 'Posunúť stav', description: 'Posuňte zákazku na ďalší krok v CRM pipeline.', icon: '➡️' },
      { label: 'Priradiť technika', description: 'Manuálne priraďte technika alebo spustite auto-matching.', icon: '🔧' },
      { label: 'Cenový odhad', description: 'Zobrazte cenový rozpad — práca, cestovné, materiál, DPH, doplatok.', icon: '💰' },
      { label: 'Chat', description: 'Komunikujte s technikom alebo klientom priamo z detailu zákazky.', icon: '💬' },
    ],
    tips: [
      'Pravý panel zobrazuje kontextové informácie — podľa aktuálneho kroku pipeline.',
      'AI polia sa automaticky generujú na základe dát zákazky.',
      'Aktivitný log zaznamenáva každú zmenu — kto, kedy, čo.',
    ],
    relatedPages: [
      { label: 'Zákazky', href: '/admin/jobs' },
      { label: 'Matching', href: '/admin/criteria' },
    ],
  },

  '/admin/technicians': {
    title: 'Zoznam technikov',
    description: 'Adresár všetkých technikov — GPS pozícia, špecializácie, hodnotenie, stav aktivity.',
    actions: [
      { label: 'Nový technik', description: 'Zaregistrujte nového technika do systému.', icon: '➕' },
      { label: 'GPS mapa', description: 'Zobrazte polohu technikov na mape.', icon: '📍' },
      { label: 'Filtrovanie', description: 'Filtrujte podľa špecializácie, krajiny, hodnotenia, dostupnosti.', icon: '🔍' },
    ],
    tips: [
      'Zelená bodka znamená technik online/aktívny. Šedá = offline.',
      'Kliknutím na technika otvoríte jeho profil s históriou zákaziek.',
      'GPS pozícia sa aktualizuje keď technik používa dispatch appku.',
    ],
    relatedPages: [
      { label: 'Nový technik', href: '/admin/technicians/new' },
      { label: 'Matching', href: '/admin/criteria' },
    ],
  },

  '/admin/technicians/[id]': {
    title: 'Profil technika',
    description: 'Detailný profil — fakturačné údaje, sadzby, špecializácie, pracovné hodiny, kalendár zákaziek, hodnotenie.',
    actions: [
      { label: 'Upraviť profil', description: 'Zmeňte sadzby, špecializácie, kontaktné údaje.', icon: '✏️' },
      { label: 'Zobraziť zákazky', description: 'História všetkých zákaziek technika.', icon: '📋' },
    ],
    tips: [
      'Sadzby (€/hod, €/km) ovplyvňujú automatický cenový výpočet.',
      'Špecializácie určujú aké typy zákaziek technik dostane v marketplace.',
    ],
  },

  '/admin/partners': {
    title: 'Partneri a poisťovne',
    description: 'Správa poisťovní — AXA, Europ Assistance, Allianz/Security Support. Cenové pravidlá, kontakty, priradené emaily.',
    actions: [
      { label: 'Nový partner', description: 'Pridajte novú poisťovňu do systému.', icon: '➕' },
      { label: 'Upraviť pravidlá', description: 'Nastavte cenové pravidlá, príplatky, kontaktné údaje.', icon: '⚙️' },
    ],
    tips: [
      'Každý partner má vlastné cenové pravidlá — zónové cestovné, príplatky za víkend/noc.',
      'Povolené emailové adresy (allowed_sender_emails) filtrujú automatický import objednávok.',
    ],
    relatedPages: [
      { label: 'Zákazky', href: '/admin/jobs' },
    ],
  },

  '/admin/criteria': {
    title: 'Kritériá matchingu',
    description: 'Konfigurácia automatického priraďovania technikov — váhy kritérií, presety pre rôzne scenáre, auto-notify nastavenia.',
    actions: [
      { label: 'Presety', description: 'Prednastavené kombinácie váh (napr. "Urgentná zákazka", "Štandardná").', icon: '📦' },
      { label: 'Váhy kritérií', description: 'Nastavte dôležitosť: vzdialenosť, špecializácia, hodnotenie, dostupnosť.', icon: '⚖️' },
      { label: 'Auto-notify', description: 'Nastavte automatické notifikácie technikom pri novej zákazke.', icon: '🔔' },
    ],
    tips: [
      'Vyššia váha vzdialenosti = systém preferuje bližších technikov.',
      'Auto-notify odošle push notifikáciu najvhodnejším technikom automaticky.',
    ],
    relatedPages: [
      { label: 'Technici', href: '/admin/technicians' },
      { label: 'Zákazky', href: '/admin/jobs' },
    ],
  },

  '/admin/payments': {
    title: 'Platby',
    description: 'Dávkové spracovanie platieb technikom — SEPA XML export, párované platby, prehľad úhrad.',
    actions: [
      { label: 'SEPA export', description: 'Vygenerujte SEPA XML súbor pre banku na hromadný prevod.', icon: '🏦' },
      { label: 'Import bankového výpisu', description: 'Nahrajte bankový výpis pre automatické párovanie platieb.', icon: '📄' },
    ],
    tips: [
      'SEPA XML je štandardný formát pre hromadné bankové prevody v EÚ.',
      'Nepárované platby vyžadujú manuálne priradenie k zákazke.',
    ],
  },

  '/admin/chat': {
    title: 'Chat',
    description: 'Konverzácie s technikmi a klientmi — zoskupené podľa zákazky, s históriou správ.',
    actions: [
      { label: 'Nová správa', description: 'Odošlite správu technikovi alebo klientovi.', icon: '💬' },
    ],
    tips: [
      'Správy sú zoskupené podľa zákazky — každá zákazka má svoj vlákno.',
      'Klient dostane správy cez portálovú URL (bez prihlásenia).',
    ],
  },

  '/admin/operations': {
    title: 'AI Mozog',
    description: 'Dashboard AI agentov — signály, eskalácie, detekcia podozrivých výkazov, sentiment analysis.',
    actions: [
      { label: 'Prehľad signálov', description: 'Zobrazte Critical/Warning/Info signály z AI agentov.', icon: '🧠' },
    ],
    tips: [
      'AI Mozog beží každých 5 minút a monitoruje SLA, GPS anomálie, neodpovedané správy.',
      'Critical signály vyžadujú okamžitú pozornosť operátora.',
      'Fraud Agent kontroluje podozrivé km výkazy a neobvyklé ceny materiálu.',
    ],
  },

  '/admin/ai-fields': {
    title: 'AI Polia',
    description: 'Konfigurácia automaticky generovaných polí — AI dopĺňa kontext zákazky na základe dát.',
    actions: [
      { label: 'Nové AI pole', description: 'Vytvorte nové pole s prompt šablónou a trigger podmienkami.', icon: '✨' },
    ],
    tips: [
      'AI polia sa generujú pri zmene stavu zákazky (trigger_on + trigger_states).',
      'Prompt šablóna môže obsahovať premenné z dát zákazky ({customer_name}, {category}, ...).',
    ],
  },

  '/admin/reminders': {
    title: 'Pripomienky',
    description: 'Systémové upomienky a follow-up — automaticky generované pre zákazky blízko termínu alebo bez aktivity.',
    actions: [
      { label: 'Filtrovanie', description: 'Filtrujte podľa priority (critical/warning/info) a stavu.', icon: '🔍' },
      { label: 'Označiť vyriešené', description: 'Označte pripomienku ako vyriešenú.', icon: '✅' },
    ],
    tips: [
      'Červené pripomienky = zákazka po termíne. Oranžové = blíži sa termín.',
      'Follow-up engine automaticky generuje pripomienky podľa CRM kroku a typu zákazky.',
    ],
  },

  '/admin/notifications': {
    title: 'Notifikácie',
    description: 'Centrum všetkých systémových notifikácií — nové zákazky, zmeny stavov, správy od technikov.',
    actions: [
      { label: 'Označiť prečítané', description: 'Označte notifikáciu ako prečítanú.', icon: '✅' },
      { label: 'Filtrovanie', description: 'Filtrujte podľa typu notifikácie.', icon: '🔍' },
    ],
    tips: [
      'Neprechítané notifikácie sú zobrazené ako badge na ikone zvončeka.',
    ],
  },

  '/admin/manual': {
    title: 'Systémová príručka',
    description: 'Kompletný manuál CRM systému — všetky funkcie, workflow diagramy, screenshoty, automatizácie.',
    actions: [],
    tips: [
      'Manuál obsahuje interaktívne Mermaid diagramy — kliknite pre detail.',
      'Použite vyhľadávanie v manuáli pre rýchle nájdenie konkrétnej funkcie.',
      'Sekcie sú skladateľné — kliknite na hlavičku pre rozbalenie/zbalenie.',
    ],
  },
}

// ── Dispatch Help ────────────────────────────────────────────────────────────────────────

const DISPATCH_HELP: Record<string, { sk: HelpContent; cz: HelpContent }> = {
  '/dispatch': {
    sk: {
      title: 'Domov',
      description: 'Preh\u013ead dne\u0161n\xe9ho d\u0148a \u2014 akt\xedvne z\xe1kazky, \u0161tatistiky, r\xfdchle akcie.',
      actions: [
        { label: 'Akt\xedvna z\xe1kazka', description: 'Kliknut\xedm otvor\xedte detail aktu\xe1lne rozpracovanej z\xe1kazky.', icon: '\ud83d\udd27' },
        { label: 'Dne\u0161n\xe9 z\xe1kazky', description: 'Zoznam v\u0161etk\xfdch z\xe1kaziek napl\xe1novan\xfdch na dnes.', icon: '\ud83d\udccb' },
      ],
      tips: [
        'Ak m\xe1te akt\xedvnu z\xe1kazku, zobraz\xed sa na cel\xfa obrazovku s navig\xe1ciou a stavom.',
        '\u0160tatistiky ukazuj\xfa po\u010det dokon\u010den\xfdch z\xe1kaziek, zar\xe1bky a hodnotenie.',
      ],
    },
    cz: {
      title: 'Dom\u016f',
      description: 'P\u0159ehled dne\u0161n\xedho dne \u2014 aktivn\xed zak\xe1zky, statistiky, rychl\xe9 akce.',
      actions: [
        { label: 'Aktivn\xed zak\xe1zka', description: 'Kliknut\xedm otev\u0159ete detail aktu\xe1ln\u011b rozpracovan\xe9 zak\xe1zky.', icon: '\ud83d\udd27' },
        { label: 'Dne\u0161n\xed zak\xe1zky', description: 'Seznam v\u0161ech zak\xe1zek napl\xe1novan\xfdch na dnes.', icon: '\ud83d\udccb' },
      ],
      tips: [
        'Pokud m\xe1te aktivn\xed zak\xe1zku, zobraz\xed se na celou obrazovku s navigac\xed a stavem.',
        'Statistiky ukazuj\xed po\u010det dokon\u010den\xfdch zak\xe1zek, v\xfdd\u011blky a hodnocen\xed.',
      ],
    },
  },

  // Virtual path \u2014 used when ActiveJobFullscreen is visible on /dispatch
  '/dispatch/__active-job': {
    sk: {
      title: 'Akt\xedvna z\xe1kazka',
      description: 'Pr\xe1ve pracujete na z\xe1kazke. Zlat\xe9 tla\u010didlo v\xe1s vedie \u010fal\u0161\xedm krokom.',
      actions: [
        { label: 'Zlat\xe9 tla\u010didlo', description: 'Hlavn\xe9 ak\u010dn\xe9 tla\u010didlo \u2014 pos\xfava z\xe1kazku na \u010fal\u0161\xed krok (Na ceste \u2192 Na mieste \u2192 Diagnostika \u2192 Odhad \u2192 Pr\xe1ca \u2192 Protokol).', icon: '\u2b50' },
        { label: 'Navigova\u0165', description: 'Otvor\xed Google Mapy s adresou z\xe1kazn\xedka.', icon: '\ud83d\udccd' },
        { label: 'Chat', description: 'Odo\u0161lite spr\xe1vu dispe\u010derovi priamo z detailu z\xe1kazky.', icon: '\ud83d\udcac' },
        { label: 'Fotky', description: 'Pridajte fotky pred opravou, po\u010das pr\xe1ce alebo po dokon\u010den\xed.', icon: '\ud83d\udcf7' },
        { label: 'Preru\u0161i\u0165 pr\xe1cu', description: 'Ak potrebujete odjs\u0165 a vr\xe1ti\u0165 sa nesk\xf4r (viacn\xe1sobn\xe1 n\xe1v\u0161teva).', icon: '\u23f8' },
      ],
      tips: [
        'Stavov\xfd p\xe1s pod z\xe1kazkou ukazuje kde v procese sa nach\xe1dzate.',
        'Po diagnostike syst\xe9m automaticky otvor\xed formul\xe1r pre cenov\xfd odhad.',
        'Ak klient schr\xe1lil doplatok, zobraz\xed sa zelen\xfd box s potvrden\xedm.',
        'Protokol a fakt\xfaru m\xf4\u017eete odosl\u0165 priamo z tejto obrazovky.',
      ],
    },
    cz: {
      title: 'Aktivn\xed zak\xe1zka',
      description: 'Pr\xe1v\u011b pracujete na zak\xe1zce. Zlat\xe9 tla\u010d\xedtko v\xe1s vede dal\u0161\xedm krokem.',
      actions: [
        { label: 'Zlat\xe9 tla\u010d\xedtko', description: 'Hlavn\xed ak\u010dn\xed tla\u010d\xedtko \u2014 posunuje zak\xe1zku na dal\u0161\xed krok (Na cest\u011b \u2192 Na m\xedst\u011b \u2192 Diagnostika \u2192 Odhad \u2192 Pr\xe1ce \u2192 Protokol).', icon: '\u2b50' },
        { label: 'Navigovat', description: 'Otev\u0159e Google Mapy s adresou z\xe1kazn\xedka.', icon: '\ud83d\udccd' },
        { label: 'Chat', description: 'Ode\u0161lete zpr\xe1vu dispe\u010derovi p\u0159\xedmo z detailu zak\xe1zky.', icon: '\ud83d\udcac' },
        { label: 'Fotky', description: 'P\u0159idejte fotky p\u0159ed opravou, b\u011bhem pr\xe1ce nebo po dokon\u010den\xed.', icon: '\ud83d\udcf7' },
        { label: 'P\u0159eru\u0161it pr\xe1ci', description: 'Pokud pot\u0159ebujete odej\xedt a vr\xe1tit se pozd\u011bji (opakovan\xe1 n\xe1v\u0161t\u011bva).', icon: '\u23f8' },
      ],
      tips: [
        'Stavov\xfd p\xe1s pod zak\xe1zkou ukazuje, kde v procesu se nach\xe1z\xedte.',
        'Po diagnostice syst\xe9m automaticky otev\u0159e formul\xe1\u0159 pro cenov\xfd odhad.',
        'Pokud z\xe1kazn\xedk schv\xe1lil doplatek, zobraz\xed se zelen\xfd box s potvrzen\xedm.',
        'Protokol a fakturu m\u016f\u017eete odeslat p\u0159\xedmo z t\xe9to obrazovky.',
      ],
    },
  },

  '/dispatch/deals': {
    sk: {
      title: 'Z\xe1kazky',
      description: 'Kompletn\xfd zoznam va\u0161ich z\xe1kaziek \u2014 zoraden\xe9 pod\u013ea stavu: Napl\xe1novan\xe9, Prebieha, Faktur\xe1cia, Uhradet\xe9.',
      actions: [
        { label: 'Filtrovanie', description: 'Pou\u017eite filter chips hore na obrazovke \u2014 dnes, zajtra, faktur\xe1cia, uhradet\xe9, zru\u0161en\xe9. Pos\xfavajte doprava pre \u010fal\u0161ie filtre.', icon: '\ud83d\udd0d' },
        { label: 'Skupiny pod\u013ea stavu', description: 'Z\xe1kazky s\xfa automaticky zoskupen\xe9 pod\u013ea f\xe1zy (Napl\xe1novan\xe9 \u2192 Prebieha \u2192 Faktur\xe1cia \u2192 Uhradet\xe9). Kliknut\xedm na hlavi\u010dku skupiny ju zbal\xedte/rozbal\xedte.', icon: '\ud83d\udcca' },
        { label: 'Detail z\xe1kazky', description: 'Kliknut\xedm na z\xe1kazku zobraz\xedte detail s postupom pr\xe1c a akciami.', icon: '\ud83d\udccb' },
      ],
      tips: [
        'Vyh\u013ead\xe1vacie pole h\u013ead\xe1 pod\u013ea mena z\xe1kazn\xedka, adresy, \u010d\xedsla z\xe1kazky aj kateg\xf3rie.',
        'Ka\u017ed\xe1 z\xe1kazka m\xe1 stavov\xfd p\xe1s so v\u0161etk\xfdmi krokmi od prijatia po uzavretie.',
        'Z\xe1kazky v sekcii "Dokon\u010di\u0165 faktur\xe1ciu" \u010dakaj\xfa na v\xe1\u0161 protokol alebo fakt\xfaru.',
      ],
    },
    cz: {
      title: 'Zak\xe1zky',
      description: 'Kompletn\xed seznam va\u0161ich zak\xe1zek \u2014 se\u0159azen\xe9 podle stavu: Napl\xe1novan\xe9, Prob\xedh\xe1, Fakturace, Uhrazen\xe9.',
      actions: [
        { label: 'Filtrov\xe1n\xed', description: 'Pou\u017eijte filter chips naho\u0159e na obrazovce \u2014 dnes, z\xedtra, fakturace, uhrazen\xe9, zru\u0161en\xe9. P\u0159ejedte doprava pro dal\u0161\xed filtry.', icon: '\ud83d\udd0d' },
        { label: 'Skupiny podle stavu', description: 'Zak\xe1zky jsou automaticky seskupeny podle f\xe1ze (Napl\xe1novan\xe9 \u2192 Prob\xedh\xe1 \u2192 Fakturace \u2192 Uhrazen\xe9). Kliknut\xedm na z\xe1hlav\xed skupiny ji sbal\xedte/rozbal\xedte.', icon: '\ud83d\udcca' },
        { label: 'Detail zak\xe1zky', description: 'Kliknut\xedm na zak\xe1zku zobraz\xedte detail s postupem prac\xed a akcemi.', icon: '\ud83d\udccb' },
      ],
      tips: [
        'Vyhled\xe1vac\xed pole hled\xe1 podle jm\xe9na z\xe1kazn\xedka, adresy, \u010d\xedsla zak\xe1zky i kategorie.',
        'Ka\u017ed\xe1 zak\xe1zka m\xe1 stavov\xfd p\xe1s se v\u0161emi kroky od p\u0159ijet\xed po uzav\u0159en\xed.',
        'Zak\xe1zky v sekci "Dokon\u010dit fakturaci" \u010dekaj\xed na v\xe1\u0161 protokol nebo fakturu.',
      ],
    },
  },

  '/dispatch/marketplace': {
    sk: {
      title: 'Nov\xe9 ponuky',
      description: 'Dostupn\xe9 z\xe1kazky vo va\u0161om okol\xed. Prijmite alebo odmietnite ponuku.',
      actions: [
        { label: 'Prija\u0165 z\xe1kazku', description: 'Z\xe1kazka sa v\xe1m prirad\xed a presunie do va\u0161ich z\xe1kaziek.', icon: '\u2705' },
        { label: 'Odmietnu\u0165', description: 'Z\xe1kazka zostane dostupn\xe1 pre in\xfdch technikov.', icon: '\u274c' },
      ],
      tips: [
        'Z\xe1kazky s\xfa zoraden\xe9 pod\u013ea vzdialenosti od va\u0161ej aktu\xe1lnej polohy.',
        'Pois\u0165ov\u0148a a odhadovan\xe1 odmena s\xfa zobrazen\xe9 na karte z\xe1kazky.',
      ],
    },
    cz: {
      title: 'Nov\xe9 nab\xeddky',
      description: 'Dostupn\xe9 zak\xe1zky ve va\u0161em okol\xed. P\u0159ijm\u011bte nebo odmit\u011bte nab\xeddku.',
      actions: [
        { label: 'P\u0159ijmout zak\xe1zku', description: 'Zak\xe1zka se v\xe1m p\u0159i\u0159ad\xed a p\u0159esune do va\u0161ich zak\xe1zek.', icon: '\u2705' },
        { label: 'Odm\xednout', description: 'Zak\xe1zka z\u016fstane dostupn\xe1 pro ostatn\xed techniky.', icon: '\u274c' },
      ],
      tips: [
        'Zak\xe1zky jsou se\u0159azeny podle vzd\xe1lenosti od va\u0161\xed aktu\xe1ln\xed polohy.',
        'Poji\u0161\u0165ovna a odhadovan\xe1 odm\u011bna jsou zobrazeny na kart\u011b zak\xe1zky.',
      ],
    },
  },

  '/dispatch/my-jobs': {
    sk: {
      title: 'Moje z\xe1kazky',
      description: 'V\u0161etky priraden\xe9 z\xe1kazky \u2014 akt\xedvne, napl\xe1novan\xe9 aj dokon\u010den\xe9.',
      actions: [
        { label: 'Filtrovanie', description: 'Zobrazte len akt\xedvne, napl\xe1novan\xe9, alebo dokon\u010den\xe9 z\xe1kazky.', icon: '\ud83d\udd0d' },
        { label: 'Detail z\xe1kazky', description: 'Kliknut\xedm otvor\xedte detail s mo\u017enos\u0165ou pos\xfava\u0165 stav.', icon: '\ud83d\udccb' },
      ],
      tips: [
        'Akt\xedvna z\xe1kazka je zv\xfdraznen\xe1 hore na str\xe1nke.',
        'Po dokon\u010den\xed protokolu sa z\xe1kazka presunie do "Dokon\u010den\xe9".',
      ],
    },
    cz: {
      title: 'Moje zak\xe1zky',
      description: 'V\u0161echny p\u0159i\u0159azen\xe9 zak\xe1zky \u2014 aktivn\xed, napl\xe1novan\xe9 i dokon\u010den\xe9.',
      actions: [
        { label: 'Filtrov\xe1n\xed', description: 'Zobrazte jen aktivn\xed, napl\xe1novan\xe9 nebo dokon\u010den\xe9 zak\xe1zky.', icon: '\ud83d\udd0d' },
        { label: 'Detail zak\xe1zky', description: 'Kliknut\xedm otev\u0159ete detail s mo\u017enost\xed posunout stav.', icon: '\ud83d\udccb' },
      ],
      tips: [
        'Aktivn\xed zak\xe1zka je zv\xfdrazn\u011bna naho\u0159e na str\xe1nce.',
        'Po dokon\u010den\xed protokolu se zak\xe1zka p\u0159esune do "Dokon\u010den\xe9".',
      ],
    },
  },

  '/dispatch/calendar': {
    sk: {
      title: 'Kalend\xe1r',
      description: 'Denn\xfd a t\xfd\u017eedn\xfd poh\u013ead na napl\xe1novan\xe9 z\xe1kazky a vo\u013en\xfd \u010das.',
      actions: [
        { label: 'Blokova\u0165 \u010das', description: 'Ozna\u010dte \u010dasov\xfd blok ako nedostupn\xfd (dovolenka, \xfadr\u017eba).', icon: '\ud83d\udeab' },
        { label: 'Prepn\xfa\u0165 poh\u013ead', description: 'Prepnite medzi denn\xfdm a t\xfd\u017eedn\xfdm zobrazen\xedm.', icon: '\ud83d\udcc5' },
      ],
      tips: [
        'Z\xe1kazky napl\xe1novan\xe9 na konkr\xe9tny d\xe1tum sa zobrazia v kalend\xe1ri.',
        'Blok\xe1cia \u010dasu zabr\xe1ni prirad\xd4ovaniu nov\xfdch z\xe1kaziek v danom obdob\xed.',
      ],
    },
    cz: {
      title: 'Kalend\xe1\u0159',
      description: 'Denn\xed a t\xfddenm\xed pohled na napl\xe1novan\xe9 zak\xe1zky a voln\xfd \u010das.',
      actions: [
        { label: 'Zablokovat \u010das', description: 'Ozna\u010dte \u010dasov\xfd blok jako nedostupn\xfd (dovolen\xe1, \xfadr\u017eba).', icon: '\ud83d\udeab' },
        { label: 'P\u0159epnout pohled', description: 'P\u0159epn\u011bte mezi denn\xedm a t\xfddenm\xedm zobrazen\xedm.', icon: '\ud83d\udcc5' },
      ],
      tips: [
        'Zak\xe1zky napl\xe1novan\xe9 na konkr\xe9tn\xed datum se zobraz\xed v kalend\xe1\u0159i.',
        'Blokace \u010dasu zabr\xe1n\xed p\u0159i\u0159azov\xe1n\xed nov\xfdch zak\xe1zek v dan\xe9m obdob\xed.',
      ],
    },
  },

  '/dispatch/chat': {
    sk: {
      title: 'Chat',
      description: 'Konverz\xe1cie s dispe\u010derom \u2014 ku ka\u017edej z\xe1kazke zvl\xe1\u0161\u0165.',
      actions: [
        { label: 'Nov\xe1 spr\xe1va', description: 'Odo\u0161lite spr\xe1vu dispe\u010derovi k aktu\xe1lnej z\xe1kazke.', icon: '\ud83d\udcac' },
      ],
      tips: [
        'Spr\xe1vy s\xfa zoskupen\xe9 pod\u013ea z\xe1kazky.',
        'Dispe\u010der vid\xed va\u0161e spr\xe1vy okam\u017eite v admin CRM.',
      ],
    },
    cz: {
      title: 'Chat',
      description: 'Konverzace s dispe\u010derem \u2014 ke ka\u017ed\xe9 zak\xe1zce zvl\xe1\u0161\u0165.',
      actions: [
        { label: 'Nov\xe1 zpr\xe1va', description: 'Ode\u0161lete zpr\xe1vu dispe\u010derovi k aktu\xe1ln\xed zak\xe1zce.', icon: '\ud83d\udcac' },
      ],
      tips: [
        'Zpr\xe1vy jsou seskupeny podle zak\xe1zky.',
        'Dispe\u010der vid\xed va\u0161e zpr\xe1vy okam\u017eit\u011b v admin CRM.',
      ],
    },
  },

  '/dispatch/profile': {
    sk: {
      title: 'Profil',
      description: 'V\xe1\u0161 profil \u2014 sadzby, \u0161pecializ\xe1cie, dostupnos\u0165, vozidlo, podpis, dokumenty.',
      actions: [
        { label: 'Upravi\u0165 sadzby', description: 'Nastavte hodinov\xfa sadzbu, cestovn\xe9 za km.', icon: '\ud83d\udcb0' },
        { label: 'Podpis', description: 'Nahrajte alebo nakreslite svoj podpis pre protokoly.', icon: '\u270d\ufe0f' },
        { label: 'Dostupnos\u0165', description: 'Nastavte pracovn\xe9 hodiny, v\xedkendy, sviatky.', icon: '\ud83d\udcc5' },
      ],
      tips: [
        'Kompletn\xfd profil zvy\u0161uje \u0161ancu na pridelenie z\xe1kaziek.',
        'Podpis sa automaticky vlo\u017e\xed do protokolov a fakt\xfar.',
        '\u0160pecializ\xe1cie ur\u010duj\xfa ak\xe9 typy z\xe1kaziek sa v\xe1m zobrazia v marketplace.',
      ],
    },
    cz: {
      title: 'Profil',
      description: 'V\xe1\u0161 profil \u2014 sazby, specializace, dostupnost, vozidlo, podpis, dokumenty.',
      actions: [
        { label: 'Upravit sazby', description: 'Nastavte hodinovou sazbu, cestovn\xe9 za km.', icon: '\ud83d\udcb0' },
        { label: 'Podpis', description: 'Nahrajte nebo nakreslete sv\u016fj podpis pro protokoly.', icon: '\u270d\ufe0f' },
        { label: 'Dostupnost', description: 'Nastavte pracovn\xed hodiny, v\xedkendy, sv\xe1tky.', icon: '\ud83d\udcc5' },
      ],
      tips: [
        'Kompletn\xed profil zvy\u0161uje \u0161anci na p\u0159id\u011blen\xed zak\xe1zek.',
        'Podpis se automaticky vlo\u017e\xed do protokol\u016f a faktur.',
        'Specializace ur\u010duj\xed, jak\xe9 typy zak\xe1zek se v\xe1m zobraz\xed v marketplace.',
      ],
    },
  },

  '/dispatch/settings': {
    sk: {
      title: 'Nastavenia',
      description: 'Jazykov\xe9 nastavenia, t\xe9ma, notifik\xe1cie, tutori\xe1ly.',
      actions: [
        { label: 'Jazyk', description: 'Prepnite medzi sloven\u010dinou a \u010de\u0161tinou.', icon: '\ud83c\udf10' },
        { label: 'Tmav\xfd re\u017eim', description: 'Zapnite/vypnite tmav\xfd re\u017eim.', icon: '\ud83c\udf19' },
        { label: 'Zobrazi\u0165 n\xe1vody', description: 'Znovu zobrazte interakt\xedvne tutori\xe1ly pre v\u0161etky obrazovky.', icon: '\ud83d\udcd6' },
      ],
      tips: [
        'Push notifik\xe1cie vy\u017eaduj\xfa povolenie v prehliadači.',
      ],
    },
    cz: {
      title: 'Nastaven\xed',
      description: 'Jazykov\xe1 nastaven\xed, t\xe9ma, notifikace, tutori\xe1ly.',
      actions: [
        { label: 'Jazyk', description: 'P\u0159epn\u011bte mezi slovens\u0161tinou a \u010de\u0161tinou.', icon: '\ud83c\udf10' },
        { label: 'Tmav\xfd re\u017eim', description: 'Zapn\u011bte/vypn\u011bte tmav\xfd re\u017eim.', icon: '\ud83c\udf19' },
        { label: 'Zobrazit n\xe1vody', description: 'Znovu zobrazte interaktivn\xed tutori\xe1ly pro v\u0161echny obrazovky.', icon: '\ud83d\udcd6' },
      ],
      tips: [
        'Push notifikace vy\u017eaduj\xed povolen\xed v prohl\xed\u017ee\u010di.',
      ],
    },
  },

  '/dispatch/calls': {
    sk: {
      title: 'Hovory',
      description: 'Hist\xf3ria hovorov \u2014 prepojenie na CloudTalk z\xe1znamy.',
      actions: [
        { label: 'Zavola\u0165', description: 'Spustite hovor na \u010d\xedslo z\xe1kazn\xedka.', icon: '\ud83d\udcde' },
      ],
      tips: [
        'Hovory sa automaticky prira\u010fuj\xfa k z\xe1kazke pod\u013ea telef\xf3nneho \u010d\xedsla.',
      ],
    },
    cz: {
      title: 'Hovory',
      description: 'Historie hovor\u016f \u2014 propojen\xed na z\xe1znamy CloudTalk.',
      actions: [
        { label: 'Zavolat', description: 'Spus\u0165te hovor na \u010d\xedslo z\xe1kazn\xedka.', icon: '\ud83d\udcde' },
      ],
      tips: [
        'Hovory se automaticky p\u0159i\u0159azuj\xed k zak\xe1zce podle telefonn\xedho \u010d\xedsla.',
      ],
    },
  },

  '/dispatch/notifications': {
    sk: {
      title: 'Notifik\xe1cie',
      description: 'Centrum push notifik\xe1ci\xed \u2014 nov\xe9 z\xe1kazky, zmeny stavov, spr\xe1vy od dispe\u010dera.',
      actions: [
        { label: 'Ozna\u010di\u0165 pre\u010d\xeetan\xe9', description: 'Ozna\u010dte notifik\xe1ciu ako pre\u010d\xeetan\xfa.', icon: '\u2705' },
      ],
      tips: [
        'Nov\xe9 ponuky z marketplace sa zobrazuj\xfa ako push notifik\xe1cia.',
        'Kliknut\xedm na notifik\xe1ciu prejdete priamo na relevantn\xfa z\xe1kazku.',
      ],
    },
    cz: {
      title: 'Notifikace',
      description: 'Centrum push notifikac\xed \u2014 nov\xe9 zak\xe1zky, zm\u011bny stav\u016f, zpr\xe1vy od dispe\u010dera.',
      actions: [
        { label: 'Ozna\u010dit p\u0159e\u010dten\xe9', description: 'Ozna\u010dte notifikaci jako p\u0159e\u010dtenou.', icon: '\u2705' },
      ],
      tips: [
        'Nov\xe9 nab\xeddky z marketplace se zobrazuj\xed jako push notifikace.',
        'Kliknut\xedm na notifikaci p\u0159ejdete p\u0159\xedmo na p\u0159\xedslu\u0161nou zak\xe1zku.',
      ],
    },
  },

  '/dispatch/job/[id]': {
    sk: {
      title: 'Detail z\xe1kazky',
      description: 'Kompletn\xfd preh\u013ead z\xe1kazky \u2014 stavov\xfd p\xe1s, kontaktn\xe9 \xfadaje, zlat\xe9 ak\u010dn\xe9 tla\u010didlo, mod\xe1ly pre diagnostiku, odhad, fotky a protokol.',
      actions: [
        { label: 'Zlat\xe9 tla\u010didlo', description: 'Hlavn\xe9 ak\u010dn\xe9 tla\u010didlo \u2014 pos\xfava z\xe1kazku na \u010fal\u0161\xed krok v procese.', icon: '\u2b50' },
        { label: 'Navigova\u0165', description: 'Otvor\xed Google Mapy s adresou z\xe1kazn\xedka.', icon: '\ud83d\udccd' },
        { label: 'Zavola\u0165', description: 'Spust\xed hovor na \u010d\xedslo z\xe1kazn\xedka.', icon: '\ud83d\udcde' },
        { label: 'Chat', description: 'Odo\u0161lite spr\xe1vu dispe\u010derovi k tejto z\xe1kazke.', icon: '\ud83d\udcac' },
        { label: 'Fotky', description: 'Pridajte fotky pred opravou, po\u010das pr\xe1ce alebo po dokon\u010den\xed.', icon: '\ud83d\udcf7' },
      ],
      tips: [
        'Stavov\xfd p\xe1s ukazuje kde v procese sa z\xe1kazka nach\xe1dza (Prijato \u2192 Na mieste \u2192 Diagnostika \u2192 ... \u2192 Uzavret\xe9).',
        'Str\xe1nka sa automaticky obn\u0151vuje ka\u017ed\xfdch 15 sek\xfand.',
        'Ak potrebujete preru\u0161i\u0165 pr\xe1cu a vr\xe1ti\u0165 sa nesk\xf4r, pou\u017eite "Preru\u0161i\u0165 pr\xe1cu".',
      ],
    },
    cz: {
      title: 'Detail zak\xe1zky',
      description: 'Kompletn\xed p\u0159ehled zak\xe1zky \u2014 stavov\xfd p\xe1s, kontaktn\xed \xfadaje, zlat\xe9 ak\u010dn\xed tla\u010d\xedtko, mod\xe1ly pro diagnostiku, odhad, fotky a protokol.',
      actions: [
        { label: 'Zlat\xe9 tla\u010d\xedtko', description: 'Hlavn\xed ak\u010dn\xed tla\u010d\xedtko \u2014 posunuje zak\xe1zku na dal\u0161\xed krok v procesu.', icon: '\u2b50' },
        { label: 'Navigovat', description: 'Otev\u0159e Google Mapy s adresou z\xe1kazn\xedka.', icon: '\ud83d\udccd' },
        { label: 'Zavolat', description: 'Spust\xed hovor na \u010d\xedslo z\xe1kazn\xedka.', icon: '\ud83d\udcde' },
        { label: 'Chat', description: 'Ode\u0161lete zpr\xe1vu dispe\u010derovi k t\xe9to zak\xe1zce.', icon: '\ud83d\udcac' },
        { label: 'Fotky', description: 'P\u0159idejte fotky p\u0159ed opravou, b\u011bhem pr\xe1ce nebo po dokon\u010den\xed.', icon: '\ud83d\udcf7' },
      ],
      tips: [
        'Stavov\xfd p\xe1s ukazuje, kde v procesu se zak\xe1zka nach\xe1z\xed (P\u0159ijato \u2192 Na m\xedst\u011b \u2192 Diagnostika \u2192 ... \u2192 Uzav\u0159eno).',
        'Str\xe1nka se automaticky obnovuje ka\u017ed\xfdch 15 sekund.',
        'Pokud pot\u0159ebujete p\u0159eru\u0161it pr\xe1ci a vr\xe1tit se pozd\u011bji, pou\u017eijte "P\u0159eru\u0161it pr\xe1ci".',
      ],
    },
  },

  '/dispatch/protocol/[id]': {
    sk: {
      title: 'Protokol',
      description: 'Formul\xe1r servisn\xe9ho protokolu \u2014 5 krokov od \xfadajov o z\xe1kazke po odoslanie s podpisom.',
      actions: [
        { label: 'Krok 1: Z\xe1kazka', description: '\xdadaje o z\xe1kazke a typ protokolu (\u0161tandardn\xfd, diagnostick\xfd, viacn\xe1sobn\xe1 n\xe1v\u0161teva...).', icon: '\ud83d\udccb' },
        { label: 'Krok 2: V\xfdjazdy', description: '\u010casy pr\xedchodu a odchodu, najazdene km. \u010cas pr\xedchodu sa na\u010d\xedta automaticky.', icon: '\ud83d\ude97' },
        { label: 'Krok 3: Pr\xe1ca + Materi\xe1l', description: 'Popis pr\xe1ce, pou\u017eit\xfd materi\xe1l s cenami a mno\u017estvom.', icon: '\ud83d\udd27' },
        { label: 'Krok 4: Fotky', description: 'Fotodokument\xe1cia \u2014 pred, po\u010das a po oprave.', icon: '\ud83d\udcf7' },
        { label: 'Krok 5: Kontrola + Odoslanie', description: 'Z\xe1vere\u010dn\xe1 kontrola, podpis klienta a odoslanie protokolu.', icon: '\u2705' },
      ],
      tips: [
        'V\xe1\u0161 podpis sa automaticky na\u010d\xedta z profilu \u2014 nemus\xedte ho kresli\u0165 znovu.',
        '\u010c\xedslo n\xe1v\u0161tevy sa detekuje automaticky pod\u013ea predch\xe1dzaj\xfacich protokolov.',
        'Ak ste offline, protokol sa ulo\u017e\xed do fronty a odo\u0161le po pripojen\xed.',
        'Po \xfaspe\u0161nom odoslan\xed sa vr\xe1tite sp\xe4\u0165 na detail z\xe1kazky.',
      ],
    },
    cz: {
      title: 'Protokol',
      description: 'Formul\xe1\u0159 servisn\xedho protokolu \u2014 5 krok\u016f od \xfadaj\u016f o zak\xe1zce po odesl\xe1n\xed s podpisem.',
      actions: [
        { label: 'Krok 1: Zak\xe1zka', description: '\xdadaje o zak\xe1zce a typ protokolu (standardn\xed, diagnostick\xfd, opakovan\xe1 n\xe1v\u0161t\u011bva...).', icon: '\ud83d\udccb' },
        { label: 'Krok 2: V\xfdjezdy', description: '\u010casy p\u0159\xedjezdu a odjezdu, najet\xe9 km. \u010cas p\u0159\xedjezdu se na\u010dte automaticky.', icon: '\ud83d\ude97' },
        { label: 'Krok 3: Pr\xe1ce + Materi\xe1l', description: 'Popis pr\xe1ce, pou\u017eit\xfd materi\xe1l s cenami a mno\u017estv\xedm.', icon: '\ud83d\udd27' },
        { label: 'Krok 4: Fotky', description: 'Fotodokumentace \u2014 p\u0159ed, b\u011bhem a po oprav\u011b.', icon: '\ud83d\udcf7' },
        { label: 'Krok 5: Kontrola + Odesl\xe1n\xed', description: 'Z\xe1v\u011bre\u010dn\xe1 kontrola, podpis z\xe1kazn\xedka a odesl\xe1n\xed protokolu.', icon: '\u2705' },
      ],
      tips: [
        'V\xe1\u0161 podpis se automaticky na\u010dte z profilu \u2014 nemus\xedte ho kreslit znovu.',
        '\u010c\xedslo n\xe1v\u0161t\u011bvy se detekuje automaticky podle p\u0159edchoz\xedch protokol\u016f.',
        'Pokud jste offline, protokol se ulo\u017e\xed do fronty a odesle po p\u0159ipojen\xed.',
        'Po \xfasp\u011b\u0161n\xe9m odesl\xe1n\xed se vr\xe1t\xedte zp\u011bt na detail zak\xe1zky.',
      ],
    },
  },
}

// ── Walkthrough Steps ────────────────────────────────────────────────────

export const WALKTHROUGH_STEPS: Record<string, { sk: WalkthroughStep[]; cz: WalkthroughStep[] }> = {
  '/dispatch/deals': {
    sk: [
      { target: 'deals-filter-strip', title: 'Filtre zákaziek', description: 'Rýchle filtrovanie: Dnes, Zajtra, Fakturácia, Uhradené, Zrušené. Posúvajte doprava pre ďalšie filtre.', position: 'bottom' },
      { target: 'deals-search-input', title: 'Vyhľadávanie', description: 'Hľadajte podľa mena zákazníka, adresy, čísla zákazky alebo kategórie práce. Funguje aj offline z cache.', position: 'bottom' },
      { target: 'home-section-header', title: 'Skupiny podľa stavu', description: 'Zákazky sú zoskupené podľa fázy: Naplánované, Prebieha, Fakturácia. Kliknutím na hlavičku skupinu zbalíte alebo rozbalíte.', position: 'bottom' },
      { target: 'bottom-nav', title: 'Spodná navigácia', description: 'Domov = prehľad, Ponuky = nové zákazky, Zákazky = tento zoznam, Kalendár = plánovanie, Správy = chat s dispečerom.', position: 'top' },
    ],
    cz: [
      { target: 'deals-filter-strip', title: 'Filtry zakázek', description: 'Rychlé filtrování: Dnes, Zítra, Fakturace, Uhrazené, Zrušené. Přejeďte doprava pro další filtry.', position: 'bottom' },
      { target: 'deals-search-input', title: 'Vyhledávání', description: 'Hledejte podle jména zákazníka, adresy, čísla zakázky nebo kategorie práce. Funguje i offline z cache.', position: 'bottom' },
      { target: 'home-section-header', title: 'Skupiny podle stavu', description: 'Zakázky jsou seskupeny podle fáze: Naplánované, Probíhá, Fakturace. Kliknutím na hlavičku skupinu sbalíte nebo rozbalíte.', position: 'bottom' },
      { target: 'bottom-nav', title: 'Spodní navigace', description: 'Domů = přehled, Nabídky = nové zakázky, Zakázky = tento seznam, Kalendář = plánování, Zprávy = chat s dispečerem.', position: 'top' },
    ],
  },

  '/dispatch': {
    sk: [
      { target: 'dashboard-header', title: 'Prehľad a štatistiky', description: 'Hore vidíte svoje meno, dostupnosť a štatistiky: koľko zákaziek vyžaduje akciu, čaká na fakturáciu a je naplánovaných.', position: 'bottom' },
      { target: 'day-tabs', title: 'Dnešné zákazky', description: 'Prepínajte medzi zákazkami na dnes, zajtra a celý týždeň. Kliknutím na kartu ju rozbalíte a môžete začať pracovať.', position: 'top' },
      { target: 'bottom-nav', title: 'Kam ďalej?', description: 'Domov = tento prehľad, Ponuky = nové zákazky na prihlásenie, Zákazky = kompletný zoznam, Kalendár = plánovanie, Správy = chat s dispečerom.', position: 'top' },
    ],
    cz: [
      { target: 'dashboard-header', title: 'Přehled a statistiky', description: 'Nahoře vidíte své jméno, dostupnost a statistiky: kolik zakázek vyžaduje akci, čeká na fakturaci a je naplánovaných.', position: 'bottom' },
      { target: 'day-tabs', title: 'Dnešní zakázky', description: 'Přepínejte mezi zakázkami na dnes, zítra a celý týden. Kliknutím na kartu ji rozbalíte a můžete začít pracovat.', position: 'top' },
      { target: 'bottom-nav', title: 'Kam dál?', description: 'Domů = tento přehled, Nabídky = nové zakázky k přihlášení, Zakázky = kompletní seznam, Kalendář = plánování, Zprávy = chat s dispečerem.', position: 'top' },
    ],
  },

  '/dispatch/my-jobs': {
    sk: [
      { target: 'job-filter-tabs', title: 'Aktívne a dokončené', description: 'Prepnite medzi aktívnymi zákazkami (na ktorých práve pracujete) a dokončenými (história a fakturácia).', position: 'bottom' },
      { target: 'job-filter-chips', title: 'Rýchle filtre', description: 'Filtrujte podľa stavu: Dnes, Na ceste, Na mieste, Pracuje, Čaká schválenie. Kliknutím zapnete/vypnete filter.', position: 'bottom' },
      { target: 'job-card', title: 'Zoznam zákaziek', description: 'Každá karta zobrazuje zákazníka, adresu, čas a aktuálny stav. Kliknutím na kartu ju rozbalíte a uvidíte detaily a akcie.', position: 'top' },
      { target: 'bottom-nav', title: 'Navigácia', description: 'Domov = prehľad, Ponuky = nové zákazky na prihlásenie, Zákazky = tento zoznam, Kalendár = plánovanie, Správy = chat s dispečerom.', position: 'top' },
    ],
    cz: [
      { target: 'job-filter-tabs', title: 'Aktivní a dokončené', description: 'Přepněte mezi aktivními zakázkami (na kterých právě pracujete) a dokončenými (historie a fakturace).', position: 'bottom' },
      { target: 'job-filter-chips', title: 'Rychlé filtry', description: 'Filtrujte podle stavu: Dnes, Na cestě, Na místě, Pracuje, Čeká schválení. Kliknutím zapnete/vypnete filtr.', position: 'bottom' },
      { target: 'job-card', title: 'Seznam zakázek', description: 'Každá karta zobrazuje zákazníka, adresu, čas a aktuální stav. Kliknutím na kartu ji rozbalíte a uvidíte detaily a akce.', position: 'top' },
      { target: 'bottom-nav', title: 'Navigace', description: 'Domů = přehled, Nabídky = nové zakázky k přihlášení, Zakázky = tento seznam, Kalendář = plánování, Zprávy = chat s dispečerem.', position: 'top' },
    ],
  },

  '/dispatch/chat': {
    sk: [
      { target: 'chat-operator', title: 'Priamy kontakt s dispečerom', description: 'Hore je vždy priamy chat s dispečerom — pre urgentné veci, otázky alebo problémy.', position: 'bottom' },
      { target: 'chat-list', title: 'Konverzácie ku zákazkám', description: 'Pod tým sú chaty ku konkrétnym zákazkám. Každá zákazka má vlastnú konverzáciu. Kliknutím otvoríte chat.', position: 'top' },
    ],
    cz: [
      { target: 'chat-operator', title: 'Přímý kontakt s dispečerem', description: 'Nahoře je vždy přímý chat s dispečerem — pro urgentní věci, dotazy nebo problémy.', position: 'bottom' },
      { target: 'chat-list', title: 'Konverzace k zakázkám', description: 'Pod tím jsou chaty ke konkrétním zakázkám. Každá zakázka má vlastní konverzaci. Kliknutím otevřete chat.', position: 'top' },
    ],
  },

  '/dispatch/profile': {
    sk: [
      { target: 'profile-rates', title: 'Sadzby', description: 'Nastavte si hodinovú sadzbu a cestovné. Tieto sadzby sa použijú pri výpočte odmeny.', position: 'bottom' },
      { target: 'profile-specializations', title: 'Špecializácie', description: 'Vyberte aké typy prác ovládate. Podľa toho sa vám zobrazia zákazky v marketplace.', position: 'bottom' },
      { target: 'profile-signature', title: 'Podpis', description: 'Nahrajte alebo nakreslite podpis — automaticky sa vloží do protokolov.', position: 'top' },
    ],
    cz: [
      { target: 'profile-rates', title: 'Sazby', description: 'Nastavte si hodinovou sazbu a cestovné. Tyto sazby se použijí při výpočtu odměny.', position: 'bottom' },
      { target: 'profile-specializations', title: 'Specializace', description: 'Vyberte, jaké typy prací ovládáte. Podle toho se vám zobrazí zakázky v marketplace.', position: 'bottom' },
      { target: 'profile-signature', title: 'Podpis', description: 'Nahrajte nebo nakreslete podpis — automaticky se vloží do protokolů.', position: 'top' },
    ],
  },

  '/dispatch/job/[id]': {
    sk: [
      { target: 'job-customer-card', title: 'Zákazník', description: 'Meno, adresa a kontakt zákazníka. Odtiaľto sa priamo navigujete, zavoláte alebo otvoríte chat.', position: 'bottom' },
      { target: 'job-status-chip', title: 'Stav zákazky', description: 'Aktuálna fáza práce: Naplánované → Na ceste → Na mieste → Diagnostika → Odhad → Práca → Protokol → Fakturácia.', position: 'bottom' },
      { target: 'job-info-sections', title: 'Informácie a diagnostika', description: 'Detaily zákazky, informácie od klienta (z diagnostického formulára), AI diagnostika, fotky od klienta a dokumenty. Kliknutím rozbalíte/zbalíte sekciu.', position: 'bottom' },
      { target: 'job-action-button', title: 'Hlavné tlačidlo', description: 'Zlaté tlačidlo dole posúva zákazku ďalej: Vyraziť → Prišiel som → Odoslať odhad → Začať prácu → Odoslať protokol. Vždy ukazuje ďalší krok.', position: 'top' },
      { target: 'walkthrough-estimate-info', title: 'Odhad ceny', description: 'Po diagnostike zadáte odhad:\n• Počet hodín práce\n• Km na miesto (GPS meranie)\n• Materiál — vyberiete z katalógu alebo pridáte vlastný\n\nAplikácia automaticky spočíta cenu podľa vašich sadzieb. Klient dostane SMS s odhadom na schválenie.', position: 'bottom' },
      { target: 'walkthrough-protocol-info', title: 'Protokol o vykonanej práci', description: 'Po dokončení práce vyplníte protokol:\n• Popis vykonanej práce\n• Použitý materiál (predvyplnený z odhadu)\n• Fotky pred a po oprave\n• Podpis klienta — priamo na displeji telefónu\n\nProtokol sa odošle klientovi aj našej spoločnosti automaticky.', position: 'bottom' },
      { target: 'walkthrough-settlement-info', title: 'Zúčtovanie', description: 'Po odoslaní protokolu potvrdíte finálne údaje:\n• Skutočné hodiny (môžu sa líšiť od odhadu)\n• Skutočné km\n• Finálny materiál\n\nAk sa niečo zmenilo oproti odhadu, jednoducho opravíte. Systém prepočíta cenu automaticky.', position: 'bottom' },
      { target: 'walkthrough-invoice-info', title: 'Fakturácia', description: 'Po zúčtovaní máte 2 možnosti:\n\n• Vygenerovať faktúru — appka vytvorí faktúru automaticky z vašich sadzieb a odpracovaných hodín\n• Nahrať vlastnú — ak fakturujete cez vlastný systém, jednoducho nahráte PDF\n\nPo odoslaní faktúry čakáte na úhradu od nás (štandardne do 14 dní).', position: 'bottom' },
    ],
    cz: [
      { target: 'job-customer-card', title: 'Zákazník', description: 'Jméno, adresa a kontakt zákazníka. Odtud se přímo navigujete, zavoláte nebo otevřete chat.', position: 'bottom' },
      { target: 'job-status-chip', title: 'Stav zakázky', description: 'Aktuální fáze práce: Naplánované → Na cestě → Na místě → Diagnostika → Odhad → Práce → Protokol → Fakturace.', position: 'bottom' },
      { target: 'job-info-sections', title: 'Informace a diagnostika', description: 'Detaily zakázky, informace od klienta (z diagnostického formuláře), AI diagnostika, fotky od klienta a dokumenty. Kliknutím rozbalíte/sbalíte sekci.', position: 'bottom' },
      { target: 'job-action-button', title: 'Hlavní tlačítko', description: 'Zlaté tlačítko dole posunuje zakázku dál: Vyrazit → Přijel jsem → Odeslat odhad → Začít práci → Odeslat protokol. Vždy ukazuje další krok.', position: 'top' },
      { target: 'walkthrough-estimate-info', title: 'Odhad ceny', description: 'Po diagnostice zadáte odhad:\n• Počet hodin práce\n• Km na místo (GPS měření)\n• Materiál — vyberete z katalogu nebo přidáte vlastní\n\nAplikace automaticky spočítá cenu podle vašich sazeb. Klient dostane SMS s odhadem ke schválení.', position: 'bottom' },
      { target: 'walkthrough-protocol-info', title: 'Protokol o provedené práci', description: 'Po dokončení práce vyplníte protokol:\n• Popis provedené práce\n• Použitý materiál (předvyplněný z odhadu)\n• Fotky před a po opravě\n• Podpis klienta — přímo na displeji telefonu\n\nProtokol se odešle klientovi i naší společnosti automaticky.', position: 'bottom' },
      { target: 'walkthrough-settlement-info', title: 'Zúčtování', description: 'Po odeslání protokolu potvrdíte finální údaje:\n• Skutečné hodiny (mohou se lišit od odhadu)\n• Skutečné km\n• Finální materiál\n\nPokud se něco změnilo oproti odhadu, jednoduše opravíte. Systém přepočítá cenu automaticky.', position: 'bottom' },
      { target: 'walkthrough-invoice-info', title: 'Fakturace', description: 'Po zúčtování máte 2 možnosti:\n\n• Vygenerovat fakturu — appka vytvoří fakturu automaticky z vašich sazeb a odpracovaných hodin\n• Nahrát vlastní — pokud fakturujete přes vlastní systém, jednoduše nahrajete PDF\n\nPo odeslání faktury čekáte na úhradu od nás (standardně do 14 dnů).', position: 'bottom' },
    ],
  },

  '/dispatch/demo': {
    sk: [
      { target: 'demo-job-list', title: 'Vaše zákazky', description: 'Každá karta predstavuje zákazku v inom stave. Kliknite na ľubovoľnú a pozrite si detaily.', position: 'bottom' },
      { target: 'bottom-nav', title: 'Navigácia', description: 'Domov, Ponuky, Zákazky, Kalendár, Správy — rovnako ako v reálnej aplikácii.', position: 'top' },
    ],
    cz: [
      { target: 'demo-job-list', title: 'Vaše zakázky', description: 'Každá karta představuje zakázku v jiném stavu. Klikněte na libovolnou a podívejte se na detail.', position: 'bottom' },
      { target: 'bottom-nav', title: 'Navigace', description: 'Domů, Nabídky, Zakázky, Kalendář, Zprávy — stejné jako v reálné aplikaci.', position: 'top' },
    ],
  },

  '/dispatch/demo/job': {
    sk: [
      { target: 'job-customer-card', title: 'Zákazník', description: 'Meno, adresa a kontakt. Navigácia, volanie a chat jedným kliknutím.', position: 'bottom' },
      { target: 'job-info-sections', title: 'Detaily a AI diagnostika', description: 'AI navrhne opravu, postup a materiál automaticky. Informácie od klienta, dokumenty a fotky.', position: 'top' },
      { target: 'job-action-button', title: 'Ako to funguje', description: 'Zlaté tlačidlo posúva zákazku ďalej:\n\n1. Odhad ceny — hodiny, km, materiál\n2. Klient schvaľuje doplatok cez SMS\n3. Protokol — klient podpíše na mobile\n4. Vyúčtovanie — systém prepočíta\n5. Faktúra — automatická + ISDOC\n\nÚhrada do 14 dní.', position: 'top' },
    ],
    cz: [
      { target: 'job-customer-card', title: 'Zákazník', description: 'Jméno, adresa a kontakt. Navigace, volání a chat jedním kliknutím.', position: 'bottom' },
      { target: 'job-info-sections', title: 'Detaily a AI diagnostika', description: 'AI navrhne opravu, postup a materiál automaticky. Informace od klienta, dokumenty a fotky.', position: 'top' },
      { target: 'job-action-button', title: 'Jak to funguje', description: 'Zlaté tlačítko posunuje zakázku dál:\n\n1. Odhad ceny — hodiny, km, materiál\n2. Klient schvaluje doplatek přes SMS\n3. Protokol — klient podepíše na mobilu\n4. Vyúčtování — systém přepočítá\n5. Faktura — automatická + ISDOC pro účetní\n\nZadáte vlastní variabilní symbol.\nÚhrada do 14 dnů.', position: 'top' },
    ],
  },

  '/dispatch/calendar': {
    sk: [
      { target: 'calendar-view-toggle', title: 'Pohľad', description: 'Prepnite medzi denným a týždenným zobrazením.', position: 'bottom' },
      { target: 'calendar-block-time', title: 'Blokovať čas', description: 'Označte časový blok ako nedostupný — systém vám v tom čase nepriradí zákazku.', position: 'bottom' },
    ],
    cz: [
      { target: 'calendar-view-toggle', title: 'Pohled', description: 'Přepněte mezi denním a týdenním zobrazením.', position: 'bottom' },
      { target: 'calendar-block-time', title: 'Zablokovat čas', description: 'Označte časový blok jako nedostupný — systém vám v tom čase nepřiřadí zakázku.', position: 'bottom' },
    ],
  },
}

// ── Lookup Functions ─────────────────────────────────────────────────────

/**
 * Get help content for a given pathname and interface.
 * Handles dynamic routes like /admin/jobs/123 → /admin/jobs/[id]
 */
export function getHelpContent(pathname: string, iface: 'admin', lang?: Lang): HelpContent | null
export function getHelpContent(pathname: string, iface: 'dispatch', lang?: Lang): HelpContent | null
export function getHelpContent(pathname: string, iface: 'admin' | 'dispatch', lang: Lang = 'sk'): HelpContent | null {
  if (iface === 'admin') {
    if (ADMIN_HELP[pathname]) return ADMIN_HELP[pathname]
    const parts = pathname.split('/')
    if (parts.length >= 4) {
      const pattern = `${parts.slice(0, 3).join('/')}/[id]`
      if (ADMIN_HELP[pattern]) return ADMIN_HELP[pattern]
    }
    return null
  }

  // Dispatch — localized
  const entry = DISPATCH_HELP[pathname]
    || (pathname.split('/').length >= 4
      ? DISPATCH_HELP[`${pathname.split('/').slice(0, 3).join('/')}/[id]`]
      : undefined)

  if (!entry) return null
  return entry[lang] ?? entry.sk
}

/**
 * Get walkthrough steps for a dispatch screen.
 */
export function getWalkthroughSteps(pathname: string, lang: Lang = 'sk'): WalkthroughStep[] {
  const entry = WALKTHROUGH_STEPS[pathname]
    // Try dynamic route pattern: /dispatch/job/123 → /dispatch/job/[id]
    || (pathname.split('/').length >= 4
      ? WALKTHROUGH_STEPS[`${pathname.split('/').slice(0, 3).join('/')}/[id]`]
      : undefined)
  if (!entry) return []
  return entry[lang] ?? entry.sk
}
