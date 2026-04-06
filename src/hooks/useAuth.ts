/**
 * useAuth hook — manages technician authentication state.
 *
 * On mount, calls /api/auth/me to check current session.
 * Provides: technician profile, loading state, logout function.
 * Caches result for the component lifecycle.
 *
 * Preview mode: if sessionStorage contains a preview token (set by the
 * dispatch layout's PreviewInitializer), it is sent as X-Preview-Token
 * header so the server uses it instead of the operator's cookie.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { TechnicianProfile } from '@/types/dispatch'

export const PREVIEW_SESSION_KEY = 'dispatch-preview-token'

interface UseAuthReturn {
  technician: TechnicianProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [technician, setTechnician] = useState<TechnicianProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchAuth = useCallback(async () => {
    try {
      // In preview mode the fetch is already patched by PreviewInitializer,
      // but we also set the header explicitly here as a safety net in case
      // this hook is used outside the dispatch layout (e.g. dispatch/page.tsx
      // renders before the patch effect fires).
      const previewToken =
        typeof window !== 'undefined' ? sessionStorage.getItem(PREVIEW_SESSION_KEY) : null

      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        ...(previewToken ? { headers: { 'X-Preview-Token': previewToken } } : {}),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.authenticated && data.technician) {
          const t = data.technician
          setTechnician({
            phone: t.phone,
            technicianId: t.technicianId,
            name: t.name,
            country: t.country,
            role: t.role || 'technician',
            specializations: t.specializations || [],
            psc: t.psc ?? undefined,
            applianceBrands: t.applianceBrands ?? [],
            email: t.email ?? undefined,
            pricing: t.pricing ?? undefined,
            isAvailable: t.isAvailable ?? false,
            serviceRadiusKm: t.serviceRadiusKm ?? 30,
            workingHours: t.workingHours ?? undefined,
            vehicle: t.vehicle ?? undefined,
            signature: t.signature ?? undefined,
            googleCalendarConnected: t.googleCalendarConnected ?? false,
            googleCalendarEmail: t.googleCalendarEmail ?? undefined,
            departureStreet: t.departureStreet ?? undefined,
            departureCity: t.departureCity ?? undefined,
            departurePsc: t.departurePsc ?? undefined,
            departureCountry: t.departureCountry ?? undefined,
            gps_lat: t.gps_lat ?? undefined,
            gps_lng: t.gps_lng ?? undefined,
          })
        } else {
          setTechnician(null)
        }
      } else {
        setTechnician(null)
      }
    } catch {
      setTechnician(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAuth()
  }, [fetchAuth])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Logout even if API call fails
    }
    setTechnician(null)
    // Redirect to login
    window.location.href = '/login'
  }, [])

  return {
    technician,
    isLoading,
    isAuthenticated: technician !== null,
    logout,
    refresh: fetchAuth,
  }
}
