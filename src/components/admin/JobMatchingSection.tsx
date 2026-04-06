'use client'

/**
 * Job Matching Section — shows matched technicians with checkboxes
 *
 * Allows admin to:
 * - See which technicians match criteria
 * - Select a preset to apply criteria from
 * - Edit individual criteria overrides for this job
 * - Manually add/remove technicians
 * - Send push notifications to selected technicians
 * - Reset to default preset criteria
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import TechnicianSchedulePanel from '@/components/admin/TechnicianSchedulePanel'
import { useCallPhone } from '@/hooks/useCallPhone'
import ConfirmDialog from '@/components/dispatch/ConfirmDialog'

interface MatchResult {
  technician_id: number
  technician_name: string
  technician_phone: string
  technician_specializations: string[]
  matched: boolean
  matchedCriteria: string[]
  failedCriteria: string[]
  distance_km: number | null
  duration_minutes: number | null
  distance_source: 'ors' | 'google' | 'haversine' | null
  isManualOverride: boolean
  matchType: 'auto' | 'manual_add' | 'manual_remove'
  notified: boolean
  seen_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  preferenceScore: number | null
  service_rates: { standard?: { h1: number; h2: number }; special?: { h1: number; h2: number }; kanalizacia?: { h1: number; h2: number } } | null
  rating: number | null
  country: string
  departure_city: string | null
  // Auto-notify wave history fields (from DB meta)
  notifyWave: number | null
  preset_id: number | null
  notified_at: string | null
  // Dispatch context fields (from Agent B)
  dispatchWave?: 0 | 1 | 2 | null
  nearbyContext?: {
    nearbyJobId: number
    nearbyJobRefNumber: string
    distanceKm: number
    nearbyJobCity?: string
    nearbyJobDate?: string
    nearbyJobTime?: string
    nearbyJobAddress?: string
    nearbyJobCategory?: string
    suggestedSlots?: unknown[]
  } | null
  isDispatchAvailable?: boolean | null
  dispatchAvailabilityReason?: string | null
  workloadToday?: number | null
}

interface Override {
  id: number
  name: string
  criterion_type: string
  tech_field: string | null
  operator: string
  compare_type: string
  compare_value: string | null
  auto_notify: boolean
  is_active: boolean
}

interface Preset {
  id: number
  name: string
  is_default: boolean
  auto_notify: boolean
  auto_notify_delay_minutes: number
  dispatchRadiusKm: number | null
  dispatchCriterionId: number | null
}

interface FieldOption {
  value: string
  label: string
  type: string
}

interface OperatorOption {
  value: string
  label: string
  types: string[]
}

// ── Inline dispatch radius editor (shown in wave header) ─────────────
function DispatchRadiusEditor({ presetId, criterionId, initialRadius, onSaved }: {
  presetId: number
  criterionId: number
  initialRadius: number
  onSaved: (newRadius: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialRadius)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (value === initialRadius) { setEditing(false); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/matching-criteria/${criterionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compare_value: JSON.stringify({ radius_km: value }) }),
      })
      if (res.ok) {
        onSaved(value)
        setEditing(false)
      }
    } catch (err) { console.warn('[JobMatching] Failed:', err) }
    setSaving(false)
  }

  if (!editing) {
    return (
      <span
        title="Klikni pre zmenu okruhu blízkych zákaziek"
        onClick={(e) => { e.stopPropagation(); setEditing(true) }}
        style={{
          fontSize: 11, padding: '1px 6px', borderRadius: 4,
          background: '#1D4ED8', color: 'white', fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        📍 do {initialRadius} km
      </span>
    )
  }

  return (
    <span onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--g5)' }}>📍</span>
      <input
        type="number"
        min={1}
        max={200}
        value={value}
        onChange={e => setValue(Math.max(1, Math.min(200, parseInt(e.target.value) || 10)))}
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setValue(initialRadius); setEditing(false) } }}
        style={{
          width: 50, fontSize: 11, padding: '1px 4px', borderRadius: 4,
          border: '1px solid var(--accent)', background: 'var(--g1)', color: 'var(--text)',
          textAlign: 'center',
        }}
      />
      <span style={{ fontSize: 11, color: 'var(--g4)' }}>km</span>
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          fontSize: 10, padding: '1px 6px', borderRadius: 4,
          background: 'var(--gold)', color: 'white', border: 'none',
          cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600,
        }}
      >
        {saving ? '...' : '✓'}
      </button>
      <button
        onClick={() => { setValue(initialRadius); setEditing(false) }}
        style={{
          fontSize: 10, padding: '1px 6px', borderRadius: 4,
          background: 'var(--g2)', color: 'var(--g5)', border: 'none',
          cursor: 'pointer',
        }}
      >
        ✗
      </button>
    </span>
  )
}

interface Props {
  jobId: number
  hasTechnician?: boolean
  defaultCollapsed?: boolean
  onAssign?: (technicianId: number) => void
}

export default function JobMatchingSection({ jobId, hasTechnician = false, defaultCollapsed = false, onAssign }: Props) {
  const [assigningTechId, setAssigningTechId] = useState<number | null>(null)
  const [results, setResults] = useState<MatchResult[]>([])
  const [overrides, setOverrides] = useState<Override[]>([])
  const [hasOverrides, setHasOverrides] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [specFilter, setSpecFilter] = useState('')
  const callPhone = useCallPhone()
  const [presets, setPresets] = useState<Preset[]>([])
  const [techFields, setTechFields] = useState<FieldOption[]>([])
  const [jobFields, setJobFields] = useState<FieldOption[]>([])
  const [operators, setOperators] = useState<OperatorOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [isApplying, setIsApplying] = useState(false)
  const [showNotifyTooltip, setShowNotifyTooltip] = useState(false)
  const [distanceWarning, setDistanceWarning] = useState<{ techs: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; onConfirm: () => void; danger?: boolean
  } | null>(null)
  const [showOverrides, setShowOverrides] = useState(false)
  const [editingOverrideId, setEditingOverrideId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    criterion_type: 'field' as string,
    tech_field: '',
    operator: 'eq',
    compare_type: 'static' as string,
    compare_value: '',
  })
  const [editFormFieldValues, setEditFormFieldValues] = useState<string[] | null | undefined>(undefined)
  const [appliedPresetId, setAppliedPresetId] = useState<string>('')
  const [calendarTechId, setCalendarTechId] = useState<number | null>(null)
  const [calendarTechName, setCalendarTechName] = useState('')
  const [showWaveHistory, setShowWaveHistory] = useState(true)
  const [triggerWaveLoading, setTriggerWaveLoading] = useState(false)
  const [waveContext, setWaveContext] = useState<{
    currentWave: number | null
    scheduledAt: string | null
    processedAt: string | null
  } | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const autoPresets = useMemo(
    () => presets.filter(p => p.auto_notify).sort((a, b) => a.auto_notify_delay_minutes - b.auto_notify_delay_minutes),
    [presets]
  )

  // Initialize dropdown to default preset on first load
  useEffect(() => {
    if (!appliedPresetId && presets.length > 0) {
      const def = presets.find(p => p.is_default)
      if (def) setAppliedPresetId(String(def.id))
    }
  }, [presets, appliedPresetId])

  const loadMatching = useCallback(async (readOnly = false) => {
    setIsLoading(true)
    try {
      const url = readOnly ? `/api/jobs/${jobId}/matching?readOnly=true` : `/api/jobs/${jobId}/matching`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Nepodarilo sa načítať matching')
      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setResults((data.results || []).map((r: any) => ({
        ...r,
        notifyWave: r.dispatch_wave ?? null,
      })))
      setOverrides(data.overrides || [])
      setHasOverrides(data.has_overrides || false)
      setPresets(data.presets || [])
      setTechFields(data.fields?.technician || [])
      setJobFields(data.fields?.job || [])
      setOperators(data.operators || [])
      setWaveContext({
        currentWave: data.auto_notify_current_wave ?? null,
        scheduledAt: data.auto_notify_scheduled_at ?? null,
        processedAt: data.auto_notify_processed_at ?? null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  // Silent refresh — updates seen_at + rejected_at without showing loading spinner
  const refreshSeen = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/matching`)
      if (!res.ok) return
      const data = await res.json()
      const fresh: MatchResult[] = data.results || []
      setResults(prev => prev.map(r => {
        const updated = fresh.find(f => f.technician_id === r.technician_id)
        if (!updated) return r
        const changed = updated.seen_at !== r.seen_at || updated.accepted_at !== r.accepted_at || updated.rejected_at !== r.rejected_at
        return changed ? { ...r, seen_at: updated.seen_at, accepted_at: updated.accepted_at, rejected_at: updated.rejected_at } : r
      }))
    } catch (err) {
      console.warn('[JobMatching] Failed:', err)
    }
  }, [jobId])

  // Poll every 15s while any notified tech hasn't accepted or rejected yet.
  // Stops automatically once all notified technicians have accepted or rejected.
  useEffect(() => {
    const hasPendingNotified = results.some(r => r.notified && !r.accepted_at && !r.rejected_at)
    if (!hasPendingNotified) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      return
    }
    if (pollRef.current) return // already polling
    pollRef.current = setInterval(refreshSeen, 5_000)
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [results, refreshSeen])

  async function fetchFieldValues(entity: 'technician' | 'job', field: string): Promise<string[] | null> {
    if (!field) return null
    const res = await fetch(`/api/matching-criteria/field-values?entity=${entity}&field=${encodeURIComponent(field)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.values ?? null
  }

  const hasLoadedRef = useRef(false)

  // No technician assigned: load immediately on mount (ORS for missing distances)
  // Technician assigned: load lazily on first expand, read-only (DB only, no ORS)
  useEffect(() => {
    if (!defaultCollapsed) {
      hasLoadedRef.current = true
      loadMatching(false)
    }
  }, [loadMatching, defaultCollapsed])

  useEffect(() => {
    if (!collapsed && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadMatching(true)
    }
  }, [collapsed, loadMatching])

  useEffect(() => {
    if (editForm.criterion_type === 'field' && editForm.compare_type === 'static' && editForm.tech_field) {
      setEditFormFieldValues(undefined)
      fetchFieldValues('technician', editForm.tech_field).then(setEditFormFieldValues)
    } else {
      setEditFormFieldValues(undefined)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm.tech_field, editForm.compare_type, editForm.criterion_type])

  const selectedTechs = results.filter(r =>
    r.matchType === 'manual_add' || (r.matched && r.matchType !== 'manual_remove')
  )
  const notifiedTechs = results.filter(r => r.notified)

  // ── Technician toggle ─────────────────────────────────────────────
  async function handleToggleTechnician(techId: number, currentlySelected: boolean) {
    try {
      const action = currentlySelected ? 'remove' : 'add'
      const res = await fetch(`/api/jobs/${jobId}/matching/technicians`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technician_id: techId, action }),
      })
      if (!res.ok) throw new Error('Nepodarilo sa zmeniť')
      await loadMatching()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    }
  }

  // ── Direct assign from matching list ──────────────────────────────
  async function handleDirectAssign(techId: number, techName: string) {
    if (!onAssign) return
    setConfirmDialog({
      title: 'Priradiť technika',
      message: `Priradiť technika ${techName} k tejto zákazke?`,
      onConfirm: () => doDirectAssign(techId),
    })
  }

  async function doDirectAssign(techId: number) {
    setAssigningTechId(techId)
    try {
      await onAssign?.(techId)
    } finally {
      setAssigningTechId(null)
    }
  }

  // ── Deselect all ──────────────────────────────────────────────────
  async function handleDeselectAll() {
    const idsToRemove = selectedTechs.map(r => r.technician_id)
    if (idsToRemove.length === 0) return
    try {
      const res = await fetch(`/api/jobs/${jobId}/matching/technicians`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technician_ids: idsToRemove, action: 'remove' }),
      })
      if (!res.ok) throw new Error('Nepodarilo sa odznačiť technikov')
      await loadMatching()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    }
  }

  // ── Apply matching ────────────────────────────────────────────────
  async function handleApply(notify: boolean) {
    setIsApplying(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${jobId}/matching`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notify }),
      })
      if (!res.ok) throw new Error('Nepodarilo sa odoslať')
      const data = await res.json()
      setSuccess(notify
        ? `Priradených: ${data.matched_count}, Notifikovaných: ${data.notified_count}`
        : `Priradených: ${data.matched_count}`
      )
      setTimeout(() => setSuccess(null), 5000)
      await loadMatching()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setIsApplying(false)
    }
  }

  // ── Notify with distance check ────────────────────────────────────
  function handleNotifyClick() {
    const withoutDriving = selectedTechs.filter(
      r => r.distance_source !== 'ors' && r.distance_source !== 'google'
    )
    if (withoutDriving.length > 0) {
      setDistanceWarning({ techs: withoutDriving.map(r => r.technician_name) })
    } else {
      handleApply(true)
    }
  }

  // ── Preset actions ────────────────────────────────────────────────
  async function handleApplyPreset(presetId: number) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/matching`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init', preset_id: presetId }),
      })
      if (!res.ok) throw new Error('Nepodarilo sa aplikovať preset')
      const preset = presets.find(p => p.id === presetId)
      setAppliedPresetId(String(presetId))
      setSuccess(`Preset "${preset?.name || ''}" aplikovaný`)
      setTimeout(() => setSuccess(null), 3000)
      await loadMatching()
      setShowOverrides(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    }
  }

  async function handleResetOverrides() {
    setConfirmDialog({
      title: 'Obnoviť kritériá',
      message: 'Obnoviť predvolené kritériá? Individuálne úpravy budú stratené.',
      danger: true,
      onConfirm: () => doResetOverrides(),
    })
  }

  async function doResetOverrides() {
    try {
      const res = await fetch(`/api/jobs/${jobId}/matching`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Nepodarilo sa resetovať')
      setSuccess('Kritériá obnovené na predvolené')
      setTimeout(() => setSuccess(null), 3000)
      await loadMatching()
      setShowOverrides(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    }
  }

  // ── Override toggle/edit ──────────────────────────────────────────
  async function handleToggleOverrideActive(ov: Override) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/matching`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', override_id: ov.id, data: { is_active: !ov.is_active } }),
      })
      if (!res.ok) throw new Error('Nepodarilo sa zmeniť')
      await loadMatching()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    }
  }

  function startEditOverride(ov: Override) {
    setEditingOverrideId(ov.id)
    setEditForm({
      name: ov.name,
      criterion_type: ov.criterion_type,
      tech_field: ov.tech_field || '',
      operator: ov.operator,
      compare_type: ov.compare_type,
      compare_value: ov.compare_value || '',
    })
  }

  async function handleSaveOverrideEdit() {
    if (editingOverrideId === null) return
    try {
      const res = await fetch(`/api/jobs/${jobId}/matching`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          override_id: editingOverrideId,
          data: {
            name: editForm.name,
            criterion_type: editForm.criterion_type,
            tech_field: ['distance', 'dispatch', 'gps_proximity'].includes(editForm.criterion_type) ? null : editForm.tech_field || null,
            operator: editForm.operator,
            compare_type: editForm.compare_type,
            compare_value: editForm.compare_value || null,
          },
        }),
      })
      if (!res.ok) throw new Error('Nepodarilo sa uložiť')
      setEditingOverrideId(null)
      await loadMatching()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    }
  }

  async function handleTriggerWave() {
    setTriggerWaveLoading(true)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/trigger-wave`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Nepodarilo sa spustiť vlnu')
      }
      await loadMatching()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Chyba')
    } finally {
      setTriggerWaveLoading(false)
    }
  }

  // ── Field helpers ─────────────────────────────────────────────────
  function getFieldLabel(value: string | null, source: 'technician' | 'job'): string {
    if (!value) return '—'
    const fields = source === 'technician' ? techFields : jobFields
    return fields.find(f => f.value === value)?.label || value
  }

  function getOperatorLabel(value: string): string {
    return operators.find(o => o.value === value)?.label || value
  }

  function describeOverride(ov: Override): string {
    if (ov.criterion_type === 'dispatch') {
      let dp = { radius_km: 10 }
      try { if (ov.compare_value) dp = { ...dp, ...JSON.parse(ov.compare_value) } } catch { /* defaults */ }
      return `Smart priradenie: okruh ${dp.radius_km} km od zákazky`
    }
    if (ov.criterion_type === 'gps_proximity') {
      let gp = { radius_km: 15, max_age_hours: 2 }
      try { if (ov.compare_value) gp = { ...gp, ...JSON.parse(ov.compare_value) } } catch {}
      return `GPS blízkosť: do ${gp.radius_km} km, poloha max. ${gp.max_age_hours} hod. stará`
    }
    if (ov.criterion_type === 'distance') {
      if (ov.compare_type === 'static' && ov.compare_value) {
        return `Vzdialenosť ${getOperatorLabel(ov.operator)} ${ov.compare_value} km`
      }
      return `Vzdialenosť ${getOperatorLabel(ov.operator)} 50 km`
    }
    const techLabel = getFieldLabel(ov.tech_field, 'technician')
    const opLabel = getOperatorLabel(ov.operator)
    if (ov.compare_type === 'job_field') {
      return `${techLabel} ${opLabel} ${getFieldLabel(ov.compare_value, 'job')}`
    }
    return `${techLabel} ${opLabel} "${ov.compare_value || ''}"`
  }

  function matchesSpecializationCriterion(result: MatchResult): boolean {
    return result.matchedCriteria.some((criterion) =>
      /special|špecial|specializ|category|kateg/i.test(criterion)
    )
  }

  function getAverageStandardRate(): number | null {
    const rates = results
      .map((result) => result.service_rates?.standard?.h1 ?? null)
      .filter((rate): rate is number => typeof rate === 'number')

    if (rates.length === 0) return null
    return rates.reduce((sum, rate) => sum + rate, 0) / rates.length
  }

  function buildMatchExplanation(result: MatchResult): string {
    const reasons: string[] = []
    const averageRate = getAverageStandardRate()
    const hourlyRate = result.service_rates?.standard?.h1 ?? null

    if (result.dispatchWave === 0 && result.nearbyContext) {
      reasons.push(`už má zákazku v okolí (${result.nearbyContext.distanceKm} km)`)
    } else if (result.nearbyContext) {
      reasons.push(`má zákazku len ${result.nearbyContext.distanceKm} km od tejto adresy`)
    } else if (result.distance_km !== null && result.distance_km <= 15) {
      reasons.push('je veľmi blízko')
    } else if (result.distance_km !== null && result.distance_km <= 35) {
      reasons.push('má rozumnú dojazdovú vzdialenosť')
    }

    if (matchesSpecializationCriterion(result)) {
      reasons.push('spĺňa požadovanú špecializáciu')
    } else if (result.technician_specializations.length > 0) {
      reasons.push(`má špecializácie: ${result.technician_specializations.slice(0, 2).join(', ')}`)
    }

    if (result.rating !== null && result.rating >= 4.7) {
      reasons.push(`má silný rating ${result.rating}`)
    }

    if (hourlyRate !== null && averageRate !== null && hourlyRate < averageRate) {
      reasons.push(`má nižšiu sadzbu ${hourlyRate} ${result.country === 'CZ' ? 'Kč/h' : '€/h'}`)
    }

    if (result.dispatchWave === 1) {
      reasons.push('vyšiel ako prioritný kandidát pre priradenie')
    } else if (result.dispatchWave === 2 && reasons.length === 0) {
      reasons.push('ostáva vhodný ako štandardný kandidát')
    }

    if (result.isDispatchAvailable === false && result.dispatchAvailabilityReason) {
      reasons.push(`pozor: ${result.dispatchAvailabilityReason.toLowerCase()}`)
    }

    return reasons.slice(0, 3).join(' • ')
  }

  // ── Render ────────────────────────────────────────────────────────
  if (isLoading && !defaultCollapsed) {
    return (
      <div className="admin-detail-section">
        <h3>Priradenie technikov</h3>
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div className="spinner" style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, color: 'var(--g4)' }}>Vyhodnocujem kritériá...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="admin-card" style={{ borderColor: 'var(--red)', background: '#FEE2E2', color: 'var(--red)', marginBottom: 8 }}>
          {error}
          <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}
      {success && (
        <div className="admin-card" style={{ borderColor: 'var(--green)', background: '#F0FDF4', color: 'var(--green)', marginBottom: 8 }}>
          {success}
        </div>
      )}

      <div className="admin-detail-section">
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: collapsed ? 0 : 12, cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setCollapsed(c => !c)}
        >
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            Priradenie technikov
            <span style={{ fontSize: 13, color: 'var(--g4)', fontWeight: 400, transition: 'transform 0.2s', display: 'inline-block', transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}>›</span>
          </h3>
        </div>

        {!collapsed && (<>

        {/* Controls: preset selector + override management */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Preset selector */}
          {presets.length > 0 && (
            <select
              className="field-input"
              value={appliedPresetId}
              onChange={e => {
                const val = e.target.value
                if (val) handleApplyPreset(parseInt(val, 10))
              }}
              style={{ fontSize: 12, padding: '6px 8px', width: 'auto', cursor: 'pointer' }}
            >
              {!appliedPresetId && <option value="" disabled>Vyberať preset...</option>}
              {presets.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.is_default ? ' (predvolený)' : ''}
                </option>
              ))}
            </select>
          )}

          <button onClick={() => setShowOverrides(!showOverrides)} style={{ background: 'var(--gold-light, #FEF3C7)', border: '1px solid var(--gold)', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--dark)' }}>
            {showOverrides ? 'Skryť kritériá' : 'Zobraziť kritériá'}
          </button>
          {hasOverrides && (
            <button onClick={handleResetOverrides} style={{ background: 'var(--g2)', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--red)' }}>
              Obnoviť predvolené
            </button>
          )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--g4)' }}>
              {selectedTechs.length} vybraných / {results.length} celkom
              {notifiedTechs.length > 0 && ` / ${notifiedTechs.length} notifikovaných`}
            </span>
            {selectedTechs.length > 0 && (
              <button
                onClick={handleDeselectAll}
                style={{
                  background: 'none', border: '1px solid var(--g3)', borderRadius: 6,
                  padding: '3px 8px', fontSize: 11, cursor: 'pointer', color: 'var(--g6)',
                  whiteSpace: 'nowrap',
                }}
                title="Odznačiť všetkých vybraných technikov"
              >
                Odznačiť všetkých
              </button>
            )}
          </div>
        </div>

        {/* Per-job criteria overrides with inline editing */}
        {showOverrides && hasOverrides && overrides.length > 0 && (
          <div style={{ marginBottom: 16, padding: 10, background: 'var(--g1)', borderRadius: 8, border: '1px solid var(--g2)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--g4)' }}>
              Kritériá pre túto zákazku:
            </div>
            {overrides.map((ov) => (
              <div key={ov.id} style={{ borderBottom: '1px solid var(--g2)', padding: '6px 0' }}>
                {editingOverrideId === ov.id ? (
                  /* Inline edit form */
                  <div style={{ padding: '8px 0' }}>
                    <div className="admin-form" style={{ gap: 8 }}>
                      <div className="field">
                        <label className="field-label" style={{ fontSize: 11 }}>Názov</label>
                        <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="field-input" style={{ fontSize: 12, padding: '4px 8px' }} />
                      </div>
                      <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div className="field">
                          <label className="field-label" style={{ fontSize: 11 }}>Typ</label>
                          <select value={editForm.criterion_type} onChange={e => setEditForm(p => ({ ...p, criterion_type: e.target.value, tech_field: e.target.value === 'distance' ? '' : p.tech_field }))} className="field-input" style={{ fontSize: 12, padding: '4px 8px' }}>
                            <option value="field">Porovnanie polí</option>
                            <option value="distance">Vzdialenosť</option>
                            <option value="dispatch">Smart priradenie</option>
                            <option value="gps_proximity">GPS blízkosť</option>
                          </select>
                        </div>
                        {editForm.criterion_type === 'field' && (
                          <div className="field">
                            <label className="field-label" style={{ fontSize: 11 }}>Pole technika</label>
                            <select value={editForm.tech_field} onChange={e => setEditForm(p => ({ ...p, tech_field: e.target.value }))} className="field-input" style={{ fontSize: 12, padding: '4px 8px' }}>
                              <option value="">--</option>
                              {techFields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                          </div>
                        )}
                        {editForm.criterion_type === 'dispatch' && (
                          <div className="field">
                            <label className="field-label" style={{ fontSize: 11 }}>Okruh (km)</label>
                            <input type="number" min={1} max={200} value={(() => { try { return JSON.parse(editForm.compare_value || '{}').radius_km || 10 } catch { return 10 } })()} onChange={e => setEditForm(p => ({ ...p, compare_value: JSON.stringify({ radius_km: Number(e.target.value) || 10 }) }))} className="field-input" style={{ fontSize: 12, padding: '4px 8px' }} />
                          </div>
                        )}
                        {editForm.criterion_type === 'gps_proximity' && (
                          <div className="field" style={{ display: 'flex', gap: 8 }}>
                            <div>
                              <label className="field-label" style={{ fontSize: 11 }}>Okruh (km)</label>
                              <input type="number" min={1} max={200}
                                value={(() => { try { return JSON.parse(editForm.compare_value || '{}').radius_km || 15 } catch { return 15 } })()}
                                onChange={e => {
                                  const cur = (() => { try { return JSON.parse(editForm.compare_value || '{}') } catch { return {} } })()
                                  setEditForm(p => ({ ...p, compare_value: JSON.stringify({ ...cur, radius_km: Number(e.target.value) || 15 }) }))
                                }}
                                className="field-input" style={{ fontSize: 12, padding: '4px 8px', width: 80 }} />
                            </div>
                            <div>
                              <label className="field-label" style={{ fontSize: 11 }}>Max. vek polohy (h)</label>
                              <input type="number" min={0.5} max={24} step={0.5}
                                value={(() => { try { return JSON.parse(editForm.compare_value || '{}').max_age_hours || 2 } catch { return 2 } })()}
                                onChange={e => {
                                  const cur = (() => { try { return JSON.parse(editForm.compare_value || '{}') } catch { return {} } })()
                                  setEditForm(p => ({ ...p, compare_value: JSON.stringify({ ...cur, max_age_hours: Number(e.target.value) || 2 }) }))
                                }}
                                className="field-input" style={{ fontSize: 12, padding: '4px 8px', width: 80 }} />
                            </div>
                          </div>
                        )}
                      </div>
                      {editForm.criterion_type !== 'dispatch' && editForm.criterion_type !== 'gps_proximity' && <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                        <div className="field">
                          <label className="field-label" style={{ fontSize: 11 }}>Operátor</label>
                          <select value={editForm.operator} onChange={e => setEditForm(p => ({ ...p, operator: e.target.value }))} className="field-input" style={{ fontSize: 12, padding: '4px 8px' }}>
                            {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                          </select>
                        </div>
                        <div className="field">
                          <label className="field-label" style={{ fontSize: 11 }}>Porovnať s</label>
                          <select value={editForm.compare_type} onChange={e => setEditForm(p => ({ ...p, compare_type: e.target.value }))} className="field-input" style={{ fontSize: 12, padding: '4px 8px' }}>
                            <option value="static">Statická hodnota</option>
                            <option value="job_field">Pole zákazky</option>
                          </select>
                        </div>
                        <div className="field">
                          <label className="field-label" style={{ fontSize: 11 }}>{editForm.compare_type === 'job_field' ? 'Pole zákazky' : 'Hodnota'}</label>
                          {editForm.compare_type === 'job_field' ? (
                            <select value={editForm.compare_value} onChange={e => setEditForm(p => ({ ...p, compare_value: e.target.value }))} className="field-input" style={{ fontSize: 12, padding: '4px 8px' }}>
                              <option value="">--</option>
                              {jobFields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                          ) : editFormFieldValues === undefined && editForm.criterion_type === 'field' && editForm.tech_field ? (
                            <div className="field-input" style={{ fontSize: 12, padding: '4px 8px', color: 'var(--g4)' }}>Načítavam...</div>
                          ) : Array.isArray(editFormFieldValues) ? (() => {
                            const isMulti = editForm.operator === 'contains' || editForm.operator === 'not_contains'
                            const selectedVals = editForm.compare_value ? editForm.compare_value.split(',').map(v => v.trim()).filter(Boolean) : []
                            return isMulti ? (
                              <select
                                multiple
                                value={selectedVals}
                                onChange={e => {
                                  const vals = Array.from(e.target.selectedOptions).map(o => o.value)
                                  setEditForm(p => ({ ...p, compare_value: vals.join(',') }))
                                }}
                                className="field-input"
                                size={Math.min(editFormFieldValues.length, 5)}
                                style={{ fontSize: 12, padding: '4px 8px', height: 'auto' }}
                              >
                                {editFormFieldValues.map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            ) : (
                              <select value={editForm.compare_value} onChange={e => setEditForm(p => ({ ...p, compare_value: e.target.value }))} className="field-input" style={{ fontSize: 12, padding: '4px 8px' }}>
                                <option value="">-- Vyberte hodnotu --</option>
                                {editFormFieldValues.map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            )
                          })() : (
                            <input type="text" value={editForm.compare_value} onChange={e => setEditForm(p => ({ ...p, compare_value: e.target.value }))} className="field-input" style={{ fontSize: 12, padding: '4px 8px' }} />
                          )}
                        </div>
                      </div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button onClick={handleSaveOverrideEdit} style={{ background: 'var(--gold)', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Uložiť</button>
                      <button onClick={() => setEditingOverrideId(null)} style={{ background: 'var(--g2)', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer' }}>Zrušiť</button>
                    </div>
                  </div>
                ) : (
                  /* Display row */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: ov.is_active ? 1 : 0.4 }}>
                    <input
                      type="checkbox"
                      checked={ov.is_active}
                      onChange={() => handleToggleOverrideActive(ov)}
                      style={{ width: 16, height: 16, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{ov.name}</span>
                      <div style={{ fontSize: 11, color: 'var(--g4)' }}>{describeOverride(ov)}</div>
                    </div>
                    <button
                      onClick={() => startEditOverride(ov)}
                      className="admin-btn admin-btn-outline admin-btn-sm"
                      title="Upraviť"
                    >
                      ✏️ Upraviť
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Wave summary bar — always visible */}
        {(() => {
          const hasAnyNotified = results.some(r => r.notified_at)
          if (!hasAnyNotified || !waveContext) return null

          // Compute per-wave stats from results
          const waveMap = new Map<number, { notified: number; seen: number; declined: number; accepted: number }>()
          for (const r of results) {
            if (r.notifyWave == null || !r.notified_at) continue
            const w = waveMap.get(r.notifyWave) || { notified: 0, seen: 0, declined: 0, accepted: 0 }
            w.notified++
            if (r.seen_at) w.seen++
            if (r.accepted_at) w.accepted++
            if (r.rejected_at && !r.accepted_at) w.declined++
            waveMap.set(r.notifyWave, w)
          }
          const totalNotified = results.filter(r => r.notified_at).length
          const totalSeen = results.filter(r => r.seen_at).length
          const totalAccepted = results.filter(r => r.accepted_at).length
          const totalDeclined = results.filter(r => r.rejected_at && !r.accepted_at).length
          const allDone = waveContext.processedAt != null

          return (
            <div style={{
              marginBottom: 8, padding: '8px 12px', borderRadius: 8,
              background: 'var(--g1)', border: '1px solid var(--g2)',
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12,
            }}>
              {Array.from(waveMap.entries()).sort((a, b) => a[0] - b[0]).map(([idx, w]) => {
                const isDone = allDone || (waveContext.currentWave != null && idx < waveContext.currentWave)
                const isCurrent = !allDone && waveContext.currentWave === idx
                return (
                  <span key={idx} style={{
                    padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                    background: isDone ? 'color-mix(in srgb, var(--success) 12%, transparent)' : isCurrent ? 'color-mix(in srgb, var(--warning) 12%, transparent)' : 'var(--g2)',
                    color: isDone ? 'var(--success)' : isCurrent ? 'var(--warning)' : 'var(--g5)',
                  }}>
                    V{idx + 1}: {w.notified}/{w.seen}/{w.declined}
                    {w.accepted > 0 && <span style={{ color: 'var(--success)', marginLeft: 2 }}>+{w.accepted}</span>}
                  </span>
                )
              })}
              <span style={{ color: 'var(--g4)', fontSize: 11 }}>
                Celkom: {totalNotified} notif · {totalSeen} videli · {totalDeclined} odm. · {totalAccepted} prijal
                {totalNotified > 0 && ` (${Math.round((totalSeen / totalNotified) * 100)}%)`}
              </span>
              {allDone && totalAccepted === 0 && (
                <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 11 }}>Vyčerpané</span>
              )}
            </div>
          )
        })()}

        {/* Wave notification history — detail per technician */}
        {(() => {
          const hasAnyNotified = results.some(r => r.notified_at)
          if (!hasAnyNotified || autoPresets.length === 0 || !waveContext) return null

          return (
            <div style={{ marginBottom: 16, border: '1px solid var(--g2)', borderRadius: 8, overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', background: 'var(--g1)', cursor: 'pointer', userSelect: 'none',
                }}
                onClick={() => setShowWaveHistory(v => !v)}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  📢 Vlny notifikácií
                  <span style={{ fontWeight: 400, color: 'var(--g4)', marginLeft: 6, fontSize: 12 }}>
                    ({autoPresets.length} {autoPresets.length === 1 ? 'vlna' : autoPresets.length < 5 ? 'vlny' : 'vĺn'})
                  </span>
                </span>
                <span style={{ fontSize: 13, color: 'var(--g4)', transition: 'transform 0.2s', display: 'inline-block', transform: showWaveHistory ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
              </div>

              {showWaveHistory && (
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {autoPresets.map((preset, waveIdx) => {
                    const isCompleted = waveContext.processedAt != null ||
                      (waveContext.currentWave != null && waveIdx < waveContext.currentWave)
                    const isCurrent = !waveContext.processedAt &&
                      waveContext.currentWave != null &&
                      waveIdx === waveContext.currentWave &&
                      waveContext.scheduledAt != null
                    const isPending = !isCompleted && !isCurrent

                    const waveTechs = results.filter(r => r.notifyWave === waveIdx)

                    // Time remaining until next wave fires
                    let minutesUntil: number | null = null
                    if (isCurrent && waveContext.scheduledAt) {
                      const msUntil = new Date(waveContext.scheduledAt).getTime() - Date.now()
                      minutesUntil = Math.max(0, Math.ceil(msUntil / 60_000))
                    }

                    const statusBadge = isCompleted
                      ? <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)', fontWeight: 600 }}>✓ Dokončená</span>
                      : isCurrent
                        ? <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)', fontWeight: 600 }}>
                            ⏳ {minutesUntil != null && minutesUntil > 0 ? `Spustí sa o ${minutesUntil} min` : 'Spúšťa sa...'}
                          </span>
                        : <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: 'var(--g2)', color: 'var(--g5)', fontWeight: 500 }}>— čaká</span>

                    return (
                      <div key={preset.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                            Vlna {waveIdx + 1} — {preset.name}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--g4)' }}>
                            ({preset.auto_notify_delay_minutes} min od vytvorenia zákazky)
                          </span>
                          {preset.dispatchRadiusKm != null && (
                            <DispatchRadiusEditor
                              presetId={preset.id}
                              criterionId={preset.dispatchCriterionId!}
                              initialRadius={preset.dispatchRadiusKm}
                              onSaved={(newRadius) => {
                                setPresets(prev => prev.map(p => p.id === preset.id ? { ...p, dispatchRadiusKm: newRadius } : p))
                              }}
                            />
                          )}
                          {statusBadge}
                          {isCurrent && minutesUntil != null && minutesUntil > 0 && (
                            <button
                              onClick={handleTriggerWave}
                              disabled={triggerWaveLoading}
                              style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 6,
                                background: 'var(--accent)', color: '#fff', border: 'none',
                                cursor: triggerWaveLoading ? 'not-allowed' : 'pointer',
                                opacity: triggerWaveLoading ? 0.6 : 1, fontWeight: 600,
                              }}
                            >
                              {triggerWaveLoading ? '...' : '⚡ Spustiť teraz'}
                            </button>
                          )}
                        </div>

                        {waveTechs.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 12, borderLeft: '2px solid var(--g2)' }}>
                            {waveTechs.map(r => {
                              const notifTime = r.notified_at ? new Date(r.notified_at).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }) : null
                              const seenTime = r.seen_at ? new Date(r.seen_at).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }) : null
                              const nc = r.nearbyContext
                              return (
                                <div key={r.technician_id} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--g2)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <a
                                      href={`/admin/technicians/${r.technician_id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      style={{ fontWeight: 600, color: 'var(--text-primary, #1A1A1A)', textDecoration: 'none', cursor: 'pointer' }}
                                      onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                      onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                                    >
                                      {r.technician_name}
                                    </a>
                                    {r.departure_city && (
                                      <span style={{ color: 'var(--g5, #6B7280)' }}>· 🏠 {r.departure_city}</span>
                                    )}
                                    {notifTime && (
                                      <span style={{ color: 'var(--g4)' }}>· notif {notifTime}</span>
                                    )}
                                    {seenTime && (
                                      <span style={{ color: '#7c3aed' }}>· 👁 videl {seenTime}</span>
                                    )}
                                    {r.accepted_at && (
                                      <span style={{ color: 'var(--green)', fontWeight: 600 }}>· ✓ prijal</span>
                                    )}
                                    {r.rejected_at && !r.accepted_at && (
                                      <span style={{ color: 'var(--red)' }}>· ✗ odmietol</span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2, color: 'var(--g5, #6B7280)', fontSize: 11 }}>
                                    {r.technician_specializations?.length > 0 && (
                                      <span>{r.technician_specializations.join(', ')}</span>
                                    )}
                                    {r.distance_km != null ? (
                                      <span style={{ color: r.distance_km <= 30 ? 'var(--green)' : r.distance_km <= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                                        · {r.distance_km} km od zákazky
                                      </span>
                                    ) : (
                                      <span style={{ color: 'var(--g4)', fontStyle: 'italic' }}>· vzdialenosť neznáma</span>
                                    )}
                                    {nc && (
                                      <span style={{ color: 'var(--accent, #2563EB)', fontWeight: 500 }}>
                                        · 📍 {nc.distanceKm} km od {nc.nearbyJobRefNumber} v {nc.nearbyJobCity || '?'}
                                        {nc.nearbyJobDate && (
                                          <> · návšteva {nc.nearbyJobDate}{nc.nearbyJobTime ? ` o ${nc.nearbyJobTime}` : ''}</>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : isPending ? (
                          <div style={{ fontSize: 12, color: 'var(--g4)', paddingLeft: 12, fontStyle: 'italic' }}>
                            (zatiaľ nebola spustená)
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* Search + specialization filter */}
        {results.length > 0 && (
          <div style={{ marginBottom: 8, display: 'flex', gap: 6 }}>
            <input
              type="search"
              className="field-input"
              placeholder="Hľadať podľa mena, kategórie alebo mesta..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: 0, padding: '7px 10px', fontSize: 13 }}
            />
            <select
              className="field-input"
              value={specFilter}
              onChange={e => setSpecFilter(e.target.value)}
              style={{ flex: '0 0 auto', width: 'auto', maxWidth: 200, padding: '7px 8px', fontSize: 12, cursor: 'pointer' }}
            >
              <option value="">Všetky špecializácie</option>
              {Array.from(new Set(results.flatMap(r => r.technician_specializations || []))).sort().map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>
        )}

        {/* Technician list */}
        {results.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--g4)', textAlign: 'center' }}>
            Žiadni aktívni technici alebo žiadne kritériá.
          </p>
        ) : (() => {
          const q = searchQuery.trim().toLowerCase()
          const filtered = results.filter(r => {
            if (q && !(
              r.technician_name.toLowerCase().includes(q) ||
              r.technician_specializations?.some(s => s.toLowerCase().includes(q)) ||
              r.departure_city?.toLowerCase().includes(q)
            )) return false
            if (specFilter && !r.technician_specializations?.includes(specFilter)) return false
            return true
          })

          return (
            <>
              {filtered.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--g4)', textAlign: 'center', padding: '12px 0' }}>
                  Žiadny výsledok pre &quot;{searchQuery}&quot;
                </p>
              )}
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {filtered.map((result) => {
                  const isSelected = result.matchType === 'manual_add' ||
                    (result.matched && result.matchType !== 'manual_remove')
                  const matchExplanation = buildMatchExplanation(result)

                  return (
                    <div
                      key={result.technician_id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 6px', borderBottom: '1px solid var(--g2)',
                        background: result.matchType === 'manual_add' ? '#F0FDF4' :
                          result.matchType === 'manual_remove' ? '#FEF2F2' :
                          result.matched ? 'white' : 'var(--g1)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleTechnician(result.technician_id, isSelected)}
                        style={{ width: 18, height: 18, flexShrink: 0, cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                          <a
                            href={`/admin/technicians/${result.technician_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                          >
                            {result.technician_name}
                          </a>
                          {/* 5a. Wave badge */}
                          {result.dispatchWave === 0 && (
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#1D4ED8', color: 'white', fontWeight: 600 }}>V okolí</span>
                          )}
                          {result.dispatchWave === 1 && (
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--gold, #C5A572)', color: 'white', fontWeight: 600 }}>⚡ Prioritná</span>
                          )}
                          {result.dispatchWave === 2 && (
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--g3, #D1D5DB)', color: 'var(--g6, #6B7280)', fontWeight: 500 }}>Štandardná</span>
                          )}
                          {result.matchType === 'manual_add' && (
                            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: '#16a34a', color: 'white' }}>+ pridaný</span>
                          )}
                          {result.matchType === 'manual_remove' && (
                            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: '#dc2626', color: 'white' }}>− vylúčený</span>
                          )}
                          {result.notified && (
                            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--green)', color: 'white' }}>notif.</span>
                          )}
                          {result.accepted_at && (
                            <span title={`Prijal: ${new Date(result.accepted_at).toLocaleString('sk-SK')}`} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: '#16a34a', color: 'white', cursor: 'default' }}>✓ prijal</span>
                          )}
                          {result.seen_at && !result.rejected_at && !result.accepted_at && (
                            <span title={`Pozrel: ${new Date(result.seen_at).toLocaleString('sk-SK')}`} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: '#7c3aed', color: 'white', cursor: 'default' }}>👁 videl</span>
                          )}
                          {result.rejected_at && (
                            <span title={`Odmietol: ${new Date(result.rejected_at).toLocaleString('sk-SK')}`} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: '#dc2626', color: 'white', cursor: 'default' }}>✗ odmietol</span>
                          )}
                        </div>
                        {/* 5b. Nearby badge */}
                        {result.nearbyContext && (
                          <div style={{ fontSize: 11, color: 'var(--accent, #2563EB)', marginTop: 2, fontWeight: 500 }}>
                            📍 {result.nearbyContext.distanceKm} km od {result.nearbyContext.nearbyJobCity || 'blízkej zákazky'}
                            <span style={{ color: 'var(--g4)', fontWeight: 400, marginLeft: 4 }}>({result.nearbyContext.nearbyJobRefNumber})</span>
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--g4)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {result.technician_phone && (
                            <button
                              onClick={e => { e.stopPropagation(); callPhone(result.technician_phone, result.technician_name) }}
                              style={{ color: 'var(--gold)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11 }}
                              title="Zavolať"
                            >
                              📞 {result.technician_phone}
                            </button>
                          )}
                          <span style={{ color: 'var(--g4)' }}>·</span>
                          <span>{result.technician_specializations?.join(', ') || 'bez špecializácie'}</span>
                          {result.departure_city && (
                            <>
                              <span style={{ color: 'var(--g4)' }}>·</span>
                              <span style={{ color: 'var(--g5)' }} title="Výjazdové mesto">🏠 {result.departure_city}</span>
                            </>
                          )}
                          {result.distance_km !== null && (
                            <span style={{ fontWeight: 500, color: result.distance_km <= 30 ? 'var(--green)' : result.distance_km <= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                              · {result.distance_km} km
                              {result.duration_minutes != null && (
                                <span style={{ fontWeight: 400 }}> · ~{result.duration_minutes} min</span>
                              )}
                              {(result.distance_source === 'ors' || result.distance_source === 'google') && (
                                <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.7 }} title={`Vzdialenosť po ceste (${result.distance_source === 'ors' ? 'ORS' : 'Google'})`}>🚗</span>
                              )}
                            </span>
                          )}
                          {/* 5c. Availability dot */}
                          {result.isDispatchAvailable === true && (
                            <span title="Dostupný pre dispečing" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--green, #16a34a)', flexShrink: 0 }} />
                          )}
                          {result.isDispatchAvailable === false && (
                            <span title={result.dispatchAvailabilityReason || 'Nedostupný'} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--danger, #dc2626)', flexShrink: 0, cursor: 'help' }} />
                          )}
                          {/* 5d. Workload badge */}
                          {result.workloadToday != null && result.workloadToday > 0 && (
                            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--g2)', color: 'var(--g6)', border: '1px solid var(--g3)' }}>
                              {result.workloadToday} zákaziek dnes
                            </span>
                          )}
                          {result.service_rates?.standard?.h1 != null && (
                            <span style={{ color: 'var(--g6)' }}>· {result.service_rates.standard.h1} {result.country === 'CZ' ? 'Kč/h' : '€/h'}</span>
                          )}
                          {result.rating !== null && (
                            <span style={{ color: 'var(--g6)' }}>· ★ {result.rating}</span>
                          )}
                          {result.preferenceScore !== null && result.matched && (
                            <span
                              title="Preferenčné skóre (0–100) podľa ceny, hodnotenia a vzdialenosti"
                              style={{
                                fontWeight: 600,
                                color: result.preferenceScore >= 70 ? 'var(--green)' : result.preferenceScore >= 40 ? 'var(--warning)' : 'var(--g4)',
                              }}
                            >
                              · skóre: {result.preferenceScore}
                            </span>
                          )}
                        </div>
                        {!result.matched && result.failedCriteria.length > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--danger)', marginTop: 2 }}>
                            Nesplnené: {result.failedCriteria.join(', ')}
                          </div>
                        )}
                        {matchExplanation && (
                          <div style={{ fontSize: 11, color: 'var(--g4)', marginTop: 4, lineHeight: 1.5 }}>
                            Prečo odporúčame: {matchExplanation}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 10,
                        background: isSelected ? 'var(--green)' : '#D1D5DB',
                        color: isSelected ? 'white' : '#374151', flexShrink: 0,
                      }}>
                        {isSelected ? 'Vybraný' : 'Nevybraný'}
                      </div>
                      <button
                        title="Zobraziť kalendár"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCalendarTechId(result.technician_id)
                          setCalendarTechName(result.technician_name)
                        }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 14, padding: '2px 4px', opacity: 0.7,
                        }}
                      >
                        📅
                      </button>
                      {onAssign && (
                        <button
                          title={`Priradiť ${result.technician_name}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDirectAssign(result.technician_id, result.technician_name)
                          }}
                          disabled={assigningTechId === result.technician_id}
                          style={{
                            background: 'var(--gold, #C5A572)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: assigningTechId === result.technician_id ? 'wait' : 'pointer',
                            flexShrink: 0,
                            opacity: assigningTechId === result.technician_id ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {assigningTechId === result.technician_id ? 'Priraďujem...' : 'Priradiť'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )
        })()}

        {/* Action buttons */}
        <div className="admin-btn-row" style={{ marginTop: 12 }}>
          <button
            className="admin-btn"
            onClick={() => handleApply(false)}
            disabled={isApplying}
            title="Prepočíta vzdialenosti a uloží výsledky matchingu bez notifikácie"
            style={{ fontSize: 13, padding: '8px 14px' }}
          >
            {isApplying ? 'Prepočítavam...' : 'Prepočítať matching'}
          </button>
          {(() => {
            const canNotify = !hasTechnician
            const isDisabled = isApplying || selectedTechs.length === 0 || !canNotify
            return (
              <div
                style={{ position: 'relative', display: 'inline-block', pointerEvents: 'all' }}
                onMouseEnter={() => { if (!canNotify) setShowNotifyTooltip(true) }}
                onMouseLeave={() => setShowNotifyTooltip(false)}
              >
                <button
                  className="admin-btn admin-btn-gold"
                  onClick={handleNotifyClick}
                  disabled={isDisabled}
                  style={{
                    fontSize: 13, padding: '8px 14px',
                    ...(!canNotify ? {
                      opacity: 0.45,
                      cursor: 'not-allowed',
                      filter: 'grayscale(60%)',
                      pointerEvents: 'none',
                    } : {}),
                  }}
                >
                  {isApplying ? 'Odosielam...' : `Notifikovať technikov (${selectedTechs.length})`}
                </button>
                {showNotifyTooltip && !canNotify && (
                  <div style={{
                    position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#2d2d2d', color: '#fff',
                    fontSize: 11, padding: '5px 9px', borderRadius: 5,
                    whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}>
                    Zákazka má prideleného technika — notifikácia nie je potrebná
                    <div style={{
                      position: 'absolute', top: '100%', left: '50%',
                      transform: 'translateX(-50%)',
                      borderWidth: '4px 4px 0', borderStyle: 'solid',
                      borderColor: '#2d2d2d transparent transparent',
                    }} />
                  </div>
                )}
              </div>
            )
          })()}
          {notifiedTechs.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--g4)', alignSelf: 'center' }}>
              Už notifikovaných: {notifiedTechs.length}
            </span>
          )}
        </div>

        </>)}
      </div>

      {/* Distance warning modal */}
      {distanceWarning && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setDistanceWarning(null)}
        >
          <div style={{
            background: '#FFFFFF', borderRadius: 10, padding: '24px 28px',
            maxWidth: 420, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            border: '1px solid var(--g2, #E5E7EB)',
          }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, marginBottom: 8, color: '#1F2937', fontWeight: 700 }}>⚠️ Nepresné vzdialenosti</div>
            <p style={{ fontSize: 14, color: '#374151', marginBottom: 10, lineHeight: 1.5 }}>
              {distanceWarning.techs.length === 1
                ? 'Nasledujúci technik má'
                : `Nasledujúci ${distanceWarning.techs.length} technici majú`
              } iba vzdialenosť vzdušnou čiarou (Haversine), nie po ceste:
            </p>
            <ul style={{
              margin: '0 0 16px', paddingLeft: 20,
              fontSize: 13, color: '#1F2937', lineHeight: 1.7, fontWeight: 500,
            }}>
              {distanceWarning.techs.map(name => (
                <li key={name}>{name}</li>
              ))}
            </ul>
            <p style={{ fontSize: 13, color: '#374151', marginBottom: 20, lineHeight: 1.5 }}>
              Prepočet osviežil vzdialenosti cez ORS pre všetkých a zobrazí presné hodnoty pred odoslaním.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="admin-btn"
                onClick={() => {
                  setDistanceWarning(null)
                  handleApply(false)
                }}
              >
                Prepočítať
              </button>
              <button
                className="admin-btn admin-btn-gold"
                onClick={() => {
                  setDistanceWarning(null)
                  handleApply(true)
                }}
              >
                Notifikovať aj tak
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Technician calendar modal */}
      {calendarTechId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}
        onClick={(e) => { if (e.target === e.currentTarget) setCalendarTechId(null) }}
        >
          <div style={{
            background: 'white', borderRadius: 12, maxWidth: 900, width: '100%',
            maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <TechnicianSchedulePanel
              technicianId={calendarTechId}
              technicianName={calendarTechName}
              onClose={() => setCalendarTechId(null)}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        danger={confirmDialog?.danger}
        onConfirm={() => { confirmDialog?.onConfirm(); setConfirmDialog(null) }}
        onCancel={() => setConfirmDialog(null)}
      />
    </>
  )
}
