'use client'

/**
 * ExpandableJobCard — Single Smart Forward Button design.
 *
 * Collapsed: job name, insurance badge, status badge, category, distance, progress bar.
 * Expanded: customer details, scheduled date/time, ONE forward button, approved pricing.
 *
 * The technician ALWAYS sees exactly ONE button that moves them forward.
 * If waiting for CRM/client, shows a pulsing "waiting" state instead of a button.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  DispatchJob,
  JobStatusBadge,
  JOB_STATUS_BADGE_CONFIG,
  INSURANCE_COLORS,
  INSURANCE_SHORT,
  CATEGORY_ICONS,
  type TechActionType,
  type EstimateFormData,
} from '@/types/dispatch'
import { getTranslation } from '@/lib/i18n'
import { Language } from '@/types/protocol'
import { getSmartButton, getCrmStepLabel, getTechPhaseLabel } from '@/lib/smartButton'
import EstimateFormModal from './EstimateFormModal'
import DiagnosticChoiceModal from './DiagnosticChoiceModal'
import DiagnosticEndModal from './DiagnosticEndModal'
import PhotoUploadModal from './PhotoUploadModal'
import InvoiceDecisionModal from './InvoiceDecisionModal'
import InvoiceFormModal from './InvoiceFormModal'
import InvoiceUploadModal from './InvoiceUploadModal'
import SkInvoiceUploadModal from './SkInvoiceUploadModal'
import SettlementReviewModal, { type SettlementData as SettlementFormData } from './SettlementReviewModal'
import SettlementCorrectionModal from './SettlementCorrectionModal'
import SettlementResultModal from './SettlementResultModal'
import SettlementInvoiceView from './SettlementInvoiceView'
import type { InvoiceMethod, SettlementData } from '@/types/dispatch'
import JobStatusBar from './JobStatusBar'
import TechChatModal from './TechChatModal'
import DiagnosticDetails from './DiagnosticDetails'
import JobDocumentsSection from './JobDocumentsSection'
import type { DiagData } from '@/types/diagnostic'
import RescheduleModal from './RescheduleModal'
import CounterPickModal from './CounterPickModal'
import { RESCHEDULE_BLOCKED_TECH_PHASES, getCategoryLabel } from '@/lib/constants'
import type { RescheduleRequest } from '@/types/reschedule'

interface ExpandableJobCardProps {
  job: DispatchJob
  lang: Language
  statusBadge?: JobStatusBadge
  onCallCustomer?: (phone: string) => void
  onNavigate?: (address: string, city: string) => void
  onOpenProtocol?: (job: DispatchJob) => void
  onAccept?: (jobId: string) => void
  /** Callback when technician clicks the smart forward button.
   *  Receives jobId + the TechActionType to dispatch to the API. */
  onStepAction?: (jobId: string, action: TechActionType) => Promise<boolean>
  /** Callback for submit_estimate action — opens form modal, sends estimate data. */
  onSubmitEstimate?: (jobId: string, data: EstimateFormData) => Promise<boolean>
  /** Callback after invoice is created/uploaded — refresh job data. */
  onInvoiceComplete?: (jobId: string) => void
  showAcceptButton?: boolean
  isAccepting?: boolean
  defaultExpanded?: boolean
}

export default function ExpandableJobCard({
  job,
  lang,
  statusBadge,
  onCallCustomer,
  onNavigate,
  onOpenProtocol,
  onAccept,
  onStepAction,
  onSubmitEstimate,
  onInvoiceComplete,
  showAcceptButton = false,
  isAccepting = false,
  defaultExpanded = false,
}: ExpandableJobCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isActionPending, setIsActionPending] = useState(false)
  const [showEstimateModal, setShowEstimateModal] = useState(false)
  const [isSubmittingEstimate, setIsSubmittingEstimate] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [showDiagnosticChoiceModal, setShowDiagnosticChoiceModal] = useState(false)
  const [showDiagnosticEndModal, setShowDiagnosticEndModal] = useState(false)
  const [showPdfMenu, setShowPdfMenu] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceMethod, setInvoiceMethod] = useState<InvoiceMethod | null>(null)
  const [showSkInvoiceModal, setShowSkInvoiceModal] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  // G4 Settlement flow modals
  const [showSettlementReview, setShowSettlementReview] = useState(false)
  const [showSettlementCorrection, setShowSettlementCorrection] = useState(false)
  const [showSettlementResult, setShowSettlementResult] = useState(false)
  const [showSettlementInvoice, setShowSettlementInvoice] = useState(false)
  const [settlementData, setSettlementData] = useState<SettlementData | null>(null)
  const [isRevision, setIsRevision] = useState(false)
  // Settlement confirm flow (new: editable form from pending_settlement)
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false)
  // Inline card-level error message (replaces alert())
  const [cardError, setCardError] = useState<string | null>(null)

  // Reschedule flow
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showCounterPickModal, setShowCounterPickModal] = useState(false)
  const [activeReschedule, setActiveReschedule] = useState<RescheduleRequest | null>(null)

  // Work done confirmation modal
  const [showWorkDoneConfirm, setShowWorkDoneConfirm] = useState(false)

  // Customer diagnostic photos
  const [photos, setPhotos] = useState<{ id: number; filename: string | null; data: string }[]>([])
  const [photosLoaded, setPhotosLoaded] = useState(false)
  const [lightbox, setLightbox] = useState<{ id: number; filename: string | null; data: string } | null>(null)

  // Load photos once when card is first expanded (only if diagnostic data exists)
  useEffect(() => {
    if (!isExpanded || photosLoaded) return
    const diag = job.customFields?.diagnostic as { photo_count?: number } | undefined
    if (!diag?.photo_count) { setPhotosLoaded(true); return }
    fetch(`/api/dispatch/photos?jobId=${job.id}&withData=1`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.success) setPhotos(json.photos) })
      .catch(err => console.warn('[Photos] Failed to load:', err))
      .finally(() => setPhotosLoaded(true))
  }, [isExpanded, photosLoaded, job.id, job.customFields])

  // Check for active counter-proposed reschedules
  useEffect(() => {
    if (!job.id) return
    fetch(`/api/reschedule/by-job/${job.id}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.reschedules) {
          const active = data.reschedules.find((r: RescheduleRequest) => r.status === 'counter_proposed')
          setActiveReschedule(active || null)
        }
      })
      .catch(err => console.warn('[Reschedule] Failed to load:', err))
  }, [job.id])

  // Protocols that have been signed by client and have PDF ready
  const signedProtocols = useMemo(() => {
    if (!job.protocolHistory) return []
    return job.protocolHistory.filter((h) => h.pdfBase64)
  }, [job.protocolHistory])

  const t = useCallback(
    (key: string) => getTranslation(lang, key),
    [lang]
  )
  const tl = useCallback(
    (sk: string, cz: string) => lang === 'cz' ? cz : sk,
    [lang]
  )

  const handleSettlementConfirm = async (data: SettlementFormData) => {
    setIsSubmittingSettlement(true)
    try {
      const res = await fetch('/api/dispatch/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          jobId: job.id,
          action: 'approve_settlement',
          settlementData: data,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setShowSettlementModal(false)
        // Signal parent to re-fetch job data
        onStepAction?.(job.id, 'approve_settlement' as TechActionType)
      } else {
        setCardError(tl('Odoslanie vyúčtovania zlyhalo. Skúste znova.', 'Odeslání vyúčtování selhalo. Zkuste znovu.'))
      }
    } catch {
      setCardError(tl('Chyba pripojenia. Vyúčtovanie sa neodoslalo.', 'Chyba připojení. Vyúčtování se neodeslalo.'))
    } finally {
      setIsSubmittingSettlement(false)
    }
  }

  const insuranceColor =
    INSURANCE_COLORS[job.insurance] ||
    Object.entries(INSURANCE_COLORS).find(([k]) =>
      job.insurance.toLowerCase().includes(k.toLowerCase())
    )?.[1] ||
    '#666'

  const insuranceShort =
    INSURANCE_SHORT[job.insurance] ||
    Object.entries(INSURANCE_SHORT).find(([k]) =>
      job.insurance.toLowerCase().includes(k.toLowerCase())
    )?.[1] ||
    job.insurance

  const categoryIcon =
    CATEGORY_ICONS[job.category] ||
    Object.entries(CATEGORY_ICONS).find(([k]) =>
      job.category.toLowerCase().includes(k.toLowerCase())
    )?.[1] ||
    '🔧'

  const crmStep = job.crmStep ?? 0
  const progressPercent = job.progressPercent ?? Math.round((crmStep / 12) * 100)
  const crmLabel = getCrmStepLabel(crmStep, lang)
  const phaseLabel = getTechPhaseLabel(job.techPhase, lang)
  const cfAny = (job as any).customFields
  const smartButton = getSmartButton(crmStep, job.techPhase, lang, {
    hasPhotos: (job.photos?.length ?? 0) > 0,
    photoCount: job.photos?.length ?? 0,
    country: job.country,
    hasInvoice: !!(cfAny?.invoice_uploaded_at || cfAny?.invoice_file_id || cfAny?.invoice_data),
    invoicePaid: cfAny?.payment_status === 'paid' || (cfAny?.invoice_data as any)?.invoice_status === 'paid',
    paymentHold: !!(cfAny?.tech_payment_hold),
    paymentHoldReason: (cfAny?.tech_payment_hold as any)?.reason,
    visitNumber: Number(cfAny?.current_visit_number) || undefined,
  })

  const badgeConfig = statusBadge ? JOB_STATUS_BADGE_CONFIG[statusBadge] : null

  // Can the technician interrupt/pause work? Available any time during active job (step 2-8)
  const canInterrupt = crmStep >= 2 && crmStep <= 8

  // Show "Práca hotová" when waiting for the next visit to begin
  const canFinishAllVisits = (job as any).techPhase === 'awaiting_next_visit' || (job as any).tech_phase === 'awaiting_next_visit'

  // Detect multi-visit context — used by work_done confirmation modal
  const isMultiVisitJob = !!(
    (job.customFields as any)?.estimate_needs_next_visit === true
    || (Number((job.customFields as any)?.current_visit_number) || 0) >= 1
    || (Array.isArray((job.customFields as any)?.protocol_history) && (job.customFields as any).protocol_history.length > 0)
  )

  return (
    <>
      {/* Lightbox for customer diagnostic photos */}
      {lightbox && (
        <div className="mkp-lightbox" onClick={() => setLightbox(null)}>
          <div className="mkp-lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="mkp-lightbox-close" aria-label="Zavrieť" onClick={() => setLightbox(null)}>✕</button>
            <img src={lightbox.data} alt={lightbox.filename || 'foto'} className="mkp-lightbox-img" />
            {lightbox.filename && <p className="mkp-lightbox-caption">{lightbox.filename}</p>}
          </div>
        </div>
      )}
      {/* ── Work done confirmation modal ── */}
      {showWorkDoneConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }} onClick={() => setShowWorkDoneConfirm(false)}>
          <div style={{
            background: 'var(--bg-modal, #fff)', borderRadius: 16,
            padding: '24px 20px', maxWidth: 360, width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            border: '1px solid var(--border, rgba(0,0,0,0.08))',
          }} onClick={e => e.stopPropagation()}>
            {isMultiVisitJob ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', marginBottom: 8, textAlign: 'center' }}>
                  {tl('Je práca naozaj dokončená?', 'Je práce skutečně hotová?')}
                </div>
                <div style={{ fontSize: 14, color: 'var(--g3)', marginBottom: 20, textAlign: 'center', lineHeight: 1.5 }}>
                  {tl('V odhade ste uviedli, že bude potrebných viac výjazdov.', 'V odhadu jste uvedli, že bude potřeba více výjezdů.')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    style={{
                      background: 'var(--gold)', color: '#fff', border: 'none',
                      borderRadius: 10, padding: '13px 16px', fontSize: 15, fontWeight: 700,
                      cursor: 'pointer', width: '100%',
                    }}
                    disabled={isActionPending}
                    onClick={() => {
                      setShowWorkDoneConfirm(false)
                      if (onStepAction) {
                        setIsActionPending(true)
                        onStepAction(job.id, 'work_done' as TechActionType).finally(() => setIsActionPending(false))
                      }
                    }}
                  >
                    {tl('Áno, všetko je hotové', 'Ano, vše je hotovo')}
                  </button>
                  <button
                    style={{
                      background: 'none', border: '1px solid var(--border, #e5e7eb)',
                      borderRadius: 10, padding: '13px 16px', fontSize: 14, fontWeight: 600,
                      cursor: 'pointer', width: '100%', color: 'var(--dark)',
                    }}
                    disabled={isActionPending}
                    onClick={() => {
                      setShowWorkDoneConfirm(false)
                      if (onOpenProtocol) {
                        onOpenProtocol(job)
                      } else {
                        window.location.href = `/dispatch/protocol/${job.id}?type=multi_visit&from=${encodeURIComponent(`/dispatch/job/${job.id}`)}`
                      }
                    }}
                  >
                    {tl('Nie, vrátim sa — vyplniť protokol', 'Ne, vrátím se — vyplnit protokol')}
                  </button>
                  <button
                    style={{
                      background: 'none', border: 'none', color: 'var(--g4)',
                      fontSize: 13, cursor: 'pointer', padding: 8,
                    }}
                    onClick={() => setShowWorkDoneConfirm(false)}
                  >
                    {tl('Zrušiť', 'Zrušit')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', marginBottom: 20, textAlign: 'center' }}>
                  {tl('Potvrďte dokončenie práce', 'Potvrďte dokončení práce')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    style={{
                      background: 'var(--gold)', color: '#fff', border: 'none',
                      borderRadius: 10, padding: '13px 16px', fontSize: 15, fontWeight: 700,
                      cursor: 'pointer', width: '100%',
                    }}
                    disabled={isActionPending}
                    onClick={() => {
                      setShowWorkDoneConfirm(false)
                      if (onStepAction) {
                        setIsActionPending(true)
                        onStepAction(job.id, 'work_done' as TechActionType).finally(() => setIsActionPending(false))
                      }
                    }}
                  >
                    {tl('Áno, práca je hotová', 'Ano, práce je hotová')}
                  </button>
                  <button
                    style={{
                      background: 'none', border: 'none', color: 'var(--g4)',
                      fontSize: 13, cursor: 'pointer', padding: 8,
                    }}
                    onClick={() => setShowWorkDoneConfirm(false)}
                  >
                    {tl('Zrušiť', 'Zrušit')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    <div className={`expandable-job-card ${isExpanded ? 'expanded' : ''}`} style={{ borderLeft: badgeConfig ? `4px solid ${badgeConfig.bg}` : undefined }}>
      {/* Inline error banner */}
      {cardError && (
        <div style={{ background: 'var(--danger, #dc2626)', color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: '8px 8px 0 0' }}>
          <span>⚠️ {cardError}</span>
          <button aria-label="Zavrieť" onClick={() => setCardError(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
      )}
      {/* Collapsed header — always visible */}
      <div
        className="ejc-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Scheduled date — prominent gold bar */}
        <div className="ejc-date-bar">
          {job.scheduledDate ? (
            <span className="ejc-date-text">
              {new Date(job.scheduledDate).toLocaleDateString(lang === 'cz' ? 'cs-CZ' : 'sk-SK', { weekday: 'long', day: 'numeric', month: 'long' })}
              {job.scheduledTime && <span className="ejc-time-text"> · {job.scheduledTime}</span>}
            </span>
          ) : (
            <span className="ejc-date-missing">
              {t('dispatch.scheduleUndefined')}
            </span>
          )}
          <span className="ejc-chevron">{isExpanded ? '▲' : '▼'}</span>
        </div>

        {/* Customer name */}
        <div className="ejc-customer-name">{job.customerName}</div>

        {/* Status icon + label */}
        {badgeConfig && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span style={{ fontSize: '14px' }}>{badgeConfig.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: badgeConfig.bg, textTransform: 'uppercase' as const }}>
              {lang === 'cz' ? badgeConfig.labelCz : badgeConfig.label}
            </span>
          </div>
        )}
        {/* Problem description */}
        <div className="ejc-problem-text" style={{ marginBottom: '8px' }}>
          {categoryIcon} {(job.subject || job.name).length > 80
            ? (job.subject || job.name).substring(0, 80) + '…'
            : (job.subject || job.name)}
        </div>

        {/* Address with inline navigate */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }} onClick={(e) => e.stopPropagation()}>
          <span className="ejc-address-text">{job.customerAddress}, {job.customerCity}</span>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
              [job.customerAddress, job.customerCity].filter(Boolean).join(', ')
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '11px', color: 'var(--gold-dark, #aa771c)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: '8px' }}
          >
            📍 {t('dispatch.navigate')}
          </a>
        </div>
        {/* Phone with inline chat */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }} onClick={(e) => e.stopPropagation()}>
          <a href={`tel:${job.customerPhone}`} style={{ fontSize: '12px', color: 'var(--gold-dark, #aa771c)', textDecoration: 'none', fontWeight: 500 }}>
            📞 {job.customerPhone}
          </a>
          <button
            onClick={() => setShowChatModal(true)}
            style={{ fontSize: '11px', color: 'var(--gold-dark, #aa771c)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            💬 {t('dispatch.quickChat')}
          </button>
        </div>
        {/* Reference number */}
        <div className="ejc-ref-line">{job.referenceNumber}</div>

      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="ejc-body">
          {/* Status Bar */}
          <JobStatusBar job={job} lang={lang === 'cz' ? 'cz' : 'sk'} />

          {/* Diagnostic Details — only show when extra data exists beyond collapsed summary */}
          {(() => {
            const diag = job.customFields?.diagnostic as DiagData | undefined
            if (!diag) return null
            return (
              <div className="ejc-section">
                <div className="ejc-section-title">
                  {t('dispatch.diagnosticLabel')}
                </div>
                <DiagnosticDetails diag={diag} expanded />
              </div>
            )
          })()}

          {/* EA coverage warnings */}
          {(() => {
            const eaW = job.customFields?.ea_coverage_warnings as string[] | undefined
            if (!eaW?.length) return null
            return (
              <div className="ajf-coverage-warning">
                <div className="warning-title">
                  ⚠️ Upozornění k pojistnému krytí
                </div>
                {eaW.map((w: string, i: number) => (
                  <div key={i} className="warning-item">
                    • {w}
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Customer photos from diagnostic form */}
          {(() => {
            const diag = job.customFields?.diagnostic as { photo_count?: number } | undefined
            if (!diag?.photo_count) return null
            return (
              <div className="ejc-section">
                <div className="ejc-section-title">{t('dispatch.customerPhotos')}</div>
                {!photosLoaded && (
                  <div className="mkp-photos-loading">
                    <span className="spinner-sm" /> {t('dispatch.loadingPhotos')}
                  </div>
                )}
                {photosLoaded && photos.length > 0 && (
                  <div className="mkp-photo-grid">
                    {photos.map(p => (
                      <button
                        key={p.id}
                        className="mkp-photo-thumb"
                        onClick={() => setLightbox(p)}
                        aria-label={p.filename || 'foto'}
                      >
                        <img src={p.data} alt={p.filename || 'foto'} />
                      </button>
                    ))}
                  </div>
                )}
                {photosLoaded && photos.length === 0 && (
                  <p className="mkp-photos-none">{`${diag.photo_count} ${t('dispatch.photosLoadError')}`}</p>
                )}
              </div>
            )
          })()}

          {/* Job Documents — unified list of all attachments */}
          <JobDocumentsSection jobId={job.id} lang={lang} isVisible={isExpanded} />

          {/* Action Needed */}
          {job.actionNeeded && (
            <div className="ejc-section">
              <div className="ejc-section-title">
                {t('dispatch.actionNeeded')}
              </div>
              <div className="ejc-action-needed">{job.actionNeeded}</div>
            </div>
          )}

          {/* Surcharge Approved Info Box */}
          {job.techPhase === 'client_approved' && job.clientSurcharge != null && (
            <div className="ejc-section">
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                color: 'var(--green)',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                lineHeight: 1.4
              }}>
                <span style={{ fontSize: '18px' }}>✅</span>
                <span>
                  <strong>{t('dispatch.surchargeApprovedByClient')}</strong><br />
                  {job.customFields?.is_diagnostics || job.customFields?.diagnostic_only
                    ? t('dispatch.surchargeApprovedMsgDiagnostic')
                    : t('dispatch.surchargeApprovedMsg')}
                </span>
              </div>
            </div>
          )}

          {/* Smart Forward Button — single action per state */}
          <div className="ejc-section">
            <div className="ejc-section-title">
              {crmLabel}
              {phaseLabel && (
                <span className="ejc-phase-label"> — {phaseLabel}</span>
              )}
            </div>

            {smartButton.variant === 'waiting' ? (
              <div className="smart-waiting-state">
                <div className="smart-waiting-pulse" />
                <span className="smart-waiting-label">{smartButton.label}</span>
                {smartButton.waitingMessage && (
                  <span className="smart-waiting-msg">{smartButton.waitingMessage}</span>
                )}
              </div>
            ) : smartButton.variant === 'disabled' ? (
              <div className="smart-done-state">
                {smartButton.icon && <span>{smartButton.icon}</span>}
                <span>{smartButton.label}</span>
              </div>
            ) : (
              <button
                className={`smart-btn smart-btn--${smartButton.variant}`}
                disabled={isActionPending}
                onClick={async (e) => {
                  e.stopPropagation()
                  if (isActionPending) return
                  // Opens job in new window (for "start work" actions)
                  if (smartButton.opensNewWindow) {
                    window.open(`/dispatch/protocol/${job.id}?from=${encodeURIComponent(`/dispatch/job/${job.id}`)}`, '_blank')
                    // Also dispatch the status action
                    if (onStepAction) {
                      setIsActionPending(true)
                      try {
                        await onStepAction(job.id, smartButton.action)
                      } finally {
                        setIsActionPending(false)
                      }
                    }
                    return
                  }
                  // Intercept issue_invoice → SK: upload own; CZ: decision modal
                  if (smartButton.opensForm === 'invoice') {
                    if (lang === 'sk') { setShowSkInvoiceModal(true) } else { setShowInvoiceModal(true) }
                    return
                  }
                  // G4 Settlement flow intercepts
                  if (smartButton.opensForm === 'settlement_review') {
                    setShowSettlementReview(true)
                    return
                  }
                  if (smartButton.opensForm === 'settlement_correction') {
                    try {
                      const res = await fetch(`/api/dispatch/settlement/${job.id}`, { credentials: 'include' })
                      if (res.ok) { const d = await res.json(); setSettlementData(d) }
                    } catch { /* ignore */ }
                    setShowSettlementCorrection(true)
                    return
                  }
                  if (smartButton.opensForm === 'price_review') {
                    setShowSettlementResult(true)
                    return
                  }
                  if (smartButton.opensForm === 'settlement_invoice') {
                    setShowSettlementInvoice(true)
                    return
                  }
                  // Intercept submit_estimate → open choice or form modal
                  if (smartButton.opensForm === 'diagnostic_choice') {
                    setShowDiagnosticChoiceModal(true)
                    return
                  }
                  if (smartButton.opensForm === 'estimate' && onSubmitEstimate) {
                    setShowEstimateModal(true)
                    return
                  }
                  // Intercept open_photos → open photo upload modal
                  if (smartButton.opensForm === 'photos') {
                    setShowPhotoModal(true)
                    return
                  }
                  // Intercept submit_protocol → navigate to protocol page
                  if (smartButton.opensForm === 'protocol' && onOpenProtocol) {
                    onOpenProtocol(job)
                    return
                  }
                  if (onStepAction) {
                    setIsActionPending(true)
                    try {
                      await onStepAction(job.id, smartButton.action)
                    } catch (err) {
                      console.error('[SmartBtn]', err)
                      setCardError(tl('Nepodarilo sa vykonať akciu. Skúste znova.', 'Nepodařilo se provést akci. Zkuste znovu.'))
                    } finally {
                      setIsActionPending(false)
                    }
                  } else {
                    console.warn('[SmartBtn] No onStepAction handler')
                  }
                }}
              >
                {isActionPending ? (
                  <span className="smart-btn-loading">⏳</span>
                ) : (
                  <>
                    {smartButton.icon && <span className="smart-btn-icon">{smartButton.icon}</span>}
                    <span>{smartButton.label}</span>
                  </>
                )}
              </button>
            )}

            {/* Secondary: Upraviť odhad ceny — after diagnostic (step >= 3) until price finalized (step <= 6), when estimate exists */}
            {crmStep >= 3 && crmStep <= 6 && job.estimateData != null ? (
              <button
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  padding: '8px',
                  marginTop: '8px',
                  background: 'none',
                  border: '1px dashed var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsRevision(true)
                  setShowEstimateModal(true)
                }}
              >
                ✏️ {t('dispatch.btn.revise_estimate')}
              </button>
            ) : null}

            {/* Secondary: Skontrolovať zúčtovanie — step 7, not yet confirmed */}
            {crmStep === 7 && !!job.customFields?.pending_settlement &&
              !job.customFields?.settlement_confirmed_at &&
              !(job.techPhase?.includes('confirmed')) ? (
              <button
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  padding: '10px',
                  marginTop: '8px',
                  background: 'none',
                  border: '1px solid var(--gold, #C9A84C)',
                  borderRadius: '8px',
                  color: 'var(--dark, #1a1a1a)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSettlementModal(true)
                }}
              >
                📋 {t('dispatch.btn.review_settlement')}
              </button>
            ) : null}

            {/* Secondary: Práca hotová — after multi-visit protocol sent, all work done */}
            {canFinishAllVisits ? (
              <button
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  padding: '10px',
                  marginTop: '8px',
                  background: 'none',
                  border: '1px solid var(--success, #22C55E)',
                  borderRadius: '8px',
                  color: 'var(--dark, #1a1a1a)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                disabled={isActionPending}
                onClick={(e) => {
                  e.stopPropagation()
                  setShowWorkDoneConfirm(true)
                }}
              >
                ✅ {t('dispatch.btn.finish_all_visits')}
              </button>
            ) : null}
          </div>

          {/* Approved Pricing — visible when CRM approved the estimate */}
          {job.approvedTotal != null && (
            <div className="ejc-section ejc-pricing-section">
              <div className="ejc-section-title">
                💰 {t('dispatch.invoicing')}
              </div>

              <div className="ejc-pricing-rows">
                {job.approvedWorkPrice != null && (
                  <div className="ejc-pricing-row">
                    <span className="ejc-pricing-label">{t('dispatch.approvedWork')}</span>
                    <span className="ejc-pricing-value">{job.approvedWorkPrice.toFixed(2)} Kč</span>
                  </div>
                )}
                {job.approvedMaterialPrice != null && job.approvedMaterialPrice > 0 && (
                  <div className="ejc-pricing-row">
                    <span className="ejc-pricing-label">{t('dispatch.approvedMaterial')}</span>
                    <span className="ejc-pricing-value">{job.approvedMaterialPrice.toFixed(2)} Kč</span>
                  </div>
                )}
                {job.approvedTravelPrice != null && job.approvedTravelPrice > 0 && (
                  <div className="ejc-pricing-row">
                    <span className="ejc-pricing-label">{t('dispatch.approvedTravel')}</span>
                    <span className="ejc-pricing-value">{job.approvedTravelPrice.toFixed(2)} Kč</span>
                  </div>
                )}
                {job.clientSurcharge != null && job.clientSurcharge > 0 && (
                  <div className="ejc-pricing-row">
                    <span className="ejc-pricing-label">{t('dispatch.clientSurcharge')}</span>
                    <span className="ejc-pricing-value">{job.clientSurcharge.toFixed(2)} Kč</span>
                  </div>
                )}
              </div>

              <div className="ejc-pricing-total">
                <span className="ejc-pricing-total-label">{t('dispatch.invoiceTotal')}</span>
                <span className="ejc-pricing-total-value">{job.approvedTotal.toFixed(2)} Kč</span>
              </div>
            </div>
          )}

          {/* Quick Action Grid */}
          <div className="ejc-quick-actions">
            {/* Photos */}
            <button
              className="ejc-quick-action ejc-qa-photos"
              onClick={(e) => { e.stopPropagation(); setShowPhotoModal(true) }}
            >
              <span className="ejc-qa-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span>
              <span className="ejc-qa-label">{t('dispatch.photoUpload.addPhoto')}</span>
            </button>

            {/* Protocol */}
            {onOpenProtocol && (
              <button
                className="ejc-quick-action ejc-qa-protocol"
                onClick={(e) => { e.stopPropagation(); onOpenProtocol(job) }}
              >
                <span className="ejc-qa-icon">📝</span>
                <span className="ejc-qa-label">{t('dispatch.openProtocol')}</span>
              </button>
            )}

            {/* Interrupt Work */}
            {canInterrupt && (
              <button
                className="ejc-quick-action ejc-qa-interrupt"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/dispatch/protocol/${job.id}?type=multi_visit&from=${encodeURIComponent(`/dispatch/job/${job.id}`)}`, '_blank');
                }}
              >
                <span className="ejc-qa-icon">⏸️</span>
                <span className="ejc-qa-label">{t('dispatch.btn.interrupt_work')}</span>
              </button>
            )}

            {/* Reschedule — show only when job has a scheduled date and tech is not in a blocked phase */}
            {job.scheduledDate && !RESCHEDULE_BLOCKED_TECH_PHASES.includes(job.techPhase as typeof RESCHEDULE_BLOCKED_TECH_PHASES[number]) && (
              activeReschedule?.status === 'counter_proposed' ? (
                <button
                  className="ejc-quick-action"
                  style={{ gridColumn: '1 / -1', borderColor: 'var(--gold, #daa520)' }}
                  onClick={(e) => { e.stopPropagation(); setShowCounterPickModal(true) }}
                >
                  <span className="ejc-qa-icon">📅</span>
                  <span className="ejc-qa-label">{t('dispatch.selectClientDate')}</span>
                </button>
              ) : !activeReschedule ? (
                <button
                  className="ejc-quick-action"
                  onClick={(e) => { e.stopPropagation(); setShowRescheduleModal(true) }}
                >
                  <span className="ejc-qa-icon">🔄</span>
                  <span className="ejc-qa-label">{t('dispatch.rescheduleDate')}</span>
                </button>
              ) : null
            )}

            {/* Accept — marketplace */}
            {showAcceptButton && onAccept && (
              <button
                className="ejc-quick-action ejc-qa-accept"
                onClick={(e) => { e.stopPropagation(); onAccept(job.id) }}
                disabled={isAccepting}
                style={{ gridColumn: '1 / -1' }}
              >
                <span className="ejc-qa-icon">{isAccepting ? '⏳' : '✅'}</span>
                <span className="ejc-qa-label">{isAccepting ? '...' : t('dispatch.accept')}</span>
              </button>
            )}

            {/* PDF Download — show when signed protocols with PDF exist */}
            {signedProtocols.length === 1 && (
              <a
                className="ejc-action-btn download"
                href={`/api/dispatch/protocol/pdf/${job.id}?visit=${signedProtocols[0].visitNumber}`}
                download
                onClick={(e) => e.stopPropagation()}
              >
                📄 {t('dispatch.downloadProtocol')}
              </a>
            )}
            {signedProtocols.length > 1 && (
              <div className="ejc-pdf-dropdown" onClick={(e) => e.stopPropagation()}>
                <button
                  className="ejc-action-btn download"
                  onClick={() => setShowPdfMenu(!showPdfMenu)}
                >
                  📄 {t('dispatch.downloadProtocol')} ▾
                </button>
                {showPdfMenu && (
                  <div className="ejc-pdf-menu">
                    {signedProtocols.map((p) => (
                      <a
                        key={p.visitNumber}
                        className="ejc-pdf-menu-item"
                        href={`/api/dispatch/protocol/pdf/${job.id}?visit=${p.visitNumber}`}
                        download
                      >
                        {t('dispatch.protocolVisit')} {p.visitNumber}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          <a
            href={`/dispatch/job/${job.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '10px 0 4px',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--gold-dark, #aa771c)',
              textDecoration: 'none',
              borderTop: '1px solid var(--border, rgba(0,0,0,0.06))',
              marginTop: 8,
            }}
          >
            {lang === 'cz' ? 'Otevřít plný detail →' : 'Otvoriť plný detail →'}
          </a>
          </div>
        </div>
      )}

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <PhotoUploadModal
          job={job}
          lang={lang}
          onClose={() => setShowPhotoModal(false)}
          onPhotosComplete={async () => {
            setShowPhotoModal(false)
            if (onStepAction && (job.crmStep ?? 99) <= 3 && job.techPhase === 'arrived') {
              // Diagnostic photos at step ≤3: submit diagnostic
              setIsActionPending(true)
              try {
                await onStepAction(job.id, 'submit_diagnostic')
              } finally {
                setIsActionPending(false)
              }
            }
            // Otherwise: standalone photo upload — no action, just close modal
          }}
        />
      )}

      {/* SK technician — upload own invoice directly */}
      {showSkInvoiceModal && (
        <SkInvoiceUploadModal
          lang={lang}
          jobId={job.id}
          onSuccess={() => {
            setShowSkInvoiceModal(false)
            onInvoiceComplete?.(job.id)
            onStepAction?.(job.id, 'issue_invoice' as TechActionType)
          }}
          onCancel={() => setShowSkInvoiceModal(false)}
        />
      )}

      {/* Invoice Decision Modal — CZ technician chooses system vs self-issued */}
      {showInvoiceModal && !invoiceMethod && (
        <InvoiceDecisionModal
          lang={lang}
          onSelect={(method) => setInvoiceMethod(method)}
          onCancel={() => setShowInvoiceModal(false)}
        />
      )}

      {/* Invoice Form Modal — Cesta A: system generates invoice */}
      {invoiceMethod === 'system_generated' && (
        <InvoiceFormModal
          lang={lang}
          jobId={job.id}
          onSuccess={() => {
            setInvoiceMethod(null)
            setShowInvoiceModal(false)
            onInvoiceComplete?.(job.id)
            onStepAction?.(job.id, 'issue_invoice' as TechActionType)
          }}
          onCancel={() => {
            setInvoiceMethod(null)
            setShowInvoiceModal(false)
          }}
        />
      )}

      {/* Invoice Upload Modal — Cesta B: CZ technician uploads own invoice */}
      {invoiceMethod === 'self_issued' && (
        <InvoiceUploadModal
          lang={lang}
          jobId={job.id}
          onSuccess={() => {
            setInvoiceMethod(null)
            setShowInvoiceModal(false)
            onInvoiceComplete?.(job.id)
            onStepAction?.(job.id, 'issue_invoice' as TechActionType)
          }}
          onCancel={() => {
            setInvoiceMethod(null)
            setShowInvoiceModal(false)
          }}
        />
      )}

      {/* Diagnostic Choice Modal (Estimate vs End Diagnostic) */}
      {showDiagnosticChoiceModal && (
        <DiagnosticChoiceModal
          lang={lang}
          onChooseEstimate={() => {
            setShowDiagnosticChoiceModal(false)
            setShowEstimateModal(true)
          }}
          onChooseDiagnosticEnd={() => {
            setShowDiagnosticChoiceModal(false)
            setShowDiagnosticEndModal(true)
          }}
          onCancel={() => setShowDiagnosticChoiceModal(false)}
        />
      )}

      {/* Diagnostic End Modal — selected from choice modal */}
      {showDiagnosticEndModal && (
        <DiagnosticEndModal
          job={job}
          lang={lang}
          isSubmitting={isSubmittingEstimate}
          onSubmit={async (data) => {
            if (!onSubmitEstimate) return
            setIsSubmittingEstimate(true)
            try {
              // Same API as estimate, but with diagnosticOnly flag
              const ok = await onSubmitEstimate(job.id, data)
              if (ok) setShowDiagnosticEndModal(false)
            } finally {
              setIsSubmittingEstimate(false)
            }
          }}
          onCancel={() => setShowDiagnosticEndModal(false)}
        />
      )}

      {/* Estimate Form Modal — opened when technician clicks submit_estimate step */}
      {showEstimateModal && (
        <EstimateFormModal
          job={job}
          lang={lang}
          isSubmitting={isSubmittingEstimate}
          onSubmit={async (data) => {
            if (isRevision) {
              // Revision during work → use revise_estimate action (stays at step 6)
              setIsSubmittingEstimate(true)
              try {
                const res = await fetch('/api/dispatch/status', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ jobId: job.id, action: 'revise_estimate', estimateData: data }),
                  credentials: 'include',
                })
                const result = await res.json()
                if (result.success) {
                  setShowEstimateModal(false)
                  setIsRevision(false)
                }
              } finally {
                setIsSubmittingEstimate(false)
              }
            } else {
              // Normal estimate after diagnostics
              if (!onSubmitEstimate) return
              setIsSubmittingEstimate(true)
              try {
                const ok = await onSubmitEstimate(job.id, data)
                if (ok) setShowEstimateModal(false)
              } finally {
                setIsSubmittingEstimate(false)
              }
            }
          }}
          onCancel={() => { setShowEstimateModal(false); setIsRevision(false) }}
        />
      )}

      {/* Tech Chat Modal */}
      {showChatModal && (
        <TechChatModal
          job={job}
          jobId={(job as any).id}
          lang={lang}
          onClose={() => setShowChatModal(false)}
        />
      )}

      {/* G4: Settlement Review Modal — editable form from pending_settlement */}
      {(showSettlementReview || showSettlementModal) && (
        <SettlementReviewModal
          job={job}
          lang={lang}
          isSubmitting={isSubmittingSettlement || isActionPending}
          onConfirm={async (data) => {
            await handleSettlementConfirm(data)
            setShowSettlementReview(false)
            setShowSettlementModal(false)
          }}
          onCancel={() => {
            setShowSettlementReview(false)
            setShowSettlementModal(false)
          }}
        />
      )}

      {/* G4: Settlement Correction Modal */}
      {showSettlementCorrection && (
        <SettlementCorrectionModal
          job={job}
          lang={lang}
          settlementData={settlementData}
          onSubmit={async (corrections) => {
            try {
              const res = await fetch(`/api/dispatch/settlement/${job.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'correct', corrections }),
              })
              if (!res.ok) {
                setCardError(tl('Chyba pri odoslaní opravy. Skúste to znova.', 'Chyba při odeslání opravy. Zkuste to znovu.'))
                return
              }
            } catch {
              setCardError(tl('Chyba pripojenia. Skúste to znova.', 'Chyba připojení. Zkuste to znovu.'))
              return
            }
            setShowSettlementCorrection(false)
          }}
          onClose={() => setShowSettlementCorrection(false)}
        />
      )}

      {/* G4: Settlement Result Modal (price review) */}
      {showSettlementResult && (
        <SettlementResultModal
          job={job}
          lang={lang}
          settlementData={settlementData}
          onApprovePrice={async () => {
            if (onStepAction) {
              setIsActionPending(true)
              try {
                await onStepAction(job.id, 'approve_price' as TechActionType)
              } finally {
                setIsActionPending(false)
              }
            }
            setShowSettlementResult(false)
          }}
          onDispute={async (reason: string) => {
            setIsActionPending(true)
            try {
              const res = await fetch('/api/dispatch/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: job.id, action: 'dispute_settlement', disputeReason: reason }),
              })
              if (!res.ok) throw new Error('dispute failed')
              onInvoiceComplete?.(job.id) // triggers job refresh
            } finally {
              setIsActionPending(false)
            }
            setShowSettlementResult(false)
          }}
          onClose={() => setShowSettlementResult(false)}
        />
      )}

      {/* G4: Settlement Invoice View */}
      {showSettlementInvoice && (
        <SettlementInvoiceView
          job={job}
          lang={lang}
          onIssueInvoice={() => {
            setShowSettlementInvoice(false)
            setShowInvoiceModal(true)
          }}
          onSkUpload={() => {
            setShowSettlementInvoice(false)
            setShowSkInvoiceModal(true)
          }}
          onClose={() => setShowSettlementInvoice(false)}
        />
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <RescheduleModal
          job={job}
          lang={lang}
          onClose={() => setShowRescheduleModal(false)}
          onSuccess={() => { setShowRescheduleModal(false) }}
        />
      )}

      {/* Counter Pick Modal */}
      {showCounterPickModal && activeReschedule && (
        <CounterPickModal
          reschedule={activeReschedule}
          onClose={() => setShowCounterPickModal(false)}
          onSuccess={() => { setShowCounterPickModal(false); setActiveReschedule(null) }}
        />
      )}
    </div>
    </>
  )
}
