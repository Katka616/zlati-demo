'use client'

import { useState, useEffect } from 'react'

interface VehicleData {
  type: string
  capacity?: string
}

interface Props {
  vehicle?: VehicleData
  t: (key: string) => string
  onVehicleChange?: (vehicle: VehicleData) => void | Promise<void>
}

/** Neutral keys stored in DB */
const VEHICLE_KEYS = ['car', 'van', 'small_van', 'combi'] as const

/** Localized labels */
const VEHICLE_LABELS: Record<string, Record<string, string>> = {
  sk: { car: 'Osobné auto', van: 'Dodávka', small_van: 'Malá dodávka', combi: 'Kombi' },
  cz: { car: 'Osobní vozidlo', van: 'Dodávka', small_van: 'Malá dodávka', combi: 'Kombi' },
}

/** Legacy localized values → neutral key mapping */
const LEGACY_TO_KEY: Record<string, string> = {
  'Osobné auto': 'car', 'Osobní vozidlo': 'car',
  'Dodávka': 'van',
  'Malá dodávka': 'small_van',
  'Kombi': 'combi',
}

/** Normalize any stored value to a neutral key */
function toKey(type?: string): string {
  if (!type) return VEHICLE_KEYS[0]
  if (VEHICLE_KEYS.includes(type as any)) return type
  return LEGACY_TO_KEY[type] ?? VEHICLE_KEYS[0]
}

export default function ProfileVehicle({ vehicle, t, onVehicleChange, lang = 'sk' }: Props & { lang?: 'sk' | 'cz' }) {
  const [editing, setEditing] = useState(!vehicle) // auto-open edit if no vehicle yet
  const labels = VEHICLE_LABELS[lang] || VEHICLE_LABELS.sk
  const [draft, setDraft] = useState<VehicleData>(vehicle ? { ...vehicle, type: toKey(vehicle.type) } : { type: VEHICLE_KEYS[0] })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Sync draft when vehicle prop changes (after parent refreshes auth)
  useEffect(() => {
    if (!editing) setDraft(vehicle ? { ...vehicle, type: toKey(vehicle.type) } : { type: VEHICLE_KEYS[0] })
  }, [vehicle, editing])

  const startEdit = () => {
    setDraft(vehicle ? { ...vehicle, type: toKey(vehicle.type) } : { type: VEHICLE_KEYS[0] })
    setSaveError(null)
    setEditing(true)
  }

  const cancel = () => { setSaveError(null); setEditing(false) }

  const save = async () => {
    if (!onVehicleChange) return
    setSaving(true)
    setSaveError(null)
    try {
      await onVehicleChange(draft)
      setEditing(false)
    } catch {
      console.error('[ProfileVehicle] save failed')
      setSaveError(lang === 'cz' ? 'Nepodařilo se uložit vozidlo. Zkus znovu.' : 'Nepodarilo sa uložiť vozidlo. Skús znova.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="profile-card">
      <div className="profile-section-header">
        <h3 className="profile-section-title" style={{ marginBottom: 0 }}>
          {t('profilePage.vehicle.title')}
        </h3>
        {!editing && onVehicleChange && (
          <button className="profile-edit-btn" onClick={startEdit}>
            ✏️
          </button>
        )}
      </div>

      {!vehicle && !editing && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0 0' }}>
          {t('profilePage.vehicle.empty') || 'Žiadne vozidlo. Doplňte typ a kapacitu vozidla.'}
        </p>
      )}

      {(vehicle || editing) && (
        <div className="profile-vehicle-grid" style={{ marginTop: 14 }}>
          <div className="profile-vehicle-row">
            <span className="profile-vehicle-icon">🚗</span>
            <div style={{ flex: 1 }}>
              <div className="profile-vehicle-label">{t('profilePage.vehicle.type')}</div>
              {editing ? (
                <select
                  className="vehicle-select"
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                >
                  {VEHICLE_KEYS.map((key) => (
                    <option key={key} value={key}>{labels[key]}</option>
                  ))}
                </select>
              ) : (
                <div className="profile-vehicle-value">{labels[toKey(vehicle?.type)] || vehicle?.type}</div>
              )}
            </div>
          </div>

          <div className="profile-vehicle-row">
            <span className="profile-vehicle-icon">📦</span>
            <div style={{ flex: 1 }}>
              <div className="profile-vehicle-label">{t('profilePage.vehicle.capacity')}</div>
              {editing ? (
                <input
                  type="text"
                  className="pricing-input"
                  style={{ width: '100%' }}
                  value={draft.capacity ?? ''}
                  onChange={(e) => setDraft({ ...draft, capacity: e.target.value })}
                  placeholder="Popis kapacity..."
                />
              ) : (
                <div className="profile-vehicle-value">{vehicle?.capacity || '—'}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {editing && (
        <>
          {saveError && (
            <p style={{ fontSize: 13, color: 'var(--danger)', margin: '10px 0 0' }}>{saveError}</p>
          )}
          <div className="profile-edit-actions" style={{ marginTop: 14 }}>
            <button className="btn btn-outline btn-sm" onClick={cancel} disabled={saving}>
              {lang === 'cz' ? 'Zrušit' : 'Zrušiť'}
            </button>
            <button className="btn btn-gold btn-sm" onClick={save} disabled={saving}>
              {saving ? (lang === 'cz' ? 'Ukládám...' : 'Ukladám...') : (lang === 'cz' ? 'Uložit' : 'Uložiť')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
