'use client'

import { useState, useEffect } from 'react'

interface BusinessData {
  ico: string | null
  dic: string | null
  ic_dph: string | null
  platca_dph: boolean
  billing_name: string | null
  billing_street: string | null
  billing_city: string | null
  billing_psc: string | null
  billing_country: string | null
  registration: string | null
  zivnosti: string | null
  gov_link: string | null
}

interface Props {
  t: (key: string) => string
  onBusinessChange?: (data: BusinessData) => void
  lang?: 'sk' | 'cz'
  country?: string
}

const EMPTY_BUSINESS: BusinessData = {
  ico: null,
  dic: null,
  ic_dph: null,
  platca_dph: false,
  billing_name: null,
  billing_street: null,
  billing_city: null,
  billing_psc: null,
  billing_country: null,
  registration: null,
  zivnosti: null,
  gov_link: null,
}

export default function ProfileBusinessDetails({ t, onBusinessChange, country }: Props) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [business, setBusiness] = useState<BusinessData>({ ...EMPTY_BUSINESS })
  const [draft, setDraft] = useState<BusinessData>({ ...EMPTY_BUSINESS })
  const [aresLoading, setAresLoading] = useState(false)
  const [aresMessage, setAresMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/dispatch/profile', { credentials: 'include' })
      .then(r => r.json())
      .then(res => {
        if (res.profile) {
          const b: BusinessData = {
            ico: res.profile.ico || null,
            dic: res.profile.dic || null,
            ic_dph: res.profile.ic_dph || null,
            platca_dph: res.profile.platca_dph ?? false,
            billing_name: res.profile.billing_name || null,
            billing_street: res.profile.billing_street || null,
            billing_city: res.profile.billing_city || null,
            billing_psc: res.profile.billing_psc || null,
            billing_country: res.profile.billing_country || null,
            registration: res.profile.registration || null,
            zivnosti: res.profile.zivnosti || null,
            gov_link: res.profile.gov_link || null,
          }
          setBusiness(b)
          setDraft(b)
        }
      })
      .catch(() => { setLoadError(t('profilePage.business.loadError')) })
      .finally(() => setLoading(false))
  }, [])

  const startEdit = () => {
    setDraft({ ...business })
    setAresMessage(null)
    setEditing(true)
  }

  const cancel = () => {
    setAresMessage(null)
    setEditing(false)
  }

  const save = () => {
    onBusinessChange?.(draft)
    setBusiness({ ...draft })
    setEditing(false)
  }

  const lookupAres = async () => {
    if (!draft.ico?.trim()) return
    setAresLoading(true)
    setAresMessage(null)
    try {
      const res = await fetch(`/api/ares/lookup?ico=${draft.ico.trim()}`, { credentials: 'include' })
      const json = await res.json()
      if (json.success && json.data) {
        setDraft(prev => ({
          ...prev,
          billing_name: json.data.billing_name || prev.billing_name,
          billing_street: json.data.billing_street || prev.billing_street,
          billing_city: json.data.billing_city || prev.billing_city,
          billing_psc: json.data.billing_psc || prev.billing_psc,
          dic: json.data.dic || prev.dic,
          ic_dph: json.data.ic_dph || prev.ic_dph,
          platca_dph: json.data.platca_dph ?? prev.platca_dph,
          registration: json.data.registration || prev.registration,
          zivnosti: json.data.zivnosti || prev.zivnosti,
          gov_link: json.data.gov_link || prev.gov_link,
        }))
        setAresMessage({ type: 'success', text: `${t('profilePage.business.aresSuccess')}: ${json.data.billing_name}` })
      } else {
        const errorKey = json.error === 'ares_error'
          ? 'profilePage.business.aresServiceError'
          : json.error === 'invalid_ico'
            ? 'profilePage.business.aresInvalidIco'
            : 'profilePage.business.aresError'
        setAresMessage({ type: 'error', text: t(errorKey) })
      }
    } catch {
      setAresMessage({ type: 'error', text: t('profilePage.business.aresFetchError') })
    } finally {
      setAresLoading(false)
    }
  }

  const isCZ = country === 'CZ'
  const isSK = country === 'SK'

  const billingAddress = [business.billing_street, business.billing_city, business.billing_psc]
    .filter(Boolean)
    .join(', ')

  if (loading) {
    return (
      <div className="profile-card">
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--g4)', fontSize: 13 }}>
          {t('profilePage.business.loading')}
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="profile-card">
        <div style={{ padding: 16, color: 'var(--danger)', fontSize: 13 }}>
          {loadError}
        </div>
      </div>
    )
  }

  return (
    <div className="profile-card">
      <div className="profile-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🏢</span>
          <h3 className="profile-section-title" style={{ marginBottom: 0 }}>
            {t('profilePage.business.title')}
          </h3>
        </div>
        {!editing && onBusinessChange && (
          <button className="profile-edit-btn" onClick={startEdit}>
            ✏️
          </button>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
        {t('profilePage.business.hint')}
      </p>

      {editing ? (
        <div style={{ marginTop: 14 }}>

          {/* IČO + ARES */}
          <div className="pricing-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none', marginBottom: 8 }}>
            <label className="pricing-label">{t('profilePage.business.ico')}</label>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <input
                type="text"
                className="pricing-input"
                style={{ flex: 1 }}
                value={draft.ico ?? ''}
                onChange={e => setDraft({ ...draft, ico: e.target.value || null })}
                placeholder="12345678"
                inputMode="numeric"
                maxLength={10}
              />
              {isCZ && (
                <button
                  onClick={lookupAres}
                  disabled={aresLoading || !draft.ico?.trim()}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--gold)',
                    background: 'transparent',
                    color: 'var(--gold)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: aresLoading || !draft.ico?.trim() ? 'not-allowed' : 'pointer',
                    opacity: aresLoading || !draft.ico?.trim() ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {aresLoading ? `⏳ ${t('profilePage.business.aresLoading')}` : `🔍 ${t('profilePage.business.lookupAres')}`}
                </button>
              )}
            </div>
            {isSK && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                {t('profilePage.business.lookupSk')}{' '}
                <button
                  onClick={() => window.open('https://www.orsr.sk', '_blank')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--gold)',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  {t('profilePage.business.lookupSkLink')}
                </button>
              </span>
            )}
            {aresMessage && (
              <div style={{
                marginTop: 6,
                padding: '6px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                background: aresMessage.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                color: aresMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                width: '100%',
              }}>
                {aresMessage.type === 'success' ? '✓ ' : '✗ '}{aresMessage.text}
              </div>
            )}
          </div>

          {/* Obchodné meno */}
          <div className="pricing-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none', marginBottom: 8 }}>
            <label className="pricing-label">{t('profilePage.business.billingName')}</label>
            <input
              type="text"
              className="pricing-input"
              style={{ width: '100%' }}
              value={draft.billing_name ?? ''}
              onChange={e => setDraft({ ...draft, billing_name: e.target.value || null })}
            />
          </div>

          {/* DIČ */}
          <div className="pricing-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none', marginBottom: 8 }}>
            <label className="pricing-label">{t('profilePage.business.dic')}</label>
            <input
              type="text"
              className="pricing-input"
              style={{ width: '100%' }}
              value={draft.dic ?? ''}
              onChange={e => setDraft({ ...draft, dic: e.target.value || null })}
              placeholder={isCZ ? 'CZ12345678' : '1234567890'}
            />
          </div>

          {/* IČ DPH — only for SK technicians (CZ uses DIČ for VAT) */}
          {isSK && (
            <div className="pricing-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none', marginBottom: 8 }}>
              <label className="pricing-label">{t('profilePage.business.icDph')}</label>
              <input
                type="text"
                className="pricing-input"
                style={{ width: '100%' }}
                value={draft.ic_dph ?? ''}
                onChange={e => setDraft({ ...draft, ic_dph: e.target.value || null })}
                placeholder="SK1234567890"
              />
            </div>
          )}

          {/* Platca DPH toggle */}
          <div className="pricing-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none', marginBottom: 8 }}>
            <div
              onClick={() => setDraft({ ...draft, platca_dph: !draft.platca_dph })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <div style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: draft.platca_dph ? 'var(--success)' : 'var(--g4)',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute',
                  top: 2,
                  left: draft.platca_dph ? 18 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
              <span style={{ fontSize: 13, color: draft.platca_dph ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 500 }}>
                {draft.platca_dph ? t('profilePage.business.platcaDphYes') : t('profilePage.business.platcaDphNo')}
              </span>
            </div>
          </div>

          {/* Fakturačná adresa */}
          <div className="pricing-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none', marginBottom: 8 }}>
            <label className="pricing-label">{t('profilePage.business.billingStreet')}</label>
            <input
              type="text"
              className="pricing-input"
              style={{ width: '100%' }}
              value={draft.billing_street ?? ''}
              onChange={e => setDraft({ ...draft, billing_street: e.target.value || null })}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <div className="pricing-row" style={{ flex: 2, flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
              <label className="pricing-label">{t('profilePage.business.billingCity')}</label>
              <input
                type="text"
                className="pricing-input"
                style={{ width: '100%' }}
                value={draft.billing_city ?? ''}
                onChange={e => setDraft({ ...draft, billing_city: e.target.value || null })}
              />
            </div>
            <div className="pricing-row" style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
              <label className="pricing-label">{t('profilePage.business.billingPsc')}</label>
              <input
                type="text"
                className="pricing-input"
                style={{ width: '100%' }}
                value={draft.billing_psc ?? ''}
                onChange={e => setDraft({ ...draft, billing_psc: e.target.value || null })}
                maxLength={6}
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Zápis v registri */}
          <div className="pricing-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none', marginBottom: 8 }}>
            <label className="pricing-label">{t('profilePage.business.registration')}</label>
            <input
              type="text"
              className="pricing-input"
              style={{ width: '100%' }}
              value={draft.registration ?? ''}
              onChange={e => setDraft({ ...draft, registration: e.target.value || null })}
            />
          </div>

          {/* Buttons */}
          <div className="profile-edit-actions" style={{ marginTop: 14 }}>
            <button className="btn btn-outline btn-sm" onClick={cancel}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-gold btn-sm" onClick={save}>
              {t('common.save')}
            </button>
          </div>
        </div>
      ) : (
        <div className="profile-vehicle-grid" style={{ marginTop: 14 }}>
          {/* IČO */}
          <div className="profile-vehicle-row">
            <span className="profile-vehicle-icon">📋</span>
            <div style={{ flex: 1 }}>
              <div className="profile-vehicle-label">{t('profilePage.business.ico')}</div>
              <div className="profile-vehicle-value" style={{
                color: business.ico ? 'var(--text-primary)' : 'var(--gold)',
                fontWeight: business.ico ? undefined : 600,
              }}>
                {business.ico || `${t('profilePage.business.notFilled')} — ✏️`}
              </div>
            </div>
          </div>

          {/* Obchodné meno */}
          <div className="profile-vehicle-row">
            <span className="profile-vehicle-icon">🏷️</span>
            <div style={{ flex: 1 }}>
              <div className="profile-vehicle-label">{t('profilePage.business.billingName')}</div>
              <div className="profile-vehicle-value" style={{
                color: business.billing_name ? 'var(--text-primary)' : 'var(--gold)',
                fontWeight: business.billing_name ? undefined : 600,
              }}>
                {business.billing_name || t('profilePage.business.notFilled')}
              </div>
            </div>
          </div>

          {/* DIČ */}
          <div className="profile-vehicle-row">
            <span className="profile-vehicle-icon">📝</span>
            <div style={{ flex: 1 }}>
              <div className="profile-vehicle-label">{t('profilePage.business.dic')}</div>
              <div className="profile-vehicle-value">
                {business.dic || <span style={{ color: 'var(--text-secondary)' }}>—</span>}
              </div>
            </div>
          </div>

          {/* IČ DPH + platca badge — IČ DPH row only for SK */}
          {isSK && business.ic_dph && (
            <div className="profile-vehicle-row">
              <span className="profile-vehicle-icon">💰</span>
              <div style={{ flex: 1 }}>
                <div className="profile-vehicle-label">{t('profilePage.business.icDph')}</div>
                <div className="profile-vehicle-value">
                  {business.ic_dph}
                </div>
              </div>
            </div>
          )}

          {/* Platca DPH badge */}
          <div className="profile-vehicle-row">
            <span className="profile-vehicle-icon">💰</span>
            <div style={{ flex: 1 }}>
              <div className="profile-vehicle-label">{t('profilePage.business.platcaDph')}</div>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 700,
                background: business.platca_dph ? 'rgba(34,197,94,0.15)' : 'var(--g4, rgba(0,0,0,0.08))',
                color: business.platca_dph ? 'var(--success)' : 'var(--text-secondary)',
              }}>
                {business.platca_dph ? t('profilePage.business.platcaDphYes') : t('profilePage.business.platcaDphNo')}
              </span>
            </div>
          </div>

          {/* Fakturačná adresa */}
          <div className="profile-vehicle-row">
            <span className="profile-vehicle-icon">📍</span>
            <div style={{ flex: 1 }}>
              <div className="profile-vehicle-label">{t('profilePage.business.billingAddress')}</div>
              <div className="profile-vehicle-value">
                {billingAddress || <span style={{ color: 'var(--text-secondary)' }}>—</span>}
              </div>
            </div>
          </div>

          {/* Zápis v registri — only if filled */}
          {business.registration && (
            <div className="profile-vehicle-row">
              <span className="profile-vehicle-icon">📜</span>
              <div style={{ flex: 1 }}>
                <div className="profile-vehicle-label">{t('profilePage.business.registration')}</div>
                <div className="profile-vehicle-value">{business.registration}</div>
              </div>
            </div>
          )}

          {/* Živnosti — only if filled, truncated */}
          {business.zivnosti && (
            <div className="profile-vehicle-row">
              <span className="profile-vehicle-icon">📄</span>
              <div style={{ flex: 1 }}>
                <div className="profile-vehicle-label">{t('profilePage.business.zivnosti')}</div>
                <div className="profile-vehicle-value" style={{ fontSize: 13 }}>
                  {business.zivnosti.length > 100
                    ? business.zivnosti.slice(0, 100) + '…'
                    : business.zivnosti}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
