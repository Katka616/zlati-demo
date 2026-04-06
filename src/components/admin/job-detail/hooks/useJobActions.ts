'use client'

import { useCallback } from 'react'
import { changeJobStatus } from '@/lib/jobActions'
import { STATUS_STEPS } from '@/lib/constants'
import type { TechPhaseKey } from '@/data/mockData'
import { normalizePhoneForDial } from '@/lib/phone'
import { useCallPhone } from '@/hooks/useCallPhone'
import type { UseJobDetailReturn } from './useJobDetail'

/**
 * useJobActions — all CRM action handlers for the job detail page.
 *
 * Takes the full useJobDetail return value as input and exposes
 * all event handlers. Keeps page.tsx clean.
 */
export function useJobActions(state: UseJobDetailReturn) {
  const {
    jobId,
    currentStep,
    setCurrentStep,
    job,
    setJob,
    techPhase,
    setTechPhase,
    technicianData,
    showToast,
    loadJob,
    setIsEditing,
    setShowBankImport,
    setShowCancelModal,
    setScheduleDate,
    setScheduleTime,
    setShowScheduleModal,
    backwardModal,
    setBackwardModal,
    backwardReason,
    setBackwardReason,
    forwardOverrideModal,
    setForwardOverrideModal,
    forwardOverrideReason,
    setForwardOverrideReason,
    isSaving,
    setIsSaving,
    customerEdit,
    setCustomerEdit,
    setIsEditingCustomer,
    refreshLivePricing,
    setQuickChatTarget,
    setEaReportText,
  } = state

  // Derived values used inside handlers
  const technicians = state.technicians
  const assignedTech = technicians.find(t => t.id === job?.assigned_to)
  const techInfo = technicianData
  const callPhone = useCallPhone()

  /** Preklad API chýb do ľudskej slovenčiny */
  const humanError = (result: { error?: string; message?: string }): string => {
    const err = result.error ?? ''
    const msg = result.message ?? ''
    if (err === 'override_reason_required') return 'Pri zmene statusu dozadu je potrebný dôvod'
    if (err === 'invalid_transition') return `Tento prechod nie je povolený (${STATUS_STEPS[currentStep]?.label ?? currentStep})`
    if (err === 'prerequisite_not_met') return msg || 'Nie sú splnené podmienky pre tento krok'
    if (err === 'forbidden') return 'Na túto akciu nemáte oprávnenie'
    if (err === 'not_found') return 'Zákazka nebola nájdená'
    if (err === 'unauthorized') return 'Nie ste prihlásený'
    if (msg && !msg.includes('CRM step')) return msg
    return 'Nepodarilo sa zmeniť status'
  }

  /** Klik na status v pipeline → statusEngine zmena kroku */
  const handleStepClick = useCallback(async (idx: number) => {
    if (idx < currentStep) {
      setBackwardModal({ targetStep: idx })
      setBackwardReason('')
      return
    }

    const prevStep = currentStep
    setCurrentStep(idx)
    showToast(`Status: ${STATUS_STEPS[idx]?.label}`, 'info')

    const result = await changeJobStatus(jobId, idx)
    if (!result.success) {
      setCurrentStep(prevStep)
      if (result.overridable) {
        setForwardOverrideModal({ targetStep: idx, blockedBy: result.message || humanError(result) })
        setForwardOverrideReason('')
        showToast(humanError(result), 'warning')
      } else {
        const canGoBack = prevStep > 0
        showToast(humanError(result), 'error', canGoBack ? {
          action: {
            label: `← Vrátiť na ${STATUS_STEPS[prevStep - 1]?.label ?? 'predchádzajúci krok'}`,
            onClick: () => { setBackwardModal({ targetStep: prevStep - 1 }); setBackwardReason('') },
          },
        } : undefined)
      }
    } else if (result.transition) {
      setCurrentStep(result.transition.to)
      showToast(`Status → ${STATUS_STEPS[result.transition.to]?.label}`, 'success')
      loadJob(true)
    }
  }, [currentStep, showToast, jobId, loadJob, setBackwardModal, setBackwardReason, setCurrentStep, setForwardOverrideModal, setForwardOverrideReason])

  /** Potvrdenie spätného chodu s dôvodom */
  const handleBackwardConfirm = useCallback(async () => {
    if (!backwardModal || backwardReason.trim().length < 5) return

    const prevStep = currentStep
    const targetStep = backwardModal.targetStep
    setBackwardModal(null)
    setCurrentStep(targetStep)
    showToast(`Status → ${STATUS_STEPS[targetStep]?.label}`, 'info')

    const result = await changeJobStatus(jobId, targetStep, undefined, backwardReason.trim())
    if (!result.success) {
      setCurrentStep(prevStep)
      showToast(humanError(result), 'error')
    } else if (result.transition) {
      setCurrentStep(result.transition.to)
      showToast(`Status vrátený na ${STATUS_STEPS[result.transition.to]?.label}`, 'success')
      loadJob(true)
    }
  }, [backwardModal, backwardReason, currentStep, showToast, jobId, loadJob, setBackwardModal, setCurrentStep])

  /** ContextPanel vyziada zmenu kroku (napr. tlacidlo "Dalsi krok") */
  const handleStepChange = useCallback(async (step: number, techPhaseOverride?: string) => {
    if (step < currentStep) {
      setBackwardModal({ targetStep: step })
      setBackwardReason('')
      return
    }

    const prevStep = currentStep
    setCurrentStep(step)
    showToast(`Status zmenený → ${STATUS_STEPS[step]?.label}`, 'success')

    const result = await changeJobStatus(jobId, step, techPhaseOverride)
    if (!result.success) {
      setCurrentStep(prevStep)
      // Guard blocked but overridable → show override modal
      if (result.overridable) {
        setForwardOverrideModal({ targetStep: step, blockedBy: result.message || humanError(result), techPhase: techPhaseOverride })
        setForwardOverrideReason('')
        showToast(humanError(result), 'warning')
      } else {
        const canGoBack = prevStep > 0
        showToast(humanError(result), 'error', canGoBack ? {
          action: {
            label: `← Vrátiť na ${STATUS_STEPS[prevStep - 1]?.label ?? 'predchádzajúci krok'}`,
            onClick: () => { setBackwardModal({ targetStep: prevStep - 1 }); setBackwardReason('') },
          },
        } : undefined)
      }
    } else {
      loadJob(true)
    }
  }, [currentStep, showToast, jobId, loadJob, setBackwardModal, setBackwardReason, setCurrentStep, setForwardOverrideModal, setForwardOverrideReason])

  /** Potvrdenie forward override s dôvodom */
  const handleForwardOverrideConfirm = useCallback(async () => {
    if (!forwardOverrideModal || forwardOverrideReason.trim().length < 5) return

    const prevStep = currentStep
    const { targetStep, techPhase: overrideTechPhase } = forwardOverrideModal
    setForwardOverrideModal(null)
    setCurrentStep(targetStep)
    showToast(`Override → ${STATUS_STEPS[targetStep]?.label}`, 'info')

    const result = await changeJobStatus(jobId, targetStep, overrideTechPhase, forwardOverrideReason.trim())
    if (!result.success) {
      setCurrentStep(prevStep)
      showToast(humanError(result), 'error')
    } else if (result.transition) {
      setCurrentStep(result.transition.to)
      showToast(`Status → ${STATUS_STEPS[result.transition.to]?.label} (override)`, 'success')
      loadJob(true)
    } else {
      loadJob(true)
    }
  }, [forwardOverrideModal, forwardOverrideReason, currentStep, showToast, jobId, loadJob, setForwardOverrideModal, setCurrentStep])

  /** Centralny handler pre vsetky CRM akcie */
  const handleAction = useCallback(async (action: string, actionPayload?: { amount?: number }) => {
    if (action === 'approve_estimate') {
      setTechPhase(prev => ({ ...prev, phase: 'estimate_approved' as TechPhaseKey }))
      // Surcharge from pricing engine (primary) or DB fallback
      const engineSurcharge = state.livePricing?.techPayFromCustomer || 0
      const surchargeForDecision = engineSurcharge || techPhase.clientSurcharge || 0
      const nextStep = surchargeForDecision > 0 ? 5 : 6
      setCurrentStep(nextStep)
      showToast('Odhad schvaleny', 'success')

      const result = await changeJobStatus(jobId, nextStep, 'estimate_approved')
      if (!result.success) {
        showToast(humanError(result), 'error')
      } else {
        loadJob(true)
      }
    } else if (action === 'reject_estimate') {
      setTechPhase(prev => ({ ...prev, phase: 'estimate_rejected' as TechPhaseKey }))
      showToast('Odhad zamietnuty — technik musi prepracovat', 'error')

      await changeJobStatus(jobId, currentStep, 'estimate_rejected')
      loadJob(true)
    } else if (action === 'send_surcharge') {
      setTechPhase(prev => ({ ...prev, phase: 'client_approval_pending' as TechPhaseKey }))
      setCurrentStep(5)
      showToast('Doplatok odoslany klientovi', 'warning')

      const result = await changeJobStatus(jobId, 5, 'client_approval_pending')
      if (!result.success) {
        showToast(humanError(result), 'error')
      } else {
        loadJob(true)
      }
    } else if (action === 'bank_import') {
      setShowBankImport(true)
    } else if (action === 'ea_submit') {
      try {
        const res = await fetch(`/api/jobs/${jobId}/ea-submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ jobId }),
        })
        if (res.ok) {
          showToast('EA odhláška odoslaná', 'success')
          loadJob(true)
        } else {
          const data = await res.json().catch(() => ({}))
          showToast((data as { error?: string }).error || 'Chyba pri odosielaní EA', 'error')
        }
      } catch {
        showToast('Chyba pripojenia', 'error')
      }
    } else if (action === 'ea_preview') {
      // Inline preview v ContextPanel — nič nerobiť, rozpis sa zobrazuje automaticky
      showToast('Rozpis EA odhlášky je zobrazený v paneli', 'info')
    } else if (action === 'send_invoice') {
      const result = await changeJobStatus(jobId, 10, undefined)
      if (result.success) {
        setCurrentStep(10)
        showToast('Faktúra odoslaná', 'success')
        loadJob(true)
      } else {
        showToast(humanError(result), 'error')
      }
    } else if (action === 'return_to_step6') {
      const result = await changeJobStatus(jobId, 4, 'estimate_rejected')
      if (result.success) {
        setCurrentStep(4)
        showToast('Zákazka vrátená na opravu odhadu', 'warning')
        loadJob(true)
      } else {
        showToast(humanError(result), 'error')
      }
    } else if (action === 'client_approved') {
      const prevStep = currentStep
      setCurrentStep(6)
      const result = await changeJobStatus(jobId, 6, 'client_approved')
      if (result.success) {
        showToast('Doplatok schválený operátorom', 'success')
        loadJob(true)
      } else if (result.overridable) {
        setCurrentStep(prevStep)
        setForwardOverrideModal({ targetStep: 6, blockedBy: result.message || 'Klient ešte nerozhodol o doplatku', techPhase: 'client_approved' })
        setForwardOverrideReason('')
        showToast(humanError(result), 'warning')
      } else {
        setCurrentStep(prevStep)
        showToast(humanError(result), 'error')
      }
    } else if (action === 'client_declined') {
      const result = await changeJobStatus(jobId, currentStep, 'client_declined')
      if (result.success) {
        showToast('Klient odmietol doplatok', 'warning')
        loadJob(true)
      } else {
        showToast(humanError(result), 'error')
      }
    } else if (action === 'cancel_surcharge') {
      // Storno doplatku — automaticky odblokuje technika (step 5→6, working)
      try {
        // 1. Save surcharge=0 + waived flags
        const cfRes = await fetch(`/api/jobs/${jobId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            custom_fields: {
              client_surcharge: 0,
              surcharge_waived: true,
              surcharge_waived_at: new Date().toISOString(),
              surcharge_waived_by: 'operator',
            },
          }),
        })
        if (!cfRes.ok) { showToast('Nepodarilo sa stornovať doplatok', 'error'); return }
        // 2. Advance to step 6 (práca) — auto-unblock technician
        const result = await changeJobStatus(jobId, 6, 'working')
        if (!result.success) {
          console.warn('[SurchargeCancel] Advance to step 6 failed, setting tech_phase directly:', result)
          // Fallback: at least unblock tech_phase
          await fetch(`/api/jobs/${jobId}`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tech_phase: 'working' }),
          })
        }
        // 3. Notify client + tech
        fetch(`/api/jobs/${jobId}/notify-surcharge-change`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'cancelled' }),
        }).catch(err => console.error('[SurchargeCancel] notify failed:', err))
        showToast('Doplatok stornovaný — technik odblokovaný', 'success')
        loadJob(true)
      } catch (err) {
        console.error('[SurchargeCancel] Error:', err)
        showToast('Chyba pri stornovaní doplatku', 'error')
      }
    } else if (action === 'update_surcharge') {
      // Zmena výšky doplatku
      const newAmount = actionPayload?.amount
      if (newAmount == null || newAmount < 0) { showToast('Neplatná suma doplatku', 'error'); return }
      try {
        const cfRes = await fetch(`/api/jobs/${jobId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            custom_fields: {
              client_surcharge: newAmount,
              surcharge_updated_at: new Date().toISOString(),
              surcharge_updated_by: 'operator',
            },
          }),
        })
        if (cfRes.ok) {
          // Notify client + tech about new amount
          fetch(`/api/jobs/${jobId}/notify-surcharge-change`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'updated', amount: newAmount }),
          }).catch(err => console.error('[SurchargeUpdate] notify failed:', err))
          const currency = job?.customer_country === 'CZ' ? 'Kč' : '€'
          showToast(`Doplatok zmenený na ${newAmount} ${currency}`, 'success')
          loadJob(true)
        } else {
          showToast('Nepodarilo sa zmeniť doplatok', 'error')
        }
      } catch (err) {
        console.error('[SurchargeUpdate] Error:', err)
        showToast('Chyba pri zmene doplatku', 'error')
      }
    } else if (action === 'call_tech') {
      const phone = normalizePhoneForDial(assignedTech?.phone || techInfo?.phone)
      if (phone) {
        const name = assignedTech ? `${assignedTech.first_name ?? ''} ${assignedTech.last_name ?? ''}`.trim() : undefined
        callPhone(phone, name || undefined)
      } else {
        showToast('Telefónne číslo technika nie je k dispozícii', 'error')
      }
    } else if (action === 'open_schedule_modal') {
      setScheduleDate(job?.scheduled_date
        ? new Date(job.scheduled_date as string).toISOString().slice(0, 10)
        : '')
      setScheduleTime((job?.scheduled_time as string) || '')
      setShowScheduleModal(true)
    } else if (action === 'assign_tech' || action === 'change_tech') {
      // Switch to Priebeh tab first (sec-tech lives there)
      window.dispatchEvent(new CustomEvent('crm-switch-tab', { detail: 'priebeh' }))
      // Wait for tab render, then scroll to technician section
      setTimeout(() => {
        const techSection = document.getElementById('sec-tech')
        if (techSection) {
          if (!techSection.classList.contains('open')) {
            const header = techSection.querySelector('.crm-section-header') as HTMLElement | null
            header?.click()
          }
          setTimeout(() => {
            const target = techSection.querySelector('[data-matching-section]') as HTMLElement | null || techSection
            const rect = target.getBoundingClientRect()
            window.scrollBy({ top: rect.top - 120, behavior: 'smooth' })
          }, 150)
        }
      }, 100)
    } else if (action === 'export_accounting') {
      if (job) {
        const data = JSON.stringify(job, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `job-${jobId}-export.json`
        a.click()
        URL.revokeObjectURL(url)
        showToast('Export stiahnutý', 'success')
      }
    } else if (action === 'correct_settlement') {
      // Vrátiť zákazku na settlement review — operátor chce opraviť hodnoty
      const result = await changeJobStatus(jobId, 9, 'settlement_review')
      if (result.success) {
        showToast('Vyúčtovanie vrátené technikovi na opravu', 'warning')
        loadJob(true)
      } else {
        showToast(humanError(result), 'error')
      }
    } else if (action === 'refresh') {
      loadJob(true)
    } else if (action === 'view_tech_invoice') {
      window.open(`/api/admin/jobs/${jobId}/invoice-download`, '_blank')
    } else if (action === 'add_to_batch') {
      try {
        const res = await fetch('/api/admin/payment-batches', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobIds: [jobId] }),
        })
        if (res.ok) {
          const data = await res.json()
          showToast(`Zaradené do platby (dávka #${data.batchId})`, 'success')
          loadJob(true)
        } else {
          const data = await res.json().catch(() => ({}))
          showToast((data as Record<string, string>).error || 'Chyba pri zaradení do platby', 'error')
        }
      } catch {
        showToast('Chyba pri zaradení do platby', 'error')
      }
    } else {
      showToast(`Akcia: ${action}`, 'info')
    }
  }, [techPhase.clientSurcharge, showToast, job, currentStep, loadJob, jobId, assignedTech, techInfo, setCurrentStep, setTechPhase, setShowBankImport, setScheduleDate, setScheduleTime, setShowScheduleModal, callPhone, setBackwardModal, setBackwardReason, setEaReportText])

  /** Priradenie technika */
  const handleAssign = useCallback(async (technicianId: number | null) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/assign`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technician_id: technicianId }),
      })
      if (res.ok) {
        showToast(technicianId ? 'Technik priradeny' : 'Technik odobraty', 'success')
        await loadJob()
      } else {
        const data = await res.json().catch(() => ({}))
        const msg = (data as Record<string, string>).message || (data as Record<string, string>).error || 'Chyba pri priradzovani technika'
        showToast(msg, 'error')
      }
    } catch {
      showToast('Chyba pri priradzovani technika', 'error')
    } finally {
      setIsSaving(false)
    }
  }, [jobId, showToast, loadJob, setIsSaving])

  /** Ulozenie zmien v editacnom formulari */
  const handleSave = useCallback(async (fields: Record<string, unknown>) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(fields),
      })
      if (res.ok) {
        showToast('Zmeny ulozene', 'success')
        setIsEditing(false)
        loadJob(true)
      } else {
        showToast('Chyba pri ukladani', 'error')
      }
    } catch {
      showToast('Chyba pri ukladani', 'error')
    } finally {
      setIsSaving(false)
    }
  }, [jobId, showToast, loadJob, setIsEditing, setIsSaving])

  /** Uloženie údajov zákazníka */
  const handleSaveCustomer = useCallback(async () => {
    if (!customerEdit) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(customerEdit),
      })
      if (res.ok) {
        showToast('Zákazník uložený', 'success')
        setIsEditingCustomer(false)
        setCustomerEdit(null)
        loadJob(true)
      } else {
        showToast('Chyba pri ukladaní', 'error')
      }
    } catch {
      showToast('Chyba pri ukladaní', 'error')
    } finally {
      setIsSaving(false)
    }
  }, [customerEdit, jobId, showToast, loadJob, setIsEditingCustomer, setCustomerEdit, setIsSaving])

  /** Zrusenie zakazky cez CancelJobModal */
  const handleCancelled = useCallback(() => {
    setShowCancelModal(false)
    showToast('Zákazka zrušená', 'success')
    loadJob(true)
  }, [showToast, loadJob, setShowCancelModal])

  return {
    humanError,
    handleStepClick,
    handleBackwardConfirm,
    handleForwardOverrideConfirm,
    handleStepChange,
    handleAction,
    handleAssign,
    handleSave,
    handleSaveCustomer,
    handleCancelled,
  }
}

export type UseJobActionsReturn = ReturnType<typeof useJobActions>
