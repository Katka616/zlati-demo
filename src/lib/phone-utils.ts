/**
 * Phone number utilities
 *
 * Validation and country detection for SK/CZ phone numbers
 */

/**
 * Validate phone number format (+421 or +420 prefix, 9 digits)
 */
export function isValidPhone(phone: string): boolean {
  return /^\+42[01]\d{9}$/.test(phone)
}

/**
 * Detect country from phone prefix
 * @returns 'SK' for +421, 'CZ' for +420, null for other prefixes
 */
export function getCountryFromPhone(phone: string): 'SK' | 'CZ' | null {
  if (phone.startsWith('+421')) return 'SK'
  if (phone.startsWith('+420')) return 'CZ'
  return null
}
