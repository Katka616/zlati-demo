/**
 * transitionGuards.ts
 *
 * Centralized per-step pipeline validations for the CRM.
 * Called ONLY for forward transitions (targetStep > currentStep).
 * Admin Override (backward) does NOT go through this function.
 */

import type { DBJob } from './db'

// Partner ID constants — must match the `partners` table in the database.
// Server-side code (like this file) ideally looks up partners by code via the DB,
// but transitionGuards is called synchronously from hot paths, so we use a named
// constant instead of a magic number.
const EA_PARTNER_ID = 2 // Europ Assistance — fallback, prefer code-based check
const EA_PARTNER_CODES = ['EA', 'EUROP']

export interface GuardResult {
  valid: boolean
  error?: string   // SK text for UI display
  field?: string   // which field is missing (optional, for UI highlighting)
  overridable?: boolean  // true = operator can override with reason
}

const OK: GuardResult = { valid: true }

export async function validateStepPrerequisites(
  fromStep: number,
  toStep: number,
  job: DBJob,
  requestTechPhase?: string,
): Promise<GuardResult> {
  const cf = (job.custom_fields ?? {}) as Record<string, unknown>
  const key = `${fromStep}_${toStep}`

  switch (key) {
    // ── 0 → 1  Príjem → Dispatching ──
    case '0_1': {
      if (!job.partner_id) {
        return { valid: false, error: 'Priraďte poisťovňu pred posunom na Dispatching', field: 'partner_id', overridable: true }
      }
      if (!job.customer_name) {
        return { valid: false, error: 'Zadajte meno zákazníka', field: 'customer_name', overridable: true }
      }
      if (!job.customer_phone) {
        return { valid: false, error: 'Zadajte telefón zákazníka', field: 'customer_phone', overridable: true }
      }
      return OK
    }

    // ── 1 → 2  Dispatching → Naplánované ──
    case '1_2': {
      if (!job.assigned_to) {
        return { valid: false, error: 'Priraďte technika pred posunom na Naplánované', field: 'assigned_to', overridable: true }
      }
      return OK
    }

    // ── 2 → 3  Naplánované → Na mieste ──
    case '2_3':
      return OK

    // ── 3 → 4  Na mieste → Schvaľovanie ceny ──
    case '3_4': {
      const estimateHours = Number(cf.estimate_hours ?? 0)
      if (estimateHours <= 0) {
        return { valid: false, error: 'Technik ešte neodoslal cenový odhad', field: 'estimate_hours', overridable: true }
      }
      return OK
    }

    // ── 4 → 5  Schvaľovanie ceny → Cenová ponuka klientovi (surcharge path) ──
    case '4_5': {
      const surcharge = Number(cf.client_surcharge ?? 0)
      if (surcharge <= 0) {
        return { valid: false, error: 'Doplatok je nulový — posúvajte priamo na Dokončené', field: 'client_surcharge', overridable: true }
      }
      return OK
    }

    // ── 4 → 6  Schvaľovanie ceny → Dokončené (no-surcharge path) ──
    case '4_6': {
      const approvedPhases = ['estimate_approved', 'client_approved', 'final_price_approved']
      if (!job.tech_phase || !approvedPhases.includes(job.tech_phase)) {
        return { valid: false, error: 'Odhad ešte nie je schválený', field: 'tech_phase', overridable: true }
      }
      return OK
    }

    // ── 5 → 6  Cenová ponuka klientovi → Práca ──
    case '5_6': {
      const decidedPhases = ['client_approved', 'client_declined', 'working']
      const effectivePhase = requestTechPhase || job.tech_phase
      if (!effectivePhase || !decidedPhases.includes(effectivePhase)) {
        return { valid: false, error: 'Klient ešte nerozhodol o doplatku', field: 'tech_phase', overridable: true }
      }
      return OK
    }

    // ── 6 → 7  Práca → Rozpracovaná ──
    case '6_7':
      return OK

    // ── 7 → 8  Rozpracovaná → Dokončené ──
    case '7_8':
      return OK

    // ── 8 → 9  Dokončené → Zúčtovanie ──
    case '8_9': {
      const protocolHistory = cf.protocol_history as Array<Record<string, unknown>> | undefined
      if (!protocolHistory || !Array.isArray(protocolHistory) || protocolHistory.length === 0) {
        return { valid: false, error: 'Technik ešte neodoslal protokol', field: 'protocol_history', overridable: true }
      }

      // Multi-tech: filter entries for current technician
      if ((job.total_assignments ?? 1) > 1) {
        const currentTechId = job.assigned_to
        const matching = protocolHistory.filter((entry) => {
          if (entry.isSettlementEntry) return false
          // Legacy entries without technician_id count for current tech
          if (!entry.technician_id) return true
          return entry.technician_id === currentTechId
        })
        if (matching.length === 0) {
          return { valid: false, error: 'Technik ešte neodoslal protokol', field: 'protocol_history', overridable: true }
        }
      }

      // Validate that at least one visit has valid hours
      const hasValidVisit = protocolHistory.some(entry => {
        if (entry.isSettlementEntry) return false // skip settlement entries
        const pd = entry.protocolData as Record<string, unknown> | undefined
        const hours = Number(pd?.totalHours ?? pd?.hours ?? 0)
        return hours >= 0.5
      })
      if (!hasValidVisit) {
        return { valid: false, error: 'Žiadna návšteva nemá platné hodiny (min. 0.5h)', field: 'protocol_history', overridable: true }
      }

      return OK
    }

    // ── 9 → 10  Zúčtovanie → Cenová kontrola ──
    case '9_10': {
      // Settlement musí byť potvrdené
      if (!cf.settlement_data && !cf.settlement_confirmed_at && !cf.final_pricing) {
        return { valid: false, error: 'Vyúčtovanie ešte nie je potvrdené', field: 'settlement_data', overridable: true }
      }
      // KAŽDÁ návšteva musí mať podpísaný protokol
      // Multi-visit: estimate_visits=2 → treba 2 podpísané protokoly
      const protocols = Array.isArray(cf.protocol_history) ? (cf.protocol_history as Array<Record<string, unknown>>).filter(e => !e.isSettlementEntry) : []
      const signedCount = protocols.filter(e => e.clientSignature || e.client_signature).length + (cf.client_signed_on_device ? 1 : 0)
      const expectedVisits = (cf.estimate_visits as number) || 1
      if (signedCount < expectedVisits) {
        return { valid: false, error: protocols.length === 0 ? 'Chýba servisný protokol' : `Podpísané protokoly: ${signedCount}/${expectedVisits}`, field: 'protocol_history', overridable: true }
      }
      return OK
    }

    // ── 10 → 11  Cenová kontrola → EA odhláška ──
    case '10_11':
      return OK

    // ── 11 → 12  EA odhláška → Fakturácia ──
    case '11_12': {
      // Only Europ Assistance requires EA odhláška
      const partnerCode = ((job as unknown as Record<string, unknown>).partner_code as string) ?? ''
      if (EA_PARTNER_CODES.includes(partnerCode.toUpperCase()) || job.partner_id === EA_PARTNER_ID) {
        const validEaStatuses = ['odhlasena', 'schvalena']
        if (!job.ea_status || !validEaStatuses.includes(job.ea_status)) {
          return { valid: false, error: 'EA odhláška ešte nie je odoslaná', field: 'ea_status', overridable: true }
        }
      }
      return OK
    }

    // ── 12 → 13  Fakturácia → Uhradené ──
    case '12_13': {
      const invoiceDataObj = cf.invoice_data as Record<string, unknown> | undefined
      // Akceptuj systémovo generovanú faktúru (invoice_data existuje) ALEBO manuálne číslo faktúry
      // Manuálne číslo faktúry je teraz v invoice_data.invoiceNumber (nový štandard) alebo invoice_number (starý fallback)
      const hasInvoiceData = !!invoiceDataObj
      const hasManualInvoiceNumber = !!(invoiceDataObj?.invoiceNumber) || !!(cf.invoice_number)
      if (!hasInvoiceData && !hasManualInvoiceNumber) {
        return { valid: false, error: 'Faktúra ešte nebola vytvorená', field: 'invoice_data', overridable: true }
      }
      return OK
    }

    // ── 13 → 14  Uhradené → Uzavreté ──
    case '13_14':
      return OK

    // ── Default: don't block unknown transitions ──
    default:
      return OK
  }
}
