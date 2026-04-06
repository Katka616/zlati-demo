'use client'

import React, { useState, useEffect } from 'react'
import type {
  AutomationRule,
  AutomationCondition,
  AutomationAction,
  TriggerType,
  TriggerConfig,
} from '@/types/automation'
import TriggerSelector from './TriggerSelector'
import ActionBuilder from './ActionBuilder'

// ── Condition operator labels ─────────────────────────────────────
const OPERATOR_LABELS: Record<AutomationCondition['operator'], string> = {
  eq: '=',
  neq: '≠',
  contains: 'obsahuje',
  not_contains: 'neobsahuje',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  is_any_of: 'je jedným z',
  is_not_any_of: 'nie je jedným z',
  is_empty: 'je prázdne',
  is_not_empty: 'nie je prázdne',
}

const CONDITION_FIELD_OPTIONS = [
  { value: 'status', label: 'Status' },
  { value: 'partner_id', label: 'Poisťovňa' },
  { value: 'urgency', label: 'Urgentnosť' },
  { value: 'category', label: 'Kategória' },
  { value: 'crm_step', label: 'Krok zákazky' },
  { value: 'tech_phase', label: 'Fáza technika' },
  { value: 'assigned_to', label: 'Priradený technik' },
  { value: 'customer_city', label: 'Mesto klienta' },
  { value: 'priority_flag', label: 'Priorita' },
]

// ── Presets ───────────────────────────────────────────────────────
interface Preset {
  name: string
  description: string
  triggerType: TriggerType
  triggerConfig: TriggerConfig
  conditions: Omit<AutomationCondition, 'id'>[]
  actions: AutomationAction[]
}

const PRESETS: Preset[] = [
  {
    name: 'Notifikácia pri urgentnej zákazke',
    description: 'Odošle push + SMS keď vznikne nová urgentná zákazka',
    triggerType: 'job_created',
    triggerConfig: {},
    conditions: [{ logic: 'AND', field: 'urgency', operator: 'eq', value: 'acute' }],
    actions: [
      { type: 'send_push', config: { recipient: 'operator', title: 'Urgentná zákazka!', body: '{{job.customer_name}} — {{job.category}} ({{job.customer_city}})' } },
      { type: 'send_sms', config: { recipient: 'client', template: 'Dobrý deň {{job.customer_name}}, Vaša urgentná zákazka bola prijatá. Technik bude kontaktovaný.' } },
    ],
  },
  {
    name: 'Pripomienka po 4 hodinách',
    description: 'Vytvorí pripomienku 4 hodiny po vytvorení zákazky',
    triggerType: 'time_elapsed',
    triggerConfig: { minutes: 240, reference_event: 'job_created' },
    conditions: [],
    actions: [
      { type: 'create_reminder', config: { text: 'Skontrolovať stav zákazky — uplynuli 4 hodiny', minutes: 0 } },
    ],
  },
  {
    name: 'Auto-fill dátum dokončenia',
    description: 'Nastaví dátum dokončenia keď sa zákazka posunie na krok 6',
    triggerType: 'status_change',
    triggerConfig: { to_step: 6 },
    conditions: [],
    actions: [
      { type: 'update_field', config: { field: 'due_date', value: 'now' } },
    ],
  },
  {
    name: 'Preskočenie odhlášky pre iné poisťovne',
    description: 'Preskočí krok EA odhláška pre zákazky, ktoré nie sú od Europ Assistance',
    triggerType: 'status_change',
    triggerConfig: { to_step: 9 },
    conditions: [{ logic: 'AND', field: 'partner_id', operator: 'neq', value: '2' }],
    actions: [
      { type: 'advance_step', config: { target_step: 10 } },
    ],
  },
]

// ── Human-readable labels for test results ──────────────────────────
const FIELD_LABELS: Record<string, string> = {
  status: 'Status', partner_id: 'Poisťovňa', urgency: 'Urgentnosť',
  category: 'Kategória', crm_step: 'Krok zákazky', tech_phase: 'Fáza technika',
  assigned_to: 'Priradený technik', customer_city: 'Mesto klienta', priority_flag: 'Priorita',
}

const TEST_ACTION_LABELS: Record<string, string> = {
  send_push: 'Push notifikácia', send_sms: 'SMS', send_email: 'Email',
  update_field: 'Zmena poľa', update_custom_field: 'Zmena vlastného poľa',
  add_note: 'Poznámka', add_tag: 'Štítok', run_ai_field: 'AI pole',
  advance_step: 'Posun kroku', assign_technician: 'Priradenie technika',
  create_reminder: 'Pripomienka', call_webhook: 'Externý URL', call_voicebot: 'Voicebot',
}

// ── Types for test result ─────────────────────────────────────────
interface TestResult {
  conditionsMet: boolean
  // Engine returns conditionDetails, map to conditionResults for display
  conditionResults: { field: string; operator: string; expected: unknown; actual: unknown; passed: boolean }[]
  actionsToRun: { type: string; config?: Record<string, unknown> }[]
  error?: string
}

// ── Editor styles ─────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: '13px',
  border: '1px solid #D1D5DB',
  borderRadius: '6px',
  fontFamily: "'Montserrat', sans-serif",
  background: '#fff',
  color: '#111827',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '4px',
  display: 'block',
}

const btnBase: React.CSSProperties = {
  border: 'none',
  borderRadius: '6px',
  padding: '8px 16px',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
}

function generateConditionId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ── Component ─────────────────────────────────────────────────────
interface Props {
  rule: Partial<AutomationRule> | null
  onSaved: () => void
  onCancel: () => void
}

export default function AutomationRuleEditor({ rule, onSaved, onCancel }: Props) {
  const isNew = !rule?.id

  const [name, setName] = useState(rule?.name || '')
  const [description, setDescription] = useState(rule?.description || '')
  const [triggerType, setTriggerType] = useState<TriggerType>(rule?.triggerType || 'job_created')
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>(rule?.triggerConfig || {})
  const [conditions, setConditions] = useState<AutomationCondition[]>(rule?.conditions || [])
  const [actions, setActions] = useState<AutomationAction[]>(rule?.actions || [{ type: 'send_push', config: {} }])
  const [isActive, setIsActive] = useState(rule?.isActive !== false)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [showPresets, setShowPresets] = useState(false)
  const [testJobId, setTestJobId] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  useEffect(() => {
    if (rule) {
      setName(rule.name || '')
      setDescription(rule.description || '')
      setTriggerType(rule.triggerType || 'job_created')
      setTriggerConfig(rule.triggerConfig || {})
      setConditions(rule.conditions || [])
      setActions(rule.actions || [{ type: 'send_push', config: {} }])
      setIsActive(rule.isActive !== false)
    }
  }, [rule])

  const applyPreset = (preset: Preset) => {
    setName(preset.name)
    setDescription(preset.description)
    setTriggerType(preset.triggerType)
    setTriggerConfig(preset.triggerConfig)
    setConditions(preset.conditions.map(c => ({ ...c, id: generateConditionId() })))
    setActions(preset.actions)
    setShowPresets(false)
  }

  const addCondition = () => {
    setConditions(prev => [...prev, {
      id: generateConditionId(),
      logic: 'AND',
      field: 'status',
      operator: 'eq',
      value: '',
    }])
  }

  const updateCondition = (id: string, partial: Partial<AutomationCondition>) => {
    setConditions(prev => prev.map(c => c.id === id ? { ...c, ...partial } : c))
  }

  const removeCondition = (id: string) => {
    setConditions(prev => prev.filter(c => c.id !== id))
  }

  const addAction = () => {
    setActions(prev => [...prev, { type: 'send_push', config: {} }])
  }

  const updateAction = (index: number, action: AutomationAction) => {
    setActions(prev => prev.map((a, i) => i === index ? action : a))
  }

  const removeAction = (index: number) => {
    setActions(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!name.trim()) { setSaveError('Zadajte názov pravidla'); return }
    if (actions.length === 0) { setSaveError('Pridajte aspoň jednu akciu'); return }
    setSaveError('')
    setSaving(true)
    try {
      const payload = { name: name.trim(), description: description.trim(), triggerType, triggerConfig, conditions, actions, isActive }
      const res = await fetch(
        isNew ? '/api/admin/automations' : `/api/admin/automations/${rule!.id}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      if (res.ok) {
        onSaved()
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveError(data.error || 'Chyba pri ukladaní')
      }
    } catch {
      setSaveError('Chyba pri ukladaní')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!rule?.id) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/automations/${rule.id}`, { method: 'DELETE' })
      if (res.ok) {
        onSaved()
      } else {
        setSaveError('Chyba pri mazaní pravidla')
      }
    } catch {
      setSaveError('Chyba pri mazaní pravidla')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleTest = async () => {
    if (!testJobId || !rule?.id) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`/api/admin/automations/${rule.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: Number(testJobId) || 0 }),
      })
      if (res.ok) {
        const data = await res.json()
        // Map engine response keys to UI keys
        setTestResult({
          conditionsMet: data.conditionsMet,
          conditionResults: data.conditionDetails ?? data.conditionResults ?? [],
          actionsToRun: data.actionsWouldRun ?? data.actionsToRun ?? [],
        })
      } else {
        setTestResult({ conditionsMet: false, conditionResults: [], actionsToRun: [], error: 'Chyba pri simulácii' })
      }
    } catch {
      setTestResult({ conditionsMet: false, conditionResults: [], actionsToRun: [], error: 'Sieťová chyba' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{ maxWidth: '820px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            {isNew ? 'Nové pravidlo' : 'Upraviť pravidlo'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#4B5563' }}>
            Nakonfigurujte trigger, podmienky a akcie
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowPresets(!showPresets)}
            style={{ ...btnBase, background: '#F3F4F6', color: '#374151' }}
          >
            📋 Šablóny
          </button>
          <button onClick={onCancel} style={{ ...btnBase, background: '#F3F4F6', color: '#374151' }}>
            Zrušiť
          </button>
        </div>
      </div>

      {/* Presets dropdown */}
      {showPresets && (
        <div style={{
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          background: '#fff',
          marginBottom: '20px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6', fontWeight: 700, fontSize: '13px', color: '#374151' }}>
            Vybrať šablónu
          </div>
          {PRESETS.map((preset, i) => (
            <div
              key={i}
              onClick={() => applyPreset(preset)}
              style={{
                padding: '12px 14px',
                cursor: 'pointer',
                borderBottom: i < PRESETS.length - 1 ? '1px solid #F3F4F6' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>{preset.name}</div>
              <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '2px' }}>{preset.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Name + Description */}
      <div className="automation-editor-section">
        <h4>Základné informácie</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Názov pravidla *</label>
            <input
              style={{ ...inputStyle, width: '100%' }}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Napr. Urgentná notifikácia"
            />
          </div>
          <div>
            <label style={labelStyle}>Popis (voliteľné)</label>
            <input
              style={{ ...inputStyle, width: '100%' }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Čo toto pravidlo robí..."
            />
          </div>
        </div>
        <div style={{ marginTop: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#374151', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            Pravidlo je aktívne
          </label>
        </div>
      </div>

      {/* Trigger */}
      <div className="automation-editor-section">
        <h4>Trigger — kedy sa spustí</h4>
        <TriggerSelector
          triggerType={triggerType}
          triggerConfig={triggerConfig}
          onTypeChange={t => { setTriggerType(t); setTriggerConfig({}) }}
          onConfigChange={setTriggerConfig}
        />
      </div>

      {/* Conditions */}
      <div className="automation-editor-section">
        <h4>Podmienky (AND)</h4>
        {conditions.length === 0 && (
          <div style={{ fontSize: '13px', color: '#4B5563', marginBottom: '10px' }}>
            Bez podmienok — pravidlo sa spustí pri každom triggeri.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
          {conditions.map((cond, i) => (
            <div key={cond.id} className="automation-condition-row">
              {i > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', minWidth: '30px' }}>AND</span>
              )}
              <select
                style={{ ...inputStyle, minWidth: '150px' }}
                value={cond.field}
                onChange={e => updateCondition(cond.id, { field: e.target.value })}
              >
                {CONDITION_FIELD_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
                <option value="cf:custom">Vlastné pole</option>
              </select>
              <select
                style={{ ...inputStyle, minWidth: '120px' }}
                value={cond.operator}
                onChange={e => updateCondition(cond.id, { operator: e.target.value as AutomationCondition['operator'] })}
              >
                {(Object.keys(OPERATOR_LABELS) as AutomationCondition['operator'][]).map(op => (
                  <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                ))}
              </select>
              {!['is_empty', 'is_not_empty'].includes(cond.operator) && (
                <input
                  style={{ ...inputStyle, flex: 1, minWidth: '100px' }}
                  value={String(cond.value ?? '')}
                  onChange={e => updateCondition(cond.id, { value: e.target.value })}
                  placeholder="hodnota"
                />
              )}
              <button
                onClick={() => removeCondition(cond.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#9CA3AF', padding: '4px', flexShrink: 0 }}
                title="Odstrániť podmienku"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addCondition}
          style={{ ...btnBase, background: '#F3F4F6', color: '#374151', fontSize: '12px', padding: '6px 12px' }}
        >
          + Pridať podmienku
        </button>
      </div>

      {/* Actions */}
      <div className="automation-editor-section">
        <h4>Akcie — čo sa vykoná</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
          {actions.map((action, i) => (
            <ActionBuilder
              key={i}
              action={action}
              onChange={a => updateAction(i, a)}
              onDelete={() => removeAction(i)}
            />
          ))}
        </div>
        <button
          onClick={addAction}
          style={{ ...btnBase, background: '#F3F4F6', color: '#374151', fontSize: '12px', padding: '6px 12px' }}
        >
          + Pridať akciu
        </button>
      </div>

      {/* Test */}
      {!isNew && rule?.id && (
        <div className="automation-editor-section">
          <h4>Simulácia na zákazke</h4>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={labelStyle}>ID zákazky</label>
              <input
                style={{ ...inputStyle, width: '120px' }}
                type="number"
                placeholder="napr. 5"
                value={testJobId}
                onChange={e => setTestJobId(e.target.value)}
              />
            </div>
            <button
              onClick={handleTest}
              disabled={testing || !testJobId}
              style={{
                ...btnBase,
                background: '#bf953f',
                color: '#fff',
                opacity: testing || !testJobId ? 0.6 : 1,
                cursor: testing || !testJobId ? 'not-allowed' : 'pointer',
              }}
            >
              {testing ? 'Simulujem...' : 'Simulovať'}
            </button>
          </div>

          {testResult && (
            <div className={`automation-test-result ${testResult.error ? 'failure' : testResult.conditionsMet ? 'success' : 'failure'}`}>
              {testResult.error ? (
                <div style={{ fontWeight: 600 }}>Chyba: {testResult.error}</div>
              ) : (
                <>
                  <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}>
                    {testResult.conditionsMet ? '✅ Podmienky splnené' : '❌ Podmienky nesplnené'}
                  </div>
                  {testResult.conditionResults.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '4px', color: '#374151' }}>Podmienky:</div>
                      {testResult.conditionResults.map((cr, i) => (
                        <div key={i} style={{ fontSize: '12px', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{cr.passed ? '✓' : '✗'}</span>
                          <span><strong>{FIELD_LABELS[cr.field] || cr.field}</strong> {OPERATOR_LABELS[cr.operator as keyof typeof OPERATOR_LABELS] || cr.operator} <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 4px', borderRadius: '3px' }}>{String(cr.expected)}</code></span>
                          <span style={{ color: '#6B7280' }}>(skutočná hodnota: {String(cr.actual ?? '—')})</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {testResult.actionsToRun.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '4px', color: '#374151' }}>Akcie:</div>
                      {testResult.actionsToRun.map((ar, i) => (
                        <div key={i} style={{ fontSize: '12px', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>✓</span>
                          <span><strong>{TEST_ACTION_LABELS[ar.type] || ar.type}</strong></span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {saveError && (
        <div style={{
          padding: '10px 14px',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '6px',
          color: '#DC2626',
          fontSize: '13px',
          marginBottom: '12px',
        }}>
          {saveError}
        </div>
      )}

      {/* Save bar */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', flexWrap: 'wrap', paddingTop: '4px', position: 'sticky', bottom: 0, background: 'var(--bg-primary, #FAFAF7)', padding: '12px 0', borderTop: '1px solid var(--g2, #E5E7EB)', zIndex: 5 }}>
        <div>
          {!isNew && rule?.id && (
            confirmDelete ? (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#374151' }}>Naozaj zmazať?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ ...btnBase, background: '#DC2626', color: '#fff', opacity: deleting ? 0.6 : 1 }}
                >
                  {deleting ? '...' : 'Zmazať'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ ...btnBase, background: '#F3F4F6', color: '#374151' }}
                >
                  Zrušiť
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{ ...btnBase, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
              >
                Zmazať pravidlo
              </button>
            )
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCancel} style={{ ...btnBase, background: '#F3F4F6', color: '#374151' }}>
            Zrušiť
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{
              ...btnBase,
              background: '#bf953f',
              color: '#fff',
              opacity: saving || !name.trim() ? 0.6 : 1,
              cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Ukladám...' : isNew ? 'Vytvoriť pravidlo' : 'Uložiť zmeny'}
          </button>
        </div>
      </div>
    </div>
  )
}
