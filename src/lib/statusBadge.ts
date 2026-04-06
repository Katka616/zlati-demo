/**
 * statusBadge.ts — Shared badge mapping utility
 *
 * Maps (crmStep, techPhase) → JobStatusBadge (15 possible values).
 * Single source of truth — used by all dispatch pages.
 */

import type { JobStatusBadge, TechPhase } from '@/types/dispatch'

/**
 * getStatusBadge — maps CRM step + tech phase to a user-facing status badge.
 *
 * Badge values (15): new, assigned, scheduled, on_the_way, arrived,
 * in_progress, diagnostic_done, awaiting_approval, approved, disputed,
 * protocol_created, completed, invoiced, paid, cancelled
 *
 * CRM Steps (0-14):
 *  0-5: prijem → cenova_ponuka_klientovi (unchanged)
 *  6: praca (NOVÝ), 7: rozpracovana (NOVÝ)
 *  8: dokoncene (bolo 6), 9: zuctovanie (bolo 7)
 * 10: cenova_kontrola (bolo 8), 11: ea_odhlaska (bolo 9)
 * 12: fakturacia (bolo 10), 13: uhradene (bolo 11), 14: uzavrete (bolo 12)
 */
export function getStatusBadge(
  crmStep: number,
  techPhase?: TechPhase | null,
): JobStatusBadge {
  // Steps 0-1: New / Assigned
  if (crmStep === 0) return 'new'
  if (crmStep === 1) return 'assigned'

  // Step 2: Scheduled → on_the_way → arrived
  if (crmStep === 2) {
    if (techPhase === 'en_route') return 'on_the_way'
    if (techPhase === 'arrived') return 'arrived'
    return 'scheduled'
  }

  // Step 3: On site — diagnostics
  if (crmStep === 3) {
    if (techPhase === 'arrived') return 'arrived'
    if (techPhase === 'diagnostics' || techPhase === 'estimate_draft') return 'in_progress'
    if (techPhase === 'diagnostic_completed') return 'in_progress'
    if (techPhase === 'estimate_submitted') return 'diagnostic_done'
    return 'in_progress'
  }

  // Step 4: Awaiting CRM approval
  if (crmStep === 4) {
    if (techPhase === 'estimate_approved') return 'approved'
    if (techPhase === 'estimate_rejected') return 'awaiting_approval'
    return 'awaiting_approval'
  }

  // Step 5: Client surcharge approval
  if (crmStep === 5) {
    if (techPhase === 'client_approved') return 'approved'
    if (techPhase === 'client_declined') return 'disputed'
    return 'awaiting_approval'
  }

  // Step 6: praca (NOVÝ) — technik pracuje
  if (crmStep === 6) {
    if (techPhase === 'estimate_approved' || techPhase === 'client_approved') return 'approved'
    if (techPhase === 'working' || techPhase === 'break') return 'in_progress'
    if (techPhase === 'caka_material') return 'in_progress'
    if (techPhase === 'awaiting_next_visit') return 'in_progress'
    if (techPhase === 'work_completed') return 'in_progress'
    if (techPhase === 'final_price_submitted') return 'awaiting_approval'
    if (techPhase === 'final_price_approved') return 'approved'
    if (techPhase === 'final_price_rejected') return 'awaiting_approval'
    return 'in_progress'
  }

  // Step 7: rozpracovana (NOVÝ) — čaká na ďalší výjazd
  if (crmStep === 7) {
    if (techPhase === 'protocol_draft' || techPhase === 'protocol_sent') return 'protocol_created'
    return 'in_progress'
  }

  // Step 8: dokoncene (bolo 6) — Work done / protocol (G3 flow)
  if (crmStep === 8) {
    // Stale phase from approval step — CRM already advanced past approval
    if (techPhase === 'estimate_approved' || techPhase === 'client_approved') return 'approved'

    if (techPhase === 'working' || techPhase === 'break') return 'in_progress'
    if (techPhase === 'awaiting_next_visit' || techPhase === 'caka_material') return 'in_progress'
    if (techPhase === 'work_completed') return 'in_progress'

    // Schvaľovanie ceny (G3) — PRED protokolom
    if (techPhase === 'final_price_submitted') return 'awaiting_approval'
    if (techPhase === 'final_price_approved') return 'approved'
    if (techPhase === 'final_price_rejected') return 'awaiting_approval'

    // Starší flow: protokol
    if (techPhase === 'protocol_draft' || techPhase === 'protocol_sent') return 'protocol_created'
    if (techPhase === 'departed') return 'completed'
    return 'in_progress'
  }

  // Step 9: zuctovanie (bolo 7) — settlement + final protocol (G4 flow)
  if (crmStep === 9) {
    if (techPhase === 'settlement_review' || techPhase === 'settlement_correction') return 'in_progress'
    if (techPhase === 'settlement_approved') return 'in_progress'
    if (techPhase === 'price_review' || techPhase === 'surcharge_sent') return 'awaiting_approval'
    if (techPhase === 'surcharge_approved' || techPhase === 'price_approved') return 'approved'
    if (techPhase === 'surcharge_declined') return 'disputed'
    if (techPhase === 'final_protocol_draft' || techPhase === 'final_protocol_sent') return 'protocol_created'
    if (techPhase === 'final_protocol_signed') return 'completed'
    if (techPhase === 'invoice_ready') return 'invoiced'
    if (techPhase === 'departed') return 'completed'
    return 'in_progress'
  }

  // Steps 10-11: cenova_kontrola / ea_odhlaska (bolo 8-9) — Invoicing prebieha
  if (crmStep === 10 || crmStep === 11) return 'invoicing'

  // Step 12: Fakturácia (bolo 10) — Invoicing
  if (crmStep === 12) return 'invoiced'

  // Step 13: Uhradené (bolo 11) — zákazka uhradená, de facto dokončená
  if (crmStep === 13) return 'completed'

  // Step 14+: Uzavreté (bolo 12) — Closed
  return 'completed'
}
