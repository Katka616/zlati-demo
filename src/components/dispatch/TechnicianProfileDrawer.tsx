'use client'

/**
 * TechnicianProfileDrawer — slide-in profile panel
 *
 * Triggered by floating avatar button in the layout.
 * Contains all profile sections: Hero, Stats, Pricing,
 * Availability, Vehicle, Documents, Logout.
 */

import { useState, useCallback, useEffect } from 'react'
import { getTranslation } from '@/lib/i18n'
import { Language } from '@/types/protocol'
import { TechnicianProfile } from '@/types/dispatch'
import ProfileHero from './ProfileHero'
import ProfileStats from './ProfileStats'
import ProfilePricing from './ProfilePricing'
import ProfileAvailability from './ProfileAvailability'
import ProfileVehicle from './ProfileVehicle'
import ProfileDeparture from './ProfileDeparture'
import ProfileDocuments from './ProfileDocuments'
import SignaturePad from './SignaturePad'
import { saveProfileSection } from '@/lib/profileApi'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import type { TechnicianPricing } from '@/types/dispatch'

const emptyProfileStats = { rating: 0, completedJobs: 0, monthlyJobs: 0, successRate: 0, monthlyEarnings: 0 }
const emptyWorkingHours = {
  monday: { from: '08:00', to: '17:00', enabled: false },
  tuesday: { from: '08:00', to: '17:00', enabled: false },
  wednesday: { from: '08:00', to: '17:00', enabled: false },
  thursday: { from: '08:00', to: '17:00', enabled: false },
  friday: { from: '08:00', to: '16:00', enabled: false },
  saturday: { from: '09:00', to: '13:00', enabled: false },
  sunday: { from: '00:00', to: '00:00', enabled: false },
}
const emptyPricing: TechnicianPricing = { firstHourRate: 0, additionalHourRate: 0, kmRate: 0, currency: 'EUR' }

interface Props {
  technician: TechnicianProfile
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
  onRefresh?: () => void
}

export default function TechnicianProfileDrawer({
  technician,
  isOpen,
  onClose,
  onLogout,
  onRefresh,
}: Props) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [gpsAvailable, setGpsAvailable] = useState(false)
  const [gpsPermission, setGpsPermission] = useState<'granted' | 'denied' | 'prompt' | 'unavailable'>('prompt')

  const {
    permission: pushPermission,
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    error: pushError,
    subscribe: pushSubscribe,
    unsubscribe: pushUnsubscribe,
    isPwa: pushIsPwa,
    isIos: pushIsIos,
  } = usePushNotifications()

  const lang: Language = technician.country === 'CZ' ? 'cz' : 'sk'
  const t = useCallback(
    (key: string) => getTranslation(lang, key),
    [lang]
  )

  // Check GPS availability and permission
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const hasGeo = 'geolocation' in navigator
    setGpsAvailable(hasGeo)
    if (!hasGeo) {
      setGpsPermission('unavailable')
      return
    }
    // Query current GPS permission
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setGpsPermission(result.state as 'granted' | 'denied' | 'prompt')
        result.onchange = () => setGpsPermission(result.state as 'granted' | 'denied' | 'prompt')
      }).catch(() => {})
    }
  }, [])

  const showToast = (msg: string, doRefresh = true) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
    if (doRefresh && msg.startsWith('✅')) onRefresh?.()
  }

  const handleGpsToggle = () => {
    if (gpsPermission === 'denied') return
    navigator.geolocation.getCurrentPosition(
      () => setGpsPermission('granted'),
      (err) => {
        if (err.code === 1) setGpsPermission('denied')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Handle open/close animation
  useEffect(() => {
    if (isOpen) {
      setAnimating(true)
    }
  }, [isOpen])

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const handleClose = () => {
    setAnimating(false)
    setShowLogoutConfirm(false)
    setTimeout(onClose, 280) // match CSS transition
  }

  if (!isOpen && !animating) return null

  const profile = {
    ...technician,
    ...emptyProfileStats,
    workingHours: technician.workingHours ?? emptyWorkingHours,
    vehicle: technician.vehicle ?? undefined,
    documents: technician.documents ?? [],
    isAvailable: technician.isAvailable ?? false,
    serviceRadiusKm: technician.serviceRadiusKm ?? 30,
    pricing: technician.pricing ?? emptyPricing,
    applianceBrands: technician.applianceBrands ?? [],
    departure: {
      street: technician.departureStreet || null,
      city: technician.departureCity || null,
      psc: technician.departurePsc || null,
      country: technician.departureCountry || 'SK',
      gps_lat: technician.gps_lat,
      gps_lng: technician.gps_lng,
    },
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`drawer-backdrop ${animating ? 'visible' : ''}`}
        onClick={handleClose}
      />

      {/* Drawer panel */}
      <div className={`profile-drawer ${animating ? 'open' : ''}`}>
        {/* Sticky header */}
        <div className="drawer-header">
          <h2 className="drawer-title">{t('profilePage.title')}</h2>
          <button
            className="drawer-close"
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="drawer-content">
          <ProfileHero
            technician={profile}
            t={t}
            onBrandsChange={async (brands) => { await saveProfileSection('brands', brands); onRefresh?.() }}
            onSpecializationsChange={async (specs) => { await saveProfileSection('specializations', specs); onRefresh?.() }}
          />
          <ProfileStats stats={profile} t={t} />
          <ProfilePricing
            pricing={profile.pricing}
            t={t}
            onPricingChange={async (p) => { await saveProfileSection('pricing', p); onRefresh?.() }}
          />
          <ProfileAvailability
            isAvailable={profile.isAvailable}
            workingHours={profile.workingHours}
            serviceRadiusKm={profile.serviceRadiusKm}
            technicianId={profile.technicianId}
            t={t}
            lang={lang}
            onAvailabilityChange={async (d) => { await saveProfileSection('availability', d); onRefresh?.() }}
          />
          <ProfileVehicle
            vehicle={profile.vehicle}
            t={t}
            onVehicleChange={async (v) => { await saveProfileSection('vehicle', v); onRefresh?.() }}
          />
          {/* 6. Departure Point */}
          <ProfileDeparture
            departure={profile.departure}
            t={t}
            onDepartureChange={(d) =>
              saveProfileSection('departure', d).then((res) => {
                showToast(res.success ? '✅ Uložené' : '❌ Nepodarilo sa uložiť')
              })
            }
          />

          <ProfileDocuments t={t} />

          {/* 8. Signature */}
          <SignaturePad
            existingSignature={technician.signature || null}
            lang={lang}
            onSave={async (base64) => {
              const res = await saveProfileSection('signature', base64)
              showToast(res.success ? '✅ Podpis uložený' : '❌ Nepodarilo sa uložiť')
              if (res.success) onRefresh?.()
            }}
            onClear={async () => {
              const res = await saveProfileSection('signature', null)
              showToast(res.success ? '✅ Podpis vymazaný' : '❌ Nepodarilo sa vymazať')
              if (res.success) onRefresh?.()
            }}
          />

          {/* 9. Device Permissions — GPS + Notifications */}
          <div className="profile-card">
            <h3 className="profile-section-title" style={{ marginBottom: 12 }}>
              ⚙️ {t('dispatch.settings.title')}
            </h3>

            {/* GPS */}
            <div
              onClick={gpsAvailable && gpsPermission !== 'granted' ? handleGpsToggle : undefined}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0', borderBottom: '1px solid var(--divider)',
                cursor: gpsAvailable && gpsPermission !== 'granted' ? 'pointer' : 'default',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>📍 GPS</div>
                <div style={{ fontSize: 12, color: gpsPermission === 'granted' ? 'var(--success, #4CAF50)' : 'var(--text-secondary)' }}>
                  {!gpsAvailable && '❌ Nedostupné v tomto prehliadači'}
                  {gpsAvailable && gpsPermission === 'granted' && '✅ Povolené'}
                  {gpsAvailable && gpsPermission === 'denied' && '⚠️ Zablokované — povoľte v nastaveniach prehliadača'}
                  {gpsAvailable && gpsPermission === 'prompt' && '👆 Kliknite sem pre povolenie'}
                </div>
              </div>
              <div
                style={{
                  width: 44, height: 24, borderRadius: 12, position: 'relative',
                  background: gpsPermission === 'granted' ? 'var(--gold)' : 'var(--btn-secondary-bg)',
                  flexShrink: 0, transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%',
                  background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  transition: 'left 0.2s',
                  left: gpsPermission === 'granted' ? 22 : 2,
                }} />
              </div>
            </div>

            {/* Push Notifications */}
            <div
              onClick={(pushSupported || (pushIsIos && !pushIsPwa)) && !pushLoading ? async () => {
                if (pushSubscribed) await pushUnsubscribe()
                else await pushSubscribe()
              } : undefined}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0',
                cursor: (pushSupported || (pushIsIos && !pushIsPwa)) && !pushLoading ? 'pointer' : 'default',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>🔔 {t('dispatch.settings.notifications')}</div>
                <div style={{ fontSize: 12, color: pushSubscribed ? 'var(--success, #4CAF50)' : 'var(--text-secondary)' }}>
                  {pushIsIos && !pushIsPwa && '📲 Vyžaduje inštaláciu na plochu'}
                  {!(pushIsIos && !pushIsPwa) && !pushSupported && '❌ Nepodporované v tomto prehliadači'}
                  {!(pushIsIos && !pushIsPwa) && pushSupported && pushLoading && '⏳ Spracovávam...'}
                  {!(pushIsIos && !pushIsPwa) && pushSupported && !pushLoading && pushPermission === 'denied' && '⚠️ Zablokované — povoľte v nastaveniach prehliadača'}
                  {!(pushIsIos && !pushIsPwa) && pushSupported && !pushLoading && pushSubscribed && '✅ Aktívne'}
                  {!(pushIsIos && !pushIsPwa) && pushSupported && !pushLoading && pushPermission !== 'denied' && !pushSubscribed && '👆 Kliknite sem pre zapnutie'}
                </div>
              </div>
              <div
                style={{
                  width: 44, height: 24, borderRadius: 12, position: 'relative',
                  background: pushSubscribed ? 'var(--gold)' : 'var(--btn-secondary-bg)',
                  flexShrink: 0, transition: 'background 0.2s',
                  opacity: pushLoading ? 0.5 : 1,
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%',
                  background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  transition: 'left 0.2s',
                  left: pushSubscribed ? 22 : 2,
                }} />
              </div>
            </div>

            {/* iOS install guide */}
            {pushIsIos && !pushIsPwa && (
              <div style={{
                marginTop: 8, padding: '10px 12px', fontSize: 12,
                color: 'var(--warning-text)', background: 'var(--warning-bg)',
                border: '1px solid var(--warning-border)', borderRadius: 8, lineHeight: 1.5,
              }}>
                {lang === 'cz'
                  ? <>📱 Na iPhone/iPad přidejte aplikaci na plochu:<br /><strong>Safari → □↑ (sdílení) → „Přidat na plochu"</strong></>
                  : <>📱 Na iPhone/iPad pridajte aplikáciu na plochu:<br /><strong>Safari → □↑ (zdieľanie) → „Pridať na plochu"</strong></>}
              </div>
            )}

            {/* Error message */}
            {pushError && (
              <div style={{
                marginTop: 8, padding: '8px 12px', fontSize: 12,
                color: 'var(--danger-text)', background: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)', borderRadius: 8,
              }}>
                ⚠️ {pushError}
              </div>
            )}
          </div>

          {/* Toast */}
          {toast && (
            <div
              onClick={() => setToast(null)}
              style={{
                padding: '10px 14px',
                background: toast.startsWith('✅') ? 'var(--success-bg)' : 'var(--danger-bg)',
                border: `1px solid ${toast.startsWith('✅') ? 'var(--success-border)' : 'var(--danger-border)'}`,
                borderRadius: 10,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              {toast}
            </div>
          )}

        </div>

        {/* Sticky logout footer */}
        <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid var(--border, #e5e7eb)' }}>
          {showLogoutConfirm ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: 12, fontWeight: 500, fontSize: 14 }}>
                {t('profilePage.logoutConfirm')}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className="logout-btn"
                  style={{ flex: 1 }}
                  onClick={onLogout}
                >
                  {t('profilePage.logout')}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="logout-btn"
              style={{ width: '100%' }}
              onClick={() => setShowLogoutConfirm(true)}
            >
              {t('profilePage.logout')}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
