/**
 * webhooks.ts — DEPRECATED
 *
 * Make.com webhook integration removed 2026-03-08.
 * All automation now runs internally within the CRM.
 *
 * This file is kept with stub exports to prevent import errors during cleanup.
 * Safe to delete once all imports are removed.
 */

// Stub exports to prevent import errors during transition
export function notifyStatusChange(): void { /* removed */ }
export function notifyGenericEvent(): void { /* removed */ }
export function buildStatusChangePayload(opts: Record<string, unknown>): Record<string, unknown> { return opts }
