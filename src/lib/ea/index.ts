/**
 * EA / DHA Integration domain — barrel re-export
 *
 * Import from here for a clean domain path:
 *   import { DhaClient } from '@/lib/ea'
 *   import { submitToEa } from '@/lib/ea'
 *
 * Original file paths continue to work for backward compatibility.
 */

export * from '../dha-client'
export * from '../dha-integration'
export * from '../eaSubmissionService'
export * from '../eaPayloadBuilder'
export * from '../eaReporting'
