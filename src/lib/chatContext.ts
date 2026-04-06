/**
 * Chat Context Brain — centrálna funkcia pre agregáciu všetkých kontextových dát o zákazke.
 *
 * buildJobFullContext()     — nazbiera VŠETKY dostupné dáta (správy, telefonáty, poznámky, diagnostiku, históriu)
 * generateAiChatSummary()  — LLM generuje štruktúrovaný brief pre operátora
 */

import { getJobById, getJobMessages, getJobNotes, isDatabaseAvailable, query } from '@/lib/db'
import { getJobsByCustomerPhoneForChat } from '@/lib/db/chat'
import { chatCompletion } from '@/lib/llm'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CallTranscriptSummary {
  summary: string | null
  callerType: string | null
  direction: string | null
  durationSeconds: number | null
  createdAt: string
}

export interface BrainSignalSummary {
  signalType: string
  severity: string
  title: string
  description: string
  createdAt: string
}

export interface DiagScenario {
  name: string
  probability: number
  insuranceCoverage: string | null
}

export interface CustomerJobHistory {
  id: number
  referenceNumber: string
  category: string | null
  status: string
  crmStep: number
  scheduledDate: string | null
}

export interface JobFullContext {
  // Job basics
  jobId: number
  referenceNumber: string
  partnerName: string | null
  category: string | null
  description: string | null
  status: string
  crmStep: number
  techPhase: string | null
  customerName: string | null
  customerPhone: string | null
  customerCity: string | null
  technicianName: string | null
  scheduledDate: string | null
  scheduledTime: string | null
  // Aggregated context
  messages: Array<{ fromRole: string; message: string; channel: string; createdAt: string }>
  callTranscripts: CallTranscriptSummary[]
  notes: Array<{ content: string; authorName: string; createdAt: string }>
  diagnosticResult: { scenarios: DiagScenario[]; confidence: string | null } | null
  customerHistory: CustomerJobHistory[]
  brainSignals: BrainSignalSummary[]
  // Metadata
  contextSources: string[]
}

export type CustomerMood = 'positive' | 'neutral' | 'frustrated' | 'angry'

export interface AiChatSummary {
  oneParagraphSummary: string
  whatAiAlreadyDid: string[]
  whatOperatorShouldKnow: string[]
  suggestedNextAction: string
  suggestedReply: string | null
  customerMood: CustomerMood
  contextSources: string[]
  generatedAt: string
}

// ── Build Full Context ───────────────────────────────────────────────────────

/**
 * Aggregates ALL available data about a job for AI context generation.
 * Runs all queries in parallel for speed.
 */
export async function buildJobFullContext(jobId: number): Promise<JobFullContext | null> {
  if (!isDatabaseAvailable()) return null

  const job = await getJobById(jobId)
  if (!job) return null

  // Run all data queries in parallel
  const [messages, callTranscripts, notes, brainSignals, customerHistory] = await Promise.all([
    // 1. Chat messages (last 50, all channels)
    getJobMessages(jobId, { limit: 50 }),

    // 2. Call transcripts
    query<{
      summary: string | null
      caller_type: string | null
      direction: string | null
      duration_seconds: number | null
      created_at: string
    }>(
      `SELECT summary, caller_type, direction, duration_seconds, created_at::text
       FROM job_call_transcripts
       WHERE job_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [jobId]
    ).then(r => r.rows).catch(err => {
      console.error('[chatContext] call transcripts query failed:', err)
      return [] as Array<{ summary: string | null; caller_type: string | null; direction: string | null; duration_seconds: number | null; created_at: string }>
    }),

    // 3. Internal notes (last 10)
    getJobNotes(jobId).then(n => n.slice(0, 10)),

    // 4. Brain signals (last 24h)
    query<{
      signal_type: string
      severity: string
      title: string
      description: string
      created_at: string
    }>(
      `SELECT signal_type, severity, title, description, created_at::text
       FROM ai_brain_signals
       WHERE job_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC LIMIT 15`,
      [jobId]
    ).then(r => r.rows).catch(err => {
      console.error('[chatContext] brain signals query failed:', err)
      return [] as Array<{ signal_type: string; severity: string; title: string; description: string; created_at: string }>
    }),

    // 5. Customer history (other jobs for same phone)
    job.customer_phone
      ? getJobsByCustomerPhoneForChat(job.customer_phone).then(jobs =>
          jobs.filter(j => j.id !== jobId).slice(0, 5)
        )
      : Promise.resolve([]),
  ])

  // 6. Diagnostic result from custom_fields
  let diagnosticResult: JobFullContext['diagnosticResult'] = null
  const diagRaw = (job.custom_fields as Record<string, unknown>)?.diag_result
  if (diagRaw && typeof diagRaw === 'object') {
    const diag = diagRaw as { scenarios?: Array<{ name: string; probability: number; insuranceCoverage?: string }>; confidence?: string }
    if (Array.isArray(diag.scenarios) && diag.scenarios.length > 0) {
      diagnosticResult = {
        scenarios: diag.scenarios.slice(0, 3).map(s => ({
          name: s.name,
          probability: s.probability,
          insuranceCoverage: s.insuranceCoverage ?? null,
        })),
        confidence: diag.confidence ?? null,
      }
    }
  }

  // Build context sources list
  const contextSources: string[] = ['chat']
  if (callTranscripts.length > 0) contextSources.push('calls')
  if (notes.length > 0) contextSources.push('notes')
  if (diagnosticResult) contextSources.push('diagnostic')
  if (customerHistory.length > 0) contextSources.push('history')
  if (brainSignals.length > 0) contextSources.push('brain')

  // Get partner name
  let partnerName: string | null = null
  if (job.partner_id) {
    const pRes = await query<{ name: string }>(
      `SELECT name FROM partners WHERE id = $1`, [job.partner_id]
    ).catch(() => ({ rows: [] as Array<{ name: string }> }))
    partnerName = pRes.rows[0]?.name ?? null
  }

  // Get technician name
  let technicianName: string | null = null
  if (job.assigned_to) {
    const tRes = await query<{ first_name: string; last_name: string }>(
      `SELECT first_name, last_name FROM technicians WHERE id = $1`, [job.assigned_to]
    ).catch(() => ({ rows: [] as Array<{ first_name: string; last_name: string }> }))
    const t = tRes.rows[0]
    if (t) technicianName = `${t.first_name} ${t.last_name}`.trim()
  }

  return {
    jobId,
    referenceNumber: job.reference_number,
    partnerName,
    category: job.category,
    description: job.description ?? null,
    status: job.status,
    crmStep: job.crm_step,
    techPhase: job.tech_phase,
    customerName: job.customer_name,
    customerPhone: job.customer_phone,
    customerCity: job.customer_city,
    technicianName,
    scheduledDate: job.scheduled_date ? String(job.scheduled_date) : null,
    scheduledTime: job.scheduled_time,
    messages: messages.map(m => ({
      fromRole: m.from_role,
      message: m.message,
      channel: m.channel,
      createdAt: String(m.created_at),
    })),
    callTranscripts: callTranscripts.map(ct => ({
      summary: ct.summary,
      callerType: ct.caller_type,
      direction: ct.direction,
      durationSeconds: ct.duration_seconds,
      createdAt: ct.created_at,
    })),
    notes: notes.map(n => ({
      content: n.content,
      authorName: n.author_name,
      createdAt: String(n.created_at),
    })),
    diagnosticResult,
    customerHistory: customerHistory.map(j => ({
      id: j.id,
      referenceNumber: j.referenceNumber,
      category: j.category,
      status: j.status,
      crmStep: j.crmStep,
      scheduledDate: j.scheduledDate,
    })),
    brainSignals: brainSignals.map(s => ({
      signalType: s.signal_type,
      severity: s.severity,
      title: s.title,
      description: s.description,
      createdAt: s.created_at,
    })),
    contextSources,
  }
}

// ── Generate AI Summary ──────────────────────────────────────────────────────

const CHAT_BRAIN_SYSTEM_PROMPT = `Si CRM mozog zákazníckeho servisu Zlatí Řemeslníci (havarijný servis pre poisťovne, CZ + SK).

Máš k dispozícii KOMPLETNÝ kontext o zákazke — chat správy, telefonáty, interné poznámky, AI diagnostiku a históriu zákazníka. Tvoja úloha je vytvoriť stručný brief pre operátora.

Pravidlá:
- Píš STRUČNE — operátor potrebuje rýchly prehľad, nie esej
- Ak boli telefonáty, zhrň čo bolo dohodnuté
- Ak AI bot niečo urobil (odpovedal, eskaloval), uveď to
- Ak zákazník má históriu (predchádzajúce zákazky), spomeň to
- Navrhni konkrétnu odpoveď ak je to vhodné
- Ohodnoť náladu zákazníka
- Jazyk: slovenčina (klient môže byť CZ — vtedy odpovedaj česky)

VŽDY vráť PLATNÝ JSON v tomto formáte:
{
  "oneParagraphSummary": "1-3 vety zhŕňajúce situáciu",
  "whatAiAlreadyDid": ["bod 1", "bod 2"],
  "whatOperatorShouldKnow": ["dôležitý fakt 1", "dôležitý fakt 2"],
  "suggestedNextAction": "čo by mal operátor urobiť ďalej",
  "suggestedReply": "navrhovaná odpoveď alebo null",
  "customerMood": "positive|neutral|frustrated|angry"
}`

function formatContextForLLM(ctx: JobFullContext): string {
  const parts: string[] = []

  // Job basics
  parts.push(`=== ZÁKAZKA ===`)
  parts.push(`Ref: ${ctx.referenceNumber} | Partner: ${ctx.partnerName || 'N/A'} | Kategória: ${ctx.category || 'N/A'}`)
  parts.push(`Stav: ${ctx.status} (krok ${ctx.crmStep}) | Tech fáza: ${ctx.techPhase || 'N/A'}`)
  parts.push(`Zákazník: ${ctx.customerName || 'N/A'} | Mesto: ${ctx.customerCity || 'N/A'}`)
  parts.push(`Technik: ${ctx.technicianName || 'Nepriradený'} | Termín: ${ctx.scheduledDate || 'N/A'} ${ctx.scheduledTime || ''}`)
  if (ctx.description) parts.push(`Popis: ${ctx.description}`)

  // Messages
  if (ctx.messages.length > 0) {
    parts.push(`\n=== CHAT SPRÁVY (posledných ${ctx.messages.length}) ===`)
    for (const m of ctx.messages.slice(-30)) {
      const role = m.fromRole === 'client' ? 'KLIENT' :
        m.fromRole === 'tech' ? 'TECHNIK' :
        m.fromRole === 'operator' ? 'OPERÁTOR' : 'SYSTÉM'
      const ch = m.channel !== 'dispatch' ? ` [${m.channel}]` : ''
      parts.push(`[${role}${ch}] ${m.message}`)
    }
  }

  // Call transcripts
  if (ctx.callTranscripts.length > 0) {
    parts.push(`\n=== TELEFONÁTY (${ctx.callTranscripts.length}) ===`)
    for (const ct of ctx.callTranscripts) {
      const dir = ct.direction === 'inbound' ? '📞 prichádzajúci' : '📱 odchádzajúci'
      const caller = ct.callerType || 'neznámy'
      const dur = ct.durationSeconds ? `${Math.round(ct.durationSeconds / 60)}min` : ''
      parts.push(`${dir} (${caller}, ${dur}): ${ct.summary || 'bez zhrnutia'}`)
    }
  }

  // Notes
  if (ctx.notes.length > 0) {
    parts.push(`\n=== INTERNÉ POZNÁMKY ===`)
    for (const n of ctx.notes.slice(0, 5)) {
      parts.push(`[${n.authorName}]: ${n.content}`)
    }
  }

  // Diagnostic
  if (ctx.diagnosticResult) {
    parts.push(`\n=== AI DIAGNOSTIKA ===`)
    parts.push(`Dôvera: ${ctx.diagnosticResult.confidence || 'N/A'}`)
    for (const s of ctx.diagnosticResult.scenarios) {
      parts.push(`- ${s.name} (${Math.round(s.probability * 100)}%) — krytie: ${s.insuranceCoverage || 'N/A'}`)
    }
  }

  // Customer history
  if (ctx.customerHistory.length > 0) {
    parts.push(`\n=== HISTÓRIA ZÁKAZNÍKA (${ctx.customerHistory.length} predch. zákaziek) ===`)
    for (const j of ctx.customerHistory) {
      parts.push(`- ${j.referenceNumber} | ${j.category || 'N/A'} | stav: ${j.status}`)
    }
  }

  // Brain signals
  if (ctx.brainSignals.length > 0) {
    parts.push(`\n=== AI SIGNÁLY (24h) ===`)
    for (const s of ctx.brainSignals.slice(0, 5)) {
      parts.push(`[${s.severity.toUpperCase()}] ${s.title}: ${s.description}`)
    }
  }

  return parts.join('\n')
}

/**
 * Generate an AI chat summary from full job context.
 * Returns null if LLM is unavailable or fails.
 */
export async function generateAiChatSummary(ctx: JobFullContext): Promise<AiChatSummary | null> {
  const contextText = formatContextForLLM(ctx)

  const result = await chatCompletion({
    systemPrompt: CHAT_BRAIN_SYSTEM_PROMPT,
    userMessage: contextText,
    jsonMode: true,
    maxTokens: 600,
    temperature: 0.2,
  })

  if (!result) return null

  try {
    const parsed = JSON.parse(result) as Partial<AiChatSummary>
    if (!parsed.oneParagraphSummary) return null

    return {
      oneParagraphSummary: parsed.oneParagraphSummary,
      whatAiAlreadyDid: Array.isArray(parsed.whatAiAlreadyDid) ? parsed.whatAiAlreadyDid.filter(Boolean) : [],
      whatOperatorShouldKnow: Array.isArray(parsed.whatOperatorShouldKnow) ? parsed.whatOperatorShouldKnow.filter(Boolean) : [],
      suggestedNextAction: parsed.suggestedNextAction || 'Skontrolovať stav a odpovedať zákazníkovi.',
      suggestedReply: parsed.suggestedReply || null,
      customerMood: (['positive', 'neutral', 'frustrated', 'angry'] as const).includes(parsed.customerMood as CustomerMood)
        ? parsed.customerMood as CustomerMood
        : 'neutral',
      contextSources: ctx.contextSources,
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[chatContext] Failed to parse LLM summary:', err)
    return null
  }
}
