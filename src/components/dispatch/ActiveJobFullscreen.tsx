'use client'

/**
 * ActiveJobFullscreen — Fullscreen active job view.
 *
 * Replaces the home page when a technician has an active job.
 * Two-zone layout: fixed hero (top) + scrollable detail (below).
 *
 * All modals replicated from ExpandableJobCard so the fullscreen view
 * supports the exact same interactions (estimate, diagnostic, settlement,
 * invoice, chat, protocol, photos).
 */

import React, { useState, useCallback, useMemo, useEffect, useRef, Fragment } from 'react'
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
import { useLocationTracking } from '@/hooks/useLocationTracking'
import { getTranslation } from '@/lib/i18n'
import { Language } from '@/types/protocol'
import { getSmartButton, getCrmStepLabel, getTechPhaseLabel } from '@/lib/smartButton'
import { getCategoryLabel } from '@/lib/constants'
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
import CollapsibleSection from './CollapsibleSection'
import TechChatModal from './TechChatModal'
import DiagnosticDetails from './DiagnosticDetails'
import DiagnosticBrainCard from './DiagnosticBrainCard'
import JobDocumentsSection from './JobDocumentsSection'
import type { DiagData } from '@/types/diagnostic'
import { apiFetch, ApiError } from '@/lib/apiFetch'
import type { DiagResult } from '@/types/diagnosticBrain'
import RescheduleModal from './RescheduleModal'
import MaterialChecklistModal from './MaterialChecklistModal'
import DispatchToast from './DispatchToast'
// EditJobInfoModal removed — technicians cannot edit job data

// ─── Visit reason labels (human-readable) ────────────────────────────────
const VISIT_REASON_LABELS: Record<string, { sk: string; cz: string }> = {
  material_order: { sk: 'Objednávka materiálu', cz: 'Objednávka materiálu' },
  complex_repair: { sk: 'Komplikovaná oprava', cz: 'Složitá oprava' },
  material_purchase: { sk: 'Nákup materiálu', cz: 'Nákup materiálu' },
}

// ─── Timeline helpers ──────────────────────────────────────────────────────

function formatTimeShort(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

type TLStep = { label: string; time: string | null; status: 'done' | 'active' | 'pending' }

function buildTimelineSteps(
  job: DispatchJob,
  crmStep: number,
  lang: Language,
  arrivedAt: string | undefined,
  formatElapsed: (iso: string) => string,
): TLStep[] {
  const tl = (sk: string, cz: string) => lang === 'cz' ? cz : sk
  const cf = job.customFields as Record<string, string | undefined> | undefined
  const phase = job.techPhase ?? ''

  const arrivedTime = arrivedAt ? formatTimeShort(arrivedAt) : null
  const diagEndTime = (cf?.submit_diagnostic_at || cf?.diagnostics_done_at) ? formatTimeShort((cf.submit_diagnostic_at || cf.diagnostics_done_at) as string) : null
  const estimateApprovedTime = cf?.estimate_approved_at ? formatTimeShort(cf.estimate_approved_at) : null
  const rawWorkStart = cf?.start_work_at || cf?.work_started_at
  const workStartTime = rawWorkStart ? formatTimeShort(rawWorkStart as string) : null
  const workDoneTime = cf?.work_done_at ? formatTimeShort(cf.work_done_at) : null
  const rawProtocol = cf?.submit_protocol_at || cf?.protocol_submitted_at
  const protocolTime = rawProtocol ? formatTimeShort(rawProtocol as string) : null
  const invoiceIssuedRaw = cf?.invoice_issued_at || (cf?.invoice_data as unknown as Record<string, unknown> | undefined)?.issue_date
  const invoiceTime = invoiceIssuedRaw ? formatTimeShort(invoiceIssuedRaw as string) : null
  const hasInvoiceData = !!(cf?.invoice_uploaded_at || cf?.invoice_file_id || cf?.invoice_data)
  const isOnSiteNow = crmStep >= 3 && !!arrivedAt

  const DIAG_PHASES = ['diagnostics', 'diagnostics_done', 'estimate_draft', 'estimate_submitted',
    'estimate_approved', 'estimate_rejected', 'client_approval_pending', 'client_approved',
    'client_declined', 'working', 'break', 'caka_material', 'awaiting_next_visit',
    'work_completed', 'settlement_review', 'settlement_approved', 'price_review',
    'price_approved', 'surcharge_approved', 'protocol_draft', 'protocol_sent',
    'final_protocol_draft', 'final_protocol_sent', 'final_protocol_signed',
    'invoice_ready', 'departed']

  const arrivalStatus: TLStep['status'] =
    crmStep < 2 ? 'pending' :
    crmStep === 2 ? 'active' :
    'done'

  const diagStatus: TLStep['status'] =
    crmStep < 3 ? 'pending' :
    crmStep >= 4 || !!diagEndTime ? 'done' :
    crmStep === 3 ? 'active' : 'pending'

  const estimateStatus: TLStep['status'] =
    crmStep < 4 ? 'pending' :
    crmStep >= 5 || !!estimateApprovedTime ? 'done' :
    crmStep === 4 ? 'active' : 'pending'

  const repairStatus: TLStep['status'] =
    crmStep < 6 ? 'pending' :
    crmStep >= 7 || !!workDoneTime ? 'done' :
    ['working', 'break', 'caka_material', 'awaiting_next_visit', 'work_completed'].includes(phase) || crmStep === 6 ? 'active' : 'pending'

  const PROTO_PHASES = ['protocol_draft', 'protocol_sent', 'final_protocol_draft', 'final_protocol_sent',
    'final_protocol_signed', 'settlement_review', 'settlement_approved', 'price_review', 'price_approved', 'surcharge_approved']
  const protocolStatus: TLStep['status'] =
    crmStep < 7 ? 'pending' :
    crmStep >= 9 || !!protocolTime ? 'done' :
    PROTO_PHASES.includes(phase) || crmStep === 7 || crmStep === 8 ? 'active' : 'pending'

  // Technikova faktúra je nezávislá od CRM pipeline poisťovne
  const invoicingStatus: TLStep['status'] =
    crmStep < 9 ? 'pending' :
    (!!invoiceTime || hasInvoiceData) ? 'done' :
    'active'

  const activeArrivalTime = arrivalStatus === 'active' && crmStep === 2
    ? (lang === 'cz' ? 'Na cestě...' : 'Na ceste...')
    : arrivalStatus === 'done' && arrivedTime ? arrivedTime
    : null
  const activeRepairTime = repairStatus === 'active' && workStartTime ? workStartTime : workDoneTime

  return [
    { label: tl('Príjazd', 'Příjezd'), time: activeArrivalTime, status: arrivalStatus },
    { label: tl('Diagnost.', 'Diagnost.'), time: diagEndTime, status: diagStatus },
    { label: tl('Odhad', 'Odhad'), time: estimateApprovedTime, status: estimateStatus },
    { label: tl('Oprava', 'Oprava'), time: activeRepairTime, status: repairStatus },
    { label: tl('Protokol', 'Protokol'), time: protocolTime, status: protocolStatus },
    { label: tl('Faktúra', 'Faktura'), time: invoiceTime, status: invoicingStatus },
  ]
}

// ──────────────────────────────────────────────────────────────────────────────

interface ActiveJobFullscreenProps {
  job: DispatchJob
  lang: Language
  statusBadge?: JobStatusBadge
  onCallCustomer?: (phone: string) => void
  onNavigate?: (address: string, city: string) => void
  onOpenProtocol?: (job: DispatchJob) => void
  onStepAction?: (jobId: string, action: TechActionType) => Promise<boolean>
  onSubmitEstimate?: (jobId: string, data: EstimateFormData) => Promise<boolean>
  onInvoiceComplete?: (jobId: string) => void
  onJobUpdated?: () => void
  initialAction?: string | null  // from URL ?action=delivery_date — auto-focus specific field
}

export default function ActiveJobFullscreen({
  job,
  lang,
  statusBadge,
  onCallCustomer,
  onNavigate,
  onOpenProtocol,
  onStepAction,
  onSubmitEstimate,
  onInvoiceComplete,
  onJobUpdated,
  initialAction,
}: ActiveJobFullscreenProps) {
  // ── Modal state — replicated from ExpandableJobCard ──
  const [isActionPending, setIsActionPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showMaterialChecklist, setShowMaterialChecklist] = useState(false)
  const [showEstimateModal, setShowEstimateModal] = useState(false)
  const [isSubmittingEstimate, setIsSubmittingEstimate] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [showDiagnosticChoiceModal, setShowDiagnosticChoiceModal] = useState(false)
  const [showDiagnosticEndModal, setShowDiagnosticEndModal] = useState(false)
  const [showBackupMenu, setShowBackupMenu] = useState(false)
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
  // Settlement confirm flow
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  // Schedule respond — accept client date or propose new
  const [scheduleRespondLoading, setScheduleRespondLoading] = useState(false)
  const [showProposeNewDate, setShowProposeNewDate] = useState(false)
  const [newProposedDate, setNewProposedDate] = useState('')
  const [newProposedTime, setNewProposedTime] = useState('')
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null)
  // Break/material "leaving site?" confirmation — 2-step flow
  type LeaveConfirmState = null | { step: 'reason' } | { step: 'confirm'; reason: 'break' | 'material' | 'complex_repair' }
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<LeaveConfirmState>(null)
  // Work done confirmation modal
  const [showWorkDoneConfirm, setShowWorkDoneConfirm] = useState(false)
  // showEditInfoModal removed — technicians cannot edit job data

  // Delivery date (caka_material phase)
  const [editingDeliveryDate, setEditingDeliveryDate] = useState(false)
  const [deliveryDateValue, setDeliveryDateValue] = useState('')
  const [savingDeliveryDate, setSavingDeliveryDate] = useState(false)
  const deliveryDateRef = useRef<HTMLDivElement>(null)

  // Auto-open delivery date field when navigated from notification (?action=delivery_date)
  // Auto-open photo modal when navigated from card (?action=photos)
  useEffect(() => {
    if (initialAction === 'delivery_date') {
      setEditingDeliveryDate(true)
      setTimeout(() => {
        deliveryDateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
    if (initialAction === 'photos') {
      setShowPhotoModal(true)
    }
  }, [initialAction])

  // Auto-open protocol modal when pending_visit_protocol flag is set
  // (after revise_estimate + needsNextVisit + surcharge approved)
  const [visitProtocolPromptShown, setVisitProtocolPromptShown] = useState(false)
  const [showVisitChoiceModal, setShowVisitChoiceModal] = useState(false)
  const [pendingVisitCleared, setPendingVisitCleared] = useState(false)
  useEffect(() => {
    if (
      job?.customFields?.pending_visit_protocol === true &&
      job?.techPhase === 'working' &&
      !visitProtocolPromptShown &&
      !pendingVisitCleared
    ) {
      setVisitProtocolPromptShown(true)
      setTimeout(() => setShowVisitChoiceModal(true), 500)
    }
  }, [job?.customFields?.pending_visit_protocol, job?.techPhase, visitProtocolPromptShown])

  const clearPendingVisitProtocol = useCallback(async () => {
    setPendingVisitCleared(true)
    try {
      await fetch(`/api/dispatch/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ customFields: { pending_visit_protocol: false } })
      })
      onJobUpdated?.()
    } catch (err) {
      console.error('[MultiVisit] Failed to clear pending_visit_protocol:', err)
    }
  }, [job.id, onJobUpdated])

  // Next visit date (caka_material + awaiting_next_visit phases)
  const [editingNextVisit, setEditingNextVisit] = useState(false)
  const [nextVisitValue, setNextVisitValue] = useState('')
  const [savingNextVisit, setSavingNextVisit] = useState(false)

  // Customer diagnostic photos
  const [photos, setPhotos] = useState<{ id: number; filename: string | null; data: string }[]>([])
  const [photosLoaded, setPhotosLoaded] = useState(false)
  const [lightbox, setLightbox] = useState<{ id: number; filename: string | null; data: string } | null>(null)

  // GPS en_route tracking — use extended hook API if available (added by Agent B)
  const gpsHook = useLocationTracking() as any
  const startEnRoute = typeof gpsHook.startEnRoute === 'function' ? gpsHook.startEnRoute : null
  const stopAndMeasure = typeof gpsHook.stopAndMeasure === 'function' ? gpsHook.stopAndMeasure : null
  const isEnRoute = typeof gpsHook.isEnRoute === 'boolean' ? gpsHook.isEnRoute : false

  // Listen for auto-arrived geofence event (triggered by hook when within 150m)
  useEffect(() => {
    const handleAutoArrived: EventListener = async (evt) => {
      const e = evt as CustomEvent
      if (e.detail?.jobId !== job?.id) return
      let measuredKm: number | null = null
      if (stopAndMeasure) {
        try { measuredKm = await stopAndMeasure() } catch {
          setActionError(tl('GPS záznam trasy sa nepodarilo zastaviť. Pokračujte ďalej.', 'GPS záznam trasy se nepodařilo zastavit. Pokračujte dále.'))
        }
      }
      if (onStepAction) {
        try {
          if (measuredKm != null) {
            window.dispatchEvent(new CustomEvent('gps-arrived-with-km', {
              detail: { jobId: job.id, measuredKm }
            }))
          }
          await onStepAction(job.id, 'arrived' as TechActionType)
        } catch (err) {
          console.error('[ActiveJobFullscreen] Auto-arrived status update failed:', err)
          setActionError('Automatická zmena stavu zlyhala. Prosím potvrďte príchod manuálne.')
        }
      }
    }
    window.addEventListener('gps-auto-arrived', handleAutoArrived)
    return () => window.removeEventListener('gps-auto-arrived', handleAutoArrived)
  }, [job?.id, stopAndMeasure, onStepAction])

  // Load photos (always visible in fullscreen, so load immediately)
  useEffect(() => {
    if (photosLoaded) return
    const diag = job.customFields?.diagnostic as { photo_count?: number } | undefined
    if (!diag?.photo_count) { setPhotosLoaded(true); return }
    fetch(`/api/dispatch/photos?jobId=${job.id}&withData=1`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.success) setPhotos(json.photos) })
      .catch(err => console.warn('[Photos] Failed to load:', err))
      .finally(() => setPhotosLoaded(true))
  }, [photosLoaded, job.id, job.customFields])

  // Auto-dismiss error toast after 5 seconds
  useEffect(() => {
    if (!actionError) return
    const timer = setTimeout(() => setActionError(null), 5000)
    return () => clearTimeout(timer)
  }, [actionError])

  // Clear error when navigating to a different job
  useEffect(() => {
    setActionError(null)
  }, [job.id])

  const t = useCallback(
    (key: string) => getTranslation(lang, key),
    [lang]
  )
  const tl = useCallback(
    (sk: string, cz: string) => lang === 'cz' ? cz : sk,
    [lang]
  )

  // ── VAT výpočet pre doplatok klienta ──
  // Sadzba sa určuje automaticky z pricing engine: material-only → 21%, inak 12% (CZ)
  const surchargeVatRate = job.country === 'SK' ? 23 : (job.surchargeOnlyMaterials ? 21 : 12)
  const surchargeBaseNoVat = job.clientSurcharge
    ? Math.round((job.clientSurcharge / (1 + surchargeVatRate / 100)) * 100) / 100
    : 0
  const calcSurchargeVat = (_amountWithVat: number, rate?: number) => {
    const r = rate ?? surchargeVatRate
    const noVat = surchargeBaseNoVat
    const vatAmount = Math.round(noVat * (r / 100) * 100) / 100
    const withVat = Math.round((noVat + vatAmount) * 100) / 100
    return { noVat, vat: vatAmount, withVat, rate: r }
  }

  // ── Settlement confirm handler (same as ExpandableJobCard) ──
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
      if (!res.ok) {
        setActionError(tl('Odoslanie vyúčtovania zlyhalo. Skúste znova.', 'Odeslání vyúčtování selhalo. Zkuste znovu.'))
        return
      }
      const result = await res.json()
      if (result.success) {
        // Show settlement result with real backend-computed data
        if (result.settlementData) {
          setSettlementData(result.settlementData as SettlementData)
          setShowSettlementResult(true)
        }
        setShowSettlementModal(false)
        onStepAction?.(job.id, 'approve_settlement' as TechActionType)
      } else {
        setActionError(tl('Odoslanie vyúčtovania zlyhalo. Skúste znova.', 'Odeslání vyúčtování selhalo. Zkuste znovu.'))
      }
    } catch {
      setActionError(tl('Chyba pripojenia. Skúste znova.', 'Chyba připojení. Zkuste znovu.'))
    } finally {
      setIsSubmittingSettlement(false)
    }
  }

  // ── Delivery date save handler ──
  const handleSaveDeliveryDate = async () => {
    if (!deliveryDateValue) return
    setSavingDeliveryDate(true)
    try {
      const res = await fetch(`/api/dispatch/jobs/${job.id}/delivery-date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ delivery_date: deliveryDateValue }),
      })
      if (res.ok) {
        setEditingDeliveryDate(false)
        if (typeof window !== 'undefined') window.location.reload()
      } else {
        setActionError(tl('Nepodarilo sa uložiť dátum dodania. Skúste znova.', 'Nepodařilo se uložit datum dodání. Zkuste znovu.'))
      }
    } catch {
      setActionError(tl('Chyba pripojenia. Dátum dodania sa neuložil.', 'Chyba připojení. Datum dodání se neuložilo.'))
    } finally { setSavingDeliveryDate(false) }
  }

  // ── Next visit date save handler ──
  const handleSaveNextVisit = async () => {
    if (!nextVisitValue) return
    setSavingNextVisit(true)
    try {
      const res = await fetch(`/api/dispatch/jobs/${job.id}/delivery-date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ next_visit_date: nextVisitValue }),
      })
      if (res.ok) {
        setEditingNextVisit(false)
        if (typeof window !== 'undefined') window.location.reload()
      } else {
        setActionError(tl('Nepodarilo sa uložiť dátum ďalšej návštevy. Skúste znova.', 'Nepodařilo se uložit datum další návštěvy. Zkuste znovu.'))
      }
    } catch {
      setActionError(tl('Chyba pripojenia. Dátum návštevy sa neuložil.', 'Chyba připojení. Datum návštěvy se neuložilo.'))
    } finally { setSavingNextVisit(false) }
  }

  // ── Accept client proposal handler ──
  const handleAcceptProposal = async () => {
    const proposal = job.customFields?.client_proposed_visit as { date?: string; time?: string } | undefined
    if (!proposal?.date) return
    setSavingNextVisit(true)
    try {
      const res = await fetch(`/api/dispatch/jobs/${job.id}/delivery-date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ next_visit_date: proposal.date, accept_client_proposal: true }),
      })
      if (res.ok) {
        if (typeof window !== 'undefined') window.location.reload()
      } else {
        setActionError(tl('Nepodarilo sa potvrdiť termín klienta. Skúste znova.', 'Nepodařilo se potvrdit termín klienta. Zkuste znovu.'))
      }
    } catch {
      setActionError(tl('Chyba pripojenia. Termín klienta sa nepotvrdil.', 'Chyba připojení. Termín klienta se nepotvrdil.'))
    } finally { setSavingNextVisit(false) }
  }

  // ── Derived values ──
  const insuranceColor =
    INSURANCE_COLORS[job.insurance ?? ''] ||
    Object.entries(INSURANCE_COLORS).find(([k]) =>
      (job.insurance ?? '').toLowerCase().includes(k.toLowerCase())
    )?.[1] ||
    '#666'

  const insuranceShort =
    INSURANCE_SHORT[job.insurance ?? ''] ||
    Object.entries(INSURANCE_SHORT).find(([k]) =>
      (job.insurance ?? '').toLowerCase().includes(k.toLowerCase())
    )?.[1] ||
    job.insurance || 'Poisťovňa'

  const categoryIcon =
    CATEGORY_ICONS[job.category] ||
    Object.entries(CATEGORY_ICONS).find(([k]) =>
      job.category.toLowerCase().includes(k.toLowerCase())
    )?.[1] ||
    '🔧'

  const crmStep = job.crmStep ?? 0
  const progressPercent = job.progressPercent ?? Math.round((crmStep / 12) * 100)
  const crmLabel = getCrmStepLabel(crmStep, lang)
  const phaseLabel = job.techPhase === 'departed' ? null : getTechPhaseLabel(job.techPhase, lang)
  const cfAny = (job as any).customFields
  const smartButton = getSmartButton(crmStep, job.techPhase, lang, {
    hasPhotos: job.finalPhotosUploaded || (job.photos?.length ?? 0) > 0,
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
  const canFinishAllVisits = job.techPhase === 'awaiting_next_visit'

  // Detect multi-visit context — used by work_done confirmation modal
  const isMultiVisitJob = !!(
    (job.customFields as any)?.estimate_needs_next_visit === true
    || (Number((job.customFields as any)?.current_visit_number) || 0) >= 1
    || (Array.isArray((job.customFields as any)?.protocol_history) && (job.customFields as any).protocol_history.length > 0)
  )

  // ── Schedule respond handlers ──
  const handleAcceptClientDate = async () => {
    // Parse date from client_note if client_date is missing (e.g. "30.3.2026 o 8:00")
    const ps = job.proposedSchedule
    let parsedDate = ps?.client_date || ''
    let parsedTime = ps?.client_time || ''
    if (!parsedDate && ps?.client_note) {
      const m = ps.client_note.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/)
      if (m) parsedDate = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
      const tm = ps.client_note.match(/(\d{1,2})[:\.](\d{2})/)
      if (tm) parsedTime = `${tm[1].padStart(2, '0')}:${tm[2]}`
    }

    setScheduleRespondLoading(true)
    setScheduleSuccess(null)
    try {
      await apiFetch('/api/dispatch/schedule/respond', {
        method: 'POST',
        credentials: 'include',
        body: {
          jobId: job.id,
          action: 'accept_client_date',
          ...(parsedDate && !ps?.client_date ? { confirmed_date: parsedDate, confirmed_time: parsedTime } : {}),
        },
      })
      setScheduleSuccess(lang === 'cz' ? 'Termín potvrzen — klient bude informován' : 'Termín potvrdený — klient bude informovaný')
      onJobUpdated?.()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Chyba pri potvrdení termínu')
    } finally {
      setScheduleRespondLoading(false)
    }
  }

  const handleProposeNewDate = async () => {
    if (!newProposedDate) return
    setScheduleRespondLoading(true)
    setScheduleSuccess(null)
    try {
      await apiFetch('/api/dispatch/schedule/respond', {
        method: 'POST',
        credentials: 'include',
        body: {
          jobId: job.id,
          action: 'propose_new_date',
          proposed_date: newProposedDate,
          proposed_time: newProposedTime || undefined,
        },
      })
      setScheduleSuccess(lang === 'cz' ? 'Nový termín odeslán klientovi ke schválení' : 'Nový termín odoslaný klientovi na schválenie')
      setShowProposeNewDate(false)
      setNewProposedDate('')
      setNewProposedTime('')
      onJobUpdated?.()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Chyba pri odoslaní nového termínu')
    } finally {
      setScheduleRespondLoading(false)
    }
  }

  // ── Smart button click handler (same logic as ExpandableJobCard) ──
  const handleSmartButtonClick = async () => {
    if (isActionPending) return

    if (smartButton.opensNewWindow) {
      window.open(`/dispatch/protocol/${job.id}?from=${encodeURIComponent(`/dispatch/job/${job.id}`)}`, '_blank')
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

    // Intercept modals
    if (smartButton.opensForm === 'invoice') {
      if (lang === 'sk') { setShowSkInvoiceModal(true) } else { setShowInvoiceModal(true) }
      return
    }
    if (smartButton.opensForm === 'settlement_review') { setShowSettlementReview(true); return }
    if (smartButton.opensForm === 'settlement_correction') {
      try {
        const res = await fetch(`/api/dispatch/settlement/${job.id}`, { credentials: 'include' })
        if (res.ok) { const d = await res.json(); setSettlementData(d) }
      } catch { /* ignore */ }
      setShowSettlementCorrection(true)
      return
    }
    if (smartButton.opensForm === 'price_review') {
      // Always read fresh settlement_data from job (single source of truth after pricing engine)
      const freshSd = job.customFields?.settlement_data as import('@/types/dispatch').SettlementData | undefined
      if (freshSd) setSettlementData(freshSd)
      setShowSettlementResult(true)
      return
    }
    if (smartButton.opensForm === 'settlement_invoice') { setShowSettlementInvoice(true); return }
    if (smartButton.opensForm === 'diagnostic_choice') { setShowDiagnosticChoiceModal(true); return }
    if (smartButton.opensForm === 'estimate' && onSubmitEstimate) { setShowEstimateModal(true); return }
    if (smartButton.opensForm === 'photos') { setShowPhotoModal(true); return }
    if (smartButton.opensForm === 'protocol' && onOpenProtocol) { onOpenProtocol(job); return }

    // Material checklist before en_route
    if (smartButton.action === 'en_route') {
      setShowMaterialChecklist(true)
      return
    }

    // Intercept work_done — show confirmation first
    if (smartButton.action === 'work_done') {
      setShowWorkDoneConfirm(true)
      return
    }

    if (onStepAction) {
      setIsActionPending(true)
      try {
        // GPS: stop tracking + measure km when technician taps "Na mieste"
        if (smartButton.action === 'arrived' && isEnRoute && stopAndMeasure) {
          try {
            const measuredKm = await stopAndMeasure()
            if (measuredKm != null) {
              // Post arrived with measuredKm included in body
              await fetch('/api/dispatch/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: job.id, action: 'arrived', measuredKm }),
                credentials: 'include',
              })
              // Also notify parent so job data refreshes
              await onStepAction(job.id, 'arrived' as TechActionType)
              return
            }
          } catch { /* non-fatal — fall through to normal action */ }
        }

        const success = await onStepAction(job.id, smartButton.action)
        if (success === false) {
          setActionError(tl('Stav zákazky sa zmenil. Obnovte stránku.', 'Stav zakázky se změnil. Obnovte stránku.'))
        }
      } catch (err) {
        console.error('[ActiveJob SmartBtn]', err)
        setActionError(tl('Akcia sa nepodarila. Skúste znova alebo obnovte stránku.', 'Akce se nezdařila. Zkuste znovu nebo obnovte stránku.'))
      } finally {
        setIsActionPending(false)
      }
    }
  }
  const handleMaterialChecklistConfirm = useCallback(async (checklist: { allReady: boolean; missingNote: string; items: Array<{ name: string; qty: number; unit: string; ready: boolean }> }) => {
    setShowMaterialChecklist(false)
    if (!onStepAction) return
    setIsActionPending(true)
    try {
      if (startEnRoute) {
        try {
          const destination = job.gps?.lat && job.gps?.lng
            ? { lat: job.gps.lat, lng: job.gps.lng, radiusMeters: 150 }
            : undefined
          startEnRoute(job.id, destination)
        } catch { /* non-fatal */ }
      }
      const res = await fetch('/api/dispatch/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          action: 'en_route',
          materialChecklist: {
            completedAt: new Date().toISOString(),
            allReady: checklist.allReady,
            missingNote: checklist.missingNote || '',
            items: checklist.items.map(i => ({ name: i.name, qty: i.qty, ready: i.ready })),
          },
        }),
        credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        if (onJobUpdated) onJobUpdated()
      } else {
        setActionError(tl('Stav zákazky sa zmenil. Obnovte stránku.', 'Stav zakázky se změnil. Obnovte stránku.'))
      }
    } catch (err) {
      console.error('[MaterialChecklist] en_route failed', err)
      setActionError(tl('Akcia sa nepodarila. Skúste znova.', 'Akce se nezdařila. Zkuste znovu.'))
    } finally {
      setIsActionPending(false)
    }
  }, [job, onStepAction, startEnRoute, onJobUpdated])

  // ── Live timer — update every minute while on-site ──
  const ON_SITE_PHASES = ['arrived', 'diagnostics', 'working', 'break', 'estimate_draft']
  const isOnSite = ON_SITE_PHASES.includes(job.techPhase || '')

  const [timerTick, setTimerTick] = useState(0)

  useEffect(() => {
    if (!isOnSite) return
    const id = setInterval(() => setTimerTick(t => t + 1), 1000 * 60)
    return () => clearInterval(id)
  }, [isOnSite])

  const formatElapsed = (isoTimestamp: string): string => {
    const elapsed = Date.now() - new Date(isoTimestamp).getTime()
    if (elapsed < 0) return '0h 0m'
    const h = Math.floor(elapsed / 3600000)
    const m = Math.floor((elapsed % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  const arrivedAt = isOnSite ? (job.customFields?.arrived_at as string | undefined) : undefined
  const isBreak = job.techPhase === 'break'

  // Timeline steps — rebuilt on every timer tick so elapsed times update live
  const timelineSteps = useMemo(
    () => buildTimelineSteps(job, crmStep, lang, arrivedAt, formatElapsed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [job, crmStep, lang, arrivedAt, timerTick],
  )

  // Status icon — use badgeConfig.icon if available (added by TASK-E), fallback to emoji
  const statusIcon = (badgeConfig as any)?.icon || '🔧'

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

      {showRescheduleModal && (
        <RescheduleModal
          job={job}
          lang={lang}
          onClose={() => setShowRescheduleModal(false)}
          onSuccess={() => setShowRescheduleModal(false)}
          mode="pause_work"
        />
      )}

      {/* ── Leave/interrupt work — 2-step modal (reason → confirm) ── */}
      {showLeaveConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setShowLeaveConfirm(null)}
        >
          <div
            style={{
              background: 'var(--bg-modal, #fff)', borderRadius: 16,
              padding: 24, maxWidth: 340, width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              border: '1px solid var(--border)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {showLeaveConfirm.step === 'reason' ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', marginBottom: 16, textAlign: 'center' }}>
                  {tl('Dôvod prerušenia', 'Důvod přerušení')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    className="ajf-secondary-btn"
                    style={{ justifyContent: 'flex-start', gap: 12, padding: '14px 16px', fontSize: 15 }}
                    onClick={() => setShowLeaveConfirm({ step: 'confirm', reason: 'break' })}
                  >
                    {'☕'} {tl('Prestávka', 'Přestávka')}
                  </button>
                  <button
                    className="ajf-secondary-btn"
                    style={{ justifyContent: 'flex-start', gap: 12, padding: '14px 16px', fontSize: 15 }}
                    onClick={() => setShowLeaveConfirm({ step: 'confirm', reason: 'material' })}
                  >
                    {'📦'} {tl('Nákup materiálu', 'Nákup materiálu')}
                  </button>
                  <button
                    className="ajf-secondary-btn"
                    style={{ justifyContent: 'flex-start', gap: 12, padding: '14px 16px', fontSize: 15 }}
                    onClick={() => setShowLeaveConfirm({ step: 'confirm', reason: 'complex_repair' })}
                  >
                    {'🔧'} {tl('Komplikovaná oprava', 'Složitá oprava')}
                  </button>
                  <button
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-secondary)',
                      fontSize: 13, cursor: 'pointer', padding: 8, marginTop: 4,
                    }}
                    onClick={() => setShowLeaveConfirm(null)}
                  >
                    {tl('Zrušiť', 'Zrušit')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', marginBottom: 8, textAlign: 'center' }}>
                  {showLeaveConfirm.reason === 'material'
                    ? tl('Nákup materiálu', 'Nákup materiálu')
                    : showLeaveConfirm.reason === 'complex_repair'
                    ? tl('Komplikovaná oprava', 'Složitá oprava')
                    : tl('Prestávka', 'Přestávka')}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, textAlign: 'center', lineHeight: 1.5 }}>
                  {tl(
                    'Odchádzate z miesta? Ak áno, klient musí pred odchodom podpísať protokol.',
                    'Odcházíte z místa? Pokud ano, klient musí před odchodem podepsat protokol.',
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    className="ajf-smart-action gold"
                    disabled={isActionPending}
                    onClick={async () => {
                      setIsActionPending(true)
                      const breakAction = showLeaveConfirm.reason === 'material' ? 'need_material' : 'take_break'
                      try {
                        await onStepAction?.(job.id, breakAction as TechActionType)
                        setShowLeaveConfirm(null)
                        if (onOpenProtocol) {
                          onOpenProtocol(job)
                        } else {
                          window.location.href = `/dispatch/protocol/${job.id}?type=multi_visit&from=${encodeURIComponent('/dispatch')}`
                        }
                      } catch (err) {
                        console.error('[LeaveConfirm] Error setting break phase:', err)
                        setActionError(tl('Nepodarilo sa zmeniť stav zákazky. Skúste znova.', 'Nepodařilo se změnit stav zakázky. Zkuste znovu.'))
                      } finally {
                        setIsActionPending(false)
                      }
                    }}
                  >
                    <span>{tl('Áno, odchádzam — vyplniť protokol', 'Ano, odcházím — vyplnit protokol')}</span>
                  </button>
                  <button
                    className="ajf-secondary-btn"
                    disabled={isActionPending}
                    onClick={async () => {
                      const breakAction = showLeaveConfirm.reason === 'material' ? 'need_material' : 'take_break'
                      setShowLeaveConfirm(null)
                      await onStepAction?.(job.id, breakAction as TechActionType)
                    }}
                  >
                    {tl('Nie, zostávam na mieste', 'Ne, zůstávám na místě')}
                  </button>
                  <button
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-secondary)',
                      fontSize: 13, cursor: 'pointer', padding: 8,
                    }}
                    onClick={() => setShowLeaveConfirm({ step: 'reason' })}
                  >
                    {tl('← Späť', '← Zpět')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Visit choice modal (multi-visit: pending_visit_protocol flag) ── */}
      {showVisitChoiceModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }} onClick={() => setShowVisitChoiceModal(false)}>
          <div style={{
            background: 'var(--bg-modal, #fff)', borderRadius: 16,
            padding: 24, maxWidth: 380, width: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            border: '1px solid var(--border)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', marginBottom: 8, textAlign: 'center' }}>
              {tl('Zákazka vyžaduje ďalšiu návštevu', 'Zakázka vyžaduje další návštěvu')}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, textAlign: 'center', lineHeight: 1.5 }}>
              {job.customFields?.estimate_next_visit_reason
                ? tl(
                    `Cenový odhad bol schválený. V odhade ste uviedli: ${VISIT_REASON_LABELS[job.customFields.estimate_next_visit_reason as string]?.sk || job.customFields.estimate_next_visit_reason}. Čo chcete urobiť?`,
                    `Cenový odhad byl schválen. V odhadu jste uvedli: ${VISIT_REASON_LABELS[job.customFields.estimate_next_visit_reason as string]?.cz || job.customFields.estimate_next_visit_reason}. Co chcete udělat?`
                  )
                : tl(
                    'Cenový odhad bol schválený s plánom ďalšej návštevy. Čo chcete urobiť?',
                    'Cenový odhad byl schválen s plánem další návštěvy. Co chcete udělat?'
                  )
              }
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="ajf-smart-action gold"
                disabled={isActionPending}
                onClick={async () => {
                  setShowVisitChoiceModal(false)
                  await clearPendingVisitProtocol()
                }}
              >
                <span>{tl('Začať prácu teraz', 'Začít práci nyní')}</span>
              </button>
              <button
                className="ajf-secondary-btn"
                disabled={isActionPending}
                onClick={() => {
                  setShowVisitChoiceModal(false)
                  setShowLeaveConfirm({ step: 'reason' })
                }}
              >
                {tl('Prerušiť prácu', 'Přerušit práci')}
              </button>
              <button
                style={{
                  background: 'none', border: 'none', color: 'var(--text-secondary)',
                  fontSize: 13, cursor: 'pointer', padding: 8,
                }}
                onClick={() => setShowVisitChoiceModal(false)}
              >
                {tl('Zavrieť', 'Zavřít')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EditJobInfoModal removed — technicians cannot edit job data */}

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
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text, var(--dark))', marginBottom: 8, textAlign: 'center' }}>
                  {tl('Je práca naozaj dokončená?', 'Je práce skutečně hotová?')}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, textAlign: 'center', lineHeight: 1.5 }}>
                  {tl('V odhade ste uviedli, že bude potrebných viac výjazdov.', 'V odhadu jste uvedli, že bude potřeba více výjezdů.')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    className="ajf-smart-action gold"
                    disabled={isActionPending}
                    onClick={() => {
                      setShowWorkDoneConfirm(false)
                      onStepAction?.(job.id, 'work_done' as TechActionType)
                    }}
                  >
                    <span>{tl('Áno, všetko je hotové', 'Ano, vše je hotovo')}</span>
                  </button>
                  <button
                    className="ajf-secondary-btn"
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
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text, var(--dark))', marginBottom: 20, textAlign: 'center' }}>
                  {tl('Potvrďte dokončenie práce', 'Potvrďte dokončení práce')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    className="ajf-smart-action gold"
                    disabled={isActionPending}
                    onClick={() => {
                      setShowWorkDoneConfirm(false)
                      onStepAction?.(job.id, 'work_done' as TechActionType)
                    }}
                  >
                    <span>{tl('Áno, práca je hotová', 'Ano, práce je hotová')}</span>
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

      <div className="active-job-fullscreen" data-help-screen="active-job">

        {/* ═══════ HERO — Neomorphic Glass ═══════ */}
        <div className="ajf-hero">
          {/* Ambient blur background */}
          <div className="ajf-hero-blur" />

          {/* Nav bar */}
          <div className="ajf-hero-top">
            <button className="ajf-back-btn" onClick={() => window.history.back()} aria-label={lang === 'cz' ? 'Zpět' : 'Späť'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>
            </button>
            <span style={{
              background: 'var(--ajf-glass-bg, rgba(255,255,255,0.06))',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              color: 'var(--ajf-text-sec, rgba(255,255,255,0.5))',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              border: '1px solid var(--ajf-border)',
            }}>{job.referenceNumber}</span>
            {Number((job as any).customFields?.current_visit_number) > 1 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'var(--gold)', color: 'white', padding: '4px 12px',
                borderRadius: '16px', fontSize: '0.8rem', fontWeight: 700,
              }}>
                {'🔄'} Návšteva č. {(job as any).customFields.current_visit_number}
              </span>
            )}
          </div>

          {/* Glass customer card */}
          <div className="ajf-glass-card" data-help-target="job-customer-card">
            <div className="ajf-hero-name">{job.customerName}</div>
            <div className="ajf-hero-location">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              {job.customerAddress}, {job.customerCity}
            </div>
            {/* Problem description — inside glass card */}
            {(job.subject || job.name) && (
              <div style={{
                fontSize: 13,
                color: 'var(--ajf-text-sec, rgba(255,255,255,0.6))',
                lineHeight: 1.5,
                marginBottom: 14,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }}>
                {job.subject || job.name}
              </div>
            )}
            {/* Quick actions — inside glass card */}
            <div className="ajf-pills">
              <a
                className="ajf-pill nav"
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([job.customerAddress, job.customerCity].filter(Boolean).join(', '))}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); onNavigate?.(job.customerAddress, job.customerCity) }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"/></svg>
                {t('dispatch.navigate')}
              </a>
              <a className="ajf-pill call" href={`tel:${job.customerPhone}`}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
                {lang === 'cz' ? 'Zavolat' : 'Zavolať'}
              </a>
              <button className="ajf-pill chat" onClick={() => setShowChatModal(true)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                Chat
              </button>
            </div>
          </div>
        </div>

        {/* ═══════ STATUS CHIP ═══════ */}
        <div className="ajf-status-row" data-help-target="job-status-chip">
          <div className={`ajf-status-chip${smartButton.variant === 'waiting' ? ' waiting' : isBreak ? ' break' : smartButton.variant === 'disabled' ? ' done' : ''}`}>
            <div className="ajf-live-dot" />
            <span className="ajf-status-text">{(lang === 'cz' ? badgeConfig?.labelCz : badgeConfig?.label) || crmLabel}</span>
          </div>
          <span className="ajf-status-detail">
            {phaseLabel && <>{phaseLabel} · </>}
            {isOnSite && arrivedAt ? formatElapsed(arrivedAt) : ''}
          </span>
        </div>

        {/* ═══════ SCHEDULED DATE/TIME ═══════ */}
        {(job.scheduledDate || job.scheduledTime) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px',
            margin: '0 16px',
            background: 'var(--surface, #fff)',
            borderRadius: 12,
            border: '1px solid var(--border, #e5e7eb)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold, #B8960C)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <div>
                <div style={{ fontSize: 11, color: 'var(--g4, #6b7280)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {lang === 'cz' ? 'Dohodnutý termín' : 'Dohodnutý termín'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark, #1f2937)', marginTop: 2 }}>
                  {job.scheduledDate
                    ? new Date(job.scheduledDate).toLocaleDateString(lang === 'cz' ? 'cs-CZ' : 'sk-SK', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' })
                    : ''}
                  {job.scheduledTime ? ` · ${job.scheduledTime}` : ''}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowRescheduleModal(true)}
              style={{
                background: 'none',
                border: '1px solid var(--border, #e5e7eb)',
                borderRadius: 8,
                padding: '6px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: 'var(--g5, #6b7280)',
                fontSize: 11,
                fontWeight: 500,
              }}
              title={lang === 'cz' ? 'Změnit termín' : 'Zmeniť termín'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              {lang === 'cz' ? 'Změnit' : 'Zmeniť'}
            </button>
          </div>
        )}

        {!job.scheduledDate && job.proposedSchedule?.status === 'pending' && (
          <div style={{
            margin: '16px 20px',
            padding: '16px',
            borderRadius: 12,
            border: '2px dashed var(--gold)',
            background: 'var(--surface, #fff)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 15 }}>{lang === 'cz' ? '📅 Navrhnutý termín' : '📅 Navrhnutý termín'}</span>
              <span style={{
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 20,
                background: 'rgba(212, 168, 67, 0.15)',
                color: 'var(--gold)',
                fontWeight: 600,
              }}>{lang === 'cz' ? '⌛ Čeká na klienta' : '⌛ Čaká na klienta'}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--dark)' }}>
              {new Date(job.proposedSchedule.date + 'T00:00:00').toLocaleDateString(lang === 'cz' ? 'cs-CZ' : 'sk-SK', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
            </div>
            {job.proposedSchedule.time && (
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                🕐 {job.proposedSchedule.time}
              </div>
            )}
          </div>
        )}

        {!job.scheduledDate && job.proposedSchedule?.status === 'declined' && (
          <div style={{
            margin: '16px 20px',
            padding: '16px',
            borderRadius: 12,
            border: '1px solid #FCA5A5',
            background: '#FEF2F2',
          }}>
            <div style={{ fontWeight: 700, color: '#DC2626', fontSize: 15, marginBottom: 8 }}>
              {lang === 'cz' ? '❌ Klient odmítl termín' : '❌ Klient odmietol termín'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'line-through', marginBottom: 8 }}>
              {job.proposedSchedule.date} {job.proposedSchedule.time}
            </div>
            {/* Klientov protinávrh — štruktúrovaný dátum alebo textová poznámka */}
            {(job.proposedSchedule.client_date || job.proposedSchedule.client_note) && (
              <div className="ajf-client-proposal-card">
                <div className="proposal-label">
                  {lang === 'cz' ? '📅 Klient navrhuje:' : '📅 Klient navrhuje:'}
                </div>
                {job.proposedSchedule.client_date ? (
                  <div className="proposal-value">
                    {new Date(job.proposedSchedule.client_date + 'T00:00:00').toLocaleDateString(lang === 'cz' ? 'cs-CZ' : 'sk-SK', {
                      weekday: 'long', day: 'numeric', month: 'long'
                    })}
                    {job.proposedSchedule.client_time && ` — ${job.proposedSchedule.client_time}`}
                  </div>
                ) : (
                  <div className="proposal-value-alt">
                    {job.proposedSchedule.client_note}
                  </div>
                )}
                {job.proposedSchedule.client_date && job.proposedSchedule.client_note && (
                  <div className="proposal-note">
                    „{job.proposedSchedule.client_note}"
                  </div>
                )}
              </div>
            )}

            {/* Success message */}
            {scheduleSuccess && (
              <div className="ajf-success-toast" style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 10,
                fontSize: 13, fontWeight: 600,
              }}>
                ✅ {scheduleSuccess}
              </div>
            )}

            {/* ── Akčné tlačidlá pre technika ── */}
            {!scheduleSuccess && !showProposeNewDate && (
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {/* Potvrdiť klientov termín */}
                <button
                  onClick={handleAcceptClientDate}
                  disabled={scheduleRespondLoading}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 10,
                    background: scheduleRespondLoading ? '#9CA3AF' : '#16A34A',
                    color: '#fff', border: 'none', fontWeight: 700, fontSize: 14,
                    cursor: scheduleRespondLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {scheduleRespondLoading ? '⏳' : '✅'} {lang === 'cz' ? 'Potvrdit termín' : 'Potvrdiť termín'}
                </button>
                {/* Navrhnúť iný termín */}
                <button
                  onClick={() => setShowProposeNewDate(true)}
                  disabled={scheduleRespondLoading}
                  className="ajf-propose-date-form other-date-btn"
                  style={{
                    flex: 1,
                    cursor: scheduleRespondLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  📅 {lang === 'cz' ? 'Jiný termín' : 'Iný termín'}
                </button>
              </div>
            )}

            {/* ── Inline formulár pre nový termín ── */}
            {showProposeNewDate && !scheduleSuccess && (
              <div className="ajf-propose-date-form">
                <div className="form-label">
                  📅 {lang === 'cz' ? 'Navrhnout nový termín' : 'Navrhnúť nový termín'}
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input
                    type="date"
                    value={newProposedDate}
                    onChange={(e) => setNewProposedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{ flex: 2 }}
                  />
                  <input
                    type="time"
                    value={newProposedTime}
                    onChange={(e) => setNewProposedTime(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleProposeNewDate}
                    disabled={!newProposedDate || scheduleRespondLoading}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 8,
                      background: !newProposedDate || scheduleRespondLoading ? '#D1D5DB' : '#D97706',
                      color: '#fff', border: 'none', fontWeight: 700, fontSize: 13,
                      cursor: !newProposedDate || scheduleRespondLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {scheduleRespondLoading ? (lang === 'cz' ? '⏳ Odesílá se...' : '⏳ Odosiela sa...') : (lang === 'cz' ? 'Odeslat klientovi' : 'Odoslať klientovi')}
                  </button>
                  <button
                    onClick={() => { setShowProposeNewDate(false); setNewProposedDate(''); setNewProposedTime('') }}
                    disabled={scheduleRespondLoading}
                    className="cancel-btn"
                  >
                    {lang === 'cz' ? 'Zrušit' : 'Zrušiť'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════ INITIAL SCHEDULE PROPOSAL (no date, no proposal yet) ═══════ */}
        {!job.scheduledDate && !job.proposedSchedule?.status && crmStep <= 3 && (
          <div style={{
            margin: '16px 20px',
            padding: '16px',
            borderRadius: 12,
            border: '2px dashed var(--gold)',
            background: 'var(--surface, #fff)',
          }}>
            <div style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 15, marginBottom: 12 }}>
              {lang === 'cz' ? '📅 Navrhnout termín klientovi' : '📅 Navrhnúť termín klientovi'}
            </div>

            {scheduleSuccess && (
              <div className="ajf-success-toast" style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 10,
                fontSize: 13, fontWeight: 600,
              }}>
                ✅ {scheduleSuccess}
              </div>
            )}

            {!scheduleSuccess && (
              <div className="ajf-propose-date-form">
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input
                    type="date"
                    value={newProposedDate}
                    onChange={(e) => setNewProposedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{ flex: 2 }}
                  />
                  <input
                    type="time"
                    value={newProposedTime}
                    onChange={(e) => setNewProposedTime(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                <button
                  onClick={handleProposeNewDate}
                  disabled={!newProposedDate || scheduleRespondLoading}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 10,
                    background: !newProposedDate || scheduleRespondLoading ? '#D1D5DB' : 'var(--gold, #D4A843)',
                    color: '#fff', border: 'none', fontWeight: 700, fontSize: 14,
                    cursor: !newProposedDate || scheduleRespondLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {scheduleRespondLoading
                    ? (lang === 'cz' ? '⏳ Odesílá se...' : '⏳ Odosiela sa...')
                    : (lang === 'cz' ? '📅 Odeslat klientovi ke schválení' : '📅 Odoslať klientovi na schválenie')
                  }
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════ HORIZONTAL STEPPER ═══════ */}
        <div className="ajf-stepper-card">
          <div className="ajf-stepper">
            {timelineSteps.map((step, i) => (
              <Fragment key={i}>
                {i > 0 && (
                  <div className={`ajf-step-line ${timelineSteps[i - 1].status === 'done' ? 'done' : timelineSteps[i - 1].status === 'active' ? 'active' : ''}`} />
                )}
                <div className="ajf-step">
                  <div className={`ajf-step-dot ${step.status}`}>
                    {step.status === 'done' && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                    {step.status === 'active' && <span>◆</span>}
                    {step.status === 'pending' && <span>{i + 1}</span>}
                  </div>
                  <div className={`ajf-step-label ${step.status}`}>{step.label}</div>
                </div>
              </Fragment>
            ))}
          </div>
        </div>

        {/* ═══════ PAYMENT BADGE — pod timeline ═══════ */}
        {!!(cfAny?.invoice_data || cfAny?.invoice_uploaded_at || cfAny?.invoice_file_id || cfAny?.tech_payment_hold) && (() => {
          const holdData = cfAny?.tech_payment_hold as { reason: string; missingItems?: Array<{ id: string; label: string; action: string }> } | null | undefined
          const paid = cfAny?.payment_status === 'paid' || (cfAny?.invoice_data as any)?.invoice_status === 'paid'
          const hasHoldWithItems = holdData?.missingItems && holdData.missingItems.length > 0

          if (paid) {
            return (
              <div style={{
                margin: '0 16px 8px', padding: '8px 14px', borderRadius: 8,
                background: 'var(--success-bg, rgba(22,163,74,0.12))',
                border: '1px solid var(--success, #16A34A)',
                fontSize: 13, textAlign: 'center', color: 'var(--success, #16A34A)',
              }}>
                ✅ {lang === 'cz' ? 'Faktura uhrazena' : 'Faktúra uhradená'}
              </div>
            )
          }

          if (holdData) {
            return (
              <div style={{
                margin: '0 16px 8px', padding: '10px 14px', borderRadius: 8,
                background: 'var(--warning-bg, rgba(245,158,11,0.12))',
                border: '1px solid var(--warning, #F59E0B)',
                fontSize: 13, color: 'var(--warning-text, #92400E)',
              }}>
                <div style={{ fontWeight: 600, marginBottom: hasHoldWithItems ? 8 : 0 }}>
                  ⏸️ {lang === 'cz' ? 'Úhrada pozastavena' : 'Úhrada pozastavená'}
                </div>
                {hasHoldWithItems ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>
                      {lang === 'cz' ? 'Prosím doplňte chybějící podklady:' : 'Prosím doplňte chýbajúce podklady:'}
                    </div>
                    {holdData.missingItems!.map(item => (
                      <div key={item.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 10px', borderRadius: 6,
                        background: 'rgba(0,0,0,0.15)',
                      }}>
                        <span>❌ {item.label}</span>
                        {item.action === 'upload_photos' && (
                          <button
                            onClick={() => setShowPhotoModal(true)}
                            style={{
                              padding: '4px 10px', borderRadius: 4, border: 'none',
                              background: 'var(--gold, #D4A843)', color: '#000',
                              fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            {lang === 'cz' ? 'Nahrát' : 'Nahrať'}
                          </button>
                        )}
                        {item.action === 'sign_protocol' && (
                          <button
                            onClick={() => onOpenProtocol?.(job)}
                            style={{
                              padding: '4px 10px', borderRadius: 4, border: 'none',
                              background: 'var(--gold, #D4A843)', color: '#000',
                              fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            {lang === 'cz' ? 'Podepsat' : 'Podpísať'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>{holdData.reason}</div>
                )}
              </div>
            )
          }

          // Čaká na úhradu
          return (
            <div style={{
              margin: '0 16px 8px', padding: '8px 14px', borderRadius: 8,
              background: 'var(--info-bg, rgba(59,130,246,0.12))',
              border: '1px solid var(--info, #3B82F6)',
              fontSize: 13, textAlign: 'center', color: 'var(--info, #3B82F6)',
            }}>
              💰 {lang === 'cz' ? 'Faktura čeká na úhradu' : 'Faktúra čaká na úhradu'}
            </div>
          )
        })()}

        {/* ═══════ SCROLLABLE DETAIL ═══════ */}
        <div className="ajf-detail">

          {/* Timeline section removed — replaced by horizontal stepper above */}
          <div style={{ height: 0 }}>
          </div>

          {/* ── Delivery date card — shown when waiting for parts or next visit ── */}
          {(job.techPhase === 'caka_material' || job.techPhase === 'awaiting_next_visit') && (() => {
            const isCakaMaterial = job.techPhase === 'caka_material'
            const rawDate = job.customFields?.estimate_material_delivery_date as string | undefined
            const hasDate = !!rawDate

            const formattedDate = hasDate
              ? new Date(rawDate!).toLocaleDateString(lang === 'cz' ? 'cs-CZ' : 'sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })
              : null

            const nextVisitRawDate = (job.customFields?.next_visit_date ?? job.customFields?.estimate_next_visit_date) as string | undefined
            const formattedNextVisit = nextVisitRawDate
              ? new Date(nextVisitRawDate).toLocaleDateString(lang === 'cz' ? 'cs-CZ' : 'sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })
              : null

            const clientProposal = job.customFields?.client_proposed_visit as {
              date?: string; time?: string; note?: string; status?: string
            } | undefined

            const formattedProposedDate = clientProposal?.date
              ? new Date(clientProposal.date).toLocaleDateString(lang === 'cz' ? 'cs-CZ' : 'sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })
              : null
            const proposalTime = clientProposal?.time ? ` o ${clientProposal.time}` : ''

            return (
              <div style={{ marginBottom: 16 }}>
                {/* Client proposal card — shown when proposal is pending */}
                {clientProposal?.status === 'pending' && formattedProposedDate && (
                  <div style={{
                    background: 'rgba(37,99,235,0.1)',
                    border: '1px solid rgba(37,99,235,0.3)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    marginBottom: 8,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>
                      {tl('📅 Klient navrhol termín', '📅 Klient navrhl termín')}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--blue, #2563eb)' }}>
                      {formattedProposedDate}{proposalTime}
                    </div>
                    {clientProposal.note && (
                      <div style={{ fontSize: 13, color: 'var(--g4, #9ca3af)', marginTop: 4 }}>
                        „{clientProposal.note}"
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        onClick={handleAcceptProposal}
                        disabled={savingNextVisit}
                        style={{
                          background: 'var(--gold, #DAA520)',
                          border: 'none',
                          borderRadius: 8,
                          padding: '7px 16px',
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#fff',
                          cursor: savingNextVisit ? 'not-allowed' : 'pointer',
                          opacity: savingNextVisit ? 0.6 : 1,
                        }}
                      >
                        {savingNextVisit ? tl('Ukladám…', 'Ukládám…') : tl('Prijať termín', 'Přijmout termín')}
                      </button>
                      <button
                        onClick={() => { setNextVisitValue(''); setEditingNextVisit(true) }}
                        style={{
                          background: 'none',
                          border: '1px solid rgba(37,99,235,0.4)',
                          borderRadius: 8,
                          padding: '7px 14px',
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--blue, #2563eb)',
                          cursor: 'pointer',
                        }}
                      >
                        {tl('Navrhnúť iný', 'Navrhnout jiný')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Main card */}
                <div style={{
                  background: isCakaMaterial
                    ? (hasDate ? 'rgba(218,165,32,0.1)' : 'rgba(239,68,68,0.1)')
                    : 'rgba(218,165,32,0.07)',
                  border: isCakaMaterial
                    ? (hasDate ? '1px solid rgba(218,165,32,0.3)' : '1px solid rgba(239,68,68,0.3)')
                    : '1px solid rgba(218,165,32,0.25)',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}>
                  {/* Delivery date section — only for caka_material */}
                  {isCakaMaterial && (
                    <>
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>
                          {hasDate
                            ? `${tl('📦 Dodanie materiálu:', '📦 Dodání materiálu:')} ${formattedDate}`
                            : tl('⚠️ Nezadaný termín dodania!', '⚠️ Nezadaný termín dodání!')}
                        </div>
                        {!editingDeliveryDate && (
                          <button
                            onClick={() => {
                              setDeliveryDateValue(rawDate ?? '')
                              setEditingDeliveryDate(true)
                            }}
                            style={{
                              background: 'none',
                              border: hasDate ? '1px solid rgba(218,165,32,0.5)' : '1px solid rgba(239,68,68,0.5)',
                              borderRadius: 8,
                              padding: '4px 10px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: hasDate ? 'var(--gold, #DAA520)' : 'var(--danger, #ef4444)',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {hasDate ? tl('Zmeniť', 'Změnit') : tl('Zadať termín', 'Zadat termín')}
                          </button>
                        )}
                      </div>

                      {/* Inline date picker for delivery date */}
                      <div ref={deliveryDateRef} />
                      {editingDeliveryDate && (
                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <input
                            type="date"
                            value={deliveryDateValue}
                            onChange={e => setDeliveryDateValue(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            style={{
                              border: '1px solid rgba(218,165,32,0.4)',
                              borderRadius: 8,
                              padding: '6px 10px',
                              fontSize: 14,
                              color: 'var(--dark)',
                              background: 'var(--surface, #fff)',
                              outline: 'none',
                              flex: '1 1 140px',
                            }}
                          />
                          <button
                            onClick={handleSaveDeliveryDate}
                            disabled={savingDeliveryDate || !deliveryDateValue}
                            style={{
                              background: 'var(--gold, #DAA520)',
                              border: 'none',
                              borderRadius: 8,
                              padding: '6px 14px',
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#fff',
                              cursor: savingDeliveryDate || !deliveryDateValue ? 'not-allowed' : 'pointer',
                              opacity: savingDeliveryDate || !deliveryDateValue ? 0.6 : 1,
                            }}
                          >
                            {savingDeliveryDate ? tl('Ukladám…', 'Ukládám…') : tl('Uložiť', 'Uložit')}
                          </button>
                          <button
                            onClick={() => setEditingDeliveryDate(false)}
                            style={{
                              background: 'none',
                              border: '1px solid var(--divider, #e5e7eb)',
                              borderRadius: 8,
                              padding: '6px 12px',
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--g4, #9ca3af)',
                              cursor: 'pointer',
                            }}
                          >
                            {tl('Zrušiť', 'Zrušit')}
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Next visit date section — shown in both phases */}
                  <div style={{
                    ...(isCakaMaterial ? { borderTop: '1px solid rgba(218,165,32,0.2)', marginTop: 12, paddingTop: 12 } : {}),
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>
                        {nextVisitRawDate
                          ? `${tl('🗓️ Ďalšia návšteva:', '🗓️ Další návštěva:')} ${formattedNextVisit}`
                          : tl('🗓️ Termín návštevy ešte nie je stanovený', '🗓️ Termín návštěvy ještě není stanoven')}
                      </div>
                      {!editingNextVisit && (
                        <button
                          onClick={() => { setNextVisitValue(nextVisitRawDate ?? ''); setEditingNextVisit(true) }}
                          style={{
                            background: 'none',
                            border: '1px solid rgba(218,165,32,0.5)',
                            borderRadius: 8,
                            padding: '4px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--gold, #DAA520)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {nextVisitRawDate ? tl('Zmeniť', 'Změnit') : tl('Naplánovať', 'Naplánovat')}
                        </button>
                      )}
                    </div>

                    {/* Inline date picker for next visit */}
                    {editingNextVisit && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <input
                          type="date"
                          value={nextVisitValue}
                          onChange={e => setNextVisitValue(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          style={{
                            border: '1px solid rgba(218,165,32,0.4)',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 14,
                            color: 'var(--dark)',
                            background: 'var(--surface, #fff)',
                            outline: 'none',
                            flex: '1 1 140px',
                          }}
                        />
                        <button
                          onClick={handleSaveNextVisit}
                          disabled={savingNextVisit || !nextVisitValue}
                          style={{
                            background: 'var(--gold, #DAA520)',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 14px',
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#fff',
                            cursor: savingNextVisit || !nextVisitValue ? 'not-allowed' : 'pointer',
                            opacity: savingNextVisit || !nextVisitValue ? 0.6 : 1,
                          }}
                        >
                          {savingNextVisit ? tl('Ukladám…', 'Ukládám…') : tl('Uložiť', 'Uložit')}
                        </button>
                        <button
                          onClick={() => setEditingNextVisit(false)}
                          style={{
                            background: 'none',
                            border: '1px solid var(--divider, #e5e7eb)',
                            borderRadius: 8,
                            padding: '6px 12px',
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--g4, #9ca3af)',
                            cursor: 'pointer',
                          }}
                        >
                          {tl('Zrušiť', 'Zrušit')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Job completion summary — shown after protocol sent */}
          {((): React.ReactNode => {
            const ps = job.customFields?.pending_settlement as {
              hours?: number; km?: number; materials?: Array<{ quantity?: number; pricePerUnit?: number }>
            } | undefined
            const isPostProtocol = ['protocol_sent', 'protocol_draft', 'departed',
              'settlement_review', 'settlement_confirmed', 'final_protocol_signed',
              'invoice_issued'].includes(job.techPhase || '')
            if (!isPostProtocol || !ps) return null
            const arrivedTs = job.customFields?.arrived_at as string | undefined
            const departedTs = job.customFields?.work_done_at as string | undefined
            const onSiteMin = arrivedTs && departedTs
              ? Math.round((new Date(departedTs).getTime() - new Date(arrivedTs).getTime()) / 60000)
              : null
            return (
              <div style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.03) 100%)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 14,
                padding: '16px 18px',
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)', marginBottom: 10 }}>
                  {'✅'} {tl('Zákazka dokončená', 'Zakázka dokončena')}
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
                  {onSiteMin != null && (
                    <div>
                      <span style={{ color: 'var(--g4)', fontWeight: 500 }}>{tl('Na mieste: ', 'Na místě: ')}</span>
                      <span style={{ fontWeight: 700, color: 'var(--dark)' }}>
                        {Math.floor(onSiteMin / 60)}h {onSiteMin % 60}m
                      </span>
                    </div>
                  )}
                  {ps.hours != null && (
                    <div>
                      <span style={{ color: 'var(--g4)', fontWeight: 500 }}>{tl('Práca: ', 'Práce: ')}</span>
                      <span style={{ fontWeight: 700, color: 'var(--dark)' }}>{ps.hours}h</span>
                    </div>
                  )}
                  {ps.km != null && (
                    <div>
                      <span style={{ color: 'var(--g4)', fontWeight: 500 }}>Km: </span>
                      <span style={{ fontWeight: 700, color: 'var(--dark)' }}>{ps.km} km</span>
                    </div>
                  )}
                  {ps.materials && ps.materials.length > 0 && (() => {
                    const matTotal = ps.materials.reduce((sum, m) => sum + (Number(m.quantity) || 1) * (Number(m.pricePerUnit) || 0), 0)
                    const cur = job.country === 'SK' ? '€' : 'Kč'
                    return (
                      <div>
                        <span style={{ color: 'var(--g4)', fontWeight: 500 }}>{tl('Materiál: ', 'Materiál: ')}</span>
                        <span style={{ fontWeight: 700, color: 'var(--dark)' }}>{Math.round(matTotal)} {cur}</span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )
          })()}



          {/* Live Pricing Widget — zatiaľ len pre operátora v CRM, nie pre technika */}

          {/* Surcharge Pending — prominent banner at top */}
          {job.techPhase === 'client_approval_pending' && job.clientSurcharge != null && job.clientSurcharge > 0 && (() => {
            const sc = calcSurchargeVat(job.clientSurcharge)
            return (
              <div className="ejc-section" style={{ marginBottom: 4 }}>
                <div className="ajf-surcharge-pending-banner">
                  <div className="ajf-surcharge-pending-title">
                    {'⏳'} {tl('Čaká sa na schválenie doplatku', 'Čeká se na schválení doplatku')}
                  </div>
                  <div className="ajf-surcharge-pending-amount">
                    {sc.withVat.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
                  </div>
                  <div className="ajf-surcharge-pending-detail">
                    <span>{tl('Bez DPH', 'Bez DPH')}: <strong>{sc.noVat.toFixed(2)} Kč</strong></span>
                    <span>DPH ({surchargeVatRate}%): <strong>{sc.vat.toFixed(2)} Kč</strong></span>
                  </div>
                  {/* DPH sadzba sa určuje automaticky: material-only → 21%, inak 12% (CZ) */}
                  <div className="ajf-surcharge-pending-note">
                    {tl(
                      'Klientovi bol odoslaný doplatok na schválenie. Po schválení môžete pokračovať.',
                      'Klientovi byl odeslán doplatek ke schválení. Po schválení můžete pokračovat.'
                    )}
                  </div>
                  {/* Finálny rozpis len po vyúčtovaní (step ≥ 9), nie po odhade/diagnostike */}
                  {crmStep >= 9 && !!job.customFields?.settlement_data && (
                    <button
                      onClick={() => {
                        const freshSd = job.customFields?.settlement_data as import('@/types/dispatch').SettlementData | undefined
                        if (freshSd) setSettlementData(freshSd)
                        setShowSettlementResult(true)
                      }}
                      style={{
                        background: 'none', border: '1px solid var(--gold)', borderRadius: 8,
                        padding: '8px 16px', marginTop: 8, cursor: 'pointer', fontSize: 13,
                        color: 'var(--gold)', fontWeight: 600, width: '100%',
                      }}
                    >
                      {tl('Zobraziť finálny rozpis', 'Zobrazit finální rozpis')}
                    </button>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Settlement-phase surcharge waiting (surcharge_sent) */}
          {job.techPhase === 'surcharge_sent' && job.clientSurcharge != null && job.clientSurcharge > 0 && (() => {
            const sc = calcSurchargeVat(job.clientSurcharge)
            return (
              <div className="ejc-section" style={{ marginBottom: 4 }}>
                <div className="ajf-surcharge-pending-banner">
                  <div className="ajf-surcharge-pending-title">
                    {'⏳'} {tl('Čaká sa na schválenie doplatku', 'Čeká se na schválení doplatku')}
                  </div>
                  <div className="ajf-surcharge-pending-amount">
                    {sc.withVat.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {job.country === 'SK' ? '€' : 'Kč'}
                  </div>
                  <div className="ajf-surcharge-pending-note">
                    {tl(
                      'Klientovi bol odoslaný finálny doplatok na schválenie.',
                      'Klientovi byl odeslán finální doplatek ke schválení.'
                    )}
                  </div>
                  {/* Finálny rozpis len ak existuje settlement_data */}
                  {!!job.customFields?.settlement_data && (
                    <button
                      onClick={() => {
                        const freshSd = job.customFields?.settlement_data as import('@/types/dispatch').SettlementData | undefined
                        if (freshSd) setSettlementData(freshSd)
                        setShowSettlementResult(true)
                      }}
                      style={{
                        background: 'none', border: '1px solid var(--gold)', borderRadius: 8,
                        padding: '8px 16px', marginTop: 8, cursor: 'pointer', fontSize: 13,
                        color: 'var(--gold)', fontWeight: 600, width: '100%',
                      }}
                    >
                      {tl('Zobraziť finálny rozpis', 'Zobrazit finální rozpis')}
                    </button>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Surcharge Approved — prominent banner at top */}
          {job.techPhase === 'client_approved' && job.clientSurcharge != null && job.clientSurcharge > 0 && (() => {
            const sc = calcSurchargeVat(job.clientSurcharge)
            return (
              <div className="ejc-section" style={{ marginBottom: 4 }}>
                <div className="ajf-status-banner-success" style={{
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 4 }}>
                    {'✅'} {tl('Doplatok schválený zákazníkom', 'Doplatek schválen zákazníkem')}
                  </div>
                  <div className="banner-amount" style={{ fontSize: '28px', fontWeight: 800, margin: '4px 0' }}>
                    {sc.withVat.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '12px', marginBottom: 6 }}>
                    <span>{tl('Bez DPH', 'Bez DPH')}: <strong>{sc.noVat.toFixed(2)} Kč</strong></span>
                    <span>DPH ({surchargeVatRate}%): <strong>{sc.vat.toFixed(2)} Kč</strong></span>
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
                    {tl('Môžete začať s opravou.', 'Můžete začít s opravou.')}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Surcharge Declined — alert banner */}
          {job.techPhase === 'client_declined' && job.clientSurcharge != null && job.clientSurcharge > 0 && (() => {
            const sc = calcSurchargeVat(job.clientSurcharge)
            return (
              <div className="ejc-section" style={{ marginBottom: 4 }}>
                <div className="ajf-status-banner-danger" style={{
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 4 }}>
                    {'❌'} {tl('Doplatok odmietnutý zákazníkom', 'Doplatek odmítnut zákazníkem')}
                  </div>
                  <div className="banner-amount" style={{ fontSize: '28px', fontWeight: 800, margin: '4px 0' }}>
                    {sc.withVat.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '12px', marginBottom: 6 }}>
                    <span>{tl('Bez DPH', 'Bez DPH')}: <strong>{sc.noVat.toFixed(2)} Kč</strong></span>
                    <span>DPH ({surchargeVatRate}%): <strong>{sc.vat.toFixed(2)} Kč</strong></span>
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
                    {tl('Kontaktujte dispečera pre ďalší postup.', 'Kontaktujte dispečera pro další postup.')}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Surcharge Waived — shown when operator advanced past surcharge step without client approval */}
          {crmStep >= 5 && job.customFields?.surcharge_waived === true && (() => {
            return (
              <div className="ejc-section" style={{ marginBottom: 4 }}>
                <div style={{
                  borderRadius: '12px',
                  padding: '14px 16px',
                  textAlign: 'center',
                }}
                className="ajf-status-banner-info"
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 4 }}>
                    {'✅'} {tl('Doplatok zrušený operátorom', 'Doplatek zrušen operátorem')}
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
                    {tl(
                      'Zákazka pokračuje bez doplatku. Môžete pokračovať s opravou.',
                      'Zakázka pokračuje bez doplatku. Můžete pokračovat s opravou.'
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Job details — collapsible */}
          <div data-help-target="job-info-sections">
          <CollapsibleSection title={tl('Detaily zákazky', 'Detaily zakázky')} icon={String(categoryIcon)}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              fontSize: '13px',
              paddingTop: 8,
            }}>
              <span style={{ fontWeight: 600 }}>
                {getCategoryLabel(job.category)}
              </span>
              <span style={{
                background: insuranceColor,
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
              }}>
                {insuranceShort}
              </span>
              <span style={{ color: 'var(--text-secondary, #4B5563)', fontSize: '12px' }}>
                {job.referenceNumber}
              </span>
            </div>
            {(job.subject || job.name) && (
              <div style={{
                fontSize: '14px',
                color: 'var(--text-primary)',
                lineHeight: 1.5,
                marginTop: '8px',
                padding: '10px',
                background: 'var(--bg-elevated, var(--surface, #FAF8F5))',
                borderRadius: '8px',
              }}>
                {job.subject || job.name}
              </div>
            )}
          </CollapsibleSection>

          {/* Diagnostic Details — collapsible */}
          {(() => {
            const diag = job.customFields?.diagnostic as DiagData | undefined
            if (!diag) return null
            return (
              <CollapsibleSection title={tl('Informácie od klienta', 'Informace od klienta')} icon="🔍">
                <div style={{ paddingTop: 8 }}>
                  <DiagnosticDetails diag={diag} expanded />
                </div>
              </CollapsibleSection>
            )
          })()}

          {/* Diagnostic Brain — collapsible */}
          {(job.customFields?.diag_result || job.customFields?.photo_analysis) ? (
            <CollapsibleSection title="AI Diagnostika" icon="🤖" defaultOpen={crmStep <= 3}>
              <div style={{ paddingTop: 8 }}>
                <DiagnosticBrainCard
                  diagResult={job.customFields.diag_result as DiagResult | undefined}
                  photoAnalysis={job.customFields.photo_analysis as any}
                  jobId={job.id ? Number(job.id) : undefined}
                  jobCrmStep={job.crmStep}
                  lang={lang}
                />
              </div>
            </CollapsibleSection>
          ) : null}

          {/* EA coverage warnings */}
          {(() => {
            const eaW = job.customFields?.ea_coverage_warnings as string[] | undefined
            if (!eaW?.length) return null
            return (
              <div style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--warning-bg, #fffbeb)',
                border: '1px solid var(--warning-border, #fcd34d)',
                margin: '0 16px 12px',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning-text, #92400e)', marginBottom: 4 }}>
                  ⚠️ {tl('Upozornenie k poistnému krytiu', 'Upozornění k pojistnému krytí')}
                </div>
                {eaW.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--warning-text, #92400e)', paddingLeft: 12, marginBottom: 2 }}>
                    • {w}
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Customer photos are shown in JobDocumentsSection below (FOTOGRAFIE section) */}

          {/* Job Documents — collapsible */}
          <CollapsibleSection title={tl('Dokumenty a protokoly', 'Dokumenty a protokoly')} icon="📄" defaultOpen>
            <div style={{ paddingTop: 8 }}>
              <JobDocumentsSection jobId={job.id} lang={lang} isVisible={true} />
            </div>
          </CollapsibleSection>

          {/* Surcharge boxes removed — moved to top of page */}

          {/* Action Needed */}
          {job.actionNeeded && (
            <div className="ejc-section">
              <div className="ejc-section-title">
                {t('dispatch.actionNeeded')}
              </div>
              <div className="ejc-action-needed">{job.actionNeeded}</div>
            </div>
          )}

          {/* Approved Pricing — collapsible */}
          {job.approvedTotal != null && (
            <CollapsibleSection title={t('dispatch.invoicing')} icon="💰" badge={`${job.approvedTotal.toFixed(0)} Kč`}>
              <div className="ejc-pricing-rows" style={{ paddingTop: 8 }}>
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
                {job.clientSurcharge != null && job.clientSurcharge > 0 && (() => {
                  const sc = calcSurchargeVat(job.clientSurcharge)
                  return (
                    <>
                      <div className="ejc-pricing-row">
                        <span className="ejc-pricing-label">{t('dispatch.clientSurcharge')}</span>
                        <span className="ejc-pricing-value">{sc.withVat.toFixed(2)} Kč</span>
                      </div>
                      <div style={{ paddingLeft: '12px', marginBottom: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--g4)', padding: '1px 0' }}>
                          <span>{tl('Bez DPH', 'Bez DPH')}</span>
                          <span>{sc.noVat.toFixed(2)} Kč</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--g4)', padding: '1px 0' }}>
                          <span>DPH ({surchargeVatRate}%)</span>
                          <span>{sc.vat.toFixed(2)} Kč</span>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
              <div className="ejc-pricing-total">
                <span className="ejc-pricing-total-label">{t('dispatch.invoiceTotal')}</span>
                <span className="ejc-pricing-total-value">{job.approvedTotal.toFixed(2)} Kč</span>
              </div>
            </CollapsibleSection>
          )}


          </div>{/* end job-info-sections */}

          {/* Bottom spacer so content clears the fixed bottom bar */}
          <div style={{ height: 220 }} />
        </div>{/* end ajf-detail */}

        {/* ═══════ FIXED BOTTOM BAR ═══════ */}
        <div className="ajf-bottom-area" data-help-target="job-action-button">

          {smartButton.variant === 'waiting' ? (
            <button className="ajf-smart-action waiting" disabled>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--gold, #c9a84c)', animation: 'ajf-waitpulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
              <span>{smartButton.label}</span>
            </button>
          ) : smartButton.variant === 'disabled' ? (
            <button className="ajf-smart-action done-state" disabled>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{smartButton.label}</span>
            </button>
          ) : (
            <button
              className="ajf-smart-action gold"
              disabled={isActionPending}
              onClick={handleSmartButtonClick}
            >
              {isActionPending ? (
                <span className="spinner-sm" />
              ) : (
                <span>{smartButton.label}</span>
              )}
            </button>
          )}
          {smartButton.variant === 'waiting' && smartButton.waitingMessage && (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary, var(--g5))', marginTop: 6 }}>
              {smartButton.waitingMessage}
            </div>
          )}

          {/* Multi-visit interrupt banner — shown when estimate flagged needsNextVisit */}
          {job.techPhase === 'working' && job.customFields?.pending_visit_protocol === true && !showVisitChoiceModal && !pendingVisitCleared && (
            <div className="ajf-multivist-banner">
              <div className="banner-text">
                {job.customFields?.estimate_next_visit_reason
                  ? tl(
                      `V odhade ste uviedli dôvod ďalšej návštevy: ${VISIT_REASON_LABELS[job.customFields.estimate_next_visit_reason as string]?.sk || job.customFields.estimate_next_visit_reason}`,
                      `V odhadu jste uvedli důvod další návštěvy: ${VISIT_REASON_LABELS[job.customFields.estimate_next_visit_reason as string]?.cz || job.customFields.estimate_next_visit_reason}`
                    )
                  : tl('Táto zákazka vyžaduje ďalšiu návštevu', 'Tato zakázka vyžaduje další návštěvu')
                }
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="ajf-secondary-btn"
                  style={{ flex: 1, background: '#F59E0B', color: '#fff', border: 'none', fontWeight: 600 }}
                  disabled={isActionPending}
                  onClick={() => setShowLeaveConfirm({ step: 'reason' })}
                >
                  {tl('Prerušiť prácu', 'Přerušit práci')}
                </button>
                <button
                  className="close-btn"
                  onClick={clearPendingVisitProtocol}
                >
                  {tl('Zavrieť', 'Zavřít')}
                </button>
              </div>
            </div>
          )}

          {/* Secondary: Revise estimate */}
          {crmStep >= 3 && crmStep <= 6 && job.estimateData != null && (
            <button className="ajf-secondary-btn" onClick={() => { setIsRevision(true); setShowEstimateModal(true) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              {t('dispatch.btn.revise_estimate')}
            </button>
          )}

          {/* Secondary: Review settlement */}
          {crmStep === 7 && !!job.customFields?.pending_settlement &&
            !job.customFields?.settlement_confirmed_at &&
            !(job.techPhase?.includes('confirmed')) && (
            <button className="ajf-secondary-btn gold" onClick={() => setShowSettlementModal(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
              {t('dispatch.btn.review_settlement')}
            </button>
          )}

          {/* Secondary: Finish all visits */}
          {canFinishAllVisits && (
            <button className="ajf-secondary-btn success" disabled={isActionPending} onClick={() => setShowWorkDoneConfirm(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {t('dispatch.btn.finish_all_visits')}
            </button>
          )}

          {/* Quick action bar — same as hero pills: Navigate, Call, Chat */}
          <div className="ajf-pills">
            <a
              className="ajf-pill nav"
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([job.customerAddress, job.customerCity].filter(Boolean).join(', '))}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { e.stopPropagation(); onNavigate?.(job.customerAddress, job.customerCity) }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"/></svg>
              {t('dispatch.navigate')}
            </a>
            <a className="ajf-pill call" href={`tel:${job.customerPhone}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
              {lang === 'cz' ? 'Zavolat' : 'Zavolať'}
            </a>
            <button className="ajf-pill chat" onClick={() => setShowChatModal(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
              Chat
            </button>
          </div>

          {/* Backup protocol panel — inline under quick bar */}
          {showBackupMenu && (
            <>
            <div style={{
              textAlign: 'center',
              marginTop: 10,
              fontSize: 11,
              color: 'var(--text-secondary, #6b7280)',
              fontStyle: 'italic',
            }}>
              {tl('Záložný protokol — použite pri výpadku aplikácie', 'Záložní protokol — použijte při výpadku aplikace')}
            </div>
            <div style={{
              display: 'flex',
              gap: 8,
              marginTop: 6,
            }}>
              {/* Download — window.location triggers Content-Disposition download, no async needed */}
              <button
                onClick={() => {
                  window.location.assign('/api/dispatch/backup-protocol')
                  setShowBackupMenu(false)
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '14px 10px',
                  borderRadius: 12,
                  border: '1.5px solid var(--gold, #D4A843)',
                  background: 'linear-gradient(135deg, rgba(212,168,67,0.06) 0%, rgba(212,168,67,0.02) 100%)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ pointerEvents: 'none', width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold, #D4A843), #aa771c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </span>
                <span style={{ pointerEvents: 'none', fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #1f2937)', textAlign: 'center', lineHeight: 1.3 }}>
                  {tl('Stiahnuť prázdny', 'Stáhnout prázdný')}
                </span>
                <span style={{ pointerEvents: 'none', fontSize: 10, color: 'var(--text-secondary, #6b7280)' }}>PDF</span>
              </button>

              {/* Upload — real <label> + <input> in DOM, no programmatic click */}
              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '14px 10px',
                  borderRadius: 12,
                  border: '1.5px solid var(--success, #22c55e)',
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(34,197,94,0.02) 100%)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    e.target.value = ''
                    if (file.size > 10 * 1024 * 1024) {
                      setActionError(tl('Súbor je príliš veľký (max 10 MB)', 'Soubor je příliš velký (max 10 MB)'))
                      setShowBackupMenu(false)
                      return
                    }
                    const reader = new FileReader()
                    reader.onload = async () => {
                      const base64 = reader.result as string
                      try {
                        const res = await fetch('/api/dispatch/backup-protocol', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            jobId: job.id,
                            filename: `backup-protocol-${Date.now()}.${file.name.split('.').pop()}`,
                            data: base64,
                          }),
                        })
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({}))
                          setActionError(err.error || tl('Nahrávanie zlyhalo', 'Nahrávání selhalo'))
                        } else {
                          setActionError(null)
                          onJobUpdated?.()
                        }
                      } catch {
                        setActionError(tl('Nahrávanie zlyhalo', 'Nahrávání selhalo'))
                      }
                      setShowBackupMenu(false)
                    }
                    reader.readAsDataURL(file)
                  }}
                />
                <span style={{ pointerEvents: 'none', width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--success, #22c55e), #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </span>
                <span style={{ pointerEvents: 'none', fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #1f2937)', textAlign: 'center', lineHeight: 1.3 }}>
                  {tl('Nahrať vyplnený', 'Nahrát vyplněný')}
                </span>
                <span style={{ pointerEvents: 'none', fontSize: 10, color: 'var(--text-secondary, #6b7280)' }}>foto / PDF</span>
              </label>
            </div>
            </>
          )}

          {/* Interrupt work — always visible standalone button */}
          {canInterrupt && (
            <button
              onClick={() => setShowRescheduleModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '12px 16px',
                marginTop: 8,
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.25)',
                borderRadius: 12,
                color: '#dc2626',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              {lang === 'cz' ? 'Přerušit práci' : 'Prerušiť prácu'}
            </button>
          )}
        </div>{/* end ajf-bottom-area */}

      </div>{/* end active-job-fullscreen */}

      {/* ═══════ MODALS — same as ExpandableJobCard ═══════ */}

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <PhotoUploadModal
          job={job}
          lang={lang}
          techPhase={job.techPhase}
          onClose={() => setShowPhotoModal(false)}
          onPhotosComplete={async () => {
            setShowPhotoModal(false)
            if (onStepAction) {
              setIsActionPending(true)
              try {
                if (job.techPhase === 'work_completed') {
                  // Final photos: advance to settlement
                  await onStepAction(job.id, 'finalize_work' as TechActionType)
                } else if ((job.crmStep ?? 99) <= 3 && job.techPhase === 'arrived') {
                  // Diagnostic photos at step ≤3: submit diagnostic
                  await onStepAction(job.id, 'submit_diagnostic')
                }
                // Otherwise: standalone photo upload — refresh job to update button
                onJobUpdated?.()
              } finally {
                setIsActionPending(false)
              }
            }
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

      {/* Invoice Form Modal — system generated */}
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

      {/* Invoice Upload Modal — CZ self issued */}
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

      {/* Diagnostic Choice Modal */}
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

      {/* Diagnostic End Modal */}
      {showDiagnosticEndModal && (
        <DiagnosticEndModal
          job={job}
          lang={lang}
          isSubmitting={isSubmittingEstimate}
          onSubmit={async (data) => {
            if (!onSubmitEstimate) return
            setIsSubmittingEstimate(true)
            try {
              const ok = await onSubmitEstimate(job.id, data)
              if (ok) setShowDiagnosticEndModal(false)
            } finally {
              setIsSubmittingEstimate(false)
            }
          }}
          onCancel={() => setShowDiagnosticEndModal(false)}
        />
      )}

      {/* Estimate Form Modal */}
      {showEstimateModal && (
        <EstimateFormModal
          job={job}
          lang={lang}
          isSubmitting={isSubmittingEstimate}
          onSubmit={async (data) => {
            if (isRevision) {
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

      {/* G4: Settlement Review Modal */}
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
                setActionError('Chyba pri odoslaní opravy. Skúste to znova.')
                return
              }
            } catch {
              setActionError(tl('Chyba pripojenia. Skúste to znova.', 'Chyba připojení. Zkuste to znovu.'))
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
              onJobUpdated?.()
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

      {showMaterialChecklist && (
        <MaterialChecklistModal
          parts={(() => {
            const dr = job.customFields?.diag_result as DiagResult | undefined
            // Payer info from pricing engine (estimate_coverage_verdicts, set at submit_estimate)
            const ecv = Array.isArray(job.customFields?.estimate_coverage_verdicts)
              ? (job.customFields.estimate_coverage_verdicts as Array<{ itemName?: string; suggestedPayer?: 'pojistovna' | 'klient'; reason?: string; covered?: boolean }>)
              : []
            // Estimate materials for name matching
            const estMats = Array.isArray(job.customFields?.estimate_materials)
              ? (job.customFields.estimate_materials as Array<{ name?: string }>)
              : []

            // Normalize: lowercase + strip diacritics for reliable matching
            const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

            function getPayerForPart(partName: string): { suggestedPayer?: 'pojistovna' | 'klient'; coverageReason?: string } {
              if (ecv.length === 0) return {} // no verdicts yet — don't show payer
              const pn = norm(partName)
              // Match by itemName in verdict
              const byName = ecv.find(v => v.itemName && norm(v.itemName) === pn)
              if (byName) return {
                suggestedPayer: byName.covered === false ? 'klient' : (byName.suggestedPayer ?? 'pojistovna'),
                coverageReason: byName.reason,
              }
              // Match by index in estimate_materials
              const estIdx = estMats.findIndex(m => m.name && norm(m.name) === pn)
              if (estIdx >= 0 && ecv[estIdx]) return {
                suggestedPayer: ecv[estIdx].covered === false ? 'klient' : (ecv[estIdx].suggestedPayer ?? 'pojistovna'),
                coverageReason: ecv[estIdx].reason,
              }
              return {} // no match — don't show payer badge
            }

            let rawParts: Array<{ name: string; qty: number; unit: string; brands?: string[] }> = []
            if (dr?.partsListUnion?.length) {
              rawParts = dr.partsListUnion
            } else if (dr?.scenarios?.length) {
              const seen = new Set<string>()
              for (const s of dr.scenarios) {
                for (const p of s.requiredParts || []) {
                  const k = p.name.toLowerCase()
                  if (!seen.has(k)) { seen.add(k); rawParts.push({ name: p.name, qty: p.qty, unit: p.unit, brands: p.brands }) }
                }
              }
            }
            // Enrich with payer from pricing engine verdicts
            return rawParts.map(p => ({ ...p, ...getPayerForPart(p.name) }))
          })()}
          onConfirm={handleMaterialChecklistConfirm}
          onClose={() => setShowMaterialChecklist(false)}
        />
      )}

      <DispatchToast
        message={actionError ?? ''}
        type="error"
        visible={!!actionError}
        onClose={() => setActionError(null)}
      />
      <DispatchToast
        message={scheduleSuccess ?? ''}
        type="success"
        visible={!!scheduleSuccess}
        onClose={() => setScheduleSuccess(null)}
      />
    </>
  )
}
