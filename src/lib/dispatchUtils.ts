/**
 * Shared utilities for the Dispatch (technician) app.
 * Extracted to avoid duplication between /dispatch (Home) and /dispatch/my-jobs (Jobs).
 */

import type { DispatchJob, TechPhase } from '@/types/dispatch'

export interface SectionedJobs {
  overdue: DispatchJob[]
  unscheduled: DispatchJob[]
  today: DispatchJob[]
  tomorrow: DispatchJob[]
  future: DispatchJob[]
}

/** Tech phases that mean the technician is currently on-site or traveling */
const ACTIVE_PHASES = new Set<TechPhase>([
  'offer_sent', 'offer_accepted',
  'en_route', 'arrived',
  'diagnostics', 'diagnostic_completed', 'estimate_draft', 'estimate_submitted',
  'estimate_approved', 'estimate_rejected',
  'client_approval_pending', 'client_approved', 'client_declined',
  'working', 'break',
  'protocol_draft', 'protocol_sent',
  // G3: final price flow
  'work_completed',
  'final_price_submitted', 'final_price_approved', 'final_price_rejected',
  // G4: settlement + final protocol flow
  'settlement_review', 'settlement_correction', 'settlement_approved',
  'price_review', 'surcharge_sent', 'surcharge_approved', 'surcharge_declined', 'price_approved',
  'final_protocol_draft', 'final_protocol_sent', 'final_protocol_signed',
  'invoice_ready',
  // Post-work
  'departed',
])

/** Returns true if the technician is currently actively engaged with this job */
export function isActiveJob(job: DispatchJob): boolean {
  return !!job.techPhase && ACTIVE_PHASES.has(job.techPhase)
}

/** Local YYYY-MM-DD (avoids UTC shift from toISOString) */
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Groups jobs by scheduled date into 5 sections */
export function categorizeJobs(jobs: DispatchJob[]): SectionedJobs {
  const now = new Date()
  const todayStr = localDateStr(now)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = localDateStr(tomorrow)

  const sections: SectionedJobs = {
    overdue: [],
    unscheduled: [],
    today: [],
    tomorrow: [],
    future: [],
  }

  for (const job of jobs) {
    if (!job.scheduledDate) {
      sections.unscheduled.push(job)
    } else {
      const jobDate = job.scheduledDate.split('T')[0]
      if (jobDate === todayStr) {
        sections.today.push(job)
      } else if (jobDate === tomorrowStr) {
        sections.tomorrow.push(job)
      } else if (jobDate > tomorrowStr) {
        sections.future.push(job)
      } else {
        // Past scheduled date → overdue (separate section, NOT mixed with today)
        sections.overdue.push(job)
      }
    }
  }

  return sections
}

/**
 * Returns true if the job needs a next visit to be scheduled
 * (multi-visit / continuing repair with no scheduled date).
 */
export function needsScheduling(job: DispatchJob): boolean {
  const cf = job.customFields as Record<string, unknown> | undefined
  if (!cf) return false

  // Estimate says next visit needed
  const needsNext = cf.estimate_needs_next_visit === true
  // Protocol type is multi_visit
  const isMultiVisit = cf.protocol_type === 'multi_visit'

  if (!needsNext && !isMultiVisit) return false

  // Already has a future scheduled date → doesn't need scheduling
  if (job.scheduledDate) {
    const today = new Date().toISOString().split('T')[0]
    if (job.scheduledDate.split('T')[0] >= today) return false
  }

  // Job is completed/closed → doesn't need scheduling
  if (job.status === 'completed' || job.status === 'cancelled') return false

  return true
}

/**
 * Sort jobs by scheduled date + time ascending.
 * Primary sort: date (earlier first). Secondary sort: time (earlier first).
 * Jobs without date/time go to the end.
 */
export function sortByScheduledTime(jobs: DispatchJob[]): DispatchJob[] {
  return [...jobs].sort((a, b) => {
    // First sort by date
    const dateA = a.scheduledDate?.split('T')[0] ?? ''
    const dateB = b.scheduledDate?.split('T')[0] ?? ''
    if (dateA !== dateB) {
      if (!dateA) return 1
      if (!dateB) return -1
      return dateA < dateB ? -1 : 1
    }
    // Then by time within the same date
    const timeA = parseTimeStart(a.scheduledTime)
    const timeB = parseTimeStart(b.scheduledTime)
    if (timeA === null && timeB === null) return 0
    if (timeA === null) return 1
    if (timeB === null) return -1
    return timeA - timeB
  })
}

function parseTimeStart(time?: string): number | null {
  if (!time) return null
  const match = time.match(/(\d{1,2}):(\d{2})/)
  if (!match) return null
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

/**
 * Safely open an external URL on mobile (Google Maps, etc.).
 *
 * On iOS PWA (standalone mode), window.open() can navigate the current
 * webview instead of opening a new tab, destroying app state and causing
 * a freeze when the user returns. Creating a temporary <a> element with
 * target="_blank" and rel="noopener" is handled correctly by all mobile
 * browsers and PWA shells.
 */
export function openExternalUrl(url: string): void {
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  // Remove after a tick to keep the DOM clean
  setTimeout(() => a.remove(), 100)
}

/**
 * Open Google Maps navigation to a given address.
 */
export function openGoogleMapsNavigation(address: string, city: string): void {
  const destination = [address, city].filter(Boolean).join(', ')
  openExternalUrl(
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
  )
}

/**
 * Returns true if the job is "done working" from the technician's perspective.
 * These jobs belong in the Completed tab (invoice/payment lifecycle).
 *
 * A job is completed when:
 * - crmStep >= 10 (CRM pipeline past tech involvement)
 * - OR techPhase is invoice_ready/departed (work done, needs invoice)
 * - OR status is cancelled/uzavrete/archived
 */
export function isCompletedJob(job: DispatchJob): boolean {
  const step = job.crmStep ?? 0
  const phase = job.techPhase ?? ''
  const status = job.status ?? ''

  // CRM pipeline past tech's active involvement
  if (step >= 10) return true

  // Tech finished work — only invoice/departure remains
  if (phase === 'invoice_ready' || phase === 'departed') return true

  // Terminal statuses
  if (['09. zrusene', 'cancelled', 'uzavrete', 'archived'].some(s => status.includes(s))) return true

  return false
}

/**
 * Returns the invoice lifecycle status for a completed job.
 * Used for filter chips in the Completed tab.
 */
export type InvoiceLifecycleStatus = 'needs_invoice' | 'awaiting_payment' | 'paid'

export function getInvoiceLifecycleStatus(job: DispatchJob): InvoiceLifecycleStatus {
  const cf = (job.customFields ?? job as any) as Record<string, unknown>
  const isPaid = cf?.payment_status === 'paid' ||
    (cf?.invoice_data as Record<string, unknown> | null)?.invoice_status === 'paid'
  if (isPaid) return 'paid'
  if (cf?.invoice_data) return 'awaiting_payment'
  return 'needs_invoice'
}

// getStatusBadge moved to src/lib/statusBadge.ts — single source of truth
