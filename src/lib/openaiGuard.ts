// WARNING: All state is in-memory — resets on every serverless cold start.
// For production, migrate callLog/dailySpendUsd/throttleUntil to Redis or DB.
// Current implementation provides defense-in-depth but not guaranteed budget enforcement.

/**
 * OpenAI API Cost Guard — centrálna ochrana + anomaly detection + self-healing.
 *
 * Chráni pred:
 * 1. Zacyklením (rovnaký job volaný opakovane)
 * 2. Burst (príliš veľa volaní za hodinu)
 * 3. Prekročením denného budgetu ($25 hard stop)
 * 4. Anomálnym správaním (detekcia spike + automatický throttle)
 *
 * Self-healing:
 * - Ak za posledných 5 minút prišlo 3× viac volaní než je normál → automatický throttle
 * - Throttle znižuje hourly limit na 25% po dobu 15 minút
 * - Ak sa situácia vráti do normálu → automatické obnovenie
 *
 * SMS: len pri 100% budget (hard stop) — max 1 SMS za 30 minút
 */

// ── Konfigurácia limitov ─────────────────────────────────────────
const LIMITS = {
  /** Max volaní na hodinu pre každý typ (globálne) */
  maxPerHour: {
    enrichment: 100,
    vision: 80,
    webSearch: 60,
    emailParse: 50,
    materials: 100,
    emotion: 50,
    invoice: 50,
    other: 100,
  } as Record<string, number>,

  /** Max volaní pre rovnaký job + typ (ochrana pred zacyklením) */
  maxPerJob: {
    enrichment: 3,
    vision: 3,
    webSearch: 2,
    emailParse: 5,
    materials: 3,
    emotion: 3,
    invoice: 5,
    other: 5,
  } as Record<string, number>,

  /** Denný budget v USD — hard stop */
  dailyBudgetUsd: 25,

  /** Odhadované náklady per call v USD */
  estimatedCostPerCall: {
    enrichment: 0.01,
    vision: 0.03,
    webSearch: 0.005,
    emailParse: 0.008,
    materials: 0.005,
    emotion: 0.005,
    invoice: 0.01,
    other: 0.01,
  } as Record<string, number>,
} as const

type CallType = string

// ── In-memory tracking ───────────────────────────────────────────
interface CallRecord {
  timestamp: number
  callType: string
  jobId?: number
  estimatedCostUsd: number
}

const callLog: CallRecord[] = []
const jobCallCounts = new Map<string, number>()  // "type:jobId" → count
let dailySpendUsd = 0
let dailyResetDate = new Date().toDateString()

// ── Anomaly detection ────────────────────────────────────────────
let throttleUntil = 0              // timestamp — ak > now, sme v throttle mode
let lastAnomalyCheck = 0
const ANOMALY_WINDOW_MS = 5 * 60 * 1000    // 5 minút
const ANOMALY_MULTIPLIER = 3               // 3× viac volaní než normál = anomália
const THROTTLE_DURATION_MS = 15 * 60 * 1000 // throttle trvá 15 minút
const THROTTLE_FACTOR = 0.25               // počas throttle = 25% normálnych limitov

// ── Alert tracking ───────────────────────────────────────────────
const ALERT_THRESHOLDS = [50, 75, 90, 100] as const
let lastAlertPercent = 0
let lastSmsSentAt = 0
const SMS_COOLDOWN_MS = 30 * 60 * 1000

/** Vyčistiť záznamy staršie ako 1 hodina */
function pruneOld() {
  const cutoff = Date.now() - 60 * 60 * 1000
  while (callLog.length > 0 && callLog[0].timestamp < cutoff) {
    callLog.shift()
  }
}

/** Reset denného budgetu o polnoci */
function checkDailyReset() {
  const today = new Date().toDateString()
  if (today !== dailyResetDate) {
    dailySpendUsd = 0
    dailyResetDate = today
    lastAlertPercent = 0
    throttleUntil = 0
    jobCallCounts.clear()
  }
}

/**
 * Anomaly detection: porovná posledných 5 min vs. predchádzajúcich 5 min.
 * Ak je spike 3×+ → aktivuje throttle na 15 min.
 * Ak sa spotreba vráti do normálu → automaticky deaktivuje.
 */
function checkAnomaly(): void {
  const now = Date.now()
  if (now - lastAnomalyCheck < 30_000) return  // kontrola max raz za 30 sek
  lastAnomalyCheck = now

  const recentCutoff = now - ANOMALY_WINDOW_MS
  const previousCutoff = recentCutoff - ANOMALY_WINDOW_MS

  const recentCalls = callLog.filter(r => r.timestamp >= recentCutoff).length
  const previousCalls = callLog.filter(r => r.timestamp >= previousCutoff && r.timestamp < recentCutoff).length

  // Baseline: priemer za predchádzajúcich 5 min (min 5, aby sme nereagovali na 1→3)
  const baseline = Math.max(previousCalls, 5)

  if (recentCalls >= baseline * ANOMALY_MULTIPLIER) {
    // SPIKE detected!
    if (throttleUntil < now) {
      // Nový throttle — loguj a aktivuj
      console.error(`[OpenAI Guard] ANOMALY DETECTED: ${recentCalls} calls in 5min vs baseline ${baseline} → THROTTLE activated for 15min`)
      throttleUntil = now + THROTTLE_DURATION_MS

      // Find the suspicious call type
      const typeCounts = new Map<string, number>()
      for (const r of callLog.filter(r => r.timestamp >= recentCutoff)) {
        typeCounts.set(r.callType, (typeCounts.get(r.callType) ?? 0) + 1)
      }
      const sorted = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1])
      const topType = sorted[0]

      // Fire-and-forget operator notification
      notifyAnomaly(recentCalls, baseline, topType?.[0] ?? 'unknown', topType?.[1] ?? 0).catch(() => {})
    }
  } else if (throttleUntil > now && recentCalls < baseline * 1.5) {
    // Self-healing: spotreba sa vrátila do normálu → zruš throttle
    console.log(`[OpenAI Guard] SELF-HEAL: calls normalized (${recentCalls} vs baseline ${baseline}) → throttle removed`)
    throttleUntil = 0
  }
}

/** Notify operators about anomaly */
async function notifyAnomaly(recentCalls: number, baseline: number, topType: string, topCount: number): Promise<void> {
  try {
    const { insertOperatorNotification } = await import('@/lib/db')
    const alertPhone = process.env.ADMIN_ALERT_PHONE || '+421914197114'
    await insertOperatorNotification({
      operatorPhone: alertPhone,
      title: `🔴 OpenAI anomália — automatický throttle aktivovaný`,
      message: `Detekovaný spike: ${recentCalls} volaní za 5 min (normál: ${baseline}). ` +
        `Najčastejší typ: ${topType} (${topCount}×). ` +
        `Throttle na 25% kapacity po dobu 15 minút. Ak je to OK, throttle sa automaticky zruší.`,
      type: 'system_alert',
    })
  } catch { /* non-blocking */ }
}

// ── Public API ───────────────────────────────────────────────────

export interface GuardResult {
  allowed: boolean
  reason?: string
  throttled?: boolean
}

/**
 * Skontrolovať či je volanie povolené.
 */
export function canCall(callType: CallType, jobId?: number): GuardResult {
  checkDailyReset()
  pruneOld()
  checkAnomaly()

  const isThrottled = Date.now() < throttleUntil

  // 1. Denný budget (hard stop at $25)
  const callCost = LIMITS.estimatedCostPerCall[callType] ?? 0.01
  if (dailySpendUsd + callCost > LIMITS.dailyBudgetUsd) {
    console.error(`[OpenAI Guard] BLOCKED ${callType}: daily budget exceeded ($${dailySpendUsd.toFixed(2)}/$${LIMITS.dailyBudgetUsd})`)
    return { allowed: false, reason: `daily_budget_exceeded: $${dailySpendUsd.toFixed(2)}/$${LIMITS.dailyBudgetUsd}` }
  }

  // 2. Hodinový limit (znížený pri throttle)
  const maxHourly = LIMITS.maxPerHour[callType] ?? 100
  const effectiveMax = isThrottled ? Math.ceil(maxHourly * THROTTLE_FACTOR) : maxHourly
  const typeHourlyCount = callLog.filter(r => r.callType === callType).length
  if (typeHourlyCount >= effectiveMax) {
    const label = isThrottled ? 'THROTTLED hourly' : 'hourly'
    console.error(`[OpenAI Guard] BLOCKED ${callType}: ${label} limit (${typeHourlyCount}/${effectiveMax})`)
    return { allowed: false, reason: `${label}_limit: ${typeHourlyCount}/${effectiveMax}`, throttled: isThrottled }
  }

  // 3. Per-job limit (ochrana pred zacyklením)
  if (jobId !== undefined) {
    const jobKey = `${callType}:${jobId}`
    const jobCount = jobCallCounts.get(jobKey) ?? 0
    const maxPerJob = LIMITS.maxPerJob[callType] ?? 5
    if (jobCount >= maxPerJob) {
      console.warn(`[OpenAI Guard] BLOCKED ${callType} for job ${jobId}: max ${maxPerJob} calls reached`)
      return { allowed: false, reason: `per_job_limit: ${jobCount}/${maxPerJob} for job ${jobId}` }
    }
  }

  return { allowed: true, throttled: isThrottled }
}

/** Send alerts when budget thresholds are crossed */
async function checkBudgetAlerts(): Promise<void> {
  const percent = Math.round((dailySpendUsd / LIMITS.dailyBudgetUsd) * 100)

  for (const threshold of ALERT_THRESHOLDS) {
    if (percent >= threshold && lastAlertPercent < threshold) {
      lastAlertPercent = threshold

      const severity = threshold >= 90 ? 'critical' : threshold >= 75 ? 'warning' : 'info'
      const title = threshold >= 100
        ? `OpenAI budget vyčerpaný ($${LIMITS.dailyBudgetUsd}) — AI funkcie pozastavené`
        : `OpenAI náklady na ${threshold}% denného limitu`
      const message = `Denné náklady: $${dailySpendUsd.toFixed(2)} z $${LIMITS.dailyBudgetUsd} (${percent}%). ` +
        `Volania za poslednú hodinu: ${callLog.length}.`

      console.warn(`[OpenAI Guard] ALERT ${threshold}%: ${message}`)

      // In-app notification for all thresholds
      try {
        const { insertOperatorNotification } = await import('@/lib/db')
        const alertPhone = process.env.ADMIN_ALERT_PHONE || '+421914197114'
        await insertOperatorNotification({
          operatorPhone: alertPhone,
          title,
          message,
          type: severity === 'critical' ? 'system_alert' : 'info',
        })
      } catch { /* non-blocking */ }

      // SMS ONLY at 100% (hard stop) — max 1 SMS per 30 min
      if (threshold >= 100 && (Date.now() - lastSmsSentAt) > SMS_COOLDOWN_MS) {
        try {
          const { sendSms } = await import('@/lib/sms')
          const alertPhone = process.env.ADMIN_ALERT_PHONE || '+421914197114'
          await sendSms(alertPhone, `ZR: OpenAI budget $${LIMITS.dailyBudgetUsd} vyčerpaný. AI funkcie pozastavené. Skontrolujte admin panel.`)
          lastSmsSentAt = Date.now()
        } catch { /* non-blocking */ }
      }
      break
    }
  }
}

/**
 * Zaznamenať uskutočnené volanie (volať PO úspešnom API call).
 */
export function recordCall(callType: CallType, jobId?: number, actualTokens?: number): void {
  checkDailyReset()

  const estimatedCost = actualTokens
    ? (actualTokens / 1_000_000) * 5  // rough: $5/M tokens average
    : (LIMITS.estimatedCostPerCall[callType] ?? 0.01)

  callLog.push({
    timestamp: Date.now(),
    callType,
    jobId,
    estimatedCostUsd: estimatedCost,
  })

  dailySpendUsd += estimatedCost

  if (jobId !== undefined) {
    const jobKey = `${callType}:${jobId}`
    jobCallCounts.set(jobKey, (jobCallCounts.get(jobKey) ?? 0) + 1)
  }

  // Check budget alerts (fire-and-forget)
  checkBudgetAlerts().catch(() => {})
}

/**
 * Získať aktuálne štatistiky (pre admin/debug).
 */
export function getGuardStats(): {
  dailySpendUsd: number
  dailyBudgetUsd: number
  hourlyCallCount: number
  isThrottled: boolean
  throttleRemainingMin: number
  callsByType: Record<string, number>
  topJobCalls: Array<{ key: string; count: number }>
} {
  checkDailyReset()
  pruneOld()

  const now = Date.now()
  const isThrottled = now < throttleUntil
  const throttleRemainingMin = isThrottled ? Math.ceil((throttleUntil - now) / 60_000) : 0

  // Count calls by type
  const callsByType: Record<string, number> = {}
  for (const r of callLog) {
    callsByType[r.callType] = (callsByType[r.callType] ?? 0) + 1
  }

  // Top job call counts (for debugging cycles)
  const topJobCalls = Array.from(jobCallCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => ({ key, count }))

  return {
    dailySpendUsd: Math.round(dailySpendUsd * 100) / 100,
    dailyBudgetUsd: LIMITS.dailyBudgetUsd,
    hourlyCallCount: callLog.length,
    isThrottled,
    throttleRemainingMin,
    callsByType,
    topJobCalls,
  }
}
