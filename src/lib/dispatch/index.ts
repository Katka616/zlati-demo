/**
 * Dispatch & GPS domain — barrel re-export
 *
 * Import from here for a clean domain path:
 *   import { checkAvailability } from '@/lib/dispatch'
 *   import { getGpsRoute } from '@/lib/dispatch'
 *
 * Original file paths continue to work for backward compatibility.
 */

export * from '../dispatchEngine'
export * from '../dispatchUtils'
export * from '../locationStore'
// Note: gpsTrackUtils also exports haversineKm (duplicate of dispatchEngine) — excluded to avoid ambiguity
export type { GpsTrackPoint } from '../gpsTrackUtils'
export { sumTrackDistanceKm, isInGeofence } from '../gpsTrackUtils'
export * from '../geocoding'
export * from '../smartButton'
