'use client'

/**
 * Home page — /dispatch
 *
 * Dashboard view: timeline, action-required cards, earnings.
 * Polls API every 15 seconds for updates.
 */

import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDispatchInit } from '@/hooks/useDispatchInit'
import { DispatchJob, type TechActionType, type EstimateFormData } from '@/types/dispatch'
import { getTranslation } from '@/lib/i18n'
import { Language } from '@/types/protocol'
import { notifyNewJob } from '@/lib/notifications'
import { cacheDispatchJobs, cacheJobDetail, queueStatusChange } from '@/lib/offlineQueue'
import dynamic from 'next/dynamic'
import { categorizeJobs, sortByScheduledTime, isCompletedJob } from '@/lib/dispatchUtils'
import { saveProfileSection } from '@/lib/profileApi'
import DispatchToast, { useDispatchToast } from '@/components/dispatch/DispatchToast'
import DispatchPushBanner from '@/components/dispatch/PushPermissionBanner'
import { getSmartButton } from '@/lib/smartButton'
import DashboardHeader, { type StatFilter } from '@/components/dispatch/DashboardHeader'
import DashboardDayTabs from '@/components/dispatch/DashboardDayTabs'
import DashboardTimeline from '@/components/dispatch/DashboardTimeline'
import DashboardActionList from '@/components/dispatch/DashboardActionList'
import DashboardEarnings from '@/components/dispatch/DashboardEarnings'

const AcceptJobModal = dynamic(() => import('@/components/dispatch/AcceptJobModal'), { ssr: false, loading: () => null })
const UpcomingJobAlert = dynamic(() => import('@/components/dispatch/UpcomingJobAlert'), { ssr: false, loading: () => null })

/** Wrapper needed because useSearchParams requires Suspense in Next.js 14 */
export default function HomePageWrapper() {
  return (
    <Suspense fallback={<div className="dispatch-empty"><div className="spinner" style={{ margin: '0 auto 12px' }} /></div>}>
      <HomePage />
    </Suspense>
  )
}

function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { technician, isLoading: authLoading, jobs: contextJobs, counts, dashboardStats: initDashStats, refreshJobs } = useDispatchInit()
  const [localJobs, setLocalJobs] = useState<DispatchJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<DispatchJob | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const { toast: errorToast, showToast: showError, hideToast: hideError } = useDispatchToast()
  const [isOffline, setIsOffline] = useState(false)
  const [dismissedAlertJobIds, setDismissedAlertJobIds] = useState<Set<string>>(new Set())
  const [isAvailable, setIsAvailable] = useState<boolean>(technician?.isAvailable ?? false)
  const [availabilityToggling, setAvailabilityToggling] = useState(false)
  const prevJobIdsRef = useRef<Set<string>>(new Set())

  // Alias context dashboardStats to local name for minimal UI changes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dashStats = initDashStats as any

  // New state for tab, and stat filter
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'week'>('today')
  const [activeFilter, setActiveFilter] = useState<StatFilter>(null)

  // Admin preview mode: /dispatch?preview=true bypasses operator redirect
  const isAdminPreview = searchParams.get('preview') === 'true'
  // Overview mode: /dispatch?overview=true skips active-job redirect (e.g. when user clicks "Domov" tab)
  const isOverviewMode = searchParams.get('overview') === 'true'

  const lang: Language = technician?.country === 'CZ' ? 'cz' : 'sk'
  const t = useCallback(
    (key: string) => getTranslation(lang, key),
    [lang]
  )

  // Sync jobs from context into local state (allows local filter/remove operations)
  useEffect(() => {
    if (contextJobs.length > 0 || !authLoading) {
      setLocalJobs(contextJobs)
      setIsLoading(false)
    }
  }, [contextJobs, authLoading])

  // Cache jobs locally for offline access whenever context jobs update
  useEffect(() => {
    if (localJobs.length === 0) return
    cacheDispatchJobs(localJobs).catch(() => {})
    for (const job of localJobs) {
      cacheJobDetail(String(job.id), job).catch(() => {})
    }
  }, [localJobs])

  // New-job notification detection
  useEffect(() => {
    if (localJobs.length > 0 && prevJobIdsRef.current.size > 0) {
      const hasNewJob = localJobs.some(j => !prevJobIdsRef.current.has(j.id))
      if (hasNewJob) notifyNewJob()
    }
    prevJobIdsRef.current = new Set(localJobs.map(j => j.id))
  }, [localJobs])

  // Offline detection (UI display only — context handles polling)
  useEffect(() => {
    const goOnline = () => setIsOffline(false)
    const goOffline = () => setIsOffline(true)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    if (!navigator.onLine) setIsOffline(true)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Sync availability from context once technician loads
  useEffect(() => {
    if (technician?.isAvailable !== undefined) {
      setIsAvailable(technician.isAvailable)
    }
  }, [technician?.isAvailable])

  const handleToggleAvailability = useCallback(async () => {
    if (availabilityToggling) return
    const next = !isAvailable
    setIsAvailable(next) // optimistic
    setAvailabilityToggling(true)
    try {
      await saveProfileSection('availability', {
        isAvailable: next,
        workingHours: technician?.workingHours ?? {},
        serviceRadiusKm: technician?.serviceRadiusKm ?? 30,
      })
      refreshJobs()
    } catch {
      setIsAvailable(!next) // revert on error
      showError(lang === 'cz' ? 'Nepodařilo se změnit dostupnost. Zkuste znovu.' : 'Nepodarilo sa zmeniť dostupnosť. Skúste znova.', 'error')
    } finally {
      setAvailabilityToggling(false)
    }
  }, [isAvailable, availabilityToggling, technician, showError])

  const handleAccept = (jobId: string) => {
    const job = localJobs.find((j) => j.id === jobId)
    if (job) setSelectedJob(job)
  }

  const handleConfirmAccept = useCallback(async () => {
    if (!selectedJob) return
    setIsAccepting(true)
    try {
      const res = await fetch('/api/dispatch/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: selectedJob.id }),
        credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        setLocalJobs((prev) => prev.filter((j) => j.id !== selectedJob.id))
        setSelectedJob(null)
        refreshJobs()
      } else if (data.error === 'already_taken') {
        showError(t('dispatch.alreadyTaken'), 'error')
        setLocalJobs((prev) => prev.filter((j) => j.id !== selectedJob.id))
        setSelectedJob(null)
      } else {
        showError(data.error || 'Nepodarilo sa prijať zákazku. Skúste znova.', 'error')
        setSelectedJob(null)
      }
    } catch {
      showError(t('login.networkError'), 'error')
      setSelectedJob(null)
    } finally {
      setIsAccepting(false)
    }
  }, [selectedJob, t, refreshJobs])

  // ── Checklist step → API dispatch/status ──
  const handleStepAction = useCallback(async (jobId: string, action: TechActionType): Promise<boolean> => {
    try {
      const res = await fetch('/api/dispatch/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action }),
        credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        refreshJobs()
        return true
      }
      showError(data.message || `Action ${action} failed`, 'error')
      return false
    } catch {
      try {
        await queueStatusChange({ jobId: Number(jobId), action, timestamp: Date.now() })
        showError(lang === 'cz' ? 'Akce uložena, odešle se po připojení' : 'Akcia uložená, odošle sa po pripojení', 'error')
      } catch {
        showError(t('login.networkError'), 'error')
      }
      return false
    }
  }, [t, refreshJobs])

  // ── Submit estimate form data → API dispatch/status ──
  const handleSubmitEstimate = useCallback(async (jobId: string, data: EstimateFormData): Promise<boolean> => {
    try {
      const res = await fetch('/api/dispatch/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action: 'submit_estimate', estimateData: data }),
        credentials: 'include',
      })
      const result = await res.json()
      if (result.success) {
        refreshJobs()
        return true
      }
      showError(result.message || 'Estimate submission failed', 'error')
      return false
    } catch {
      try {
        await queueStatusChange({
          jobId: Number(jobId),
          action: 'submit_estimate',
          payload: data as unknown as Record<string, unknown>,
          timestamp: Date.now(),
        })
        showError(lang === 'cz' ? 'Odhad uložen, odešle se po připojení' : 'Odhad uložený, odošle sa po pripojení', 'error')
      } catch {
        showError(t('login.networkError'), 'error')
      }
      return false
    }
  }, [t, refreshJobs])

  const handleOpenProtocol = (job: DispatchJob) => {
    const cf = (job.customFields || {}) as Record<string, unknown>
    const isMultiVisit = Array.isArray(cf.protocol_history) && cf.protocol_history.length > 0
    const typeParam = isMultiVisit ? '&type=multi_visit' : ''
    router.push(`/dispatch/protocol/${job.id}?from=${encodeURIComponent('/dispatch')}${typeParam}`)
  }

  const handleInvoiceComplete = useCallback((jobId: string) => {
    refreshJobs()
  }, [refreshJobs])

  // ── Computed values ──

  // Filter out invoice/payment-phase jobs from the dashboard — they belong in Dokončené tab
  const dashboardJobs = useMemo(() => localJobs.filter(j => !isCompletedJob(j)), [localJobs])
  const sections = useMemo(() => categorizeJobs(dashboardJobs), [dashboardJobs])

  const activeJob = useMemo(() => {
    const ctx = (j: typeof localJobs[0]) => ({
      hasInvoice: Boolean((j as any).customFields?.invoice_data || (j as any).customFields?.invoice_uploaded_at),
      country: j.country,
    })
    for (const j of localJobs) {
      const btn = getSmartButton(j.crmStep ?? 0, j.techPhase as any, lang, ctx(j))
      if (btn.variant === 'primary' || btn.variant === 'secondary') return j
    }
    for (const j of localJobs) {
      const btn = getSmartButton(j.crmStep ?? 0, j.techPhase as any, lang, ctx(j))
      if (btn.variant === 'waiting') return j
    }
    return null
  }, [localJobs, lang])

  // Auto-redirect to active job fullscreen (unless overview mode or admin preview)
  useEffect(() => {
    if (isLoading || isOverviewMode || isAdminPreview) return
    if (!activeJob) return
    router.replace(`/dispatch/job/${activeJob.id}`)
  }, [activeJob, isLoading, isOverviewMode, isAdminPreview, router])

  const actionJobs = useMemo(() => {
    const ctx = (j: typeof dashboardJobs[0]) => ({
      hasInvoice: Boolean((j as any).customFields?.invoice_data || (j as any).customFields?.invoice_uploaded_at),
      country: j.country,
    })
    return dashboardJobs.filter(j => {
      if (j.id === activeJob?.id) return false
      const btn = getSmartButton(j.crmStep ?? 0, j.techPhase as any, lang, ctx(j))
      return btn.variant === 'primary' || btn.variant === 'secondary'
    }).map(j => {
      const btn = getSmartButton(j.crmStep ?? 0, j.techPhase as any, lang, ctx(j))
      return {
        id: j.id,
        referenceNumber: j.referenceNumber,
        customerName: j.customerName,
        customerCity: j.customerCity,
        actionLabel: btn.label,
        actionVariant: btn.variant as 'primary' | 'secondary' | 'waiting',
      }
    })
  }, [dashboardJobs, activeJob, lang])

  const formatTileAmount = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k'
    return String(n)
  }

  // Tech phases that require technician action (matches DB query in getTechnicianDashboardStats)
  const ACTION_NEEDED_PHASES = useMemo(() => new Set([
    'offer_accepted','arrived','diagnostics','estimate_draft','estimate_approved','estimate_rejected',
    'client_approved','client_declined','working','work_completed','settlement_review',
    'settlement_correction','price_approved','final_protocol_draft','invoice_ready','diagnostic_completed',
  ]), [])

  const applyStatFilter = useCallback((jobList: DispatchJob[]): DispatchJob[] => {
    if (!activeFilter) return jobList
    const today = new Date().toISOString().slice(0, 10)
    if (activeFilter === 'action') {
      return jobList.filter(j => j.techPhase && ACTION_NEEDED_PHASES.has(j.techPhase))
    }
    if (activeFilter === 'invoice') {
      const cf = (j: DispatchJob) => j.customFields as Record<string, unknown> | undefined
      return jobList.filter(j =>
        (j.crmStep ?? 0) >= 7 &&
        (!cf(j)?.invoice_data || cf(j)?.invoice_data === 'null') &&
        !['cancelled', 'uzavrete', 'archived', 'uhradene'].includes(j.status)
      )
    }
    if (activeFilter === 'scheduled') {
      return jobList.filter(j => j.scheduledDate && j.scheduledDate >= today)
    }
    return jobList
  }, [activeFilter, ACTION_NEEDED_PHASES])

  const handleStatClick = useCallback((filter: StatFilter) => {
    setActiveFilter(filter)
    // When activating a filter, switch to "week" tab to show all matching jobs (not just today)
    if (filter) setActiveTab('week')
  }, [])

  // Today tab: ONLY today's scheduled jobs (clean timeline)
  // Overdue + unscheduled shown separately below
  const visibleJobs = useMemo(() => {
    let base: DispatchJob[]
    if (activeTab === 'today') {
      base = sortByScheduledTime(sections.today)
    } else if (activeTab === 'tomorrow') {
      base = sortByScheduledTime(sections.tomorrow)
    } else {
      // Week: all jobs sorted by date+time, overdue at the end
      base = [
        ...sortByScheduledTime([...sections.today, ...sections.tomorrow, ...sections.future, ...sections.unscheduled]),
        ...sortByScheduledTime(sections.overdue),
      ]
    }
    return applyStatFilter(base)
  }, [activeTab, sections, applyStatFilter])

  // Overdue + unscheduled: shown as separate section on "today" tab
  const attentionJobs = useMemo(() => {
    if (activeTab !== 'today') return []
    return applyStatFilter([
      ...sortByScheduledTime(sections.overdue),
      ...sections.unscheduled,
    ])
  }, [activeTab, sections, applyStatFilter])

  return (
    <>
      <DispatchToast
        message={errorToast?.message ?? ''}
        type={errorToast?.type ?? 'error'}
        visible={!!errorToast}
        onClose={hideError}
      />

      {/* Push permission banner — shows when notifications not enabled */}
      <DispatchPushBanner lang={lang} />

      {/* 1-hour pre-repair check-in alert */}
      {(() => {
        const now = new Date()
        const upcomingJob = localJobs.find(job => {
          if (!job.scheduledDate || !job.scheduledTime) return false
          if (dismissedAlertJobIds.has(job.id)) return false
          const cf = job.customFields as Record<string, unknown> | undefined
          if (cf?.pre_repair_checkin_at) return false
          const timeMatch = job.scheduledTime!.match(/(\d{1,2}):(\d{2})/)
          if (!timeMatch) return false
          const scheduled = new Date(job.scheduledDate!)
          scheduled.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0)
          const diffMs = scheduled.getTime() - now.getTime()
          const diffMins = diffMs / (1000 * 60)
          return diffMins > 30 && diffMins <= 90
        })
        if (!upcomingJob) return null
        return (
          <UpcomingJobAlert
            job={upcomingJob}
            lang={lang}
            onDismiss={() => setDismissedAlertJobIds(prev => new Set(Array.from(prev).concat(upcomingJob.id)))}
          />
        )
      })()}

      <div data-help-target="dashboard-header">
      <DashboardHeader
        technicianName={technician?.name ? technician.name : ''}
        isAvailable={isAvailable}
        onToggleAvailability={handleToggleAvailability}
        availabilityToggling={availabilityToggling}
        unreadNotifCount={counts.unreadNotifications}
        onNotifClick={() => router.push('/dispatch/notifications')}
        onSettingsClick={() => router.push('/dispatch/settings')}
        stats={dashStats ? {
          actionNeeded: dashStats.counts?.actionNeeded ?? 0,
          awaitingInvoice: dashStats.counts?.awaitingInvoice ?? 0,
          scheduled: dashStats.counts?.scheduled ?? 0,
          weekEarnings: formatTileAmount(dashStats.earnings?.thisWeek ?? 0),
        } : null}
        lang={lang}
        activeFilter={activeFilter}
        onStatClick={handleStatClick}
      />
      </div>

      {isLoading ? (
        <div style={{ padding: 16 }}>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                height: 120,
                background: 'var(--g2)',
                borderRadius: 12,
                marginBottom: 8,
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      ) : localJobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📬</div>
          <h3 style={{ fontWeight: 700, color: 'var(--dark)' }}>{t('dispatch.home.noJobs')}</h3>
          <a
            href="/dispatch/marketplace"
            style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 14 }}
          >
            {t('dispatch.home.marketplace')}
          </a>
        </div>
      ) : (
        <>
          <div data-help-target="day-tabs">
          <DashboardDayTabs
            activeTab={activeTab}
            onTabChange={(tab) => { setActiveTab(tab); setActiveFilter(null) }}
            todayCount={sections.today.length}
            tomorrowCount={sections.tomorrow.length}
            weekCount={dashboardJobs.length}
            lang={lang}
          />
          </div>
          {visibleJobs.length > 0 ? (
            <DashboardTimeline
              jobs={visibleJobs}
              activeJobId={activeJob?.id}
              lang={lang}
              onJobClick={(id) => router.push(`/dispatch/job/${id}`)}
            />
          ) : activeTab === 'today' ? (
            <div style={{ textAlign: 'center', padding: '32px 20px 16px', color: 'var(--g4)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>&#128197;</div>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Montserrat', sans-serif" }}>
                {lang === 'cz' ? 'Na dnes nemáte naplánované žádné zakázky' : 'Na dnes nemáte naplánované žiadne zákazky'}
              </div>
            </div>
          ) : null}
          {/* Overdue + unscheduled — separate "attention" section on today tab */}
          {attentionJobs.length > 0 && (
            <div style={{ padding: '4px 16px 0' }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: 'var(--danger, #ef4444)',
                padding: '10px 0 6px', display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: "'Montserrat', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                {lang === 'cz' ? 'Vyžaduje pozornost' : 'Vyžaduje pozornosť'} ({attentionJobs.length})
              </div>
            </div>
          )}
          {attentionJobs.length > 0 && (
            <DashboardTimeline
              jobs={attentionJobs}
              activeJobId={activeJob?.id}
              lang={lang}
              onJobClick={(id) => router.push(`/dispatch/job/${id}`)}
            />
          )}
          {actionJobs.length > 0 && (
            <DashboardActionList
              jobs={actionJobs}
              onJobClick={(id) => router.push(`/dispatch/job/${id}`)}
              onShowAll={() => router.push('/dispatch/my-jobs')}
              lang={lang}
            />
          )}
          {dashStats && (dashStats.earnings.thisWeek > 0 || dashStats.earnings.thisMonth > 0 || dashStats.earnings.awaitingPayment > 0) && (
            <DashboardEarnings
              thisWeek={dashStats.earnings.thisWeek}
              thisMonth={dashStats.earnings.thisMonth}
              awaitingPayment={dashStats.earnings.awaitingPayment}
              lang={lang}
              onNavigate={() => router.push('/dispatch/my-jobs')}
            />
          )}
        </>
      )}

      {selectedJob && (
        <AcceptJobModal
          job={selectedJob}
          lang={lang}
          isAccepting={isAccepting}
          onConfirm={handleConfirmAccept}
          onCancel={() => setSelectedJob(null)}
        />
      )}
    </>
  )
}
