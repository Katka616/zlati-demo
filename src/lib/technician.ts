/**
 * Technician lookup — searches the internal database for technician
 * by phone number or magic token.
 *
 * All technician data lives in PostgreSQL `technicians` table.
 *
 * Results are cached for 1 hour to minimize DB queries.
 */

import { TechnicianProfile } from '@/types/dispatch'
import { getCountryFromPhone } from '@/lib/phone-utils'

// Cache: phone/magic token → TechnicianProfile with TTL
const cache = new Map<string, { profile: TechnicianProfile; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Find a technician by phone number in the database.
 *
 * Strategy:
 * 1. Check cache first
 * 2. Query PostgreSQL technicians table by phone
 * 3. Fall back to dev mock if no DB
 */
export async function findTechnicianByPhone(
  phone: string
): Promise<TechnicianProfile | null> {
  // Check cache
  const cached = cache.get(phone)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.profile
  }

  const country = getCountryFromPhone(phone)
  if (!country) return null

  // Try database lookup
  try {
    const { getTechnicianByPhone, isDatabaseAvailable } = await import('@/lib/db')

    if (isDatabaseAvailable()) {
      const tech = await getTechnicianByPhone(phone)
      if (tech) {
        const profile: TechnicianProfile = {
          phone: tech.phone,
          technicianId: tech.id,
          name: `${tech.first_name} ${tech.last_name}`.trim() || 'Technik',
          country: tech.country as 'SK' | 'CZ',
          role: 'technician',
          specializations: tech.specializations || [],
          psc: tech.departure_psc || undefined,
        }
        cache.set(phone, { profile, expiresAt: Date.now() + CACHE_TTL_MS })
        return profile
      }
    }
  } catch (err) {
    console.error('Technician DB lookup error:', err)
  }

  // Dev mode fallback — return mock technician
  if (process.env.NODE_ENV !== 'production') {
    const mockProfile: TechnicianProfile = {
      phone,
      technicianId: 1,
      name: country === 'SK' ? 'Juraj Majster' : 'Jan Řemeslník',
      country,
      role: 'technician',
      specializations: ['01. Plumber', '10. Electrician'],
    }
    cache.set(phone, { profile: mockProfile, expiresAt: Date.now() + CACHE_TTL_MS })
    return mockProfile
  }

  return null
}

/**
 * Find a technician by magic token in the database.
 *
 * Strategy:
 * 1. Check cache first (key: "magic:TOKEN")
 * 2. In dev mode, return mock profiles for dev-mock-token-sk/cz
 * 3. Query PostgreSQL technicians table by magic_token column
 * 4. Cache and return profile if found
 */
export async function findTechnicianByMagicToken(
  token: string
): Promise<TechnicianProfile | null> {
  // Check cache
  const cacheKey = `magic:${token}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.profile
  }

  // Dev mode — return mock technicians for dev tokens
  if (process.env.NODE_ENV !== 'production') {
    if (token === 'dev-mock-token-sk') {
      const mockProfile: TechnicianProfile = {
        phone: '+421903000001',
        technicianId: 999001,
        name: 'Juraj Majster (Magic Link)',
        country: 'SK',
        role: 'technician',
        specializations: ['01. Plumber', '10. Electrician'],
      }
      cache.set(cacheKey, { profile: mockProfile, expiresAt: Date.now() + CACHE_TTL_MS })
      return mockProfile
    }
    if (token === 'dev-mock-token-cz') {
      const mockProfile: TechnicianProfile = {
        phone: '+420603000001',
        technicianId: 999002,
        name: 'Jan Řemeslník (Magic Link)',
        country: 'CZ',
        role: 'technician',
        specializations: ['01. Plumber', '10. Electrician'],
      }
      cache.set(cacheKey, { profile: mockProfile, expiresAt: Date.now() + CACHE_TTL_MS })
      return mockProfile
    }
  }

  // Database lookup
  try {
    const { getTechnicianByMagicToken, isDatabaseAvailable } = await import('@/lib/db')

    if (isDatabaseAvailable()) {
      const tech = await getTechnicianByMagicToken(token)
      if (tech) {
        const profile: TechnicianProfile = {
          phone: tech.phone,
          technicianId: tech.id,
          name: `${tech.first_name} ${tech.last_name}`.trim() || 'Technik',
          country: tech.country as 'SK' | 'CZ',
          role: 'technician',
          specializations: tech.specializations || [],
          psc: tech.departure_psc || undefined,
        }
        cache.set(cacheKey, { profile, expiresAt: Date.now() + CACHE_TTL_MS })
        return profile
      }
    }
  } catch (err) {
    console.error('Magic token DB lookup error:', err)
  }

  return null
}

/**
 * Invalidate magic token after successful use.
 * Clears DB token and removes it from cache.
 */
export async function consumeMagicToken(token: string): Promise<void> {
  // Purge from cache immediately
  cache.delete(`magic:${token}`)

  try {
    const { consumeMagicToken: dbConsume, isDatabaseAvailable } = await import('@/lib/db')
    if (isDatabaseAvailable()) {
      await dbConsume(token)
    }
  } catch (err) {
    console.error('consumeMagicToken error:', err)
  }
}

/**
 * Get technician profile by ID (from cache or database).
 */
export async function getTechnicianById(
  technicianId: string | number
): Promise<TechnicianProfile | null> {
  const numId = typeof technicianId === 'string' ? parseInt(technicianId, 10) : technicianId

  // Check cache by ID
  const entries = Array.from(cache.values())
  for (const entry of entries) {
    if (entry.profile.technicianId === numId && Date.now() < entry.expiresAt) {
      return entry.profile
    }
  }

  // Database lookup
  try {
    const { getTechnicianById: dbGetById, isDatabaseAvailable } = await import('@/lib/db')

    if (isDatabaseAvailable()) {
      const tech = await dbGetById(numId)
      if (tech) {
        const profile: TechnicianProfile = {
          phone: tech.phone,
          technicianId: tech.id,
          name: `${tech.first_name} ${tech.last_name}`.trim() || 'Technik',
          country: tech.country as 'SK' | 'CZ',
          role: 'technician',
          specializations: tech.specializations || [],
          psc: tech.departure_psc || undefined,
        }
        cache.set(tech.phone, { profile, expiresAt: Date.now() + CACHE_TTL_MS })
        return profile
      }
    }
  } catch (err) {
    console.error('Technician ID lookup error:', err)
  }

  return null
}
