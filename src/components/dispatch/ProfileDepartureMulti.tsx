'use client'

import { useState, useEffect, useCallback } from 'react'
import AddressAutocomplete, { type AddressSuggestion } from '@/components/ui/AddressAutocomplete'

interface DepartureAddress {
  id: number
  label: string | null
  street: string | null
  city: string | null
  psc: string | null
  country: string | null
  lat: number | null
  lng: number | null
  is_default: boolean
}

interface Props {
  t: (key: string) => string
  lang?: 'sk' | 'cz'
  country?: string
  showToast?: (msg: string, type: 'success' | 'error') => void
}

const MAX_ADDRESSES = 5

export default function ProfileDepartureMulti({ t, lang = 'sk', country = 'CZ', showToast }: Props) {
  const [addresses, setAddresses] = useState<DepartureAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [draft, setDraft] = useState<Partial<DepartureAddress>>({})
  const [saving, setSaving] = useState(false)

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch('/api/dispatch/departures', { credentials: 'include' })
      const json = await res.json()
      if (json.addresses) setAddresses(json.addresses)
    } catch {
      console.error('[DepartureMulti] Failed to load addresses')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAddresses() }, [fetchAddresses])

  const handleAddressSuggestion = (suggestion: AddressSuggestion) => {
    setDraft(prev => ({
      ...prev,
      street: suggestion.street,
      city: suggestion.city,
      psc: suggestion.psc,
      country: suggestion.country || country,
    }))
  }

  const startAdd = () => {
    setDraft({ label: null, street: null, city: null, psc: null, country, is_default: false })
    setEditingId('new')
  }

  const startEdit = (addr: DepartureAddress) => {
    setDraft({ ...addr })
    setEditingId(addr.id)
  }

  const cancel = () => { setEditingId(null); setDraft({}) }

  const saveAddress = async () => {
    setSaving(true)
    try {
      if (editingId === 'new') {
        const res = await fetch('/api/dispatch/departures', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        })
        if (!res.ok) {
          const err = await res.json()
          showToast?.(err.message || t('profilePage.departureMulti.saveFailed'), 'error')
          return
        }
      } else {
        const res = await fetch(`/api/dispatch/departures/${editingId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        })
        if (!res.ok) {
          showToast?.(t('profilePage.departureMulti.saveFailed'), 'error')
          return
        }
      }
      showToast?.(t('profilePage.departureMulti.saved'), 'success')
      setEditingId(null)
      setDraft({})
      await fetchAddresses()
    } finally {
      setSaving(false)
    }
  }

  const deleteAddress = async (id: number) => {
    const res = await fetch(`/api/dispatch/departures/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (res.ok) {
      showToast?.(t('profilePage.departureMulti.deleted'), 'success')
      await fetchAddresses()
    } else {
      const err = await res.json()
      showToast?.(err.message || t('profilePage.departureMulti.saveFailed'), 'error')
    }
  }

  const setDefaultAddr = async (id: number) => {
    const res = await fetch(`/api/dispatch/departures/${id}`, {
      method: 'PATCH',
      credentials: 'include',
    })
    if (res.ok) {
      showToast?.(t('profilePage.departureMulti.setAsMain'), 'success')
      await fetchAddresses()
    }
  }

  if (loading) {
    return (
      <div className="profile-card">
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--g4)', fontSize: 13 }}>
          {t('profilePage.departureMulti.loading')}
        </div>
      </div>
    )
  }

  return (
    <div className="profile-card" id="section-departure">
      <div className="profile-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>📍</span>
          <h3 className="profile-section-title" style={{ marginBottom: 0 }}>
            {t('profilePage.departureMulti.title')}
          </h3>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
        {t('profilePage.departureMulti.hint')}
      </p>

      {/* Address list */}
      <div className="profile-vehicle-grid" style={{ marginTop: 14 }}>
        {addresses.map((addr) => (
          <div key={addr.id} className="profile-vehicle-row" style={{
            position: 'relative',
            background: addr.is_default ? 'rgba(212,168,67,0.06)' : undefined,
            borderLeft: addr.is_default ? '3px solid var(--gold, #D4A843)' : '3px solid transparent',
            paddingLeft: 12,
          }}>
            {editingId === addr.id ? (
              <div style={{ width: '100%' }}>
                {renderEditForm()}
              </div>
            ) : (
              <>
                <span className="profile-vehicle-icon">
                  {addr.is_default ? '⭐' : '🏠'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="profile-vehicle-label">
                      {addr.label || (addr.is_default
                        ? t('profilePage.departureMulti.mainPoint')
                        : t('profilePage.departureMulti.point'))}
                    </div>
                    {addr.is_default && (
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 4,
                        background: 'var(--gold, #D4A843)', color: '#000', fontWeight: 600,
                      }}>
                        {t('profilePage.departureMulti.main')}
                      </span>
                    )}
                  </div>
                  <div className="profile-vehicle-value">
                    {addr.street ? `${addr.street}, ${addr.city}` : t('profilePage.departureMulti.noAddress')}
                  </div>
                  {addr.lat != null && (
                    <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 2 }}>
                      GPS: {Number(addr.lat).toFixed(4)}, {Number(addr.lng).toFixed(4)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 8 }}>
                  <button
                    onClick={() => startEdit(addr)}
                    style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                  >✏️</button>
                  {!addr.is_default && (
                    <button
                      onClick={() => setDefaultAddr(addr.id)}
                      title={t('profilePage.departureMulti.setDefault')}
                      style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    >⭐</button>
                  )}
                  {addresses.length > 1 && (
                    <button
                      onClick={() => deleteAddress(addr.id)}
                      title={t('profilePage.departureMulti.delete')}
                      style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    >🗑️</button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {/* New address form */}
        {editingId === 'new' && (
          <div style={{
            padding: 12, borderRadius: 8,
            background: 'var(--bg-elevated, #1a1a1a)',
            border: '1px dashed var(--gold, #D4A843)',
          }}>
            {renderEditForm()}
          </div>
        )}
      </div>

      {/* Add button */}
      {editingId === null && addresses.length < MAX_ADDRESSES && (
        <button
          onClick={startAdd}
          style={{
            width: '100%', marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(212,168,67,0.06)',
            border: '1px dashed rgba(212,168,67,0.3)',
            color: 'var(--gold, #D4A843)', fontSize: 13, cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          + {t('profilePage.departureMulti.addBtn')}
        </button>
      )}

      {addresses.length >= MAX_ADDRESSES && editingId === null && (
        <p style={{ fontSize: 12, color: 'var(--g4)', marginTop: 8, textAlign: 'center' }}>
          {t('profilePage.departureMulti.maxReached')}
        </p>
      )}
    </div>
  )

  function renderEditForm() {
    return (
      <div>
        {/* Label */}
        <div className="pricing-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none', marginBottom: 8 }}>
          <label className="pricing-label">{t('profilePage.departureMulti.label')}</label>
          <input
            type="text"
            className="pricing-input"
            style={{ width: '100%' }}
            value={draft.label ?? ''}
            onChange={(e) => setDraft({ ...draft, label: e.target.value || null })}
            placeholder={t('profilePage.departureMulti.labelPlaceholder')}
          />
        </div>

        {/* Address autocomplete */}
        <div style={{ marginBottom: 12 }}>
          <AddressAutocomplete
            country={draft.country || country}
            onSelect={handleAddressSuggestion}
            initialValue={draft.street && draft.city ? `${draft.street}, ${draft.city}` : ''}
            lang={lang}
          />
        </div>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          margin: '4px 0 12px', fontSize: 11, color: 'var(--text-secondary)',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
          <span>{t('profilePage.orEditManually')}</span>
          <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
        </div>

        {/* Manual fields */}
        <div className="pricing-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
          <label className="pricing-label">{t('profilePage.departureMulti.street')}</label>
          <input
            type="text"
            className="pricing-input"
            style={{ width: '100%' }}
            value={draft.street ?? ''}
            onChange={(e) => setDraft({ ...draft, street: e.target.value })}
            placeholder={t('profilePage.departureMulti.streetPlaceholder')}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <div className="pricing-row" style={{ flex: 2, flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
            <label className="pricing-label">{t('profilePage.departureMulti.city')}</label>
            <input
              type="text"
              className="pricing-input"
              style={{ width: '100%' }}
              value={draft.city ?? ''}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              placeholder={t('profilePage.departureMulti.cityPlaceholder')}
            />
          </div>
          <div className="pricing-row" style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
            <label className="pricing-label">{t('profilePage.departureMulti.psc')}</label>
            <input
              type="text"
              className="pricing-input"
              style={{ width: '100%' }}
              value={draft.psc ?? ''}
              onChange={(e) => setDraft({ ...draft, psc: e.target.value })}
              placeholder={t('profilePage.departureMulti.pscPlaceholder')}
            />
          </div>
        </div>

        <div className="profile-edit-actions" style={{ marginTop: 14 }}>
          <button className="btn btn-outline btn-sm" onClick={cancel}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-gold btn-sm" onClick={saveAddress} disabled={saving}>
            {saving
              ? `⏳ ${t('profilePage.departureMulti.saving')}`
              : t('profilePage.departureMulti.save')}
          </button>
        </div>
      </div>
    )
  }
}
