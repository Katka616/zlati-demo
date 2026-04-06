'use client'

import React, { useState, useEffect, useRef } from 'react'
import type { AutomationLogEntry } from '@/types/automation'

interface Props {
  onClose: () => void
}

const LIMIT = 50

export default function AutomationLogPanel({ onClose }: Props) {
  const [entries, setEntries] = useState<AutomationLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [filterRuleId, setFilterRuleId] = useState('')
  const [filterJobId, setFilterJobId] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const currentOffset = useRef(0)

  const fetchLog = async (reset: boolean, ruleId: string, jobId: string) => {
    setLoading(true)
    if (reset) setFetchError(null)
    const off = reset ? 0 : currentOffset.current
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) })
      if (ruleId) params.set('ruleId', ruleId)
      if (jobId) params.set('jobId', jobId)
      const res = await fetch(`/api/admin/automations/log?${params}`)
      if (res.ok) {
        const data = await res.json()
        const newEntries: AutomationLogEntry[] = data.entries || []
        if (reset) {
          setEntries(newEntries)
          currentOffset.current = newEntries.length
        } else {
          setEntries(prev => [...prev, ...newEntries])
          currentOffset.current += newEntries.length
        }
        setHasMore(newEntries.length === LIMIT)
        setFetchError(null)
      } else {
        setFetchError('Nepodarilo sa načítať log automatizácií.')
      }
    } catch {
      setFetchError('Chyba siete pri načítaní logu.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    currentOffset.current = 0
    fetchLog(true, filterRuleId, filterJobId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRuleId, filterJobId])

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
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #E5E7EB',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: '#111827' }}>Log spustení automatizácií</div>
            <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '2px' }}>Posledných {LIMIT} záznamov</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6B7280', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', padding: '12px 20px', borderBottom: '1px solid #F3F4F6', flexWrap: 'wrap' }}>
          <input
            style={{ ...inputStyle, width: '140px' }}
            type="number"
            placeholder="ID pravidla"
            value={filterRuleId}
            onChange={e => setFilterRuleId(e.target.value)}
          />
          <input
            style={{ ...inputStyle, width: '140px' }}
            type="number"
            placeholder="ID zákazky"
            value={filterJobId}
            onChange={e => setFilterJobId(e.target.value)}
          />
          {(filterRuleId || filterJobId) && (
            <button
              onClick={() => { setFilterRuleId(''); setFilterJobId('') }}
              style={{ ...inputStyle, cursor: 'pointer', background: '#F3F4F6', border: 'none', fontSize: '12px', color: '#374151' }}
            >
              Zrušiť filtre
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {fetchError && (
            <div style={{
              margin: '12px 0',
              padding: '10px 14px',
              background: '#FFEBEE',
              borderLeft: '4px solid #F44336',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#B71C1C',
              fontWeight: 500,
            }}>
              ⚠️ {fetchError}
            </div>
          )}
          {loading && entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#4B5563', fontSize: '14px' }}>
              Načítavam...
            </div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#4B5563', fontSize: '14px' }}>
              Žiadne záznamy.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Čas', 'Pravidlo', 'Zákazka', 'Podmienky', 'Akcie', 'Chyba'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left',
                      padding: '10px 8px',
                      fontWeight: 700,
                      fontSize: '11px',
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: '2px solid #E5E7EB',
                      position: 'sticky',
                      top: 0,
                      background: '#fff',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => {
                  const hasError = Boolean(entry.error)
                  const successCount = entry.actionsRun.filter(a => a.success).length
                  const failCount = entry.actionsRun.length - successCount

                  return (
                    <tr
                      key={entry.id}
                      style={{
                        background: hasError ? 'rgba(239,68,68,0.04)' : entry.conditionsMet ? 'rgba(34,197,94,0.03)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '8px', color: '#374151', whiteSpace: 'nowrap', borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ fontWeight: 500 }}>
                          {new Date(entry.createdAt).toLocaleDateString('sk-SK')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>
                          {new Date(entry.createdAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>
                          {entry.ruleName || `Pravidlo #${entry.ruleId}`}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>#{entry.ruleId}</div>
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #F3F4F6' }}>
                        {entry.jobId ? (
                          <span style={{ color: '#2563EB', fontWeight: 500 }}>#{entry.jobId}</span>
                        ) : (
                          <span style={{ color: '#4B5563' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #F3F4F6' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: entry.conditionsMet ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                          color: entry.conditionsMet ? '#15803d' : '#DC2626',
                        }}>
                          {entry.conditionsMet ? 'Splnené' : 'Nesplnené'}
                        </span>
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ fontSize: '12px' }}>
                          {entry.actionsRun.length === 0 ? (
                            <span style={{ color: '#4B5563' }}>—</span>
                          ) : (
                            <div>
                              {successCount > 0 && (
                                <span style={{ color: '#15803d', fontWeight: 600 }}>✓ {successCount}</span>
                              )}
                              {failCount > 0 && (
                                <span style={{ color: '#DC2626', fontWeight: 600, marginLeft: '6px' }}>✗ {failCount}</span>
                              )}
                              <div style={{ color: '#6B7280', marginTop: '2px', fontSize: '11px' }}>
                                {entry.actionsRun.map(a => a.type).join(', ')}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #F3F4F6' }}>
                        {entry.error ? (
                          <span
                            title={entry.error}
                            style={{
                              display: 'inline-block',
                              maxWidth: '180px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: '#DC2626',
                              fontSize: '12px',
                              cursor: 'help',
                            }}
                          >
                            {entry.error}
                          </span>
                        ) : (
                          <span style={{ color: '#4B5563' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* Load more */}
          {hasMore && !loading && (
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <button
                onClick={() => fetchLog(false, filterRuleId, filterJobId)}
                style={{
                  background: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Načítať ďalšie
              </button>
            </div>
          )}

          {loading && entries.length > 0 && (
            <div style={{ textAlign: 'center', padding: '12px', color: '#4B5563', fontSize: '13px' }}>
              Načítavam...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
