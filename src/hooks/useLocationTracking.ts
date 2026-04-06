'use client'

/**
 * Continuous GPS tracking hook for dispatch.
 *
 * Two modes:
 * - background: 60s interval, sends to /api/dispatch/location, for general position tracking
 * - en_route: 30s interval, also accumulates GPS track points in IndexedDB for
 *   distance measurement + geofence auto-arrived detection
 *
 * Extends the pattern from useGPS.ts:
 * - Uses watchPosition() for continuous tracking
 * - Pauses when app is backgrounded (saves battery)
 * - Resumes on return to foreground, preserving mode
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { isInGeofence, sumTrackDistanceKm } from '@/lib/gpsTrackUtils'
import { appendGpsTrackPoint, getGpsTrackPoints, clearGpsTrack } from '@/lib/offlineQueue'

interface LocationState {
  lat: number
  lng: number
  accuracy: number
  timestamp: string
}

// Geofence target for auto-arrived
export interface GeofenceTarget {
  lat: number
  lng: number
  radiusMeters?: number  // default 150
}

export interface UseLocationTrackingReturn {
  location: LocationState | null
  isTracking: boolean
  isEnRoute: boolean
  error: string | null
  // Background mode (existing behavior)
  startTracking: () => void
  stopTracking: () => void
  // En-route mode (NEW)
  startEnRoute: (jobId: number, geofenceTarget?: GeofenceTarget) => void
  stopAndMeasure: () => Promise<number | null>  // returns measured km
}

const SEND_INTERVAL_MS = 60 * 1000      // Background mode: send location every 60 seconds
const EN_ROUTE_INTERVAL_MS = 30 * 1000 // En-route mode: send location every 30 seconds

// SessionStorage key — tracks whether GPS permission was already requested this session.
// Prevents repeated permission dialogs when navigating between dispatch pages.
// Values: 'granted' | 'denied' | 'prompted' (we already asked, waiting/unknown result)
const GPS_PERMISSION_SESSION_KEY = 'zr-gps-permission'

/**
 * Check GPS permission state using the Permissions API (non-blocking, no dialog).
 * Returns 'granted' | 'denied' | 'prompt' | null (API not supported).
 */
async function queryGpsPermission(): Promise<PermissionState | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions) return null
    const result = await navigator.permissions.query({ name: 'geolocation' })
    return result.state
  } catch {
    return null // Permissions API not supported in this browser
  }
}

export function useLocationTracking(): UseLocationTrackingReturn {
  const [location, setLocation] = useState<LocationState | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [isEnRoute, setIsEnRoute] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const sendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSentRef = useRef<number>(0)
  const latestLocationRef = useRef<LocationState | null>(null)

  // En-route mode state
  const modeRef = useRef<'background' | 'en_route' | null>(null)
  const enRouteJobIdRef = useRef<number | null>(null)
  const geofenceTargetRef = useRef<GeofenceTarget | null>(null)
  const autoArrivedCalledRef = useRef(false)

  // Track whether permission was denied — if so, skip all retries (visibility change, etc.)
  const permissionDeniedRef = useRef<boolean>(false)

  /**
   * Send current location to the server.
   */
  const sendLocation = useCallback(async (loc: LocationState) => {
    try {
      await fetch('/api/dispatch/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy,
        }),
      })
      lastSentRef.current = Date.now()
    } catch {
      // Silent fail — location updates are best-effort
    }
  }, [])

  /**
   * Actually start watchPosition — called after permission pre-check passes.
   */
  const doStartWatchPosition = useCallback((intervalMs: number) => {
    setError(null)
    lastSentRef.current = 0

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newLoc: LocationState = {
          lat: Math.round(pos.coords.latitude * 1_000_000) / 1_000_000,
          lng: Math.round(pos.coords.longitude * 1_000_000) / 1_000_000,
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: new Date().toISOString(),
        }

        setLocation(newLoc)
        latestLocationRef.current = newLoc

        // Permission was granted — mark so other hook instances skip the prompt
        try { sessionStorage.setItem(GPS_PERMISSION_SESSION_KEY, 'granted') } catch {}

        // Send immediately on first position
        if (lastSentRef.current === 0) {
          sendLocation(newLoc)
        }

        // En-route specific: accumulate track points + geofence check
        if (modeRef.current === 'en_route' && enRouteJobIdRef.current) {
          // Store track point only if accuracy is reasonable (<= 50m)
          if (pos.coords.accuracy <= 50) {
            appendGpsTrackPoint({
              jobId: enRouteJobIdRef.current,
              lat: newLoc.lat,
              lng: newLoc.lng,
              accuracy: newLoc.accuracy,
              timestamp: Date.now(),
            }).catch(() => {}) // non-fatal
          }

          // Geofence check — fire only once per en_route session
          const target = geofenceTargetRef.current
          if (target && !autoArrivedCalledRef.current) {
            if (isInGeofence(newLoc.lat, newLoc.lng, target.lat, target.lng, target.radiusMeters || 150)) {
              autoArrivedCalledRef.current = true
              // Dispatch custom event that components can listen to
              window.dispatchEvent(new CustomEvent('gps-auto-arrived', {
                detail: { jobId: enRouteJobIdRef.current }
              }))
            }
          }
        }
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('GPS prístup zamietnutý')
            // Mark as denied so no more dialogs are triggered this session
            permissionDeniedRef.current = true
            try {
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(GPS_PERMISSION_SESSION_KEY, 'denied')
              }
            } catch { /* ignore */ }
            break
          case err.POSITION_UNAVAILABLE:
            setError('Poloha nedostupná')
            break
          default:
            setError('GPS chyba')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    )

    // Set up periodic sending
    sendIntervalRef.current = setInterval(() => {
      if (latestLocationRef.current) {
        sendLocation(latestLocationRef.current)
      }
    }, intervalMs)
  }, [sendLocation])

  /**
   * Internal function to start watchPosition with a given interval.
   * Checks Permissions API FIRST to avoid triggering a browser dialog
   * if permission is already granted, or to skip entirely if denied.
   * Only shows a dialog once per session (when state is 'prompt').
   */
  const startWatchPosition = useCallback((intervalMs: number) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('GPS nie je dostupné')
      return
    }

    // Skip if permission was already denied (avoids repeated dialog on navigation/resume)
    if (permissionDeniedRef.current) return

    // Check sessionStorage — persists across hook re-mounts within the same tab
    try {
      if (typeof sessionStorage !== 'undefined') {
        const stored = sessionStorage.getItem(GPS_PERMISSION_SESSION_KEY)
        if (stored === 'denied') {
          permissionDeniedRef.current = true
          return
        }
        // If already granted, skip async check — go straight to watchPosition (no dialog)
        if (stored === 'granted') {
          doStartWatchPosition(intervalMs)
          return
        }
      }
    } catch { /* sessionStorage access can fail in private mode — continue */ }

    // Check actual permission state via Permissions API before calling watchPosition.
    queryGpsPermission().then((permState) => {
      // If denied at OS/browser level, mark and skip
      if (permState === 'denied') {
        permissionDeniedRef.current = true
        try { sessionStorage.setItem(GPS_PERMISSION_SESSION_KEY, 'denied') } catch {}
        setError('GPS prístup zamietnutý')
        return
      }

      // If already granted at browser level, proceed without dialog
      if (permState === 'granted') {
        try { sessionStorage.setItem(GPS_PERMISSION_SESSION_KEY, 'granted') } catch {}
        doStartWatchPosition(intervalMs)
        return
      }

      // 'prompt' — user hasn't decided yet. Only ask once per session.
      if (permState === 'prompt') {
        try {
          const stored = sessionStorage.getItem(GPS_PERMISSION_SESSION_KEY)
          if (stored === 'prompted') {
            // Already asked once this session — don't ask again
            return
          }
          sessionStorage.setItem(GPS_PERMISSION_SESSION_KEY, 'prompted')
        } catch { /* continue */ }
      }

      // First prompt this session or Permissions API not available → proceed
      doStartWatchPosition(intervalMs)
    })
  }, [doStartWatchPosition])

  /**
   * Clear watchPosition and send interval (internal helper, does not touch state).
   */
  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current)
      sendIntervalRef.current = null
    }
  }, [])

  /**
   * Start continuous GPS tracking in background mode.
   * 60s send interval. No IndexedDB tracking.
   *
   * This should be called ONCE per session (from dispatch layout).
   * Subsequent calls are no-ops if permission was already denied.
   */
  const startTracking = useCallback(() => {
    // If denied in this session, don't retry — avoids dialog on every page navigation
    if (permissionDeniedRef.current) return
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(GPS_PERMISSION_SESSION_KEY) === 'denied') {
        permissionDeniedRef.current = true
        return
      }
    } catch { /* ignore */ }

    clearWatch()
    modeRef.current = 'background'
    setIsTracking(true)
    startWatchPosition(SEND_INTERVAL_MS)
  }, [clearWatch, startWatchPosition])

  /**
   * Stop tracking (background mode).
   */
  const stopTracking = useCallback(() => {
    clearWatch()
    modeRef.current = null
    setIsTracking(false)
  }, [clearWatch])

  /**
   * Start en_route tracking mode.
   * 30s send interval. Accumulates GPS track points in IndexedDB.
   * Fires 'gps-auto-arrived' custom event when geofence is entered.
   *
   * @param jobId - The job being navigated to
   * @param geofenceTarget - Optional customer location for auto-arrived detection
   */
  const startEnRoute = useCallback((jobId: number, geofenceTarget?: GeofenceTarget) => {
    // Stop any existing tracking first
    clearWatch()

    // Set up en_route state
    modeRef.current = 'en_route'
    enRouteJobIdRef.current = jobId
    geofenceTargetRef.current = geofenceTarget || null
    autoArrivedCalledRef.current = false

    setIsTracking(true)
    setIsEnRoute(true)

    startWatchPosition(EN_ROUTE_INTERVAL_MS)
  }, [clearWatch, startWatchPosition])

  /**
   * Stop en_route tracking and return the measured distance in km.
   * Reads all track points from IndexedDB, calculates distance, then clears the track.
   *
   * @returns measured distance in km, or null if no points were recorded
   */
  const stopAndMeasure = useCallback(async (): Promise<number | null> => {
    const jobId = enRouteJobIdRef.current

    // Stop GPS
    clearWatch()
    modeRef.current = null
    setIsTracking(false)
    setIsEnRoute(false)

    if (!jobId) return null

    try {
      const points = await getGpsTrackPoints(jobId)

      if (points.length < 2) {
        // Not enough points — clear anyway and return null
        await clearGpsTrack(jobId)
        return null
      }

      const distanceKm = sumTrackDistanceKm(points)

      // Clear track from IndexedDB after measurement
      await clearGpsTrack(jobId)

      // Reset en_route refs
      enRouteJobIdRef.current = null
      geofenceTargetRef.current = null
      autoArrivedCalledRef.current = false

      return distanceKm
    } catch {
      // Non-fatal — return null if something goes wrong
      return null
    }
  }, [clearWatch])

  // Handle visibility change (pause/resume when backgrounded)
  // Debounce resume to prevent GPS thrashing when returning from external apps
  useEffect(() => {
    let resumeTimeout: ReturnType<typeof setTimeout> | null = null
    const handleVisibility = () => {
      if (document.hidden) {
        // App went to background — stop watching to save battery
        // Keep modeRef as-is so resume knows which mode to use
        if (resumeTimeout) { clearTimeout(resumeTimeout); resumeTimeout = null }
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current)
          watchIdRef.current = null
        }
        if (sendIntervalRef.current) {
          clearInterval(sendIntervalRef.current)
          sendIntervalRef.current = null
        }
      } else if (isTracking && !permissionDeniedRef.current) {
        // Debounce resume by 500ms — GPS resume is heavier than API calls.
        // Skip if permission was denied — no point retrying and no dialog should appear.
        if (resumeTimeout) clearTimeout(resumeTimeout)
        resumeTimeout = setTimeout(() => {
          // App came back to foreground — resume in the correct mode
          if (modeRef.current === 'en_route') {
            startWatchPosition(EN_ROUTE_INTERVAL_MS)
          } else {
            startWatchPosition(SEND_INTERVAL_MS)
          }
          resumeTimeout = null
        }, 500)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      if (resumeTimeout) clearTimeout(resumeTimeout)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isTracking, startWatchPosition])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current)
      }
    }
  }, [])

  return {
    location,
    isTracking,
    isEnRoute,
    error,
    startTracking,
    stopTracking,
    startEnRoute,
    stopAndMeasure,
  }
}
