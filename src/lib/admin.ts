/**
 * Admin phone numbers configuration.
 * Phones listed here get 'operator' role after SMS verification.
 * 
 * Environment variable:
 *   ADMIN_PHONES - comma-separated list of admin phone numbers
 *   Example: ADMIN_PHONES=+421903123456,+420777123456
 */

/**
 * Get list of admin phone numbers from environment.
 */
export function getAdminPhones(): string[] {
  const adminPhones = process.env.ADMIN_PHONES || ''
  return adminPhones
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0)
}

/**
 * Check if a phone number belongs to an admin/operator.
 */
export function isAdminPhone(phone: string): boolean {
  return getAdminPhones().includes(phone)
}
