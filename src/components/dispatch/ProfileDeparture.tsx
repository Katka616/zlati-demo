'use client'

import { useState } from 'react'
import AddressAutocomplete, { type AddressSuggestion } from '@/components/ui/AddressAutocomplete'

interface DepartureData {
    street: string | null
    city: string | null
    psc: string | null
    country: string | null
    gps_lat?: number | null
    gps_lng?: number | null
}

interface Props {
    departure?: DepartureData
    t: (key: string) => string
    onDepartureChange?: (departure: DepartureData) => Promise<void> | void
}

export default function ProfileDeparture({ departure, t, onDepartureChange }: Props) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState<DepartureData>(departure ?? {
        street: null,
        city: null,
        psc: null,
        country: 'SK'
    })

    const startEdit = () => {
        setDraft(departure ? { ...departure } : {
            street: null,
            city: null,
            psc: null,
            country: 'SK'
        })
        setEditing(true)
    }

    const cancel = () => setEditing(false)

    const handleAddressSuggestion = (suggestion: AddressSuggestion) => {
        setDraft(prev => ({
            ...prev,
            street: suggestion.street,
            city: suggestion.city,
            psc: suggestion.psc,
            country: suggestion.country || prev.country,
        }))
    }

    const lang = (draft.country === 'CZ' ? 'cz' : 'sk') as 'sk' | 'cz'

    const [saving, setSaving] = useState(false)

    const save = async () => {
        setSaving(true)
        try {
            await onDepartureChange?.(draft)
            setEditing(false)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="profile-card">
            <div className="profile-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>📍</span>
                    <h3 className="profile-section-title" style={{ marginBottom: 0 }}>
                        {t('profilePage.departure.title')}
                    </h3>
                </div>
                {!editing && onDepartureChange && (
                    <button className="profile-edit-btn" onClick={startEdit}>
                        ✏️
                    </button>
                )}
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                {t('profilePage.departure.hint')}
            </p>

            {editing ? (
                <div className="profile-vehicle-grid" style={{ marginTop: 14 }}>
                    {/* Address search */}
                    <div style={{ marginBottom: '12px' }}>
                        <AddressAutocomplete
                            country={draft.country || 'SK'}
                            onSelect={handleAddressSuggestion}
                            initialValue={draft.street && draft.city ? `${draft.street}, ${draft.city}` : ''}
                            lang={lang}
                        />
                    </div>

                    {/* Divider */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        margin: '4px 0 12px', fontSize: '11px', color: 'var(--text-secondary)'
                    }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--divider)' }} />
                        <span>{t('profilePage.orEditManually')}</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--divider)' }} />
                    </div>

                    <div className="pricing-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
                        <label className="pricing-label">{t('profilePage.departure.street')}</label>
                        <input
                            type="text"
                            className="pricing-input"
                            style={{ width: '100%' }}
                            value={draft.street ?? ''}
                            onChange={(e) => setDraft({ ...draft, street: e.target.value })}
                            placeholder="napr. Mlynské nivy 10"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                        <div className="pricing-row" style={{ flex: 2, flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
                            <label className="pricing-label">{t('profilePage.departure.city')}</label>
                            <input
                                type="text"
                                className="pricing-input"
                                style={{ width: '100%' }}
                                value={draft.city ?? ''}
                                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                                placeholder="napr. Bratislava"
                            />
                        </div>
                        <div className="pricing-row" style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
                            <label className="pricing-label">{t('profilePage.departure.psc')}</label>
                            <input
                                type="text"
                                className="pricing-input"
                                style={{ width: '100%' }}
                                value={draft.psc ?? ''}
                                onChange={(e) => setDraft({ ...draft, psc: e.target.value })}
                                placeholder="811 09"
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="profile-vehicle-grid" style={{ marginTop: 14 }}>
                    <div className="profile-vehicle-row">
                        <span className="profile-vehicle-icon">🏠</span>
                        <div style={{ flex: 1 }}>
                            <div className="profile-vehicle-label">{t('profilePage.departure.addressLabel')}</div>
                            <div className="profile-vehicle-value">
                                {departure?.street ? `${departure.street}, ${departure.city}` : t('profilePage.departure.notSet')}
                            </div>
                        </div>
                    </div>

                    <div className="profile-vehicle-row">
                        <span className="profile-vehicle-icon">🌐</span>
                        <div style={{ flex: 1 }}>
                            <div className="profile-vehicle-label">{t('profilePage.departure.gpsLabel')}</div>
                            <div className="profile-vehicle-value" style={{ fontSize: 13, color: departure?.gps_lat ? 'var(--gold)' : 'var(--g4)' }}>
                                {departure?.gps_lat != null && departure?.gps_lng != null
                                    ? `${Number(departure.gps_lat).toFixed(5)}, ${Number(departure.gps_lng).toFixed(5)}`
                                    : t('profilePage.departure.gpsNotSet')}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editing && (
                <div className="profile-edit-actions" style={{ marginTop: 14 }}>
                    <button className="btn btn-outline btn-sm" onClick={cancel}>
                        {t('common.cancel')}
                    </button>
                    <button className="btn btn-gold btn-sm" onClick={save} disabled={saving}>
                        {saving ? (lang === 'cz' ? '⏳ Ukládám...' : '⏳ Ukladám...') : t('profilePage.departure.saveAndCalc')}
                    </button>
                </div>
            )}
        </div>
    )
}

