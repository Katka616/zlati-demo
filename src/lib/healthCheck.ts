import { query, isDatabaseAvailable } from '@/lib/db-postgres'

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'down'
  checks: {
    database: { status: 'ok' | 'down'; latencyMs: number }
    sms: { configured: boolean }
    push: { configured: boolean }
    openai: { configured: boolean }
  }
  uptime: number
  version: string
  timestamp: string
}

export async function checkHealth(): Promise<HealthCheckResult> {
  const version = 'ok'  // Don't expose git SHA publicly — attacker fingerprinting risk
  const uptime = process.uptime()

  // Database check
  let dbStatus: 'ok' | 'down' = 'down'
  let dbLatencyMs = 0

  if (isDatabaseAvailable()) {
    try {
      const start = Date.now()
      await query('SELECT 1')
      dbLatencyMs = Date.now() - start
      dbStatus = 'ok'
    } catch {
      dbStatus = 'down'
    }
  }

  const smsConfigured = !!(process.env.BULKGATE_APP_ID && process.env.BULKGATE_APP_TOKEN)
  const pushConfigured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
  const openaiConfigured = !!process.env.OPENAI_API_KEY

  // Overall: 'down' if DB down, 'degraded' if optional services missing, 'ok' otherwise
  let overallStatus: 'ok' | 'degraded' | 'down'
  if (dbStatus === 'down') {
    overallStatus = 'down'
  } else if (!smsConfigured || !pushConfigured || !openaiConfigured) {
    overallStatus = 'degraded'
  } else {
    overallStatus = 'ok'
  }

  return {
    status: overallStatus,
    checks: {
      database: { status: dbStatus, latencyMs: dbLatencyMs },
      sms: { configured: smsConfigured },
      push: { configured: pushConfigured },
      openai: { configured: openaiConfigured },
    },
    uptime: Math.floor(uptime),
    version,
    timestamp: new Date().toISOString(),
  }
}
