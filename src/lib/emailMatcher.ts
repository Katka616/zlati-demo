/**
 * Email Matcher — 3-level matching of incoming emails to CRM jobs.
 *
 * Level 1: Reference number regex (subject + body)
 * Level 2: From email address (customer_email or assigned technician email)
 * Level 3: AI fallback via OpenAI gpt-5.4
 *
 * Used by the email ingestion pipeline to automatically link
 * incoming emails to existing jobs without operator intervention.
 */

import { chatCompletion, TIER_A_MODEL, TIER_A_PROVIDER } from '@/lib/llm'
import { query } from '@/lib/db/core'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchResult {
  jobId: number
  matchedBy: 'reference' | 'email' | 'ai'
  confidence: number // 0-1
}

// Active job statuses (pipeline statuses only)
const INACTIVE_STATUSES = ['uzavrete', 'archived', 'cancelled']

// ─── Reference Number Patterns ────────────────────────────────────────────────

/**
 * Patterns for extracting reference numbers from email subject/body.
 *
 * Captures:
 *  - Partner-prefixed refs: AXA-2026-0412, EA-2026-0055, SEC-2026-0003
 *  - Hash-based numeric refs: #1234, #56789
 *  - Czech/Slovak natural language: "zákazka #123", "zakázka 123"
 */
const REFERENCE_PATTERNS: RegExp[] = [
  /\b((?:AXA|EA|SEC)-\d{4}-\d+)\b/gi,
  /#(\d{4,})\b/g,
  /z[aá]kázka\s+#?(\d{4,})\b/gi,
]

/**
 * Extract all candidate reference strings from text.
 * Returns deduped array of raw strings (full match or capture group).
 */
function extractReferenceStrings(text: string): string[] {
  const found = new Set<string>()
  for (const pattern of REFERENCE_PATTERNS) {
    // Reset lastIndex to avoid cross-call state leaking
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      // Group 1 is the reference (either full partner ref or numeric part)
      const candidate = match[1] ?? match[0]
      found.add(candidate.trim())
    }
  }
  return Array.from(found)
}

// ─── Level 1: Reference Number ────────────────────────────────────────────────

/**
 * Try to match an email to a job by reference number.
 * Scans subject and body for known reference patterns, then queries the DB.
 *
 * Returns the first job found, or null if no match.
 */
export async function matchByReference(
  subject: string,
  body: string
): Promise<MatchResult | null> {
  const searchText = `${subject} ${body}`
  const candidates = extractReferenceStrings(searchText)

  if (candidates.length === 0) return null

  for (const ref of candidates) {
    try {
      // Try exact match first (handles AXA-2026-0412 style)
      const exactResult = await query<{ id: number }>(
        `SELECT id FROM jobs WHERE reference_number = $1 LIMIT 1`,
        [ref]
      )
      if (exactResult.rows.length > 0) {
        console.log(`[EmailMatcher] Level 1 match by reference (exact): ${ref} → job ${exactResult.rows[0].id}`)
        return {
          jobId: exactResult.rows[0].id,
          matchedBy: 'reference',
          confidence: 1.0,
        }
      }

      // For pure numeric refs (#1234), also try ILIKE with partner prefixes
      if (/^\d+$/.test(ref)) {
        const ilikeResult = await query<{ id: number }>(
          `SELECT id FROM jobs WHERE reference_number ILIKE $1 LIMIT 1`,
          [`%-${ref}`]
        )
        if (ilikeResult.rows.length > 0) {
          console.log(`[EmailMatcher] Level 1 match by reference (ilike): ${ref} → job ${ilikeResult.rows[0].id}`)
          return {
            jobId: ilikeResult.rows[0].id,
            matchedBy: 'reference',
            confidence: 0.95,
          }
        }
      }
    } catch (err) {
      console.error(`[EmailMatcher] Level 1 DB error for ref "${ref}":`, err)
    }
  }

  return null
}

// ─── Level 2: Email Address ───────────────────────────────────────────────────

/** Candidate job row for email matching */
interface ActiveJobRow {
  id: number
  reference_number: string | null
  customer_name: string | null
  category: string | null
  customer_city: string | null
}

/**
 * Narrow a list of candidate jobs by keyword overlap with the email subject.
 * Returns the single best match if clearly dominant, or null if still ambiguous.
 */
function narrowBySubject(jobs: ActiveJobRow[], subject: string): ActiveJobRow | null {
  if (jobs.length === 0) return null
  if (jobs.length === 1) return jobs[0]

  const subjectLower = subject.toLowerCase()

  // Score each job by how many of its fields appear in the subject
  const scored = jobs.map(job => {
    let score = 0
    if (job.reference_number && subjectLower.includes(job.reference_number.toLowerCase())) score += 10
    if (job.customer_city && subjectLower.includes(job.customer_city.toLowerCase())) score += 3
    if (job.category && subjectLower.includes(job.category.toLowerCase())) score += 2
    if (job.customer_name) {
      const nameParts = job.customer_name.toLowerCase().split(/\s+/)
      for (const part of nameParts) {
        if (part.length > 2 && subjectLower.includes(part)) score += 2
      }
    }
    return { job, score }
  })

  scored.sort((a, b) => b.score - a.score)

  // Only return a winner if it has a clear lead over second place
  const [first, second] = scored
  if (first.score > 0 && first.score > (second?.score ?? 0)) {
    return first.job
  }

  return null
}

/**
 * Try to match an email to a job by the sender's email address.
 *
 * Checks:
 *  1. Active jobs where customer_email matches the sender
 *  2. Technicians with that email -> active jobs assigned to them
 *
 * If exactly 1 active job found -> return it.
 * If multiple -> try subject narrowing.
 * If still ambiguous -> return null.
 */
export async function matchByEmail(
  fromEmail: string,
  subject = ''
): Promise<MatchResult | null> {
  if (!fromEmail) return null

  const emailLower = fromEmail.toLowerCase().trim()

  try {
    // ── 2a. Customer email match ──────────────────────────────────────
    const customerResult = await query<ActiveJobRow>(
      `SELECT id, reference_number, customer_name, category, customer_city
       FROM jobs
       WHERE LOWER(customer_email) = $1
         AND status NOT IN ($2, $3, $4)
       ORDER BY created_at DESC
       LIMIT 50`,
      [emailLower, ...INACTIVE_STATUSES]
    )

    const customerJobs = customerResult.rows

    if (customerJobs.length === 1) {
      console.log(`[EmailMatcher] Level 2 match by customer email: ${emailLower} → job ${customerJobs[0].id}`)
      return {
        jobId: customerJobs[0].id,
        matchedBy: 'email',
        confidence: 0.9,
      }
    }

    if (customerJobs.length > 1) {
      const narrowed = narrowBySubject(customerJobs, subject)
      if (narrowed) {
        console.log(`[EmailMatcher] Level 2 match by customer email (narrowed): ${emailLower} → job ${narrowed.id}`)
        return {
          jobId: narrowed.id,
          matchedBy: 'email',
          confidence: 0.8,
        }
      }
      console.log(`[EmailMatcher] Level 2 ambiguous -- ${customerJobs.length} active jobs for customer email ${emailLower}`)
      return null
    }

    // ── 2b. Technician email match ────────────────────────────────────
    const techResult = await query<{ id: number }>(
      `SELECT id FROM technicians WHERE LOWER(email) = $1 LIMIT 1`,
      [emailLower]
    )

    if (techResult.rows.length === 0) return null

    const techId = techResult.rows[0].id

    const techJobsResult = await query<ActiveJobRow>(
      `SELECT id, reference_number, customer_name, category, customer_city
       FROM jobs
       WHERE assigned_to = $1
         AND status NOT IN ($2, $3, $4)
       ORDER BY created_at DESC
       LIMIT 50`,
      [techId, ...INACTIVE_STATUSES]
    )

    const techJobs = techJobsResult.rows

    if (techJobs.length === 1) {
      console.log(`[EmailMatcher] Level 2 match by technician email: tech ${techId} → job ${techJobs[0].id}`)
      return {
        jobId: techJobs[0].id,
        matchedBy: 'email',
        confidence: 0.85,
      }
    }

    if (techJobs.length > 1) {
      const narrowed = narrowBySubject(techJobs, subject)
      if (narrowed) {
        console.log(`[EmailMatcher] Level 2 match by technician email (narrowed): tech ${techId} → job ${narrowed.id}`)
        return {
          jobId: narrowed.id,
          matchedBy: 'email',
          confidence: 0.75,
        }
      }
      console.log(`[EmailMatcher] Level 2 ambiguous -- ${techJobs.length} active jobs for technician ${techId}`)
      return null
    }

    return null
  } catch (err) {
    console.error(`[EmailMatcher] Level 2 DB error for email "${emailLower}":`, err)
    return null
  }
}

// ─── Level 3: AI Fallback ─────────────────────────────────────────────────────

/** Compact job summary passed to the AI */
interface JobSummaryRow {
  id: number
  reference_number: string | null
  customer_name: string | null
  customer_email: string | null
  category: string | null
  customer_city: string | null
}

const AI_MATCH_SYSTEM_PROMPT = `You are a job-matching engine for a CRM used by insurance repair technicians.
Given an email (subject + body snippet) and a list of active jobs, identify which job the email most likely belongs to.

Rules:
- Match on reference numbers, customer names, cities, or repair categories mentioned in the email.
- Return ONLY a raw JSON object: {"job_id": <number>} or {"job_id": null}.
- No markdown, no explanation, no extra keys.
- If uncertain, return {"job_id": null}.`

/**
 * Try to match an email to a job using OpenAI as a last resort.
 * Fetches up to 50 most-recent active jobs and sends them to gpt-5.4.
 *
 * Body is truncated to 500 chars to keep token usage low.
 * Errors are caught silently -- returns null on any failure.
 */
export async function matchByAI(
  subject: string,
  bodyText: string
): Promise<MatchResult | null> {
  try {
    // Fetch candidate jobs
    const jobsResult = await query<JobSummaryRow>(
      `SELECT id, reference_number, customer_name, customer_email, category, customer_city
       FROM jobs
       WHERE status NOT IN ($1, $2, $3)
       ORDER BY created_at DESC
       LIMIT 50`,
      INACTIVE_STATUSES
    )

    const jobs = jobsResult.rows
    if (jobs.length === 0) {
      console.log('[EmailMatcher] Level 3 skipped -- no active jobs in DB')
      return null
    }

    const jobsList = jobs.map(j =>
      `{"id":${j.id},"ref":${JSON.stringify(j.reference_number ?? '')},"name":${JSON.stringify(j.customer_name ?? '')},"email":${JSON.stringify(j.customer_email ?? '')},"category":${JSON.stringify(j.category ?? '')},"city":${JSON.stringify(j.customer_city ?? '')}}`
    ).join('\n')

    const truncatedBody = bodyText.slice(0, 500)

    const userMessage = `Subject: ${subject}
---BEGIN EMAIL SNIPPET---
${truncatedBody}
---END EMAIL SNIPPET---

Active jobs (JSON, one per line):
${jobsList}`

    const outputText = await chatCompletion({
      systemPrompt: AI_MATCH_SYSTEM_PROMPT,
      userMessage,
      model: TIER_A_MODEL,
      provider: TIER_A_PROVIDER,
      temperature: 0,
      maxTokens: 64,
    })

    if (!outputText) {
      console.warn('[EmailMatcher] Level 3 -- empty AI response')
      return null
    }

    let jsonText = outputText
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(jsonText) as { job_id: number | null }

    if (parsed.job_id == null || typeof parsed.job_id !== 'number') {
      console.log('[EmailMatcher] Level 3 -- AI returned no match')
      return null
    }

    // Verify returned job_id actually exists in our candidate list
    const isValid = jobs.some(j => j.id === parsed.job_id)
    if (!isValid) {
      console.warn(`[EmailMatcher] Level 3 -- AI returned invalid job_id ${parsed.job_id} (not in candidate list)`)
      return null
    }

    console.log(`[EmailMatcher] Level 3 AI match -> job ${parsed.job_id}`)
    return {
      jobId: parsed.job_id,
      matchedBy: 'ai',
      confidence: 0.6,
    }
  } catch (err) {
    console.error('[EmailMatcher] Level 3 AI error:', err)
    return null
  }
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Match an incoming email to a CRM job using 3-level cascade:
 *   1. Reference number (regex scan of subject + body) -- confidence 0.95-1.0
 *   2. Email address (customer or assigned technician) -- confidence 0.75-0.9
 *   3. AI fallback (OpenAI gpt-5.4 with active job list) -- confidence 0.6
 *
 * Returns the first successful match, or null if all levels fail.
 */
export async function matchEmailToJob(
  fromEmail: string,
  subject: string,
  bodyText: string
): Promise<MatchResult | null> {
  // Level 1 -- Reference number
  const refMatch = await matchByReference(subject, bodyText)
  if (refMatch) return refMatch

  // Level 2 -- Email address (pass subject for narrowing when ambiguous)
  const emailMatch = await matchByEmail(fromEmail, subject)
  if (emailMatch) return emailMatch

  // Level 3 -- AI fallback
  const aiMatch = await matchByAI(subject, bodyText)
  return aiMatch
}
