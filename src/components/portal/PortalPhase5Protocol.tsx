'use client'

import { useState } from 'react'
import { type Job, type ProtocolResult } from '@/data/mockData'
import { useSignature } from '@/hooks/useSignature'
import { useToast } from '@/components/ui/Toast'
import { type PortalTexts } from './portalLocale'
import { PortalInlineHint } from '@/components/portal/PortalInlineHint'
import { PROTOCOL_TYPES } from '@/types/protocol'
import { getVatRate } from '@/lib/constants'

interface Phase5Props {
  job: Job
  protocolResult: ProtocolResult
  clientEmail: string
  onEmailChange: (email: string) => void
  t: PortalTexts
  /** Portal token for API calls (sign_protocol action) */
  token?: string
  /** Whether we're in real API mode (vs mock/demo) */
  isApiMode?: boolean
}

export function PortalPhase5Protocol({ job, protocolResult, clientEmail, onEmailChange, t, token, isApiMode }: Phase5Props) {
  const { showToast } = useToast()
  const { canvasRef, isEmpty, clear, getSignature } = useSignature()

  const [signerName, setSignerName] = useState(job.customer_name || '')
  const [clientNote, setClientNote] = useState('')
  const [savedSignature, setSavedSignature] = useState<string | null>(null)
  const [signed, setSigned] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailInput, setEmailInput] = useState('')

  const handleSaveSignature = () => {
    const sig = getSignature()
    if (sig) {
      setSavedSignature(sig)
    }
  }

  const handleClearSignature = () => {
    clear()
    setSavedSignature(null)
  }

  const handleSubmit = async () => {
    if (!savedSignature) {
      showToast(t.protocolSignErrorNoSig)
      return
    }
    if (!signerName.trim()) {
      showToast(t.protocolSignErrorNoName)
      return
    }

    // In API mode, call the real portal action endpoint
    if (isApiMode && token) {
      setIsSubmitting(true)
      try {
        const payload = {
          signature: savedSignature,
          signerName: signerName.trim(),
          signerEmail: clientEmail || undefined,
          clientNote: clientNote.trim() || undefined,
        }
        let res = await fetch(`/api/portal/${token}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sign_protocol', ...payload }),
        })
        let data = await res.json()
        // Auto-retry with sign_final_protocol if server says step 9+
        if (!data.success && data.error === 'use_sign_final_protocol') {
          res = await fetch(`/api/portal/${token}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sign_final_protocol', ...payload }),
          })
          data = await res.json()
        }
        if (data.success) {
          setSigned(true)
          if (navigator.vibrate) navigator.vibrate(50)
          showToast(`${t.protocolSignedTitle} ✅`)
        } else {
          showToast(data.error || t.errorSending)
        }
      } catch {
        showToast(t.errorNetwork)
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // Mock mode fallback
    setSigned(true)
    if (navigator.vibrate) navigator.vibrate(50)
    showToast(`${t.protocolSignedTitle} ✅`)
  }

  const handleEmailSave = async () => {
    if (!emailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      showToast(t.emailInvalidToast)
      return
    }
    onEmailChange(emailInput)
    // Persist email to server
    if (isApiMode && token) {
      try {
        await fetch(`/api/portal/${token}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_email', email: emailInput.trim() }),
        })
      } catch (err) {
        console.error('[PortalPhase5] email save failed', err)
      }
    }
    showToast(t.emailSavedToast)
  }

  // Success screen po podpise
  if (signed) {
    return (
      <div className="portal-card" style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h3 style={{ marginBottom: 8 }}>{t.protocolSignedTitle}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
          {clientEmail
            ? t.protocolSignedText(clientEmail)
            : t.protocolSignedNoEmail}
        </p>
        {token && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <a
              href={`/api/portal/${token}/pdf`}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-gold"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              📄 {t.downloadSignedProtocol}
            </a>
            <a
              href={`/api/portal/${token}/download-all`}
              download
              className="btn btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13 }}
            >
              📦 {t.downloadAllDocs}
            </a>
          </div>
        )}
      </div>
    )
  }

  // DPH sadzba pre materiál — klient vidí ceny s DPH
  const cf5 = (job.custom_fields || {}) as Record<string, any>
  const jobCategory5 = String(cf5.category ?? job.category ?? '')
  const propertyType5 = (cf5.property_type as 'residential' | 'commercial') || 'residential'
  const country5 = (job as any).customer_country === 'SK' ? 'SK' as const : 'CZ' as const
  const materialVatRate = getVatRate(jobCategory5, propertyType5, country5)
  const addVat = (price: number) => Math.round(price * (1 + materialVatRate))

  const clientMaterials = protocolResult.materials.filter(m => m.payer.toLowerCase() === 'klient')
  const totalMaterialClient = clientMaterials.reduce((sum, m) => sum + addVat(m.price) * m.qty, 0)

  const isMultiVisit = protocolResult.protocolType === 'multi_visit'
  const displayVisitNumber = protocolResult.visitNumber

  return (
    <div className="portal-phase">
      <h2 className="portal-phase-title">
        {t.phase5Title}
        {isMultiVisit && displayVisitNumber && (
          <span style={{ fontSize: '0.7em', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
            — {t.protocolVisitNumber} {displayVisitNumber}
          </span>
        )}
      </h2>

      {/* Email upozornenie */}
      {!clientEmail && (
        <div className="portal-email-banner">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>📧</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                {t.emailBannerTitle}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                {t.emailBannerText}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  className="field-input"
                  placeholder={t.emailPlaceholder}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{ flex: 1, fontSize: 14 }}
                />
                <button className="btn btn-gold" onClick={handleEmailSave}>
                  {t.emailBannerSave}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {clientEmail && (
        <div className="portal-card" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          <span>📧</span>
          <span>{t.emailSentTo(clientEmail)}</span>
        </div>
      )}

      {/* 1. Zákazka info */}
      <div className="portal-card">
        <h3 className="portal-protocol-heading">{t.protocolJobHeading}</h3>
        <div className="portal-info-row">
          <span className="portal-info-label">{t.protocolNumberLabel}</span>
          <span>#{job.reference_number}</span>
        </div>
        <div className="portal-info-row">
          <span className="portal-info-label">{t.protocolTypeLabel}</span>
          <span>{(() => {
            const pt = PROTOCOL_TYPES.find(p => p.id === protocolResult.protocolType)
            const isCz = t.protocolInsuranceLabel?.includes('společnost')
            return pt ? (isCz ? pt.titleCz : pt.titleSk) : protocolResult.protocolType
          })()}</span>
        </div>
        <div className="portal-info-row">
          <span className="portal-info-label">{t.protocolAddressLabel}</span>
          <span>{job.customer_address}, {job.customer_city}</span>
        </div>
        <div className="portal-info-row">
          <span className="portal-info-label">{t.protocolInsuranceLabel}</span>
          <span>{job.insurance}</span>
        </div>
      </div>

      {/* 2. Návštevy — podrobný rozpis */}
      {protocolResult.visits.length > 0 && (
        <div className="portal-card">
          <h3 className="portal-protocol-heading">{t.protocolVisitsHeading}</h3>
          {protocolResult.visits.map((v, i) => (
            <div key={i} style={{
              padding: '12px 0',
              borderBottom: i < protocolResult.visits.length - 1 ? '1px solid var(--g2)' : 'none',
            }}>
              {protocolResult.visits.length > 1 && (
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--text-secondary)' }}>
                  {t.protocolVisitNumber} {i + 1}
                </div>
              )}
              <div className="portal-info-row">
                <span className="portal-info-label">{t.protocolVisitsDate}</span>
                <span>{v.date}</span>
              </div>
              {v.arrivalTime && (
                <div className="portal-info-row">
                  <span className="portal-info-label">{t.protocolVisitsArrival}</span>
                  <span>{v.arrivalTime}</span>
                </div>
              )}
              {v.departureTime && (
                <div className="portal-info-row">
                  <span className="portal-info-label">{t.protocolVisitsDeparture}</span>
                  <span>{v.departureTime}</span>
                </div>
              )}
              <div className="portal-info-row">
                <span className="portal-info-label">{t.protocolVisitsHours}</span>
                <span>{v.hours}h</span>
              </div>
              {v.materialHours && v.materialHours > 0 && (
                <div className="portal-info-row">
                  <span className="portal-info-label">{t.protocolVisitsMaterialHours}</span>
                  <span>{v.materialHours}h</span>
                </div>
              )}
              <div className="portal-info-row">
                <span className="portal-info-label">{t.protocolVisitsKm}</span>
                <span>{v.km} km</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Popis práce */}
      <div className="portal-card">
        <h3 className="portal-protocol-heading">{t.protocolWorkHeading}</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 500 }}>
          {protocolResult.workDescription}
        </p>
      </div>

      {/* 4. Materiál */}
      {protocolResult.materials.length > 0 && (
        <div className="portal-card">
          <h3 className="portal-protocol-heading">{t.protocolMaterialHeading}</h3>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div className="portal-protocol-table">
            <div className="portal-protocol-table-head">
              <span style={{ flex: 2 }}>{t.protocolMaterialName}</span>
              <span>{t.protocolMaterialQty}</span>
              <span>{t.protocolMaterialPrice}</span>
              <span>{t.protocolMaterialPayer}</span>
            </div>
            {protocolResult.materials.map((m, i) => (
              <div key={i} className="portal-protocol-table-row">
                <span style={{ flex: 2 }}>{m.name}</span>
                <span style={{ whiteSpace: 'nowrap' }}>{m.qty} {m.unit}</span>
                <span style={{ whiteSpace: 'nowrap' }}>{t.formatPrice(addVat(m.price))}</span>
                <span style={{ fontSize: 11, whiteSpace: 'nowrap', color: m.payer.toLowerCase() !== 'klient' ? 'var(--green)' : 'var(--orange)' }}>
                  {m.payer}
                </span>
              </div>
            ))}
          </div>
          </div>
          {totalMaterialClient > 0 && (
            <div style={{ textAlign: 'right', marginTop: 8, fontSize: 14, fontWeight: 600 }}>
              {t.protocolMaterialTotal(t.formatPrice(totalMaterialClient))}
            </div>
          )}
        </div>
      )}

      {/* 6. Sumarizácia */}
      <div className="portal-card">
        <h3 className="portal-protocol-heading">{t.protocolSummaryHeading}</h3>
        <div className="portal-info-row">
          <span className="portal-info-label">{t.protocolTotalHours}</span>
          <span>{protocolResult.totalHours}h</span>
        </div>
        <div className="portal-info-row">
          <span className="portal-info-label">{t.protocolTotalKm}</span>
          <span>{protocolResult.totalKm} km</span>
        </div>
        {totalMaterialClient > 0 && (
          <div className="portal-info-row">
            <span className="portal-info-label">{t.protocolTotalMaterial}</span>
            <span>{t.formatPrice(totalMaterialClient)}</span>
          </div>
        )}
        {protocolResult.techSignerName && (
          <div className="portal-info-row">
            <span className="portal-info-label">{t.protocolTechLabel}</span>
            <span>{protocolResult.techSignerName}</span>
          </div>
        )}
      </div>

      {/* Podpis technika (ak existuje) */}
      {protocolResult.techSignature && (
        <div className="portal-card">
          <h3 className="portal-protocol-heading">{t.protocolTechSigHeading}</h3>
          <img
            src={protocolResult.techSignature}
            alt={t.protocolTechSigHeading}
            style={{ maxWidth: '100%', height: 80, objectFit: 'contain' }}
          />
          <p style={{ fontSize: 12, color: 'var(--text-muted, #78716C)', marginTop: 4 }}>
            {protocolResult.techSignerName}
          </p>
        </div>
      )}

      {/* PODPIS KLIENTA */}
      <div className="portal-card">
        <h3 className="portal-protocol-heading">{t.protocolClientSigHeading}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          {t.protocolClientSigNote}
        </p>

        {/* Poznámka klienta (nepovinné) */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">{t.protocolClientNoteLabel || 'Poznámka klienta'}</label>
          <textarea
            className="field-input"
            placeholder={t.protocolClientNotePlaceholder || 'Vaše připomínky k provedené práci (nepovinné)...'}
            value={clientNote}
            onChange={(e) => setClientNote(e.target.value)}
            rows={2}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Meno podpisujúceho */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">{t.protocolSignerNameLabel}</label>
          <input
            type="text"
            className="field-input"
            placeholder={t.protocolSignerNamePlaceholder}
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
          />
        </div>

        {/* Nápoveda k podpisu — zobrazí sa len kým klient ešte nepodpísal */}
        {!savedSignature && (
          <PortalInlineHint
            variant="info"
            text={`ℹ️ ${t.hintSignatureHelp}`}
            dismissible={false}
          />
        )}

        {/* Canvas podpisu */}
        <div className={`sig-container${savedSignature ? ' has-sig' : ''}`}>
          {savedSignature ? (
            <div style={{ position: 'relative' }}>
              <img
                src={savedSignature}
                alt={t.protocolClientSigHeading}
                style={{ width: '100%', height: 180, objectFit: 'contain', display: 'block' }}
              />
              <button
                type="button"
                onClick={handleClearSignature}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'var(--red)', color: 'white',
                  border: 'none', borderRadius: '50%',
                  width: 28, height: 28, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <div>
              <div style={{
                border: '2px dashed var(--g3)',
                borderRadius: 'var(--radius)',
                position: 'relative',
              }}>
                <canvas
                  ref={canvasRef}
                  style={{ width: '100%', height: 180, display: 'block', touchAction: 'none' }}
                />
                {isEmpty && (
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'var(--text-muted, #78716C)', fontSize: 14, pointerEvents: 'none',
                  }}>
                    {t.protocolSignPlaceholder}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
                <button type="button" className="btn btn-outline" onClick={() => clear()}>
                  {t.protocolClearBtn}
                </button>
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={handleSaveSignature}
                  disabled={isEmpty}
                >
                  {t.protocolConfirmSigBtn}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <button
        className="btn btn-green btn-full"
        onClick={handleSubmit}
        disabled={!savedSignature || !signerName.trim() || isSubmitting}
        style={{ opacity: (!savedSignature || !signerName.trim() || isSubmitting) ? 0.5 : 1 }}
      >
        {isSubmitting ? <><span className="portal-btn-spinner" />{t.submitting}</> : t.protocolSubmitBtn}
      </button>
    </div>
  )
}
