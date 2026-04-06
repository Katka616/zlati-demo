/**
 * Central environment helpers.
 *
 * Use these instead of checking process.env.NODE_ENV or DEV_MODE directly.
 *
 * Dev mode is active when:
 *   - NODE_ENV=development (local `npm run dev`)
 *   - DEV_MODE=true (Railway dev deployment where NODE_ENV is always "production")
 */

export function isDevMode(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.DEV_MODE?.toLowerCase() === 'true'
  )
}

/**
 * WARNING: Returns !isDevMode(). NOT suitable for security decisions.
 * For security checks, use isSecurityBypassAllowed() instead.
 */
export function isProduction(): boolean {
  return !isDevMode()
}

/**
 * SMS whitelist — returns list of phone numbers SMS is allowed to be sent to.
 *
 * SMS_WHITELIST env var: comma-separated phone numbers, e.g. +421903123456,+421911222333
 *
 * - If SMS_WHITELIST is empty or not set → all numbers are allowed (production, no filter)
 * - If SMS_WHITELIST contains numbers → only those numbers receive SMS, others are silently skipped
 *
 * Use case: dev/staging environment with real phone numbers in DB — prevents
 * accidental SMS to real technicians and clients during testing.
 */
export function getSmsWhitelist(): string[] {
  const raw = process.env.SMS_WHITELIST || ''
  return raw
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0)
}

/**
 * Returns true if SMS is allowed to be sent to the given phone number.
 * When whitelist is empty, all numbers are allowed.
 */
export function isSmsAllowed(phone: string): boolean {
  const whitelist = getSmsWhitelist()
  if (whitelist.length === 0) return true
  return whitelist.includes(phone)
}

/** ZR company details for SEPA/ISDOC export */
let zrDetailsWarned = false
export function getZrCompanyDetails() {
  const details = {
    name: process.env.ZR_COMPANY_NAME || 'Zlatí Řemeslníci s.r.o.',
    iban: process.env.ZR_IBAN || '',
    bic: process.env.ZR_BIC || '',
    ico: process.env.ZR_ICO || '',
    dic: process.env.ZR_DIC || '',
    street: process.env.ZR_STREET || '',
    city: process.env.ZR_CITY || '',
    psc: process.env.ZR_PSC || '',
    country: 'CZ',
  }
  if (!zrDetailsWarned && (!details.iban || !details.ico)) {
    zrDetailsWarned = true
    console.warn('[ENV] ZR_IBAN or ZR_ICO not set — invoices will have blank company details')
  }
  return details
}

/**
 * Returns true ONLY when security bypasses (dev auth codes, mock logins) are safe to use.
 *
 * Unlike isDevMode() which also triggers on DEV_MODE=true (used on Railway dev deployments
 * where NODE_ENV is still "production"), this function STRICTLY checks NODE_ENV.
 *
 * Use this for:
 *   - Accepting DEV_AUTH_CODE in SMS verification
 *   - Mock technician fallbacks
 *   - Any auth/security bypass
 *
 * Do NOT use isDevMode() for security-sensitive checks.
 */
export function isSecurityBypassAllowed(): boolean {
  return process.env.NODE_ENV !== 'production'
}

/**
 * Public-facing base URL for portal links, SMS links, magic links, etc.
 * Checks: NEXT_PUBLIC_BASE_URL → APP_URL → Railway fallback.
 * SINGLE SOURCE OF TRUTH — use this everywhere instead of inline env checks.
 */
export function getAppBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[ENV] CRITICAL: NEXT_PUBLIC_BASE_URL not set — SMS/portal links will fail')
    }
    return 'http://localhost:3001'
  }
  return url
}

/** Day of week for automatic batch creation (0=Sunday, 5=Friday) */
export function getBatchDayOfWeek(): number {
  return parseInt(process.env.BATCH_DAY_OF_WEEK || '5', 10)
}
