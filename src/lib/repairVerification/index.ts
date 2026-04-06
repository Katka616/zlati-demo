/**
 * Post-Repair Photo Verification — public API.
 *
 * Entry point for protocol submission routes and admin re-run.
 * Calls GPT-4o vision to verify repair photos against diagnostic photos and declared materials.
 *
 * Safety limits (configured in visionVerify.ts):
 *   - Cooldown: 5 min between analyses of the same job (auto calls)
 *   - Max attempts: 5 per job lifetime (hard limit)
 *   - Global rate: 50 per hour (cost ceiling ~$2.50/hr)
 *   - In-flight lock: no concurrent duplicates
 */
import { runRepairVerification, type RepairVerification } from './visionVerify'

/**
 * Verify repair photos for a job (fire-and-forget safe).
 * Respects cooldown — won't re-run if analyzed less than 5 min ago.
 */
export async function verifyRepairPhotos(jobId: number): Promise<RepairVerification | null> {
  return runRepairVerification(jobId)
}

/**
 * Force re-verify repair photos (operator manual re-run).
 * Skips cooldown but still respects max attempts per job.
 */
export async function forceVerifyRepairPhotos(jobId: number): Promise<RepairVerification | null> {
  return runRepairVerification(jobId, { force: true })
}

export type { RepairVerification, RepairVerificationPart, RepairVerificationRedFlag } from './visionVerify'
