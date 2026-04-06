'use client'

import { useState, useEffect, useCallback } from 'react'
import type { InvoiceGateResult, InvoiceGateCheck } from '@/types/invoiceGate'

interface Props {
  jobId: number
  onGatePass: (pass: boolean) => void
  /** Ak je nastavené, renderuje len checks s danými ID */
  filterIds?: string[]
  /** Skryje nadpis sekcie */
  hideHeader?: boolean
  /** Skryje override tlačidlo a pending info */
  hideOverride?: boolean
}

export function CpInvoiceGateChecklist({ jobId, onGatePass, filterIds, hideHeader, hideOverride }: Props) {
  const [result, setResult] = useState<InvoiceGateResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Override state
  const [showOverride, setShowOverride] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [overriding, setOverriding] = useState(false)

  const fetchGate = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/jobs/${jobId}/invoice-gate`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: InvoiceGateResult = await res.json()
      setResult(data)
      // Ak máme filterIds, počítaj allPass len z filtrovaných checks
      if (filterIds && filterIds.length > 0) {
        const filtered = data.checks.filter(c => filterIds.includes(c.id))
        const filteredPass = filtered.every(c => c.pass || c.pending) || !!data.override
        onGatePass(filteredPass)
      } else {
        onGatePass(data.allPass)
      }
    } catch (err) {
      console.error('[InvoiceGate] fetch error:', err)
      setError('Nepodarilo sa načítať overenie')
      onGatePass(false)
    } finally {
      setLoading(false)
    }
  }, [jobId, onGatePass])

  useEffect(() => { fetchGate() }, [fetchGate])

  const handleOverride = async () => {
    if (!overrideReason.trim()) return
    setOverriding(true)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/invoice-gate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: overrideReason.trim() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setShowOverride(false)
      await fetchGate()
    } catch (err) {
      console.error('[InvoiceGate] override error:', err)
      setError('Override sa nepodaril')
    } finally {
      setOverriding(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-muted, #999)' }}>
        Overujem podmienky faktúry...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '8px 12px', background: 'var(--danger-bg, #FEF2F2)', borderRadius: 8, fontSize: 13, color: 'var(--danger, #DC2626)' }}>
        {error}
      </div>
    )
  }

  if (!result) return null

  // Filtrovanie checks podľa filterIds
  const visibleChecks = filterIds
    ? result.checks.filter(c => filterIds.includes(c.id))
    : result.checks

  const hasFailures = visibleChecks.some(c => !c.pass && !c.pending)
  const hasPending = visibleChecks.some(c => c.pending)

  return (
    <div style={{
      marginTop: 12,
      padding: '12px 14px',
      background: 'var(--surface, #fff)',
      border: `1px solid ${!hasFailures && !hasPending ? 'var(--success, #16A34A)' : hasFailures ? 'var(--danger, #DC2626)' : 'var(--warning, #F59E0B)'}`,
      borderRadius: 10,
    }}>
      {!hideHeader && (
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
          Overenie pred schválením
        </div>
      )}

      {/* Override badge */}
      {result.override && (
        <div style={{
          padding: '6px 10px', marginBottom: 8, borderRadius: 6,
          background: 'var(--warning-bg, #FFFBEB)', fontSize: 11, color: 'var(--warning-text, #92400E)',
        }}>
          Manuálne schválené: {result.override.by} ({new Date(result.override.at).toLocaleDateString('sk-SK')})
          — {result.override.reason}
        </div>
      )}

      {/* Checklist rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visibleChecks.map(check => (
          <CheckRow key={check.id} check={check} />
        ))}
      </div>

      {/* Override button — only when there are hard failures and no existing override */}
      {!hideOverride && hasFailures && !result.override && (
        <div style={{ marginTop: 10 }}>
          {!showOverride ? (
            <button
              onClick={() => setShowOverride(true)}
              style={{
                fontSize: 11, color: 'var(--text-muted, #999)', background: 'none',
                border: 'none', cursor: 'pointer', textDecoration: 'underline',
                padding: 0,
              }}
            >
              Manuálne schváliť napriek chybám
            </button>
          ) : (
            <div style={{
              padding: '8px 10px', background: 'var(--danger-bg, #FEF2F2)',
              borderRadius: 8, marginTop: 4,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--danger, #DC2626)' }}>
                Dôvod schválenia:
              </div>
              <textarea
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Napíšte dôvod prečo je možné schváliť napriek chybám..."
                style={{
                  width: '100%', minHeight: 50, padding: '6px 8px', fontSize: 12,
                  borderRadius: 6, border: '1px solid var(--border, #ddd)',
                  background: 'var(--surface, #fff)', color: 'var(--text-primary)',
                  resize: 'vertical', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button
                  onClick={handleOverride}
                  disabled={!overrideReason.trim() || overriding}
                  style={{
                    fontSize: 12, padding: '5px 12px', borderRadius: 6,
                    background: 'var(--danger, #DC2626)', color: '#fff', border: 'none',
                    cursor: overrideReason.trim() && !overriding ? 'pointer' : 'not-allowed',
                    opacity: overrideReason.trim() && !overriding ? 1 : 0.5,
                    fontWeight: 600,
                  }}
                >
                  {overriding ? 'Ukladám...' : 'Potvrdiť override'}
                </button>
                <button
                  onClick={() => { setShowOverride(false); setOverrideReason('') }}
                  style={{
                    fontSize: 12, padding: '5px 12px', borderRadius: 6,
                    background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  Zrušiť
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending info */}
      {!hideOverride && hasPending && !result.override && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--warning-text, #92400E)' }}>
          Niektoré kontroly čakajú na dáta — schválenie bude možné po ich doplnení.
        </div>
      )}
    </div>
  )
}

function CheckRow({ check }: { check: InvoiceGateCheck }) {
  const icon = check.pending ? '⏳' : check.pass ? '✓' : '✗'
  const color = check.pending
    ? 'var(--warning, #F59E0B)'
    : check.pass
      ? 'var(--success, #16A34A)'
      : 'var(--danger, #DC2626)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 0', fontSize: 12,
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, flexShrink: 0,
        background: check.pending ? 'var(--warning-bg, #FFFBEB)' : check.pass ? 'var(--success-bg, #f0fdf4)' : 'var(--danger-bg, #FEF2F2)',
        color,
      }}>
        {icon}
      </span>
      <span style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: 0 }}>
        {check.label}
      </span>
      <span style={{
        color: check.pass ? 'var(--text-muted, #999)' : color,
        fontSize: 11, marginLeft: 'auto', textAlign: 'right', flexShrink: 0,
      }}>
        {check.detail}
      </span>
    </div>
  )
}
