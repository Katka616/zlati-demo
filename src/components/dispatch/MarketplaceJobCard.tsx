'use client'

/**
 * MarketplaceJobCard
 *
 * Zobrazuje zákazku ponúknutú technikovi — identické dáta ako vidí operátor:
 * - Plné diagnostické údaje z formulára zákazníka
 * - Fotky (lazy-loaded po rozbalení)
 * - Výber termínu zákazníka
 * - Smart Dispatch: banner s blízkou zákazkou + navrhované sloty
 * - Tlačidlo "Prijať zákazku"
 *
 * Zákazníkove identifikačné údaje (EA, poisťovňa) sa NEZOBRAZUJÚ — technik
 * dostáva len diagnostické informácie pre rozhodovanie.
 */

import { useState, useEffect, useCallback } from 'react'
import type { MarketplaceJob, MarketplaceJobSlot } from '@/types/dispatch'
import type { DiagData } from '@/types/diagnostic'
import type { DiagResult } from '@/types/diagnosticBrain'
import MiniCalendarOverlay from '@/components/dispatch/MiniCalendarOverlay'
import type { CalendarEvent } from '@/components/dispatch/MiniCalendarOverlay'
import DiagnosticBrainCard from '@/components/dispatch/DiagnosticBrainCard'
import { getTranslation } from '@/lib/i18n'
import type { Language } from '@/types/protocol'
import { getCategoryLabel } from '@/lib/constants'

// ── Label maps (mirrors AdminDiagnosticPanel) ────────────────────────

const FAULT_LABELS_SK: Record<string, string> = {
  vodoinstalater: 'Vodoinštalácia',
  elektrikar: 'Elektroinštalácia',
  kotel: 'Kotol a kúrenie',
  plynar: 'Plynové zariadenie',
  zamecnik: 'Kľúčová služba',
  odpady: 'Upchaté odpady',
  spotrebic: 'Elektrospotrebič',
  klimatizace: 'Klimatizácia',
  tepelne_cerpadlo: 'Tepelné čerpadlo',
  solarni_panely: 'Solárne panely',
  deratizace: 'Deratizácia',
  ine: 'Ostatné práce',
}

const FAULT_LABELS_CZ: Record<string, string> = {
  vodoinstalater: 'Vodoinstalace',
  elektrikar: 'Elektroinstalace',
  kotel: 'Kotel a topení',
  plynar: 'Plynové zařízení',
  zamecnik: 'Klíčová služba',
  odpady: 'Ucpané odpady',
  spotrebic: 'Elektrospotřebič',
  klimatizace: 'Klimatizace',
  tepelne_cerpadlo: 'Tepelné čerpadlo',
  solarni_panely: 'Solární panely',
  deratizace: 'Deratizace',
  ine: 'Ostatní práce',
}

// Color dot for urgency — replaces emoji circles
const URGENCY_COLORS: Record<string, string> = {
  kritická: '#DC2626',
  vysoká: '#EA580C',
  střední: '#CA8A04',
  nízká: '#16A34A',
}

const URGENCY_LABELS_SK: Record<string, string> = {
  kritická: 'Kritická — aktívna havária',
  vysoká: 'Vysoká — nefunkčná základná služba',
  střední: 'Stredná — problém s obmedzením',
  nízká: 'Nízka — plánovaná oprava',
}

const URGENCY_LABELS_CZ: Record<string, string> = {
  kritická: 'Kritická — aktivní havárie',
  vysoká: 'Vysoká — nefunkční základní služba',
  střední: 'Střední — problém s omezením',
  nízká: 'Nízká — plánovaná oprava',
}

const PROPERTY_LABELS_SK: Record<string, string> = {
  byt:               'Byt',
  dum:               'Rodinný dom',
  komercni:          'Komerčný objekt',
  spolecne_prostory: 'Spoločné priestory',
  rd:                'Rodinný dom',
  RD:                'Rodinný dom',
  family_house:      'Rodinný dom',
  house:             'Rodinný dom',
  dom:               'Rodinný dom',
  apartment:         'Byt',
  flat:              'Byt',
  commercial:        'Komerčný objekt',
  office:            'Kancelária',
  kancelář:          'Kancelária',
  kancelar:          'Kancelária',
  panerak:           'Panelák',
  panelak:           'Panelák',
}

const PROPERTY_LABELS_CZ: Record<string, string> = {
  byt:               'Byt',
  dum:               'Rodinný dům',
  komercni:          'Komerční objekt',
  spolecne_prostory: 'Společné prostory',
  rd:                'Rodinný dům',
  RD:                'Rodinný dům',
  family_house:      'Rodinný dům',
  house:             'Rodinný dům',
  dom:               'Rodinný dům',
  apartment:         'Byt',
  flat:              'Byt',
  commercial:        'Komerční objekt',
  office:            'Kancelář',
  kancelář:          'Kancelář',
  kancelar:          'Kancelář',
  panerak:           'Panelák',
  panelak:           'Panelák',
}

/** Case-insensitive lookup for property type labels (MarketplaceJobCard) */
function getPropertyLabel(propertyType: string | undefined | null, lang: 'sk' | 'cz' = 'sk'): string | undefined {
  if (!propertyType) return undefined
  const labels = lang === 'cz' ? PROPERTY_LABELS_CZ : PROPERTY_LABELS_SK
  return labels[propertyType] || labels[propertyType.toLowerCase()] || undefined
}

// ── Helper: single field row ─────────────────────────────────────────

function Row({ label, value }: { label: string; value?: string | number | string[] | null }) {
  if (!value && value !== 0) return null
  if (Array.isArray(value) && value.length === 0) return null

  const display = Array.isArray(value) ? value : [String(value)]
  return (
    <div className="mkp-row">
      <span className="mkp-row-label">{label}</span>
      <span className="mkp-row-value">
        {Array.isArray(value)
          ? <span className="mkp-tags">{value.map((v, i) => <span key={i} className="mkp-tag">{v}</span>)}</span>
          : display[0]}
      </span>
    </div>
  )
}

// ── Helper: section divider ──────────────────────────────────────────

function Section({ children }: { children: React.ReactNode }) {
  return <div className="mkp-section">{children}</div>
}

// ── Slot date formatter ──────────────────────────────────────────────

function fmtDate(dateStr: string, lang: 'sk' | 'cz' = 'sk'): string {
  if (!dateStr) return '—'
  try {
    const locale = lang === 'cz' ? 'cs-CZ' : 'sk-SK'
    return new Date(dateStr).toLocaleDateString(locale, {
      weekday: 'long', day: 'numeric', month: 'long',
    })
  } catch { return dateStr }
}

// ── Helper: add N hours to "HH:MM" string, capped at 21:00 ──────────

function addHours(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number)
  const newH = Math.min((h || 0) + hours, 21)
  return `${String(newH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
}

// ── Helper: get today's date as YYYY-MM-DD ───────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

// ── Main component ───────────────────────────────────────────────────

interface Photo { id: number; filename: string | null; mime_type: string; data: string; created_at: string }

/** A suggested slot from dispatch engine or custom date/time chosen by tech */
interface ChosenSuggestedSlot {
  source: 'suggested' | 'custom'
  date: string
  startTime: string
  endTime: string
  label: string
}

interface Props {
  job: MarketplaceJob
  onAccept: (jobId: string, chosenSlot: MarketplaceJobSlot | null, chosenSuggestedSlot?: ChosenSuggestedSlot | null, slotSource?: 'client' | 'technician') => void
  onDecline?: (jobId: string, reason?: string) => void
  isAccepting?: boolean
  isDeclining?: boolean
  lang?: Language
}

export default function MarketplaceJobCard({ job, onAccept, onDecline, isAccepting, isDeclining, lang = 'sk' }: Props) {
  const t = (key: string) => getTranslation(lang, key)
  const tc = (key: string) => getTranslation(lang, `marketplace.card.${key}`)
  const tl = (sk: string, cz: string) => lang === 'cz' ? cz : sk
  const d: DiagData = job.diagnostic || {}
  const ft = d.fault_type || ''

  const [expanded, setExpanded] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<MarketplaceJobSlot | null>(null)
  const [showSlotWarning, setShowSlotWarning] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [photosLoaded, setPhotosLoaded] = useState(false)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [declineReasonCustom, setDeclineReasonCustom] = useState('')

  // Smart dispatch slot state
  const [selectedSuggestedIdx, setSelectedSuggestedIdx] = useState<number | null>(null)
  const [useCustomSlot, setUseCustomSlot] = useState(false)
  const [customDate, setCustomDate] = useState('')
  const [customStartTime, setCustomStartTime] = useState('')
  const [customEndTime, setCustomEndTime] = useState('')

  // Calendar overlay state
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarDate, setCalendarDate] = useState('')
  const [calendarError, setCalendarError] = useState(false)

  const hasSlots = job.availableSlots.length > 0
  const hasSuggestedSlots = (job.suggestedSlots?.length ?? 0) > 0
  const hasDiag = !!(d.fault_type || d.problem_desc)
  // Fallback: show job description/category when diagnostic form not filled
  const hasJobDesc = !!(job.description || job.category)

  // Track that technician viewed this job detail (fire-and-forget, first expand only)
  useEffect(() => {
    if (!expanded) return
    fetch(`/api/marketplace/${job.id}/view`, { method: 'PATCH', credentials: 'include' }).catch(() => {})
  }, [expanded, job.id]) // intentionally no deps gate — endpoint handles idempotency

  // Load photos when card is expanded for the first time
  useEffect(() => {
    if (!expanded || photosLoaded) return
    fetch(`/api/marketplace/${job.id}/photos`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) {
          console.error(`[MarketplaceJobCard] photos fetch failed: ${r.status} for job ${job.id}`)
          return null
        }
        return r.json()
      })
      .then(json => { if (json?.success && Array.isArray(json.photos)) setPhotos(json.photos) })
      .catch(err => console.error('[MarketplaceJobCard] photos fetch error:', err))
      .finally(() => setPhotosLoaded(true))
  }, [expanded, photosLoaded, job.id])

  // ── Calendar helpers ─────────────────────────────────────────────────

  /** Load jobs and time-blocks for a given date and convert to CalendarEvents */
  const loadCalendar = useCallback(async (dateStr: string) => {
    if (!dateStr) return
    setCalendarLoading(true)
    try {
      const [jobsRes, blocksRes] = await Promise.all([
        fetch('/api/dispatch/jobs?mine=true&all_statuses=true', { credentials: 'include' }),
        fetch('/api/dispatch/profile/time-blocks', { credentials: 'include' }),
      ])

      const jobsJson = jobsRes.ok ? await jobsRes.json() : null
      const blocksJson = blocksRes.ok ? await blocksRes.json() : null

      const jobs: Array<Record<string, unknown>> = Array.isArray(jobsJson) ? jobsJson : (jobsJson?.jobs || [])
      const blocks: Array<Record<string, unknown>> = Array.isArray(blocksJson) ? blocksJson : (blocksJson?.blocks || blocksJson?.timeBlocks || [])

      const events: CalendarEvent[] = []

      // Jobs scheduled on this date
      for (const j of jobs) {
        const scheduled = (j.scheduledDate || j.scheduled_date) as string | undefined
        if (!scheduled) continue
        const jDate = scheduled.slice(0, 10)
        if (jDate !== dateStr) continue

        const timeRange = (j.scheduledTime || j.scheduled_time) as string | undefined
        const parts = timeRange ? timeRange.split(/\s*[-–]\s*/) : []
        const start = parts[0] || '09:00'
        const end = parts[1] || addHours(start, 2)

        events.push({
          id: `job-${j.id}`,
          title: (j.category || j.name || (lang === 'cz' ? 'Zakázka' : 'Zákazka')) as string,
          startTime: start,
          endTime: end,
          type: 'job',
          color: '#3B82F6',
        })
      }

      // Time blocks on this date
      for (const b of blocks) {
        const blockDate = ((b.date as string) || '').slice(0, 10)
        if (blockDate !== dateStr) continue
        const blockType = b.type as string
        const typeLabel =
          blockType === 'vacation' ? (lang === 'cz' ? 'Dovolená' : 'Dovolenka') :
          blockType === 'personal' ? (lang === 'cz' ? 'Osobní' : 'Osobné') : (lang === 'cz' ? 'Blokovaný čas' : 'Blokovaný čas')
        events.push({
          id: `block-${b.id}`,
          title: typeLabel,
          startTime: (b.start_time || b.startTime) as string,
          endTime: (b.end_time || b.endTime) as string,
          type: 'time_block',
        })
      }

      setCalendarEvents(events)
      setCalendarError(false)
    } catch (err) {
      console.error('[Calendar] Failed to load:', err)
      setCalendarError(true)
    } finally {
      setCalendarLoading(false)
    }
  }, [])

  /** Extract the currently selected proposed slot (for ghost overlay) */
  const getProposedSlot = useCallback((): { startTime: string; endTime: string } | null => {
    if (useCustomSlot && customStartTime) {
      return { startTime: customStartTime, endTime: customEndTime || addHours(customStartTime, 2) }
    }
    if (selectedSuggestedIdx !== null && job.suggestedSlots[selectedSuggestedIdx]) {
      const s = job.suggestedSlots[selectedSuggestedIdx]
      return { startTime: s.startTime, endTime: s.endTime }
    }
    if (selectedSlot?.time) {
      const parts = selectedSlot.time.split(/\s*[-–]\s*/)
      return { startTime: parts[0] || '09:00', endTime: parts[1] || addHours(parts[0] || '09:00', 2) }
    }
    return null
  }, [useCustomSlot, customStartTime, customEndTime, selectedSuggestedIdx, selectedSlot, job.suggestedSlots])

  /** Determine initial calendar date from selected slot, first suggested slot, or today */
  const getInitialCalendarDate = useCallback((): string => {
    if (useCustomSlot && customDate) return customDate
    if (selectedSuggestedIdx !== null && job.suggestedSlots[selectedSuggestedIdx]) {
      return job.suggestedSlots[selectedSuggestedIdx].date
    }
    if (job.suggestedSlots.length > 0) return job.suggestedSlots[0].date
    if (selectedSlot?.date) return selectedSlot.date
    if (job.availableSlots.length > 0) return job.availableSlots[0].date
    return todayISO()
  }, [useCustomSlot, customDate, selectedSuggestedIdx, selectedSlot, job.suggestedSlots, job.availableSlots])

  // Load calendar when toggled on or when date changes
  useEffect(() => {
    if (!showCalendar) return
    const d = calendarDate || getInitialCalendarDate()
    if (!calendarDate) setCalendarDate(d)
    loadCalendar(d)
  }, [showCalendar, calendarDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // When calendarDate changes (user navigates days), reload
  useEffect(() => {
    if (!showCalendar || !calendarDate) return
    loadCalendar(calendarDate)
  }, [calendarDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAcceptClick = useCallback(() => {
    // If there are client-provided slots and none selected, warn
    if (hasSlots && !selectedSlot && !hasSuggestedSlots) {
      setShowSlotWarning(true)
      setExpanded(true)
      return
    }

    // If using a suggested slot from dispatch engine
    if (hasSuggestedSlots && !hasSlots) {
      if (useCustomSlot) {
        if (!customDate || !customStartTime) {
          setShowSlotWarning(true)
          return
        }
        const chosen: ChosenSuggestedSlot = {
          source: 'custom',
          date: customDate,
          startTime: customStartTime,
          endTime: customEndTime || customStartTime,
          label: tc('customSlot'),
        }
        onAccept(job.id, null, chosen, 'technician')
        return
      }
      if (selectedSuggestedIdx !== null) {
        const slot = job.suggestedSlots[selectedSuggestedIdx]
        if (slot) {
          const chosen: ChosenSuggestedSlot = {
            source: 'suggested',
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            label: slot.label,
          }
          onAccept(job.id, null, chosen, 'technician')
          return
        }
      }
      // No slot selected yet — require selection
      setShowSlotWarning(true)
      setExpanded(true)
      return
    }

    // No client slots and no suggested slots — technician MUST enter custom date/time
    if (!hasSlots && !hasSuggestedSlots) {
      if (!customDate || !customStartTime) {
        setShowSlotWarning(true)
        setExpanded(true)
        return
      }
      // Urgent jobs: validate date is within 24 hours
      if (job.urgency === 'urgent') {
        const proposedDate = new Date(customDate + 'T' + customStartTime)
        const maxDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
        if (proposedDate > maxDate) {
          setShowSlotWarning(true)
          return
        }
      }
      const chosen: ChosenSuggestedSlot = {
        source: 'custom',
        date: customDate,
        startTime: customStartTime,
        endTime: customEndTime || customStartTime,
        label: tc('customSlot'),
      }
      onAccept(job.id, null, chosen, 'technician')
      return
    }

    setShowSlotWarning(false)
    onAccept(job.id, selectedSlot, null, 'client')
  }, [hasSlots, hasSuggestedSlots, selectedSlot, selectedSuggestedIdx, useCustomSlot, customDate, customStartTime, customEndTime, onAccept, job.id, job.suggestedSlots])

  return (
    <>
      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="mkp-lightbox" onClick={() => setLightbox(null)}>
          <div className="mkp-lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="mkp-lightbox-close" onClick={() => setLightbox(null)}>✕</button>
            <img src={lightbox.data} alt={lightbox.filename || 'foto'} className="mkp-lightbox-img" />
            {lightbox.filename && (
              <p className="mkp-lightbox-caption">{lightbox.filename}</p>
            )}
          </div>
        </div>
      )}

      <div className="mkp-card" data-urgency={job.urgency}>

        {/* ── Acute urgency level banner (from dispatch engine) ── */}
        {job.urgencyLevel === 'acute' && (
          <div style={{
            background: 'var(--danger, #dc2626)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            padding: '8px 14px',
            letterSpacing: '0.5px',
            borderRadius: '8px 8px 0 0',
            marginBottom: 2,
          }}>
            {tl('URGENTNÉ — nutný zásah dnes', 'URGENTNÍ — nutný zásah dnes')}
          </div>
        )}

        {/* ── Urgency banner (job field) ── */}
        {job.urgency === 'urgent' && job.urgencyLevel !== 'acute' && (
          <div className="mkp-urgent-banner">{tl('URGENTNÁ ZÁKAZKA', 'URGENTNÍ ZAKÁZKA')}</div>
        )}

        {/* ── Nearby job context banner (smart dispatch) ── */}
        {job.nearbyContext && (
          <div style={{
            background: 'var(--bg-card, #F9FAFB)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 14px',
            margin: '4px 0 6px',
            fontSize: 13,
          }}>
            <div style={{ fontWeight: 700, color: 'var(--dark, #111827)', marginBottom: 3 }}>
              {job.nearbyContext.distanceKm.toFixed(1)} {tl('km od vašej zákazky v', 'km od vaší zakázky v')} {job.nearbyContext.jobCity}
            </div>
            <div style={{ color: 'var(--text-secondary, #374151)', fontSize: 12 }}>
              {job.nearbyContext.jobRefNumber}
              {job.nearbyContext.jobDate ? ` · ${job.nearbyContext.jobDate}` : ''}
              {job.nearbyContext.jobTime ? ` · ${job.nearbyContext.jobTime}` : ''}
            </div>
          </div>
        )}

        {/* ── Location + distance ── */}
        <div className="mkp-card-top">
          <div className="mkp-location">
            <span className="mkp-city">{job.customerCity}</span>
            {job.customerPsc && <span className="mkp-psc">{job.customerPsc}</span>}
          </div>
          {job.distance !== undefined && (
            <span className="mkp-distance-pill">
              📍 {job.distance.toFixed(1)} km
              {job.durationMinutes !== undefined && (
                <> · ~{job.durationMinutes} min</>
              )}
            </span>
          )}
        </div>

        {/* ── Category / fault header ── */}
        {(hasDiag || hasJobDesc) ? (
          <div className="mkp-fault-header">
            <span className="mkp-fault-label">
              {hasDiag
                ? ((lang === 'cz' ? FAULT_LABELS_CZ : FAULT_LABELS_SK)[ft] || (ft ? `🔧 ${ft}` : tl('🔧 Neurčený typ poruchy', '🔧 Neurčený typ poruchy')))
                : ((lang === 'cz' ? FAULT_LABELS_CZ : FAULT_LABELS_SK)[job.category || ''] || (job.category ? getCategoryLabel(job.category) : tl('🔧 Servisná zákazka', '🔧 Servisní zakázka')))}
            </span>
            {d.urgency && (
              <span className="mkp-urgency-badge">
                {URGENCY_COLORS[d.urgency] && (
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: URGENCY_COLORS[d.urgency], marginRight: 5, flexShrink: 0, verticalAlign: 'middle' }} aria-hidden="true" />
                )}
                {(lang === 'cz' ? URGENCY_LABELS_CZ : URGENCY_LABELS_SK)[d.urgency] || d.urgency}
              </span>
            )}
          </div>
        ) : (
          <div className="mkp-no-diag">{tl('Zákazník formulár ešte nevyplnil', 'Zákazník formulář ještě nevyplnil')}</div>
        )}

        {/* ── Order description (from intake/email) — always visible if present ── */}
        {job.description && (
          <div className="mkp-quick-summary">
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary, #374151)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {tl('Popis z objednávky', 'Popis z objednávky')}
            </p>
            <p className="mkp-problem-text">
              {expanded
                ? job.description
                : job.description.length > 150
                ? `${job.description.slice(0, 150)}…`
                : job.description}
            </p>
          </div>
        )}

        {/* ── Diagnostic summary (from customer form) ── */}
        {hasDiag && (
          <div className="mkp-quick-summary">
            {d.problem_desc && d.problem_desc.trim() !== (job.description || '').trim() && (
              <>
                {job.description && (
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary, #374151)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {tl('Z diagnostického formulára', 'Z diagnostického formuláře')}
                  </p>
                )}
                <p className="mkp-problem-text">
                  {expanded
                    ? d.problem_desc
                    : d.problem_desc.length > 150
                    ? `${d.problem_desc.slice(0, 150)}…`
                    : d.problem_desc}
                </p>
              </>
            )}
            <div className="mkp-quick-row">
              {d.property_type && <span className="mkp-chip">{getPropertyLabel(d.property_type, lang) || d.property_type}</span>}
              {d.floor && <span className="mkp-chip">{d.floor}</span>}
              {(d.photo_count ?? 0) > 0 && <span className="mkp-chip">{d.photo_count} {tc('photoCount')}</span>}
            </div>
          </div>
        )}

        {/* ── Expand button ── */}
        <button className="mkp-expand-btn" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}>
          {expanded ? tc('hideDetails') : tc('showDetails')}
        </button>

        {/* ── Full diagnostic detail (expanded) ── */}
        {expanded && hasDiag && (
          <div className="mkp-detail">

            <Section>
              <Row label={tl('Typ nehnuteľnosti', 'Typ nemovitosti')} value={getPropertyLabel(d.property_type, lang) || d.property_type} />
              <Row label={tl('Poschodie / byt', 'Patro / byt')} value={d.floor} />
              <Row label={tl('Poznámka k adrese', 'Poznámka k adrese')} value={d.address_note} />
            </Section>

            {/* Vodoinstalace */}
            {ft === 'vodoinstalater' && <Section>
              <Row label={tl('Typ problému', 'Typ problému')} value={d.plumb_issue} />
              <Row label={tl('Umiestnenie', 'Umístění')} value={d.plumb_location} />
              <Row label={tl('Hlavný uzáver vody', 'Hlavní uzávěr vody')} value={d.plumb_water_shutoff} />
              <Row label={tl('Závažnosť úniku', 'Závažnost úniku')} value={d.plumb_severity} />
              <Row label={tl('Typ batérie', 'Typ baterie')} value={d.plumb_faucet_type} />
              <Row label={tl('Umiestnenie batérie', 'Umístění baterie')} value={d.plumb_faucet_location} />
              <Row label={tl('Značka batérie', 'Značka baterie')} value={d.plumb_faucet_brand} />
              <Row label={tl('Príznaky', 'Příznaky')} value={d.plumb_faucet_symptom} />
              <Row label={tl('Materiál potrubia', 'Materiál potrubí')} value={d.plumb_pipe_material} />
              <Row label={tl('Poznámky', 'Poznámky')} value={d.plumb_notes} />
              {/* WC sub-panel */}
              <Row label={tl('WC problém', 'WC problém')} value={d.wc_symptom} />
              <Row label={tl('Typ nádržky WC', 'Typ nádržky WC')} value={d.wc_tank_type} />
              <Row label={tl('Vek WC', 'Stáří WC')} value={d.wc_age} />
            </Section>}

            {/* Elektrika */}
            {ft === 'elektrikar' && <Section>
              <Row label={tl('Typ problému', 'Typ problému')} value={d.elec_issue} />
              <Row label={tl('Rozsah výpadku', 'Rozsah výpadku')} value={d.elec_scope} />
              <Row label={tl('Stav ističa', 'Stav jističe')} value={d.elec_breaker} />
              <Row label={tl('Zápach / stopy žiaru', 'Zápach / stopy žáru')} value={d.elec_burn} />
              <Row label={tl('Vek inštalácie', 'Stáří instalace')} value={d.elec_age} />
              <Row label={tl('Poznámky', 'Poznámky')} value={d.elec_notes} />
            </Section>}

            {/* Kotel */}
            {ft === 'kotel' && <Section>
              <Row label={tl('Značka', 'Značka')} value={d.boiler_brand} />
              <Row label={tl('Model', 'Model')} value={d.boiler_model} />
              <Row label={tl('Palivo', 'Palivo')} value={d.boiler_fuel} />
              <Row label={tl('Vek', 'Stáří')} value={d.boiler_age} />
              <Row label={tl('Čo nefunguje', 'Co nefunguje')} value={d.boiler_issue} />
              <Row label={tl('Chybový kód', 'Chybový kód')} value={d.boiler_error_code} />
              <Row label={tl('Tlak (bar)', 'Tlak (bar)')} value={d.boiler_pressure} />
              <Row label={tl('Zápach plynu', 'Zápach plynu')} value={d.boiler_gas_smell} />
              <Row label={tl('Posledný servis', 'Poslední servis')} value={d.boiler_last_service} />
              <Row label={tl('Umiestnenie kotla', 'Umístění kotle')} value={d.boiler_location} />
              <Row label={tl('Poznámky', 'Poznámky')} value={d.boiler_notes} />
            </Section>}

            {/* Topenie */}
            {ft === 'topeni' && <Section>
              <Row label={tl('Typ systému', 'Typ systému')} value={d.heat_system} />
              <Row label={tl('Čo nefunguje', 'Co nefunguje')} value={d.heat_issue} />
              <Row label={tl('Počet radiátorov', 'Počet radiátorů')} value={d.heat_radiator_count} />
              <Row label={tl('Typ podlah. topenia', 'Typ podlah. topení')} value={d.heat_floor_type} />
              <Row label={tl('Vek', 'Stáří')} value={d.heat_age} />
              <Row label={tl('Poznámky', 'Poznámky')} value={d.heat_notes} />
            </Section>}

            {/* Spotrebič */}
            {ft === 'spotrebic' && <Section>
              <Row label={tl('Typ spotrebiča', 'Typ spotřebiče')} value={d.appliance_type} />
              <Row label={tl('Značka a model', 'Značka a model')} value={d.appliance_brand} />
              <Row label={tl('Vek', 'Stáří')} value={d.appliance_age} />
              <Row label={tl('Inštalácia', 'Instalace')} value={d.appliance_install} />
              <Row label={tl('Porucha', 'Porucha')} value={d.appliance_issue} />
              <Row label={tl('Chybový kód', 'Chybový kód')} value={d.appliance_error} />
              <Row label={tl('Poznámky', 'Poznámky')} value={d.appliance_notes} />
            </Section>}

            {/* Deratizácia */}
            {ft === 'deratizace' && <Section>
              <Row label={tl('Typ problému', 'Typ problému')} value={d.pest_type} />
              <Row label={tl('Trvanie', 'Trvání')} value={d.pest_duration} />
              <Row label={tl('Rozsah', 'Rozsah')} value={d.pest_scope} />
              <Row label={tl('Bezp. info', 'Bezp. info')} value={d.pest_safety} />
              <Row label={tl('Predchádzajúca deratizácia', 'Předchozí deratizace')} value={d.pest_previous} />
              <Row label={tl('Poznámky', 'Poznámky')} value={d.pest_notes} />
            </Section>}

            {/* Zámočník */}
            {ft === 'zamecnik' && <Section>
              <Row label={tl('Situácia', 'Situace')} value={d.lock_situation} />
              <Row label={tl('Osoba vnútri', 'Osoba uvnitř')} value={d.lock_person_inside} />
              <Row label={tl('Typ dverí', 'Typ dveří')} value={d.lock_door_type} />
              <Row label={tl('Typ zámku', 'Typ zámku')} value={d.lock_type} />
              <Row label={tl('Počet zámkov', 'Počet zámků')} value={d.lock_count} />
              <Row label={tl('Poznámky', 'Poznámky')} value={d.lock_notes} />
            </Section>}

            {/* Plyn */}
            {ft === 'plynar' && <Section>
              <Row label={tl('Zápach plynu', 'Zápach plynu')} value={d.gas_smell} />
              <Row label={tl('Typ zariadenia', 'Typ zařízení')} value={d.gas_device} />
              <Row label={tl('Problém', 'Problém')} value={d.gas_issue} />
              <Row label={tl('Vetranie', 'Větrání')} value={d.gas_ventilation} />
              <Row label={tl('Poznámky', 'Poznámky')} value={d.gas_notes} />
            </Section>}

            {/* Odpady */}
            {ft === 'odpady' && <Section>
              <Row label={tl('Kde je problém', 'Kde je problém')} value={d.drain_location} />
              <Row label={tl('Rozsah', 'Rozsah')} value={d.drain_scope} />
              <Row label={tl('Poschodie', 'Patro')} value={d.drain_floor} />
              <Row label={tl('Závažnosť', 'Závažnost')} value={d.drain_severity} />
              <Row label={tl('Vek odpadu', 'Stáří odpadu')} value={d.drain_age} />
              <Row label={tl('Predchádzajúce čistenie', 'Předchozí čištění')} value={d.drain_previous_cleaning} />
              <Row label={tl('Poznámky', 'Poznámky')} value={d.drain_notes} />
            </Section>}

            {/* Klimatizácia */}
            {ft === 'klimatizace' && <Section>
              <Row label={tl('Značka', 'Značka')} value={d.ac_brand} />
              <Row label={tl('Vek', 'Stáří')} value={d.ac_age} />
              <Row label={tl('Problém', 'Problém')} value={d.ac_issue} />
              <Row label={tl('Typ jednotky', 'Typ jednotky')} value={d.ac_type} />
              <Row label={tl('Poznámky', 'Poznámky')} value={d.ac_notes} />
            </Section>}

            {/* Tepelné čerpadlo */}
            {ft === 'tepelne_cerpadlo' && <Section>
              <Row label={tl('Značka', 'Značka')} value={d.hp_brand} />
              <Row label={tl('Vek', 'Stáří')} value={d.hp_age} />
              <Row label={tl('Problém', 'Problém')} value={d.hp_issue} />
              <Row label={tl('Chybový kód', 'Chybový kód')} value={d.hp_error_code} />
              <Row label={tl('Poznámky', 'Poznámky')} value={d.hp_notes} />
            </Section>}

            {/* Solárne panely */}
            {ft === 'solarni_panely' && <Section>
              <Row label={tl('Počet panelov', 'Počet panelů')} value={d.sp_count} />
              <Row label={tl('Vek systému', 'Stáří systému')} value={d.sp_age} />
              <Row label={tl('Problém', 'Problém')} value={d.sp_issue} />
              <Row label={tl('Značka invertora', 'Značka invertoru')} value={d.sp_inverter_brand} />
              <Row label={tl('Poznámky', 'Poznámky')} value={d.sp_notes} />
            </Section>}

            {/* Fotky */}
            {!photosLoaded && (
              <div className="mkp-photos-loading">
                <span className="spinner-sm" /> {t('dispatch.loadingPhotos')}
              </div>
            )}
            {photosLoaded && photos.length > 0 && (
              <Section>
                <p className="mkp-section-title">{`${t('dispatch.customerPhotos')} (${photos.length})`}</p>
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
              </Section>
            )}
            {photosLoaded && photos.length === 0 && (d.photo_count ?? 0) > 0 && (
              <p className="mkp-photos-none">{`${d.photo_count} ${t('dispatch.photosLoadError')}`}</p>
            )}

            {/* AI Diagnostika */}
            {(job.diagResult || job.photoAnalysis) && (
              <Section>
                <p className="mkp-section-title">{tl('🤖 AI Diagnostika', '🤖 AI Diagnostika')}</p>
                <DiagnosticBrainCard
                  diagResult={job.diagResult as DiagResult}
                  photoAnalysis={job.photoAnalysis as any}
                  jobId={Number(job.id)}
                  lang={lang}
                />
              </Section>
            )}

          </div>
        )}

        {/* ── Schedule note ── */}
        {d.schedule_note && expanded && (
          <div className="mkp-schedule-note">
            <span className="mkp-schedule-note-label">{tc('scheduleNote')}</span>
            <span className="mkp-schedule-note-text">{d.schedule_note}</span>
          </div>
        )}

        {/* ── Appointment slots ── */}
        {hasSlots && expanded && (
          <div className="mkp-slots">
            <p className="mkp-slots-title">{tc('clientSlotsTitle')}</p>
            <div className="mkp-slot-list">
              {job.availableSlots.map((slot, i) => {
                const isSel = selectedSlot?.date === slot.date && selectedSlot?.time === slot.time
                return (
                  <button
                    key={i}
                    className={`mkp-slot-btn${isSel ? ' selected' : ''}`}
                    onClick={() => { setSelectedSlot(isSel ? null : slot); setShowSlotWarning(false) }}
                  >
                    <span className="mkp-slot-date">{fmtDate(slot.date, lang)}</span>
                    {slot.time && <span className="mkp-slot-time">{slot.time}</span>}
                    {isSel && <span className="mkp-slot-check">✓</span>}
                  </button>
                )
              })}
            </div>
            {showSlotWarning && (
              <p className="mkp-slot-warning">{tc('selectSlotWarning')}</p>
            )}
          </div>
        )}

        {/* ── Suggested slots from dispatch engine (shown when no client slots) ── */}
        {hasSuggestedSlots && !hasSlots && (
          <div style={{ padding: '12px 0 4px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark, #111827)', margin: '0 0 8px' }}>
              {tc('suggestedSlotsTitle')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {job.suggestedSlots.map((slot, i) => {
                const isSel = selectedSuggestedIdx === i && !useCustomSlot
                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedSuggestedIdx(i); setUseCustomSlot(false); setShowSlotWarning(false) }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: isSel ? '2px solid var(--gold, #ca8a04)' : '1px solid var(--border)',
                      background: isSel ? 'rgba(202,138,4,0.08)' : 'var(--bg-card, #f9fafb)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark, #111827)' }}>
                        {slot.label}: {slot.startTime} – {slot.endTime}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary, #4B5563)', marginTop: 2 }}>
                        {slot.date}
                      </div>
                    </div>
                    {isSel && (
                      <span style={{ color: 'var(--gold, #ca8a04)', fontWeight: 700, fontSize: 16 }}>✓</span>
                    )}
                  </button>
                )
              })}

              {/* Custom slot option */}
              <button
                onClick={() => { setUseCustomSlot(true); setSelectedSuggestedIdx(null); setShowSlotWarning(false) }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: useCustomSlot ? '2px solid var(--gold, #ca8a04)' : '1px solid var(--border)',
                  background: useCustomSlot ? 'rgba(202,138,4,0.08)' : 'var(--bg-card, #f9fafb)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark, #111827)' }}>
                  {tc('customSlot')}
                </span>
                {useCustomSlot && (
                  <span style={{ color: 'var(--gold, #ca8a04)', fontWeight: 700, fontSize: 16 }}>✓</span>
                )}
              </button>

              {/* Custom date/time inputs */}
              {useCustomSlot && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0 4px' }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark, #111827)', display: 'block', marginBottom: 4 }}>
                      {tc('dateLabel')}
                    </label>
                    <input
                      type="date"
                      value={customDate}
                      onChange={e => setCustomDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark, #111827)', display: 'block', marginBottom: 4 }}>
                        {tc('timeFrom')}
                      </label>
                      <input
                        type="time"
                        value={customStartTime}
                        onChange={e => setCustomStartTime(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark, #111827)', display: 'block', marginBottom: 4 }}>
                        {tc('timeTo')}
                      </label>
                      <input
                        type="time"
                        value={customEndTime}
                        onChange={e => setCustomEndTime(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            {showSlotWarning && hasSuggestedSlots && !hasSlots && (
              <p style={{ fontSize: 12, color: 'var(--danger, #dc2626)', margin: '6px 0 0', fontWeight: 600 }}>
                {tc('selectSlotWarningCustom')}
              </p>
            )}
          </div>
        )}

        {/* ── CRM scheduled date (operator-proposed) shown to tech ── */}
        {!hasSlots && !hasSuggestedSlots && job.scheduledDate && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.03))',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 10,
            padding: '10px 14px',
            margin: '10px 0 4px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark, #111827)' }}>
                {tc('operatorProposedTitle')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--dark, #111827)', marginTop: 2 }}>
                {fmtDate(job.scheduledDate, lang)}{job.scheduledTime ? `, ${job.scheduledTime}` : ''}
              </div>
              <div style={{ fontSize: 11, color: 'var(--g4, #57534E)', marginTop: 2 }}>
                {tc('operatorProposedHint')}
              </div>
            </div>
          </div>
        )}

        {/* ── Custom date/time when NO slots available ── */}
        {!hasSlots && !hasSuggestedSlots && (
          <div style={{ padding: '12px 0 4px' }}>
            {/* Urgency banner */}
            {job.urgency === 'urgent' ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(202,138,4,0.12), rgba(202,138,4,0.04))',
                border: '1px solid rgba(202,138,4,0.3)',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{ fontSize: 18 }}>⚡</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark, #111827)' }}>
                    {tc('urgentTitle')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--g4, #57534E)' }}>
                    {tc('urgentHint')}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--g4, #57534E)', margin: '0 0 8px' }}>
                {tc('clientWaiting')}
              </p>
            )}

            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark, #111827)', margin: '0 0 8px' }}>
              {tc('enterDateTitle')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark, #111827)', display: 'block', marginBottom: 4 }}>
                  {tc('dateLabel')}
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={e => { setCustomDate(e.target.value); setShowSlotWarning(false) }}
                  min={new Date().toISOString().split('T')[0]}
                  max={job.urgency === 'urgent' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark, #111827)', display: 'block', marginBottom: 4 }}>
                    {tc('timeFrom')}
                  </label>
                  <input
                    type="time"
                    value={customStartTime}
                    onChange={e => { setCustomStartTime(e.target.value); setShowSlotWarning(false) }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark, #111827)', display: 'block', marginBottom: 4 }}>
                    {tc('timeTo')}
                  </label>
                  <input
                    type="time"
                    value={customEndTime}
                    onChange={e => setCustomEndTime(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
            {showSlotWarning && (
              <p style={{ fontSize: 12, color: 'var(--danger, #dc2626)', margin: '6px 0 0', fontWeight: 600 }}>
                {tc('enterDateWarning')}
              </p>
            )}
            <p style={{ fontSize: 11, color: 'var(--g4, #57534E)', margin: '6px 0 0' }}>
              {tc('slotWillBeSent')}
            </p>
          </div>
        )}

        {/* ── Calendar overlay toggle ── */}
        {(hasSuggestedSlots || hasSlots || useCustomSlot || (!hasSlots && !hasSuggestedSlots)) && (
          <div style={{ padding: '4px 0 2px' }}>
            <button
              onClick={() => {
                if (!showCalendar) {
                  // Ensure date is initialised before opening
                  const d = calendarDate || getInitialCalendarDate()
                  if (!calendarDate) setCalendarDate(d)
                }
                setShowCalendar(v => !v)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: showCalendar
                  ? '1px solid var(--gold, #ca8a04)'
                  : '1px solid var(--border)',
                background: showCalendar
                  ? 'rgba(202,138,4,0.08)'
                  : 'var(--bg-elevated)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--dark, #111827)',
              }}
            >
              📅 {showCalendar ? tc('hideCalendar') : tc('showCalendar')}
              {calendarLoading && (
                <span style={{ fontSize: 11, color: 'var(--g4)', fontWeight: 400 }}>
                  {tc('calendarLoading')}
                </span>
              )}
            </button>

            {calendarError && (
              <div style={{
                padding: '10px 14px',
                marginTop: 8,
                background: 'rgba(220,38,38,0.06)',
                borderRadius: 8,
                fontSize: 13,
                color: 'var(--danger, #e53e3e)',
              }}>
                {tc('calendarError')}
              </div>
            )}
            {showCalendar && !calendarError && (
              <MiniCalendarOverlay
                date={calendarDate || todayISO()}
                events={calendarEvents}
                proposedSlot={getProposedSlot()}
                onDateChange={(d) => setCalendarDate(d)}
                onClose={() => setShowCalendar(false)}
                lang={lang}
              />
            )}
          </div>
        )}

        {/* ── Accept / Decline buttons ── */}
        <div className="mkp-accept-area">
          {selectedSlot && (
            <div className="mkp-selected-slot-info">
              {tc('selectedSlotLabel')} <strong>{fmtDate(selectedSlot.date, lang)}</strong>
              {selectedSlot.time ? `, ${selectedSlot.time}` : ''}
            </div>
          )}
          <button
            className="btn btn-gold btn-full mkp-accept-btn"
            onClick={handleAcceptClick}
            disabled={isAccepting || isDeclining}
          >
            {isAccepting ? tc('acceptingBtn') : tc('acceptBtn')}
          </button>
          {!hasSlots && !hasSuggestedSlots && (
            <p className="mkp-no-slots-note">{tc('slotWillBeSentNote')}</p>
          )}

          {/* Decline */}
          {onDecline && !showDeclineConfirm && (
            <button
              className="btn btn-full"
              onClick={() => setShowDeclineConfirm(true)}
              disabled={isAccepting || isDeclining}
              style={{
                marginTop: 8,
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary, #374151)',
                fontSize: 13,
              }}
            >
              {tc('declineBtn')}
            </button>
          )}

          {showDeclineConfirm && (
            <div style={{
              marginTop: 10,
              padding: '12px 14px',
              background: 'var(--bg-card, #F9FAFB)',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}>
              <p style={{ fontSize: 13, margin: '0 0 10px', color: 'var(--text-secondary, #374151)' }}>
                {tc('declineConfirmText')}
              </p>

              {/* Reason select */}
              <div style={{ marginBottom: 8 }}>
                <select
                  value={declineReason}
                  onChange={e => { setDeclineReason(e.target.value); setDeclineReasonCustom('') }}
                  disabled={isDeclining}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: 13,
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    background: 'var(--w, #fff)',
                    color: declineReason ? 'var(--dark, #111)' : 'var(--g4, #9CA3AF)',
                    outline: 'none',
                    appearance: 'auto',
                  }}
                >
                  <option value="">{tl('Vyberte dôvod...', 'Vyberte důvod...')}</option>
                  <option value="daleko">{tl('Príliš ďaleko', 'Příliš daleko')}</option>
                  <option value="nemam_material">{tl('Nemám potrebný materiál', 'Nemám potřebný materiál')}</option>
                  <option value="nemam_cas">{tl('Nemám čas', 'Nemám čas')}</option>
                  <option value="nie_moja_specializacia">{tl('Nie je moja špecializácia', 'Není moje specializace')}</option>
                  <option value="ine">{tl('Iný dôvod', 'Jiný důvod')}</option>
                </select>
              </div>

              {/* Free-text input when "Iný dôvod" selected */}
              {declineReason === 'ine' && (
                <div style={{ marginBottom: 8 }}>
                  <input
                    type="text"
                    value={declineReasonCustom}
                    onChange={e => setDeclineReasonCustom(e.target.value)}
                    placeholder={tl('Popíšte dôvod...', 'Popište důvod...')}
                    disabled={isDeclining}
                    maxLength={500}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: 13,
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      background: 'var(--w, #fff)',
                      color: 'var(--dark, #111)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-full"
                  onClick={() => {
                    const finalReason = declineReason === 'ine'
                      ? (declineReasonCustom.trim() || 'ine')
                      : declineReason || undefined
                    onDecline?.(job.id, finalReason)
                  }}
                  disabled={isDeclining}
                  style={{
                    background: 'var(--red, #dc2626)',
                    color: 'white',
                    border: 'none',
                    fontSize: 13,
                    flex: 1,
                  }}
                >
                  {isDeclining ? tc('decliningBtn') : tc('declineConfirmYes')}
                </button>
                <button
                  className="btn btn-full"
                  onClick={() => { setShowDeclineConfirm(false); setDeclineReason(''); setDeclineReasonCustom('') }}
                  disabled={isDeclining}
                  style={{
                    background: 'var(--bg-card, #F3F4F6)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary, #374151)',
                    fontSize: 13,
                    flex: 1,
                  }}
                >
                  {tc('cancelBtn')}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
