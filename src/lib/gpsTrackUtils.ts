/**
 * GPS Track Utilities
 *
 * Pure utility functions for GPS tracking, distance calculation,
 * and geofencing. Used by the dispatch app's en_route tracking
 * and the gps_routes DB table for storing measured trip distances.
 */

// ── Types ────────────────────────────────────────────────────────────

/**
 * A single GPS track point.
 * Used by IndexedDB on the client side and here for type sharing.
 */
export interface GpsTrackPoint {
  id?: number
  jobId: number
  lat: number
  lng: number
  accuracy: number
  timestamp: number  // Date.now()
}

// ── Distance Functions ────────────────────────────────────────────────

/**
 * Haversine distance in kilometers between two lat/lng points.
 * Uses Earth radius R = 6371 km.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Sum total trip distance from an array of GPS track points.
 *
 * Rules:
 * - Sorts by timestamp ascending before summing
 * - Skips segments > 50 km (GPS glitch / teleport detection)
 * - Minimum floor of 0.5 km for very short trips
 * - Maximum cap of 200 km (sanity check)
 * - Rounds to 1 decimal place
 */
export function sumTrackDistanceKm(points: GpsTrackPoint[]): number {
  if (points.length < 2) return 0.5

  // Sort by timestamp ascending
  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp)

  let total = 0
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const dist = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng)

    // Skip GPS glitches (teleports > 50 km in one segment)
    if (dist > 50) continue

    total += dist
  }

  // Floor: minimum 0.5 km for short trips
  if (total < 0.5) total = 0.5

  // Cap: maximum 200 km sanity check
  if (total > 200) total = 200

  return Math.round(total * 10) / 10
}

// ── Geofencing ────────────────────────────────────────────────────────

/**
 * Returns true if a technician is within `radiusMeters` of the customer location.
 * Default radius: 150 m (arrival geofence).
 */
export function isInGeofence(
  techLat: number,
  techLng: number,
  customerLat: number,
  customerLng: number,
  radiusMeters: number = 150
): boolean {
  const distanceMeters = haversineKm(techLat, techLng, customerLat, customerLng) * 1000
  return distanceMeters <= radiusMeters
}
