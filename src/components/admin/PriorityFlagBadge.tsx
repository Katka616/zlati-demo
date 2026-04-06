'use client'

import { useState, useRef, useEffect } from 'react'
import { PRIORITY_FLAGS, PRIORITY_FLAG_CONFIG, type PriorityFlag } from '@/lib/constants'

interface PriorityFlagBadgeProps {
  jobId: number
  currentFlag: PriorityFlag | null
  onFlagChanged?: (newFlag: PriorityFlag | null) => void
  readOnly?: boolean
}

export default function PriorityFlagBadge({ jobId, currentFlag, onFlagChanged, readOnly }: PriorityFlagBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  // Local optimistic state so the badge updates instantly without waiting for parent reload
  const [localFlag, setLocalFlag] = useState<PriorityFlag | null>(currentFlag)
  const ref = useRef<HTMLDivElement>(null)

  // Sync local state when parent prop changes (e.g. after full job reload)
  useEffect(() => {
    setLocalFlag(currentFlag)
  }, [currentFlag])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const handleSetFlag = async (flag: PriorityFlag | null) => {
    const previousFlag = localFlag
    // Optimistic update — change the badge immediately
    setLocalFlag(flag)
    setIsUpdating(true)
    setIsOpen(false)
    try {
      const res = await fetch(`/api/jobs/${jobId}/priority`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag }),
      })
      const data = await res.json()
      if (data.success) {
        onFlagChanged?.(flag)
      } else {
        // Revert on failure
        setLocalFlag(previousFlag)
      }
    } catch (err) {
      // Revert on network error
      console.warn('[Priority] Failed to update:', err)
      setLocalFlag(previousFlag)
    } finally {
      setIsUpdating(false)
    }
  }

  if (!localFlag && readOnly) return null

  const config = localFlag ? PRIORITY_FLAG_CONFIG[localFlag] : null

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Badge / trigger button */}
      <button
        onClick={() => !readOnly && setIsOpen(!isOpen)}
        disabled={isUpdating}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 8px',
          borderRadius: 6,
          border: localFlag ? 'none' : '1.5px dashed var(--g6)',
          background: config?.bg || 'var(--g9, #f5f5f5)',
          color: config?.color || 'var(--g4)',
          fontSize: 11, fontWeight: 700, cursor: readOnly ? 'default' : 'pointer',
          opacity: isUpdating ? 0.5 : 1,
          lineHeight: 1.4,
        }}
        title={readOnly ? config?.label : 'Nastaviť prioritu'}
      >
        {localFlag ? (
          <>
            <span>{config?.emoji}</span>
            <span>{config?.label}</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 13 }}>🚩</span>
            {!readOnly && <span style={{ fontSize: 10, fontWeight: 500 }}>Priorita</span>}
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: 'var(--w, #fff)', borderRadius: 10, padding: 6,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 100,
          minWidth: 160,
        }}>
          {PRIORITY_FLAGS.map(f => {
            const fc = PRIORITY_FLAG_CONFIG[f]
            return (
              <button
                key={f}
                onClick={() => handleSetFlag(localFlag === f ? null : f)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: localFlag === f ? `2px solid ${fc.bg}` : '2px solid transparent',
                  cursor: 'pointer',
                  background: localFlag === f ? fc.bg : 'transparent',
                  fontSize: 13, fontWeight: 600,
                  color: localFlag === f ? '#FFF' : 'var(--dark)',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: localFlag === f ? '#FFF' : fc.bg, flexShrink: 0,
                  border: localFlag === f ? '2px solid rgba(255,255,255,0.5)' : 'none',
                }} />
                <span>{fc.emoji} {fc.label}</span>
                {localFlag === f && <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800 }}>✓</span>}
              </button>
            )
          })}
          {localFlag && (
            <>
              <div style={{ height: 1, background: 'var(--g8)', margin: '4px 0' }} />
              <button
                onClick={() => handleSetFlag(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', background: 'transparent',
                  fontSize: 13, fontWeight: 500, color: 'var(--g4)',
                  textAlign: 'left',
                }}
              >
                Odstrániť prioritu
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
