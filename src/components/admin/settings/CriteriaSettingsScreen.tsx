'use client'

/**
 * Matching Criteria Management — /admin/criteria
 *
 * Admin can define presets (named sets of criteria) for matching technicians to jobs.
 * Each preset contains criteria that compare technician fields to static values or job fields.
 * One preset is marked as default and used for auto-matching new jobs.
 */

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/apiFetch'
import AdminLayout from '@/components/admin/AdminLayout'
import InfoTooltip from '@/components/ui/InfoTooltip'
import WaveFlowDiagram from './WaveFlowDiagram'
import { ADMIN_PAGE_TOOLTIPS } from '@/lib/tooltipContent'
import ConfirmDialog from '@/components/dispatch/ConfirmDialog'

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

interface Preset {
  id: number
  name: string
  is_default: boolean
  auto_notify: boolean
  auto_notify_trigger: 'job_created' | 'diagnostic_completed'
  auto_notify_delay_minutes: number
  auto_notify_top_n: number | null
  weight_rate: number
  weight_rating: number
  weight_distance: number
  weight_workload: number
  fallback_immediate: boolean
  nearby_radius_km: number | null
  wave2_delay_minutes?: number | null
}

interface Criterion {
  id: number
  preset_id: number
  name: string
  criterion_type: 'field' | 'distance' | 'dispatch' | 'gps_proximity'
  tech_field: string | null
  operator: string
  compare_type: 'static' | 'job_field'
  compare_value: string | null
  is_active: boolean
  sort_order: number
}

type CriterionFormData = {
  name: string
  criterion_type: 'field' | 'distance' | 'dispatch' | 'gps_proximity'
  tech_field: string
  operator: string
  compare_type: 'static' | 'job_field'
  compare_value: string
}

const emptyCriterionForm: CriterionFormData = {
  name: '',
  criterion_type: 'field',
  tech_field: '',
  operator: 'eq',
  compare_type: 'static',
  compare_value: '',
}

export default function CriteriaPage() {
  const [presets, setPresets] = useState<Preset[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null)
  const [criteria, setCriteria] = useState<Criterion[]>([])
  const [techFields, setTechFields] = useState<FieldOption[]>([])
  const [jobFields, setJobFields] = useState<FieldOption[]>([])
  const [operators, setOperators] = useState<OperatorOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; onConfirm: () => void; danger?: boolean
  } | null>(null)

  // Preset management
  const [showNewPreset, setShowNewPreset] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [copyFromPresetId, setCopyFromPresetId] = useState<string>('')
  const [renamingPresetId, setRenamingPresetId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [weightForm, setWeightForm] = useState<{ rate: number; rating: number; distance: number; workload: number } | null>(null)
  const [isSavingWeights, setIsSavingWeights] = useState(false)

  // Criterion forms
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCriterion, setNewCriterion] = useState<CriterionFormData>({ ...emptyCriterionForm })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<CriterionFormData>({ ...emptyCriterionForm })

  // Field values for compare_value selects (null = free text input, undefined = not loaded yet)
  const [newCriterionFieldValues, setNewCriterionFieldValues] = useState<string[] | null | undefined>(undefined)
  const [editFormFieldValues, setEditFormFieldValues] = useState<string[] | null | undefined>(undefined)

  const selectedPreset = presets.find(p => p.id === selectedPresetId) || null

  async function fetchFieldValues(entity: 'technician' | 'job', field: string): Promise<string[] | null> {
    if (!field) return null
    const res = await fetch(`/api/matching-criteria/field-values?entity=${entity}&field=${encodeURIComponent(field)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.values ?? null
  }

  useEffect(() => {
    if (newCriterion.criterion_type === 'field' && newCriterion.compare_type === 'static' && newCriterion.tech_field) {
      setNewCriterionFieldValues(undefined)
      fetchFieldValues('technician', newCriterion.tech_field).then(setNewCriterionFieldValues)
    } else {
      setNewCriterionFieldValues(undefined)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newCriterion.tech_field, newCriterion.compare_type, newCriterion.criterion_type])

  useEffect(() => {
    if (editForm.criterion_type === 'field' && editForm.compare_type === 'static' && editForm.tech_field) {
      setEditFormFieldValues(undefined)
      fetchFieldValues('technician', editForm.tech_field).then(setEditFormFieldValues)
    } else {
      setEditFormFieldValues(undefined)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm.tech_field, editForm.compare_type, editForm.criterion_type])

  // ── Load presets ──────────────────────────────────────────────────
  const loadPresets = useCallback(async () => {
    try {
      const res = await fetch('/api/matching-presets')
      if (!res.ok) throw new Error('Nepodarilo sa načítať presety')
      const data = await res.json()
      const loadedPresets: Preset[] = data.presets || []
      setPresets(loadedPresets)
      // Auto-select default or first
      if (loadedPresets.length > 0) {
        const def = loadedPresets.find(p => p.is_default)
        setSelectedPresetId(def?.id ?? loadedPresets[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    }
  }, [])

  // ── Load criteria for selected preset ─────────────────────────────
  const loadCriteria = useCallback(async (presetId: number) => {
    try {
      const res = await fetch(`/api/matching-criteria?all=true&preset_id=${presetId}`)
      if (!res.ok) throw new Error('Nepodarilo sa načítať kritériá')
      const data = await res.json()
      setCriteria(data.criteria || [])
      setTechFields(data.fields?.technician || [])
      setJobFields(data.fields?.job || [])
      setOperators(data.operators || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    }
  }, [])

  useEffect(() => {
    loadPresets().then(() => setIsLoading(false))
  }, [loadPresets])

  useEffect(() => {
    if (selectedPresetId) loadCriteria(selectedPresetId)
  }, [selectedPresetId, loadCriteria])

  // ── Field/Operator helpers ────────────────────────────────────────
  function getFieldLabel(value: string | null, source: 'technician' | 'job'): string {
    if (!value) return '—'
    const fields = source === 'technician' ? techFields : jobFields
    return fields.find(f => f.value === value)?.label || value
  }

  function getOperatorLabel(value: string): string {
    return operators.find(o => o.value === value)?.label || value
  }

  function describeRule(c: Criterion): string {
    if (c.criterion_type === 'dispatch') {
      let dp = { radius_km: 10 }
      try { if (c.compare_value) dp = { ...dp, ...JSON.parse(c.compare_value) } } catch { /* defaults */ }
      return `Smart priradenie: okruh ${dp.radius_km} km od zákazky`
    }
    if (c.criterion_type === 'gps_proximity') {
      let gp = { radius_km: 15, max_age_hours: 2 }
      try { if (c.compare_value) gp = { ...gp, ...JSON.parse(c.compare_value) } } catch {}
      return `GPS blízkosť: do ${gp.radius_km} km, GPS max ${gp.max_age_hours}h`
    }
    if (c.criterion_type === 'distance') {
      if (c.compare_type === 'static' && c.compare_value) {
        return `Vzdialenosť technika k zákazke ${getOperatorLabel(c.operator)} ${c.compare_value} km`
      }
      return `Vzdialenosť technika k zákazke ${getOperatorLabel(c.operator)} 50 km (predvolené)`
    }
    const techLabel = getFieldLabel(c.tech_field, 'technician')
    const opLabel = getOperatorLabel(c.operator)
    if (c.compare_type === 'job_field') {
      return `Technik: ${techLabel} ${opLabel} Zákazka: ${getFieldLabel(c.compare_value, 'job')}`
    }
    return `Technik: ${techLabel} ${opLabel} "${c.compare_value || ''}"`
  }

  // ── Preset actions ────────────────────────────────────────────────
  async function handleCreatePreset() {
    if (!newPresetName.trim()) return
    setIsSaving(true)
    try {
      const body: Record<string, unknown> = { name: newPresetName.trim() }
      if (copyFromPresetId) body.copy_from_id = copyFromPresetId
      const data = await apiFetch<{ preset: Preset }>('/api/matching-presets', {
        method: 'POST',
        body,
      })
      setPresets(prev => [...prev, data.preset])
      setSelectedPresetId(data.preset.id)
      if (copyFromPresetId) await loadCriteria(data.preset.id)
      setNewPresetName('')
      setCopyFromPresetId('')
      setShowNewPreset(false)
      setSuccess(copyFromPresetId ? 'Preset skopírovaný' : 'Preset vytvorený')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSetDefault(presetId: number) {
    try {
      await apiFetch(`/api/matching-presets/${presetId}`, {
        method: 'PUT',
        body: { is_default: true },
      })
      setPresets(prev => prev.map(p => ({ ...p, is_default: p.id === presetId })))
      setSuccess('Predvolený preset pre manuálne priradenie nastavený')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    }
  }

  async function handleToggleAutoNotify() {
    if (!selectedPreset) return
    const newVal = !selectedPreset.auto_notify
    try {
      await apiFetch(`/api/matching-presets/${selectedPreset.id}`, {
        method: 'PUT',
        body: { auto_notify: newVal },
      })
      setPresets(prev => prev.map(p => p.id === selectedPreset.id ? { ...p, auto_notify: newVal } : p))
      setSuccess(newVal ? 'Automatická notifikácia zapnutá' : 'Automatická notifikácia vypnutá')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    }
  }

  async function handleRenamePreset() {
    if (!renamingPresetId || !renameValue.trim()) return
    try {
      const data = await apiFetch<{ preset: Preset }>(`/api/matching-presets/${renamingPresetId}`, {
        method: 'PUT',
        body: { name: renameValue.trim() },
      })
      setPresets(prev => prev.map(p => p.id === renamingPresetId ? data.preset : p))
      setRenamingPresetId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    }
  }

  function openWeightEditor() {
    if (!selectedPreset) return
    setWeightForm({
      rate: selectedPreset.weight_rate ?? 25,
      rating: selectedPreset.weight_rating ?? 25,
      distance: selectedPreset.weight_distance ?? 25,
      workload: selectedPreset.weight_workload ?? 25,
    })
  }

  async function handleSaveWeights() {
    if (!selectedPreset || !weightForm) return
    const sum = weightForm.rate + weightForm.rating + weightForm.distance + weightForm.workload
    if (sum !== 100) { setError(`Súčet váh musí byť 100 (teraz ${sum})`); return }
    setIsSavingWeights(true)
    setError(null)
    try {
      const data = await apiFetch<{ preset: Preset }>(`/api/matching-presets/${selectedPreset.id}`, {
        method: 'PUT',
        body: {
          weight_rate: weightForm.rate,
          weight_rating: weightForm.rating,
          weight_distance: weightForm.distance,
          weight_workload: weightForm.workload,
        },
      })
      setPresets(prev => prev.map(p => p.id === selectedPreset.id ? data.preset : p))
      setWeightForm(null)
      setSuccess('Váhy uložené')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setIsSavingWeights(false)
    }
  }

  async function handleDeletePreset(presetId: number) {
    setConfirmDialog({
      title: 'Vymazať preset',
      message: 'Naozaj chcete vymazať tento preset? Všetky jeho kritériá budú odstránené.',
      danger: true,
      onConfirm: () => doDeletePreset(presetId),
    })
  }

  async function doDeletePreset(presetId: number) {
    try {
      await apiFetch(`/api/matching-presets/${presetId}`, { method: 'DELETE' })
      setPresets(prev => prev.filter(p => p.id !== presetId))
      if (selectedPresetId === presetId) {
        const remaining = presets.filter(p => p.id !== presetId)
        setSelectedPresetId(remaining[0]?.id ?? null)
      }
      setSuccess('Preset vymazaný')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    }
  }

  // ── Criterion actions ─────────────────────────────────────────────
  async function handleMove(id: number, direction: 'up' | 'down') {
    const idx = criteria.findIndex(c => c.id === id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= criteria.length) return

    const a = criteria[idx], b = criteria[swapIdx]
    const newOrderA = b.sort_order, newOrderB = a.sort_order
    const newCriteria = [...criteria]
    newCriteria[idx] = { ...a, sort_order: newOrderA }
    newCriteria[swapIdx] = { ...b, sort_order: newOrderB }
    newCriteria.sort((x, y) => x.sort_order - y.sort_order || x.id - y.id)
    setCriteria(newCriteria)

    try {
      await Promise.all([
        apiFetch(`/api/matching-criteria/${a.id}`, { method: 'PUT', body: { sort_order: newOrderA } }),
        apiFetch(`/api/matching-criteria/${b.id}`, { method: 'PUT', body: { sort_order: newOrderB } }),
      ])
    } catch {
      if (selectedPresetId) loadCriteria(selectedPresetId)
      setError('Nepodarilo sa zmeniť poradie')
    }
  }

  async function handleAdd() {
    if (!newCriterion.name.trim() || !selectedPresetId) { setError('Zadajte názov kritéria'); return }
    setIsSaving(true)
    setError(null)
    try {
      const data = await apiFetch<{ criterion: Criterion }>('/api/matching-criteria', {
        method: 'POST',
        body: {
          ...newCriterion,
          preset_id: selectedPresetId,
          tech_field: newCriterion.criterion_type === 'field' ? (newCriterion.tech_field || null) : null,
          operator: newCriterion.criterion_type === 'dispatch' || newCriterion.criterion_type === 'gps_proximity' ? 'lte' : newCriterion.operator,
          compare_value: newCriterion.criterion_type === 'dispatch'
            ? (newCriterion.compare_value || JSON.stringify({ radius_km: 10 }))
            : newCriterion.criterion_type === 'gps_proximity'
              ? (newCriterion.compare_value || JSON.stringify({ radius_km: 15, max_age_hours: 2 }))
              : (newCriterion.compare_value || null),
          sort_order: criteria.length,
        },
      })
      setCriteria(prev => [...prev, data.criterion])
      setShowAddForm(false)
      setNewCriterion({ ...emptyCriterionForm })
      setSuccess('Kritérium vytvorené')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleActive(c: Criterion) {
    try {
      const data = await apiFetch<{ criterion: Criterion }>(`/api/matching-criteria/${c.id}`, {
        method: 'PUT',
        body: { is_active: !c.is_active },
      })
      setCriteria(prev => prev.map(x => x.id === c.id ? data.criterion : x))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    }
  }

  async function handleDelete(id: number) {
    setConfirmDialog({
      title: 'Vymazať kritérium',
      message: 'Naozaj chcete vymazať toto kritérium?',
      danger: true,
      onConfirm: () => doDeleteCriterion(id),
    })
  }

  async function doDeleteCriterion(id: number) {
    try {
      await apiFetch(`/api/matching-criteria/${id}`, { method: 'DELETE' })
      setCriteria(prev => prev.filter(c => c.id !== id))
      setSuccess('Kritérium vymazané')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    }
  }

  function startEdit(c: Criterion) {
    setEditingId(c.id)
    setEditForm({
      name: c.name,
      criterion_type: c.criterion_type,
      tech_field: c.tech_field || '',
      operator: c.operator,
      compare_type: c.compare_type,
      compare_value: c.compare_value || '',
    })
  }

  async function handleSaveEdit() {
    if (editingId === null || !editForm.name.trim()) { setError('Zadajte názov kritéria'); return }
    setIsSaving(true)
    setError(null)
    try {
      const data = await apiFetch<{ criterion: Criterion }>(`/api/matching-criteria/${editingId}`, {
        method: 'PUT',
        body: {
          name: editForm.name,
          criterion_type: editForm.criterion_type,
          tech_field: ['distance', 'dispatch', 'gps_proximity'].includes(editForm.criterion_type) ? null : editForm.tech_field || null,
          operator: editForm.operator,
          compare_type: editForm.compare_type,
          compare_value: editForm.compare_value || null,
        },
      })
      setCriteria(prev => prev.map(c => c.id === editingId ? data.criterion : c))
      setEditingId(null)
      setSuccess('Kritérium aktualizované')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Criterion form renderer (reused for add/edit) ─────────────────
  function renderCriterionForm(
    form: CriterionFormData,
    setForm: (fn: (prev: CriterionFormData) => CriterionFormData) => void,
    fieldValues: string[] | null | undefined,
  ) {
    return (
      <div className="admin-form">
        <div className="field">
          <label className="field-label">
            Názov *
            <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.criteriaPreset} />
          </label>
          <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="field-input" placeholder="napr. Špecializácia zodpovedá kategórii" />
        </div>
        <div className="field">
          <label className="field-label">
            Typ kritéria
            <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.criteriaCriterionType} />
          </label>
          <select value={form.criterion_type} onChange={e => {
            const val = e.target.value as 'field' | 'distance' | 'dispatch' | 'gps_proximity'
            if (val === 'gps_proximity') {
              setForm(p => ({ ...p, criterion_type: val, compare_value: JSON.stringify({ radius_km: 15, max_age_hours: 2 }), name: p.name || 'GPS blízkosť', operator: 'lte', tech_field: '' }))
              return
            }
            setForm(p => ({
              ...p,
              criterion_type: val,
              tech_field: val === 'field' ? p.tech_field : '',
              operator: val === 'dispatch' ? 'eq' : p.operator,
              compare_value: val === 'dispatch' ? JSON.stringify({ radius_km: 10 }) : p.compare_value,
              name: val === 'dispatch' && !p.name ? 'Smart priradenie' : p.name,
            }))
          }} className="field-input">
            <option value="field">Porovnanie polí</option>
            <option value="distance">Vzdialenosť</option>
            <option value="dispatch">Smart priradenie</option>
            <option value="gps_proximity">GPS blízkosť</option>
          </select>
        </div>
        {form.criterion_type === 'dispatch' && (() => {
          let dispatchParams = { radius_km: 10 }
          try { if (form.compare_value) dispatchParams = { ...dispatchParams, ...JSON.parse(form.compare_value) } } catch { /* keep defaults */ }
          const updateDispatchParam = (key: string, val: number) => {
            const updated = { ...dispatchParams, [key]: val }
            setForm(p => ({ ...p, compare_value: JSON.stringify(updated) }))
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label className="field-label">
                  Okruh blízkych zákaziek (km)
                  <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.criteriaDispatchRadius} />
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number" min={1} max={200}
                    value={dispatchParams.radius_km}
                    onChange={e => updateDispatchParam('radius_km', Math.max(1, Math.min(200, parseInt(e.target.value) || 10)))}
                    className="field-input"
                    style={{ width: 100 }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--g4)' }}>km</span>
                </div>
              </div>
            </div>
          )
        })()}
        {form.criterion_type === 'gps_proximity' && (() => {
          let gp = { radius_km: 15, max_age_hours: 2 }
          try { if (form.compare_value) gp = { ...gp, ...JSON.parse(form.compare_value) } } catch {}
          return (
            <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="field">
                <label className="field-label">
                  Okruh (km)
                  <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.criteriaGpsRadius} />
                </label>
                <input type="number" min={1} max={200} value={gp.radius_km}
                  onChange={e => { gp.radius_km = Number(e.target.value) || 15; setForm(p => ({ ...p, compare_value: JSON.stringify(gp) })) }}
                  className="field-input" />
              </div>
              <div className="field">
                <label className="field-label">
                  Max starosť GPS (hodiny)
                  <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.criteriaGpsMaxAge} />
                </label>
                <input type="number" min={0.5} max={24} step={0.5} value={gp.max_age_hours}
                  onChange={e => { gp.max_age_hours = Number(e.target.value) || 2; setForm(p => ({ ...p, compare_value: JSON.stringify(gp) })) }}
                  className="field-input" />
              </div>
            </div>
          )
        })()}
        {form.criterion_type === 'field' && (
          <div className="field">
            <label className="field-label">Pole technika</label>
            <select value={form.tech_field} onChange={e => setForm(p => ({ ...p, tech_field: e.target.value }))} className="field-input">
              <option value="">-- Vyberte pole --</option>
              {techFields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        )}
        {form.criterion_type !== 'dispatch' && form.criterion_type !== 'gps_proximity' && (
          <div className="field">
            <label className="field-label">Operátor</label>
            <select value={form.operator} onChange={e => setForm(p => ({ ...p, operator: e.target.value }))} className="field-input">
              {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
            </select>
          </div>
        )}
        {form.criterion_type !== 'dispatch' && form.criterion_type !== 'gps_proximity' && (
          <div className="field">
            <label className="field-label">Porovnať s</label>
            <select value={form.compare_type} onChange={e => setForm(p => ({ ...p, compare_type: e.target.value as 'static' | 'job_field' }))} className="field-input">
              <option value="static">Statická hodnota</option>
              <option value="job_field">Pole zákazky</option>
            </select>
          </div>
        )}
        {form.criterion_type !== 'dispatch' && form.criterion_type !== 'gps_proximity' && (
          form.compare_type === 'job_field' ? (
            <div className="field">
              <label className="field-label">Pole zákazky</label>
              <select value={form.compare_value} onChange={e => setForm(p => ({ ...p, compare_value: e.target.value }))} className="field-input">
                <option value="">-- Vyberte pole --</option>
                {jobFields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          ) : fieldValues === undefined && form.criterion_type === 'field' && form.tech_field ? (
            <div className="field">
              <label className="field-label">Hodnota</label>
              <div className="field-input" style={{ color: 'var(--g4)', fontSize: 13 }}>Načítavam...</div>
            </div>
          ) : Array.isArray(fieldValues) ? (() => {
            const isMulti = form.operator === 'contains' || form.operator === 'not_contains'
            const selectedVals = form.compare_value ? form.compare_value.split(',').map(v => v.trim()).filter(Boolean) : []
            return (
              <div className="field">
                <label className="field-label">
                  Hodnota{isMulti && <span style={{ fontWeight: 400, color: 'var(--g4)', marginLeft: 4 }}>(možno vybrať viac)</span>}
                </label>
                {isMulti ? (
                  <select
                    multiple
                    value={selectedVals}
                    onChange={e => {
                      const vals = Array.from(e.target.selectedOptions).map(o => o.value)
                      setForm(p => ({ ...p, compare_value: vals.join(',') }))
                    }}
                    className="field-input"
                    size={Math.min(fieldValues.length, 6)}
                    style={{ height: 'auto' }}
                  >
                    {fieldValues.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : (
                  <select value={form.compare_value} onChange={e => setForm(p => ({ ...p, compare_value: e.target.value }))} className="field-input">
                    <option value="">-- Vyberte hodnotu --</option>
                    {fieldValues.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                )}
              </div>
            )
          })() : (
            <div className="field">
              <label className="field-label">{form.criterion_type === 'distance' ? 'Hodnota (km)' : 'Hodnota'}</label>
              <input type="text" value={form.compare_value} onChange={e => setForm(p => ({ ...p, compare_value: e.target.value }))} className="field-input" placeholder={form.criterion_type === 'distance' ? 'napr. 50' : 'napr. true, SK, Inštalatér'} />
            </div>
          )
        )}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <AdminLayout title="Kritériá priraďovania" backHref="/admin/settings">
        <div className="dispatch-empty">
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p>Načítavam...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Kritériá priraďovania" backHref="/admin/settings">
      {/* Messages */}
      {error && (
        <div className="admin-card" style={{ borderColor: 'var(--red)', background: '#FEE2E2', color: 'var(--red)', marginBottom: 12 }}>
          {error}
          <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}
      {success && (
        <div className="admin-card" style={{ borderColor: 'var(--green)', background: '#F0FDF4', color: 'var(--green)', marginBottom: 12 }}>
          {success}
        </div>
      )}

      {/* Preset selector */}
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <label style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>Preset:</label>
            {renamingPresetId === selectedPresetId ? (
              <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                <input type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)} className="field-input" style={{ fontSize: 13, padding: '4px 8px' }} autoFocus onKeyDown={e => e.key === 'Enter' && handleRenamePreset()} />
                <button onClick={handleRenamePreset} style={{ background: 'var(--gold)', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>OK</button>
                <button onClick={() => setRenamingPresetId(null)} style={{ background: 'var(--g2)', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <select
                value={selectedPresetId ?? ''}
                onChange={e => setSelectedPresetId(parseInt(e.target.value, 10))}
                className="field-input"
                style={{ fontSize: 13, padding: '6px 8px', maxWidth: 250 }}
              >
                {presets.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.is_default ? ' (predvolený)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
            {showNewPreset ? (
              <>
                <input type="text" value={newPresetName} onChange={e => setNewPresetName(e.target.value)} placeholder="Názov nového presetu" className="field-input" style={{ fontSize: 12, padding: '4px 8px', width: 160 }} autoFocus onKeyDown={e => e.key === 'Enter' && handleCreatePreset()} />
                <select value={copyFromPresetId} onChange={e => setCopyFromPresetId(e.target.value)} className="field-input" style={{ fontSize: 12, padding: '4px 8px', maxWidth: 160 }} title="Kopírovať kritériá z presetu">
                  <option value="">prázdny preset</option>
                  {presets.map(p => <option key={p.id} value={p.id}>kopírovať z: {p.name}</option>)}
                </select>
                <button onClick={handleCreatePreset} disabled={isSaving || !newPresetName.trim()} style={{ background: 'var(--gold)', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+</button>
                <button onClick={() => { setShowNewPreset(false); setCopyFromPresetId('') }} style={{ background: 'var(--g2)', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>✕</button>
              </>
            ) : (
              <>
                {selectedPreset && !selectedPreset.is_default && (
                  <button onClick={() => handleSetDefault(selectedPreset.id)} style={{ background: 'var(--g2)', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }} title="Nastaviť ako predvolený preset pre manuálne priradenie technika">
                    Predvolený pre manuálne priradenie
                  </button>
                )}
                {selectedPreset && renamingPresetId !== selectedPresetId && (
                  <button onClick={() => { setRenamingPresetId(selectedPreset.id); setRenameValue(selectedPreset.name) }} style={{ background: 'var(--g2)', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>
                    Premenovať
                  </button>
                )}
                {selectedPreset && !selectedPreset.is_default && (
                  <button onClick={() => handleDeletePreset(selectedPreset.id)} style={{ background: 'none', border: '1px solid #FCA5A5', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer', color: 'var(--red)' }}>
                    Zmazať
                  </button>
                )}
                <button onClick={() => setShowNewPreset(true)} style={{ background: 'var(--gold)', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, color: '#1A1A1A' }}>
                  + Nový preset
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Wave flow diagram */}
      <WaveFlowDiagram
        presets={presets}
        selectedPresetId={selectedPresetId}
        onSelectPreset={id => setSelectedPresetId(id)}
      />

      {/* Info */}
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--g4)', lineHeight: 1.6 }}>
          Definujte pravidlá, podľa ktorých sa technici priraďujú k zákazkám.
          Všetky aktívne kritériá sa vyhodnocujú súčasne (AND logika) — technik musí splniť <strong>všetky</strong> aktívne kritériá.
          <strong> Poradie kritérií</strong> určuje zoradenie technikov pri zákazke.
          <strong> Predvolený preset pre manuálne priradenie</strong> sa použije pri manuálnom hľadaní technika na zákazke. Poradie vĺn auto-notifikácie závisí od nastaveného oneskorenia každého presetu.
        </p>
      </div>

      {/* Auto-notify toggle + delay */}
      {selectedPreset && (
        <div
          className="admin-card"
          style={{
            marginBottom: 16,
            borderLeft: `3px solid ${selectedPreset.auto_notify ? 'var(--green)' : 'var(--g3)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14 }}>
                Automatická notifikácia pri novej zákazke
                <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.criteriaAutoNotify} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--g4)', marginTop: 2, lineHeight: 1.5 }}>
                Push notifikácia sa pošle automaticky, ak technik spĺňa kritériá tohto presetu pri novovytvorenej zákazke.
              </div>
            </div>
            <button
              onClick={handleToggleAutoNotify}
              style={{
                background: selectedPreset.auto_notify ? 'var(--green)' : '#9CA3AF',
                color: 'white', border: 'none', borderRadius: 20,
                padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                flexShrink: 0, minWidth: 80, transition: 'background 0.2s',
              }}
            >
              {selectedPreset.auto_notify ? 'Zapnuté' : 'Vypnuté'}
            </button>
          </div>
          {selectedPreset.auto_notify && (
            <div key={selectedPreset.id} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--g2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Delay + trigger — one row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <label style={{ fontSize: 13, color: 'var(--g6)', flexShrink: 0 }}>Odoslať po</label>
                <input
                  type="number"
                  min={0}
                  max={1440}
                  defaultValue={selectedPreset.auto_notify_delay_minutes}
                  onBlur={async e => {
                    const val = Math.max(0, Math.min(1440, parseInt(e.target.value) || 0))
                    e.target.value = String(val)
                    if (val === selectedPreset.auto_notify_delay_minutes) return
                    try {
                      const data = await apiFetch<{ preset: Preset }>(`/api/matching-presets/${selectedPreset.id}`, {
                        method: 'PUT',
                        body: { auto_notify_delay_minutes: val },
                      })
                      setPresets(prev => prev.map(p => p.id === selectedPreset.id ? data.preset : p))
                      setSuccess('Oneskorenie uložené')
                      setTimeout(() => setSuccess(null), 2000)
                    } catch {
                      setError('Nepodarilo sa uložiť oneskorenie')
                    }
                  }}
                  style={{ width: 70, padding: '4px 8px', fontSize: 13, borderRadius: 6, border: '1px solid var(--g3)', textAlign: 'center' }}
                />
                <label style={{ fontSize: 13, color: 'var(--g6)', flexShrink: 0 }}>minút od</label>
                <select
                  value={selectedPreset.auto_notify_trigger ?? 'job_created'}
                  onChange={async e => {
                    const val = e.target.value as 'job_created' | 'diagnostic_completed'
                    try {
                      const data = await apiFetch<{ preset: Preset }>(`/api/matching-presets/${selectedPreset.id}`, {
                        method: 'PUT',
                        body: { auto_notify_trigger: val },
                      })
                      setPresets(prev => prev.map(p => p.id === selectedPreset.id ? data.preset : p))
                      setSuccess('Trigger uložený')
                      setTimeout(() => setSuccess(null), 2000)
                    } catch {
                      setError('Nepodarilo sa uložiť trigger')
                    }
                  }}
                  style={{ padding: '4px 8px', fontSize: 13, borderRadius: 6, border: '1px solid var(--g3)', background: 'var(--surface, #fff)', color: 'var(--dark)' }}
                >
                  <option value="job_created">vytvorenia zákazky</option>
                  <option value="diagnostic_completed">vyplnenia diagnostického formulára</option>
                </select>
                {selectedPreset.auto_notify_delay_minutes === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>okamžite</span>
                )}
              </div>
              {/* Top N row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 13, color: 'var(--g6)', flexShrink: 0 }}>Notifikovať top</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  placeholder="všetci"
                  defaultValue={selectedPreset.auto_notify_top_n ?? ''}
                  onBlur={async e => {
                    const raw = e.target.value.trim()
                    const val = raw === '' ? null : Math.max(1, parseInt(raw) || 1)
                    e.target.value = val !== null ? String(val) : ''
                    if (val === selectedPreset.auto_notify_top_n) return
                    try {
                      const data = await apiFetch<{ preset: Preset }>(`/api/matching-presets/${selectedPreset.id}`, {
                        method: 'PUT',
                        body: { auto_notify_top_n: val },
                      })
                      setPresets(prev => prev.map(p => p.id === selectedPreset.id ? data.preset : p))
                      setSuccess('Top N uložené')
                      setTimeout(() => setSuccess(null), 2000)
                    } catch {
                      setError('Nepodarilo sa uložiť top N')
                    }
                  }}
                  style={{ width: 70, padding: '4px 8px', fontSize: 13, borderRadius: 6, border: '1px solid var(--g3)', textAlign: 'center' }}
                />
                <label style={{ fontSize: 13, color: 'var(--g6)' }}>technikov (prázdne = všetci)</label>
              </div>
              {/* Fallback immediate toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--g6)', flexShrink: 0 }}>
                  Ak 0 matchov →
                  <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.criteriaFallback} />
                </label>
                <button
                  onClick={async () => {
                    const newVal = !(selectedPreset.fallback_immediate ?? true)
                    try {
                      const data = await apiFetch<{ preset: Preset }>(`/api/matching-presets/${selectedPreset.id}`, {
                        method: 'PUT',
                        body: { fallback_immediate: newVal },
                      })
                      setPresets(prev => prev.map(p => p.id === selectedPreset.id ? data.preset : p))
                      setSuccess(newVal ? 'Okamžitý fallback zapnutý' : 'Okamžitý fallback vypnutý')
                      setTimeout(() => setSuccess(null), 2000)
                    } catch {
                      setError('Nepodarilo sa uložiť nastavenie')
                    }
                  }}
                  style={{
                    background: (selectedPreset.fallback_immediate ?? true) ? 'var(--green)' : '#9CA3AF',
                    color: 'white', border: 'none', borderRadius: 12,
                    padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  {(selectedPreset.fallback_immediate ?? true) ? 'Ihneď ďalšia várka' : 'Čakať delay'}
                </button>
                <span style={{ fontSize: 11, color: 'var(--g4)' }}>
                  {(selectedPreset.fallback_immediate ?? true)
                    ? 'Ak nikto nesplní kritériá, ďalšia várka sa odošle okamžite'
                    : 'Aj pri 0 matchoch sa čaká nastavený delay'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preference weights */}
      {selectedPreset && (
        <div className="admin-card" style={{ marginBottom: 16, borderLeft: '3px solid var(--gold)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                Skóre váhy
                <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.criteriaWeights} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--g4)', marginBottom: weightForm ? 14 : 0, lineHeight: 1.5 }}>
                Zoraďuje technikov splňajúcich kritériá podľa kombinácie ceny, hodnotenia a vzdialenosti. Súčet musí byť 100.
              </div>
              {weightForm ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    {([
                      ['rate', 'Cena (hodinová sadzba)', weightForm.rate],
                      ['rating', 'Hodnotenie', weightForm.rating],
                      ['distance', 'Vzdialenosť', weightForm.distance],
                      ['workload', 'Záťaž (menej zákaziek = lepšie)', weightForm.workload],
                    ] as [keyof typeof weightForm, string, number][]).map(([key, label, val]) => (
                      <div key={key} className="field">
                        <label className="field-label" style={{ fontSize: 11 }}>{label}</label>
                        <input
                          type="number" min={0} max={100} value={val}
                          onChange={e => setWeightForm(p => p ? { ...p, [key]: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) } : p)}
                          className="field-input" style={{ fontSize: 13 }}
                        />
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const s = weightForm.rate + weightForm.rating + weightForm.distance + weightForm.workload
                    return (
                      <div style={{ fontSize: 12, marginBottom: 10, color: s === 100 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                        Súčet: {s} / 100{s !== 100 && ` (rozdiel: ${s > 100 ? '+' : ''}${s - 100})`}
                      </div>
                    )
                  })()}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={handleSaveWeights} disabled={isSavingWeights || (weightForm.rate + weightForm.rating + weightForm.distance + weightForm.workload) !== 100} className="admin-btn admin-btn-gold" style={{ fontSize: 12, padding: '6px 14px' }}>
                      {isSavingWeights ? 'Ukladám...' : 'Uložiť váhy'}
                    </button>
                    <button onClick={() => setWeightForm(null)} className="admin-btn admin-btn-outline" style={{ fontSize: 12, padding: '6px 14px' }}>Zrušiť</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                  {[
                    { label: 'Cena', value: selectedPreset.weight_rate ?? 25 },
                    { label: 'Hodnotenie', value: selectedPreset.weight_rating ?? 25 },
                    { label: 'Vzdialenosť', value: selectedPreset.weight_distance ?? 25 },
                    { label: 'Záťaž', value: selectedPreset.weight_workload ?? 25 },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                      <span style={{ color: 'var(--g4)' }}>{label}:</span>
                      <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{value}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!weightForm && (
              <button onClick={openWeightEditor} className="admin-btn admin-btn-sm admin-btn-outline" style={{ flexShrink: 0 }}>
                Upraviť
              </button>
            )}
          </div>
        </div>
      )}

      {/* No preset selected */}
      {!selectedPreset && presets.length === 0 && (
        <div className="admin-empty">
          <div className="admin-empty-icon">📋</div>
          <h3>Žiadne presety</h3>
          <p>Vytvorte prvý preset pre kritériá priraďovania.</p>
        </div>
      )}

      {/* Criteria list */}
      {selectedPreset && criteria.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">🎯</div>
          <h3>Žiadne kritériá</h3>
          <p>Pridajte prvé kritérium do tohto presetu.</p>
        </div>
      ) : (
        criteria.map((criterion, index) => (
          <div
            key={criterion.id}
            className="admin-card"
            style={{
              marginBottom: 8,
              opacity: criterion.is_active ? 1 : 0.5,
              borderLeft: `3px solid ${editingId === criterion.id ? '#3B82F6' : (criterion.criterion_type === 'dispatch' || criterion.criterion_type === 'gps_proximity') && criterion.is_active ? 'var(--accent, #2563EB)' : criterion.is_active ? 'var(--gold)' : 'var(--g3)'}`,
            }}
          >
            {editingId === criterion.id ? (
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
                  <span style={{ color: 'var(--g4)', fontSize: 12, marginRight: 6 }}>#{index + 1}</span>
                  Upraviť kritérium
                </div>
                {renderCriterionForm(editForm, setEditForm, editFormFieldValues)}
                <div className="admin-btn-row" style={{ marginTop: 12, position: 'sticky', bottom: 0, background: 'var(--bg-primary, #FAFAF7)', padding: '12px 0', borderTop: '1px solid var(--g2, #E5E7EB)', zIndex: 5 }}>
                  <button className="admin-btn admin-btn-outline" onClick={() => setEditingId(null)} style={{ fontSize: 13, padding: '8px 16px' }}>Zrušiť</button>
                  <button className="admin-btn admin-btn-gold" onClick={handleSaveEdit} disabled={isSaving} style={{ fontSize: 13, padding: '8px 16px' }}>{isSaving ? 'Ukladám...' : 'Uložiť zmeny'}</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                {/* Reorder */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, marginRight: 4 }}>
                  <button onClick={() => handleMove(criterion.id, 'up')} disabled={index === 0} style={{ background: 'none', border: '1px solid var(--g3)', borderRadius: 4, width: 24, height: 20, cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1, fontSize: 10, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Posunúť vyššie">▲</button>
                  <button onClick={() => handleMove(criterion.id, 'down')} disabled={index === criteria.length - 1} style={{ background: 'none', border: '1px solid var(--g3)', borderRadius: 4, width: 24, height: 20, cursor: index === criteria.length - 1 ? 'default' : 'pointer', opacity: index === criteria.length - 1 ? 0.3 : 1, fontSize: 10, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Posunúť nižšie">▼</button>
                </div>
                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    <span style={{ color: 'var(--g4)', fontSize: 12, marginRight: 6 }}>#{index + 1}</span>
                    {criterion.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--g4)', lineHeight: 1.5 }}>{describeRule(criterion)}</div>
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <button onClick={() => startEdit(criterion)} className="admin-btn admin-btn-outline admin-btn-sm" title="Upraviť">✏️ Upraviť</button>
                  <button onClick={() => handleToggleActive(criterion)} style={{ background: criterion.is_active ? 'var(--gold)' : 'var(--g2)', color: criterion.is_active ? '#1A1A1A' : 'var(--g4)', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>{criterion.is_active ? 'Aktívne' : 'Neaktívne'}</button>
                  <button onClick={() => handleDelete(criterion.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, padding: '4px 6px' }}>✕</button>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Add form */}
      {selectedPreset && (showAddForm ? (
        <div className="admin-card" style={{ marginTop: 16, border: '2px dashed var(--gold)', background: 'var(--g1)' }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>Nové kritérium</h3>
          {renderCriterionForm(newCriterion, setNewCriterion, newCriterionFieldValues)}
          <div className="admin-btn-row" style={{ marginTop: 12, position: 'sticky', bottom: 0, background: 'var(--bg-primary, #FAFAF7)', padding: '12px 0', borderTop: '1px solid var(--g2, #E5E7EB)', zIndex: 5 }}>
            <button className="admin-btn admin-btn-outline" onClick={() => setShowAddForm(false)} style={{ fontSize: 13, padding: '8px 16px' }}>Zrušiť</button>
            <button className="admin-btn admin-btn-gold" onClick={handleAdd} disabled={isSaving} style={{ fontSize: 13, padding: '8px 16px' }}>{isSaving ? 'Ukladám...' : 'Vytvoriť kritérium'}</button>
          </div>
        </div>
      ) : (
        <button className="admin-btn admin-btn-gold" onClick={() => setShowAddForm(true)} style={{ marginTop: 16, width: '100%' }}>
          + Pridať kritérium
        </button>
      ))}

      <ConfirmDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        danger={confirmDialog?.danger}
        onConfirm={() => { confirmDialog?.onConfirm(); setConfirmDialog(null) }}
        onCancel={() => setConfirmDialog(null)}
      />
    </AdminLayout>
  )
}
