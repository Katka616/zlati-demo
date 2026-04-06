/**
 * Portal locale – CZ/SK texty podľa customer_country
 *
 * CZ = Česká republika (čeština)
 * SK = Slovensko (slovenčina)
 *
 * Pokiaľ country nie je rozpoznaný, fallback = CZ (väčšina zákaziek)
 */

export type PortalLang = 'cz' | 'sk' | 'en'

export function resolvePortalLang(country: string | null | undefined): PortalLang {
  if (country?.toUpperCase() === 'SK') return 'sk'
  return 'cz' // default pre CZ aj neznáme
}

/** Krátke labely pre language picker */
export const LANG_OPTIONS: { value: PortalLang; label: string; flag: string }[] = [
  { value: 'cz', label: 'Čeština', flag: '🇨🇿' },
  { value: 'sk', label: 'Slovenčina', flag: '🇸🇰' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
]

// ─── Texty ──────────────────────────────────────

interface PortalTexts {
  // Mena
  currency: string
  formatPrice: (amount: number) => string

  // Progress bar
  progressDiagnostic: string
  progressTechnician: string
  progressScheduleConfirmation: string
  progressRepair: string
  progressSurcharge: string
  progressProtocol: string
  progressRating: string

  // Phase 1 – Diagnostika
  phase1Title: string
  emailLabel: string
  emailPlaceholder: string
  emailHint: string
  addressLabel: string
  problemLabel: string
  extraDescLabel: string
  extraDescPlaceholder: string
  photoLabel: string
  photoSlots: string[]
  photosUploaded: (count: number, total: number) => string
  selectDateLabel: string
  submitDiagnostic: string
  diagnosticSentTitle: string
  diagnosticSentText: string
  selectDateError: string

  // Phase 2 – Technik
  phase2Title: string
  dateLabel: string
  timeLabel: string
  techConfirmed: string

  // Phase 3 – Oprava
  phase3Title: string
  timelineEnRoute: string
  timelineArrived: string
  timelineDiagnostics: string
  timelineWorking: string
  timelineFinishing: string
  timelineDone: string
  timelineNow: string
  nextVisitLabel: string
  materialDeliveryLabel: string

  // Phase 4 – Doplatok
  phase4Title: string
  coveredByInsurance: string
  beyondInsurance: string
  totalLabel: string
  yourSurcharge: string
  surchargeNote: string
  approveBtn: string
  rejectBtn: string
  rejectConfirmText: string
  rejectBackBtn: string
  rejectConfirmBtn: string
  surchargeApprovedTitle: string
  surchargeApprovedText: string
  surchargeRejectedTitle: string
  surchargeRejectedText: string
  // Price breakdown (cenová ponuka)
  priceQuoteTitle: string
  laborAndTravelCovered: string
  laborSection: string
  hoursLabel: string
  rateLabel: string
  travelSection: string
  kmLabel: string
  visitsLabel: string
  materialSection: string
  vatLabel: string
  subtotalLabel: string
  coverageDeductionLabel: string
  discountLabel: string
  clientDoplatokLabel: string
  generatedLabel: string

  // Phase 5 – Protokol
  phase5Title: string
  emailBannerTitle: string
  emailBannerText: string
  emailBannerSave: string
  emailSentTo: (email: string) => string
  emailSavedToast: string
  emailInvalidToast: string
  protocolJobHeading: string
  protocolNumberLabel: string
  protocolTypeLabel: string
  protocolAddressLabel: string
  protocolInsuranceLabel: string
  protocolVisitsHeading: string
  protocolVisitNumber: string
  protocolVisitsDate: string
  protocolVisitsArrival: string
  protocolVisitsDeparture: string
  protocolVisitsHours: string
  protocolVisitsMaterialHours: string
  protocolVisitsKm: string
  protocolWorkHeading: string
  protocolMaterialHeading: string
  protocolMaterialName: string
  protocolMaterialQty: string
  protocolMaterialPrice: string
  protocolMaterialPayer: string
  protocolMaterialTotal: (amount: string) => string
  protocolPhotosHeading: string
  protocolSummaryHeading: string
  protocolTotalHours: string
  protocolTotalKm: string
  protocolTotalMaterial: string
  protocolTechLabel: string
  protocolTechSigHeading: string
  protocolClientSigHeading: string
  protocolClientSigNote: string
  protocolClientNoteLabel: string
  protocolClientNotePlaceholder: string
  protocolSignerNameLabel: string
  protocolSignerNamePlaceholder: string
  protocolSignPlaceholder: string
  protocolClearBtn: string
  protocolConfirmSigBtn: string
  protocolSubmitBtn: string
  protocolSignedTitle: string
  protocolSignedText: (email: string) => string
  protocolSignedNoEmail: string
  downloadSignedProtocol: string
  protocolSignErrorNoSig: string
  protocolSignErrorNoName: string

  // Phase 6 – Hodnotenie
  phase6Title: string
  ratingQuestion: string
  ratingLabels: string[]
  feedbackLabel: string
  feedbackPlaceholder: string
  submitRating: string
  ratingThanksTitle: string
  ratingThanksText: (refNumber: string) => string
  ratingError: string

  // Closed
  closedTitle: string
  closedText: (refNumber: string) => string

  // Technician contact
  callTech: string
  messageTech: string
  contactSupport: string

  // Chat
  chatTitle: string
  chatPlaceholder: string
  chatSend: string
  chatEmpty: string
  chatOperator: string
  chatSystem: string
  chatYou: string
  chatSentToast: string
  chatGreeting: string
  chatOfflineNote: string

  // Diagnostic form – Step 1
  diagClientTypeLabel: string
  diagClientTypePrivate: string
  diagClientTypeCompany: string
  diagClientTypeSvj: string
  diagPropertyFlat: string
  diagPropertyHouse: string
  diagPropertyCommercial: string
  diagPropertyCommonAreas: string
  diagClientTypeRequired: string
  diagPropertyRequired: string
  diagNameRequired: string
  diagStreetRequired: string
  diagCityRequired: string
  diagZipRequired: string
  diagPhoneRequired: string
  diagEmailInvalid: string
  diagFaultRequired: string
  diagProblemRequired: string
  diagDateRequired: string
  diagConsentRequired: string
  diagSubmitFailed: string

  // Issue status check
  issueStillActiveTitle: string
  issueStillActiveQuestion: string
  issueStillActiveYes: string
  issueStillActiveNo: string
  issueResolvedConfirmTitle: string
  issueResolvedConfirmText: string
  issueResolvedConfirmBtn: string
  issueResolvedBackBtn: string
  issueResolvedReasonLabel: string
  issueResolvedReasonPlaceholder: string
  issueResolvedThankYou: string

  // FAQ & Help
  faqTitle: string
  faqSearch: string
  faqRelevant: string
  faqContactSupport: string
  nextStepTitle: string
  nextStepDismiss: string
  hintClose: string
  hintSurchargeWarning: string
  hintSignatureHelp: string
  hintTimelineExplain: string

  // Errors
  invalidLink: string
  jobNotFound: string
  checkSmsLink: string

  // Errors (shared)
  errorGeneric: string
  errorNetwork: string
  errorSending: string
  errorSignFirst: string
  errorRating: string

  // Date locale
  dateLocale: string

  // Schedule confirmation
  schedTitle: string
  schedApprovedTitle: string
  schedApprovedText: string
  schedRejectedTitle: string
  schedRejectedText: string
  schedProposedLabel: string
  schedApproveBtn: string
  schedProposeAltBtn: string
  schedAltQuestion: string
  schedAltPlaceholder: string
  schedAltLabel: string
  schedTimeOptional: string
  schedAllDay: string
  schedBackBtn: string
  schedRejectBtn: string
  schedYourTech: string

  // Counter proposal
  counterTitle: string
  counterDesc: string
  counterPreferred: string
  counterAlt: (n: number) => string
  counterDate: string
  counterTime: string
  counterMessage: string
  counterMessagePlaceholder: string
  counterAddSlot: string
  counterSubmitBtn: string
  counterSubmitting: string
  submitting: string
  diagSubmitBtn: string
  counterSuccessTitle: string
  counterSuccessText: string
  counterMinOneSlot: string
  counterFillBoth: (n: number) => string
  counterInvalidDate: (n: number) => string
  counterMinTwoHours: (n: number) => string
  counterDuplicates: string
  counterSendError: string

  // Price quote details (ClientPriceQuote component)
  emergencySurchargeSection: string
  emergencySurchargeLabel: string
  travelCoveredLabel: string
  travelCoveredBadge: string
  materialTypeDM: string
  materialTypeND: string
  materialTypeM: string
  materialTypeOther: string
  subtotalBeforeVatLabel: string
  grandTotalLabel: string
  coverageLabel: string
  doplatokNote: string
  materialClientPays?: string

  // Documents (Phase 7 closed)
  docsAvailable: string
  downloadAllDocs: string

  // Documents section (always visible)
  docsSectionTitle: string
  docsProtocol: (n: number) => string
  docsProtocolSigned: string
  docsPhotos: (n: number) => string
  docsQuote: string
  docsDownloadPdf: string
  docsDownloadZip: string
  docsDownloadAll: string
  docsNone: string
}

// ─── CZ texty ──────────────────────────────────

const CZ: PortalTexts = {
  currency: 'Kč',
  formatPrice: (amount) => `${amount.toLocaleString('cs-CZ')} Kč`,

  progressDiagnostic: 'Diagnostika',
  progressTechnician: 'Technik',
  progressScheduleConfirmation: 'Potvrzení termínu',
  progressRepair: 'Oprava',
  progressSurcharge: 'Doplatek',
  progressProtocol: 'Protokol',
  progressRating: 'Hodnocení',

  phase1Title: '📋 Diagnostický formulář',
  emailLabel: 'E-mailová adresa',
  emailPlaceholder: 'vas@email.cz',
  emailHint: 'Pro zaslání protokolu e-mailem',
  addressLabel: '📍 Adresa',
  problemLabel: '📝 Popis problému',
  extraDescLabel: 'Doplňte popis (volitelné)',
  extraDescPlaceholder: 'Další detaily o problému...',
  photoLabel: 'Fotodokumentace',
  photoSlots: ['Fotka problému', 'Jiný úhel', 'Detail', 'Celkový pohled'],
  photosUploaded: (count, total) => `${count}/${total} fotek nahráno`,
  selectDateLabel: 'Vyberte termín opravy',
  submitDiagnostic: 'Odeslat diagnostiku',
  diagnosticSentTitle: 'Diagnostika odeslána',
  diagnosticSentText: 'Děkujeme! Hledáme pro vás nejlepšího technika. Budeme vás informovat o přidělení.',
  selectDateError: 'Vyberte prosím termín opravy',

  phase2Title: 'Váš technik',
  dateLabel: '📅 Termín',
  timeLabel: '🕐 Čas',
  techConfirmed: 'Váš technik je potvrzen',

  phase3Title: 'Průběh opravy',
  timelineEnRoute: 'Technik je na cestě',
  timelineArrived: 'Technik dorazil',
  timelineDiagnostics: 'Probíhá diagnostika',
  timelineWorking: 'Probíhá oprava',
  timelineFinishing: 'Dokončování',
  timelineDone: 'Oprava dokončena',
  timelineNow: 'Právě teď',
  nextVisitLabel: 'Předpokládaný termín další návštěvy',
  materialDeliveryLabel: 'Předpokládané dodání materiálu',

  phase4Title: '💰 Doplatek nad rámec asistenčního krytí',
  coveredByInsurance: 'Pokryto asistenční společností',
  beyondInsurance: 'Nad rámec krytí',
  totalLabel: 'Celkem',
  yourSurcharge: 'Váš doplatek',
  surchargeNote: 'Částka nad rámec asistenčního krytí',
  approveBtn: '✅ Souhlasím s doplatkem',
  rejectBtn: '❌ Nesouhlasím',
  rejectConfirmText: 'Opravdu chcete odmítnout? Oprava může být pozastavena.',
  rejectBackBtn: 'Zpět',
  rejectConfirmBtn: 'Potvrdit odmítnutí',
  surchargeApprovedTitle: 'Doplatek schválen',
  surchargeApprovedText: 'Děkujeme! Technik pokračuje v opravě.',
  surchargeRejectedTitle: 'Doplatek odmítnut',
  surchargeRejectedText: 'Vaše rozhodnutí bylo zaznamenáno. Budeme vás kontaktovat.',
  priceQuoteTitle: 'Cenová nabídka',
  laborAndTravelCovered: 'Práce a cestovné jsou hrazeny pojišťovnou',
  laborSection: 'Práce',
  hoursLabel: 'hod.',
  rateLabel: 'sazba',
  travelSection: 'Výjezdy',
  kmLabel: 'km',
  visitsLabel: 'výjezd',
  materialSection: 'Materiál',
  vatLabel: 'DPH',
  subtotalLabel: 'Mezisoučet',
  coverageDeductionLabel: 'Pokryto asistenční společností',
  discountLabel: 'Sleva',
  clientDoplatokLabel: 'Váš doplatek',
  generatedLabel: 'Nabídka vystavena',

  phase5Title: '📄 Protokol opravy',
  emailBannerTitle: 'Chcete dostat protokol e-mailem?',
  emailBannerText: 'Doplňte e-mailovou adresu pro zaslání kopie protokolu.',
  emailBannerSave: 'Uložit',
  emailSentTo: (email) => `Protokol bude zaslán na ${email}`,
  emailSavedToast: 'E-mail uložen ✅',
  emailInvalidToast: 'Zadejte platnou e-mailovou adresu',
  protocolJobHeading: 'Zakázka',
  protocolNumberLabel: 'Číslo',
  protocolTypeLabel: 'Typ opravy',
  protocolAddressLabel: 'Adresa',
  protocolInsuranceLabel: 'Asistenční společnost',
  protocolVisitsHeading: 'Návštěvy',
  protocolVisitNumber: 'Výjezd č.',
  protocolVisitsDate: 'Datum',
  protocolVisitsArrival: 'Příjezd',
  protocolVisitsDeparture: 'Odjezd',
  protocolVisitsHours: 'Hodiny',
  protocolVisitsMaterialHours: 'Nákup materiálu',
  protocolVisitsKm: 'Km',
  protocolWorkHeading: 'Popis provedené práce',
  protocolMaterialHeading: 'Materiál',
  protocolMaterialName: 'Název',
  protocolMaterialQty: 'Mn.',
  protocolMaterialPrice: 'Cena s DPH',
  protocolMaterialPayer: 'Hradí',
  protocolMaterialTotal: (amount) => `Celkem materiál: ${amount}`,
  protocolPhotosHeading: 'Fotodokumentace',
  protocolSummaryHeading: 'Sumarizace',
  protocolTotalHours: 'Celkové hodiny',
  protocolTotalKm: 'Celkové km',
  protocolTotalMaterial: 'Materiál celkem',
  protocolTechLabel: 'Technik',
  protocolTechSigHeading: 'Podpis technika',
  protocolClientSigHeading: 'Podpis klienta',
  protocolClientSigNote: 'Svým podpisem potvrzuji převzetí opravy a souhlasím s rozsahem provedených prací.',
  protocolClientNoteLabel: 'Poznámka klienta',
  protocolClientNotePlaceholder: 'Vaše připomínky k provedené práci (nepovinné)...',
  protocolSignerNameLabel: 'Jméno podepisujícího',
  protocolSignerNamePlaceholder: 'Jméno a příjmení',
  protocolSignPlaceholder: '✍️ Klikněte a podepište se',
  protocolClearBtn: 'Smazat',
  protocolConfirmSigBtn: 'Potvrdit podpis',
  protocolSubmitBtn: '✅ Podepsat a potvrdit protokol',
  protocolSignedTitle: 'Protokol podepsán',
  protocolSignedText: (email) => `Děkujeme za podpis! Kopie protokolu bude zaslána na ${email}.`,
  protocolSignedNoEmail: 'Děkujeme za podpis! Zakázka bude uzavřena.',
  downloadSignedProtocol: 'Stáhnout podepsaný protokol',
  protocolSignErrorNoSig: 'Nejprve se podepište',
  protocolSignErrorNoName: 'Vyplňte jméno podepisujícího',

  phase6Title: 'Hodnocení služby',
  ratingQuestion: 'Jak jste spokojen/a s provedenou opravou?',
  ratingLabels: ['Slabé', 'Mohlo být lepší', 'Dobré', 'Velmi dobré', 'Výborné!'],
  feedbackLabel: 'Komentář (volitelný)',
  feedbackPlaceholder: 'Co se vám líbilo nebo co bychom mohli zlepšit...',
  submitRating: 'Odeslat hodnocení',
  ratingThanksTitle: 'Děkujeme za hodnocení!',
  ratingThanksText: (ref) => `Vaše zpětná vazba nám pomáhá zlepšovat služby. Zakázka #${ref} je uzavřena.`,
  ratingError: 'Vyberte prosím hodnocení',

  closedTitle: 'Zakázka uzavřena',
  closedText: (ref) => `Vaše zakázka #${ref} byla úspěšně uzavřena. Děkujeme za využití našich služeb.`,

  callTech: 'Zavolat',
  messageTech: 'Napsat',
  contactSupport: 'Napsat na podporu',

  chatTitle: 'Podpora',
  chatPlaceholder: 'Napište zprávu...',
  chatSend: 'Odeslat',
  chatEmpty: 'Zatím žádné zprávy. Napište nám, pokud potřebujete pomoc.',
  chatOperator: 'Podpora',
  chatSystem: 'Systém',
  chatYou: 'Vy',
  chatSentToast: 'Zpráva odeslána',
  chatGreeting: 'Dobrý den! Jsem AI asistent Zlatých Řemeslníků. Jak Vám mohu pomoci? Můžete se zeptat na stav Vaší zakázky, termín příjezdu technika, nebo cokoli dalšího.',
  chatOfflineNote: 'Po–Ne 8:00–22:00',

  // Diagnostic form – Step 1
  diagClientTypeLabel: 'Typ klienta',
  diagClientTypePrivate: 'Soukromá osoba',
  diagClientTypeCompany: 'Firma',
  diagClientTypeSvj: 'SVJ (společenství vlastníků)',
  diagPropertyFlat: 'Byt',
  diagPropertyHouse: 'Rodinný dům',
  diagPropertyCommercial: 'Komerční objekt',
  diagPropertyCommonAreas: 'Společné prostory (chodba, sklep, schodiště)',
  diagClientTypeRequired: 'Vyberte typ klienta',
  diagPropertyRequired: 'Vyberte typ nemovitosti',
  diagNameRequired: 'Jméno je povinné',
  diagStreetRequired: 'Ulice je povinná',
  diagCityRequired: 'Město je povinné',
  diagZipRequired: 'PSČ je povinné',
  diagPhoneRequired: 'Telefon je povinný',
  diagEmailInvalid: 'Neplatná e-mailová adresa',
  diagFaultRequired: 'Vyberte typ poruchy',
  diagProblemRequired: 'Popište problém',
  diagDateRequired: 'Vyplňte alespoň 1. termín',
  diagConsentRequired: 'Potvrďte souhlas se zpracováním údajů',
  diagSubmitFailed: 'Odeslání selhalo. Zkuste to prosím znovu.',

  // Issue status check
  issueStillActiveTitle: 'Trvá porucha stále?',
  issueStillActiveQuestion: 'Dejte nám prosím vědět, zda stále potřebujete technika.',
  issueStillActiveYes: '✅ Ano, potřebuji technika',
  issueStillActiveNo: '❌ Ne, je to vyřešené',
  issueResolvedConfirmTitle: 'Požadavek zrušen',
  issueResolvedConfirmText: 'Opravdu chcete zrušit? Technik nebude vyslán.',
  issueResolvedConfirmBtn: 'Ano, zrušit',
  issueResolvedBackBtn: 'Zpět',
  issueResolvedReasonLabel: 'Můžete nám sdělit důvod (volitelné)',
  issueResolvedReasonPlaceholder: 'Např. porucha pominula, opravil to jiný technik...',
  issueResolvedThankYou: 'Děkujeme! Vaše zakázka byla zrušena. Přejeme hezký den.',

  // FAQ & Help
  faqTitle: 'Časté dotazy',
  faqSearch: 'Hledat...',
  faqRelevant: 'Aktuálně',
  faqContactSupport: 'Napsat na podporu',
  nextStepTitle: 'Co se děje teď?',
  nextStepDismiss: 'Rozumím',
  hintClose: 'Zavřít',
  hintSurchargeWarning: 'V případě odmítnutí doplatku technik provede pouze práce hrazené z pojištění. Oprava tak může být pouze částečná. O dalším postupu vás bude informovat vaše pojišťovna.',
  hintSignatureHelp: 'Podepište prstem přímo v rámu níže. Pokud se podpis nepovede, klikněte na „Smazat" a zkuste to znovu. Podpis nemusí být perfektní.',
  hintTimelineExplain: 'Na cestě = technik vyrazil k vám · Diagnostika = kontroluje problém · Oprava = pracuje · Dokončování = finalizuje práce',

  invalidLink: 'Neplatný odkaz. Kontaktujte zákaznickou linku.',
  jobNotFound: 'Zakázka nenalezena',
  checkSmsLink: 'Zkontrolujte prosím odkaz z SMS zprávy.',

  errorGeneric: 'Nastala chyba, zkuste znovu.',
  errorNetwork: 'Chyba sítě. Zkuste znovu.',
  errorSending: 'Chyba při odesílání',
  errorSignFirst: 'Nezapomeňte se podepsat pro schválení doplatku.',
  errorRating: 'Chyba při ukládání hodnocení',
  dateLocale: 'cs-CZ',
  schedTitle: 'Technik navrhuje termín',
  schedApprovedTitle: 'Termín schválen',
  schedApprovedText: 'Technik byl informován. Těšíme se na vaši návštěvu.',
  schedRejectedTitle: 'Termín odmítnut',
  schedRejectedText: 'Dispečer vás bude kontaktovat pro dohodnutí nového termínu.',
  schedProposedLabel: 'Navrhovaný termín',
  schedApproveBtn: 'Schválit termín',
  schedProposeAltBtn: '❌ Navrhnout jiný termín',
  schedAltQuestion: 'Kdy by vám vyhovovalo?',
  schedAltPlaceholder: 'např. Čtvrtek 18. března ráno, nebo pátek celý den...',
  schedAltLabel: 'Navrhnout jiný termín',
  schedTimeOptional: 'Čas (volitelné)',
  schedAllDay: 'Celý den',
  schedBackBtn: 'Zpět',
  schedRejectBtn: 'Odmítnout termín',
  schedYourTech: 'Váš technik',
  counterTitle: 'Navrhnout jiný termín',
  counterDesc: 'Navrhněte až 3 termíny, které vám vyhovují. Technik si vybere jeden z nich.',
  counterPreferred: 'Preferovaný termín',
  counterAlt: (n: number) => `Alternativní termín ${n}`,
  counterDate: 'Datum',
  counterTime: 'Čas',
  counterMessage: 'Zpráva pro technika (volitelné)',
  counterMessagePlaceholder: 'Např. jsem doma celý den, preferuji dopoledne...',
  counterAddSlot: 'Přidat další termín',
  counterSubmitBtn: 'Odeslat návrh termínů',
  counterSubmitting: 'Odesílám...',
  submitting: 'Odesílám...',
  diagSubmitBtn: 'Odeslat diagnostický formulář',
  counterSuccessTitle: 'Návrh termínů odeslán',
  counterSuccessText: 'Technik si vybere jeden z vašich termínů a potvrdí ho.',
  counterMinOneSlot: 'Zadejte alespoň jeden termín (datum i čas).',
  counterFillBoth: (n: number) => `Termín ${n}: vyplňte i datum i čas.`,
  counterInvalidDate: (n: number) => `Termín ${n}: neplatné datum nebo čas.`,
  counterMinTwoHours: (n: number) => `Termín ${n}: termín musí být alespoň 2 hodiny od teď.`,
  counterDuplicates: 'Termíny se nesmějí opakovat.',
  counterSendError: 'Nepodařilo se odeslat návrh. Zkuste znovu.',
  emergencySurchargeSection: 'Pohotovostní příplatek',
  emergencySurchargeLabel: 'Pohotovostní příplatek (víkend / noc / svátek)',
  travelCoveredLabel: 'Hradí pojišťovna',
  travelCoveredBadge: 'v rámci krytí',
  materialTypeDM: 'Drobný materiál',
  materialTypeND: 'Náhradní díly',
  materialTypeM: 'Materiál',
  materialTypeOther: 'Ostatní materiál',
  subtotalBeforeVatLabel: 'Mezisoučet bez DPH',
  grandTotalLabel: 'Celkem',
  coverageLabel: 'Pojistné krytí',
  doplatokNote: 'Částka nad rámec pojistného krytí, splatná přímo technikovi po dokončení opravy.',
  materialClientPays: ' (hradí zákazník)',
  docsAvailable: 'Vaše dokumenty jsou k dispozici ke stažení:',
  downloadAllDocs: 'Stáhnout všechny dokumenty (ZIP)',

  docsSectionTitle: 'Dokumenty k zakázce',
  docsProtocol: (n) => n === 1 ? 'Protokol opravy' : `Protokol opravy – návštěva č. ${n}`,
  docsProtocolSigned: 'podepsáno',
  docsPhotos: (n) => `Fotodokumentace (${n} ${n === 1 ? 'fotka' : n < 5 ? 'fotky' : 'fotek'})`,
  docsQuote: 'Cenová nabídka',
  docsDownloadPdf: 'Stáhnout PDF',
  docsDownloadZip: 'Stáhnout ZIP',
  docsDownloadAll: 'Stáhnout vše (ZIP)',
  docsNone: 'Žádné dokumenty zatím nejsou k dispozici.',
}

// ─── SK texty ──────────────────────────────────

const SK: PortalTexts = {
  currency: '€',
  formatPrice: (amount) => `${amount.toLocaleString('sk-SK')} €`,

  progressDiagnostic: 'Diagnostika',
  progressTechnician: 'Technik',
  progressScheduleConfirmation: 'Potvrdenie termínu',
  progressRepair: 'Oprava',
  progressSurcharge: 'Doplatok',
  progressProtocol: 'Protokol',
  progressRating: 'Hodnotenie',

  phase1Title: '📋 Diagnostický formulár',
  emailLabel: 'E-mailová adresa',
  emailPlaceholder: 'vas@email.sk',
  emailHint: 'Pre zaslanie protokolu e-mailom',
  addressLabel: '📍 Adresa',
  problemLabel: '📝 Popis problému',
  extraDescLabel: 'Doplňte popis (voliteľné)',
  extraDescPlaceholder: 'Ďalšie detaily o probléme...',
  photoLabel: 'Fotodokumentácia',
  photoSlots: ['Fotka problému', 'Iný uhol', 'Detail', 'Celkový pohľad'],
  photosUploaded: (count, total) => `${count}/${total} fotiek nahratých`,
  selectDateLabel: 'Vyberte termín opravy',
  submitDiagnostic: 'Odoslať diagnostiku',
  diagnosticSentTitle: 'Diagnostika odoslaná',
  diagnosticSentText: 'Ďakujeme! Hľadáme pre vás najlepšieho technika. Budeme vás informovať o pridelení.',
  selectDateError: 'Vyberte prosím termín opravy',

  phase2Title: 'Váš technik',
  dateLabel: '📅 Termín',
  timeLabel: '🕐 Čas',
  techConfirmed: 'Váš technik je potvrdený',

  phase3Title: 'Priebeh opravy',
  timelineEnRoute: 'Technik je na ceste',
  timelineArrived: 'Technik dorazil',
  timelineDiagnostics: 'Prebieha diagnostika',
  timelineWorking: 'Prebieha oprava',
  timelineFinishing: 'Dokončovanie',
  timelineDone: 'Oprava dokončená',
  timelineNow: 'Práve teraz',
  nextVisitLabel: 'Predpokladaný termín ďalšej návštevy',
  materialDeliveryLabel: 'Predpokladané dodanie materiálu',

  phase4Title: '💰 Doplatok nad rámec asistenčného krytia',
  coveredByInsurance: 'Pokryté asistenčnou spoločnosťou',
  beyondInsurance: 'Nad rámec krytia',
  totalLabel: 'Celkom',
  yourSurcharge: 'Váš doplatok',
  surchargeNote: 'Suma nad rámec asistenčného krytia',
  approveBtn: '✅ Súhlasím s doplatkom',
  rejectBtn: '❌ Nesúhlasím',
  rejectConfirmText: 'Naozaj chcete odmietnuť? Oprava môže byť pozastavená.',
  rejectBackBtn: 'Späť',
  rejectConfirmBtn: 'Potvrdiť odmietnutie',
  surchargeApprovedTitle: 'Doplatok schválený',
  surchargeApprovedText: 'Ďakujeme! Technik pokračuje v oprave.',
  surchargeRejectedTitle: 'Doplatok odmietnutý',
  surchargeRejectedText: 'Vaše rozhodnutie bolo zaznamenané. Budeme vás kontaktovať.',
  priceQuoteTitle: 'Cenová ponuka',
  laborAndTravelCovered: 'Práca a cestovné sú hradené poisťovňou',
  laborSection: 'Práca',
  hoursLabel: 'hod.',
  rateLabel: 'sadzba',
  travelSection: 'Výjazdy',
  kmLabel: 'km',
  visitsLabel: 'výjazd',
  materialSection: 'Materiál',
  vatLabel: 'DPH',
  subtotalLabel: 'Medzisúčet',
  coverageDeductionLabel: 'Pokryté asistenčnou spoločnosťou',
  discountLabel: 'Zľava',
  clientDoplatokLabel: 'Váš doplatok',
  generatedLabel: 'Ponuka vystavená',

  phase5Title: '📄 Protokol opravy',
  emailBannerTitle: 'Chcete dostať protokol e-mailom?',
  emailBannerText: 'Doplňte e-mailovú adresu pre zaslanie kópie protokolu.',
  emailBannerSave: 'Uložiť',
  emailSentTo: (email) => `Protokol bude zaslaný na ${email}`,
  emailSavedToast: 'E-mail uložený ✅',
  emailInvalidToast: 'Zadajte platnú e-mailovú adresu',
  protocolJobHeading: 'Zákazka',
  protocolNumberLabel: 'Číslo',
  protocolTypeLabel: 'Typ opravy',
  protocolAddressLabel: 'Adresa',
  protocolInsuranceLabel: 'Asistenčná spoločnosť',
  protocolVisitsHeading: 'Návštevy',
  protocolVisitNumber: 'Výjazd č.',
  protocolVisitsDate: 'Dátum',
  protocolVisitsArrival: 'Príjazd',
  protocolVisitsDeparture: 'Odjazd',
  protocolVisitsHours: 'Hodiny',
  protocolVisitsMaterialHours: 'Nákup materiálu',
  protocolVisitsKm: 'Km',
  protocolWorkHeading: 'Popis vykonanej práce',
  protocolMaterialHeading: 'Materiál',
  protocolMaterialName: 'Názov',
  protocolMaterialQty: 'Mn.',
  protocolMaterialPrice: 'Cena s DPH',
  protocolMaterialPayer: 'Hradí',
  protocolMaterialTotal: (amount) => `Celkom materiál: ${amount}`,
  protocolPhotosHeading: 'Fotodokumentácia',
  protocolSummaryHeading: 'Sumarizácia',
  protocolTotalHours: 'Celkové hodiny',
  protocolTotalKm: 'Celkové km',
  protocolTotalMaterial: 'Materiál celkom',
  protocolTechLabel: 'Technik',
  protocolTechSigHeading: 'Podpis technika',
  protocolClientSigHeading: 'Podpis klienta',
  protocolClientSigNote: 'Svojím podpisom potvrdzujem prevzatie opravy a súhlasím s rozsahom vykonaných prác.',
  protocolClientNoteLabel: 'Poznámka klienta',
  protocolClientNotePlaceholder: 'Vaše pripomienky k vykonanej práci (nepovinné)...',
  protocolSignerNameLabel: 'Meno podpisujúceho',
  protocolSignerNamePlaceholder: 'Meno a priezvisko',
  protocolSignPlaceholder: '✍️ Kliknite a podpíšte sa',
  protocolClearBtn: 'Vymazať',
  protocolConfirmSigBtn: 'Potvrdiť podpis',
  protocolSubmitBtn: '✅ Podpísať a potvrdiť protokol',
  protocolSignedTitle: 'Protokol podpísaný',
  protocolSignedText: (email) => `Ďakujeme za podpis! Kópia protokolu bude zaslaná na ${email}.`,
  protocolSignedNoEmail: 'Ďakujeme za podpis! Zákazka bude uzavretá.',
  downloadSignedProtocol: 'Stiahnuť podpísaný protokol',
  protocolSignErrorNoSig: 'Najprv sa podpíšte',
  protocolSignErrorNoName: 'Vyplňte meno podpisujúceho',

  phase6Title: 'Hodnotenie služby',
  ratingQuestion: 'Ako ste spokojný/á s vykonanou opravou?',
  ratingLabels: ['Slabé', 'Mohlo byť lepšie', 'Dobré', 'Veľmi dobré', 'Výborné!'],
  feedbackLabel: 'Komentár (voliteľný)',
  feedbackPlaceholder: 'Čo sa vám páčilo alebo čo by sme mohli zlepšiť...',
  submitRating: 'Odoslať hodnotenie',
  ratingThanksTitle: 'Ďakujeme za hodnotenie!',
  ratingThanksText: (ref) => `Vaša spätná väzba nám pomáha zlepšovať služby. Zákazka #${ref} je uzavretá.`,
  ratingError: 'Vyberte prosím hodnotenie',

  closedTitle: 'Zákazka uzavretá',
  closedText: (ref) => `Vaša zákazka #${ref} bola úspešne uzavretá. Ďakujeme za využitie našich služieb.`,

  callTech: 'Zavolať',
  messageTech: 'Napísať',
  contactSupport: 'Napísať na podporu',

  chatTitle: 'Podpora',
  chatPlaceholder: 'Napíšte správu...',
  chatSend: 'Odoslať',
  chatEmpty: 'Zatiaľ žiadne správy. Napíšte nám, ak potrebujete pomoc.',
  chatOperator: 'Podpora',
  chatSystem: 'Systém',
  chatYou: 'Vy',
  chatSentToast: 'Správa odoslaná',
  chatGreeting: 'Dobrý deň! Som AI asistent Zlatých Řemeslníkov. Ako Vám môžem pomôcť? Môžete sa opýtať na stav Vašej zákazky, termín príchodu technika, alebo čokoľvek ďalšie.',
  chatOfflineNote: 'Po–Ne 8:00–22:00',

  // Diagnostic form – Step 1
  diagClientTypeLabel: 'Typ klienta',
  diagClientTypePrivate: 'Súkromná osoba',
  diagClientTypeCompany: 'Firma',
  diagClientTypeSvj: 'SVB (spoločenstvo vlastníkov bytov)',
  diagPropertyFlat: 'Byt',
  diagPropertyHouse: 'Rodinný dom',
  diagPropertyCommercial: 'Komerčný objekt',
  diagPropertyCommonAreas: 'Spoločné priestory (chodba, pivnica, schodisko)',
  diagClientTypeRequired: 'Vyberte typ klienta',
  diagPropertyRequired: 'Vyberte typ nehnuteľnosti',
  diagNameRequired: 'Meno je povinné',
  diagStreetRequired: 'Ulica je povinná',
  diagCityRequired: 'Mesto je povinné',
  diagZipRequired: 'PSČ je povinné',
  diagPhoneRequired: 'Telefón je povinný',
  diagEmailInvalid: 'Neplatná e-mailová adresa',
  diagFaultRequired: 'Vyberte typ poruchy',
  diagProblemRequired: 'Popíšte problém',
  diagDateRequired: 'Vyplňte aspoň 1. termín',
  diagConsentRequired: 'Potvrďte súhlas so spracovaním údajov',
  diagSubmitFailed: 'Odoslanie zlyhalo. Skúste to prosím znova.',

  // Issue status check
  issueStillActiveTitle: 'Trvá porucha stále?',
  issueStillActiveQuestion: 'Dajte nám prosím vedieť, či stále potrebujete technika.',
  issueStillActiveYes: '✅ Áno, potrebujem technika',
  issueStillActiveNo: '❌ Nie, je to vyriešené',
  issueResolvedConfirmTitle: 'Požiadavka zrušená',
  issueResolvedConfirmText: 'Naozaj chcete zrušiť? Technik nebude vyslaný.',
  issueResolvedConfirmBtn: 'Áno, zrušiť',
  issueResolvedBackBtn: 'Späť',
  issueResolvedReasonLabel: 'Môžete nám povedať dôvod (voliteľné)',
  issueResolvedReasonPlaceholder: 'Napr. porucha pominula, opravil to iný technik...',
  issueResolvedThankYou: 'Ďakujeme! Vaša zákazka bola zrušená. Prajeme pekný deň.',

  // FAQ & Help
  faqTitle: 'Najčastejšie otázky',
  faqSearch: 'Hľadať...',
  faqRelevant: 'Aktuálne',
  faqContactSupport: 'Napísať na podporu',
  nextStepTitle: 'Čo sa deje teraz?',
  nextStepDismiss: 'Rozumiem',
  hintClose: 'Zavrieť',
  hintSurchargeWarning: 'V prípade odmietnutia doplatku technik vykoná len práce hradené z poistenia. Oprava tak môže byť len čiastočná. O ďalšom postupe vás bude informovať vaša poisťovňa.',
  hintSignatureHelp: 'Podpíšte prstom priamo v rámčeku nižšie. Ak sa podpis nepodarí, kliknite na „Vymazať" a skúste znova. Podpis nemusí byť dokonalý.',
  hintTimelineExplain: 'Na ceste = technik vyrazil k vám · Diagnostika = kontroluje problém · Oprava = pracuje · Dokončovanie = finalizuje práce',

  invalidLink: 'Neplatný odkaz. Kontaktujte zákaznícku linku.',
  jobNotFound: 'Zákazka nenájdená',
  checkSmsLink: 'Skontrolujte prosím odkaz z SMS správy.',

  errorGeneric: 'Nastala chyba, skúste znova.',
  errorNetwork: 'Chyba siete. Skúste znova.',
  errorSending: 'Chyba pri odosielaní',
  errorSignFirst: 'Nezabudnite sa podpísať pre schválenie doplatku.',
  errorRating: 'Chyba pri ukladaní hodnotenia',
  dateLocale: 'sk-SK',
  schedTitle: 'Technik navrhuje termín',
  schedApprovedTitle: 'Termín schválený',
  schedApprovedText: 'Technik bol informovaný. Tešíme sa na vašu návštevu.',
  schedRejectedTitle: 'Termín odmietnutý',
  schedRejectedText: 'Dispečer vás bude kontaktovať pre dohodnutie nového termínu.',
  schedProposedLabel: 'Navrhovaný termín',
  schedApproveBtn: 'Schváliť termín',
  schedProposeAltBtn: '❌ Navrhnúť iný termín',
  schedAltQuestion: 'Kedy by vám vyhovovalo?',
  schedAltPlaceholder: 'napr. Štvrtok 18. marca ráno, alebo piatok celý deň...',
  schedAltLabel: 'Navrhnúť iný termín',
  schedTimeOptional: 'Čas (voliteľné)',
  schedAllDay: 'Celý deň',
  schedBackBtn: 'Späť',
  schedRejectBtn: 'Odmietnuť termín',
  schedYourTech: 'Váš technik',
  counterTitle: 'Navrhnúť iný termín',
  counterDesc: 'Navrhnite až 3 termíny, ktoré vám vyhovujú. Technik si vyberie jeden z nich.',
  counterPreferred: 'Preferovaný termín',
  counterAlt: (n: number) => `Alternatívny termín ${n}`,
  counterDate: 'Dátum',
  counterTime: 'Čas',
  counterMessage: 'Správa pre technika (voliteľné)',
  counterMessagePlaceholder: 'Napr. som doma celý deň, preferujem dopoludnie...',
  counterAddSlot: 'Pridať ďalší termín',
  counterSubmitBtn: 'Odoslať návrh termínov',
  counterSubmitting: 'Odosielam...',
  submitting: 'Odosielam...',
  diagSubmitBtn: 'Odoslať diagnostický formulár',
  counterSuccessTitle: 'Návrh termínov odoslaný',
  counterSuccessText: 'Technik si vyberie jeden z vašich termínov a potvrdí ho.',
  counterMinOneSlot: 'Zadajte aspoň jeden termín (dátum aj čas).',
  counterFillBoth: (n: number) => `Termín ${n}: vyplňte aj dátum aj čas.`,
  counterInvalidDate: (n: number) => `Termín ${n}: neplatný dátum alebo čas.`,
  counterMinTwoHours: (n: number) => `Termín ${n}: termín musí byť aspoň 2 hodiny od teraz.`,
  counterDuplicates: 'Termíny sa nesmú opakovať.',
  counterSendError: 'Nepodarilo sa odoslať návrh. Skúste znova.',
  emergencySurchargeSection: 'Pohotovostný príplatok',
  emergencySurchargeLabel: 'Pohotovostný príplatok (víkend / noc / sviatok)',
  travelCoveredLabel: 'Hradí poisťovňa',
  travelCoveredBadge: 'v rámci krytia',
  materialTypeDM: 'Drobný materiál',
  materialTypeND: 'Náhradné diely',
  materialTypeM: 'Materiál',
  materialTypeOther: 'Ostatný materiál',
  subtotalBeforeVatLabel: 'Medzisúčet bez DPH',
  grandTotalLabel: 'Celkom',
  coverageLabel: 'Poistné krytie',
  doplatokNote: 'Suma nad rámec poistného krytia, splatná priamo technikovi po dokončení opravy.',
  materialClientPays: ' (hradí zákazník)',
  docsAvailable: 'Vaše dokumenty sú k dispozícii na stiahnutie:',
  downloadAllDocs: 'Stiahnuť všetky dokumenty (ZIP)',

  docsSectionTitle: 'Dokumenty k zákazke',
  docsProtocol: (n) => n === 1 ? 'Protokol opravy' : `Protokol opravy – návšteva č. ${n}`,
  docsProtocolSigned: 'podpísané',
  docsPhotos: (n) => `Fotodokumentácia (${n} ${n === 1 ? 'fotka' : n < 5 ? 'fotky' : 'fotiek'})`,
  docsQuote: 'Cenová ponuka',
  docsDownloadPdf: 'Stiahnuť PDF',
  docsDownloadZip: 'Stiahnuť ZIP',
  docsDownloadAll: 'Stiahnuť všetko (ZIP)',
  docsNone: 'Žiadne dokumenty zatiaľ nie sú k dispozícii.',
}

// ─── EN texty ─────────────────────────────────

const EN: PortalTexts = {
  currency: 'CZK',
  formatPrice: (amount) => `${amount.toLocaleString('en-US')} CZK`,

  progressDiagnostic: 'Diagnostic',
  progressTechnician: 'Technician',
  progressScheduleConfirmation: 'Schedule confirmation',
  progressRepair: 'Repair',
  progressSurcharge: 'Surcharge',
  progressProtocol: 'Protocol',
  progressRating: 'Rating',

  phase1Title: '📋 Diagnostic Form',
  emailLabel: 'Email address',
  emailPlaceholder: 'your@email.com',
  emailHint: 'To receive the protocol by email',
  addressLabel: '📍 Address',
  problemLabel: '📝 Problem description',
  extraDescLabel: 'Additional description (optional)',
  extraDescPlaceholder: 'More details about the problem...',
  photoLabel: 'Photo documentation',
  photoSlots: ['Problem photo', 'Another angle', 'Detail', 'Overview'],
  photosUploaded: (count, total) => `${count}/${total} photos uploaded`,
  selectDateLabel: 'Select repair date',
  submitDiagnostic: 'Submit diagnostic',
  diagnosticSentTitle: 'Diagnostic submitted',
  diagnosticSentText: 'Thank you! We are looking for the best technician for you. We will inform you about the assignment.',
  selectDateError: 'Please select a repair date',

  phase2Title: 'Your Technician',
  dateLabel: '📅 Date',
  timeLabel: '🕐 Time',
  techConfirmed: 'Your technician is confirmed',

  phase3Title: 'Repair Progress',
  timelineEnRoute: 'Technician is on the way',
  timelineArrived: 'Technician has arrived',
  timelineDiagnostics: 'Diagnostics in progress',
  timelineWorking: 'Repair in progress',
  timelineFinishing: 'Finishing up',
  timelineDone: 'Repair completed',
  timelineNow: 'Right now',
  nextVisitLabel: 'Expected next visit date',
  materialDeliveryLabel: 'Expected material delivery',

  phase4Title: '💰 Surcharge beyond assistance coverage',
  coveredByInsurance: 'Covered by assistance company',
  beyondInsurance: 'Beyond coverage',
  totalLabel: 'Total',
  yourSurcharge: 'Your surcharge',
  surchargeNote: 'Amount beyond assistance coverage',
  approveBtn: '✅ I agree with the surcharge',
  rejectBtn: '❌ I disagree',
  rejectConfirmText: 'Are you sure you want to reject? The repair may be paused.',
  rejectBackBtn: 'Back',
  rejectConfirmBtn: 'Confirm rejection',
  surchargeApprovedTitle: 'Surcharge approved',
  surchargeApprovedText: 'Thank you! The technician will continue with the repair.',
  surchargeRejectedTitle: 'Surcharge rejected',
  surchargeRejectedText: 'Your decision has been recorded. We will contact you.',

  priceQuoteTitle: 'Price breakdown',
  laborAndTravelCovered: 'Labor and travel are covered by insurance',
  laborSection: 'Labor',
  hoursLabel: 'hr.',
  rateLabel: 'rate',
  travelSection: 'Travel',
  kmLabel: 'km',
  visitsLabel: 'visit',
  materialSection: 'Materials',
  vatLabel: 'VAT',
  subtotalLabel: 'Subtotal',
  coverageDeductionLabel: 'Covered by assistance company',
  discountLabel: 'Discount',
  clientDoplatokLabel: 'Your payment',
  generatedLabel: 'Quote generated',

  phase5Title: '📄 Repair Protocol',
  emailBannerTitle: 'Want to receive the protocol by email?',
  emailBannerText: 'Enter your email address to receive a copy of the protocol.',
  emailBannerSave: 'Save',
  emailSentTo: (email) => `Protocol will be sent to ${email}`,
  emailSavedToast: 'Email saved ✅',
  emailInvalidToast: 'Enter a valid email address',
  protocolJobHeading: 'Job',
  protocolNumberLabel: 'Number',
  protocolTypeLabel: 'Repair type',
  protocolAddressLabel: 'Address',
  protocolInsuranceLabel: 'Assistance Company',
  protocolVisitsHeading: 'Visits',
  protocolVisitNumber: 'Visit #',
  protocolVisitsDate: 'Date',
  protocolVisitsArrival: 'Arrival',
  protocolVisitsDeparture: 'Departure',
  protocolVisitsHours: 'Hours',
  protocolVisitsMaterialHours: 'Material purchase',
  protocolVisitsKm: 'Km',
  protocolWorkHeading: 'Work description',
  protocolMaterialHeading: 'Materials',
  protocolMaterialName: 'Name',
  protocolMaterialQty: 'Qty',
  protocolMaterialPrice: 'Price incl. VAT',
  protocolMaterialPayer: 'Paid by',
  protocolMaterialTotal: (amount) => `Total materials: ${amount}`,
  protocolPhotosHeading: 'Photo documentation',
  protocolSummaryHeading: 'Summary',
  protocolTotalHours: 'Total hours',
  protocolTotalKm: 'Total km',
  protocolTotalMaterial: 'Materials total',
  protocolTechLabel: 'Technician',
  protocolTechSigHeading: 'Technician signature',
  protocolClientSigHeading: 'Client signature',
  protocolClientSigNote: 'By signing, I confirm the acceptance of the repair and agree with the scope of work performed.',
  protocolClientNoteLabel: 'Client note',
  protocolClientNotePlaceholder: 'Your comments on the work performed (optional)...',
  protocolSignerNameLabel: 'Signer name',
  protocolSignerNamePlaceholder: 'First and last name',
  protocolSignPlaceholder: '✍️ Click and sign',
  protocolClearBtn: 'Clear',
  protocolConfirmSigBtn: 'Confirm signature',
  protocolSubmitBtn: '✅ Sign and confirm protocol',
  protocolSignedTitle: 'Protocol signed',
  protocolSignedText: (email) => `Thank you for signing! A copy of the protocol will be sent to ${email}.`,
  protocolSignedNoEmail: 'Thank you for signing! The job will be closed.',
  downloadSignedProtocol: 'Download signed protocol',
  protocolSignErrorNoSig: 'Please sign first',
  protocolSignErrorNoName: 'Enter the signer name',

  phase6Title: 'Service Rating',
  ratingQuestion: 'How satisfied are you with the repair?',
  ratingLabels: ['Poor', 'Could be better', 'Good', 'Very good', 'Excellent!'],
  feedbackLabel: 'Comment (optional)',
  feedbackPlaceholder: 'What did you like or what could we improve...',
  submitRating: 'Submit rating',
  ratingThanksTitle: 'Thank you for your rating!',
  ratingThanksText: (ref) => `Your feedback helps us improve our services. Job #${ref} is closed.`,
  ratingError: 'Please select a rating',

  closedTitle: 'Job closed',
  closedText: (ref) => `Your job #${ref} has been successfully closed. Thank you for using our services.`,

  callTech: 'Call',
  messageTech: 'Message',
  contactSupport: 'Contact support',

  chatTitle: 'Support',
  chatPlaceholder: 'Type a message...',
  chatSend: 'Send',
  chatEmpty: 'No messages yet. Write to us if you need help.',
  chatOperator: 'Support',
  chatSystem: 'System',
  chatYou: 'You',
  chatSentToast: 'Message sent',
  chatGreeting: 'Hello! I am the AI assistant of Zlatí Řemeslníci. How can I help you? You can ask about your order status, technician arrival time, or anything else.',
  chatOfflineNote: 'Mon–Sun 8:00–22:00',

  // Diagnostic form – Step 1
  diagClientTypeLabel: 'Client type',
  diagClientTypePrivate: 'Private person',
  diagClientTypeCompany: 'Company',
  diagClientTypeSvj: 'HOA (homeowners association)',
  diagPropertyFlat: 'Apartment',
  diagPropertyHouse: 'House',
  diagPropertyCommercial: 'Commercial property',
  diagPropertyCommonAreas: 'Common areas (hallway, basement, staircase)',
  diagClientTypeRequired: 'Select client type',
  diagPropertyRequired: 'Select property type',
  diagNameRequired: 'Name is required',
  diagStreetRequired: 'Street is required',
  diagCityRequired: 'City is required',
  diagZipRequired: 'ZIP code is required',
  diagPhoneRequired: 'Phone is required',
  diagEmailInvalid: 'Invalid email address',
  diagFaultRequired: 'Select fault type',
  diagProblemRequired: 'Describe the problem',
  diagDateRequired: 'Fill in at least 1 appointment',
  diagConsentRequired: 'Confirm consent to data processing',
  diagSubmitFailed: 'Submission failed. Please try again.',

  // Issue status check
  issueStillActiveTitle: 'Is the issue still ongoing?',
  issueStillActiveQuestion: 'Please let us know if you still need a technician.',
  issueStillActiveYes: '✅ Yes, I need a technician',
  issueStillActiveNo: '❌ No, it\'s resolved',
  issueResolvedConfirmTitle: 'Request cancelled',
  issueResolvedConfirmText: 'Are you sure? No technician will be dispatched.',
  issueResolvedConfirmBtn: 'Yes, cancel',
  issueResolvedBackBtn: 'Back',
  issueResolvedReasonLabel: 'Let us know the reason (optional)',
  issueResolvedReasonPlaceholder: 'E.g. the issue went away, another technician fixed it...',
  issueResolvedThankYou: 'Thank you! Your request has been cancelled. Have a great day.',

  // FAQ & Help
  faqTitle: 'FAQ',
  faqSearch: 'Search...',
  faqRelevant: 'Relevant now',
  faqContactSupport: 'Contact support',
  nextStepTitle: 'What\'s happening?',
  nextStepDismiss: 'Got it',
  hintClose: 'Close',
  hintSurchargeWarning: 'Should you choose to decline the surcharge, the technician will carry out only the work covered by your insurance. The repair may therefore be partial. Your insurance company will contact you regarding next steps.',
  hintSignatureHelp: 'Sign with your finger directly in the box below. If the signature does not turn out well, click "Clear" and try again. It does not need to be perfect.',
  hintTimelineExplain: 'On the way = technician has departed · Diagnostics = checking the issue · Repair = working · Finishing = finalising the work',

  invalidLink: 'Invalid link. Please contact our helpline.',
  jobNotFound: 'Job not found',
  checkSmsLink: 'Please check the link from your SMS message.',

  errorGeneric: 'An error occurred. Please try again.',
  errorNetwork: 'Network error. Please try again.',
  errorSending: 'Error sending',
  errorSignFirst: 'Please sign before approving the surcharge.',
  errorRating: 'Error saving rating',
  dateLocale: 'en-GB',
  schedTitle: 'Technician proposes a date',
  schedApprovedTitle: 'Appointment approved',
  schedApprovedText: 'The technician has been notified. We look forward to your visit.',
  schedRejectedTitle: 'Appointment declined',
  schedRejectedText: 'Our dispatcher will contact you to arrange a new date.',
  schedProposedLabel: 'Proposed date',
  schedApproveBtn: 'Approve appointment',
  schedProposeAltBtn: '❌ Propose a different time',
  schedAltQuestion: 'When would suit you?',
  schedAltPlaceholder: 'e.g. Thursday 18 March morning, or Friday all day...',
  schedAltLabel: 'Propose a different date',
  schedTimeOptional: 'Time (optional)',
  schedAllDay: 'All day',
  schedBackBtn: 'Back',
  schedRejectBtn: 'Decline appointment',
  schedYourTech: 'Your technician',
  counterTitle: 'Propose a different time',
  counterDesc: 'Suggest up to 3 times that suit you. The technician will pick one.',
  counterPreferred: 'Preferred time',
  counterAlt: (n: number) => `Alternative time ${n}`,
  counterDate: 'Date',
  counterTime: 'Time',
  counterMessage: 'Message for technician (optional)',
  counterMessagePlaceholder: 'E.g. I am home all day, prefer mornings...',
  counterAddSlot: 'Add another time',
  counterSubmitBtn: 'Submit proposed times',
  counterSubmitting: 'Submitting...',
  submitting: 'Submitting...',
  diagSubmitBtn: 'Submit diagnostic form',
  counterSuccessTitle: 'Times submitted',
  counterSuccessText: 'The technician will pick one of your proposed times and confirm.',
  counterMinOneSlot: 'Enter at least one time slot (date and time).',
  counterFillBoth: (n: number) => `Slot ${n}: fill in both date and time.`,
  counterInvalidDate: (n: number) => `Slot ${n}: invalid date or time.`,
  counterMinTwoHours: (n: number) => `Slot ${n}: must be at least 2 hours from now.`,
  counterDuplicates: 'Times must not be duplicated.',
  counterSendError: 'Failed to submit proposal. Please try again.',
  emergencySurchargeSection: 'Emergency surcharge',
  emergencySurchargeLabel: 'Emergency surcharge (weekend / night / holiday)',
  travelCoveredLabel: 'Covered by insurance',
  travelCoveredBadge: 'included in coverage',
  materialTypeDM: 'Consumables',
  materialTypeND: 'Spare parts',
  materialTypeM: 'Materials',
  materialTypeOther: 'Other materials',
  subtotalBeforeVatLabel: 'Subtotal excl. VAT',
  grandTotalLabel: 'Total',
  coverageLabel: 'Insurance coverage',
  doplatokNote: 'Amount beyond insurance coverage, payable directly to the technician after the repair.',
  materialClientPays: ' (paid by customer)',
  docsAvailable: 'Your documents are available for download:',
  downloadAllDocs: 'Download all documents (ZIP)',

  docsSectionTitle: 'Job Documents',
  docsProtocol: (n) => n === 1 ? 'Repair Protocol' : `Repair Protocol – Visit ${n}`,
  docsProtocolSigned: 'signed',
  docsPhotos: (n) => `Photo Documentation (${n} ${n === 1 ? 'photo' : 'photos'})`,
  docsQuote: 'Price Quote',
  docsDownloadPdf: 'Download PDF',
  docsDownloadZip: 'Download ZIP',
  docsDownloadAll: 'Download all (ZIP)',
  docsNone: 'No documents are available yet.',
}

// ─── Export ─────────────────────────────────────

const LOCALE_MAP: Record<PortalLang, PortalTexts> = { cz: CZ, sk: SK, en: EN }

export function getPortalTexts(lang: PortalLang, country?: string | null): PortalTexts {
  const base = LOCALE_MAP[lang]
  // EN locale needs to know the country to pick the right currency symbol
  if (lang === 'en') {
    const isSk = country?.toUpperCase() === 'SK'
    const symbol = isSk ? '€' : 'Kč'
    const fmt = isSk
      ? (amount: number) => `${amount.toFixed(2).replace('.', ',')} €`
      : (amount: number) => `${Math.round(amount).toLocaleString('cs-CZ')} Kč`
    return { ...base, currency: symbol, formatPrice: fmt }
  }
  return base
}

export type { PortalTexts }
