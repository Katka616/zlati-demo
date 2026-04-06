/**
 * Automation Triggers — Zlatí Řemeslníci CRM
 *
 * Thin fire-and-forget wrappers around fireTrigger().
 * Import and call these from API route handlers.
 * Never await — never propagate errors — never block the HTTP response.
 *
 * Usage:
 *   import { fireAutomationTrigger } from '@/lib/automationTriggers'
 *   // Inside an API route handler, after performing the main action:
 *   fireAutomationTrigger('status_change', job.id, { from_step: 2, to_step: 3 })
 */

import { fireTrigger } from '@/lib/automationEngine'
import type { TriggerType } from '@/types/automation'

/**
 * Fire an automation trigger without blocking.
 * All errors are caught and logged internally — this function always returns void.
 */
export function fireAutomationTrigger(
  type: TriggerType,
  jobId?: number,
  data: Record<string, unknown> = {}
): void {
  fireTrigger({ type, jobId, data }).catch((err) => {
    console.error('[AutomationEngine] Unhandled trigger error:', type, jobId, err)
  })
}
