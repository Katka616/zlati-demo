/**
 * Vision-based post-repair photo verification for the insurance CRM.
 *
 * Uses GPT-4o vision to verify that the declared repair was actually performed:
 *   - Compares before-photos (portal_diagnostic) with after-photos (protocol_photo, Po_oprave)
 *   - Cross-checks declared spare parts against what is visible in after-photos
 *   - Detects red flags: identical photos, parts mismatch, incomplete work, messy workspace
 *
 * Runs fire-and-forget after protocol submission.
 * Result saved to custom_fields.repair_verification.
 * If any red_flag is medium/high severity, also sets custom_fields.repair_verification_alert = true.
 */

import { visionCompletion, parseLLMJson } from '@/lib/llm'
import { query, getJobPhotos, getJobById } from '@/lib/db'

/**
 * Sanitize technician/job data before embedding in LLM prompts.
 * Strips control characters and HTML tags to prevent prompt injection.
 */
function sanitizeForPrompt(s: string, maxLen = 300): string {
  return s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .slice(0, maxLen)
}

// ─────────────────────────────────────────────────────────
// Exported interfaces
// ─────────────────────────────────────────────────────────

export interface RepairVerificationPart {
  name: string
  visible_in_photo: 'yes' | 'no' | 'uncertain'
  comment: string
}

export interface RepairVerificationRedFlag {
  type: 'identical_photos' | 'parts_mismatch' | 'incomplete_repair' | 'messy_workspace' | 'suspicious'
  description: string
  severity: 'low' | 'medium' | 'high'
}

export interface RepairVerification {
  verdict: 'verified' | 'partial' | 'unverifiable' | 'concerns'
  fault_resolved: { assessment: 'yes' | 'no' | 'uncertain'; evidence: string }
  before_after_comparison: string
  parts_assessment: RepairVerificationPart[]
  parts_match: 'consistent' | 'inconsistent' | 'partially_consistent' | 'no_parts_declared' | 'cannot_assess'
  work_quality: { rating: 'professional' | 'acceptable' | 'poor' | 'cannot_assess'; observations: string[] }
  red_flags: RepairVerificationRedFlag[]
  summary: string
  confidence: 'high' | 'medium' | 'low'
  analyzed_at: string
  before_photos_used: number
  after_photos_used: number
  parts_declared: number
  verification_version: string
}

// ─────────────────────────────────────────────────────────
// Prompts
// ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Jsi nezávislý auditor oprav pro pojišťovací servisní společnost.
Dostaneš fotografické důkazy z pojistné servisní zakázky:
  - FOTKY PŘED OPRAVOU (od zákazníka před příjezdem technika)
  - FOTKY PO OPRAVĚ (pořízené technikem po dokončení práce)
  - SEZNAM MATERIÁLU deklarovaného technikem v protokolu

Tvůj úkol:
1. POROVNAT stav před a po opravě — vidí se změna?
2. OVĚŘIT jestli deklarovaná závada byla vizuálně opravena
3. ZKONTROLOVAT jestli deklarovaný materiál odpovídá tomu co je vidět na fotce
4. ZHODNOTIT kvalitu provedené práce (čistota, profesionalita, uklizenost pracoviště)
5. DETEKOVAT podezřelé situace (identické fotky, nesrovnalosti, nedokončená práce)

KRITICKÁ PRAVIDLA:
- Pokud fotka "po opravě" vypadá IDENTICKY jako fotka "před opravou" → VŽDY napiš red_flag typu "identical_photos" se severity "high"
- Pokud technik deklaruje výměnu konkrétního dílu (např. "baterie", "kartuše", "ventil") ale na fotce není viditelná změna → napiš red_flag "parts_mismatch"
- Pokud oprava vypadá nedokončená (otevřené spoje, chybějící krytky, nezapojené vedení) → red_flag "incomplete_repair"
- Pokud je pracoviště zanechané v nepořádku (zbytky materiálu, nářadí, voda na podlaze) → red_flag "messy_workspace"
- Buď objektivní — i dobrá práce může být "cannot_assess" pokud fotky ukazují špatný úhel nebo jsou rozmazané
- NEVYMÝŠLEJ co vidíš — pokud fotky jsou špatné kvality, napiš "cannot_assess" a vysvětli proč
- Pokud nejsou k dispozici fotky "před opravou", analýzu proveď jen z fotek "po opravě" — porovnání nebude možné ale kvalitu a materiál lze posoudit

Odpověz STRIKTNĚ jako JSON objekt (žádný text navíc).`

const RESPONSE_SCHEMA = `{
  "verdict": "verified|partial|unverifiable|concerns",
  "fault_resolved": {
    "assessment": "yes|no|uncertain",
    "evidence": "string — co vidíš na fotce že závada je/není opravena"
  },
  "before_after_comparison": "string — porovnání před a po (nebo 'Fotky před opravou nejsou k dispozici')",
  "parts_assessment": [
    {
      "name": "string — název dílu z protokolu",
      "visible_in_photo": "yes|no|uncertain",
      "comment": "string — co vidíš na fotce ohledně tohoto dílu"
    }
  ],
  "parts_match": "consistent|inconsistent|partially_consistent|no_parts_declared|cannot_assess",
  "work_quality": {
    "rating": "professional|acceptable|poor|cannot_assess",
    "observations": ["string — konkrétní pozorování o kvalitě"]
  },
  "red_flags": [
    {
      "type": "identical_photos|parts_mismatch|incomplete_repair|messy_workspace|suspicious",
      "description": "string — popis problému",
      "severity": "low|medium|high"
    }
  ],
  "summary": "string — 1-2 věty shrnutí pro operátora",
  "confidence": "high|medium|low"
}`

const VERIFICATION_VERSION = '1.0'

// ─────────────────────────────────────────────────────────
// Safety limits — anti-loop, cost control
// ─────────────────────────────────────────────────────────

/** Minimum seconds between analyses of the same job (fire-and-forget protection) */
const COOLDOWN_SECONDS = 300 // 5 minutes

/** Maximum total analyses per single job (prevents infinite retries) */
const MAX_ATTEMPTS_PER_JOB = 5

/** Maximum analyses across ALL jobs per hour (cost ceiling) */
const MAX_GLOBAL_PER_HOUR = 50

/** In-memory tracker for global rate limiting (resets on process restart) */
const globalCallLog: number[] = []

/** In-memory set of jobs currently being analyzed (prevents concurrent duplicate calls) */
const inFlightJobs = new Set<number>()

/**
 * Check global hourly rate limit.
 * Prunes entries older than 1 hour, then checks count.
 */
function checkGlobalRateLimit(): { ok: boolean; count: number } {
  const oneHourAgo = Date.now() - 3600_000
  // Prune old entries
  while (globalCallLog.length > 0 && globalCallLog[0] < oneHourAgo) {
    globalCallLog.shift()
  }
  return { ok: globalCallLog.length < MAX_GLOBAL_PER_HOUR, count: globalCallLog.length }
}

/**
 * Load globalCallLog from DB on startup (survives process restarts).
 * Fail-open: if DB unavailable, in-memory log is used as-is.
 */
async function loadGlobalCallLog(): Promise<void> {
  try {
    const { getPool } = await import('../db-postgres')
    const pool = getPool()
    const res = await pool.query(`SELECT value FROM app_settings WHERE key = 'repair_verify_rate_log'`)
    if (res.rows.length > 0) {
      const saved = JSON.parse(res.rows[0].value) as number[]
      const hourAgo = Date.now() - 3600_000
      globalCallLog.length = 0
      globalCallLog.push(...saved.filter((t: number) => t > hourAgo))
    }
  } catch { /* fail open */ }
}

/**
 * Persist globalCallLog to DB so rate limiting survives process restarts.
 * Fail-silent: errors here must not block the main verification flow.
 */
async function saveGlobalCallLog(): Promise<void> {
  try {
    const { getPool } = await import('../db-postgres')
    const pool = getPool()
    const hourAgo = Date.now() - 3600_000
    const recent = globalCallLog.filter((t: number) => t > hourAgo)
    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES ('repair_verify_rate_log', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [JSON.stringify(recent)],
    )
  } catch { /* fail silently */ }
}

// ─────────────────────────────────────────────────────────
// Main function
// ─────────────────────────────────────────────────────────

/**
 * Run post-repair photo verification for a job.
 *
 * Safety limits:
 *   - Cooldown: min 5 min between analyses of the same job (skip unless force=true)
 *   - Max attempts: max 5 analyses per job lifetime (hard limit, even with force)
 *   - Global rate: max 50 analyses per hour across all jobs (cost ceiling)
 *   - In-flight lock: prevents concurrent duplicate calls for the same job
 *
 * @param jobId - Job ID to verify
 * @param options.force - Skip cooldown check (for manual operator re-run). Max attempts still enforced.
 * @returns RepairVerification result, or null if skipped/insufficient data
 */
export async function runRepairVerification(
  jobId: number,
  options?: { force?: boolean },
): Promise<RepairVerification | null> {
  const force = options?.force ?? false

  try {
    // ── Safety: prevent concurrent duplicate calls ──
    if (inFlightJobs.has(jobId)) {
      console.log(`[RepairVerify] Job ${jobId}: already in-flight — skipping duplicate call`)
      return null
    }
    inFlightJobs.add(jobId)

    // ── Safety: global hourly rate limit (load from DB first for cross-restart accuracy) ──
    await loadGlobalCallLog()
    const { ok: globalOk, count: globalCount } = checkGlobalRateLimit()
    if (!globalOk) {
      console.warn(`[RepairVerify] Global rate limit reached (${globalCount}/${MAX_GLOBAL_PER_HOUR} per hour) — skipping job ${jobId}`)
      inFlightJobs.delete(jobId)
      return null
    }

    // ── Safety: check existing result for cooldown + max attempts ──
    const existingRows = await query(
      `SELECT custom_fields->'repair_verification' as rv,
              custom_fields->'repair_verification_attempts' as attempts
       FROM jobs WHERE id = $1`,
      [jobId],
    )
    const existing = existingRows?.rows?.[0]
    const existingRv = existing?.rv as RepairVerification | null
    const attempts = (existing?.attempts as number) || 0

    // Hard limit: max attempts per job (even with force)
    if (attempts >= MAX_ATTEMPTS_PER_JOB) {
      console.warn(`[RepairVerify] Job ${jobId}: max attempts reached (${attempts}/${MAX_ATTEMPTS_PER_JOB}) — blocked`)
      inFlightJobs.delete(jobId)
      return existingRv
    }

    // Cooldown: skip if analyzed recently (unless force)
    if (!force && existingRv?.analyzed_at) {
      const lastAnalyzed = new Date(existingRv.analyzed_at).getTime()
      const elapsed = (Date.now() - lastAnalyzed) / 1000
      if (elapsed < COOLDOWN_SECONDS) {
        console.log(`[RepairVerify] Job ${jobId}: cooldown active (${Math.round(elapsed)}s < ${COOLDOWN_SECONDS}s) — skipping`)
        inFlightJobs.delete(jobId)
        return existingRv
      }
    }

    // Record this attempt in the global log and persist to DB
    globalCallLog.push(Date.now())
    void saveGlobalCallLog()
    // 1. Fetch after-photos: protocol_photo source, filename contains Po_oprave or po_oprave
    const protocolPhotos = await getJobPhotos(jobId, 'protocol_photo')
    let afterPhotos = protocolPhotos.filter(p =>
      p.filename && (p.filename.includes('Po_oprave') || p.filename.includes('po_oprave'))
    )

    // Fallback: technician_dispatch photos if no Po_oprave photos found
    if (afterPhotos.length === 0) {
      const dispatchPhotos = await getJobPhotos(jobId, 'technician_dispatch')
      afterPhotos = dispatchPhotos
    }

    // Filter to only photos with valid base64 data URLs
    const validAfterPhotos = afterPhotos.filter(p => p.data && p.data.startsWith('data:'))

    if (validAfterPhotos.length === 0) {
      console.log('[RepairVerify] No after-repair photos with valid data for job', jobId, '— skipping verification')
      return null
    }

    // 2. Fetch before-photos: portal_diagnostic source
    const beforePhotos = await getJobPhotos(jobId, 'portal_diagnostic')
    const validBeforePhotos = beforePhotos.filter(p => p.data && p.data.startsWith('data:'))

    // 3. Fetch job data for spare parts and diagnostic context
    const job = await getJobById(jobId)
    if (!job) {
      console.log('[RepairVerify] Job', jobId, 'not found — skipping verification')
      return null
    }

    const customFields = (job.custom_fields as Record<string, unknown> | null) ?? {}

    // Extract declared spare parts from protocol_materials
    const protocolMaterials = customFields.protocol_materials as Array<{
      name?: string
      description?: string
      quantity?: number
      unit?: string
    }> | undefined

    const partsList: string[] = []
    if (Array.isArray(protocolMaterials) && protocolMaterials.length > 0) {
      for (const m of protocolMaterials) {
        const name = m.name || m.description || ''
        if (name) {
          const qty = m.quantity ? `${m.quantity} ${m.unit || 'ks'}` : ''
          partsList.push(qty ? `${name} (${qty})` : name)
        }
      }
    }

    // Extract diagnostic summary
    const diagResult = customFields.diag_result as { summary?: string; scenarios?: Array<{ title?: string }> } | undefined
    const diagSummary = diagResult?.summary
      || diagResult?.scenarios?.[0]?.title
      || ''

    // 4. Build user message
    const contextParts: string[] = []
    if (job.category) contextParts.push(`Kategorie zakázky: ${sanitizeForPrompt(String(job.category), 100)}`)
    if (job.description) contextParts.push(`Popis závady od zákazníka: <job_description>${sanitizeForPrompt(String(job.description))}</job_description>`)
    if (diagSummary) contextParts.push(`Diagnostický závěr: ${sanitizeForPrompt(diagSummary)}`)
    if (partsList.length > 0) {
      const sanitizedParts = partsList.map(p => sanitizeForPrompt(p, 150))
      contextParts.push(`Deklarovaný materiál v protokolu (${sanitizedParts.length} položek):\n<declared_materials>\n${sanitizedParts.map(p => `  • ${p}`).join('\n')}\n</declared_materials>`)
    } else {
      contextParts.push('Deklarovaný materiál: žádný (technik neuvedl žádný materiál)')
    }

    const contextStr = contextParts.join('\n\n')

    // 5. Prepare photo arrays (max 3 before + 3 after to stay within token limits)
    const beforeUrls = validBeforePhotos.slice(0, 3).map(p => p.data as string)
    const afterUrls = validAfterPhotos.slice(0, 3).map(p => p.data as string)
    const allPhotoUrls = [...beforeUrls, ...afterUrls]

    // Build photo context label for the user message
    const photoLabels: string[] = []
    if (beforeUrls.length > 0) {
      photoLabels.push(`${beforeUrls.length} fotka/fotek PŘED OPRAVOU (od zákazníka)`)
    } else {
      photoLabels.push('Fotky PŘED OPRAVOU: nejsou k dispozici')
    }
    photoLabels.push(`${afterUrls.length} fotka/fotek PO OPRAVĚ (od technika)`)

    const userMessage = `Ověř kvalitu opravy pro tuto zakázku.

${contextStr}

Přiložené fotky (v pořadí):
${photoLabels.join('\n')}

Vrať odpověď jako JSON v tomto formátu:
${RESPONSE_SCHEMA}`

    // 6. Call vision model
    console.log(`[RepairVerify] Analyzing job ${jobId}: ${beforeUrls.length} before + ${afterUrls.length} after photos, ${partsList.length} declared parts`)

    const raw = await visionCompletion({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      imageDataUrls: allPhotoUrls,
      maxTokens: 2000,
      temperature: 0.1,
      jsonMode: true,
      reasoning: 'low',
    })

    if (!raw) {
      console.error('[RepairVerify] Empty response from vision model for job', jobId)
      return null
    }

    // 7. Parse JSON response
    const parsed = parseLLMJson<RepairVerification>(raw)
    if (!parsed) {
      console.error('[RepairVerify] Failed to parse vision response for job', jobId, ':', raw.slice(0, 200))
      return null
    }

    // Ensure required fields have defaults
    if (!parsed.verdict) parsed.verdict = 'unverifiable'
    if (!parsed.fault_resolved) parsed.fault_resolved = { assessment: 'uncertain', evidence: '' }
    if (!parsed.before_after_comparison) parsed.before_after_comparison = 'Fotky před opravou nejsou k dispozici'
    if (!Array.isArray(parsed.parts_assessment)) parsed.parts_assessment = []
    if (!parsed.parts_match) parsed.parts_match = 'cannot_assess'
    if (!parsed.work_quality) parsed.work_quality = { rating: 'cannot_assess', observations: [] }
    if (!Array.isArray(parsed.work_quality.observations)) parsed.work_quality.observations = []
    if (!Array.isArray(parsed.red_flags)) parsed.red_flags = []
    if (!parsed.summary) parsed.summary = ''
    if (!parsed.confidence) parsed.confidence = 'low'

    // Attach metadata
    const result: RepairVerification = {
      ...parsed,
      analyzed_at: new Date().toISOString(),
      before_photos_used: beforeUrls.length,
      after_photos_used: afterUrls.length,
      parts_declared: partsList.length,
      verification_version: VERIFICATION_VERSION,
    }

    console.log(
      `[RepairVerify] Job ${jobId}: verdict=${result.verdict}, ` +
      `fault_resolved=${result.fault_resolved.assessment}, ` +
      `parts_match=${result.parts_match}, ` +
      `red_flags=${result.red_flags.length}, ` +
      `confidence=${result.confidence}`
    )

    // 8. Save result to DB: custom_fields.repair_verification + increment attempt counter
    await query(
      `UPDATE jobs
       SET custom_fields = jsonb_set(
         jsonb_set(
           COALESCE(custom_fields, '{}'::jsonb),
           '{repair_verification}',
           $1::jsonb
         ),
         '{repair_verification_attempts}',
         to_jsonb(COALESCE((custom_fields->>'repair_verification_attempts')::int, 0) + 1)
       )
       WHERE id = $2`,
      [JSON.stringify(result), jobId],
    )

    // 9. If any red_flag is medium or high severity, set alert flag
    const hasSerious = result.red_flags.some(f => f.severity === 'medium' || f.severity === 'high')
    if (hasSerious) {
      await query(
        `UPDATE jobs
         SET custom_fields = jsonb_set(
           COALESCE(custom_fields, '{}'::jsonb),
           '{repair_verification_alert}',
           'true'::jsonb
         )
         WHERE id = $2`,
        [jobId],
      )
      console.log(`[RepairVerify] Job ${jobId}: alert flag SET — ${result.red_flags.filter(f => f.severity === 'medium' || f.severity === 'high').length} serious red flags`)

      // Bridge to AI Command Center — log quality flag for Katka review
      try {
        const { logAgentAction } = await import('@/lib/ai-command')
        const flagSummary = result.red_flags
          .filter(f => f.severity === 'medium' || f.severity === 'high')
          .map(f => `${f.type}: ${f.description}`)
          .join('; ')
        await logAgentAction({
          agent_name: 'quality',
          job_id: jobId,
          decision_type: 'quality_flag',
          decision: `Repair verification: ${result.verdict} — ${flagSummary}`,
          reasoning: `Verdict: ${result.verdict}. Red flags: ${result.red_flags.length} total, ${result.red_flags.filter(f => f.severity !== 'low').length} serious. Work quality: ${result.work_quality.rating}.`,
        })
      } catch {
        // AI Command Center not available — non-critical
      }
    }

    return result
  } catch (err) {
    console.error('[RepairVerify] Failed for job', jobId, ':', err)
    return null
  } finally {
    // Always release the in-flight lock
    inFlightJobs.delete(jobId)
  }
}
