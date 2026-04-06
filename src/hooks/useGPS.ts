'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export interface GPSCoords {
  lat: number
  lng: number
  accuracy: number
  timestamp: string
}

interface UseGPSReturn {
  startCoords: GPSCoords | null
  endCoords: GPSCoords | null
  isTracking: boolean
  error: string | null
  captureStart: () => void
  captureEnd: () => void
  distanceKm: number | null
}

/**
 * GPS tracking hook for technician protocol.
 *
 * - captureStart() — called when form opens (first step)
 * - captureEnd() — called on form submission
 * - distanceKm — straight-line distance between start and end
 */
export function useGPS(): UseGPSReturn {
  const [startCoords, setStartCoords] = useState<GPSCoords | null>(null)
  const [endCoords, setEndCoords] = useState<GPSCoords | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)

  const getPosition = useCallback((): Promise<GPSCoords> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS nie je dostupné'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: Math.round(pos.coords.latitude * 1_000_000) / 1_000_000,
            lng: Math.round(pos.coords.longitude * 1_000_000) / 1_000_000,
            accuracy: Math.round(pos.coords.accuracy),
            timestamp: new Date().toISOString(),
          })
        },
        (err) => {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              reject(new Error('GPS prístup zamietnutý'))
              break
            case err.POSITION_UNAVAILABLE:
              reject(new Error('Poloha nedostupná'))
              break
            case err.TIMEOUT:
              reject(new Error('GPS timeout'))
              break
            default:
              reject(new Error('GPS chyba'))
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      )
    })
  }, [])

  const captureStart = useCallback(async () => {
    setError(null)
    setIsTracking(true)
    try {
      const coords = await getPosition()
      setStartCoords(coords)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GPS chyba')
    }
  }, [getPosition])

  const captureEnd = useCallback(async () => {
    setError(null)
    try {
      const coords = await getPosition()
      setEndCoords(coords)
      setIsTracking(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GPS chyba')
      setIsTracking(false)
    }
  }, [getPosition])

  // Haversine formula for distance
  const distanceKm = startCoords && endCoords
    ? haversine(startCoords.lat, startCoords.lng, endCoords.lat, endCoords.lng)
    : null

  // Cleanup watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return {
    startCoords,
    endCoords,
    isTracking,
    error,
    captureStart,
    captureEnd,
    distanceKm,
  }
}

/**
 * Haversine distance between two GPS points in km.
 */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
