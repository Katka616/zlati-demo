'use client'

/**
 * OperatorAssignmentWidget
 *
 * Shows which operator is assigned to a job and allows reassignment.
 * Displays a badge with operator initials, name and open-job count.
 * Clicking the badge opens a dropdown with:
 *   - Search input
 *   - "Automatické priradenie" button
 *   - Ranked list of operators with affinity scores
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { OperatorMatchResult } from '@/lib/operatorMatching'

// ── Types ─────────────────────────────────────────────────────────

interface OperatorAssignmentWidgetProps {
  jobId: number
  currentOperatorId: number | null
  currentOperatorName: string | null
  onAssigned: (operatorId: number, operatorName: string) => void
}

// ── Helpers ───────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function scoreColor(score: number): string {
  if (score >= 70) return 'var(--success)'
  if (score >= 40) return '#3B82F6'
  return 'var(--warning, #F59E0B)'
}

// ── Component ─────────────────────────────────────────────────────

export default function OperatorAssignmentWidget({
  jobId,
  currentOperatorId,
  currentOperatorName,
  onAssigned,
}: OperatorAssignmentWidgetProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoLoading, setAutoLoading] = useState(false)
  const [matches, setMatches] = useState<OperatorMatchResult[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Fetch matches when dropdown opens
  const fetchMatches = useCallback(async () => {
    setFetchError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/operator-matches`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMatches(data.matches ?? [])
    } catch (err) {
      setFetchError('Nepodarilo sa načítať operátorov.')
    } finally {
      setLoading(false)
    }
  }, [jobId])

  const handleOpen = () => {
    setOpen((v) => {
      if (!v) fetchMatches()
      return !v
    })
    setSearch('')
  }

  // Manual assign
  const handleSelectOperator = async (match: OperatorMatchResult) => {
    setOpen(false)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/assign-operator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator_id: match.operatorId }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error('Assign operator failed:', err)
        return
      }
      onAssigned(match.operatorId, match.operatorName)
    } catch (err) {
      console.error('Assign operator error:', err)
    }
  }

  // Auto assign
  const handleAutoAssign = async () => {
    setAutoLoading(true)
    setOpen(false)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/assign-operator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto: true }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error('Auto-assign failed:', err)
        return
      }
      const data = await res.json()
      if (data.operator) {
        onAssigned(data.operator.id, data.operator.name)
      }
    } catch (err) {
      console.error('Auto-assign error:', err)
    } finally {
      setAutoLoading(false)
    }
  }

  const filtered = matches.filter((m) =>
    m.operatorName.toLowerCase().includes(search.toLowerCase())
  )

  // ── Badge ────────────────────────────────────────────────────────
  const badge = currentOperatorName ? (
    <button
      onClick={handleOpen}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 10px 4px 4px',
        borderRadius: 20,
        border: '1.5px solid var(--g3, #E5E7EB)',
        background: 'var(--surface, #fff)',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--dark, #111827)',
        transition: 'border-color 0.15s',
      }}
      title="Zmeniť operátora"
    >
      {/* Initials circle */}
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'var(--gold, #C9A84C)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {getInitials(currentOperatorName)}
      </span>
      <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {currentOperatorName}
      </span>
      <span style={{ fontSize: 11, color: 'var(--g5, #9CA3AF)', marginLeft: 2 }}>▾</span>
    </button>
  ) : (
    <button
      onClick={handleOpen}
      disabled={autoLoading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 20,
        border: '1.5px solid var(--warning, #F59E0B)',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--warning, #D97706)',
        transition: 'background 0.15s',
      }}
      title="Priradiť operátora"
    >
      {autoLoading ? 'Priraďujem…' : '+ Priradiť'}
    </button>
  )

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
      {badge}

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            left: 0,
            zIndex: 200,
            background: 'var(--surface, #fff)',
            border: '1.5px solid var(--g3, #E5E7EB)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            width: 300,
            overflow: 'hidden',
          }}
        >
          {/* Search */}
          <div style={{ padding: '10px 12px 6px' }}>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hľadať operátora…"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '6px 10px',
                borderRadius: 8,
                border: '1.5px solid var(--g3, #E5E7EB)',
                fontSize: 13,
                color: 'var(--dark, #111827)',
                background: 'var(--bg-secondary, #F9FAFB)',
                outline: 'none',
              }}
            />
          </div>

          {/* Auto-assign button */}
          <div style={{ padding: '4px 12px 8px' }}>
            <button
              onClick={handleAutoAssign}
              style={{
                width: '100%',
                padding: '7px 0',
                borderRadius: 8,
                border: 'none',
                background: 'var(--gold, #C9A84C)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <span>AI</span>
              <span>Automatické priradenie</span>
            </button>
          </div>

          <hr style={{ margin: 0, borderColor: 'var(--g2, #F3F4F6)' }} />

          {/* Operator list */}
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {loading && (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--g5, #9CA3AF)', fontSize: 13 }}>
                Načítavam…
              </div>
            )}
            {fetchError && (
              <div style={{ padding: '12px', color: 'var(--danger, #EF4444)', fontSize: 13 }}>
                {fetchError}
              </div>
            )}
            {!loading && !fetchError && filtered.length === 0 && (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--g5, #9CA3AF)', fontSize: 13 }}>
                Žiadni operátori
              </div>
            )}
            {!loading &&
              filtered.map((match) => (
                <button
                  key={match.operatorId}
                  onClick={() => handleSelectOperator(match)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    border: 'none',
                    background: match.operatorId === currentOperatorId
                      ? 'var(--g1, #F9FAFB)'
                      : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (match.operatorId !== currentOperatorId) {
                      e.currentTarget.style.background = 'var(--g1, #F9FAFB)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (match.operatorId !== currentOperatorId) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  {/* Initials */}
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: 'var(--g2, #F3F4F6)',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--dark, #111827)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(match.operatorName)}
                  </span>

                  {/* Name + explanation */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--dark, #111827)' }}>
                      {match.operatorName}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--g4, #6B7280)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {match.explanation || `${match.openJobCount} zákaziek`}
                    </div>
                  </div>

                  {/* Score badge */}
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: scoreColor(match.totalScore),
                      minWidth: 32,
                      textAlign: 'right',
                    }}
                  >
                    {match.totalScore}%
                  </span>
                </button>
              ))}
          </div>

          {/* Legend */}
          {!loading && filtered.length > 0 && (
            <div
              style={{
                padding: '6px 12px 8px',
                borderTop: '1px solid var(--g2, #F3F4F6)',
                display: 'flex',
                gap: 12,
                fontSize: 11,
                color: 'var(--g4, #6B7280)',
              }}
            >
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>● ≥70%</span>
              <span style={{ color: '#3B82F6', fontWeight: 600 }}>● 40–70%</span>
              <span style={{ color: 'var(--warning, #F59E0B)', fontWeight: 600 }}>● &lt;40%</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
