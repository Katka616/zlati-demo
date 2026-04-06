'use client'

import React, { useState, useEffect } from 'react'
import type { SlaRule, SlaActionType, SlaPriority, SlaClockSource } from '@/types/sla'

// ── Constants ─────────────────────────────────────────────────────────

const CRM_STEP_LABELS: Record<number, string> = {
  0: 'Príjem',
  1: 'Dispatching',
  2: 'Naplánované',
  3: 'Na mieste',
  4: 'Schvaľovanie ceny',
  5: 'Cenová ponuka klientovi',
  6: 'Práca',
  7: 'Rozpracovaná',
  8: 'Dokončené',
  9: 'Zúčtovanie',
  10: 'Cenová kontrola',
  11: 'EA odhláška',
  12: 'Fakturácia',
  13: 'Uhradené',
  14: 'Uzavreté',
}

const ACTION_LABELS: Record<SlaActionType, string> = {
  notify_operator: 'Notifikácia operátora',
  notify_technician: 'Notifikácia technika',
  sms_client: 'SMS klientovi',
  sms_technician: 'SMS technikovi',
  auto_advance: 'Auto-posun zákazky',
  auto_approve: 'Auto-schválenie',
  email_partner: 'Email poisťovni',
  create_reminder: 'Vytvorit pripomienku',
}

const PRIORITY_LABELS: Record<SlaPriority, string> = {
  critical: 'Kritická',
  high: 'Vysoká',
  medium: 'Stredná',
  low: 'Nízka',
}

const CLOCK_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'crm_step_entered_at', label: 'Od vstupu do kroku' },
  { value: 'updated_at', label: 'Od poslednej zmeny' },
  { value: 'created_at', label: 'Od vytvorenia zákazky' },
  { value: 'custom_field', label: 'Custom field (zadajte názov)' },
]

const ACTION_CONFIG_HINTS: Record<SlaActionType, string> = {
  notify_operator: '{ "message": "Text notifikácie", "priority": "high" }',
  notify_technician: '{ "message": "Text notifikácie pre technika" }',
  sms_client: '{ "template": "Text SMS správy pre klienta {{job.customer_name}}" }',
  sms_technician: '{ "template": "Text SMS správy pre technika" }',
  auto_advance: '{ "target_step": 5 }',
  auto_approve: '{ }',
  email_partner: '{ "subject": "Predmet emailu", "body": "Telo emailu" }',
  create_reminder: '{ "text": "Text pripomienky", "minutes": 0 }',
}

const CONDITION_OP_OPTIONS = [
  { value: 'eq', label: '= (rovná sa)' },
  { value: 'neq', label: '≠ (nerovná sa)' },
  { value: 'contains', label: 'obsahuje' },
  { value: 'not_contains', label: 'neobsahuje' },
  { value: 'gt', label: '> (väčšie ako)' },
  { value: 'gte', label: '≥ (väčšie alebo rovné)' },
  { value: 'lt', label: '< (menšie ako)' },
  { value: 'lte', label: '≤ (menšie alebo rovné)' },
  { value: 'is_empty', label: 'je prázdne' },
  { value: 'is_not_empty', label: 'nie je prázdne' },
]

// ── Styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: '13px',
  border: '1px solid #D1D5DB',
  borderRadius: '6px',
  fontFamily: "'Montserrat', sans-serif",
  background: '#fff',
  color: '#111827',
  width: '100%',
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

const sectionStyle: React.CSSProperties = {
  marginBottom: '20px',
  padding: '16px',
  background: '#FAFAFA',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
}

// ── Interface ───────────────────────────────────────────────────────────

interface Partner {
  id: number
  name: string
  code: string
}

interface Props {
  rule: SlaRule | null
  onSaved: () => void
  onCancel: () => void
}

// ── Component ───────────────────────────────────────────────────────────

export default function SlaRuleEditor({ rule, onSaved, onCancel }: Props) {
  const isNew = !rule?.id

  // Basic fields
  const [name, setName] = useState(rule?.name || '')
  const [crmStep, setCrmStep] = useState<number>(rule?.crm_step ?? 0)
  const [deadlineHours, setDeadlineHours] = useState<number>(rule?.deadline_hours ?? 24)
  const [clockSourceBase, setClockSourceBase] = useState<string>(() => {
    if (!rule?.clock_source) return 'crm_step_entered_at'
    if (rule.clock_source.startsWith('custom_field:')) return 'custom_field'
    return rule.clock_source
  })
  const [clockSourceCustomField, setClockSourceCustomField] = useState<string>(() => {
    if (rule?.clock_source?.startsWith('custom_field:')) {
      return (rule.clock_source as string).replace('custom_field:', '')
    }
    return ''
  })
  const [priority, setPriority] = useState<SlaPriority>(rule?.priority ?? 'medium')
  const [partnerId, setPartnerId] = useState<string>(rule?.partner_id != null ? String(rule.partner_id) : '')
  const [category, setCategory] = useState(rule?.category || '')

  // Condition (collapsible)
  const [showCondition, setShowCondition] = useState(!!(rule?.condition_field))
  const [conditionField, setConditionField] = useState(rule?.condition_field || '')
  const [conditionOp, setConditionOp] = useState(rule?.condition_op || 'eq')
  const [conditionValue, setConditionValue] = useState(rule?.condition_value || '')

  // Action
  const [actionType, setActionType] = useState<SlaActionType>(rule?.action_type ?? 'notify_operator')
  const [actionConfigRaw, setActionConfigRaw] = useState(
    rule?.action_config ? JSON.stringify(rule.action_config, null, 2) : '{}'
  )
  const [actionConfigError, setActionConfigError] = useState('')

  // Other
  const [idempotencyKey, setIdempotencyKey] = useState(rule?.idempotency_key || '')
  const [sortOrder, setSortOrder] = useState<number>(rule?.sort_order ?? 0)
  const [isActive, setIsActive] = useState(rule?.is_active !== false)

  // Partners
  const [partners, setPartners] = useState<Partner[]>([])

  // Save state
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/admin/operations?type=partners').then(r => r.json()).then(d => {
      if (d.partners) setPartners(d.partners)
    }).catch(() => {})
  }, [])

  // Sync state when rule prop changes
  useEffect(() => {
    if (rule) {
      setName(rule.name)
      setCrmStep(rule.crm_step)
      setDeadlineHours(rule.deadline_hours)
      setClockSourceBase(rule.clock_source?.startsWith('custom_field:') ? 'custom_field' : (rule.clock_source ?? 'crm_step_entered_at'))
      setClockSourceCustomField(rule.clock_source?.startsWith('custom_field:') ? (rule.clock_source as string).replace('custom_field:', '') : '')
      setPriority(rule.priority ?? 'medium')
      setPartnerId(rule.partner_id != null ? String(rule.partner_id) : '')
      setCategory(rule.category || '')
      setShowCondition(!!(rule.condition_field))
      setConditionField(rule.condition_field || '')
      setConditionOp(rule.condition_op || 'eq')
      setConditionValue(rule.condition_value || '')
      setActionType(rule.action_type ?? 'notify_operator')
      setActionConfigRaw(rule.action_config ? JSON.stringify(rule.action_config, null, 2) : '{}')
      setIdempotencyKey(rule.idempotency_key || '')
      setSortOrder(rule.sort_order ?? 0)
      setIsActive(rule.is_active !== false)
    }
  }, [rule])

  const buildClockSource = (): SlaClockSource => {
    if (clockSourceBase === 'custom_field') {
      return `custom_field:${clockSourceCustomField.trim()}` as SlaClockSource
    }
    return clockSourceBase as SlaClockSource
  }

  const validateActionConfig = (): Record<string, unknown> | null => {
    try {
      return JSON.parse(actionConfigRaw)
    } catch {
      setActionConfigError('Neplatný JSON formát')
      return null
    }
  }

  const handleSave = async () => {
    if (!name.trim()) { setSaveError('Zadajte názov pravidla'); return }
    if (clockSourceBase === 'custom_field' && !clockSourceCustomField.trim()) {
      setSaveError('Zadajte názov custom fieldu pre zdroj času')
      return
    }
    const parsedConfig = validateActionConfig()
    if (parsedConfig === null) { setSaveError('Opravte JSON v konfigurácii akcie'); return }
    setSaveError('')
    setActionConfigError('')
    setSaving(true)

    const payload = {
      name: name.trim(),
      crm_step: Number(crmStep),
      deadline_hours: Number(deadlineHours),
      clock_source: buildClockSource(),
      priority,
      partner_id: partnerId ? Number(partnerId) : null,
      category: category.trim() || null,
      condition_field: showCondition && conditionField.trim() ? conditionField.trim() : null,
      condition_op: showCondition && conditionField.trim() ? conditionOp : null,
      condition_value: showCondition && conditionField.trim() && !['is_empty', 'is_not_empty'].includes(conditionOp) ? conditionValue.trim() || null : null,
      action_type: actionType,
      action_config: parsedConfig,
      idempotency_key: idempotencyKey.trim() || null,
      is_active: isActive,
      sort_order: Number(sortOrder),
    }

    try {
      const res = await fetch(
        isNew ? '/api/admin/sla-rules' : `/api/admin/sla-rules/${rule!.id}`,
        {
          method: isNew ? 'POST' : 'PATCH',
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
      const res = await fetch(`/api/admin/sla-rules/${rule.id}`, { method: 'DELETE' })
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

  const deadlineDays = deadlineHours >= 24 ? ` (${(deadlineHours / 24).toFixed(deadlineHours % 24 === 0 ? 0 : 1)} dní)` : ''

  return (
    <div style={{ maxWidth: '820px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            {isNew ? 'Nové SLA pravidlo' : 'Upraviť SLA pravidlo'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#4B5563' }}>
            Nakonfigurujte deadline, zdroj času a akciu pri porušení SLA
          </p>
        </div>
        <button onClick={onCancel} style={{ ...btnBase, background: '#F3F4F6', color: '#374151' }}>
          Zrušiť
        </button>
      </div>

      {/* Section 1 — Basic info */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827', marginBottom: '14px' }}>
          Základné informácie
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Názov pravidla *</label>
            <input
              style={inputStyle}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Napr. Nereagovanie v dispatching do 4h"
            />
          </div>
          <div>
            <label style={labelStyle}>CRM Krok *</label>
            <select style={inputStyle} value={crmStep} onChange={e => setCrmStep(Number(e.target.value))}>
              {Object.entries(CRM_STEP_LABELS).map(([step, label]) => (
                <option key={step} value={step}>
                  {String(step).padStart(2, '0')} — {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Priorita</label>
            <select style={inputStyle} value={priority} onChange={e => setPriority(e.target.value as SlaPriority)}>
              {(Object.keys(PRIORITY_LABELS) as SlaPriority[]).map(p => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Partner (poisťovňa)</label>
            <select style={inputStyle} value={partnerId} onChange={e => setPartnerId(e.target.value)}>
              <option value="">Všetci partneri</option>
              {partners.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Kategória (voliteľné)</label>
            <input
              style={inputStyle}
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Napr. water_damage, locksmith"
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

      {/* Section 2 — Deadline + Clock source */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827', marginBottom: '14px' }}>
          Deadline a zdroj času
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Deadline (hodiny) *</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                style={{ ...inputStyle, width: '100px' }}
                type="number"
                min={1}
                value={deadlineHours}
                onChange={e => setDeadlineHours(Number(e.target.value))}
              />
              <span style={{ fontSize: '13px', color: '#6B7280' }}>
                hodín{deadlineDays}
              </span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Zdroj času *</label>
            <select
              style={inputStyle}
              value={clockSourceBase}
              onChange={e => setClockSourceBase(e.target.value)}
            >
              {CLOCK_SOURCE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {clockSourceBase === 'custom_field' && (
            <div>
              <label style={labelStyle}>Názov custom fieldu *</label>
              <input
                style={inputStyle}
                value={clockSourceCustomField}
                onChange={e => setClockSourceCustomField(e.target.value)}
                placeholder="Napr. scheduled_arrival_time"
              />
            </div>
          )}
        </div>
      </div>

      {/* Section 3 — Condition (collapsible) */}
      <div style={sectionStyle}>
        <div
          style={{ fontWeight: 700, fontSize: '13px', color: '#111827', marginBottom: showCondition ? '14px' : 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setShowCondition(v => !v)}
        >
          <span style={{ fontSize: '12px', color: '#6B7280' }}>{showCondition ? '▼' : '▶'}</span>
          Podmienka (voliteľné)
          {!showCondition && (
            <span style={{ fontSize: '11px', fontWeight: 400, color: '#6B7280' }}>
              — pravidlo sa spustí pre všetky zákazky v danom kroku
            </span>
          )}
        </div>
        {showCondition && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Pole zákazky</label>
              <input
                style={inputStyle}
                value={conditionField}
                onChange={e => setConditionField(e.target.value)}
                placeholder="Napr. partner_id, urgency"
              />
            </div>
            <div>
              <label style={labelStyle}>Operátor</label>
              <select style={inputStyle} value={conditionOp} onChange={e => setConditionOp(e.target.value)}>
                {CONDITION_OP_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {!['is_empty', 'is_not_empty'].includes(conditionOp) && (
              <div>
                <label style={labelStyle}>Hodnota</label>
                <input
                  style={inputStyle}
                  value={conditionValue}
                  onChange={e => setConditionValue(e.target.value)}
                  placeholder="Napr. 2, acute, water_damage"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 4 — Action */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827', marginBottom: '14px' }}>
          Typ akcie a konfigurácia
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Typ akcie *</label>
            <select
              style={inputStyle}
              value={actionType}
              onChange={e => {
                const newType = e.target.value as SlaActionType
                setActionType(newType)
                setActionConfigRaw(ACTION_CONFIG_HINTS[newType] || '{}')
                setActionConfigError('')
              }}
            >
              {(Object.keys(ACTION_LABELS) as SlaActionType[]).map(a => (
                <option key={a} value={a}>{ACTION_LABELS[a]}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Poradie (sort_order)</label>
            <input
              style={inputStyle}
              type="number"
              value={sortOrder}
              onChange={e => setSortOrder(Number(e.target.value))}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Konfigurácia akcie (JSON)</label>
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px' }}>
              Príklad pre <strong>{ACTION_LABELS[actionType]}</strong>: <code style={{ background: '#F3F4F6', padding: '1px 4px', borderRadius: '3px' }}>{ACTION_CONFIG_HINTS[actionType]}</code>
            </div>
            <textarea
              style={{
                ...inputStyle,
                minHeight: '90px',
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
              value={actionConfigRaw}
              onChange={e => { setActionConfigRaw(e.target.value); setActionConfigError('') }}
              spellCheck={false}
            />
            {actionConfigError && (
              <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px' }}>{actionConfigError}</div>
            )}
          </div>
        </div>
      </div>

      {/* Section 5 — Advanced */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827', marginBottom: '14px' }}>
          Pokročilé nastavenia
        </div>
        <div>
          <label style={labelStyle}>
            Idempotency kľúč
            <span
              title="Ak je nastavený, tá istá akcia pre tú istú zákazku a kľúč sa nevykoná opakovane. Napr. 'sla_dispatching_4h'"
              style={{ marginLeft: '6px', cursor: 'help', color: '#6B7280', fontSize: '11px', fontWeight: 400 }}
            >
              ⓘ (čo je to?)
            </span>
          </label>
          <input
            style={{ ...inputStyle, maxWidth: '400px' }}
            value={idempotencyKey}
            onChange={e => setIdempotencyKey(e.target.value)}
            placeholder="Napr. sla_dispatching_4h_notify"
          />
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
            Zabraňuje duplicitnému spusteniu — rovnaký kľúč pre rovnakú zákazku sa spustí len raz.
          </div>
        </div>
      </div>

      {/* Error */}
      {saveError && (
        <div style={{
          padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: '6px', color: '#DC2626', fontSize: '13px', marginBottom: '12px',
        }}>
          {saveError}
        </div>
      )}

      {/* Save bar */}
      <div style={{
        display: 'flex', gap: '8px', justifyContent: 'space-between', flexWrap: 'wrap',
        paddingTop: '12px', borderTop: '1px solid #E5E7EB',
        position: 'sticky', bottom: 0,
        background: 'var(--bg-primary, #FAFAF7)', padding: '12px 0', zIndex: 5,
      }}>
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
              ...btnBase, background: '#bf953f', color: '#fff',
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
