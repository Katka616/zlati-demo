/**
 * AI Brain Context — plný kontext zákazky + KB vyhľadávanie pre AI Mozog v2.
 */

import { query } from '@/lib/db'

// ─── Full Job Context ─────────────────────────────────────────────────────────

export async function buildFullJobContext(jobId: number): Promise<string | null> {
  try {
    // Job + partner
    const jobRes = await query(
      `SELECT j.*, p.name AS partner_name, p.code AS partner_code, p.country AS partner_country
       FROM jobs j
       LEFT JOIN partners p ON j.partner_id = p.id
       WHERE j.id = $1`,
      [jobId]
    )
    if (jobRes.rows.length === 0) return null
    const job = jobRes.rows[0]

    // Assignment
    const assignRes = await query(
      `SELECT ja.*, CONCAT(t.first_name, ' ', t.last_name) AS tech_name
       FROM job_assignments ja
       LEFT JOIN technicians t ON ja.technician_id = t.id
       WHERE ja.job_id = $1
       ORDER BY ja.assignment_number DESC
       LIMIT 1`,
      [jobId]
    )
    const assignment = assignRes.rows[0] ?? null

    // Last 10 chat messages
    const chatRes = await query(
      `SELECT channel, sender_type, content, created_at
       FROM job_messages
       WHERE job_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [jobId]
    )
    const messages = chatRes.rows.reverse() // chronological order

    // Protocol history (last visit, skip settlement entries)
    const protoRes = await query(
      `SELECT * FROM protocol_history
       WHERE job_id = $1
       ORDER BY visit_number DESC
       LIMIT 3`,
      [jobId]
    )
    const protocolEntries = protoRes.rows.filter(
      (e: Record<string, unknown>) => !e.is_settlement_entry
    )

    // Build text
    const lines: string[] = []
    lines.push(`=== PLNÝ KONTEXT ZÁKAZKY ===`)
    lines.push(`Ref: ${job.reference_number || `#${job.id}`}`)
    lines.push(`Partner: ${job.partner_name} (${job.partner_code}) · ${job.partner_country}`)
    lines.push(`Kategória: ${job.category || 'nezadaná'} · Urgentnosť: ${job.urgency || 'štandard'}`)
    lines.push(`Klient: ${job.customer_name || '—'} · ${job.customer_city || '—'} · ${job.customer_phone || '—'}`)
    lines.push(`Status: ${job.status} · CRM krok: ${job.crm_step ?? '—'} · Tech fáza: ${job.tech_phase || '—'}`)
    lines.push(`Pricing status: ${job.pricing_status || '—'} · EA status: ${job.ea_status || '—'}`)
    lines.push(`Termín: ${job.scheduled_date || 'nenaplánované'} ${job.scheduled_time || ''}`)

    if (job.description) {
      lines.push(`Popis: ${job.description.slice(0, 300)}`)
    }

    if (assignment) {
      lines.push(`\n--- Technik ---`)
      lines.push(`Meno: ${assignment.tech_name} · Fáza: ${assignment.tech_phase || '—'}`)
      if (assignment.work_data) {
        const wd = typeof assignment.work_data === 'string'
          ? JSON.parse(assignment.work_data) : assignment.work_data
        lines.push(`Hodiny: ${wd.hours ?? '—'} · Km: ${wd.totalKm ?? '—'}`)
      }
      if (assignment.settlement_data) {
        const sd = typeof assignment.settlement_data === 'string'
          ? JSON.parse(assignment.settlement_data) : assignment.settlement_data
        lines.push(`Settlement: ${sd.isConfirmed ? 'SCHVÁLENÝ' : 'čaká'} · Suma: ${sd.totalWithVat ?? '—'}`)
      }
    }

    // Custom fields highlights
    const cf = job.custom_fields
    if (cf && typeof cf === 'object') {
      const highlights: string[] = []
      if (cf.diagnostic) highlights.push('diagnostika vyplnená')
      if (cf.coverage_limit) highlights.push(`coverage limit: ${cf.coverage_limit}`)
      if (cf.surcharge_amount) highlights.push(`doplatok: ${cf.surcharge_amount}`)
      if (cf.agreed_price_work) highlights.push(`dohodnutá cena: ${cf.agreed_price_work}`)
      if (highlights.length > 0) {
        lines.push(`\n--- Custom fields ---`)
        lines.push(highlights.join(' · '))
      }
    }

    if (messages.length > 0) {
      lines.push(`\n--- Posledných ${messages.length} správ ---`)
      for (const msg of messages) {
        const time = new Date(msg.created_at).toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        const content = (msg.content || '').slice(0, 200)
        lines.push(`[${time}] ${msg.sender_type} (${msg.channel}): ${content}`)
      }
    }

    if (protocolEntries.length > 0) {
      lines.push(`\n--- Protocol history ---`)
      for (const entry of protocolEntries) {
        lines.push(`Návšteva ${entry.visit_number}: ${JSON.stringify(entry).slice(0, 300)}`)
      }
    }

    return lines.join('\n')
  } catch (err) {
    console.error('[aiBrainContext] buildFullJobContext error:', (err as Error).message)
    return null
  }
}

// ─── Multi-job Reference Resolver ─────────────────────────────────────────────

export async function resolveJobReferences(question: string): Promise<string[]> {
  const contexts: string[] = []

  // Match HM-YYYY-NNNN
  const refMatches = question.match(/HM-\d{4}-\d{4}/gi) ?? []
  for (const ref of refMatches.slice(0, 3)) {
    const res = await query('SELECT id FROM jobs WHERE reference_number = $1 LIMIT 1', [ref.toUpperCase()])
    if (res.rows[0]) {
      const ctx = await buildFullJobContext(res.rows[0].id)
      if (ctx) contexts.push(ctx)
    }
  }

  // Match #NNN (job ID)
  const idMatches = question.match(/#(\d+)/g) ?? []
  for (const match of idMatches.slice(0, 3)) {
    const id = parseInt(match.replace('#', ''), 10)
    if (!isNaN(id) && id > 0) {
      const alreadyHave = contexts.some(c => c.includes(`#${id}`) )
      if (!alreadyHave) {
        const ctx = await buildFullJobContext(id)
        if (ctx) contexts.push(ctx)
      }
    }
  }

  return contexts.slice(0, 3) // max 3 zákazky
}

// ─── Knowledge Base Search ────────────────────────────────────────────────────

export async function searchKnowledgeBase(
  questionText: string,
  opts?: { targets?: ('diagnostic' | 'ai_mozog')[]; category?: string; limit?: number }
): Promise<string> {
  const targets = opts?.targets ?? ['ai_mozog', 'diagnostic']
  const limit = opts?.limit ?? 3

  // Extract keywords from question (words > 3 chars)
  const keywords = questionText
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 8)

  if (keywords.length === 0) return ''

  // Build search: match title, content, or tags against keywords
  const targetPlaceholders = targets.map((_, i) => `$${i + 1}`).join(', ')
  const keywordPattern = keywords.join('|')
  const patternIdx = targets.length + 1

  let sql = `
    SELECT title, content, doc_type, target, tags,
           (SELECT COUNT(*) FROM unnest(tags) t WHERE t ~* $${patternIdx}) AS tag_hits
    FROM diagnostic_knowledge
    WHERE is_active = true
      AND target IN (${targetPlaceholders})
      AND (title ~* $${patternIdx} OR content ~* $${patternIdx} OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE t ~* $${patternIdx}))
  `
  const params: unknown[] = [...targets, keywordPattern]

  if (opts?.category) {
    sql += ` AND (category = $${params.length + 1} OR category = 'all')`
    params.push(opts.category)
  }

  sql += ` ORDER BY tag_hits DESC, created_at DESC LIMIT $${params.length + 1}`
  params.push(limit)

  try {
    const res = await query(sql, params)
    if (res.rows.length === 0) return ''

    const lines = ['--- Relevantné znalosti z KB ---']
    for (const row of res.rows) {
      const label = row.target === 'ai_mozog' ? 'Operátorské' : 'Diagnostické'
      const snippet = (row.content as string).slice(0, 500)
      lines.push(`[${label}] ${row.title}:\n${snippet}`)
    }
    return lines.join('\n\n')
  } catch (err) {
    console.error('[aiBrainContext] searchKnowledgeBase error:', (err as Error).message)
    return ''
  }
}
