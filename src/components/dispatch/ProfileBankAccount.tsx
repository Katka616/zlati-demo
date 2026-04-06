'use client'

import { useState, useEffect } from 'react'

interface BankData {
  bank_account_number: string | null
  bank_code: string | null
  iban: string | null
}

interface Props {
  t: (key: string) => string
  onBankChange?: (data: BankData) => void
  lang?: 'sk' | 'cz'
}

export default function ProfileBankAccount({ t, onBankChange }: Props) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [bank, setBank] = useState<BankData>({
    bank_account_number: null,
    bank_code: null,
    iban: null,
  })
  const [draft, setDraft] = useState<BankData>({ ...bank })
  const [showIban, setShowIban] = useState(false)

  useEffect(() => {
    fetch('/api/dispatch/profile', { credentials: 'include' })
      .then(r => r.json())
      .then(res => {
        if (res.profile) {
          const b: BankData = {
            bank_account_number: res.profile.bank_account_number || null,
            bank_code: res.profile.bank_code || null,
            iban: res.profile.iban || null,
          }
          setBank(b)
          setDraft(b)
          if (b.iban && !b.bank_account_number) setShowIban(true)
        }
      })
      .catch(() => { setLoadError(t('dispatch.profile.bankAccount.loadError')) })
      .finally(() => setLoading(false))
  }, [])

  const startEdit = () => {
    setDraft({ ...bank })
    setShowIban(!!bank.iban && !bank.bank_account_number)
    setEditing(true)
  }

  const cancel = () => setEditing(false)

  const save = () => {
    onBankChange?.(draft)
    setBank({ ...draft })
    setEditing(false)
  }

  const hasCzAccount = !!(bank.bank_account_number || bank.bank_code)
  const hasIban = !!bank.iban

  const displayAccount = hasCzAccount
    ? `${bank.bank_account_number || '—'}/${bank.bank_code || '—'}`
    : hasIban
      ? bank.iban
      : null

  if (loading) {
    return (
      <div className="profile-card">
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--g4)', fontSize: 13 }}>
          {t('dispatch.profile.bankAccount.loading')}
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
          <span style={{ fontSize: 20 }}>🏦</span>
          <h3 className="profile-section-title" style={{ marginBottom: 0 }}>
            {t('dispatch.profile.bankAccount.title')}
          </h3>
        </div>
        {!editing && onBankChange && (
          <button className="profile-edit-btn" onClick={startEdit}>
            ✏️
          </button>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
        {t('dispatch.profile.bankAccount.hint')}
      </p>

      {editing ? (
        <div style={{ marginTop: 14 }}>
          {/* Toggle CZ account vs IBAN */}
          <div style={{
            display: 'flex', gap: 8, marginBottom: 16,
            background: 'var(--bg-elevated)', borderRadius: 8, padding: 4,
          }}>
            <button
              onClick={() => setShowIban(false)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 6, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: !showIban ? 'var(--bg-card, #fff)' : 'transparent',
                color: !showIban ? 'var(--text-primary)' : 'var(--g4)',
                boxShadow: !showIban ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {t('dispatch.profile.bankAccount.czAccount')}
            </button>
            <button
              onClick={() => setShowIban(true)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 6, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: showIban ? 'var(--bg-card, #fff)' : 'transparent',
                color: showIban ? 'var(--text-primary)' : 'var(--g4)',
                boxShadow: showIban ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              IBAN
            </button>
          </div>

          {!showIban ? (
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="pricing-row" style={{ flex: 2, flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
                <label className="pricing-label">{t('dispatch.profile.bankAccount.accountLabel')}</label>
                <input
                  type="text"
                  className="pricing-input"
                  style={{ width: '100%' }}
                  value={draft.bank_account_number ?? ''}
                  onChange={(e) => setDraft({ ...draft, bank_account_number: e.target.value || null })}
                  placeholder="123456789"
                  inputMode="numeric"
                />
              </div>
              <div className="pricing-row" style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
                <label className="pricing-label">{t('dispatch.profile.bankAccount.bankCode')}</label>
                <input
                  type="text"
                  className="pricing-input"
                  style={{ width: '100%' }}
                  value={draft.bank_code ?? ''}
                  onChange={(e) => setDraft({ ...draft, bank_code: e.target.value || null })}
                  placeholder="0800"
                  inputMode="numeric"
                  maxLength={4}
                />
              </div>
            </div>
          ) : (
            <div className="pricing-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
              <label className="pricing-label">IBAN</label>
              <input
                type="text"
                className="pricing-input"
                style={{ width: '100%', fontFamily: 'monospace', letterSpacing: 1 }}
                value={draft.iban ?? ''}
                onChange={(e) => setDraft({ ...draft, iban: e.target.value.toUpperCase().replace(/\s+/g, '') || null })}
                placeholder="CZ6508000000192000145399"
                maxLength={34}
              />
              <span style={{ fontSize: 12, color: 'var(--g4)', marginTop: 4 }}>
                {t('dispatch.profile.bankAccount.ibanHint')}
              </span>
            </div>
          )}

          <div className="profile-edit-actions" style={{ marginTop: 14 }}>
            <button className="btn btn-outline btn-sm" onClick={cancel}>
              {t('dispatch.profile.bankAccount.cancel')}
            </button>
            <button className="btn btn-gold btn-sm" onClick={save}>
              {t('dispatch.profile.bankAccount.save')}
            </button>
          </div>
        </div>
      ) : (
        <div className="profile-vehicle-grid" style={{ marginTop: 14 }}>
          <div className="profile-vehicle-row">
            <span className="profile-vehicle-icon">💳</span>
            <div style={{ flex: 1 }}>
              <div className="profile-vehicle-label">{t('dispatch.profile.bankAccount.accountLabel')}</div>
              <div className="profile-vehicle-value" style={{
                fontFamily: displayAccount ? 'monospace' : undefined,
                letterSpacing: displayAccount ? 0.5 : undefined,
              }}>
                {displayAccount || t('dispatch.profile.bankAccount.notFilled')}
              </div>
            </div>
          </div>

          {bank.iban && hasCzAccount && (
            <div className="profile-vehicle-row">
              <span className="profile-vehicle-icon">🌐</span>
              <div style={{ flex: 1 }}>
                <div className="profile-vehicle-label">IBAN</div>
                <div className="profile-vehicle-value" style={{ fontFamily: 'monospace', letterSpacing: 0.5, fontSize: 13 }}>
                  {bank.iban}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
