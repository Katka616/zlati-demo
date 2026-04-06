/**
 * Environment variable validation — lazy init on first request.
 * Logs warnings/errors for missing env vars.
 */

let validated = false

export function validateEnv(): void {
  if (validated) return
  validated = true

  const missing: string[] = []
  const warnings: string[] = []

  // REQUIRED — app won't work without these
  const required = ['JWT_SECRET', 'DATABASE_URL', 'CRON_SECRET', 'INTAKE_API_KEY']
  for (const key of required) {
    if (!process.env[key]) missing.push(key)
  }

  // RECOMMENDED — key features won't work
  const recommended = ['BULKGATE_APP_ID', 'BULKGATE_APP_TOKEN', 'NEXT_PUBLIC_BASE_URL', 'INTERNAL_API_SECRET']
  for (const key of recommended) {
    if (!process.env[key]) warnings.push(`${key} not set — related feature disabled`)
  }

  // OPTIONAL — nice to have
  const optional = ['OPENAI_API_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT']
  for (const key of optional) {
    if (!process.env[key]) {
      console.debug(`[ENV] Optional: ${key} not set`)
    }
  }

  if (missing.length > 0) {
    console.error(`[ENV] CRITICAL — Missing required env vars: ${missing.join(', ')}`)
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }
  }

  if (warnings.length > 0) {
    for (const w of warnings) {
      console.warn(`[ENV] WARNING: ${w}`)
    }
  }

  console.log('[ENV] Environment validation complete')
}
