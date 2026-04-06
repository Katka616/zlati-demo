/**
 * Geocoding utility — converts addresses to GPS coordinates.
 *
 * Uses OpenStreetMap Nominatim API (free, no API key required).
 * Falls back to Google Maps Geocoding API if configured.
 *
 * Rate limiting: Nominatim requires max 1 request/second.
 * For production with high volume, consider using Google Maps or other paid services.
 */

export interface GeocodingResult {
  success: boolean
  lat?: number
  lng?: number
  displayName?: string
  /** ISO 3166-1 alpha-2 country code resolved from the geocoded address (e.g. 'CZ', 'SK') */
  countryCode?: string
  error?: string
}

export interface AddressComponents {
  street?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null  // ISO 3166-1 alpha-2 code (SK, CZ, etc.)
}

// Country code to full name mapping for better geocoding results
const COUNTRY_NAMES: Record<string, string> = {
  SK: 'Slovakia',
  CZ: 'Czech Republic',
  AT: 'Austria',
  DE: 'Germany',
  PL: 'Poland',
  HU: 'Hungary',
}

/**
 * Build a search query from address components.
 */
function buildAddressQuery(address: AddressComponents): string {
  const parts: string[] = []

  if (address.street) parts.push(address.street)
  if (address.city) parts.push(address.city)
  if (address.postalCode) parts.push(address.postalCode)
  if (address.country) {
    parts.push(COUNTRY_NAMES[address.country] || address.country)
  }

  return parts.join(', ')
}

/**
 * Geocode an address using OpenStreetMap Nominatim.
 *
 * @param address - Address components to geocode
 * @returns Geocoding result with lat/lng or error
 */
export async function geocodeAddress(address: AddressComponents): Promise<GeocodingResult> {
  const query = buildAddressQuery(address)

  if (!query.trim()) {
    return { success: false, error: 'empty_address' }
  }

  console.log(`[GEOCODE] Geocoding address: "${query}"`)

  // Try Google Maps first if configured
  const googleKey = process.env.GOOGLE_MAPS_API_KEY
  if (googleKey) {
    const result = await geocodeWithGoogle(query, googleKey)
    if (result.success) {
      return result
    }
    console.log(`[GEOCODE] Google Maps failed, trying Nominatim...`)
  }

  // Nominatim rate limit: max 1 req/sec — wait between retries
  const nominatimDelay = () => new Promise(r => setTimeout(r, 1500))

  // Try Nominatim with full query (including country)
  const result = await geocodeWithNominatim(query)
  if (result.success) {
    return result
  }

  // Fallback 1: retry WITHOUT country — wrong country code causes 0 results
  // (e.g. "Moskevská 658/23, Liberec, Slovakia" → empty, but without Slovakia → found in CZ)
  if (address.country) {
    const queryNoCountry = buildAddressQuery({ ...address, country: undefined })
    if (queryNoCountry.trim() && queryNoCountry !== query) {
      await nominatimDelay()
      console.log(`[GEOCODE] Retrying without country: "${queryNoCountry}"`)
      const noCountryResult = await geocodeWithNominatim(queryNoCountry)
      if (noCountryResult.success) return noCountryResult
    }
  }

  // Fallback 2: Czech dual house numbers "2345/67" — try street + orientační číslo (after slash)
  // Nominatim often knows the orientační číslo (visible on building) but not the popisné (registry)
  // e.g. "Americká 2345/67" fails, but "Americká 67" may succeed
  if (address.street) {
    const slashMatch = address.street.match(/^(.+?)\s+\d+\w*\/(\d+\w*)$/)
    if (slashMatch) {
      const streetWithOrientacni = `${slashMatch[1]} ${slashMatch[2]}`
      const queryOrientacni = buildAddressQuery({ ...address, street: streetWithOrientacni })
      await nominatimDelay()
      console.log(`[GEOCODE] Retrying with orientační číslo only: "${queryOrientacni}"`)
      const orientResult = await geocodeWithNominatim(queryOrientacni)
      if (orientResult.success) return orientResult
    }

    // Fallback 3: strip house number entirely — street-level precision
    // (e.g. "Americká 2345/67" → "Americká" — still useful for technician matching)
    const streetOnly = address.street.replace(/\s+\d+[\w]*(?:\/\d+[\w]*)?$/, '').trim()
    if (streetOnly && streetOnly !== address.street) {
      const queryStreetOnly = buildAddressQuery({ ...address, street: streetOnly })
      await nominatimDelay()
      console.log(`[GEOCODE] Retrying without house number: "${queryStreetOnly}"`)
      const streetResult = await geocodeWithNominatim(queryStreetOnly)
      if (streetResult.success) return streetResult
    }
  }

  return result
}

/**
 * Geocode using OpenStreetMap Nominatim API.
 */
async function geocodeWithNominatim(query: string, retryCount = 0): Promise<GeocodingResult> {
  try {
    const encodedQuery = encodeURIComponent(query)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&addressdetails=1`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ZlatiRemeslnici/1.0 (admin@zlati-remeslnici.com)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (response.status === 429 && retryCount < 2) {
      const waitMs = 2000 * (retryCount + 1)
      console.log(`[GEOCODE] Nominatim 429 rate-limited, retrying in ${waitMs}ms (attempt ${retryCount + 1}/2)`)
      await new Promise(r => setTimeout(r, waitMs))
      return geocodeWithNominatim(query, retryCount + 1)
    }

    if (!response.ok) {
      console.error(`[GEOCODE] Nominatim HTTP error: ${response.status}`)
      return { success: false, error: `http_error_${response.status}` }
    }

    const data = await response.json()

    if (!Array.isArray(data) || data.length === 0) {
      console.log(`[GEOCODE] Nominatim: no results for "${query}"`)
      return { success: false, error: 'no_results' }
    }

    const result = data[0]
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)

    if (isNaN(lat) || isNaN(lng)) {
      return { success: false, error: 'invalid_coordinates' }
    }

    // Extract country code from addressdetails (e.g. "cz" → "CZ")
    const countryCode = result.address?.country_code
      ? (result.address.country_code as string).toUpperCase()
      : undefined

    console.log(`[GEOCODE] Nominatim success: ${lat}, ${lng} (${result.display_name})${countryCode ? ` [${countryCode}]` : ''}`)

    return {
      success: true,
      lat,
      lng,
      displayName: result.display_name,
      countryCode,
    }
  } catch (err) {
    console.error('[GEOCODE] Nominatim error:', err)
    return { success: false, error: 'network_error' }
  }
}

/**
 * Geocode using Google Maps Geocoding API.
 */
async function geocodeWithGoogle(query: string, apiKey: string): Promise<GeocodingResult> {
  try {
    const encodedQuery = encodeURIComponent(query)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&key=${apiKey}`

    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })

    if (!response.ok) {
      console.error(`[GEOCODE] Google Maps HTTP error: ${response.status}`)
      return { success: false, error: `http_error_${response.status}` }
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.log(`[GEOCODE] Google Maps: ${data.status} for "${query}"`)
      return { success: false, error: data.status || 'no_results' }
    }

    const result = data.results[0]
    const { lat, lng } = result.geometry.location

    // Extract country code from address_components
    const countryComponent = result.address_components?.find(
      (c: { types: string[] }) => c.types?.includes('country')
    )
    const countryCode = countryComponent?.short_name as string | undefined

    console.log(`[GEOCODE] Google Maps success: ${lat}, ${lng} (${result.formatted_address})${countryCode ? ` [${countryCode}]` : ''}`)

    return {
      success: true,
      lat,
      lng,
      displayName: result.formatted_address,
      countryCode,
    }
  } catch (err) {
    console.error('[GEOCODE] Google Maps error:', err)
    return { success: false, error: 'network_error' }
  }
}

// ── Driving Distance (ORS → Google Routes API v2 → Haversine) ────────

export interface DrivingDistanceResult {
  distanceKm: number
  durationMinutes: number
  source: 'ors' | 'google' | 'haversine'
}

/**
 * Get driving distances from multiple origins to a single destination.
 *
 * Priority: OpenRouteService → Google Routes API v2 → (Haversine handled in matching.ts)
 *
 * Returns a Map of origin id => DrivingDistanceResult.
 */
export async function getDrivingDistances(
  origins: { id: string; lat: number; lng: number }[],
  destination: { lat: number; lng: number }
): Promise<Map<string, DrivingDistanceResult>> {
  if (origins.length === 0) return new Map()

  const orsKey = process.env.ORS_API_KEY
  if (orsKey) {
    try {
      const results = await getDrivingDistancesORS(origins, destination, orsKey)
      if (results.size > 0) return results
    } catch (err) {
      console.error('[DISTANCE] ORS failed, falling back to Google:', err)
    }
  }

  const googleKey = process.env.GOOGLE_MAPS_API_KEY
  if (!googleKey) {
    console.log('[DISTANCE] No ORS_API_KEY or GOOGLE_MAPS_API_KEY, skipping driving distance')
    return new Map()
  }

  return getDrivingDistancesGoogle(origins, destination, googleKey)
}

/**
 * OpenRouteService Matrix API v2.
 *
 * Endpoint: https://api.openrouteservice.org/v2/matrix/driving-car
 * Supports up to 3500 matrix elements (sources × destinations) on free tier.
 * Note: ORS uses [longitude, latitude] coordinate order.
 */
async function getDrivingDistancesORS(
  origins: { id: string; lat: number; lng: number }[],
  destination: { lat: number; lng: number },
  apiKey: string
): Promise<Map<string, DrivingDistanceResult>> {
  const results = new Map<string, DrivingDistanceResult>()
  const BATCH_SIZE = 100

  for (let i = 0; i < origins.length; i += BATCH_SIZE) {
    const batch = origins.slice(i, i + BATCH_SIZE)

    // ORS locations: [longitude, latitude] — destination appended last
    const locations = [
      ...batch.map(o => [o.lng, o.lat]),
      [destination.lng, destination.lat],
    ]
    const destIndex = batch.length
    const requestBody = {
      locations,
      sources: batch.map((_, idx) => idx),
      destinations: [destIndex],
      metrics: ['distance', 'duration'],
    }

    const response = await fetch(
      'https://api.openrouteservice.org/v2/matrix/driving-car',
      {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15_000),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[DISTANCE] ORS HTTP ${response.status}: ${errText}`)
      return results
    }

    const data = await response.json()

    let resolved = 0
    for (let j = 0; j < batch.length; j++) {
      const distMeters = data.distances?.[j]?.[0]
      const durSeconds = data.durations?.[j]?.[0]
      if (distMeters != null && durSeconds != null) {
        results.set(batch[j].id, {
          distanceKm: Math.round(distMeters) / 1000,
          durationMinutes: Math.round(durSeconds / 60),
          source: 'ors',
        })
        resolved++
      }
    }

    console.log(`[DISTANCE] ORS: ${batch.length} origins → ${resolved} resolved`)
  }

  return results
}

/**
 * Google Routes API v2 (computeRouteMatrix).
 *
 * Endpoint: https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix
 * Supports up to 625 elements (origins × destinations).
 */
async function getDrivingDistancesGoogle(
  origins: { id: string; lat: number; lng: number }[],
  destination: { lat: number; lng: number },
  apiKey: string
): Promise<Map<string, DrivingDistanceResult>> {
  const results = new Map<string, DrivingDistanceResult>()
  const BATCH_SIZE = 25

  for (let i = 0; i < origins.length; i += BATCH_SIZE) {
    const batch = origins.slice(i, i + BATCH_SIZE)

    const requestBody = {
      origins: batch.map(o => ({
        waypoint: { location: { latLng: { latitude: o.lat, longitude: o.lng } } }
      })),
      destinations: [{
        waypoint: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } }
      }],
      travelMode: 'DRIVE',
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,duration,status,condition',
      }
      const appUrl = process.env.APP_URL || process.env.RAILWAY_PUBLIC_DOMAIN
      if (appUrl) {
        headers['Referer'] = appUrl.startsWith('http') ? appUrl : `https://${appUrl}/`
      }

      const response = await fetch(
        'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
        { method: 'POST', headers, body: JSON.stringify(requestBody), signal: AbortSignal.timeout(10_000) }
      )

      if (!response.ok) {
        const errText = await response.text()
        console.error(`[DISTANCE] Google Routes API HTTP ${response.status}: ${errText}`)
        continue
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        console.error('[DISTANCE] Google Routes API unexpected response:', JSON.stringify(data).slice(0, 200))
        continue
      }

      let resolved = 0
      for (const element of data) {
        if (element.condition === 'ROUTE_EXISTS' && element.distanceMeters != null) {
          const originIdx = element.originIndex ?? 0
          if (originIdx < batch.length) {
            const durationSeconds = parseDuration(element.duration)
            results.set(batch[originIdx].id, {
              distanceKm: element.distanceMeters / 1000,
              durationMinutes: Math.round(durationSeconds / 60),
              source: 'google',
            })
            resolved++
          }
        }
      }

      console.log(`[DISTANCE] Google Routes API v2: ${batch.length} origins → ${resolved} resolved`)
    } catch (err) {
      console.error('[DISTANCE] Google Routes API error:', err)
    }
  }

  return results
}

/**
 * Parse Google Routes API duration string (e.g. "1234s") to seconds.
 */
function parseDuration(duration: string | undefined | null): number {
  if (!duration) return 0
  const match = String(duration).match(/^(\d+)s$/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Check if departure address has changed between old and new data.
 */
export function hasDepartureAddressChanged(
  oldData: AddressComponents,
  newData: AddressComponents
): boolean {
  return (
    oldData.street !== newData.street ||
    oldData.city !== newData.city ||
    oldData.postalCode !== newData.postalCode ||
    oldData.country !== newData.country
  )
}
