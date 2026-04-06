/**
 * Partner email notification templates — types and config helpers.
 *
 * Config is stored in partners.custom_fields.email_notifications (JSONB).
 * No new DB migration needed.
 */

import { getPartnerById } from '@/lib/db/partners'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AxaTriggerKey =
  | 'unassigned_1h'
  | 'tech_assigned'
  | 'repair_completed'
  | 'diagnostic_only'
  | 'multi_visit'

export interface TriggerConfig {
  enabled: boolean
}

export interface PartnerEmailConfig {
  enabled: boolean
  from_alias: string
  to_address: string
  triggers: Record<AxaTriggerKey, TriggerConfig>
}

export interface AxaEmailData {
  ref: string
  customer_name?: string
  customer_address?: string
  customer_city?: string
  category?: string
  description?: string
  scheduled_date?: string   // formatted 'DD.MM.YYYY'
  scheduled_time?: string
  next_visit_date?: string | null
  diagnostic_reason?: string
}

export interface PartnerEmailResult {
  subject: string
  bodyHtml: string
  bodyText: string
}

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: PartnerEmailConfig = {
  enabled: false,
  from_alias: '',
  to_address: '',
  triggers: {
    unassigned_1h: { enabled: false },
    tech_assigned: { enabled: false },
    repair_completed: { enabled: false },
    diagnostic_only: { enabled: false },
    multi_visit: { enabled: false },
  },
}

/**
 * Extract email notification config from partner's custom_fields.
 * Returns default (disabled) config if not configured.
 */
export function parsePartnerEmailConfig(
  customFields: Record<string, unknown> | null | undefined
): PartnerEmailConfig {
  if (!customFields) return { ...DEFAULT_CONFIG }
  const raw = customFields.email_notifications as Partial<PartnerEmailConfig> | undefined
  if (!raw) return { ...DEFAULT_CONFIG }

  return {
    enabled: raw.enabled === true,
    from_alias: typeof raw.from_alias === 'string' ? raw.from_alias : '',
    to_address: typeof raw.to_address === 'string' ? raw.to_address : '',
    triggers: {
      unassigned_1h: { enabled: raw.triggers?.unassigned_1h?.enabled === true },
      tech_assigned: { enabled: raw.triggers?.tech_assigned?.enabled === true },
      repair_completed: { enabled: raw.triggers?.repair_completed?.enabled === true },
      diagnostic_only: { enabled: raw.triggers?.diagnostic_only?.enabled === true },
      multi_visit: { enabled: raw.triggers?.multi_visit?.enabled === true },
    },
  }
}

/**
 * Get partner email config by partner ID.
 * Returns null if partner not found.
 */
export async function getPartnerEmailConfig(
  partnerId: number
): Promise<PartnerEmailConfig | null> {
  const partner = await getPartnerById(partnerId)
  if (!partner) return null
  return parsePartnerEmailConfig(partner.custom_fields)
}

/**
 * Check if a specific trigger is enabled for a partner.
 */
export function isPartnerEmailEnabled(
  config: PartnerEmailConfig,
  triggerKey: AxaTriggerKey
): boolean {
  return config.enabled && config.triggers[triggerKey]?.enabled === true
}

/** All trigger keys with CZ labels for admin UI */
export const TRIGGER_LABELS: Record<AxaTriggerKey, { label: string; description: string }> = {
  unassigned_1h: {
    label: 'Bez technika (1 hodina)',
    description: 'Odošle sa ak zákazka nemá priradeného technika dlhšie ako 1 hodinu od prijatia.',
  },
  tech_assigned: {
    label: 'Technik priradený',
    description: 'Odošle sa po priradení technika — obsahuje dohodnutý termín zásahu.',
  },
  repair_completed: {
    label: 'Oprava dokončená',
    description: 'Odošle sa po úspešnom dokončení opravy.',
  },
  diagnostic_only: {
    label: 'Ukončené diagnostikou',
    description: 'Odošle sa ak je zákazka ukončená len diagnostikou — obsahuje dôvod.',
  },
  multi_visit: {
    label: 'Rozpracovaná / ďalšia návšteva',
    description: 'Odošle sa ak oprava vyžaduje ďalšiu návštevu — obsahuje predpokladaný termín.',
  },
}
