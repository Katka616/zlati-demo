'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useToast } from '@/components/admin/Toast'
import { useAuth } from '@/hooks/useAuth'
import type { PricingOverrides } from '@/lib/pricing-engine'
import { fetchJobDetail } from '@/lib/jobActions'
import {
  pricingApiToDisplayPricing,
  apiToJob,
  getLivePricingPreconditionError,
  emptyTechPhase,
  type JobTechnicianSummary,
  type ApiPartner,
  type ApiTechnician,
} from '@/lib/jobAdapter'
import type { RescheduleRequest } from '@/types/reschedule'
import type { Job, TechPhase, Pricing } from '@/data/mockData'

// ── Types re-exported for consumers ──────────────────────────────

export type { JobTechnicianSummary, ApiPartner, ApiTechnician }

// Estimate draft type
export type EstimateDraft = {
  hours: string
  kmPerVisit: string
  visits: number
  materials: Array<{ id: string; name: string; quantity: string; unit: string; pricePerUnit: string; type?: string }>
}

// Protocol draft types
export type ProtocolVisitDraft = { date: string; arrival: string; departure: string; hours: number; km: number }
export type ProtocolPartDraft  = { id: string; name: string; quantity: number; unit: string; price: string; type: string; payer: string }
export type ProtocolDraft = {
  visits: ProtocolVisitDraft[]
  workDescription: string
  techNotes: string
  diagnosticResult: string
  nonCompletionReason: string
  recommendations: string
  surchargeReason: string
  workDone: string
  nextVisitReason: string
  spareParts: ProtocolPartDraft[]
}

// ── Polling interval ───────────────────────────────────────────────

const POLL_INTERVAL_MS = 15_000

// ── useJobDetail hook ─────────────────────────────────────────────

export function useJobDetail() {
  const params = useParams()
  const jobId = Number(params?.id)
  const { technician: currentOperator } = useAuth()

  // ─── State ──────────────────────────────────────────────────────
  const [job, setJob] = useState<Job | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [techPhase, setTechPhase] = useState<TechPhase>(emptyTechPhase)
  const [technicianData, setTechnicianData] = useState<JobTechnicianSummary | null>(null)
  const [partnerData, setPartnerData] = useState<{ id: number; name: string; code: string; color: string } | null>(null)
  const [assignedOperator, setAssignedOperator] = useState<{ id: number; name: string; phone: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMockMode, setIsMockMode] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingCustomer, setIsEditingCustomer] = useState(false)
  const [isEditingDiag, setIsEditingDiag] = useState(false)
  const [customerEdit, setCustomerEdit] = useState<{
    customer_name: string
    customer_phone: string
    customer_email: string
    customer_address: string
    customer_city: string
    customer_psc: string
    customer_country: string
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showBankImport, setShowBankImport] = useState(false)
  const [backwardModal, setBackwardModal] = useState<{ targetStep: number } | null>(null)
  const [backwardReason, setBackwardReason] = useState('')
  const [forwardOverrideModal, setForwardOverrideModal] = useState<{ targetStep: number; blockedBy: string; techPhase?: string } | null>(null)
  const [forwardOverrideReason, setForwardOverrideReason] = useState('')
  const [partners, setPartners] = useState<ApiPartner[]>([])
  const [technicians, setTechnicians] = useState<ApiTechnician[]>([])
  const { toasts, showToast, dismissToast } = useToast()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isAnyEditingRef = useRef(false)
  const [livePricing, setLivePricing] = useState<Pricing | null>(null)
  const [livePricingError, setLivePricingError] = useState<string | null>(null)
  const [pricingOverrides, setPricingOverrides] = useState<PricingOverrides>({})
  const [techPhotos, setTechPhotos] = useState<{ id: number; filename: string; data: string; created_at: string; source?: string }[]>([])
  const [techPhotosLoaded, setTechPhotosLoaded] = useState(false)
  const [expandedTechPhoto, setExpandedTechPhoto] = useState<string | null>(null)
  const [eaReportText, setEaReportText] = useState<string | null>(null)
  const [activeReschedule, setActiveReschedule] = useState<RescheduleRequest | null>(null)
  const [showTechCalendar, setShowTechCalendar] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showSmsModal, setShowSmsModal] = useState(false)
  const [showTechSmsModal, setShowTechSmsModal] = useState(false)
  const [showVoicebotModal, setShowVoicebotModal] = useState(false)
  const [voicebotInitialRecipient, setVoicebotInitialRecipient] = useState<'customer' | 'technician'>('customer')
  const [showCustomerWaModal, setShowCustomerWaModal] = useState(false)
  const [showTechWaModal, setShowTechWaModal] = useState(false)
  const [showCustomerEmailDrawer, setShowCustomerEmailDrawer] = useState(false)
  const [showTechEmailDrawer, setShowTechEmailDrawer] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [quickChatTarget, setQuickChatTarget] = useState<'client' | 'technician' | null>(null)
  const [jobNextSteps, setJobNextSteps] = useState<number[]>([])
  const [matchDistance, setMatchDistance] = useState<number | null>(null)

  // ─── Estimate inline edit ────────────────────────────────────────
  const [isEditingEstimate, setIsEditingEstimate] = useState(false)
  const [estimateDraft, setEstimateDraft] = useState<EstimateDraft | null>(null)
  const [isSavingEstimate, setIsSavingEstimate] = useState(false)

  // ─── Protocol inline edit ────────────────────────────────────────
  const [editingProtocolIdx, setEditingProtocolIdx] = useState<number | null>(null)
  const [protocolDraft, setProtocolDraft] = useState<ProtocolDraft | null>(null)
  const [isSavingProtocol, setIsSavingProtocol] = useState(false)

  // ─── isAnyEditingRef sync ────────────────────────────────────────
  useEffect(() => {
    isAnyEditingRef.current = isEditing || isEditingCustomer || isEditingEstimate
  }, [isEditing, isEditingCustomer, isEditingEstimate])

  // ─── refreshLivePricing ──────────────────────────────────────────
  const refreshLivePricing = useCallback(async (
    jobSnapshot: Job,
    technicianInfo: JobTechnicianSummary | null,
  ) => {
    const preconditionError = getLivePricingPreconditionError(jobSnapshot, technicianInfo)
    if (preconditionError) {
      setLivePricing(null)
      setPricingOverrides({})
      setLivePricingError(preconditionError)
      return
    }

    try {
      const prRes = await fetch(`/api/jobs/${jobId}/pricing`, { credentials: 'include' })
      if (prRes.ok) {
        const prData = await prRes.json()
        const displayPr = pricingApiToDisplayPricing(prData)
        setLivePricing(displayPr)
        setPricingOverrides((prData.activeOverrides as PricingOverrides) ?? {})
        setLivePricingError(null)

        // Auto-storno doplatku: ak pricing vráti 0 surcharge, job je na kroku 5,
        // a v DB existuje doplatok > 0 → automaticky stornovať
        const cf = (jobSnapshot.custom_fields ?? {}) as Record<string, unknown>
        const existingSurcharge = Number(cf.client_surcharge ?? 0)
        const pricingSurcharge = displayPr.surchargeTotal ?? 0
        const jobStep = jobSnapshot.currentStep ?? (cf.crm_step as number) ?? 0

        if (jobStep === 5 && existingSurcharge > 0 && pricingSurcharge === 0) {
          // Only notify operator — do NOT auto-cancel (pricing could be wrong)
          showToast(
            `⚠️ Pricing ukazuje 0 doplatok (pôvodný: ${existingSurcharge} Kč). Ak je to správne, kliknite "Stornovať doplatok".`,
            'warning'
          )
        }
      } else {
        const errData = await prRes.json().catch(() => ({}))
        setLivePricing(null)
        setPricingOverrides({})
        setLivePricingError(errData.error ?? 'pricing_unavailable')
      }
    } catch {
      setLivePricing(null)
      setPricingOverrides({})
      setLivePricingError('pricing_unavailable')
    }
  }, [jobId, showToast])

  // ─── loadJob ─────────────────────────────────────────────────────
  // NOTE: loadJob must be defined BEFORE saveEstimate to avoid TDZ in prod build
  const loadJob = useCallback(async (silent = false) => {
    if (!jobId || isNaN(jobId)) return

    try {
      const detail = await fetchJobDetail(jobId)

      if (!detail.success) {
        if (detail.error === 'unauthorized' || detail.error === 'forbidden') {
          window.location.href = '/login?redirect=/admin/jobs/' + jobId
          return
        }
        if (!silent) showToast(`Chyba: ${detail.error}`, 'error')
        return
      }

      if (!detail.job) {
        setIsMockMode(detail.source === 'dev')
        setJob(null)
        setTechnicianData(null)
        setPartnerData(null)
        setLivePricing(null)
        setPricingOverrides({})
        setLivePricingError(null)
        return
      }

      const { job: adaptedJob, techPhase: tp, technicianInfo, partnerInfo } = apiToJob(detail)
      if (silent && isAnyEditingRef.current) return
      setJob(adaptedJob)
      setCurrentStep(adaptedJob.currentStep)
      setTechPhase(tp)
      setJobNextSteps(detail.status?.nextSteps || [])
      setTechnicianData(technicianInfo || null)
      setPartnerData(partnerInfo)
      setMatchDistance(detail.matchDistance ?? null)
      setAssignedOperator(detail.assignedOperator ?? null)
      setIsMockMode(false)

      await refreshLivePricing(adaptedJob, technicianInfo || null)

      if (adaptedJob.currentStep >= 12) {
        try {
          const invRes = await fetch(`/api/jobs/${jobId}/invoice-data`, { credentials: 'include' })
          if (invRes.ok) {
            const invData = await invRes.json()
            setJob(prev => prev ? { ...prev, invoiceData: invData } : prev)
          }
        } catch { /* invoice data optional — don't break the page */ }
      }

      try {
        const photoSources = [
          'portal_diagnostic', 'technician_diagnostic', 'technician_dispatch',
          'technician_final', 'protocol_photo', 'operator_upload',
        ]
        const photoResults = await Promise.allSettled(
          photoSources.map(s => fetch(`/api/admin/jobs/${jobId}/photos?source=${s}`, { credentials: 'include' }))
        )
        const combined: { id: number; filename: string; data: string; created_at: string; source?: string }[] = []
        for (const res of photoResults) {
          if (res.status === 'fulfilled' && res.value.ok) {
            const d = await res.value.json()
            if (d.success) combined.push(...d.photos)
          }
        }
        combined.sort((a, b) => a.created_at.localeCompare(b.created_at))
        setTechPhotos(combined)
      } catch { /* non-critical */ } finally { setTechPhotosLoaded(true) }

      fetch(`/api/reschedule/by-job/${jobId}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          const active = data?.reschedules?.find(
            (r: RescheduleRequest) => ['pending', 'counter_proposed'].includes(r.status)
          )
          setActiveReschedule(active || null)
        })
        .catch(err => console.warn('[JobDetail] Reschedule load failed:', err))
    } catch (err) {
      console.error('[JobDetail] Load failed:', err)
      if (!silent) showToast('Nepodarilo sa načítať zákazku', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [jobId, refreshLivePricing, showToast])

  // ─── saveEstimate ─────────────────────────────────────────────────
  const saveEstimate = useCallback(async () => {
    if (!estimateDraft) return
    setIsSavingEstimate(true)
    const hours = parseFloat(estimateDraft.hours) || 0
    const km = parseFloat(estimateDraft.kmPerVisit) || 0
    const parsedMats = estimateDraft.materials.map(m => ({
      ...m,
      quantity: parseFloat(m.quantity) || 0,
      pricePerUnit: parseFloat(m.pricePerUnit) || 0,
    }))
    const materialTotal = parsedMats.reduce((s, m) => s + m.quantity * m.pricePerUnit, 0)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          custom_fields: {
            estimate_hours: hours,
            estimate_km_per_visit: km,
            estimate_visits: estimateDraft.visits,
            estimate_materials: JSON.stringify(parsedMats),
            estimate_material_total: Math.round(materialTotal * 100) / 100,
            estimate_amount: Math.round(materialTotal * 100) / 100,
          },
        }),
      })
      if (res.status === 409) {
        showToast('Odhad je uzamknutý — zákazka má odoslaný protokol', 'error')
        setIsEditingEstimate(false)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      showToast('Odhad uložený ✅', 'success')
      setIsEditingEstimate(false)
      loadJob(true)
    } catch {
      showToast('Nepodarilo sa uložiť odhad', 'error')
    } finally {
      setIsSavingEstimate(false)
    }
  }, [estimateDraft, jobId, showToast, loadJob])

  // ─── startEditEstimate ────────────────────────────────────────────
  const startEditEstimate = useCallback(() => {
    setEstimateDraft({
      hours: String(techPhase.estimateHours || ''),
      kmPerVisit: String(techPhase.estimateKmPerVisit || ''),
      visits: techPhase.estimateVisits || 1,
      materials: (techPhase.estimateMaterials || []).map(m => ({
        ...m,
        quantity: String(m.quantity ?? ''),
        pricePerUnit: String(m.pricePerUnit ?? ''),
      })),
    })
    setIsEditingEstimate(true)
  }, [techPhase])

  // ─── startEditProtocol ────────────────────────────────────────────
  const startEditProtocol = useCallback((idx: number) => {
    const cf      = (job?.custom_fields ?? {}) as Record<string, unknown>
    const history = (cf.protocol_history ?? []) as Array<Record<string, unknown>>
    const entry   = history[idx]
    if (!entry) return
    const pd      = (entry.protocolData as Record<string, unknown>) || {}
    const visits  = (pd.visits as ProtocolVisitDraft[]) ?? []
    const parts   = (pd.spareParts as ProtocolPartDraft[]) ?? []
    setProtocolDraft({
      visits:               visits.map(v => ({ date: v.date ?? '', arrival: v.arrival ?? '', departure: v.departure ?? '', hours: Number(v.hours ?? 0), km: Number(v.km ?? 0) })),
      workDescription:      String(pd.workDescription      ?? ''),
      techNotes:            String(pd.techNotes            ?? ''),
      diagnosticResult:     String(pd.diagnosticResult     ?? ''),
      nonCompletionReason:  String(pd.nonCompletionReason  ?? ''),
      recommendations:      String(pd.recommendations      ?? ''),
      surchargeReason:      String(pd.surchargeReason       ?? ''),
      workDone:             String(pd.workDone              ?? ''),
      nextVisitReason:      String(pd.nextVisitReason       ?? ''),
      spareParts:           parts.map(p => ({ ...p })),
    })
    setEditingProtocolIdx(idx)
  }, [job])

  // ─── saveProtocol ─────────────────────────────────────────────────
  const saveProtocol = useCallback(async () => {
    if (protocolDraft === null || editingProtocolIdx === null) return
    setIsSavingProtocol(true)
    try {
      if (!job) throw new Error('Job not loaded')

      const cf      = (job.custom_fields ?? {}) as Record<string, unknown>
      const history = [...((cf.protocol_history ?? []) as Array<Record<string, unknown>>)]
      const entry   = { ...history[editingProtocolIdx] }
      const pd      = { ...(entry.protocolData as Record<string, unknown> ?? {}) }

      const totalHours = protocolDraft.visits.reduce((s, v) => s + (Number(v.hours) || 0), 0)
      const totalKm    = protocolDraft.visits.reduce((s, v) => s + (Number(v.km)    || 0), 0)

      const updatedPd = {
        ...pd,
        visits:              protocolDraft.visits,
        spareParts:          protocolDraft.spareParts,
        workDescription:     protocolDraft.workDescription      || undefined,
        techNotes:           protocolDraft.techNotes            || undefined,
        diagnosticResult:    protocolDraft.diagnosticResult     || undefined,
        nonCompletionReason: protocolDraft.nonCompletionReason  || undefined,
        recommendations:     protocolDraft.recommendations      || undefined,
        surchargeReason:     protocolDraft.surchargeReason      || undefined,
        workDone:            protocolDraft.workDone             || undefined,
        nextVisitReason:     protocolDraft.nextVisitReason      || undefined,
        totalHours,
        totalKm,
      }
      entry.protocolData = updatedPd
      history[editingProtocolIdx] = entry

      const isLatest  = editingProtocolIdx === history.length - 1
      const mergedCf: Record<string, unknown> = { ...cf, protocol_history: history }
      if (isLatest) mergedCf.protocol_data = updatedPd

      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_fields: mergedCf }),
      })
      if (!res.ok) { showToast('Chyba pri ukladaní protokolu', 'error'); return }

      const updatedJob = { ...job, custom_fields: mergedCf }
      setJob(updatedJob)
      setEditingProtocolIdx(null)
      setProtocolDraft(null)
      await refreshLivePricing(updatedJob, technicianData)
    } catch (err) {
      console.error('[PROTOCOL EDIT]', err)
    } finally {
      setIsSavingProtocol(false)
    }
  }, [protocolDraft, editingProtocolIdx, job, jobId, refreshLivePricing, technicianData])

  // ─── Polling + initial load ──────────────────────────────────────
  useEffect(() => {
    loadJob()
    pollRef.current = setInterval(() => loadJob(true), POLL_INTERVAL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [loadJob])

  // ─── Fetch partners + technicians ────────────────────────────────
  useEffect(() => {
    async function fetchLists() {
      try {
        const [partnersRes, techsRes] = await Promise.all([
          fetch('/api/partners?limit=100'),
          fetch('/api/technicians?limit=200'),
        ])
        const [partnersData, techsData] = await Promise.all([
          partnersRes.ok ? partnersRes.json() : null,
          techsRes.ok ? techsRes.json() : null,
        ])
        const partnerList: ApiPartner[] = partnersData?.partners || partnersData || []
        const techList: ApiTechnician[] = techsData?.technicians || techsData || []
        setPartners(partnerList)
        setTechnicians(techList)
      } catch {
        // Silent — lists are optional for display
      }
    }
    fetchLists()
  }, [])

  return {
    // Job data
    job,
    setJob,
    currentStep,
    setCurrentStep,
    techPhase,
    setTechPhase,
    technicianData,
    setTechnicianData,
    partnerData,
    setPartnerData,
    isLoading,
    setIsLoading,
    isMockMode,
    // Edit states
    isEditing,
    setIsEditing,
    isEditingCustomer,
    setIsEditingCustomer,
    isEditingDiag,
    setIsEditingDiag,
    customerEdit,
    setCustomerEdit,
    isSaving,
    setIsSaving,
    // Modals
    showCancelModal,
    setShowCancelModal,
    showBankImport,
    setShowBankImport,
    backwardModal,
    setBackwardModal,
    backwardReason,
    setBackwardReason,
    forwardOverrideModal,
    setForwardOverrideModal,
    forwardOverrideReason,
    setForwardOverrideReason,
    // Lists
    partners,
    technicians,
    // Toast
    toasts,
    showToast,
    dismissToast,
    // Pricing
    livePricing,
    setLivePricing,
    livePricingError,
    setLivePricingError,
    pricingOverrides,
    setPricingOverrides,
    refreshLivePricing,
    // Photos
    techPhotos,
    techPhotosLoaded,
    expandedTechPhoto,
    setExpandedTechPhoto,
    // EA
    eaReportText,
    setEaReportText,
    // Reschedule
    activeReschedule,
    setActiveReschedule,
    // Calendar
    showTechCalendar,
    setShowTechCalendar,
    showScheduleModal,
    setShowScheduleModal,
    showSmsModal,
    setShowSmsModal,
    showTechSmsModal,
    setShowTechSmsModal,
    showVoicebotModal,
    setShowVoicebotModal,
    voicebotInitialRecipient,
    setVoicebotInitialRecipient,
    showCustomerWaModal,
    setShowCustomerWaModal,
    showTechWaModal,
    setShowTechWaModal,
    showCustomerEmailDrawer,
    setShowCustomerEmailDrawer,
    showTechEmailDrawer,
    setShowTechEmailDrawer,
    scheduleDate,
    setScheduleDate,
    scheduleTime,
    setScheduleTime,
    // Chat
    quickChatTarget,
    setQuickChatTarget,
    // Next steps
    jobNextSteps,
    // Matching distance
    matchDistance,
    // Estimate editing
    isEditingEstimate,
    setIsEditingEstimate,
    estimateDraft,
    setEstimateDraft,
    isSavingEstimate,
    startEditEstimate,
    saveEstimate,
    // Protocol editing
    editingProtocolIdx,
    setEditingProtocolIdx,
    protocolDraft,
    setProtocolDraft,
    isSavingProtocol,
    startEditProtocol,
    saveProtocol,
    // Functions
    loadJob,
    // Auth
    currentOperator,
    // Assigned operator on this job
    assignedOperator,
    // IDs
    jobId,
  }
}

export type UseJobDetailReturn = ReturnType<typeof useJobDetail>
