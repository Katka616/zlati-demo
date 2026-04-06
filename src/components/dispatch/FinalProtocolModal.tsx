'use client'

/**
 * FinalProtocolModal — Pre-filled final protocol ready for tech signature.
 *
 * Shows read-only summary of all visits, materials, totals.
 * Editable work description. Tech signs and sends to client for signature.
 */

import { useState } from 'react'
import type { DispatchJob } from '@/types/dispatch'
import type { Language } from '@/types/protocol'
import DictateTextarea from '@/components/ui/DictateTextarea'

interface Props {
  job: DispatchJob
  lang: Language
  onSubmit: (workDescription: string) => Promise<void>
  onClose: () => void
}

export default function FinalProtocolModal({
  job,
  lang,
  onSubmit,
  onClose,
}: Props) {
  // Priorita: settlement_data (opravené hodnoty) → protocol_history → fallback 0
  const cf = (job.customFields ?? {}) as Record<string, unknown>
  const sd = cf.settlement_data as { totalHours?: number; totalKm?: number; totalVisits?: number; clientSurcharge?: number; clientSurchargeWithVat?: number } | undefined
  const protocol = job.protocolHistory?.[job.protocolHistory.length - 1]?.protocolData

  // Prefill workDescription z existujúceho protokolu (aby technik nemusel zadávať znova)
  const existingWorkDesc = String(protocol?.workDescription || cf.work_description || '')
  const [workDescription, setWorkDescription] = useState(existingWorkDesc)
  const [submitting, setSubmitting] = useState(false)
  const [descError, setDescError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const totalHours = sd?.totalHours ?? protocol?.totalHours ?? 0
  const totalKm = sd?.totalKm ?? protocol?.totalKm ?? 0
  const totalVisits = sd?.totalVisits ?? protocol?.totalVisits ?? 1
  const surcharge = job.clientSurcharge ?? 0
  const surchargeWithVat = sd?.clientSurchargeWithVat ?? surcharge

  const handleSubmit = async () => {
    if (!workDescription.trim() || workDescription.trim().length < 10) {
      setDescError(
        lang === 'sk'
          ? 'Popis práce musí mať aspoň 10 znakov'
          : 'Popis práce musí mít alespoň 10 znaků'
      )
      return
    }
    setDescError(null)
    setSubmitError(null)
    setSubmitting(true)
    try {
      await onSubmit(workDescription.trim())
    } catch {
      console.error('[FinalProtocolModal] handleSubmit failed')
      setSubmitError(
        lang === 'sk'
          ? 'Odoslanie zlyhalo. Skontroluj pripojenie a skús znova.'
          : 'Odeslání selhalo. Zkontroluj připojení a zkus znovu.'
      )
    } finally {
      setSubmitting(false)
    }
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
    maxHeight: '85vh',
    width: '100%',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 20px 0',
    marginBottom: '20px',
    flexShrink: 0,
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

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
  }

  const readonlyCardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '12px',
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--divider)',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '4px',
    display: 'block',
  }

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    boxSizing: 'border-box',
    minHeight: '90px',
    resize: 'vertical',
  }

  const signatureBoxStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
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

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <span style={titleStyle}>
            📋 {lang === 'sk' ? 'Finálny protokol' : 'Finální protokol'}
          </span>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {/* Visits summary */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            {lang === 'sk' ? 'Súhrn výjazdov' : 'Souhrn výjezdů'}
          </div>
          <div style={readonlyCardStyle}>
            <div style={rowStyle}>
              <span>{lang === 'sk' ? 'Počet výjazdov' : 'Počet výjezdů'}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalVisits}</span>
            </div>
            <div style={rowStyle}>
              <span>{lang === 'sk' ? 'Hodiny celkom' : 'Hodiny celkem'}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalHours.toFixed(1)} h</span>
            </div>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <span>{lang === 'sk' ? 'Km celkom' : 'Km celkem'}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalKm} km</span>
            </div>
          </div>
        </div>

        {/* Materials summary */}
        {protocol?.spareParts && protocol.spareParts.length > 0 && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              {lang === 'sk' ? 'Použitý materiál' : 'Použitý materiál'}
            </div>
            <div style={readonlyCardStyle}>
              {protocol.spareParts.map((part, i) => (
                <div key={i} style={{ ...rowStyle, ...(i === protocol.spareParts.length - 1 ? { borderBottom: 'none' } : {}) }}>
                  <span>{part.name} ({part.quantity} {part.unit})</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{part.price} {lang === 'sk' ? '€' : 'Kč'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Surcharge */}
        {surcharge > 0 && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              {lang === 'sk' ? 'Doplatok klienta' : 'Doplatek klienta'}
            </div>
            <div style={{
              ...readonlyCardStyle,
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {surchargeWithVat > surcharge
                    ? (lang === 'sk' ? 'Schválený doplatok (s DPH)' : 'Schválený doplatek (s DPH)')
                    : (lang === 'sk' ? 'Schválený doplatok' : 'Schválený doplatek')}
                </span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--warning)' }}>
                  {(surchargeWithVat > surcharge ? surchargeWithVat : surcharge).toFixed(2)} {lang === 'sk' ? '€' : 'Kč'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Work description — editable */}
        <div style={sectionStyle}>
          <label style={labelStyle}>
            {lang === 'sk' ? 'Popis vykonanej práce *' : 'Popis vykonané práce *'}
          </label>
          <DictateTextarea
            value={workDescription}
            onChange={(val) => { setWorkDescription(val); setDescError(null) }}
            lang={lang}
            formalizeContext="protocol"
            placeholder={
              lang === 'sk'
                ? 'Opíšte čo bolo urobené (min. 10 znakov)...'
                : 'Popište co bylo uděláno (min. 10 znaků)...'
            }
            rows={4}
            error={!!descError}
            style={{
              width: '100%',
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '14px',
              color: 'var(--text-primary)',
              boxSizing: 'border-box',
              minHeight: '90px',
              resize: 'vertical',
            }}
          />
          {descError && (
            <span style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px', display: 'block' }}>
              {descError}
            </span>
          )}
        </div>

        {/* Inline hint — client signature instruction */}
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '0.82rem',
          lineHeight: 1.5,
          marginBottom: '16px',
          background: 'rgba(191,149,63,0.08)',
          border: '1px solid rgba(191,149,63,0.15)',
          color: 'var(--text-primary)',
        }}>
          {'💡 '}
          {lang === 'sk'
            ? 'Klient podpisuje na vašom mobile — otočte displej k nemu.'
            : 'Klient podepisuje na vašem mobilu — otočte displej k němu.'}
        </div>

        {/* Tech signature */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            {lang === 'sk' ? 'Podpis technika' : 'Podpis technika'}
          </div>
          <div style={signatureBoxStyle}>
            <span style={{ fontSize: '24px' }}>✍️</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {lang === 'sk' ? 'Podpis z profilu' : 'Podpis z profilu'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {lang === 'sk'
                  ? 'Váš podpis bude automaticky vložený z profilu'
                  : 'Váš podpis bude automaticky vložen z profilu'}
              </div>
            </div>
          </div>
        </div>

        </div>{/* end scrollable body */}

        {/* Fixed footer */}
        <div style={{ flexShrink: 0, padding: '16px 20px 20px', borderTop: '1px solid var(--border, #e5e7eb)' }}>
          {submitError && (
            <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 12, textAlign: 'center' }}>
              {submitError}
            </p>
          )}
          <button
            style={{ ...primaryBtnStyle, opacity: submitting ? 0.7 : 1 }}
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? '⏳' : '✍️'}{' '}
            {lang === 'sk' ? 'Podpísať a odoslať klientovi' : 'Podepsat a odeslat klientovi'}
          </button>
          <button style={secondaryBtnStyle} onClick={onClose}>
            {lang === 'sk' ? 'Zrušiť' : 'Zrušit'}
          </button>
        </div>
      </div>
    </div>
  )
}
