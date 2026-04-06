'use client'

import React, { useState, useEffect, useCallback } from 'react'
import type { AutomationRule, TriggerType } from '@/types/automation'
import { TRIGGER_LABELS } from '@/types/automation'

interface Props {
  onEdit: (rule: AutomationRule) => void
  onNewRule: () => void
  refreshTrigger: number
}

export default function AutomationRuleList({ onEdit, onNewRule, refreshTrigger }: Props) {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTrigger, setFilterTrigger] = useState<TriggerType | ''>('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchRules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/automations')
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

  const handleToggleActive = async (rule: AutomationRule, e: React.MouseEvent) => {
    e.stopPropagation()
    setTogglingId(rule.id)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/automations/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive }),
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
      const res = await fetch(`/api/admin/automations/${ruleId}`, { method: 'DELETE' })
      if (res.ok) {
        setRules(prev => prev.filter(r => r.id !== ruleId))
      } else {
        const err = await res.json().catch(() => ({}))
        setActionError(err.error || 'Vymazanie pravidla sa nepodarilo')
      }
    } catch {
      setActionError('Chyba siete pri vymazaní pravidla')
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const filtered = rules.filter(r => {
    const matchSearch = !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(search.toLowerCase())
    const matchTrigger = !filterTrigger || r.triggerType === filterTrigger
    return matchSearch && matchTrigger
  })

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px',
    fontSize: '13px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontFamily: "'Montserrat', sans-serif",
    background: '#fff',
    color: '#111827',
  }

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
          style={{ ...inputStyle, minWidth: '180px' }}
          value={filterTrigger}
          onChange={e => setFilterTrigger(e.target.value as TriggerType | '')}
        >
          <option value="">Všetky triggery</option>
          {(Object.keys(TRIGGER_LABELS) as TriggerType[]).map(t => (
            <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
          ))}
        </select>
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

      {/* Action error banner */}
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
            aria-label="Zavrieť"
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
          textAlign: 'center',
          padding: '48px 24px',
          color: '#4B5563',
          fontSize: '14px',
          border: '2px dashed #D1D5DB',
          borderRadius: '8px',
        }}>
          {rules.length === 0
            ? 'Zatiaľ nemáte žiadne automatizácie. Vytvorte prvé pravidlo.'
            : 'Žiadne pravidlá nezodpovedajú filtru.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="automation-rule-list">
            <thead>
              <tr>
                <th>Názov</th>
                <th>Trigger</th>
                <th>Aktívne</th>
                <th>Spustení</th>
                <th>Posledné</th>
                <th>Chyba</th>
                <th>Akcie</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(rule => (
                <tr
                  key={rule.id}
                  className={rule.lastError ? 'has-error' : ''}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onEdit(rule)}
                >
                  <td>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>
                      {rule.name}
                    </div>
                    {rule.description && (
                      <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '1px' }}>
                        {rule.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: '#F3F4F6',
                      color: '#374151',
                    }}>
                      {TRIGGER_LABELS[rule.triggerType]}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    {/* Toggle switch */}
                    <button
                      onClick={e => handleToggleActive(rule, e)}
                      disabled={togglingId === rule.id}
                      style={{
                        width: '40px',
                        height: '22px',
                        borderRadius: '11px',
                        border: 'none',
                        cursor: togglingId === rule.id ? 'not-allowed' : 'pointer',
                        background: rule.isActive ? '#22c55e' : '#D1D5DB',
                        position: 'relative',
                        transition: 'background 0.2s',
                        opacity: togglingId === rule.id ? 0.6 : 1,
                        flexShrink: 0,
                      }}
                      title={rule.isActive ? 'Kliknite pre deaktiváciu' : 'Kliknite pre aktiváciu'}
                    >
                      <span style={{
                        position: 'absolute',
                        top: '3px',
                        left: rule.isActive ? '21px' : '3px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#fff',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </button>
                  </td>
                  <td style={{ color: '#374151', fontWeight: 500 }}>
                    {rule.runCount}
                  </td>
                  <td style={{ color: '#4B5563', fontSize: '13px' }}>
                    {rule.lastRunAt
                      ? new Date(rule.lastRunAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td>
                    {rule.lastError ? (
                      <span
                        title={rule.lastError}
                        style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#DC2626',
                          cursor: 'help',
                        }}
                      />
                    ) : (
                      <span style={{ color: '#9CA3AF' }}>—</span>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => onEdit(rule)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '15px',
                          padding: '4px',
                          borderRadius: '4px',
                          color: '#4B5563',
                        }}
                        title="Upraviť"
                      >
                        ✏️
                      </button>
                      {confirmDeleteId === rule.id ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => handleDeleteConfirm(rule.id)}
                            disabled={deletingId === rule.id}
                            style={{
                              background: '#DC2626',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {deletingId === rule.id ? '...' : 'Zmazať'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            style={{
                              background: '#F3F4F6',
                              color: '#374151',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            Zrušiť
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={e => handleDeleteClick(e, rule.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '15px',
                            padding: '4px',
                            borderRadius: '4px',
                            color: '#4B5563',
                          }}
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
