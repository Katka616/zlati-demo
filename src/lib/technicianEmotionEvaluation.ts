import { chatCompletion, parseLLMJson, TIER_A_MODEL, TIER_A_PROVIDER } from '@/lib/llm'

export type TechnicianEmotionSentiment =
  | 'frustrated'
  | 'stressed'
  | 'neutral'
  | 'cooperative'
  | 'positive'

export interface TechnicianEmotionEvidence {
  source: 'job_message' | 'direct_message' | 'voicebot'
  createdAt: string
  text: string
  role?: string
  scoreImpact: number
}

export interface TechnicianEmotionEvaluation {
  sentiment: TechnicianEmotionSentiment
  score: number
  summary: string
  frustrationRisk: boolean
  communicationIssue: boolean
  workloadComplaint: boolean
  sources: {
    jobMessages: number
    directMessages: number
    voicebotCalls: number
  }
  evidence: TechnicianEmotionEvidence[]
  recommendedAction: string
  generatedAt: string
}

export interface TechnicianEmotionInput {
  technicianId: number | string
  technicianName?: string | null
  jobMessages: Array<{
    from_role: string
    message: string
    created_at: string | Date
  }>
  directMessages: Array<{
    from_role: string
    message: string
    created_at: string | Date
  }>
  voicebotCalls: Array<{
    transcript?: string | null
    summary?: string | null
    direction?: string | null
  }>
}

interface LlmTechnicianEmotionResult {
  sentiment: TechnicianEmotionSentiment
  score: number
  summary: string
  frustrationRisk: boolean
  communicationIssue: boolean
  workloadComplaint: boolean
  recommendedAction: string
}

interface ScoredSource {
  source: 'job_message' | 'direct_message' | 'voicebot'
  createdAt: string
  role?: string
  text: string
  score: number
  frustrationHits: string[]
  workloadHits: string[]
  commIssueHits: string[]
  positiveHits: string[]
  isTechSpeaking: boolean
}

// ---- Keyword lists (technician-specific) ----

const FRUSTRATION_KEYWORDS = [
  'nestihám', 'nestíhám', 'nechcem', 'nechci', 'dost', 'dosť',
  'unavený', 'unaveny', 'unaven', 'frustrovaný', 'frustrovan',
  'frustracia', 'frustrácia', 'nespravodlivé', 'nespravodlive',
  'nefér', 'nefer', 'nechutne', 'trapné', 'trapne',
  'viac nechcem', 'koniec', 'vzdávam', 'vzdavam',
  'resignujem', 'ukončujem', 'prečo stále', 'preco stale',
  'šialené', 'sialene', 'absurdné', 'absurdne',
  'nemám náladu', 'nemam naladu', 'nemám energiu',
]

const WORKLOAD_KEYWORDS = [
  'priveľa', 'privela', 'príliš veľa', 'prilis vela',
  'nestíham', 'nestíhám', 'nestíhajú', 'preťažený', 'pretazeny',
  'preťažení', 'pretazeni', 'toho je veľa', 'toho je vela',
  'nestíham to', 'nestíhame', 'nestíhame to',
  'nemám čas', 'nemam cas', 'nemám kapacitu', 'nemam kapacitu',
  'je toho priveľa', 'príliš zákaziek', 'prilis zakaziek',
  'preťaženie', 'pretazenie',
]

const COMMUNICATION_ISSUE_KEYWORDS = [
  'nikto mi neodpíše', 'nikto mi neodpise', 'nereagujete', 'nereagujúce',
  'bez odpovede', 'nikto nevolá', 'nikto nevola', 'ignorujete ma',
  'neviete mi povedať', 'neviete mi povedat',
  'prečo mi nikto', 'preco mi nikto',
  'neinformovaný', 'neinformovany', 'nedostávam info', 'nedostavam info',
  'chaos', 'neorganizované', 'neorganizovane',
  'neviete čo chcete', 'neviete co chcete',
  'zmätok', 'zmatky', 'zmatok',
]

const POSITIVE_KEYWORDS = [
  'super', 'výborne', 'vyborne', 'skvelé', 'skvele',
  'spokojný', 'spokojny', 'spokojní', 'spokojni',
  'dobre', 'v pohode', 'pohoda', 'bezproblémové', 'bezproblemove',
  'rád pomôžem', 'rado', 'bez problémov',
  'ďakujem za zákazku', 'dakujem za zakazku',
  'ide to', 'funguje', 'zvladnem', 'zvládnem',
]

const TECH_EMOTION_PROMPT = `Si interný CRM analytik pre Zlatí Řemeslníci.
Analyzuješ emóciu a sentiment technika (servisného pracovníka) na základe jeho komunikácie.

Pravidlá:
- Sleduj iba správy technika (from_role = tech). Správy operátora sú len kontext.
- Ak technik nepísal nič, vráť neutral sentiment so score 0.
- Výstup musí byť prísne JSON.

Vráť:
{
  "sentiment": "frustrated|stressed|neutral|cooperative|positive",
  "score": 0,
  "summary": "stručné zhrnutie pre CRM",
  "frustrationRisk": false,
  "communicationIssue": false,
  "workloadComplaint": false,
  "recommendedAction": "konkrétny ďalší krok operátora"
}`

export async function evaluateTechnicianEmotion(
  input: TechnicianEmotionInput
): Promise<TechnicianEmotionEvaluation> {
  const fallback = buildTechnicianEmotionFallback(input)

  const llmResult = await evaluateWithLlm(input).catch(err => {
    console.error('[TechEmotion] LLM call failed, using fallback:', input.technicianId, err)
    return null
  })

  if (!llmResult) {
    return fallback
  }

  return {
    sentiment: normalizeSentiment(llmResult.sentiment),
    score: clampScore(llmResult.score),
    summary: llmResult.summary?.trim() || fallback.summary,
    frustrationRisk: Boolean(llmResult.frustrationRisk) || fallback.frustrationRisk,
    communicationIssue: Boolean(llmResult.communicationIssue) || fallback.communicationIssue,
    workloadComplaint: Boolean(llmResult.workloadComplaint) || fallback.workloadComplaint,
    sources: fallback.sources,
    evidence: fallback.evidence,
    recommendedAction: llmResult.recommendedAction?.trim() || fallback.recommendedAction,
    generatedAt: new Date().toISOString(),
  }
}

export function buildTechnicianEmotionFallback(
  input: TechnicianEmotionInput
): TechnicianEmotionEvaluation {
  const scored = collectScoredSources(input)

  const totalScore = clampScore(
    Math.round(scored.reduce((sum, s) => sum + s.score, 0))
  )

  // Only consider tech-speaking sources for risk flags
  const techSources = scored.filter(s => s.isTechSpeaking)
  const frustrationRisk = techSources.some(s => s.frustrationHits.length > 0)
  const workloadComplaint = techSources.some(s => s.workloadHits.length > 0)
  const communicationIssue = techSources.some(s => s.commIssueHits.length > 0)

  const sentiment = sentimentFromScore(totalScore)

  const evidence = scored
    .filter(s => s.score !== 0 || s.frustrationHits.length > 0 || s.workloadHits.length > 0 || s.commIssueHits.length > 0)
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 3)
    .map(s => ({
      source: s.source,
      createdAt: s.createdAt,
      text: s.text,
      role: s.role,
      scoreImpact: Math.round(s.score),
    }))

  return {
    sentiment,
    score: totalScore,
    summary: buildSummary(sentiment, {
      frustrationRisk,
      workloadComplaint,
      communicationIssue,
      technicianName: input.technicianName,
    }),
    frustrationRisk,
    communicationIssue,
    workloadComplaint,
    sources: {
      jobMessages: input.jobMessages.length,
      directMessages: input.directMessages.length,
      voicebotCalls: input.voicebotCalls.length,
    },
    evidence,
    recommendedAction: buildRecommendedAction({ sentiment, frustrationRisk, workloadComplaint, communicationIssue }),
    generatedAt: new Date().toISOString(),
  }
}

async function evaluateWithLlm(input: TechnicianEmotionInput): Promise<LlmTechnicianEmotionResult | null> {
  const lines = buildContextLines(input)
  if (lines.length === 0) return null

  const result = await chatCompletion({
    systemPrompt: TECH_EMOTION_PROMPT,
    userMessage: [
      `Technik: ${input.technicianName || `ID ${input.technicianId}`}`,
      '',
      lines.join('\n'),
    ].join('\n'),
    jsonMode: true,
    maxTokens: 300,
    reasoning: 'none',
    temperature: 0.1,
    model: TIER_A_MODEL,
    provider: TIER_A_PROVIDER,
  })

  return parseLLMJson<LlmTechnicianEmotionResult>(result)
}

function buildContextLines(input: TechnicianEmotionInput): string[] {
  const lines: string[] = []

  for (const msg of input.jobMessages) {
    if (!msg.message?.trim()) continue
    const role = msg.from_role === 'tech' ? 'TECHNIK' : 'OPERATOR'
    lines.push(`[JOB_CHAT:${role}] ${trimSnippet(msg.message)}`)
  }

  for (const msg of input.directMessages) {
    if (!msg.message?.trim()) continue
    const role = msg.from_role === 'tech' ? 'TECHNIK' : 'OPERATOR'
    lines.push(`[DM:${role}] ${trimSnippet(msg.message)}`)
  }

  for (const call of input.voicebotCalls) {
    const text = call.summary || call.transcript
    if (!text?.trim()) continue
    lines.push(`[VOICEBOT:${call.direction ?? 'unknown'}] ${trimSnippet(text)}`)
  }

  return lines.slice(0, 60)
}

function collectScoredSources(input: TechnicianEmotionInput): ScoredSource[] {
  const items: ScoredSource[] = []

  for (const msg of input.jobMessages) {
    if (!msg.message?.trim()) continue
    const isTech = msg.from_role === 'tech'
    items.push(scoreSource({
      source: 'job_message',
      createdAt: normalizeDate(msg.created_at),
      role: msg.from_role,
      text: msg.message,
      weight: isTech ? 1.0 : 0.3,
      isTechSpeaking: isTech,
    }))
  }

  for (const msg of input.directMessages) {
    if (!msg.message?.trim()) continue
    const isTech = msg.from_role === 'tech'
    items.push(scoreSource({
      source: 'direct_message',
      createdAt: normalizeDate(msg.created_at),
      role: msg.from_role,
      text: msg.message,
      weight: isTech ? 1.2 : 0.3,
      isTechSpeaking: isTech,
    }))
  }

  for (const call of input.voicebotCalls) {
    const text = call.transcript || call.summary
    if (!text?.trim()) continue
    items.push(scoreSource({
      source: 'voicebot',
      createdAt: new Date().toISOString(),
      role: 'tech',
      text,
      weight: 1.1,
      isTechSpeaking: true,
    }))
  }

  return items
}

function scoreSource(opts: {
  source: 'job_message' | 'direct_message' | 'voicebot'
  createdAt: string
  role?: string
  text: string
  weight: number
  isTechSpeaking: boolean
}): ScoredSource {
  const lower = normalizeText(opts.text)

  const frustrationHits = FRUSTRATION_KEYWORDS.filter(k => lower.includes(normalizeText(k)))
  const workloadHits = WORKLOAD_KEYWORDS.filter(k => lower.includes(normalizeText(k)))
  const commIssueHits = COMMUNICATION_ISSUE_KEYWORDS.filter(k => lower.includes(normalizeText(k)))
  const positiveHits = POSITIVE_KEYWORDS.filter(k => lower.includes(normalizeText(k)))

  let score = 0
  if (opts.isTechSpeaking) {
    score -= frustrationHits.length * 20
    score -= workloadHits.length * 15
    score -= commIssueHits.length * 12
    score += positiveHits.length * 12
  }

  score *= opts.weight

  return {
    source: opts.source,
    createdAt: opts.createdAt,
    role: opts.role,
    text: trimSnippet(opts.text),
    score,
    frustrationHits,
    workloadHits,
    commIssueHits,
    positiveHits,
    isTechSpeaking: opts.isTechSpeaking,
  }
}

function buildSummary(
  sentiment: TechnicianEmotionSentiment,
  flags: {
    frustrationRisk: boolean
    workloadComplaint: boolean
    communicationIssue: boolean
    technicianName?: string | null
  }
): string {
  const subject = flags.technicianName?.trim() || 'Technik'

  if (flags.frustrationRisk) {
    return `${subject} vykazuje znaky frustrácie — odporúčame proaktívny kontakt operátora.`
  }
  if (flags.workloadComplaint) {
    return `${subject} signalizuje preťaženie — zvážiť dočasné obmedzenie prideľovania zákaziek.`
  }
  if (flags.communicationIssue) {
    return `${subject} má výhrady k internej komunikácii — preveriť odozvu dispečingu.`
  }
  if (sentiment === 'positive' || sentiment === 'cooperative') {
    return `${subject} komunikuje pozitívne a kooperatívne, bez viditeľných problémov.`
  }
  if (sentiment === 'frustrated' || sentiment === 'stressed') {
    return `${subject} komunikuje napäto — sledovať ďalší vývoj a zvážiť osobný kontakt.`
  }
  return `${subject} komunikuje neutrálne, bez výrazných varovných signálov.`
}

function buildRecommendedAction(flags: {
  sentiment: TechnicianEmotionSentiment
  frustrationRisk: boolean
  workloadComplaint: boolean
  communicationIssue: boolean
}): string {
  if (flags.frustrationRisk) {
    return 'Zavolať technikovi ešte dnes, zistiť príčinu frustrácie a poskytnúť podporu.'
  }
  if (flags.workloadComplaint) {
    return 'Prehodnotiť aktuálne pridelenie zákaziek a krátkodobo znížiť záťaž.'
  }
  if (flags.communicationIssue) {
    return 'Skontrolovať komunikačné procesy s technikom a odstrániť informačné medzery.'
  }
  if (flags.sentiment === 'positive' || flags.sentiment === 'cooperative') {
    return 'Žiadny zásah nie je potrebný — udržiavať štandardnú komunikáciu.'
  }
  return 'Pokračovať v sledovaní komunikácie, žiadny okamžitý zásah nie je potrebný.'
}

function sentimentFromScore(score: number): TechnicianEmotionSentiment {
  if (score <= -55) return 'frustrated'
  if (score <= -20) return 'stressed'
  if (score < 20) return 'neutral'
  if (score < 50) return 'cooperative'
  return 'positive'
}

function normalizeSentiment(s: string): TechnicianEmotionSentiment {
  switch (s) {
    case 'frustrated':
    case 'stressed':
    case 'neutral':
    case 'cooperative':
    case 'positive':
      return s
    default:
      return 'neutral'
  }
}

function normalizeDate(value: string | Date | null | undefined): string {
  if (!value) return new Date().toISOString()
  return new Date(value).toISOString()
}

function trimSnippet(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 220) return normalized
  return `${normalized.slice(0, 217)}...`
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function clampScore(score: number): number {
  return Math.max(-100, Math.min(100, Math.round(score)))
}
