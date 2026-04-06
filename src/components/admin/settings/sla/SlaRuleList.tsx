'use client'

import React, { useState, useEffect, useCallback } from 'react'
import type { SlaRule, SlaActionType } from '@/types/sla'

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
  auto_advance: 'Auto-posun',
  auto_approve: 'Auto-schválenie',
  email_partner: 'Email poisťovni',
  create_reminder: 'Pripomienka',
}

function formatDeadline(hours: number): string {
  if (hours >= 24 && hours % 24 === 0) return `${hours / 24}d`
  if (hours >= 24) return `${hours}h (${(hours / 24).toFixed(1)}d)`
  return `${hours}h`
}

function formatStepLabel(step: number): string {
  const label = CRM_STEP_LABELS[step] ?? `Krok ${step}`
  return `${String(step).padStart(2, '0')} — ${label}`
}

interface Props {
  onEdit: (rule: SlaRule) => void
  onNewRule: () => void
  refreshTrigger: number
}

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  fontSize: '13px',
  border: '1px solid #D1D5DB',
  borderRadius: '6px',
  fontFamily: "'Montserrat', sans-serif",
  background: '#fff',
  color: '#111827',
}

export default function SlaRuleList({ onEdit, onNewRule, refreshTrigger }: Props) {
  const [rules, setRules] = useState<SlaRule[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStep, setFilterStep] = useState<string>('')
  const [filterAction, setFilterAction] = useState<string>('')
  const [activeOnly, setActiveOnly] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchRules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/sla-rules')
      if (res.ok) {
        const data = await res.json()
        setRules(data.rules || [])
        setActionError(null)
      } else {
        setActionError('Načítanie pravidiel sa nepodarilo')
      }
    } catch {
      setActionError('Chyba siete pri načítaní pravidiel')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRules() }, [fetchRules, refreshTrigger])

  const handleToggleActive = async (rule: SlaRule, e: React.MouseEvent) => {
    e.stopPropagation()
    setTogglingId(rule.id)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/sla-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active }),
      })
      if (res.ok) {
        await fetchRules()
      } else {
        const err = await res.json().catch(() => ({}))
        setActionError(err.error || 'Zmena stavu pravidla sa nepodarila')
      }
    } catch {
      setActionError('Chyba siete pri zmene stavu pravidla')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, ruleId: number) => {
    e.stopPropagation()
    setConfirmDeleteId(ruleId)
  }

  const handleDeleteConfirm = async (ruleId: number) => {
    setDeletingId(ruleId)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/sla-rules/${ruleId}`, { method: 'DELETE' })
      if (res.ok) {
        setRules(prev => prev.filter(r => r.id !== ruleId))
        setConfirmDeleteId(null)
      } else {
        const err = await res.json().catch(() => ({}))
        setActionError(err.error || 'Vymazanie pravidla sa nepodarilo')
      }
    } catch {
      setActionError('Chyba siete pri vymazaní pravidla')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = rules.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase())
    const matchStep = !filterStep || String(r.crm_step) === filterStep
    const matchAction = !filterAction || r.action_type === filterAction
    const matchActive = !activeOnly || r.is_active
    return matchSearch && matchStep && matchAction && matchActive
  })

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...inputStyle, flex: 1, minWidth: '160px' }}
          placeholder="Hľadať pravidlo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{ ...inputStyle, minWidth: '160px' }}
          value={filterStep}
          onChange={e => setFilterStep(e.target.value)}
        >
          <option value="">Všetky kroky</option>
          {Object.entries(CRM_STEP_LABELS).map(([step, label]) => (
            <option key={step} value={step}>{String(step).padStart(2, '0')} — {label}</option>
          ))}
        </select>
        <select
          style={{ ...inputStyle, minWidth: '160px' }}
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
        >
          <option value="">Všetky akcie</option>
          {(Object.keys(ACTION_LABELS) as SlaActionType[]).map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a]}</option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={e => setActiveOnly(e.target.checked)}
          />
          Len aktívne
        </label>
        <button
          onClick={onNewRule}
          style={{
            background: '#bf953f',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + Nové pravidlo
        </button>
      </div>

      {/* Error banner */}
      {actionError && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, marginBottom: 12, padding: '10px 14px',
          background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 8, fontSize: 13, color: '#DC2626', fontWeight: 500,
        }}>
          <span>⚠ {actionError}</span>
          <button
            onClick={() => setActionError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#DC2626', opacity: 0.7, padding: 0, lineHeight: 1 }}
          >✕</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#4B5563', fontSize: '14px' }}>
          Načítavam...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px', color: '#4B5563', fontSize: '14px',
          border: '2px dashed #D1D5DB', borderRadius: '8px',
        }}>
          {rules.length === 0
            ? 'Zatiaľ nemáte žiadne SLA pravidlá. Vytvorte prvé pravidlo.'
            : 'Žiadne pravidlá nezodpovedajú filtru.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {['Názov', 'Krok', 'Deadline', 'Zdroj času', 'Akcia', 'Aktívne', 'Upraviť'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 8px', fontWeight: 700,
                    fontSize: '11px', color: '#6B7280', textTransform: 'uppercase',
                    letterSpacing: '0.5px', borderBottom: '2px solid #E5E7EB',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(rule => (
                <tr
                  key={rule.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onEdit(rule)}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{rule.name}</div>
                    {rule.category && (
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                        Kategória: {rule.category}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                      fontSize: '11px', fontWeight: 600, background: '#F3F4F6', color: '#374151',
                      whiteSpace: 'nowrap',
                    }}>
                      {formatStepLabel(rule.crm_step)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #F3F4F6', color: '#111827', fontWeight: 600 }}>
                    {formatDeadline(rule.deadline_hours)}
                  </td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #F3F4F6', color: '#4B5563', fontSize: '12px' }}>
                    {rule.clock_source === 'crm_step_entered_at' && 'Vstup do kroku'}
                    {rule.clock_source === 'updated_at' && 'Posledná zmena'}
                    {rule.clock_source === 'created_at' && 'Vytvorenie'}
                    {rule.clock_source?.startsWith('custom_field:') && `CF: ${rule.clock_source.replace('custom_field:', '')}`}
                  </td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
                      fontSize: '11px', fontWeight: 600,
                      background: 'rgba(191,149,63,0.12)', color: '#92400E',
                    }}>
                      {ACTION_LABELS[rule.action_type] ?? rule.action_type}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #F3F4F6' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => handleToggleActive(rule, e)}
                      disabled={togglingId === rule.id}
                      title={rule.is_active ? 'Kliknite pre deaktiváciu' : 'Kliknite pre aktiváciu'}
                      style={{
                        width: '40px', height: '22px', borderRadius: '11px', border: 'none',
                        cursor: togglingId === rule.id ? 'not-allowed' : 'pointer',
                        background: rule.is_active ? '#22c55e' : '#D1D5DB',
                        position: 'relative', transition: 'background 0.2s',
                        opacity: togglingId === rule.id ? 0.6 : 1, flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: '3px',
                        left: rule.is_active ? '21px' : '3px',
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: '#fff', transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </button>
                  </td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #F3F4F6' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => onEdit(rule)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', padding: '4px', borderRadius: '4px', color: '#4B5563' }}
                        title="Upraviť"
                      >
                        ✏️
                      </button>
                      {confirmDeleteId === rule.id ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#374151' }}>Naozaj?</span>
                          <button
                            onClick={() => handleDeleteConfirm(rule.id)}
                            disabled={deletingId === rule.id}
                            style={{
                              background: '#DC2626', color: '#fff', border: 'none',
                              borderRadius: '4px', padding: '3px 8px', fontSize: '11px',
                              fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            {deletingId === rule.id ? '...' : 'Áno'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            style={{
                              background: '#F3F4F6', color: '#374151', border: 'none',
                              borderRadius: '4px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer',
                            }}
                          >
                            Nie
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={e => handleDeleteClick(e, rule.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', padding: '4px', borderRadius: '4px', color: '#4B5563' }}
                          title="Zmazať"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
