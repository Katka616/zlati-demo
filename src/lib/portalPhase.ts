/**
 * portalPhase.ts — Portal phase normalisation helpers.
 *
 * Extracted from src/data/mockData.ts (UX-6 split).
 * These are pure computation functions with no mock-data dependency.
 */

export type PortalPhase =
  | 'diagnostic'
  | 'technician'
  | 'technician_on_way'
  | 'schedule_confirmation'
  | 'in_progress'
  | 'onsite_diagnosis'
  | 'surcharge'
  | 'awaiting_surcharge_approval'
  | 'work_in_progress'
  | 'work_paused'
  | 'ordering_parts'
  | 'awaiting_next_visit'
  | 'protocol'
  | 'awaiting_protocol_signature'
  | 'settlement_review'
  | 'rating'
  | 'closed'

export type BasePortalPhase =
  | 'diagnostic'
  | 'technician'
  | 'schedule_confirmation'
  | 'in_progress'
  | 'surcharge'
  | 'protocol'
  | 'rating'
  | 'closed'

/**
 * Collapses detailed portal phases into a base phase for progress indicators.
 */
export function normalizePortalPhase(phase: PortalPhase): BasePortalPhase {
  switch (phase) {
    case 'technician_on_way':
      return 'technician'
    case 'onsite_diagnosis':
    case 'work_in_progress':
    case 'work_paused':
    case 'ordering_parts':
    case 'awaiting_next_visit':
      return 'in_progress'
    case 'awaiting_surcharge_approval':
      return 'surcharge'
    case 'awaiting_protocol_signature':
      return 'protocol'
    case 'settlement_review':
      return 'rating'
    default:
      return phase
  }
}
