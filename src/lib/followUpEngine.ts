/**
 * Follow-Up Engine — systém pre sledovanie follow-upov zákaziek.
 *
 * Pre KAŽDÚ zákazku vie:
 * - Čo je ďalší krok
 * - Kedy to malo byť hotové
 * - Koľko času zostáva / o koľko je to po termíne
 *
 * Čisto frontend výpočet — žiadne DB závislosti.
 */

// Partner ID constants — must match the `partners` table in the database.
// If partner IDs change (e.g. after a DB re-seed), update these values.
// Prefer checking by partner code where possible (see transitionGuards.ts for
// server-side code that has DB access). These constants are used here only
// because followUpEngine is a pure synchronous client-side module.
const EA_PARTNER_ID = 2 // Europ Assistance

// ─── Types ──────────────────────────────────────

export interface FollowUpRule {
  /** Which crm_step this rule applies to */
  step: number
  /** Additional condition check on job data */
  condition?: (job: FollowUpJob) => boolean
  /** Action text shown to operator */
  actionText: string
  /** Max hours before this becomes overdue */
  deadlineHours: number
  /** Priority: higher = more urgent */
  priority: 'critical' | 'high' | 'medium' | 'low'
  /** Icon for display */
  icon: string
}

export interface FollowUpJob {
  id: number
  reference_number: string
  crm_step: number
  status: string
  assigned_to: number | null
  customer_name: string | null
  customer_phone: string | null
  customer_address: string | null
  partner_id: number | null
  category: string | null
  description: string | null
  scheduled_date: string | null
  due_date: string | null
  updated_at: string
  created_at: string
  tech_phase: string | null
  custom_fields: Record<string, unknown> | null
}

export interface FollowUp {
  jobId: number
  jobRef: string
  actionText: string
  icon: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  /** Hours overdue (negative = still has time, positive = overdue) */
  hoursOverdue: number
  /** Human-readable time info */
  timeText: string
  /** Step number for linking */
  step: number
}

// ─── Rules ──────────────────────────────────────

const FOLLOW_UP_RULES: FollowUpRule[] = [
  // Step 0: Príjem — zákazka čaká na spracovanie
  {
    step: 0,
    actionText: 'Spracovať novú zákazku',
    deadlineHours: 2,
    priority: 'high',
    icon: '📥',
  },
  {
    step: 0,
    condition: (j) => !j.partner_id || !j.customer_phone || !j.customer_address,
    actionText: 'Doplniť chýbajúce údaje',
    deadlineHours: 1,
    priority: 'critical',
    icon: '⚠️',
  },

  // Step 1: Dispatching — hľadanie technika
  {
    step: 1,
    condition: (j) => !j.assigned_to,
    actionText: 'Nájsť a priradiť technika',
    deadlineHours: 4,
    priority: 'critical',
    icon: '🔍',
  },
  {
    step: 1,
    condition: (j) => !!j.assigned_to,
    actionText: 'Potvrdiť s technikom a naplánovať',
    deadlineHours: 2,
    priority: 'high',
    icon: '📞',
  },

  // Step 2: Naplánované — potvrdenie termínu
  {
    step: 2,
    condition: (j) => {
      if (!j.scheduled_date) return true
      const scheduled = new Date(j.scheduled_date)
      const now = new Date()
      const hoursUntil = (scheduled.getTime() - now.getTime()) / 3_600_000
      return hoursUntil < 24 && hoursUntil > 0
    },
    actionText: 'Potvrdiť zajtrajší termín s technikom',
    deadlineHours: 24,
    priority: 'high',
    icon: '📅',
  },

  // Step 4: Schválenie odhadu
  {
    step: 4,
    actionText: 'Schváliť odhad technika',
    deadlineHours: 4,
    priority: 'high',
    icon: '💱',
  },

  // Step 5: Ponuka klientovi — čaká na klienta
  {
    step: 5,
    actionText: 'Kontaktovať klienta — čaká na súhlas s doplatkom',
    deadlineHours: 24,
    priority: 'high',
    icon: '🤝',
  },

  // Step 6: Dokončené — spracovať protokol (nie pre multi-visit čakajúce na ďalšiu návštevu)
  {
    step: 6,
    condition: (j) => j.tech_phase !== 'awaiting_next_visit',
    actionText: 'Spracovať protokol a poslať na kontrolu',
    deadlineHours: 4,
    priority: 'medium',
    icon: '✅',
  },
  // Step 6: Multi-visit — dohodnúť termín ďalšej návštevy
  {
    step: 6,
    condition: (j) => j.tech_phase === 'awaiting_next_visit',
    actionText: 'Dohodnúť termín ďalšej návštevy',
    deadlineHours: 24,
    priority: 'medium',
    icon: '🗓️',
  },

  // Step 7: Zúčtovanie — skontrolovať vyúčtovanie
  {
    step: 7,
    actionText: 'Skontrolovať vyúčtovanie technika',
    deadlineHours: 8,
    priority: 'medium',
    icon: '📊',
  },

  // Step 8: Cenová kontrola — ORACLE
  {
    step: 8,
    actionText: 'Skontrolovať cenovú kalkuláciu (ORACLE)',
    deadlineHours: 4,
    priority: 'medium',
    icon: '💰',
  },

  // Step 9: EA Odhláška
  {
    step: 9,
    condition: (j) => j.partner_id === EA_PARTNER_ID, // Only for Europ Assistance
    actionText: 'Odoslať EA odhlášku',
    deadlineHours: 24,
    priority: 'high',
    icon: '📋',
  },

  // Step 10: Fakturácia
  {
    step: 10,
    actionText: 'Odoslať faktúru',
    deadlineHours: 48,
    priority: 'medium',
    icon: '🧾',
  },

  // Step 11: Uhradené — čaká na platbu
  {
    step: 11,
    actionText: 'Skontrolovať prijatie platby',
    deadlineHours: 336, // 14 days
    priority: 'low',
    icon: '💳',
  },
]

// ─── Engine ─────────────────────────────────────

function hoursAgo(dateStr: string): number {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 0
  return (Date.now() - d.getTime()) / 3_600_000
}

function formatTimeText(hoursOverdue: number): string {
  if (hoursOverdue <= 0) {
    const remaining = Math.abs(hoursOverdue)
    if (remaining < 1) return `${Math.round(remaining * 60)} min zostáva`
    if (remaining < 24) return `${Math.round(remaining)} h zostáva`
    return `${Math.round(remaining / 24)} d zostáva`
  }
  if (hoursOverdue < 1) return `${Math.round(hoursOverdue * 60)} min po termíne`
  if (hoursOverdue < 24) return `${Math.round(hoursOverdue)} h po termíne`
  return `${Math.round(hoursOverdue / 24)} d po termíne`
}

/**
 * Compute follow-ups for a list of jobs.
 * Returns sorted by urgency (most urgent first).
 */
export function computeFollowUps(jobs: FollowUpJob[]): FollowUp[] {
  const result: FollowUp[] = []

  for (const job of jobs) {
    // Skip completed, cancelled, on_hold jobs
    if (['completed', 'cancelled', 'on_hold', 'reklamacia'].includes(job.status)) continue
    // Skip step 14 (uzavreté)
    if (job.crm_step >= 14) continue

    const applicableRules = FOLLOW_UP_RULES.filter(r => {
      if (r.step !== job.crm_step) return false
      if (r.condition && !r.condition(job)) return false
      return true
    })

    // Take the highest-priority matching rule
    const rule = applicableRules.sort((a, b) => {
      const prio = { critical: 0, high: 1, medium: 2, low: 3 }
      return prio[a.priority] - prio[b.priority]
    })[0]

    if (!rule) continue

    const elapsed = hoursAgo(job.updated_at)
    const hoursOverdue = elapsed - rule.deadlineHours

    result.push({
      jobId: job.id,
      jobRef: job.reference_number || `#${job.id}`,
      actionText: rule.actionText,
      icon: rule.icon,
      priority: rule.priority,
      hoursOverdue,
      timeText: formatTimeText(hoursOverdue),
      step: job.crm_step,
    })
  }

  // Sort: overdue first (desc), then by priority, then by hours overdue
  result.sort((a, b) => {
    // Overdue items always first
    const aOverdue = a.hoursOverdue > 0 ? 1 : 0
    const bOverdue = b.hoursOverdue > 0 ? 1 : 0
    if (aOverdue !== bOverdue) return bOverdue - aOverdue

    // Then by priority
    const prio = { critical: 0, high: 1, medium: 2, low: 3 }
    if (prio[a.priority] !== prio[b.priority]) return prio[a.priority] - prio[b.priority]

    // Then by how overdue
    return b.hoursOverdue - a.hoursOverdue
  })

  return result
}

/**
 * Get a single follow-up for a specific job.
 * Used in job detail to show "next action" bar.
 */
export function getJobFollowUp(job: FollowUpJob): FollowUp | null {
  const results = computeFollowUps([job])
  return results[0] || null
}

/**
 * Priority color mapping for UI.
 */
export function followUpColor(priority: FollowUp['priority'], overdue: boolean): {
  bg: string; border: string; text: string
} {
  if (overdue) return { bg: '#FEF2F2', border: '#F87171', text: '#991B1B' }
  switch (priority) {
    case 'critical': return { bg: '#FFF7ED', border: '#FB923C', text: '#9A3412' }
    case 'high': return { bg: '#FFFBEB', border: '#FBBF24', text: '#92400E' }
    case 'medium': return { bg: '#F0FDF4', border: '#86EFAC', text: '#166534' }
    case 'low': return { bg: '#F9FAFB', border: '#D1D5DB', text: '#4B5563' }
  }
}
