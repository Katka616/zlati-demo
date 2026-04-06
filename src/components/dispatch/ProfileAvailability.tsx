'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

type WorkingHours = Record<string, { from: string; to: string; enabled: boolean }>

interface Props {
  isAvailable: boolean
  workingHours?: WorkingHours
  serviceRadiusKm?: number
  technicianId?: number
  t: (key: string) => string
  lang: 'sk' | 'cz'
  onAvailabilityChange?: (data: {
    isAvailable: boolean
    workingHours: WorkingHours
    serviceRadiusKm: number
  }) => void | Promise<void>
}

const DAY_LABELS: Record<string, Record<string, string>> = {
  sk: { monday: 'Po', tuesday: 'Ut', wednesday: 'St', thursday: 'Št', friday: 'Pi', saturday: 'So', sunday: 'Ne' },
  cz: { monday: 'Po', tuesday: 'Út', wednesday: 'St', thursday: 'Čt', friday: 'Pá', saturday: 'So', sunday: 'Ne' },
}

export default function ProfileAvailability({
  isAvailable,
  workingHours,
  serviceRadiusKm = 30,
  technicianId,
  t,
  lang,
  onAvailabilityChange,
}: Props) {
  const [available, setAvailable] = useState(isAvailable)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [draftHours, setDraftHours] = useState<WorkingHours>(workingHours ?? {})
  const [draftRadius, setDraftRadius] = useState(serviceRadiusKm)
  const [bulkFrom, setBulkFrom] = useState('08:00')
  const [bulkTo, setBulkTo] = useState('16:00')

  // Sync state when props change (after parent refreshes auth)
  useEffect(() => {
    if (!editing) {
      setAvailable(isAvailable)
      setDraftHours(workingHours ?? {})
      setDraftRadius(serviceRadiusKm)
    }
  }, [isAvailable, workingHours, serviceRadiusKm, editing])
  const dayLabels = DAY_LABELS[lang] || DAY_LABELS.sk

  const toggleAvailable = () => {
    const next = !available
    setAvailable(next)
    onAvailabilityChange?.({
      isAvailable: next,
      workingHours: draftHours,
      serviceRadiusKm: draftRadius,
    })
  }

  const startEdit = () => {
    setDraftHours(workingHours ? { ...workingHours } : {})
    setDraftRadius(serviceRadiusKm)
    setEditing(true)
  }

  const cancel = () => {
    setSaveError(false)
    setEditing(false)
  }

  const save = async () => {
    // Validate that 'from' is before 'to' for all enabled days
    for (const day of Object.keys(draftHours)) {
      const slot = draftHours[day]
      if (slot?.enabled && slot.from && slot.to && slot.from >= slot.to) {
        setSaveError(true)
        console.error('[ProfileAvailability] Invalid time range for', day, ':', slot.from, '>=', slot.to)
        return
      }
    }
    setSaving(true)
    setSaveError(false)
    try {
      await onAvailabilityChange?.({
        isAvailable: available,
        workingHours: draftHours,
        serviceRadiusKm: draftRadius,
      })
      setEditing(false)
    } catch (err) {
      console.error('[ProfileAvailability] save failed:', err)
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (day: string) => {
    setDraftHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day]?.enabled },
    }))
  }

  const updateTime = (day: string, field: 'from' | 'to', value: string) => {
    setDraftHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  return (
    <div className="profile-card">
      <div className="profile-section-header">
        <h3 className="profile-section-title" style={{ marginBottom: 0 }}>
          {t('profilePage.availability.title')}
        </h3>
        {!editing && onAvailabilityChange && (
          <button className="profile-edit-btn" onClick={startEdit}>
            ✏️
          </button>
        )}
      </div>

      {/* Availability toggle */}
      <div className="profile-toggle-row" style={{ marginTop: 14 }}>
        <span className="profile-toggle-label">
          {available ? t('profilePage.availability.available') : t('profilePage.availability.unavailable')}
        </span>
        <button
          className={`profile-toggle ${available ? 'active' : ''}`}
          onClick={toggleAvailable}
          aria-label="Toggle availability"
        >
          <span className="profile-toggle-knob" />
        </button>
      </div>

      {/* Bulk preset setter — shown only in edit mode */}
      {editing && (
        <div style={{
          margin: '14px 0 10px',
          padding: '14px',
          background: 'var(--bg-surface, rgba(0,0,0,0.03))',
          borderRadius: 10,
          border: '1px solid var(--border, #E8E2D6)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            {lang === 'cz' ? 'Nastavit hromadně:' : 'Nastaviť hromadne:'}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <input
              type="time"
              className="hour-input"
              value={bulkFrom}
              onChange={(e) => setBulkFrom(e.target.value)}
              style={{ flex: 1 }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>–</span>
            <input
              type="time"
              className="hour-input"
              value={bulkTo}
              onChange={(e) => setBulkTo(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: lang === 'cz' ? 'Po-Pá' : 'Po-Pi', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], offDays: ['saturday', 'sunday'] },
              { label: lang === 'cz' ? 'Víkend' : 'Víkend', days: ['saturday', 'sunday'], offDays: [] as string[] },
              { label: lang === 'cz' ? 'Všechny' : 'Všetky', days: DAY_KEYS, offDays: [] as string[] },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  const updated = { ...draftHours }
                  for (const day of preset.days) {
                    updated[day] = { from: bulkFrom, to: bulkTo, enabled: true }
                  }
                  for (const day of preset.offDays) {
                    updated[day] = { ...updated[day], from: updated[day]?.from || '08:00', to: updated[day]?.to || '16:00', enabled: false }
                  }
                  setDraftHours(updated)
                }}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 8,
                  border: '1px solid var(--gold, #D4A843)',
                  background: 'transparent',
                  color: 'var(--gold, #D4A843)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,168,67,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Individual day rows — for fine-tuning after preset */}
      {editing && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, paddingLeft: 2 }}>
          {lang === 'cz' ? 'Jednotlivé dny (volitelné úpravy):' : 'Jednotlivé dni (voliteľné úpravy):'}
        </div>
      )}

      {/* Working hours */}
      {(workingHours || editing) && (
        <div className="profile-hours">
          {DAY_KEYS.map((day) => {
            const h = editing ? draftHours[day] : workingHours?.[day]
            if (!h && !editing) return null
            const entry = h ?? { from: '08:00', to: '16:00', enabled: false }
            return (
              <div key={day} className={`profile-hour-row ${entry.enabled ? '' : 'disabled'}`}>
                <span className="profile-hour-day">{dayLabels[day]}</span>
                {editing ? (
                  <div className="hour-edit-row">
                    <button
                      className={`hour-toggle ${entry.enabled ? 'on' : 'off'}`}
                      onClick={() => toggleDay(day)}
                    >
                      {entry.enabled ? '✓' : '✗'}
                    </button>
                    {entry.enabled && (
                      <>
                        <input
                          type="time"
                          className="hour-input"
                          value={entry.from}
                          onChange={(e) => updateTime(day, 'from', e.target.value)}
                        />
                        <span>–</span>
                        <input
                          type="time"
                          className="hour-input"
                          value={entry.to}
                          onChange={(e) => updateTime(day, 'to', e.target.value)}
                        />
                      </>
                    )}
                  </div>
                ) : (
                  <span className="profile-hour-time">
                    {entry.enabled ? `${entry.from} – ${entry.to}` : '—'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Service radius */}
      <div className="profile-radius" style={{ marginTop: 10 }}>
        <span className="profile-radius-icon">📍</span>
        {editing ? (
          <div className="radius-edit">
            <span>{t('profilePage.availability.radius')}:</span>
            <input
              type="number"
              inputMode="numeric"
              className="pricing-input"
              style={{ width: 60 }}
              value={draftRadius || ''}
              min={5}
              max={100}
              onChange={(e) => setDraftRadius(parseInt(e.target.value) || 30)}
            />
            <span>km</span>
          </div>
        ) : (
          <span>{t('profilePage.availability.radius')}: <strong>{serviceRadiusKm} km</strong></span>
        )}
      </div>

      {editing && (
        <div className="profile-edit-actions" style={{ marginTop: 14 }}>
          {saveError && (
            <p style={{ color: 'var(--danger, #ef4444)', fontSize: 13, marginBottom: 8, width: '100%' }}>
              {lang === 'cz' ? 'Nepodařilo se uložit. Zkuste znovu.' : 'Nepodarilo sa uložiť. Skúste znova.'}
            </p>
          )}
          <button className="btn btn-outline btn-sm" onClick={cancel} disabled={saving}>
            {lang === 'cz' ? 'Zrušit' : 'Zrušiť'}
          </button>
          <button className="btn btn-gold btn-sm" onClick={save} disabled={saving}>
            {saving ? (lang === 'cz' ? 'Ukládám...' : 'Ukladám...') : (lang === 'cz' ? 'Uložit' : 'Uložiť')}
          </button>
        </div>
      )}

      {/* Calendar link */}
      {!editing && (
        <div className="profile-calendar-actions" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/dispatch/calendar" className="profile-calendar-link" style={{ textAlign: 'center', display: 'block' }}>
            {t('profilePage.availability.manageCalendar')} →
          </Link>

        </div>
      )}
    </div>
  )
}
