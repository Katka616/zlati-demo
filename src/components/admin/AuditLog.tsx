'use client'

import { useState, useEffect, useCallback } from 'react'

interface AuditChange {
  field: string
  old: unknown
  new: unknown
}

interface AuditEntry {
  id: number
  entity_type: string
  entity_id: number
  action: string
  changed_by_phone: string | null
  changed_by_name: string | null
  changed_by_role: string | null
  changes: AuditChange[] | null
  created_at: string
}

interface AuditLogProps {
  entityType: string
  entityId: number
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Vytvorenie',
  update: 'Úprava',
  deactivate: 'Deaktivácia',
  cancel: 'Zrušenie',
  assign: 'Priradenie technika',
  unassign: 'Odobratie technika',
  status_change: 'Zmena stavu',
}

const ACTION_COLORS: Record<string, string> = {
  create: '#16a34a',
  update: '#2563eb',
  deactivate: '#dc2626',
  cancel: '#dc2626',
  assign: '#7c3aed',
  unassign: '#ea580c',
  status_change: '#0891b2',
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'boolean') return val ? 'Áno' : 'Nie'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)

  let relative = ''
  if (diffMin < 1) relative = 'práve teraz'
  else if (diffMin < 60) relative = `pred ${diffMin} min`
  else if (diffH < 24) relative = `pred ${diffH} h`
  else if (diffD < 7) relative = `pred ${diffD} dňami`

  const absolute = d.toLocaleDateString('sk-SK', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return relative ? `${relative} (${absolute})` : absolute
}

export default function AuditLog({ entityType, entityId }: AuditLogProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/audit-log?entity_type=${entityType}&entity_id=${entityId}&limit=50`)
      const data = await res.json()
      if (data.success) {
        setEntries(data.entries)
      }
    } catch (err) {
      console.error('Failed to load audit log:', err)
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    if (expanded) {
      loadEntries()
    }
  }, [expanded, loadEntries])

  return (
    <div style={{ marginTop: 24 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: 'none',
          border: '1px solid var(--g3)',
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 13,
          cursor: 'pointer',
          color: 'var(--g7)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontWeight: 600 }}>
          História zmien
          {entries.length > 0 && ` (${entries.length})`}
        </span>
        <span style={{ fontSize: 11 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ marginTop: 8, border: '1px solid var(--g3)', borderRadius: 8, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--g4)', fontSize: 13 }}>
              Načítava sa...
            </div>
          ) : entries.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--g4)', fontSize: 13 }}>
              Žiadne záznamy
            </div>
          ) : (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--g2)',
                    fontSize: 12,
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        background: ACTION_COLORS[entry.action] || '#6b7280',
                        color: 'white',
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    >
                      {ACTION_LABELS[entry.action] || entry.action}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {entry.changed_by_name || entry.changed_by_phone || 'Systém'}
                    </span>
                    {entry.changed_by_role && (
                      <span style={{ color: 'var(--g4)', fontSize: 10 }}>
                        ({entry.changed_by_role})
                      </span>
                    )}
                    <span style={{ marginLeft: 'auto', color: 'var(--g4)', fontSize: 11 }}>
                      {formatDate(entry.created_at)}
                    </span>
                  </div>

                  {/* Changes */}
                  {entry.changes && entry.changes.length > 0 && (
                    <div style={{ marginTop: 4, paddingLeft: 8 }}>
                      {entry.changes.map((change, i) => (
                        <div key={i} style={{ display: 'flex', gap: 4, lineHeight: 1.6, color: 'var(--g7)' }}>
                          <span style={{ fontWeight: 500, minWidth: 120 }}>{change.field}:</span>
                          <span style={{ color: 'var(--red, #dc2626)', textDecoration: 'line-through', opacity: 0.7 }}>
                            {formatValue(change.old)}
                          </span>
                          <span style={{ color: 'var(--g4)' }}>→</span>
                          <span style={{ color: 'var(--green, #16a34a)', fontWeight: 500 }}>
                            {formatValue(change.new)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
