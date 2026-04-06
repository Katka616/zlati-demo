'use client'

/**
 * EditJobInfoModal — lets technician edit basic job info
 * (customer name, phone, address, description, scheduled date/time).
 */

import { useState, useCallback } from 'react'
import { getTranslation } from '@/lib/i18n'
import { Language } from '@/types/protocol'

interface EditJobInfoModalProps {
  jobId: string
  lang: Language
  initial: {
    customerName: string
    customerPhone: string
    customerAddress: string
    customerCity: string
    description: string
    scheduledDate: string
    scheduledTime: string
  }
  onClose: () => void
  onSaved: () => void
}

export default function EditJobInfoModal({
  jobId,
  lang,
  initial,
  onClose,
  onSaved,
}: EditJobInfoModalProps) {
  const t = useCallback((key: string) => getTranslation(lang, key), [lang])

  const [form, setForm] = useState({ ...initial })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer_name: form.customerName.trim(),
          customer_phone: form.customerPhone.trim(),
          customer_address: form.customerAddress.trim(),
          customer_city: form.customerCity.trim(),
          description: form.description.trim(),
          scheduled_date: form.scheduledDate || null,
          scheduled_time: form.scheduledTime || null,
        }),
      })
      if (res.ok) {
        onSaved()
        onClose()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Chyba při ukládání')
      }
    } catch {
      setError(lang === 'sk' ? 'Chyba siete' : 'Chyba sítě')
    } finally {
      setIsSaving(false)
    }
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 600,
    fontSize: 12,
    color: 'var(--dark)',
    textTransform: 'uppercase',
    marginBottom: 4,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--g6)',
    fontSize: 16,
    color: 'var(--dark)',
    background: 'var(--bg-card)',
    boxSizing: 'border-box',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-modal, #fff)',
          borderRadius: '16px 16px 0 0',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          width: '100%',
          maxWidth: 500,
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '20px 16px 32px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--dark)' }}>
            {lang === 'sk' ? 'Upraviť zákazku' : 'Upravit zakázku'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--g4)', padding: '0 4px' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>{lang === 'sk' ? 'Meno zákazníka' : 'Jméno zákazníka'}</label>
            <input style={inputStyle} value={form.customerName} onChange={e => set('customerName', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>{lang === 'sk' ? 'Telefón' : 'Telefon'}</label>
            <input style={inputStyle} type="tel" value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>{lang === 'sk' ? 'Ulica' : 'Ulice'}</label>
              <input style={inputStyle} value={form.customerAddress} onChange={e => set('customerAddress', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>{lang === 'sk' ? 'Mesto' : 'Město'}</label>
              <input style={inputStyle} value={form.customerCity} onChange={e => set('customerCity', e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t('dispatch.description') || 'Popis'}</label>
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>{lang === 'sk' ? 'Dátum' : 'Datum'}</label>
              <input style={inputStyle} type="date" value={form.scheduledDate} onChange={e => set('scheduledDate', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>{lang === 'sk' ? 'Čas' : 'Čas'}</label>
              <input style={inputStyle} type="time" value={form.scheduledTime} onChange={e => set('scheduledTime', e.target.value)} />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8, fontWeight: 500 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            width: '100%',
            marginTop: 16,
            padding: '12px 0',
            borderRadius: 10,
            border: 'none',
            background: 'var(--gold)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving
            ? (lang === 'sk' ? 'Ukladám...' : 'Ukládám...')
            : (lang === 'sk' ? 'Uložiť zmeny' : 'Uložit změny')}
        </button>
      </div>
    </div>
  )
}
