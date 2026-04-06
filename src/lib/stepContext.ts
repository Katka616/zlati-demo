/**
 * stepContext — "Čo robiť teraz?" context action panel definitions.
 *
 * Returns a StepContext for the current CRM step (0–14) or off-pipeline status.
 * Pure TypeScript, ZERO React imports.
 */

export interface StepAction {
  label: string
  icon: string
  action: string  // identifier like 'start_matching', 'send_sms', etc.
}

export interface StepContext {
  color: string        // CSS color for the panel background
  borderColor: string  // CSS color for the border
  textColor: string    // CSS color for text
  icon: string         // emoji
  title: string        // Slovak title
  description: string  // Slovak description of what to do
  primaryAction: StepAction | null
  secondaryAction: StepAction | null
}

// ─── Color palettes ───────────────────────────────────────────────────────────

const BLUE   = { color: '#dbeafe', borderColor: '#93c5fd', textColor: '#1e40af' }
const GREEN  = { color: '#dcfce7', borderColor: '#86efac', textColor: '#166534' }
const YELLOW = { color: '#fef3c7', borderColor: '#fbbf24', textColor: '#92400e' }
const ORANGE = { color: '#ffedd5', borderColor: '#fdba74', textColor: '#9a3412' }
const PURPLE = { color: '#f3e8ff', borderColor: '#c084fc', textColor: '#6b21a8' }
const GRAY   = { color: '#f3f4f6', borderColor: '#d1d5db', textColor: '#374151' }
const RED    = { color: '#fee2e2', borderColor: '#fca5a5', textColor: '#991b1b' }
const AMBER  = { color: '#fef3c7', borderColor: '#fcd34d', textColor: '#92400e' }

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEP_CONTEXTS: StepContext[] = [
  // 0 — Príjem
  {
    ...BLUE,
    icon: '📥',
    title: 'Nová zákazka — príjem',
    description: 'Zákazka bola prijatá. Skontrolujte detaily a priraďte technika.',
    primaryAction: { label: 'Hľadať technika', icon: '🔍', action: 'start_matching' },
    secondaryAction: { label: 'Poslať SMS zákazníkovi', icon: '💬', action: 'send_sms_customer' },
  },
  // 1 — Priradenie
  {
    ...BLUE,
    icon: '🔍',
    title: 'Hľadanie technika',
    description: 'Vyberte vhodného technika podľa lokality a špecializácie a odošlite mu ponuku.',
    primaryAction: { label: 'Otvoriť matching', icon: '🔗', action: 'open_matching' },
    secondaryAction: { label: 'Manuálne priradiť', icon: '👤', action: 'manual_assign' },
  },
  // 2 — Naplánované
  {
    ...GREEN,
    icon: '📅',
    title: 'Zákazka naplánovaná',
    description: 'Technik bol priradený a termín je potvrdený. Zákazník by mal byť informovaný.',
    primaryAction: { label: 'Poslať potvrdenie zákazníkovi', icon: '📱', action: 'send_confirmation_sms' },
    secondaryAction: { label: 'Zobraziť kalendár', icon: '📅', action: 'open_calendar' },
  },
  // 3 — Na mieste
  {
    ...YELLOW,
    icon: '🔧',
    title: 'Technik na mieste',
    description: 'Technik vykonáva diagnostiku. Čakajte na odhad nákladov.',
    primaryAction: { label: 'Otvoriť chat', icon: '💬', action: 'open_chat' },
    secondaryAction: null,
  },
  // 4 — Schvaľovanie ceny
  {
    ...YELLOW,
    icon: '💰',
    title: 'Odhad čaká na schválenie',
    description: 'Technik odoslal odhad nákladov. Skontrolujte a schváľte alebo zamietni.',
    primaryAction: { label: 'Skontrolovať odhad', icon: '📋', action: 'review_estimate' },
    secondaryAction: { label: 'Kontaktovať technika', icon: '📞', action: 'call_technician' },
  },
  // 5 — Ponuka klientovi
  {
    ...ORANGE,
    icon: '🤝',
    title: 'Čaká na súhlas zákazníka s doplatkom',
    description: 'Zákazníkovi bola odoslaná ponuka na doplatok. Čakajte na jeho odpoveď.',
    primaryAction: { label: 'Kontaktovať zákazníka', icon: '📞', action: 'call_customer' },
    secondaryAction: { label: 'Zobraziť portál', icon: '🌐', action: 'open_portal' },
  },
  // 6 — Práca
  {
    ...YELLOW,
    icon: '🔨',
    title: 'Práca prebieha',
    description: 'Technik pracuje na zákazke. Sledujte priebeh a protokol.',
    primaryAction: { label: 'Otvoriť chat', icon: '💬', action: 'open_chat' },
    secondaryAction: { label: 'Zobraziť protokol', icon: '📄', action: 'view_protocol' },
  },
  // 7 — Rozpracovaná
  {
    ...YELLOW,
    icon: '🔄',
    title: 'Zákazka rozpracovaná',
    description: 'Zákazka vyžaduje ďalšiu návštevu alebo doplnenie. Sledujte postup.',
    primaryAction: { label: 'Otvoriť chat', icon: '💬', action: 'open_chat' },
    secondaryAction: { label: 'Zobraziť protokol', icon: '📄', action: 'view_protocol' },
  },
  // 8 — Dokončené
  {
    ...GREEN,
    icon: '✅',
    title: 'Zákazka technicky dokončená',
    description: 'Technik dokončil prácu. Pokračujte vyúčtovaním technika.',
    primaryAction: { label: 'Prejsť na vyúčtovanie', icon: '📊', action: 'advance_to_settlement' },
    secondaryAction: { label: 'Zobraziť protokol', icon: '📄', action: 'view_protocol' },
  },
  // 9 — Zúčtovanie
  {
    ...YELLOW,
    icon: '📊',
    title: 'Vyúčtovanie technika',
    description: 'Skontrolujte a potvrďte vyúčtovanie technika pred odoslaním na cenovú kontrolu.',
    primaryAction: { label: 'Otvoriť vyúčtovanie', icon: '📊', action: 'open_settlement' },
    secondaryAction: { label: 'Kontaktovať technika', icon: '📞', action: 'call_technician' },
  },
  // 10 — Cenová kontrola
  {
    ...YELLOW,
    icon: '🔎',
    title: 'Cenová kontrola (ORACLE)',
    description: 'Skontrolujte nacenenie pre EA a faktúru. Po overení pokračujte na odhlášku.',
    primaryAction: { label: 'Spustiť cenovú kontrolu', icon: '🔎', action: 'run_price_check' },
    secondaryAction: { label: 'Zobraziť pricing', icon: '💰', action: 'open_pricing' },
  },
  // 11 — EA Odhláška
  {
    ...BLUE,
    icon: '📋',
    title: 'EA Odhláška — reporting poisťovni',
    description: 'Odošlite odhlášku poisťovni Europ Assistance. Po potvrdení pokračujte na fakturáciu.',
    primaryAction: { label: 'Odoslať odhlášku', icon: '📤', action: 'send_ea_report' },
    secondaryAction: { label: 'Zobraziť odhlášku', icon: '📋', action: 'view_ea_report' },
  },
  // 12 — Fakturácia
  {
    ...PURPLE,
    icon: '🧾',
    title: 'Fakturácia',
    description: 'Vystavte faktúru partnerovi. Po odoslaní zákazka čaká na platbu.',
    primaryAction: { label: 'Vystaviť faktúru', icon: '🧾', action: 'create_invoice' },
    secondaryAction: { label: 'Zobraziť fakturačné dáta', icon: '💰', action: 'view_invoice_data' },
  },
  // 13 — Uhradené
  {
    ...GREEN,
    icon: '💳',
    title: 'Platba prijatá',
    description: 'Faktúra bola uhradená. Zákazku môžete uzavrieť.',
    primaryAction: { label: 'Uzavrieť zákazku', icon: '🔒', action: 'close_job' },
    secondaryAction: null,
  },
  // 14 — Uzavreté
  {
    ...GRAY,
    icon: '🔒',
    title: 'Zákazka uzavretá',
    description: 'Zákazka je kompletne uzavretá. Všetky kroky boli dokončené.',
    primaryAction: null,
    secondaryAction: null,
  },
]

// ─── Special off-pipeline contexts ───────────────────────────────────────────

const CANCELLED_CONTEXT: StepContext = {
  ...RED,
  icon: '❌',
  title: 'Zákazka zrušená',
  description: 'Zákazka bola zrušená. V prípade potreby ju môžete obnoviť.',
  primaryAction: { label: 'Obnoviť zákazku', icon: '↩️', action: 'restore_job' },
  secondaryAction: null,
}

const ON_HOLD_CONTEXT: StepContext = {
  ...AMBER,
  icon: '⏸️',
  title: 'Zákazka pozastavená',
  description: 'Zákazka je dočasne pozastavená. Pokračujte keď bude situácia vyriešená.',
  primaryAction: { label: 'Obnoviť zákazku', icon: '▶️', action: 'resume_job' },
  secondaryAction: { label: 'Pridať poznámku', icon: '📝', action: 'add_note' },
}

// ─── EA odhláška skip context (step 11, non-EA partner) ──────────────────────

const EA_SKIP_CONTEXT: StepContext = {
  ...BLUE,
  icon: '📋',
  title: 'EA Odhláška (preskočená)',
  description: 'Partner nie je Europ Assistance — tento krok sa preskakuje.',
  primaryAction: { label: 'Pokračovať na fakturáciu', icon: '🧾', action: 'advance_to_fakturacia' },
  secondaryAction: null,
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function getStepContext(
  crmStep: number,
  job: { status?: string; partner_id?: number | null; assigned_to?: number | null },
): StepContext {
  // Off-pipeline statuses take priority over step number
  if (job.status === 'cancelled') return CANCELLED_CONTEXT
  if (job.status === 'on_hold') return ON_HOLD_CONTEXT

  // Step 13 (EA odhláška): skip if partner is not Europ Assistance (id=2)
  if (crmStep === 13 && job.partner_id !== 2) return EA_SKIP_CONTEXT

  // Return the matching step context, default to step 0 if out of range
  return STEP_CONTEXTS[crmStep] ?? STEP_CONTEXTS[0]
}
