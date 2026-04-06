import type { DBJobCallTranscript, DBJobMessage, DBJobNote } from '@/lib/db'
import { chatCompletion, parseLLMJson, TIER_A_MODEL, TIER_A_PROVIDER } from '@/lib/llm'
import type { VoicebotCall } from '@/types/voicebot'

export type CustomerEmotionSentiment =
  | 'very_negative'
  | 'negative'
  | 'neutral'
  | 'positive'
  | 'very_positive'

export type CustomerEmotionEvidenceSource = 'chat' | 'voicebot' | 'operator_call' | 'note'

export interface CustomerEmotionEvidence {
  source: CustomerEmotionEvidenceSource
  createdAt: string
  excerpt: string
  role?: string
  scoreImpact: number
}

export interface CustomerEmotionEvaluation {
  sentiment: CustomerEmotionSentiment
  score: number
  summary: string
  complaintRisk: boolean
  escalationRisk: boolean
  clientIgnored: boolean
  techProfessionalRisk: boolean
  sources: {
    chat: number
    calls: number
    notes: number
  }
  evidence: CustomerEmotionEvidence[]
  recommendedAction: string
  generatedAt: string
}

export interface CustomerEmotionInput {
  customerName?: string | null
  referenceNumber?: string | null
  messages: DBJobMessage[]
  notes: DBJobNote[]
  voicebotCalls: VoicebotCall[]
  operatorCalls: DBJobCallTranscript[]
}

interface LlmCustomerEmotionResult {
  sentiment: CustomerEmotionSentiment
  score: number
  summary: string
  complaintRisk: boolean
  escalationRisk: boolean
  clientIgnored: boolean
  techProfessionalRisk: boolean
  recommendedAction: string
}

interface ScoredTextSource {
  source: CustomerEmotionEvidenceSource
  createdAt: string
  text: string
  role?: string
  score: number
  complaintHits: string[]
  escalationHits: string[]
  negativeHits: string[]
  positiveHits: string[]
  techRiskHits: string[]
  isPrimary: boolean
}

const COMPLAINT_KEYWORDS = [
  'reklamacia', 'reklamácia', 'reklamovat', 'reklamovať', 'staznost', 'sťažnosť',
  'advokat', 'advokát', 'sud', 'súd', 'podvod', 'hanba', 'katastrofa', 'hrozne',
  'hrozné', 'nefunguje', 'pokazene', 'pokazené', 'nekvalitni', 'nekvalitní',
  'vratenie penazi', 'vrátenie peňazí', 'refund', 'lawyer', 'court', 'sue',
]

const ESCALATION_KEYWORDS = [
  'veduci', 'vedúci', 'vedúceho', 'veduceho', 'nadriadeny', 'nadriadený', 'manazer', 'manažér', 'manager',
  'riaditel', 'riaditeľ', 'supervizor', 'chcem hovorit s', 'chcem hovoriť s',
  'chci mluvit s', 'kontaktujte vedenie', 'kontaktujte managera',
]

const NEGATIVE_KEYWORDS = [
  'cakame', 'čakáme', 'cakam', 'čakám', 'bez odpovede', 'ignoruje', 'ignorujete',
  'kde je', 'kedy pride', 'kedy príde', 'preco', 'prečo', 'zase', 'znova', 'opät',
  'opäť', 'nevyriesene', 'nevyriešené', 'stale', 'stále', 'nespokojny', 'nespokojný',
]

const POSITIVE_KEYWORDS = [
  'dakujem', 'ďakujem', 'dakoval', 'ďakoval', 'super', 'vyborne', 'výborne', 'skvely', 'skvelý',
  'spokojny', 'spokojný', 'spokojnost', 'spokojnosť', 'rychly', 'rýchly', 'profesional', 'profesionál',
  'odporucam', 'odporúčam', 'pomohol', 'milý', 'mily', 'potvrdil spokojnost', 'potvrdil spokojnosť',
]

const TECH_UNPROFESSIONAL_KEYWORDS = [
  'nie je to moja starost', 'nie je to moja starosť', 'nemam cas', 'nemám čas',
  'nezdrzujte ma', 'nezdržujte ma', 'riešte si to sami', 'riešte si to sami',
  'to nie je v cene', 'zavolajte niekoho ineho', 'zavolajte niekoho iného',
  'to neni moja starost', 'nezdržujte mě', 'to není moje starost',
]

const CUSTOMER_EMOTION_PROMPT = `Si interný CRM analytik pre Zlatí Řemeslníci.
Vyhodnocuješ emóciu klienta na jednej zákazke.

Pravidlá:
- Sleduj iba klientsku skúsenosť, nie interné prevádzkové poznámky ako hlavný zdroj pravdy.
- Interné poznámky použi iba ako slabý doplnkový kontext.
- Samotná interná poznámka NESMIE vytvoriť kritický alarm bez opory v chate alebo hovore.
- Výstup musí byť prísne JSON.

Vráť:
{
  "sentiment": "very_negative|negative|neutral|positive|very_positive",
  "score": -100,
  "summary": "stručné zhrnutie pre CRM",
  "complaintRisk": true,
  "escalationRisk": false,
  "clientIgnored": false,
  "techProfessionalRisk": false,
  "recommendedAction": "konkrétny ďalší krok operátora"
}`

export async function evaluateCustomerEmotion(input: CustomerEmotionInput): Promise<CustomerEmotionEvaluation> {
  const fallback = buildCustomerEmotionFallback(input)
  const llm = await evaluateCustomerEmotionWithLlm(input)

  if (!llm) {
    return fallback
  }

  const hasPrimaryNegativeSource = fallback.evidence.some(item => item.source !== 'note' && item.scoreImpact < 0)
  const notesOnlyNegative = !hasPrimaryNegativeSource && fallback.evidence.some(item => item.source === 'note' && item.scoreImpact < 0)

  const score = clampScore(llm.score)
  let sentiment = normalizeSentiment(llm.sentiment)
  let complaintRisk = Boolean(llm.complaintRisk)
  let escalationRisk = Boolean(llm.escalationRisk)

  if (notesOnlyNegative) {
    complaintRisk = false
    escalationRisk = false
    if (sentiment === 'very_negative') sentiment = 'negative'
  }

  return {
    sentiment,
    score: notesOnlyNegative ? Math.max(score, -35) : score,
    summary: llm.summary?.trim() || fallback.summary,
    complaintRisk,
    escalationRisk,
    clientIgnored: Boolean(llm.clientIgnored) || fallback.clientIgnored,
    techProfessionalRisk: Boolean(llm.techProfessionalRisk) || fallback.techProfessionalRisk,
    sources: fallback.sources,
    evidence: fallback.evidence,
    recommendedAction: llm.recommendedAction?.trim() || fallback.recommendedAction,
    generatedAt: new Date().toISOString(),
  }
}

export function buildCustomerEmotionFallback(input: CustomerEmotionInput): CustomerEmotionEvaluation {
  const scoredSources = collectScoredSources(input)
  const primarySources = scoredSources.filter(source => source.isPrimary)

  const totalScore = clampScore(
    Math.round(scoredSources.reduce((sum, source) => sum + source.score, 0))
  )
  const complaintFromPrimary = primarySources.some(source => source.complaintHits.length > 0)
  const escalationFromPrimary = primarySources.some(source => source.escalationHits.length > 0)
  const techProfessionalRisk = primarySources.some(source => source.techRiskHits.length > 0)

  const clientMessages = input.messages.filter(message => message.from_role === 'client' && isClientVisibleChannel(message.channel))
  const responseMessages = input.messages.filter(message => message.from_role !== 'client' && isClientVisibleChannel(message.channel))
  const clientIgnored = clientMessages.length >= 2 && responseMessages.length * 2 < clientMessages.length

  const sentiment = sentimentFromScore(totalScore)
  const evidence = scoredSources
    .filter(source => source.score !== 0 || source.complaintHits.length > 0 || source.escalationHits.length > 0 || source.techRiskHits.length > 0)
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 3)
    .map(source => ({
      source: source.source,
      createdAt: source.createdAt,
      excerpt: source.text,
      role: source.role,
      scoreImpact: Math.round(source.score),
    }))

  return {
    sentiment,
    score: totalScore,
    summary: buildFallbackSummary(sentiment, {
      complaintRisk: complaintFromPrimary,
      escalationRisk: escalationFromPrimary,
      clientIgnored,
      techProfessionalRisk,
      customerName: input.customerName,
    }),
    complaintRisk: complaintFromPrimary,
    escalationRisk: escalationFromPrimary,
    clientIgnored,
    techProfessionalRisk,
    sources: {
      chat: input.messages.filter(message => isClientVisibleChannel(message.channel)).length,
      calls: input.voicebotCalls.length + input.operatorCalls.length,
      notes: input.notes.length,
    },
    evidence,
    recommendedAction: buildRecommendedAction({
      sentiment,
      complaintRisk: complaintFromPrimary,
      escalationRisk: escalationFromPrimary,
      clientIgnored,
      techProfessionalRisk,
    }),
    generatedAt: new Date().toISOString(),
  }
}

async function evaluateCustomerEmotionWithLlm(input: CustomerEmotionInput): Promise<LlmCustomerEmotionResult | null> {
  const lines = buildLlmContextLines(input)
  if (lines.length === 0) {
    return null
  }

  const result = await chatCompletion({
    systemPrompt: CUSTOMER_EMOTION_PROMPT,
    userMessage: [
      `Zákazka: ${input.referenceNumber || 'bez ref.'}`,
      `Klient: ${input.customerName || 'neznámy klient'}`,
      '',
      lines.join('\n'),
    ].join('\n'),
    jsonMode: true,
    maxTokens: 350,
    reasoning: 'none',
    temperature: 0.1,
    model: TIER_A_MODEL,
    provider: TIER_A_PROVIDER,
  })

  return parseLLMJson<LlmCustomerEmotionResult>(result)
}

function buildLlmContextLines(input: CustomerEmotionInput): string[] {
  const lines: string[] = []

  for (const message of input.messages) {
    if (!isClientVisibleChannel(message.channel) || !message.message?.trim()) continue
    const role = message.from_role === 'client'
      ? 'KLIENT'
      : message.from_role === 'tech'
        ? 'TECHNIK'
        : message.from_role === 'operator'
          ? 'OPERATOR'
          : 'SYSTEM'
    lines.push(`[CHAT:${role}] ${trimSnippet(message.message)}`)
  }

  for (const call of input.voicebotCalls) {
    const text = call.summary || call.transcript
    if (!text?.trim()) continue
    lines.push(`[VOICEBOT:${call.direction}] ${trimSnippet(text)}`)
  }

  for (const call of input.operatorCalls) {
    const text = call.summary || call.transcript
    if (!text?.trim()) continue
    lines.push(`[OPERATOR_CALL:${call.direction}] ${trimSnippet(text)}`)
  }

  for (const note of input.notes.slice(0, 3)) {
    if (!note.content?.trim()) continue
    lines.push(`[NOTE:LOW_WEIGHT] ${trimSnippet(note.content)}`)
  }

  return lines.slice(0, 30)
}

function collectScoredSources(input: CustomerEmotionInput): ScoredTextSource[] {
  const items: ScoredTextSource[] = []

  for (const message of input.messages) {
    if (!isClientVisibleChannel(message.channel) || !message.message?.trim()) continue
    items.push(scoreTextSource({
      source: 'chat',
      createdAt: normalizeDate(message.created_at),
      role: message.from_role,
      text: message.message,
      weight: message.from_role === 'client' ? 1.2 : 1,
      isPrimary: true,
    }))
  }

  for (const call of input.voicebotCalls) {
    const text = call.transcript || call.summary
    if (!text?.trim()) continue
    items.push(scoreTextSource({
      source: 'voicebot',
      createdAt: normalizeDate(call.ended_at ?? call.created_at),
      role: 'client',
      text,
      weight: 1.3,
      isPrimary: true,
    }))
  }

  for (const call of input.operatorCalls) {
    const text = call.transcript || call.summary
    if (!text?.trim()) continue
    items.push(scoreTextSource({
      source: 'operator_call',
      createdAt: normalizeDate(call.ended_at ?? call.started_at ?? call.created_at),
      role: 'client',
      text,
      weight: 1.15,
      isPrimary: true,
    }))
  }

  for (const note of input.notes) {
    if (!note.content?.trim()) continue
    items.push(scoreTextSource({
      source: 'note',
      createdAt: normalizeDate(note.created_at),
      role: 'operator',
      text: note.content,
      weight: 0.35,
      isPrimary: false,
    }))
  }

  return items
}

function scoreTextSource(input: {
  source: CustomerEmotionEvidenceSource
  createdAt: string
  role?: string
  text: string
  weight: number
  isPrimary: boolean
}): ScoredTextSource {
  const lower = normalizeText(input.text)
  const complaintHits = COMPLAINT_KEYWORDS.filter(keyword => lower.includes(keyword))
  const escalationHits = ESCALATION_KEYWORDS.filter(keyword => lower.includes(keyword))
  const negativeHits = NEGATIVE_KEYWORDS.filter(keyword => lower.includes(keyword))
  const positiveHits = POSITIVE_KEYWORDS.filter(keyword => lower.includes(keyword))
  const techRiskHits = TECH_UNPROFESSIONAL_KEYWORDS.filter(keyword => lower.includes(keyword))

  let score = 0
  score -= complaintHits.length * 24
  score -= escalationHits.length * 18
  score -= negativeHits.length * 8
  score += positiveHits.length * 10

  if (input.role === 'tech' || lower.includes('technik') || lower.includes('technik')) {
    score -= techRiskHits.length * 14
  }

  score *= input.weight

  return {
    source: input.source,
    createdAt: input.createdAt,
    role: input.role,
    text: trimSnippet(input.text),
    score,
    complaintHits,
    escalationHits,
    negativeHits,
    positiveHits,
    techRiskHits,
    isPrimary: input.isPrimary,
  }
}

function buildFallbackSummary(
  sentiment: CustomerEmotionSentiment,
  flags: {
    complaintRisk: boolean
    escalationRisk: boolean
    clientIgnored: boolean
    techProfessionalRisk: boolean
    customerName?: string | null
  }
): string {
  const subject = flags.customerName?.trim() || 'Klient'

  if (flags.escalationRisk) {
    return `${subject} signalizuje potrebu eskalácie a odporúča sa rýchly operátorský zásah.`
  }
  if (flags.complaintRisk) {
    return `${subject} je výrazne nespokojný a z komunikácie vyplýva riziko reklamácie.`
  }
  if (flags.clientIgnored) {
    return `${subject} môže mať pocit, že zostal bez odpovede alebo bez jasného ďalšieho kroku.`
  }
  if (flags.techProfessionalRisk) {
    return `${subject} zachytil tón alebo správanie technika, ktoré môže poškodiť dôveru vo firmu.`
  }
  if (sentiment === 'very_positive' || sentiment === 'positive') {
    return `${subject} komunikuje pozitívne a aktuálna skúsenosť pôsobí stabilne.`
  }
  if (sentiment === 'very_negative' || sentiment === 'negative') {
    return `${subject} komunikuje napäto a zákazka si pýta zvýšenú pozornosť CRM tímu.`
  }
  return `${subject} komunikuje neutrálne, bez zjavného eskalačného signálu.`
}

function buildRecommendedAction(flags: {
  sentiment: CustomerEmotionSentiment
  complaintRisk: boolean
  escalationRisk: boolean
  clientIgnored: boolean
  techProfessionalRisk: boolean
}): string {
  if (flags.escalationRisk) {
    return 'Zavolať klientovi ešte dnes, potvrdiť ďalší postup a prevziať komunikáciu operátorom.'
  }
  if (flags.complaintRisk) {
    return 'Proaktívne kontaktovať klienta, uznať problém a dohodnúť konkrétny termín alebo nápravu.'
  }
  if (flags.clientIgnored) {
    return 'Skontrolovať posledné otvorené otázky klienta a doplniť mu jasnú odpoveď alebo termín.'
  }
  if (flags.techProfessionalRisk) {
    return 'Preveriť priebeh s technikom a nastaviť korekciu komunikácie ešte pred ďalším kontaktom.'
  }
  if (flags.sentiment === 'positive' || flags.sentiment === 'very_positive') {
    return 'Nie je potrebný zásah, stačí držať štandard komunikácie a uzavrieť zákazku bez trenia.'
  }
  return 'Pokračovať v štandardnej komunikácii a sledovať ďalšie signály z chatu alebo hovorov.'
}

function sentimentFromScore(score: number): CustomerEmotionSentiment {
  if (score <= -60) return 'very_negative'
  if (score <= -20) return 'negative'
  if (score < 20) return 'neutral'
  if (score < 60) return 'positive'
  return 'very_positive'
}

function normalizeSentiment(sentiment: string): CustomerEmotionSentiment {
  switch (sentiment) {
    case 'very_negative':
    case 'negative':
    case 'neutral':
    case 'positive':
    case 'very_positive':
      return sentiment
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

function isClientVisibleChannel(channel: string | null | undefined): boolean {
  return channel === 'client' || channel === 'tech-client'
}
