/**
 * Chat Supervisor — Dohľad nad AI chatbotmi
 *
 * Monitoruje konverzácie AI botov a keď detekuje:
 * - bot si nevie poradiť (opakujúce sa otázky bez riešenia)
 * - zákazník explicitne žiada ľudský kontakt
 * - citlivú tému (právnu, bezpečnostnú)
 * → Vytvorí signál pre operátora, aby prebral chat
 */

import { query, isDatabaseAvailable } from '@/lib/db'
import { chatCompletion, parseLLMJson } from '@/lib/llm'
import type { AgentResult, BrainSignalCreate } from '@/lib/aiBrain/types'
import { createHandoffSummary } from '@/lib/chatWorkspace'
import { isAgentCooldownActive } from '@/lib/aiBrain/utils/signalManager'

// ── Per-job LLM cooldown and cycle cap ────────────────────────────────
// DB-persisted cooldown via isAgentCooldownActive (survives cold starts)
const CHAT_ANALYSIS_COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes
const MAX_CHATS_PER_CYCLE = 20

// Slová, ktoré indikujú zákazník chce ľudský kontakt
const HUMAN_REQUESTED_KEYWORDS = [
    // SK
    'chcem operátora', 'chcem hovoriť s človekom', 'zapojte živú osobu',
    'prepojte ma', 'dajte mi ľudí', 'nie robota', 'živý agent',
    'chcem telefonát', 'zavolajte mi', 'hovor', 'volajte',
    // CZ
    'chci operátora', 'chci mluvit s člověkem', 'zapojte živou osobu',
    'přepojte mě', 'dejte mi lidi', 'ne robot', 'živý agent',
    // EN
    'human agent', 'talk to person', 'real person', 'call me', 'phone call',
]

const SENSITIVE_KEYWORDS = [
    // Právne
    'advokát', 'súd', 'žaloba', 'soudní', 'žalovat', 'lawyer', 'sue', 'court',
    // Bezpečnostné — len konkrétne nebezpečné frázy, nie bare 'plyn' (falošné poplachy)
    'uhrazač plynu', 'únik plynu', 'cítim plyn', 'elektrický požiar', 'požiar', 'oheň',
    'výbuch', 'explózia', 'nebezpečenstvo', 'hasič',
    // CZ verzie
    'unik plynu', 'cítím plyn', 'el. požár', 'hasiči',
]

// ── LLM-based chat analysis ────────────────────────────────────────────

interface LLMSupervisorResult {
    humanRequested: boolean       // client wants to talk to a person
    sensitiveTopic: boolean       // legal, safety, or emergency topic detected
    sensitiveDetails: string | null
    botLoop: boolean              // bot is repeating itself
    botNeedsHelp: boolean         // conversation is going nowhere
    overallQuality: 'good' | 'acceptable' | 'poor'
    customerIntent: string
    whatAiAlreadyDid: string[]
    unresolvedQuestions: string[]
    suggestedReply: string | null
    suggestedNextAction: string | null
    summary: string
}

const SUPERVISOR_SYSTEM_PROMPT = `Si supervízor chatov zákazníckeho servisu Zlatí Řemeslníci (havarijný servis pre poisťovne).

Analyzuj konverzáciu a identifikuj:
1. humanRequested — klient explicitne žiada hovoriť s ľudským operátorom
2. sensitiveTopic — právne, bezpečnostné alebo núdzové témy (advokát, súd, únik plynu, požiar)
3. botLoop — AI bot opakuje rovnaké/podobné odpovede (zaseknutý v slučke)
4. botNeedsHelp — konverzácia je dlhá bez riešenia, klient nedostáva adekvátnu pomoc
5. overallQuality — celková kvalita konverzácie (good/acceptable/poor)
6. customerIntent — jednou vetou popíš čo klient chce dosiahnuť
7. whatAiAlreadyDid — zoznam krokov alebo odpovedí, ktoré už AI vykonala
8. unresolvedQuestions — otvorené otázky, ktoré ostali nevyriešené
9. suggestedReply — krátky draft odpovede od človeka alebo null
10. suggestedNextAction — odporúčaný ďalší krok operátora alebo null

Správy sú v slovenčine alebo češtine. Role v konverzácii:
- KLIENT: zákazník
- OPERÁTOR: ľudský operátor alebo AI bot (správy od "operator" sú často AI botom)
- SYSTÉM: automatické systémové správy
- TECHNIK: technik v teréne

Odpovedz VÝLUČNE v JSON:
{
  "humanRequested": true/false,
  "sensitiveTopic": true/false,
  "sensitiveDetails": "text alebo null",
  "botLoop": true/false,
  "botNeedsHelp": true/false,
  "overallQuality": "good|acceptable|poor",
  "customerIntent": "stručne čo klient chce",
  "whatAiAlreadyDid": ["krok 1", "krok 2"],
  "unresolvedQuestions": ["otázka 1"],
  "suggestedReply": "draft odpovede alebo null",
  "suggestedNextAction": "ďalší krok alebo null",
  "summary": "stručné zhrnutie stavu konverzácie"
}`

async function analyzeChatLLM(chat: ActiveChat): Promise<LLMSupervisorResult | null> {
    const conversationText = chat.messages.map(m => {
        const role = m.from_role === 'client' ? 'KLIENT' :
                     m.from_role === 'tech' ? 'TECHNIK' :
                     m.from_role === 'operator' ? 'OPERÁTOR' : 'SYSTÉM'
        return `[${role}]: ${m.message}`
    }).join('\n')

    const callContext = chat.callSummaries.length > 0
        ? `\n\nTelefonáty (${chat.callSummaries.length}):\n${chat.callSummaries.map(s => `- ${s}`).join('\n')}`
        : ''

    const result = await chatCompletion({
        systemPrompt: SUPERVISOR_SYSTEM_PROMPT,
        userMessage: `Zákazka: ${chat.reference_number || '#' + chat.job_id}\nZákazník: ${chat.customer_name || 'N/A'}\n\nKonverzácia:\n${conversationText}${callContext}`,
        jsonMode: true,
        maxTokens: 300,
        temperature: 0.2,
        reasoning: 'medium',
    })

    return parseLLMJson<LLMSupervisorResult>(result)
}

export async function runChatSupervisorAgent(): Promise<AgentResult> {
    const startTime = Date.now()
    const signals: BrainSignalCreate[] = []
    let jobsScanned = 0
    let errorMsg: string | undefined

    try {
        // Načítaj konverzácie kde bol systémový/bot aktívny za posledné 2 hodiny
        const activeChats = await getActiveChats()
        jobsScanned = activeChats.length

        let llmCallsThisCycle = 0
        for (const chat of activeChats) {
            const allMessages = chat.messages
            const clientMessages = allMessages.filter(m => m.from_role === 'client')
            const systemMessages = allMessages.filter(m => m.from_role === 'system')
            const reference = chat.reference_number || `Job #${chat.job_id}`
            const lastRelevantMessageAt = chat.messages[chat.messages.length - 1]?.created_at?.toISOString() || new Date().toISOString()

            // Check per-job cooldown (DB-persisted) and cycle cap before LLM call
            const cooldownActive = await isAgentCooldownActive('chat_supervisor', chat.job_id, 'job_id', CHAT_ANALYSIS_COOLDOWN_MS)
            const cycleCapReached = llmCallsThisCycle >= MAX_CHATS_PER_CYCLE

            let llmResult = null
            if (!cooldownActive && !cycleCapReached) {
                llmResult = await analyzeChatLLM(chat)
                llmCallsThisCycle++
            }

            if (llmResult) {
                if (llmResult.humanRequested) {
                    const handoffSummary = createHandoffSummary({
                        reasonCode: 'human_requested',
                        urgency: 'critical',
                        waitingOn: 'operator',
                        customerIntent: llmResult.customerIntent,
                        oneParagraphSummary: llmResult.summary,
                        whatAiAlreadyDid: llmResult.whatAiAlreadyDid,
                        unresolvedQuestions: llmResult.unresolvedQuestions,
                        suggestedReply: llmResult.suggestedReply,
                        suggestedReplies: {
                            client: llmResult.suggestedReply,
                            technician: null,
                        },
                        suggestedNextAction: llmResult.suggestedNextAction,
                        lastRelevantMessageAt,
                    })
                    signals.push({
                        jobId: chat.job_id,
                        agentType: 'chat_supervisor',
                        signalType: 'HUMAN_REQUESTED',
                        title: `Zákazník žiada ľudského operátora — ${reference}`,
                        description: `${chat.customer_name || 'Zákazník'}: ${llmResult.summary}`,
                        data: { source: 'llm', quality: llmResult.overallQuality, handoffSummary },
                        expiresAt: addHours(new Date(), 2),
                    })
                }

                if (llmResult.sensitiveTopic) {
                    const handoffSummary = createHandoffSummary({
                        reasonCode: 'sensitive_topic',
                        urgency: 'critical',
                        waitingOn: 'operator',
                        customerIntent: llmResult.customerIntent,
                        oneParagraphSummary: llmResult.sensitiveDetails || llmResult.summary,
                        whatAiAlreadyDid: llmResult.whatAiAlreadyDid,
                        unresolvedQuestions: llmResult.unresolvedQuestions,
                        suggestedReply: llmResult.suggestedReply,
                        suggestedReplies: {
                            client: llmResult.suggestedReply,
                            technician: null,
                        },
                        suggestedNextAction: llmResult.suggestedNextAction,
                        lastRelevantMessageAt,
                    })
                    signals.push({
                        jobId: chat.job_id,
                        agentType: 'chat_supervisor',
                        signalType: 'SENSITIVE_TOPIC',
                        title: `Citlivá téma v chate — ${reference}`,
                        description: `${llmResult.sensitiveDetails || llmResult.summary}`,
                        data: { source: 'llm', handoffSummary },
                        expiresAt: addHours(new Date(), 4),
                    })
                }

                if (llmResult.botLoop) {
                    const handoffSummary = createHandoffSummary({
                        reasonCode: 'bot_loop',
                        urgency: 'high',
                        waitingOn: 'operator',
                        customerIntent: llmResult.customerIntent,
                        oneParagraphSummary: llmResult.summary,
                        whatAiAlreadyDid: llmResult.whatAiAlreadyDid,
                        unresolvedQuestions: llmResult.unresolvedQuestions,
                        suggestedReply: llmResult.suggestedReply,
                        suggestedReplies: {
                            client: llmResult.suggestedReply,
                            technician: null,
                        },
                        suggestedNextAction: llmResult.suggestedNextAction,
                        lastRelevantMessageAt,
                    })
                    signals.push({
                        jobId: chat.job_id,
                        agentType: 'chat_supervisor',
                        signalType: 'BOT_LOOP',
                        title: `Bot v slučke — ${reference}`,
                        description: llmResult.summary,
                        data: { source: 'llm', handoffSummary },
                        expiresAt: addHours(new Date(), 2),
                    })
                }

                if (llmResult.botNeedsHelp) {
                    const handoffSummary = createHandoffSummary({
                        reasonCode: 'bot_needs_help',
                        urgency: 'high',
                        waitingOn: 'operator',
                        customerIntent: llmResult.customerIntent,
                        oneParagraphSummary: llmResult.summary,
                        whatAiAlreadyDid: llmResult.whatAiAlreadyDid,
                        unresolvedQuestions: llmResult.unresolvedQuestions,
                        suggestedReply: llmResult.suggestedReply,
                        suggestedReplies: {
                            client: llmResult.suggestedReply,
                            technician: null,
                        },
                        suggestedNextAction: llmResult.suggestedNextAction,
                        lastRelevantMessageAt,
                    })
                    signals.push({
                        jobId: chat.job_id,
                        agentType: 'chat_supervisor',
                        signalType: 'BOT_NEEDS_HELP',
                        title: `Bot potrebuje pomoc — ${reference}`,
                        description: llmResult.summary,
                        data: { source: 'llm', quality: llmResult.overallQuality, handoffSummary },
                        expiresAt: addHours(new Date(), 4),
                    })
                }

                continue // Skip keyword fallback
            }

            // FALLBACK: keyword-based analysis

            // ── 1. Ľudský agent požadovaný ──────────────────────────────
            for (const msg of clientMessages) {
                const lower = msg.message.toLowerCase()
                const humanKeywords = HUMAN_REQUESTED_KEYWORDS.filter(kw => lower.includes(kw))
                if (humanKeywords.length > 0) {
                    const handoffSummary = createHandoffSummary({
                        reasonCode: 'human_requested',
                        urgency: 'critical',
                        waitingOn: 'operator',
                        customerIntent: 'Klient chce hovoriť s človekom',
                        oneParagraphSummary: `${chat.customer_name || 'Zákazník'} explicitne žiada ľudského operátora.`,
                        unresolvedQuestions: [msg.message.substring(0, 200)],
                        suggestedNextAction: 'Prevziať konverzáciu a potvrdiť ľudský takeover.',
                        lastRelevantMessageAt: msg.created_at.toISOString(),
                    })
                    signals.push({
                        jobId: chat.job_id,
                        agentType: 'chat_supervisor',
                        signalType: 'HUMAN_REQUESTED',
                        title: `Zákazník žiada ľudského operátora — ${reference}`,
                        description: `${chat.customer_name || 'Zákazník'} explicitne žiada presmerovanie na ľudského operátora v chate zákazky ${reference}. Preberte chat čo najskôr.`,
                        data: {
                            messageSnippet: msg.message.substring(0, 200),
                            keywords: humanKeywords,
                            chatJobId: chat.job_id,
                            handoffSummary,
                        },
                        expiresAt: addHours(new Date(), 2),
                    })
                    break // Len 1 signál per chat
                }
            }

            // ── 2. Citlivá téma ────────────────────────────────────────
            for (const msg of clientMessages) {
                const lower = msg.message.toLowerCase()
                const sensitiveKeywords = SENSITIVE_KEYWORDS.filter(kw => lower.includes(kw))
                if (sensitiveKeywords.length > 0) {
                    const handoffSummary = createHandoffSummary({
                        reasonCode: 'sensitive_topic',
                        urgency: 'critical',
                        waitingOn: 'operator',
                        customerIntent: 'Klient otvoril citlivú alebo rizikovú tému',
                        oneParagraphSummary: `Detekované citlivé výrazy: ${sensitiveKeywords.join(', ')}.`,
                        unresolvedQuestions: [msg.message.substring(0, 200)],
                        suggestedNextAction: 'Skontrolovať riziko a prevziať komunikáciu človekom.',
                        lastRelevantMessageAt: msg.created_at.toISOString(),
                    })
                    signals.push({
                        jobId: chat.job_id,
                        agentType: 'chat_supervisor',
                        signalType: 'SENSITIVE_TOPIC',
                        title: `Citlivá téma v chate — ${reference}`,
                        description: `V chate zákazky ${reference} boli detekované citlivé kľúčové slová: ${sensitiveKeywords.join(', ')}. Táto konverzácia vyžaduje ľudskú pozornosť.`,
                        data: {
                            keywords: sensitiveKeywords,
                            messageSnippet: msg.message.substring(0, 200),
                            handoffSummary,
                        },
                        expiresAt: addHours(new Date(), 4),
                    })
                    break
                }
            }

            // ── 3. Bot loop — systém opakuje rovnaké odpovede ──────────
            if (systemMessages.length >= 3) {
                const lastThree = systemMessages.slice(-3).map(m => m.message.toLowerCase())
                // Ak sú posledné 3 správy systému veľmi podobné (>70% rovnaké znaky)
                if (areSimilar(lastThree[0], lastThree[1]) && areSimilar(lastThree[1], lastThree[2])) {
                    const handoffSummary = createHandoffSummary({
                        reasonCode: 'bot_loop',
                        urgency: 'high',
                        waitingOn: 'operator',
                        customerIntent: 'Klient nedostal posun, AI sa opakuje',
                        oneParagraphSummary: `AI opakuje podobné odpovede v zákazke ${reference}.`,
                        whatAiAlreadyDid: systemMessages.slice(-3).map((m) => m.message.substring(0, 160)),
                        suggestedNextAction: 'Prevziať chat a potvrdiť ďalší postup.',
                        lastRelevantMessageAt,
                    })
                    signals.push({
                        jobId: chat.job_id,
                        agentType: 'chat_supervisor',
                        signalType: 'BOT_LOOP',
                        title: `Bot v slučke — ${reference}`,
                        description: `AI chatbot v zákazke ${reference} opakuje veľmi podobné odpovede. Zákazník zrejme nenachádza riešenie. Odporúčame prevziať konverzáciu.`,
                        data: { messageCount: allMessages.length, systemMessageCount: systemMessages.length, handoffSummary },
                        expiresAt: addHours(new Date(), 2),
                    })
                }
            }

            // ── 4. Bot nedokáže odpovedať (veľa NEDÁVNYCH správ bez riešenia) ──
            // Count only client messages from last 2 hours (matching query window)
            // Threshold: >=5 client messages (not 3) to reduce false positives
            // Also require that the last message in the conversation is from the client
            // (i.e. the conversation ended with an unanswered client message)
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
            const recentClientMessages = clientMessages.filter(m => m.created_at && m.created_at > twoHoursAgo)
            const lastMessage = allMessages[allMessages.length - 1]
            const lastMessageFromClient = lastMessage?.from_role === 'client'
            if (recentClientMessages.length >= 5 && lastMessageFromClient && chat.crm_step < 14) {
                const handoffSummary = createHandoffSummary({
                    reasonCode: 'bot_needs_help',
                    urgency: 'high',
                    waitingOn: 'operator',
                    customerIntent: 'Klient stále nedostal vyriešenie požiadavky',
                    oneParagraphSummary: `Aktívna konverzácia bez riešenia, klient odoslal ${recentClientMessages.length} správ za posledné 2 hodiny a posledná správa zostala nezodpovedaná.`,
                    unresolvedQuestions: recentClientMessages.slice(-3).map((m) => m.message.substring(0, 180)),
                    suggestedNextAction: 'Skontrolovať posledné správy a prevziať konverzáciu.',
                    lastRelevantMessageAt,
                })
                signals.push({
                    jobId: chat.job_id,
                    agentType: 'chat_supervisor',
                    signalType: 'BOT_NEEDS_HELP',
                    title: `Aktívna konverzácia bez riešenia (${recentClientMessages.length} správ/2h) — ${reference}`,
                    description: `Zákazník ${chat.customer_name || 'N/A'} odoslal ${recentClientMessages.length} správ za posledné 2 hodiny v zákazke ${reference} bez viditeľného riešenia. Zvážte prebratia chatu.`,
                    data: { recentClientMessageCount: recentClientMessages.length, totalMessages: allMessages.length, handoffSummary },
                    expiresAt: addHours(new Date(), 4),
                })
            }
        }
    } catch (err) {
        errorMsg = String(err)
        console.error('[ChatSupervisor] Error:', err)
    }

    return {
        agentType: 'chat_supervisor',
        signals,
        jobsScanned,
        durationMs: Date.now() - startTime,
        error: errorMsg,
    }
}

// ── Similarity check (jednoduchý) ─────────────────────────────────────

function areSimilar(a: string, b: string, threshold = 0.7): boolean {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2))
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2))
    if (wordsA.size === 0 || wordsB.size === 0) return false
    let intersection = 0
    Array.from(wordsA).forEach(w => {
        if (wordsB.has(w)) intersection++
    })
    const union = wordsA.size + wordsB.size - intersection
    return union > 0 ? intersection / union >= threshold : false
}

// ── Data helpers ──────────────────────────────────────────────────────

interface ChatMessage {
    id: number
    from_role: string
    message: string
    created_at: Date
}

interface ActiveChat {
    job_id: number
    reference_number: string | null
    customer_name: string | null
    crm_step: number
    messages: ChatMessage[]
    callSummaries: string[]
}

async function getActiveChats(): Promise<ActiveChat[]> {
    if (!isDatabaseAvailable()) return []

    // Zákazky s messagmi za posledné 2 hodiny
    const [msgResult, callResult] = await Promise.all([
        query(
            `SELECT
           j.id as job_id, j.reference_number, j.customer_name, j.crm_step,
           jm.id as msg_id, jm.from_role, jm.message, jm.created_at as msg_time
         FROM jobs j
         JOIN job_messages jm ON jm.job_id = j.id
         WHERE jm.created_at > NOW() - INTERVAL '2 hours'
           AND j.crm_step BETWEEN 0 AND 14
         ORDER BY j.id, jm.created_at ASC
         LIMIT 2000`
        ),
        // Call transcripts for active jobs (last 24h)
        query(
            `SELECT jct.job_id, jct.summary
         FROM job_call_transcripts jct
         INNER JOIN (
           SELECT DISTINCT j.id
           FROM jobs j
           JOIN job_messages jm ON jm.job_id = j.id
           WHERE jm.created_at > NOW() - INTERVAL '2 hours'
             AND j.crm_step BETWEEN 0 AND 14
         ) active ON active.id = jct.job_id
         WHERE jct.summary IS NOT NULL
           AND jct.created_at > NOW() - INTERVAL '24 hours'
         ORDER BY jct.created_at DESC
         LIMIT 100`
        ).catch(err => {
          console.warn('[chatSupervisor] call transcripts fetch failed:', err)
          return { rows: [] as Array<Record<string, unknown>> }
        }),
    ])

    // Group call summaries by job_id
    const callMap = new Map<number, string[]>()
    for (const row of callResult.rows as Array<Record<string, unknown>>) {
        const jobId = Number(row.job_id)
        if (!callMap.has(jobId)) callMap.set(jobId, [])
        callMap.get(jobId)!.push(row.summary as string)
    }

    // Skupinuj podľa job_id
    const chatMap = new Map<number, ActiveChat>()
    for (const row of msgResult.rows as Array<Record<string, unknown>>) {
        const jobId = Number(row.job_id)
        if (!chatMap.has(jobId)) {
            chatMap.set(jobId, {
                job_id: jobId,
                reference_number: row.reference_number as string | null,
                customer_name: row.customer_name as string | null,
                crm_step: Number(row.crm_step),
                messages: [],
                callSummaries: callMap.get(jobId) ?? [],
            })
        }
        chatMap.get(jobId)!.messages.push({
            id: Number(row.msg_id),
            from_role: row.from_role as string,
            message: row.message as string,
            created_at: new Date(row.msg_time as string),
        })
    }

    return Array.from(chatMap.values())
}

function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 3600000)
}
