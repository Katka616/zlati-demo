'use client'

/**
 * SettlementCorrectionModal — Technician corrects settlement data.
 *
 * Pre-filled with current hours/km/materials, allows editing.
 * Mandatory reason field. On submit sends corrections to the API.
 */

import { useState, useCallback } from 'react'
import type { DispatchJob } from '@/types/dispatch'
import type { Language } from '@/types/protocol'
import DictateTextarea from '@/components/ui/DictateTextarea'

interface CorrectionMaterial {
  id: string
  name: string
  quantity: number
  unit: string
  unitPrice: number
}

interface Corrections {
  hours?: number
  km?: number
  materials?: CorrectionMaterial[]
  reason: string
}

interface Props {
  job: DispatchJob
  lang: Language
  settlementData: any
  onSubmit: (corrections: Corrections) => Promise<void>
  onClose: () => void
}

/** Extract GPS km from settlement API response (passed as settlementData) */
function getGpsKm(data: any): number | null {
  if (data?.totalGpsKm != null && data.totalGpsKm > 0) return data.totalGpsKm
  return null
}

export default function SettlementCorrectionModal({
  job,
  lang,
  settlementData,
  onSubmit,
  onClose,
}: Props) {
  const sd = settlementData?.settlement ?? settlementData ?? {}
  const cur = sd.currency === 'CZK' ? 'Kč' : '€'
  const gpsKm = getGpsKm(settlementData)

  const [hours, setHours] = useState<number>(sd.totalHours ?? 1)
  const [km, setKm] = useState<number>(sd.totalKm ?? 0)
  const [materials, setMaterials] = useState<CorrectionMaterial[]>(
    (sd.materials ?? []).map((m: any, i: number) => ({
      id: `mat-${i}`,
      name: m.name || '',
      quantity: m.quantity || 1,
      unit: m.unit || 'ks',
      unitPrice: m.unitPrice || 0,
    }))
  )
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setValidationError(
        lang === 'sk'
          ? 'Uveďte dôvod opravy'
          : 'Uveďte důvod opravy'
      )
      return
    }
    setValidationError(null)
    setSubmitting(true)
    try {
      await onSubmit({ hours, km, materials, reason })
    } finally {
      setSubmitting(false)
    }
  }

  const adjustHours = useCallback((delta: number) => {
    setHours((h) => Math.max(0.5, Math.round((h + delta) * 2) / 2))
  }, [])

  const adjustKm = useCallback((delta: number) => {
    setKm((k) => Math.max(0, k + delta))
  }, [])

  const updateMaterial = (id: string, field: keyof CorrectionMaterial, value: any) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    )
  }

  const removeMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id))
  }

  const addMaterial = () => {
    setMaterials((prev) => [
      ...prev,
      { id: `mat-${Date.now()}`, name: '', quantity: 1, unit: 'ks', unitPrice: 0 },
    ])
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  }

  const contentStyle: React.CSSProperties = {
    background: 'var(--surface)',
    borderRadius: '16px 16px 0 0',
    padding: '20px',
    maxHeight: '85vh',
    overflow: 'auto',
    width: '100%',
    maxWidth: '500px',
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  }

  const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: '4px',
  }

  const sectionStyle: React.CSSProperties = {
    marginBottom: '16px',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
    display: 'block',
  }

  const fieldRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '10px 12px',
  }

  const valueTextStyle: React.CSSProperties = {
    flex: 1,
    textAlign: 'center',
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  }

  const adjBtnStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: 'none',
    borderRadius: '6px',
    width: '36px',
    height: '36px',
    fontSize: '20px',
    fontWeight: 700,
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    boxSizing: 'border-box',
  }

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical',
  }

  const primaryBtnStyle: React.CSSProperties = {
    background: 'var(--gold)',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 600,
    width: '100%',
    cursor: 'pointer',
    marginBottom: '10px',
  }

  const secondaryBtnStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 600,
    width: '100%',
    cursor: 'pointer',
  }

  const noticeStyle: React.CSSProperties = {
    background: 'var(--info-bg)',
    border: '1px solid var(--info-border)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '16px',
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <span style={titleStyle}>
            ✏️ {lang === 'sk' ? 'Oprava údajov' : 'Oprava údajů'}
          </span>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        <div style={noticeStyle}>
          ℹ️ {lang === 'sk'
            ? 'Upravené hodnoty sa zaznamenajú a odošlú na prepočet.'
            : 'Upravené hodnoty se zaznamenají a odešlou k přepočtu.'}
        </div>

        {/* Hours */}
        <div style={sectionStyle}>
          <label style={labelStyle}>
            {lang === 'sk' ? 'Hodiny práce' : 'Hodiny práce'}
          </label>
          <div style={fieldRowStyle}>
            <button style={adjBtnStyle} onClick={() => adjustHours(-0.5)}>−</button>
            <span style={valueTextStyle}>{hours.toFixed(1)} h</span>
            <button style={adjBtnStyle} onClick={() => adjustHours(0.5)}>+</button>
          </div>
        </div>

        {/* Km */}
        <div style={sectionStyle}>
          <label style={labelStyle}>
            {lang === 'sk' ? 'Kilometry' : 'Kilometry'}
          </label>
          <div style={fieldRowStyle}>
            <button style={adjBtnStyle} onClick={() => adjustKm(-5)}>−</button>
            <span style={valueTextStyle}>{km} km</span>
            <button style={adjBtnStyle} onClick={() => adjustKm(5)}>+</button>
          </div>
          {gpsKm !== null && (
            <div style={{
              marginTop: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              background: Math.abs(km - gpsKm) > 10
                ? 'rgba(255, 193, 7, 0.12)'
                : 'rgba(191, 149, 63, 0.06)',
              border: Math.abs(km - gpsKm) > 10
                ? '1px solid rgba(255, 193, 7, 0.3)'
                : '1px solid rgba(191, 149, 63, 0.12)',
              color: 'var(--text-secondary)',
            }}>
              📍 GPS: <strong>{gpsKm.toFixed(0)} km</strong>
              {Math.abs(km - gpsKm) > 10 && (
                <span style={{ color: 'var(--warning)', marginLeft: '8px' }}>
                  ({lang === 'sk' ? 'rozdiel' : 'rozdíl'} {Math.abs(km - gpsKm).toFixed(0)} km)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Materials */}
        <div style={sectionStyle}>
          <label style={labelStyle}>
            {lang === 'sk' ? 'Materiál' : 'Materiál'}
          </label>
          {materials.map((mat, i) => (
            <div key={mat.id} style={{
              background: 'var(--bg-card)',
              borderRadius: '8px',
              padding: '10px',
              marginBottom: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {lang === 'sk' ? `Položka ${i + 1}` : `Položka ${i + 1}`}
                </span>
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '14px' }}
                  onClick={() => removeMaterial(mat.id)}
                >
                  🗑️
                </button>
              </div>
              <input
                style={{ ...inputStyle, marginBottom: '6px' }}
                placeholder={lang === 'sk' ? 'Názov materiálu' : 'Název materiálu'}
                value={mat.name}
                onChange={(e) => updateMaterial(mat.id, 'name', e.target.value)}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ ...labelStyle, marginBottom: '2px' }}>
                    {lang === 'sk' ? 'Množstvo' : 'Množství'}
                  </label>
                  <input
                    style={inputStyle}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={mat.quantity === 0 ? '' : mat.quantity}
                    onChange={(e) => {
                      const raw = e.target.value
                      updateMaterial(mat.id, 'quantity', raw === '' ? 0 : parseFloat(raw))
                    }}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: '2px' }}>
                    {lang === 'sk' ? 'Jednotka' : 'Jednotka'}
                  </label>
                  <select
                    style={inputStyle}
                    value={mat.unit}
                    onChange={(e) => updateMaterial(mat.id, 'unit', e.target.value)}
                  >
                    {['ks', 'm', 'kg', 'bal', 'l', 'hod'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: '2px' }}>
                    {lang === 'sk' ? `Cena/${mat.unit}` : `Cena/${mat.unit}`} ({cur})
                  </label>
                  <input
                    style={inputStyle}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={mat.unitPrice === 0 ? '' : mat.unitPrice}
                    onChange={(e) => {
                      const raw = e.target.value
                      updateMaterial(mat.id, 'unitPrice', raw === '' ? 0 : parseFloat(raw))
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            style={{
              background: 'none',
              border: '1px dashed var(--border)',
              borderRadius: '8px',
              padding: '10px',
              width: '100%',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            onClick={addMaterial}
          >
            + {lang === 'sk' ? 'Pridať materiál' : 'Přidat materiál'}
          </button>
        </div>

        {/* Reason — mandatory */}
        <div style={sectionStyle}>
          <label style={labelStyle}>
            {lang === 'sk' ? 'Dôvod opravy *' : 'Důvod opravy *'}
          </label>
          <DictateTextarea
            value={reason}
            onChange={(val) => { setReason(val); setValidationError(null) }}
            lang={lang}
            formalizeContext="correction"
            placeholder={
              lang === 'sk'
                ? 'Opíšte dôvod opravy údajov...'
                : 'Popište důvod opravy údajů...'
            }
            rows={3}
            error={!!validationError}
            style={{
              width: '100%',
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '14px',
              color: 'var(--text-primary)',
              boxSizing: 'border-box',
              minHeight: '80px',
              resize: 'vertical',
            }}
          />
          {validationError && (
            <span style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px', display: 'block' }}>
              {validationError}
            </span>
          )}
        </div>

        {/* Buttons */}
        <button
          style={{ ...primaryBtnStyle, opacity: submitting ? 0.7 : 1 }}
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? '⏳' : '💾'}{' '}
          {lang === 'sk' ? 'Uložiť a prepočítať' : 'Uložit a přepočítat'}
        </button>

        <button style={secondaryBtnStyle} onClick={onClose}>
          {lang === 'sk' ? 'Zrušiť' : 'Zrušit'}
        </button>
      </div>
    </div>
  )
}
