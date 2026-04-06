import type { DashboardPresetId, DashboardSourceId, DashboardView } from '@/lib/dashboardLayout'

/* ─── Dashboard view tooltips ─── */
export const DASHBOARD_VIEW_TOOLTIPS: Record<DashboardView, string> = {
  operations:
    'Denný prehľad operatívy — zákazky, pipeline, blokery a pripomienky. ' +
    'Tu vidíte čo treba riešiť dnes a kde sa zákazky hromadia.',
  cashflow:
    'Finančný prehľad — príjmy, náklady na technikov, čakajúce faktúry a marža. ' +
    'Pomáha sledovať cash flow a porovnávať partnerov.',
  ai:
    'AI riadenie — signály, eskalácie, kapacita technikov a analýza zrušených zákaziek. ' +
    'Zobrazuje situácie, kde AI potrebuje rozhodnutie operátora.',
}

/* ─── Dashboard card tooltips (by preset ID) ─── */
export const DASHBOARD_CARD_TOOLTIPS: Record<DashboardPresetId, string> = {
  // ── Operatíva ──
  briefing:
    'Zákazky, ktoré si vyžadujú pozornosť dnes — urgentné, blížiace sa deadliny, ' +
    'zákazky bez technika. Zoradené podľa priority.',
  reminders:
    'Vaše osobné pripomienky k zákazkám (napr. "zavolať klientovi o 14:00"). ' +
    'Zobrazujú sa len vaše pripomienky, nie kolegov.',
  pipeline:
    'Stĺpcový graf ukazujúci koľko zákaziek je v každom kroku pipeline ' +
    '(Príjem → Uzavreté). Rýchly pohľad kde sa zákazky hromadia.',
  alerts:
    'Zákazky, ktoré sa zasekli — chýba technik, technik nereaguje, ' +
    'prekročený SLA deadline. Treba ich riešiť prednostne.',
  priority:
    'Zákazky označené ako urgentné, VIP, eskalované alebo so sťažnosťou. ' +
    'Filtrované podľa priority vlajky.',
  exports:
    'Skratky na časté operácie — export zákaziek, hromadné akcie, ' +
    'generovanie reportov.',
  followups:
    'Odporúčané ďalšie akcie pre zákazky, ktoré čakajú na ďalší krok — ' +
    'napr. "Schváliť odhad", "Odoslať EA odhlášku".',

  // ── Cashflow ──
  cashflow_summary:
    'Hlavné finančné ukazovatele: príjmy tento mesiac, čakajúce faktúry, ' +
    'náklady na technikov, marža.',
  cashflow_estimates:
    'Odhad budúcich nákladov na základe rozpracovaných zákaziek — ' +
    'pomáha plánovať cash flow dopredu.',
  cashflow_trend:
    'Graf vývoja príjmov a nákladov za posledné mesiace. ' +
    'Ukazuje sezónnosť a trendy.',
  cashflow_partners:
    'Porovnanie asistenčných spoločností (AXA, EA, Security Support) ' +
    'podľa objemu zákaziek a obratu.',

  // ── Automatizácie ──
  automation_overview:
    'Prehľad automatizačných pravidiel — aktívne pravidlá, počet spustení a posledné chyby.',

  // ── AI riadenie ──
  brain_control:
    'Súhrn AI aktivít — koľko signálov AI vygenerovala, koľko je kritických, ' +
    'koľko čaká na schválenie operátorom.',
  brain_agents:
    'Rozloženie práce medzi AI agentov (emotion, pricing, matching). ' +
    'Pomáha identifikovať preťaženie.',
  brain_escalations:
    'Situácie, kde AI nedokáže rozhodnúť sama a odporúča zásah operátora. ' +
    'Vyžadujú vašu pozornosť.',
  client_risk_watchlist:
    'Zákazky, kde AI detegovala negatívnu emóciu klienta alebo riziko eskalácie. ' +
    'Vyžadujú pozornosť operátora.',
  technician_watchlist:
    'Technici, ktorých výkon AI vyhodnotila ako problematický — ' +
    'nízke hodnotenie, meškania, sťažnosti.',
  voicebot_queue:
    'Hovory, kde voicebot nezvládol konverzáciu a potrebuje ' +
    'prevzatie operátorom.',
  voicebot_outcomes:
    'Štatistika úspešnosti voicebotových hovorov — koľko vyriešil sám, ' +
    'koľko eskalovalo na operátora.',
  operator_handoffs:
    'Rozhodnutia čakajúce na operátora — schválenie ceny, ' +
    'potvrdenie priradenia, výnimky z pravidiel.',
  cancellation_reasons:
    'Analýza prečo sa zákazky rušia — kapacitné dôvody, ' +
    'odmietnuté doplatky, klient si rozmyslel.',
  cancellation_hotspots:
    'Kde sa zákazky najčastejšie rušia — ktoré mestá, kategórie, ' +
    'partneri majú najvyšší podiel zrušení.',
  capacity_forecast:
    'Predpoveď zaťaženia technikov na nasledujúce dni — ' +
    'pomáha plánovať kapacitu vopred.',
  capacity_hotspots:
    'Mestá a kategórie, kde chýba kapacita technikov — ' +
    'viac zákaziek ako dostupných technikov.',
  capacity_plan:
    'AI odporúčania na riešenie kapacitných problémov — ' +
    'napr. nábor špecialistu v konkrétnom regióne.',
  client_risk_ops:
    'Zákazníci s negatívnym sentimentom — sťažnosti, eskalácie, ' +
    'ignorovaní klienti. Zachyťte problém včas.',
  technician_risk_ops:
    'Technici vykazujúci rizikové signály — frustrácia, pokles spoľahlivosti, ' +
    'komunikačné problémy alebo riziko odchodu.',
  auto_notify_status:
    'Stav auto-notify pipeline — zákazky čakajúce na technika, dokončené notifikácie a zákazky bez technika.',
  auto_notify_queue:
    'Fronta zákaziek v auto-notify pipeline — vlna notifikácií, počet oslovených technikov a výsledok.',
}

/* ─── Dashboard source tooltips (for custom cards) ─── */
export const DASHBOARD_SOURCE_TOOLTIPS: Record<DashboardSourceId, string> = {
  jobs: 'Zákazky v CRM pipeline — počty, stavy, filtre podľa partnera, kategórie a urgentnosti.',
  cashflow: 'Finančné KPI — príjmy, náklady, marža a mesačné trendy.',
  reminders: 'Pripomienky, ktoré ste si nastavili k zákazkám. Len vaše, osobné.',
  alerts: 'Operačné blokery — zákazky, kde niečo nefunguje a treba to riešiť.',
  ai_signals: 'AI signály a odporúčania — automatická detekcia problémov a príležitostí.',
  followups: 'Odporúčané ďalšie kroky pre zákazky čakajúce na akciu.',
  partners: 'Prehľad asistenčných spoločností a ich základné metriky.',
  technicians: 'Prehľad technikov, ich aktivita a hodnotenie.',
  payment_batches: 'Dávky platieb technikom — rozpracované a odoslané.',
  notifications: 'Systémové notifikácie pre operátorov.',
  invoices: 'Faktúry — vystavené, validované, po splatnosti.',
  voicebot: 'Hlasový automat — fronta hovorov, prebiehajúce a výsledky.',
  ai_requests: 'Otvorené požiadavky z chatbota a voicebota na prevzatie operátorom.',
  cancellations: 'Analýza zrušených zákaziek — dôvody a stratené príležitosti.',
  capacity: 'Kapacita technikov — slabé miesta, backlog, odporúčania na navýšenie.',
  automations: 'Automatizačné pravidlá — aktívne pravidlá, počet spustení a posledné chyby.',
  auto_notify_status: 'Stav auto-notify pipeline — zákazky čakajúce na technika, dokončené notifikácie a zákazky bez technika.',
  auto_notify_queue: 'Fronta zákaziek v auto-notify pipeline — vlna notifikácií, počet oslovených technikov a výsledok.',
}

/* ─── Dashboard UI element tooltips ─── */
export const DASHBOARD_UI_TOOLTIPS = {
  globalFilters:
    'Filtre sa aplikujú na všetky kompatibilné karty na aktuálnej záložke. ' +
    'Nekompatibilné karty (napr. Cashflow na Operatíve) ich ignorujú.',
  editMode:
    'Editor dashboardu — presúvajte karty ťahaním, meňte veľkosť a typ zobrazenia, ' +
    'skrývajte nepotrebné karty. Zmeny uložte tlačidlom "Uložiť pre tím".',
  addCard:
    'Pridajte novú kartu z dostupných zdrojov dát. Vyberte zdroj, typ zobrazenia ' +
    '(graf, tabuľka, metrika) a veľkosť karty.',
  cardType:
    'Formát zobrazenia dát: Metrika (jedno číslo), Zoznam (riadky), Tabuľka, ' +
    'Stĺpcový/Líniový/Koláčový graf, alebo Text.',
  cardSize:
    'Veľkosť karty na dashboarde: Celá šírka, Široká (2/3), ' +
    'Polovičná (1/2), alebo Úzka (bočný panel).',
}

/* ─── Partner field tooltips ─── */
export const PARTNER_TOOLTIPS = {
  code: 'Skratka partnera (napr. AXA, EA, SEC). Používa sa interne v systéme a na identifikáciu v API.',
  name: 'Oficiálny názov asistenčnej spoločnosti alebo poisťovne.',
  country: 'Krajina, v ktorej partner pôsobí. Určuje menu a DPH sadzby.',
  contactEmail: 'Kontaktný e-mail partnera. Používa sa na komunikáciu ohľadom zákaziek.',
  contactPhone: 'Kontaktný telefón partnera. Pre urgentné záležitosti a eskalácie.',
  color: 'Farba partnera v systéme — zobrazuje sa na badge-och a grafoch pre rýchlu identifikáciu.',
  logoUrl: 'URL adresa loga partnera. Zobrazuje sa v CRM a na dokumentoch.',
  isActive: 'Aktívny partner prijíma nové zákazky. Neaktívny partner má len historické zákazky.',
  allowedSenderEmails: 'E-mailové adresy, z ktorých partner posiela objednávky. Slúži na automatické párovanie prijatých e-mailov s partnerom.',
  customFields: 'Vlastné polia partnera — špeciálne nastavenia a metadáta.',
}

/* ─── Technician detail page tooltips ─── */
export const TECHNICIAN_TOOLTIPS = {
  // Sadzby
  firstHourRate: 'Hodinová sadzba za prvú hodinu práce na zákazke. Prvá hodina je vyššia — pokrýva čas príjazdu a diagnostiky.',
  additionalHourRate: 'Sadzba za každú ďalšiu hodinu práce po prvej hodine. Platí od 2. hodiny.',
  travelCostPerKm: 'Cena za 1 km výjazdu. Počíta sa tam aj späť od odchodovej adresy k zákazníkovi.',
  rateCategory: 'Cenová kategória technika. Štandard = bežné opravy, Špeciál = špecializované práce (elektro, kúrenie), Kanalizácia = kanalizačné práce.',

  // Obchodné údaje
  ico: 'Identifikačné číslo osoby (IČO) — registračné číslo podnikateľa. Povinné pre fakturáciu.',
  dic: 'Daňové identifikačné číslo (DIČ). Pre CZ: zvyčajne CZ + rodné číslo alebo IČO.',
  icDph: 'Identifikačné číslo pre DPH. Vyplniť len ak je technik registrovaný platca DPH.',
  platcaDph: 'Ak je technik platcom DPH, faktúry musia obsahovať DPH. CZ sadzby: práca 12%, materiál 21%.',
  iban: 'Číslo bankového účtu vo formáte IBAN. Na tento účet bude odoslaná platba za vykonané zákazky.',
  bankAccount: 'Číslo účtu v lokálnom formáte (predčíslie-číslo/kód banky). Alternatíva k IBAN.',
  registration: 'Zápis v obchodnom registri alebo živnostenskom registri — pre právnické/fyzické osoby.',
  billingName: 'Fakturačný názov firmy alebo meno živnostníka. Toto meno sa zobrazí na faktúrach.',
  billingAddress: 'Fakturačná adresa podnikateľa — sídlo firmy alebo miesto podnikania.',

  // Profil
  firstName: 'Krstné meno technika. Zobrazuje sa v CRM a na faktúrach.',
  lastName: 'Priezvisko alebo názov firmy technika.',
  email: 'E-mailová adresa technika. Používa sa na zasielanie notifikácií a faktúr.',
  country: 'Krajina pôsobenia technika (SK alebo CZ). Určuje DPH sadzby a menu.',
  status: 'Stav spolupráce s technikom: Aktívny, Na skúšku, Pozastavený, Ukončený, Kandidát.',
  rating: 'Automaticky počítané hodnotenie na základe dokončených zákaziek a spätnej väzby klientov.',
  note: 'Interná poznámka viditeľná len pre operátorov. Technik ju nevidí.',

  // Dostupnosť
  availability: 'Prepínač dostupnosti. Ak je "Nedostupný", technikovi sa neponúkajú nové zákazky.',
  serviceRadius: 'Maximálna vzdialenosť (v km) od odchodovej adresy, na ktorú technik vycestuje. Zákazky mimo polomeru mu nebudú ponúkané.',
  workingHours: 'Pracovné hodiny technika pre každý deň v týždni. Zákazky sa plánujú len v rámci týchto hodín.',

  // Špecializácie
  specializations: 'Odborné zamerania technika (napr. Inštalatérstvo, Elektro, Kúrenie). Používajú sa na párovanie so zákazkami podľa kategórie.',
  brands: 'Značky spotrebičov, s ktorými má technik skúsenosť (napr. Vaillant, Junkers). Pomáha pri priraďovaní servisných zákaziek.',
  trades: 'Živnostenské oprávnenia technika. Dôležité pre overenie, či má technik licenciu na daný typ práce.',

  // Výjazdová adresa
  departureAddress: 'Adresa, odkiaľ technik vychádza na zákazky. Odtiaľto sa počítajú kilometre a cestovné.',
  gps: 'GPS súradnice technika. Aktualizujú sa automaticky z mobilnej aplikácie technika.',

  // Vozidlo
  vehicleType: 'Typ vozidla technika (osobné auto, dodávka, kombi). Ovplyvňuje aký materiál a náradie môže prevážať.',
  vehicleCapacity: 'Popis kapacity vozidla alebo doplňujúce info — napr. "3.5t dodávka s plošinou".',

  // Podpis
  signature: 'Digitálny podpis technika. Technik ho nakreslí v mobilnej aplikácii. Používa sa na protokoloch.',

  // Dokumenty
  documents: 'Dokumenty technika — živnostenský list, poistenie zodpovednosti, certifikáty. Sleduje sa dátum expirácie.',

  // Výjazdová adresa — detailné polia
  departureMesto: 'Mesto odchodovej adresy technika.',
  departurePsc: 'PSČ odchodovej adresy.',
  departureCountry: 'Krajina odchodovej adresy.',

  // Fakturačná adresa — detailné polia
  billingStreet: 'Ulica fakturačnej adresy.',
  billingMesto: 'Mesto fakturačnej adresy.',
  billingPsc: 'PSČ fakturačnej adresy.',
  billingCountry: 'Krajina fakturačnej adresy.',

  // Bankové údaje
  bankCode: 'Kód banky (napr. 0100 = Komerční banka, 0800 = Česká spořitelna).',

  // Externé registre
  govLink: 'Odkaz na záznam technika v ARES (CZ) alebo ORSR (SK) registri.',
}

/* ─── Admin page tooltips ─── */
export const ADMIN_PAGE_TOOLTIPS = {
  // Technician list columns
  techListStatus: 'Stav spolupráce: Aktívny (prijíma zákazky), Na skúšku, Pozastavený, Ukončený, Kandidát.',
  techListSpecializations: 'Odborné zamerania technika. Používajú sa na párovanie zákaziek s technikom.',
  techListRating: 'Automaticky počítané hodnotenie na základe zákaziek a spätnej väzby.',
  techListAvailability: 'Aktuálna dostupnosť — zelená = dostupný, sivá = nedostupný.',
  techListGps: 'Posledná známa GPS poloha technika z mobilnej aplikácie.',

  // New job form
  newJobPartner: 'Asistenčná spoločnosť, od ktorej zákazka prišla. Určuje cenové pravidlá a fakturáciu.',
  newJobCategory: 'Typ práce — napr. Inštalatérstvo, Elektro, Kúrenie. Používa sa na párovanie s technikom.',
  newJobUrgency: 'Urgentné zákazky majú prednosť — technik musí reagovať do 2 hodín.',
  newJobDescription: 'Popis problému od klienta alebo z objednávky poisťovne. Čím podrobnejší, tým lepšie priradenie technika.',
  newJobImportEmail: 'Vložte text objednávkového e-mailu — AI automaticky vyplní polia formulára.',
  newJobCoverageLimit: 'Maximálna suma, ktorú uhradí poisťovňa. Po prekročení platí zákazník doplatok.',
  newJobCoverageMaterial: 'Informácia, či poisťovňa kryje materiál (náhradné diely).',
  newJobCoverageTravel: 'Podmienky úhrady cestovného poisťovňou.',
  newJobScheduledDate: 'Dohodnutý dátum návštevy technika u zákazníka.',

  // Settings pages
  settingsAiFields: 'Definície AI polí — automaticky generované údaje pre zákazky na základe promptov.',
  settingsCriteria: 'Kritériá pre automatické párovanie technikov so zákazkami — váhy pre lokalitu, špecializáciu, hodnotenie.',
  settingsCustomFields: 'Vlastné polia, ktoré môžete pridať k zákazkám alebo technikom nad rámec štandardných.',
  settingsAutomations: 'Automatické pravidlá — keď sa stane udalosť (nová zákazka, zmena kroku), systém vykoná akciu (SMS, notifikácia, posun).',
  settingsSla: 'SLA pravidlá — nastavte follow-up časy a eskalácie pre každý krok zákazky. Automatická akcia pri prekročení deadlinu.',
  settingsSms: 'Texty SMS správ pre zákazníkov — upravte znenie, SK/CZ varianty, zapnite alebo vypnite šablóny.',
  settingsKnowledgeBase: 'Príručky, chybové kódy a postupy opráv — kontextové dáta pre diagnostický mozog.',
  settingsAiBrain: 'Konfigurácia AI Mozog — výber modelu, vlastné inštrukcie a znalostná databáza pre operátorského asistenta.',
  settingsVoicebot: 'Nastavenia AI telefónneho asistenta — systémové prompty, uvítacie správy, jazyk a scenáre.',
  settingsInvoices: 'Konfigurácia fakturácie — VS formáty, splatnosť, IBAN, DPH, šablóny poznámok a kategórie faktúr pre každého partnera.',
  settingsNotifications: 'Nastavenia notifikácií — kedy a komu sa posielajú upozornenia (SMS, push, e-mail).',
  settingsManual: 'Návod na používanie CRM systému pre operátorov.',
  settingsUi: 'Nastavenia vzhľadu CRM — téma, veľkosť písma, rozloženie dashboardu.',
  settingsLayout: 'Poradie panelov a sekcií na stránkach CRM. Uložte rozloženie ako šablónu alebo ho zdieľajte s tímom.',

  // AI Fields form
  aiFieldTrigger: 'Kedy sa AI pole automaticky vygeneruje: manuálne, pri zmene kroku zákazky, alebo pri jej vytvorení.',
  aiFieldOutputFormat: 'Formát výstupu AI: voľný text, číslo, výber z možností (label), alebo JSON štruktúra.',
  aiFieldModel: 'AI model použitý na generovanie. Rýchlejší (mini) je vhodný pre jednoduché polia, silnejší pre komplexné analýzy.',
  aiFieldTemperature: 'Miera kreativity AI (0 = deterministický, 1 = kreatívny). Pre faktické polia odporúčame 0.0–0.3.',
  aiFieldMaxTokens: 'Maximálny počet tokenov v odpovedi AI. Kratšie polia = nižší limit, dlhšie analýzy = vyšší.',
  aiFieldPromptTemplate: 'Šablóna výzvy pre AI. Použite premenné v zátvorkách (napr. {{job.description}}) na vloženie dát zákazky.',
  aiFieldDisplayLocation: 'Kde sa hodnota AI poľa zobrazí v CRM rozhraní — v paneli zákazky, detaile, profile technika alebo dashboarde.',

  // Criteria form
  criteriaPreset: 'Pomenovaná sada kritérií pre párovanie. Môžete mať rôzne presety pre rôzne typy zákaziek.',
  criteriaWeights: 'Váhy určujú, čo má väčší vplyv pri výbere technika: cena, hodnotenie, vzdialenosť alebo vyťaženosť.',
  criteriaAutoNotify: 'Automatické odoslanie ponuky technikom, ktorí spĺňajú kritériá, bez zásahu operátora.',
  criteriaFallback: 'Ak žiadny technik nespĺňa kritériá, systém ihneď rozošle ponuku aj technikom s nižšou prioritou.',

  // Custom fields form
  customFieldType: 'Typ dátového poľa: text, číslo, dátum, výber z možností a pod. Určuje ako sa pole zobrazí a validuje.',
  customFieldRequired: 'Povinné pole musí byť vyplnené pri uložení zákazky alebo profilu.',
  customFieldEntity: 'Na ktorý formulár sa pole pridá: Zákazky, Technici alebo Partneri.',
  customFieldName: 'Interný názov vlastného poľa. Zobrazuje sa v CRM ako label.',
  customFieldOptions: 'Zoznam možností pre pole typu "výber". Oddeľte čiarkou.',
  customFieldPlaceholder: 'Ukážkový text v prázdnom poli — pomáha operátorovi vedieť čo vyplniť.',

  // New job form — email import fields
  newJobEmailSubject: 'Predmet pôvodného objednávkového e-mailu. Pomáha AI pri extrakcii údajov.',
  newJobEmailText: 'Vložte celý text objednávkového e-mailu od poisťovne. AI z neho automaticky vyplní formulár.',

  // New job form — basic fields
  newJobReferenceNumber: 'Referenčné číslo zákazky. Ak nevyplníte, systém ho vygeneruje automaticky.',
  newJobPartnerOrderId: 'Číslo zákazky v systéme poisťovne — z objednávkového e-mailu.',

  // New job form — customer fields
  newJobCustomerName: 'Meno zákazníka z objednávky.',
  newJobCustomerPhone: 'Kontaktný telefón zákazníka.',
  newJobCustomerEmail: 'E-mail zákazníka.',
  newJobCustomerAddress: 'Adresa miesta výkonu práce.',
  newJobCustomerCity: 'Mesto zákazníka.',
  newJobCustomerPsc: 'Poštové smerovacie číslo.',
  newJobCustomerCountry: 'Krajina zákazníka — určuje menu a DPH.',

  // New job form — schedule fields
  newJobScheduledTime: 'Plánovaný čas návštevy technika.',
  newJobDueDate: 'Deadline zákazky — do kedy musí byť dokončená podľa SLA.',

  // New job form — coverage fields
  newJobExtraCondition: 'Špeciálna podmienka poisťovne — obmedzenia alebo výnimky.',

  // Criteria settings — criterion form fields
  criteriaCriterionType: 'Typ podmienky: vzdialenosť, špecializácia, hodnotenie, alebo vlastné pole.',
  criteriaDispatchRadius: 'Maximálna vzdialenosť od zákazníka, v rámci ktorej hľadáme technikov.',
  criteriaGpsRadius: 'Maximálna vzdialenosť od zákazníka, v rámci ktorej hľadáme technikov (GPS blízkosť).',
  criteriaGpsMaxAge: 'Ako staré GPS údaje technika ešte akceptujeme. Staršie sa považujú za nespoľahlivé.',
}

/* ─── Job list page tooltips ─── */
export const JOB_LIST_TOOLTIPS = {
  // Column headers
  colReferenceNumber: 'Interné číslo zákazky v systéme (HM-RRRR-XXXXX). Kliknutím otvoríte detail zákazky.',
  colStatus: 'Aktuálny krok zákazky v CRM pipeline — od Príjmu až po Uzavreté.',
  colFollowUp: 'Odporúčaná ďalšia akcia pre zákazku — systém automaticky navrhuje čo urobiť.',
  colPartner: 'Asistenčná spoločnosť (poisťovňa), ktorá zákazku zaslala.',
  colCategory: 'Typ práce — napr. Inštalatérstvo, Elektro, Kúrenie, Zámočníctvo.',
  colCustomerName: 'Meno zákazníka z objednávky poisťovne.',
  colAssignedTo: 'Priradený technik. Ak je prázdne, zákazka ešte nemá technika.',
  colUrgency: 'Urgentné zákazky majú prednosť — technik musí reagovať do 2 hodín.',
  colPriority: 'Priorita zákazky: VIP, eskalovaná, sťažnosť. Zvýraznené vlajkou.',
  colCity: 'Mesto zákazníka — kde sa nachádza miesto výkonu práce.',
  colCreatedAt: 'Dátum a čas vytvorenia zákazky v systéme.',
  colScheduledDate: 'Dohodnutý dátum návštevy technika u zákazníka.',
  colDueDate: 'Deadline zákazky — do kedy musí byť dokončená podľa SLA poisťovne.',

  // Filters
  filterStatus: 'Filtrovať zákazky podľa kroku v pipeline. Viacnásobný výber.',
  filterPartner: 'Filtrovať podľa poisťovne / asistenčnej spoločnosti.',
  filterScheduledDate: 'Filtrovať zákazky podľa dohodnutého dátumu návštevy.',
  filterCreatedAt: 'Filtrovať zákazky podľa dátumu ich vytvorenia v systéme.',
  filterAdvanced: 'Rozšírený filter — kombinácia podmienok podľa ľubovoľného poľa (stav, partner, kategória, technik a pod.).',

  // View modes
  viewList: 'Zákazky zobrazené ako tabuľka s konfigurovateľnými stĺpcami.',
  viewBoard: 'Kanban board — zákazky ako karty rozdelené podľa krokov pipeline.',

  // Scenario quick filters
  quickFilters: 'Rýchle filtre — jedným kliknutím zobrazíte zákazky podľa typickej situácie.',
  quickUnassigned: 'Zákazky bez prideleného technika — treba ich čo najskôr obsadiť.',
  quickOverdue: 'Zákazky, ktoré prekročili deadline podľa SLA poisťovne.',
  quickWaitingApproval: 'Zákazky čakajúce na schválenie odhadu alebo doplatku klientom.',
  quickToday: 'Zákazky s naplánovanou návštevou na dnešný deň.',
  quickFollowup: 'Zákazky, kde bol prekročený odporúčaný termín ďalšej akcie.',

  // Group by
  groupBy: 'Zoskupiť zákazky do sekcií podľa zvoleného poľa — napr. podľa stavu, partnera alebo technika.',

  // Column config
  columnConfig: 'Vyberte, ktoré stĺpce sa zobrazia v tabuľke. Zaškrtnutím zapnete / vypnete stĺpec.',
}

/* ─── Chat page tooltips ─── */
export const CHAT_TOOLTIPS = {
  // Conversation list — filter tabs
  filterAll: 'Zobrazí všetky workspaces — aktívne, AI monitorované aj vyriešené.',
  filterMine: 'Len workspaces, ktoré ste si prevzali — kde ste priradený operátor.',
  filterNeedsAction: 'Workspaces, kde AI odovzdala riešenie operátorovi alebo kde je vysoká priorita. Tieto treba riešiť prednostne.',
  filterAi: 'Workspaces, kde AI aktívne komunikuje s klientom alebo technikom bez zásahu operátora.',

  // Conversation list — sections
  sectionPinned: 'Pripnuté workspaces — pracovné prípady, na ktoré sa chcete rýchlo vrátiť. Kliknite na ikonu špendlíka na pripnutie.',
  sectionNeedsAction: 'Workspaces čakajúce na zásah operátora — AI nevie pokračovať alebo si klient vyžiadal živého operátora.',
  sectionMine: 'Vaše prevzaté konverzácie — ste priradený operátor a práve ich riešite.',
  sectionRecent: 'Nedávne workspaces — AI aktívne rieši alebo iný operátor prevzal.',
  sectionDone: 'Vyriešené workspaces — zákazka uzavretá alebo konverzácia ukončená.',

  // Conversation item — badges
  workspaceState: 'Stav workspacu: "AI rieši" = chatbot komunikuje sám, "Čaká na operátora" = treba váš zásah, "Moje aktívne" = prevzaté vami, "Vrátené AI" = operátor vrátil na AI, "Vyriešené" = uzavreté.',
  operatorPriority: 'Priorita workspacu pre operátora: Vysoká = klientova sťažnosť alebo technik zablokovaný na mieste, Stredná = bežný handoff od AI.',
  unreadDot: 'Červená bodka = nová správa od klienta alebo technika, ktorú ste ešte nevideli.',

  // Chat thread — message view filter
  messageViewAll: 'Zobrazí všetky správy — od klienta, technika aj systémové udalosti v jednej timeline.',
  messageViewClient: 'Len správy medzi klientom a operátorom — kanál "Klient ↔ Operátor".',
  messageViewTechnician: 'Len správy medzi technikom a operátorom — kanál "Technik ↔ Operátor".',

  // Chat thread — channel label on individual messages
  messageChannel: 'Kanál správy označuje, kto s kým komunikuje: "Klient ↔ Operátor" = portál klienta, "Technik ↔ Operátor" = dispatch app technika, "Klient ↔ Technik" = priama komunikácia na mieste.',

  // Chat thread — workspace state badge in header
  workspaceStateBadge: 'Aktuálny stav workspacu. "Vyžaduje zásah" = AI odovzdala konverzáciu a čaká na vás. "AI aktívna" = chatbot komunikuje sám. "Operátor aktívny" = vy alebo kolega to riešite.',

  // Chat thread — handoff / AI suggested reply
  aiSuggestedReply: 'Navrhovaná odpoveď od AI na základe kontextu zákazky a histórie konverzácie. Môžete ju použiť priamo, upraviť alebo ignorovať.',
  approvalRequest: 'AI pripravila odpoveď alebo akciu a čaká na vaše schválenie pred odoslaním klientovi alebo technikovi. Skontrolujte obsah a schváľte alebo požiadajte o úpravu.',

  // Chat thread — thread layout toggle
  threadLayoutUnified: 'Zjednotená timeline — všetky správy (klient + technik) v jednom stĺpci zoradené podľa času.',
  threadLayoutSplit: 'Rozdelené zobrazenie — klient vľavo, technik vpravo. Vhodné pre súčasné sledovanie oboch kanálov.',

  // Direct chat
  directChatHeader: 'Priama komunikácia s technikom — mimo konkrétnej zákazky. Vhodné pre organizačné správy, upozornenia a koordináciu.',

  // Command palette (ChatCommandPalette)
  commandPaletteHint: 'Rýchly prístup ku všetkým workspaces a kontaktom. Napíšte meno klienta, technika, číslo zákazky alebo telefón. Stlačte Enter pre otvorenie prvého výsledku.',
  commandPaletteDirectChat: 'Začať priamy chat s technikom — nezávislý od zákazky. "Apka" = technik má aktívne push notifikácie, "SMS" = správa príde cez SMS.',

  // Help chat (AI Mozog floating button)
  helpChatButton: 'AI Mozog — interný asistent pre operátorov. Odpovedá na otázky o systéme, zákazkách a procesoch. Zobrazí rýchly prehľad aktuálnej stránky a kritické body.',
  helpChatSuggestions: 'Navrhované ďalšie kroky od AI — kliknite na krok pre rýchlu navigáciu na príslušnú sekciu.',
}

/* ─── Job detail page tooltips ─── */
export const JOB_DETAIL_TOOLTIPS = {
  // Identifikácia
  referenceNumber: 'Interné číslo zákazky v systéme Zlatí Řemeslníci (HM-RRRR-XXXXX). Citujte pri komunikácii s poisťovňou.',
  partnerOrderId: 'Číslo zákazky v systéme poisťovne — z objednávkového e-mailu. Slúži na párovanie s poisťovňou.',
  insuranceCompany: 'Asistenčná spoločnosť, ktorá zákazku zaslala. Určuje cenové pravidlá, limity a podmienky.',
  country: 'Krajina zákazníka. Určuje menu (Kč / €) a DPH sadzby.',
  category: 'Typ práce — napr. Inštalatérstvo, Elektro, Kúrenie. Používa sa na párovanie s technikom.',
  urgency: 'Urgentné zákazky majú prednosť — technik musí reagovať do 2 hodín. Normálne čakajú na plánovaný termín.',
  vip: 'VIP zákazky majú prioritné spracovanie a zvýšenú pozornosť.',
  description: 'Popis problému od klienta alebo z objednávky poisťovne. Čím podrobnejší, tým presnejšie priradenie technika.',

  // Poistné krytie
  coverageLimit: 'Maximálna suma, ktorú uhradí poisťovňa za celú zákazku (práca + cestovné + materiál). Po prekročení platí zákazník doplatok.',
  coverageMaterial: 'Informácia o krytí materiálu poisťovňou. Ak nekryje, materiál platí zákazník.',
  coverageTravel: 'Podmienky úhrady cestovného. Niektoré poisťovne hradia nad rámec limitu, iné počítajú do limitu.',
  coverageExtraCondition: 'Špeciálna podmienka poisťovne — napr. "max 2 hodiny práce" alebo "bez víkendového príplatku".',

  // Zákazník
  customerName: 'Meno zákazníka z objednávky poisťovne.',
  customerPhone: 'Kontaktný telefón zákazníka. Kliknutím vytočíte hovor.',
  customerEmail: 'E-mail zákazníka. Používa sa na zasielanie protokolov a notifikácií.',
  customerAddress: 'Adresa miesta výkonu práce — kam technik príde.',
  customerCity: 'Mesto zákazníka.',
  customerPsc: 'Poštové smerovacie číslo miesta výkonu práce.',
  customerGps: 'GPS súradnice zákazníka. Kliknutím otvoríte Google Maps.',

  // Technik
  scheduledDate: 'Dohodnutý dátum a čas návštevy technika u zákazníka.',
  acceptedByTech: 'Dátum a čas, kedy technik prijal zákazku v mobilnej aplikácii.',
  techPhase: 'Aktuálna fáza práce technika — od prijatia cez diagnostiku až po odchod z miesta.',
  submittedAt: 'Kedy technik naposledy odoslal aktualizáciu (odhad, protokol, fotky).',

  // Cenový odhad
  estimateHours: 'Odhadovaný počet hodín práce. 1. hodina je drahšia (pokrýva príjazd a diagnostiku).',
  estimateKm: 'Vzdialenosť výjazdu v kilometroch (tam a späť). Počíta sa z odchodovej adresy technika.',
  estimateVisits: 'Plánovaný počet návštev u zákazníka. Každý výjazd sa zúčtováva osobitne.',
  estimateMaterial: 'Celkový odhadovaný náklad na materiál (náhradné diely, spotrebný materiál).',

  // Sub-stavy
  pricingStatus: 'Stav cenotvorby: Čaká na odhad → Odhad odoslaný → Schválený → Zúčtovaný.',
  eaStatus: 'Stav EA odhlášky (len Europ Assistance). EA vyžaduje telefonické uzavretie zákazky.',
  paymentStatus: 'Stav platby technikovi: Nespracovaná → V dávke → Odoslaná → Uhradená.',
  partsStatus: 'Stav náhradných dielov: Na sklade → Objednané → Dodané → Namontované.',

  // Checklist technika
  checkAccepted: 'Technik prijal zákazku v mobilnej aplikácii.',
  checkArrived: 'Technik dorazil na miesto k zákazníkovi.',
  checkDiagnostics: 'Technik dokončil diagnostiku a vie aký je problém.',
  checkEstimate: 'Technik odoslal cenový odhad (hodiny, km, materiál).',
  checkEstimateApproved: 'Cenový odhad bol schválený (operátorom alebo automaticky).',
  checkSurchargeSent: 'Klientovi bola zaslaná žiadosť o schválenie doplatku.',
  checkClientApproved: 'Klient schválil doplatok cez klientský portál.',
  checkClientDeclined: 'Klient zamietol doplatok — zákazka vyžaduje riešenie.',
  checkWorkStarted: 'Technik začal opravu / prácu na mieste.',
  checkPhotos: 'Technik nahrál fotodokumentáciu (pred / počas / po).',
  checkProtocol: 'Technik odoslal pracovný protokol s podpisom klienta.',
  checkProtocolSigned: 'Klient podpísal protokol na mieste.',
  checkInvoice: 'Technik vystavil faktúru za vykonanú prácu.',
  checkPaid: 'Technikovi bola uhradená odmena na bankový účet.',

  // Ďalšia návšteva
  nextVisitReason: 'Dôvod prečo je potrebná ďalšia návšteva — napr. čakanie na náhradný diel.',
  nextVisitDate: 'Plánovaný dátum ďalšej návštevy technika.',
  materialPurchaseHours: 'Hodiny strávené nákupom materiálu — zúčtovávajú sa osobitne.',
  materialDeliveryDate: 'Očakávaný dátum dodania objednaného materiálu.',

  // Pipeline
  pipelinePrijem: 'Nová zákazka — ešte nespracovaná. Operátor ju musí skontrolovať a doplniť údaje.',
  pipelineDispatching: 'Hľadá sa vhodný technik — zákazka čaká na priradenie alebo prijatie technikom.',
  pipelineNaplanovane: 'Technik je priradený a termín je dohodnutý. Čaká sa na deň výjazdu.',
  pipelineNaMieste: 'Technik je na mieste u zákazníka — prebieha diagnostika alebo práca.',
  pipelineSchvalovanie: 'Cenový odhad čaká na schválenie. Ak presahuje limit, klient musí schváliť doplatok.',
  pipelinePonukaKlient: 'Klient bol požiadaný o schválenie doplatku cez portál.',
  pipelineDokoncene: 'Technik dokončil prácu a odoslal protokol. Čaká na zúčtovanie.',
  pipelineZuctovanie: 'Porovnanie odhadu so skutočnosťou. Kontrola cien a materiálu.',
  pipelineCenovaKontrola: 'Finálna kontrola cien pred fakturáciou. Overenie marže a limitov.',
  pipelineEaOdhlaska: 'Europ Assistance odhláška — telefonické uzavretie zákazky u EA.',
  pipelineFakturacia: 'Vystavenie faktúry poisťovni za vykonanú prácu.',
  pipelineUhradene: 'Faktúra bola uhradená poisťovňou. Čaká na uzavretie zákazky.',
  pipelineUzavrete: 'Zákazka je kompletne uzavretá — všetky platby vykonané.',

  // Fakturácia
  invoiceNumber: 'Číslo vystavenej faktúry pre poisťovňu.',
  invoiceIssueDate: 'Dátum vystavenia faktúry.',
  invoiceDueDate: 'Dátum splatnosti faktúry.',
  invoicePaidDate: 'Dátum, kedy poisťovňa faktúru uhradila.',

  // Hodnotenie
  clientRating: 'Hodnotenie služby od klienta (1–5 hviezdičiek). Vyplňuje klient cez portál po dokončení.',

  // Follow-up
  followUp: 'Systém automaticky navrhuje ďalší krok na základe aktuálneho stavu zákazky a času.',

  // Pôvodná objednávka
  originalOrderEmail: 'Pôvodný text objednávkového e-mailu od poisťovne. Slúži ako referencia.',

  // AI validácia
  aiValidation: 'AI automaticky kontroluje zákazku — hľadá anomálie, nesúlad cien, neobvyklé vzory.',

  // EA Odhlaska (dodatočné)
  eaSubmittedAt: 'Dátum a čas odoslania EA odhlášky.',
  eaDocuments: 'Dokumenty priložené k EA odhláške — protokoly, fotky, potvrdenia.',

  // Platba technikovi
  paymentStatusLabel: 'Aktuálny stav platby technikovi: Nespracovaná → V dávke → Odoslaná → Uhradená.',
  paymentBatchId: 'Identifikátor platobnej dávky, v ktorej je platba zaradená.',
  paymentAmount: 'Schválená suma na úhradu technikovi za túto zákazku.',
  paymentBatchPeriod: 'Obdobie platobnej dávky — mesiac, za ktorý sa platby spracovávajú.',

  // AI Validácia (ORACLE)
  aiOracle: 'AI automatická kontrola zákazky — hodnotí súlad cien, neobvyklé vzory a potenciálne problémy.',
  aiAnomalies: 'Zoznam anomálií, ktoré AI detegovala — nezvyčajne vysoké ceny, neobvyklý počet hodín a pod.',

  // Fakturácia Partnerovi
  invoiceVS: 'Variabilný symbol pre identifikáciu platby v bankovom výpise.',
  invoiceDuzp: 'Dátum uskutočnenia zdaniteľného plnenia — zvyčajne dátum dokončenia práce.',
  invoiceStatus: 'Stav faktúry: Vystavená → Odoslaná → Uhradená.',

  // Technik
  techNote: 'Poznámka, ktorú technik pridal k odhadu alebo protokolu.',
  assignTechnician: 'Vybrať alebo zmeniť technika priradeného k zákazke.',

  // Right sidebar sections
  protokoly: 'Zoznam odoslaných pracovných protokolov k tejto zákazke. Každá návšteva môže mať vlastný protokol.',
  fakturyTechnika: 'Faktúra, ktorú technik vystavil za vykonanú prácu. Ukladá sa po nahraní alebo automatickom vygenerovaní.',
  fakturaciaSection: 'Fakturačné dáta zákazky — číslo faktúry pre poisťovňu, dátumy vystavenia, splatnosti a úhrady.',

  // Cenová sekcia
  pricingSectionHeader: 'Cenová kalkulácia zákazky — tri pohľady: Technik (čo dostane), Zákazník (čo zaplatí), Partner (čo fakturujeme poisťovni). Marža ZR je rozdiel medzi fakturáciou partnerovi a platbou technikovi.',
  surchargeAlertHeader: 'Doplatok klienta (suma nad limit poisťovne) sa po odoslaní protokolu zvýšil oproti pôvodnému odhadu. Skontrolujte, či je zmena odôvodnená reálnym rozsahom práce.',
  surchargePhaseA: 'Doplatok klienta vypočítaný na základe odhadu technika (fáza A) — pred odoslaním protokolu.',
  surchargePhaseB: 'Doplatok klienta vypočítaný po odoslaní protokolu so skutočnými hodinami a materiálom (fáza B).',
}
