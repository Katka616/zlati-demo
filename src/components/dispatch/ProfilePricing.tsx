'use client'

import { useState, useEffect } from 'react'
import { TechnicianPricing } from '@/types/dispatch'

interface Props {
  pricing?: TechnicianPricing
  t: (key: string) => string
  lang?: 'sk' | 'cz'
  onPricingChange?: (pricing: TechnicianPricing) => void | Promise<void>
}

type PricingKey = 'firstHourRate' | 'additionalHourRate' | 'kmRate'

export default function ProfilePricing({ pricing, t, lang = 'sk', onPricingChange }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<TechnicianPricing | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Sync draft when pricing prop changes (after parent refreshes auth)
  useEffect(() => {
    if (!editing) setDraft(null)
  }, [pricing, editing])

  if (!pricing) return null

  const fmt = (val: number) =>
    `${pricing.currency === 'EUR' ? '€' : ''} ${val.toFixed(2)}${pricing.currency === 'CZK' ? ' Kč' : ''}`

  const startEdit = () => {
    setDraft({ ...pricing })
    setSaveError(null)
    setEditing(true)
  }

  const cancel = () => {
    setDraft(null)
    setSaveError(null)
    setEditing(false)
  }

  const save = async () => {
    if (!draft || !onPricingChange) return
    setSaving(true)
    setSaveError(null)
    try {
      await onPricingChange(draft)
      setEditing(false)
    } catch {
      console.error('[ProfilePricing] save failed')
      setSaveError(lang === 'cz' ? 'Nepodařilo se uložit sazby. Zkuste znovu.' : 'Nepodarilo sa uložiť sadzby. Skúste znova.')
    } finally {
      setSaving(false)
    }
  }

  /** Clamp value to +-10% of the original pricing value.
   *  Exception: if original is 0 or empty, allow any positive value. */
  const clamp = (key: PricingKey, raw: number): number => {
    const original = pricing[key]
    if (!original || original === 0) return Math.max(0, raw)
    const min = +(original * 0.9).toFixed(2)
    const max = +(original * 1.1).toFixed(2)
    return Math.min(max, Math.max(min, raw))
  }

  const updateField = (key: PricingKey, value: string) => {
    if (!draft) return
    if (value === '' || value === '.') {
      setDraft({ ...draft, [key]: 0 })
      return
    }
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) return
    setDraft({ ...draft, [key]: num })
  }

  const fields: { key: PricingKey; icon: string; labelKey: string; suffix: string }[] = [
    { key: 'firstHourRate', icon: '🕐', labelKey: 'profilePage.pricing.firstHour', suffix: '/hod' },
    { key: 'additionalHourRate', icon: '🕑', labelKey: 'profilePage.pricing.additionalHour', suffix: '/hod' },
    { key: 'kmRate', icon: '🚗', labelKey: 'profilePage.pricing.kmRate', suffix: '/km' },
  ]

  return (
    <div className="profile-card">
      <div className="profile-section-header">
        <h3 className="profile-section-title" style={{ marginBottom: 0 }}>
          {t('profilePage.pricing.title')}
        </h3>
        {!editing && onPricingChange && (
          <button className="profile-edit-btn" onClick={startEdit}>
            ✏️
          </button>
        )}
      </div>

      <div className="profile-vehicle-grid" style={{ marginTop: 14 }}>
        {fields.map(({ key, icon, labelKey, suffix }) => (
          <div className="profile-vehicle-row" key={key}>
            <span className="profile-vehicle-icon">{icon}</span>
            <div style={{ flex: 1 }}>
              <div className="profile-vehicle-label">{t(labelKey)}</div>
              {editing && draft ? (
                <div className="pricing-edit-field">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="pricing-input"
                    value={draft[key] || ''}
                    placeholder="0"
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                  <span className="pricing-suffix">{suffix}</span>
                  {pricing[key] > 0 && (
                    <span className="pricing-range">
                      ±10%: {fmt(+(pricing[key] * 0.9).toFixed(2))} – {fmt(+(pricing[key] * 1.1).toFixed(2))}
                    </span>
                  )}
                </div>
              ) : (
                <div className="profile-vehicle-value">
                  {fmt(pricing[key])}{suffix}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

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
