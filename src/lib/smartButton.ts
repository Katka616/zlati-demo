/**
 * smartButton.ts — Single Forward Button Engine
 *
 * Jediný zdroj pravdy pre to, čo technik vidí ako akčné tlačidlo.
 * Vstup: (crmStep, techPhase, lang, context) → Výstup: SmartActionButton
 *
 * Technik VŽDY vidí maximálne JEDNO tlačidlo, ktorým sa posúva ďalej.
 * Ak čaká na CRM/klienta, vidí "waiting" stav (disabled + pulzujúca animácia).
 *
 * CRM Step mapping:
 *  Step 0: príjem          — nový prípad
 *  Step 1: dispatching     — zákazka v marketplace
 *  Step 2: naplanovane     — technik sa vydá na cestu
 *  Step 3: na_mieste       — diagnostika a cenový odhad
 *  Step 4: schvalovanie_ceny — čaká na CRM operátora
 *  Step 5: cenova_ponuka_klientovi — doplatok
 *  Step 6: praca (NOVÝ)    — technik pracuje
 *  Step 7: rozpracovana (NOVÝ) — čaká na ďalší výjazd
 *  Step 8: dokoncene       — protokol (bolo 6)
 *  Step 9: zuctovanie      — G4 settlement (bolo 7)
 * Step 10: cenova_kontrola — interné (bolo 8)
 * Step 11: ea_odhlaska     — interné (bolo 9)
 * Step 12: fakturacia      — faktúra (bolo 10)
 * Step 13: uhradene        — uhradené (bolo 11)
 * Step 14: uzavrete        — uzavreté (bolo 12)
 */

import type { TechPhase, SmartActionButton, TechActionType } from '@/types/dispatch'
import type { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'

// ─── i18n-backed Labels ─────────────────────────────────────────

function label(key: string, lang: Language): string {
  return getTranslation(lang, `dispatch.btn.${key}`) || key
}

function waitMsg(key: string, lang: Language): string {
  return getTranslation(lang, `dispatch.waiting.${key}`) || ''
}

// ─── Context type ────────────────────────────────────────────────

type SmartButtonContext = {
  hasPhotos?: boolean
  photoCount?: number
  hasEstimate?: boolean
  hasProtocol?: boolean
  country?: string
  hasInvoice?: boolean
  invoicePaid?: boolean
  paymentHold?: boolean
  paymentHoldReason?: string
  visitNumber?: number
}

// ─── Button factory helpers ──────────────────────────────────────

type ButtonResolver = (lang: Language, ctx?: SmartButtonContext) => SmartActionButton

type OpenForm = SmartActionButton['opensForm']

function mkPrimary(
  labelKey: string,
  action: string,
  icon?: string,
  opensForm?: OpenForm,
): ButtonResolver {
  return (lang) => ({
    label: label(labelKey, lang),
    action: action as TechActionType,
    variant: 'primary',
    ...(icon ? { icon } : {}),
    ...(opensForm ? { opensForm } : {}),
  })
}

function mkWaiting(labelKey: string, action: string, waitKey: string): ButtonResolver {
  return (lang) => ({
    label: label(labelKey, lang),
    action: action as TechActionType,
    variant: 'waiting',
    waitingMessage: waitMsg(waitKey, lang),
  })
}

function mkSecondary(
  labelKey: string,
  action: string,
  icon?: string,
  opensForm?: OpenForm,
): ButtonResolver {
  return (lang) => ({
    label: label(labelKey, lang),
    action: action as TechActionType,
    variant: 'secondary',
    ...(icon ? { icon } : {}),
    ...(opensForm ? { opensForm } : {}),
  })
}

function mkDisabled(labelKey: string, icon?: string): ButtonResolver {
  return (lang) => ({
    label: label(labelKey, lang),
    action: 'completed' as TechActionType,
    variant: 'disabled',
    ...(icon ? { icon } : {}),
  })
}

// ─── Shared resolver maps (DRY for steps that share phases) ─────

// work_completed resolver — identical logic in steps 6, 8, 9 (with slight icon diff)
function mkWorkCompleted(finishIcon = '💰'): ButtonResolver {
  return (lang, ctx) => {
    if (!ctx?.hasPhotos) {
      return {
        label: label('upload_final_photos', lang),
        action: 'open_photos' as TechActionType,
        variant: 'primary',
        icon: '📷',
        opensForm: 'photos',
      }
    }
    return {
      label: label('finalize_settlement', lang),
      action: 'finalize_work' as TechActionType,
      variant: 'primary',
      icon: finishIcon,
    }
  }
}

// break / caka_material resolver — identical in steps 6, 8, 9
const breakResolver: ButtonResolver = (lang, ctx) => ({
  label: label('resume_work', lang),
  action: 'resume_work' as TechActionType,
  variant: 'primary',
  icon: '▶️',
})

const cakaMaterialResolver: ButtonResolver = (lang) => ({
  label: label('resume_work', lang),
  action: 'resume_work' as TechActionType,
  variant: 'primary',
  icon: '📦',
})

// ─── Phase lookup table type ─────────────────────────────────────

type PhaseMap = {
  [phase: string]: ButtonResolver | undefined
  _null?: ButtonResolver   // when techPhase is null/undefined
  _default?: ButtonResolver
}

// ─── BUTTON TABLE ────────────────────────────────────────────────
// step → (phase → resolver) or direct resolver

const BUTTON_TABLE: Record<number, ButtonResolver | PhaseMap> = {

  // ── Step 0: príjem — nový prípad, žiadna akcia pre technika
  0: mkDisabled('no_action'),

  // ── Step 1: dispatching — zákazka v marketplace
  1: mkDisabled('no_action'),

  // ── Step 2: naplanovane — technik sa vydá na cestu
  2: {
    _null: mkPrimary('en_route', 'en_route', '🚗'),
    offer_sent: mkPrimary('en_route', 'en_route', '🚗'),
    offer_accepted: mkPrimary('en_route', 'en_route', '🚗'),
    en_route: mkPrimary('arrived_start', 'arrived', '📍'),
    arrived: mkPrimary('upload_diagnostic_photos', 'start_diagnostics', '📷', 'photos'),
    _default: mkPrimary('en_route', 'en_route', '🚗'),
  },

  // ── Step 3: na_mieste — diagnostika a cenový odhad
  3: {
    _null: (lang) => ({
      label: label('upload_diagnostic_photos', lang),
      action: 'start_diagnostics' as TechActionType,
      variant: 'primary',
      icon: '📷',
      opensForm: 'photos',
    }),
    arrived: mkPrimary('upload_diagnostic_photos', 'open_photos', '📷', 'photos'),
    diagnostics: mkPrimary('send_estimate', 'submit_estimate', '💰', 'diagnostic_choice'),
    estimate_draft: mkPrimary('send_estimate', 'submit_estimate', '💰', 'diagnostic_choice'),
    diagnostic_completed: mkPrimary('sign_diagnostic_protocol', 'submit_protocol', '📝', 'protocol'),
    estimate_submitted: mkWaiting('waiting_estimate_approval', 'submit_estimate', 'estimate'),
    _default: mkPrimary('upload_diagnostic_photos', 'start_diagnostics', '📷', 'photos'),
  },

  // ── Step 4: schvalovanie_ceny — čaká na CRM operátora
  4: {
    estimate_approved: mkPrimary('start_repair', 'start_work', '🔧'),
    estimate_rejected: mkSecondary('revise_estimate', 'submit_estimate', '✏️', 'estimate'),
    _default: mkWaiting('waiting_crm', 'submit_estimate', 'crm'),
  },

  // ── Step 5: cenova_ponuka_klientovi — doplatok
  5: {
    client_approval_pending: mkWaiting('waiting_client', 'start_work', 'client'),
    client_approved: mkPrimary('start_repair', 'start_work', '🔧'),
    client_declined: (lang) => ({
      label: lang === 'cz' ? 'Upravit cenu a odeslat znovu' : 'Upraviť cenu a odoslať znova',
      action: 'revise_estimate' as TechActionType,
      variant: 'primary',
      icon: '💰',
      opensForm: 'estimate',
      secondaryAction: {
        label: lang === 'cz' ? 'Diagnostický protokol' : 'Diagnostický protokol',
        action: 'submit_protocol',
        icon: '📝',
        opensForm: 'protocol',
      },
    }),
    _default: mkWaiting('waiting_client', 'start_work', 'client'),
  },

  // ── Step 6: praca (NOVÝ) — technik aktívne pracuje na oprave
  6: {
    estimate_approved: mkPrimary('start_repair', 'start_work', '🔧'),
    client_approved: mkPrimary('start_repair', 'start_work', '🔧'),
    awaiting_next_visit: mkPrimary('resume_work', 'resume_work', '🗓️'),
    break: breakResolver,
    caka_material: cakaMaterialResolver,
    working: mkPrimary('work_done', 'work_done', '✅'),
    work_completed: mkWorkCompleted('💰'),
    final_price_submitted: mkWaiting('waiting_final_price', 'submit_final_price', 'final_price'),
    final_price_approved: mkPrimary('fill_final_protocol', 'submit_protocol', '📋', 'protocol'),
    final_price_rejected: mkSecondary('revise_final_price', 'submit_final_price', '✏️', 'final_price'),
    _default: (lang) => ({
      label: label('waiting_crm', lang),
      action: 'completed' as TechActionType,
      variant: 'waiting' as const,
      waitingMessage: waitMsg('crm', lang),
    }),
  },

  // ── Step 7: rozpracovana (NOVÝ) — čaká na ďalší výjazd (multi-visit)
  7: {
    _null: (lang, ctx) => {
      const nextVisit = ctx?.visitNumber ? ctx.visitNumber + 1 : undefined
      return {
        label: nextVisit
          ? (lang === 'cz' ? `Výjezd č. ${nextVisit} — vyrazit` : `Výjazd č. ${nextVisit} — vyraziť`)
          : (lang === 'cz' ? 'Vyrazit na další výjezd' : 'Vyraziť na ďalší výjazd'),
        action: 'en_route' as TechActionType,
        variant: 'primary',
        icon: '🗓️',
      }
    },
    awaiting_next_visit: (lang, ctx) => {
      const nextVisit = ctx?.visitNumber ? ctx.visitNumber + 1 : undefined
      return {
        label: nextVisit
          ? (lang === 'cz' ? `Výjezd č. ${nextVisit} — vyrazit` : `Výjazd č. ${nextVisit} — vyraziť`)
          : (lang === 'cz' ? 'Vyrazit na další výjezd' : 'Vyraziť na ďalší výjazd'),
        action: 'en_route' as TechActionType,
        variant: 'primary',
        icon: '🗓️',
      }
    },
    protocol_draft: mkWaiting('waiting_sign', 'submit_protocol', 'sign'),
    protocol_sent: mkWaiting('waiting_sign', 'submit_protocol', 'sign'),
    _default: (lang, ctx) => {
      const nextVisit = ctx?.visitNumber ? ctx.visitNumber + 1 : undefined
      return {
        label: nextVisit
          ? (lang === 'cz' ? `Výjezd č. ${nextVisit} — vyrazit` : `Výjazd č. ${nextVisit} — vyraziť`)
          : (lang === 'cz' ? 'Vyrazit na další výjezd' : 'Vyraziť na ďalší výjazd'),
        action: 'en_route' as TechActionType,
        variant: 'primary',
        icon: '🗓️',
      }
    },
  },

  // ── Step 8: dokoncene (bolo step 6) — oprava prebieha / cenová kontrola / protokol
  8: {
    estimate_approved: mkPrimary('start_repair', 'start_work', '🔧'),
    client_approved: mkPrimary('start_repair', 'start_work', '🔧'),
    estimate_draft: mkPrimary('send_estimate', 'submit_estimate', '💰', 'diagnostic_choice'),
    awaiting_next_visit: mkPrimary('resume_work', 'resume_work', '🗓️'),
    break: breakResolver,
    caka_material: cakaMaterialResolver,
    working: mkPrimary('work_done', 'work_done', '✅'),
    final_price_submitted: mkWaiting('waiting_final_price', 'submit_final_price', 'final_price'),
    final_price_approved: mkPrimary('fill_final_protocol', 'submit_protocol', '📋', 'protocol'),
    final_price_rejected: mkSecondary('revise_final_price', 'submit_final_price', '✏️', 'final_price'),
    protocol_draft: mkWaiting('waiting_sign', 'submit_protocol', 'sign'),
    protocol_sent: mkWaiting('waiting_sign', 'submit_protocol', 'sign'),
    final_protocol_draft: mkPrimary('sign_final_protocol', 'submit_protocol', '✍️', 'protocol'),
    final_protocol_sent: mkWaiting('waiting_final_sign', 'submit_protocol', 'final_sign'),
    final_protocol_signed: mkPrimary('view_settlement', 'view_invoice', '🧾', 'settlement_invoice'),
    settlement_review: mkPrimary('confirm_settlement', 'approve_settlement', '✅', 'settlement_review'),
    settlement_correction: mkSecondary('correct_settlement', 'correct_settlement', '✏️', 'settlement_correction'),
    settlement_approved: mkWaiting('calculating_price', 'approve_settlement', 'calculating'),
    price_review: mkWaiting('waiting_crm', 'approve_price', 'crm'),
    price_approved: mkPrimary('fill_final_protocol', 'submit_protocol', '📋', 'protocol'),
    invoice_ready: mkPrimary('issue_invoice', 'issue_invoice', '🧾', 'invoice'),
    departed: mkWaiting('invoice_pending', 'completed', 'invoice_processing'),
    work_completed: mkWorkCompleted('💰'),
    _default: (lang) => ({
      label: label('waiting_crm', lang),
      action: 'completed' as TechActionType,
      variant: 'waiting' as const,
      waitingMessage: waitMsg('crm', lang),
    }),
  },

  // ── Step 9: zuctovanie (bolo 7) — G4 settlement + final protocol flow
  9: {
    awaiting_next_visit: mkPrimary('resume_work', 'resume_work', '🔄'),
    work_completed: mkWorkCompleted('✅'),
    settlement_correction: mkSecondary('correct_settlement', 'correct_settlement', '✏️', 'settlement_correction'),
    settlement_review: mkPrimary('confirm_settlement', 'approve_settlement', '✅', 'settlement_review'),
    settlement_approved: mkWaiting('calculating_price', 'approve_settlement', 'calculating'),
    price_review: mkWaiting('waiting_crm', 'approve_price', 'crm'),
    surcharge_sent: mkWaiting('waiting_settlement_client', 'start_work', 'settlement_client'),
    surcharge_approved: mkPrimary('fill_final_protocol', 'submit_protocol', '📋', 'protocol'),
    surcharge_declined: (lang) => ({
      label: label('contact_dispatcher', lang),
      action: 'review_settlement' as TechActionType,
      variant: 'waiting',
      icon: '📞',
      waitingMessage: waitMsg('surcharge_declined_waiting', lang),
    }),
    price_approved: mkPrimary('fill_final_protocol', 'submit_protocol', '📋', 'protocol'),
    final_protocol_draft: mkPrimary('sign_final_protocol', 'submit_protocol', '✍️', 'protocol'),
    final_protocol_sent: mkWaiting('waiting_final_sign', 'submit_protocol', 'final_sign'),
    protocol_sent: mkWaiting('waiting_final_sign', 'submit_protocol', 'final_sign'),
    protocol_draft: mkPrimary('fill_final_protocol', 'submit_protocol', '📋', 'protocol'),
    final_protocol_signed: mkPrimary('view_settlement', 'view_invoice', '🧾', 'settlement_invoice'),
    invoice_ready: mkPrimary('issue_invoice', 'issue_invoice', '🧾', 'invoice'),
    departed: mkWaiting('invoice_pending', 'completed', 'invoice_processing'),
    break: breakResolver,
    caka_material: cakaMaterialResolver,
    _default: (lang) => ({
      label: label('waiting_crm', lang),
      action: 'completed' as TechActionType,
      variant: 'waiting' as const,
      waitingMessage: waitMsg('crm', lang),
    }),
  },
}

// ─── Core Engine ────────────────────────────────────────────────

/**
 * getSmartButton — returns the ONE action button for the technician.
 *
 * @param crmStep   - 0-14 (from statusEngine CRM_STEP_MAP)
 * @param techPhase - current technician phase (from job.techPhase)
 * @param lang      - 'sk' | 'cz'
 * @param context   - optional job context for conditional logic
 */
export function getSmartButton(
  crmStep: number,
  techPhase: TechPhase | null | undefined,
  lang: Language,
  context?: SmartButtonContext,
): SmartActionButton {

  // ═══ INVOICE LIFECYCLE — nezávislý od CRM pipeline poisťovne ═══
  // Trigger: tech_phase dosiahne invoice_ready alebo departed
  // CRM kroky 10-13 (cenová kontrola → EA odhláška → fakturácia poisťovni → uhradené poisťovňou)
  // sú o poisťovňovom pipeline a NESÚVISIA s faktúrou technika.
  // Technikova faktúra (ZR platí technikovi) má vlastný lifecycle.
  const isInInvoicePhase = techPhase === 'departed' || techPhase === 'invoice_ready'

  if (isInInvoicePhase || crmStep >= 10) {
    // Zákazka plne uzavretá
    if (crmStep >= 14) {
      return {
        label: label('done', lang),
        action: 'completed',
        variant: 'disabled',
        icon: '✅',
      }
    }
    // Faktúra uhradená — finálny stav pre technika
    if (context?.invoicePaid) {
      return {
        label: label('invoice_paid', lang),
        action: 'completed',
        variant: 'disabled',
        icon: '✅',
      }
    }
    // Úhrada pozastavená operátorom — technik vidí dôvod
    if (context?.paymentHold && context?.hasInvoice) {
      return {
        label: label('payment_held', lang),
        action: 'completed',
        variant: 'waiting',
        waitingMessage: context.paymentHoldReason || waitMsg('payment_held', lang),
        icon: '⏸️',
      }
    }
    // Faktúra čaká na úhradu od ZR
    if (context?.hasInvoice) {
      return {
        label: label('invoice_awaiting_payment', lang),
        action: 'completed',
        variant: 'waiting',
        waitingMessage: waitMsg('tech_payment', lang),
        icon: '⏳',
      }
    }
    // Technik ešte nevystavil faktúru
    return {
      label: label('issue_invoice', lang),
      action: 'issue_invoice' as TechActionType,
      variant: 'primary',
      icon: '🧾',
      opensForm: 'invoice',
    }
  }

  const entry = BUTTON_TABLE[crmStep]

  // Unknown step — fallback
  if (entry === undefined) {
    return {
      label: label('no_action', lang),
      action: 'completed',
      variant: 'disabled',
    }
  }

  // Direct resolver (steps 0, 1)
  if (typeof entry === 'function') {
    return entry(lang, context)
  }

  // Phase lookup
  if (techPhase === null || techPhase === undefined) {
    const resolver = entry['_null'] || entry['_default']
    if (resolver) return resolver(lang, context)
  } else {
    const resolver = entry[techPhase] || entry['_default']
    if (resolver) return resolver(lang, context)
  }

  // ── Fallback — neznámy stav
  return {
    label: label('no_action', lang),
    action: 'completed',
    variant: 'disabled',
  }
}

// ─── Status Label Helpers ────────────────────────────────────────

/**
 * getCrmStepLabel — human-readable label for the current CRM step.
 * Shown above the smart button in the job card.
 */
export function getCrmStepLabel(crmStep: number, lang: Language): string {
  return getTranslation(lang, `dispatch.crmStatus.${crmStep}`) || `Krok ${crmStep}`
}

/**
 * getTechPhaseLabel — human-readable label for the tech sub-phase.
 * Shown as secondary text under the CRM step label.
 */
export function getTechPhaseLabel(
  techPhase: TechPhase | null | undefined,
  lang: Language,
): string | null {
  if (!techPhase) return null
  return getTranslation(lang, `dispatch.techPhase.${techPhase}`) || null
}
