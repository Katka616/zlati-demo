/**
 * In-memory technician location store.
 *
 * Stores last known GPS coordinates for each technician.
 * Used by dispatch system for proximity calculations.
 *
 * In production, this would be Redis or similar.
 * Current implementation is per-process (not shared across serverless instances).
 */

import { LocationUpdate } from '@/types/dispatch'

// In-memory location store: technicianId → latest location
const locationStore = new Map<string, LocationUpdate>()

// TTL for location entries (15 minutes)
const LOCATION_TTL_MS = 15 * 60 * 1000

/**
 * Store a technician's location.
 */
export function setTechnicianLocation(update: LocationUpdate): void {
  locationStore.set(update.technicianId, update)
}

/**
 * Get a technician's last known location.
 * Returns null if expired or not found.
 */
export function getTechnicianLocation(technicianId: string): LocationUpdate | null {
  const entry = locationStore.get(technicianId)
  if (!entry) return null

  const age = Date.now() - new Date(entry.timestamp).getTime()
  if (age > LOCATION_TTL_MS) {
    locationStore.delete(technicianId)
    return null
  }

  return entry
}

/**
 * Get all active technician locations (for dispatching overview).
 * Automatically cleans up expired entries.
 */
export function getAllTechnicianLocations(): LocationUpdate[] {
  const now = Date.now()
  const active: LocationUpdate[] = []

  const entries = Array.from(locationStore.entries())
  for (const [key, entry] of entries) {
    const age = now - new Date(entry.timestamp).getTime()
    if (age > LOCATION_TTL_MS) {
      locationStore.delete(key)
    } else {
      active.push(entry)
    }
  }

  return active
}
