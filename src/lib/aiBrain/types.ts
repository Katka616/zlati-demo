/**
 * AI Brain — Typy a konštanty
 *
 * Centrálne typy pre celý AI Brain systém:
 * - SignalType: všetky možné typy signálov
 * - AgentType: typy agentov
 * - Severity: závažnosť signálov
 * - BrainSignal: štruktúra signálu
 * - AgentResult: výstup agenta
 * - BrainEvent: event-driven triggery
 */

// ─── Agent Types ─────────────────────────────────────────────────────

export type AgentType =
    | 'sentinel'       // SLA & Delay monitoring
    | 'emotion'        // Sentiment analysis
    | 'fraud'          // Fraud detection
    | 'escalation'     // Escalation prevention
    | 'technician_health' // Technician loyalty & reliability
    | 'chat_supervisor' // Bot monitoring
    | 'tech_emotion'   // Technician sentiment analysis

// ─── Signal Types ─────────────────────────────────────────────────────

export type SignalType =
    // Sentinel signals
    | 'TECH_LATE'           // Technik mešká na zákazku
    | 'SLA_WARNING'         // SLA >50% spotrebované
    | 'SLA_BREACH'          // SLA prekročené
    | 'JOB_STALE'           // Zákazka bez aktivity >2h
    | 'LONG_VISIT'          // Technik >4h na mieste
    | 'DISPATCH_TIMEOUT'    // Žiadny technik neprijal >30min
    // Emotion signals
    | 'CLIENT_UNHAPPY'      // Nespokojný zákazník
    | 'COMPLAINT_RISK'      // Hrozí reklamácia
    | 'ESCALATION_REQUEST'  // Zákazník žiada nadriadeného
    | 'POSITIVE_FEEDBACK'   // Pozitívna spätná väzba
    | 'TECH_UNPROFESSIONAL' // Neprofesionálna komunikácia technika
    | 'CLIENT_IGNORED'      // Klient bez odpovede
    // Technician health signals
    | 'TECH_ATTRITION_RISK'        // Technik sa od firmy odkláňa
    | 'TECH_MARKETPLACE_AVOIDANCE' // Technik ignoruje marketplace ponuky
    | 'TECH_RELIABILITY_DROP'      // Technik začína rušiť/odmietať viac zásahov
    | 'TECH_SETTLEMENT_MISMATCH'   // Nesúlad appka vs zúčtovanie/protokol
    // Fraud signals
    | 'TIME_MANIPULATION'   // Manuálna zmena časov vs GPS
    | 'KM_FRAUD'            // Nahlásené km >> GPS
    | 'HOURS_ANOMALY'       // Abnormálne hodiny
    | 'MATERIAL_OVERCHARGE' // Predražený materiál
    | 'DIAGNOSTIC_ABUSE'    // Príliš veľa diagnostík bez opravy
    | 'PROTOCOL_TAMPERING'  // Úprava protokolu po odoslaní
    // Escalation signals
    | 'COMPLAINT_IMMINENT'  // Hroziaca reklamácia
    | 'RECURRING_ISSUE'     // Opakovaný problém na adrese
    | 'INCOMPLETE_WORK'     // Nedokončená práca
    | 'SURCHARGE_DECLINED'  // Klient odmietol doplatok
    // Chat supervisor signals
    | 'BOT_NEEDS_HELP'      // Bot si nevie rady
    | 'HUMAN_REQUESTED'     // Zákazník žiada ľudský kontakt
    | 'BOT_LOOP'            // Bot opakuje rovnaké odpovede
    | 'SENSITIVE_TOPIC'     // Citlivá téma v chate
    // Tech emotion signals
    | 'TECH_FRUSTRATED'             // Frustrovaný technik
    | 'TECH_COMMUNICATION_ISSUE'    // Komunikačný problém zo strany technika
    | 'TECH_WORKLOAD_COMPLAINT'     // Sťažnosť technika na záťaž

// ─── Severity ─────────────────────────────────────────────────────────

export type SignalSeverity = 'critical' | 'warning' | 'info'

export const SIGNAL_SEVERITY_MAP: Record<SignalType, SignalSeverity> = {
    // Critical
    TECH_LATE: 'critical',
    SLA_BREACH: 'critical',
    CLIENT_UNHAPPY: 'critical',
    COMPLAINT_RISK: 'critical',
    COMPLAINT_IMMINENT: 'critical',
    TECH_SETTLEMENT_MISMATCH: 'critical',
    TIME_MANIPULATION: 'critical',
    KM_FRAUD: 'critical',
    PROTOCOL_TAMPERING: 'critical',
    HUMAN_REQUESTED: 'critical',
    SENSITIVE_TOPIC: 'critical',
    // Warning
    SLA_WARNING: 'warning',
    JOB_STALE: 'warning',
    LONG_VISIT: 'warning',
    DISPATCH_TIMEOUT: 'warning',
    ESCALATION_REQUEST: 'warning',
    TECH_ATTRITION_RISK: 'warning',
    TECH_MARKETPLACE_AVOIDANCE: 'warning',
    TECH_RELIABILITY_DROP: 'warning',
    HOURS_ANOMALY: 'warning',
    MATERIAL_OVERCHARGE: 'warning',
    DIAGNOSTIC_ABUSE: 'warning',
    RECURRING_ISSUE: 'warning',
    INCOMPLETE_WORK: 'warning',
    SURCHARGE_DECLINED: 'warning',
    BOT_NEEDS_HELP: 'warning',
    BOT_LOOP: 'warning',
    // Info
    POSITIVE_FEEDBACK: 'info',
    // New emotion signals
    TECH_UNPROFESSIONAL: 'warning',
    CLIENT_IGNORED: 'warning',
    // Tech emotion signals
    TECH_FRUSTRATED: 'warning',
    TECH_COMMUNICATION_ISSUE: 'warning',
    TECH_WORKLOAD_COMPLAINT: 'info',
}

// ─── Brain Signal (DB row) ─────────────────────────────────────────────

export interface DBBrainSignal {
    id: number
    job_id: number | null
    technician_id: number | null
    agent_type: AgentType
    signal_type: SignalType
    severity: SignalSeverity
    title: string
    description: string
    data: Record<string, unknown> | null  // JSON extra dáta
    status: SignalStatus
    resolved_by: string | null
    resolved_at: Date | null
    resolved_note: string | null
    detected_at: Date
    expires_at: Date | null
    bridged_to_decision_id?: number | null  // FK → ai_decisions.id (null = ešte nepremostený)
}

export type SignalStatus = 'new' | 'acknowledged' | 'resolved' | 'dismissed' | 'auto_resolved'

// ─── Brain Signal (vytvorenie) ─────────────────────────────────────────

export interface BrainSignalCreate {
    jobId?: number
    technicianId?: number
    agentType: AgentType
    signalType: SignalType
    title: string
    description: string
    data?: Record<string, unknown>
    expiresAt?: Date
}

// ─── Brain Run Log ─────────────────────────────────────────────────────

export interface DBBrainRunLog {
    id: number
    agent_type: AgentType
    jobs_scanned: number
    signals_created: number
    duration_ms: number
    errors: string | null
    run_at: Date
}

// ─── Brain Stats (pre dashboard) ──────────────────────────────────────

export interface BrainStats {
    criticalCount: number
    warningCount: number
    infoCount: number
    totalActive: number
    byAgent: Record<AgentType, number>
    lastRunAt: Date | null
    recentSignals: DBBrainSignal[]
}

// ─── Agent Result ─────────────────────────────────────────────────────

export interface AgentResult {
    agentType: AgentType
    signals: BrainSignalCreate[]
    jobsScanned: number
    durationMs: number
    error?: string
}

// ─── Brain Events (event-driven triggery) ─────────────────────────────

export type BrainEventType =
    | 'status_change'       // Job zmenil status
    | 'message_received'    // Nová chat správa
    | 'protocol_submitted'  // Technik odoslal protokol
    | 'gps_updated'         // GPS update od technika
    | 'visit_created'       // Nový výjazd vytvorený
    | 'rating_submitted'    // Zákazník ohodnotil

export interface BrainEvent {
    type: BrainEventType
    jobId?: number
    technicianId?: number
    data?: Record<string, unknown>
    timestamp: Date
}

// ─── Fraud detekcia ───────────────────────────────────────────────────

export interface FraudCheck {
    jobId: number
    technicianId: number | null
    reportedKm: number
    gpsKm: number | null
    reportedArrival: Date | null
    gpsArrival: Date | null
    totalHours: number | null
    categoryAvgHours: number | null
}

// ─── Emotion analýza ──────────────────────────────────────────────────

export interface EmotionAnalysis {
    score: number          // -100 (very negative) to +100 (very positive)
    sentiment: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
    keywords: string[]     // detekované kľúčové slová
    isComplaintRisk: boolean
    isEscalationRisk: boolean
}

// ─── Signal Labels (pre UI) ──────────────────────────────────────────

export const SIGNAL_LABELS: Record<SignalType, string> = {
    TECH_LATE: 'Technik mešká',
    SLA_WARNING: 'Varovanie SLA',
    SLA_BREACH: 'SLA prekročené',
    JOB_STALE: 'Zákazka zamrznutá',
    LONG_VISIT: 'Dlhý výjazd',
    DISPATCH_TIMEOUT: 'Oneskorené priradenie',
    CLIENT_UNHAPPY: 'Nespokojný zákazník',
    COMPLAINT_RISK: 'Riziko reklamácie',
    ESCALATION_REQUEST: 'Požiadavka eskalácie',
    POSITIVE_FEEDBACK: 'Pozitívna spätná väzba',
    TECH_ATTRITION_RISK: 'Riziko odchodu technika',
    TECH_MARKETPLACE_AVOIDANCE: 'Technik ignoruje marketplace',
    TECH_RELIABILITY_DROP: 'Pokles spoľahlivosti technika',
    TECH_SETTLEMENT_MISMATCH: 'Nesúlad v zúčtovaní technika',
    TIME_MANIPULATION: 'Manipulácia s časmi',
    KM_FRAUD: 'Podvod s km',
    HOURS_ANOMALY: 'Anomálne hodiny',
    MATERIAL_OVERCHARGE: 'Predražený materiál',
    DIAGNOSTIC_ABUSE: 'Diagnostická anomália',
    PROTOCOL_TAMPERING: 'Úprava protokolu',
    COMPLAINT_IMMINENT: 'Hroziaca reklamácia',
    RECURRING_ISSUE: 'Opakovaný problém',
    INCOMPLETE_WORK: 'Nedokončená práca',
    SURCHARGE_DECLINED: 'Doplatok odmietnutý',
    BOT_NEEDS_HELP: 'Bot potrebuje pomoc',
    HUMAN_REQUESTED: 'Zákazník žiada operátora',
    BOT_LOOP: 'Loop v bote',
    SENSITIVE_TOPIC: 'Citlivá téma',
    TECH_UNPROFESSIONAL: 'Neprofesionálna komunikácia technika',
    CLIENT_IGNORED: 'Klient bez odpovede',
    TECH_FRUSTRATED: 'Frustrácia technika',
    TECH_COMMUNICATION_ISSUE: 'Komunikačný problém technika',
    TECH_WORKLOAD_COMPLAINT: 'Sťažnosť na záťaž',
}

export const AGENT_LABELS: Record<AgentType, string> = {
    sentinel: '🔍 Sentinel',
    emotion: '💬 Emotion',
    fraud: '🕵️ Fraud',
    escalation: '⚡ Eskalácia',
    technician_health: '🛠️ Technician Health',
    chat_supervisor: '🤝 Chat Supervisor',
    tech_emotion: '😤 Tech Emotion',
}
