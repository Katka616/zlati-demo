'use client'

import { useState, useCallback } from 'react'

interface DhaSyncSectionProps {
  jobId: number
  customFields: Record<string, unknown>
}

const DHA_STATUS_LABELS: Record<number, string> = {
  2: 'Assigned',
  3: 'TimeConfirmed',
  4: 'Rescheduled',
  5: 'WaitingForParts',
  6: 'ScheduledToReplacePart',
  50: 'Finished',
  100: 'Cancelled',
}

function fmtDate(val: unknown): string {
  if (!val || typeof val !== 'string') return '—'
  try {
    const d = new Date(val)
    return d.toLocaleString('cs-CZ', { timeZone: 'Europe/Prague', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return String(val)
  }
}

export default function DhaSyncSection({ jobId, customFields }: DhaSyncSectionProps) {
  const cf = customFields
  const eaOrderId = cf.ea_order_id as number | undefined
  if (!eaOrderId) return null

  const [resyncLoading, setResyncLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [actionResult, setActionResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const dhaStatus = cf.ea_dha_status as number | undefined
  const lastSync = cf.dha_last_sync as string | undefined
  const confirmedAt = cf.dha_confirmed_at as string | undefined
  const rescheduledAt = cf.dha_rescheduled_at as string | undefined
  const waitingAt = cf.dha_waiting_for_parts_at as string | undefined
  const finalizedAt = cf.dha_finalized_at as string | undefined
  const attachmentsSent = cf.dha_attachments_sent as number | undefined
  const cancelledAt = cf.dha_cancelled_at as string | undefined
  const cancelReason = cf.dha_cancel_reason as number | undefined

  const handleResync = useCallback(async () => {
    setResyncLoading(true)
    setActionResult(null)
    try {
      const res = await fetch('/api/dha/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: eaOrderId }),
      })
      const data = await res.json()
      setActionResult(data.success
        ? { ok: true, msg: 'Sync OK' }
        : { ok: false, msg: data.error || 'Sync zlyhal' })
    } catch (err) {
      setActionResult({ ok: false, msg: 'Chyba pripojenia' })
    } finally {
      setResyncLoading(false)
    }
  }, [eaOrderId])

  const handleResendFinalize = useCallback(async () => {
    setResendLoading(true)
    setActionResult(null)
    try {
      const res = await fetch('/api/dha/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: eaOrderId, action: 'resend_finalize', jobId }),
      })
      const data = await res.json()
      setActionResult(data.success
        ? { ok: true, msg: 'Finalize odoslaný' }
        : { ok: false, msg: data.error || 'Odoslanie zlyhalo' })
    } catch (err) {
      setActionResult({ ok: false, msg: 'Chyba pripojenia' })
    } finally {
      setResendLoading(false)
    }
  }, [eaOrderId, jobId])

  const statusLabel = dhaStatus != null ? (DHA_STATUS_LABELS[dhaStatus] || `Status ${dhaStatus}`) : '—'

  const sectionStyle: React.CSSProperties = {
    background: 'var(--g2, #1a1a2e)',
    borderRadius: 10,
    padding: '14px 16px',
    marginTop: 12,
    border: '1px solid var(--g3, #2a2a3e)',
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--gold, #D4A843)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '3px 0',
    fontSize: 12,
  }

  const labelStyle: React.CSSProperties = { color: 'var(--g6, #888)', minWidth: 130 }
  const valueStyle: React.CSSProperties = { color: 'var(--g8, #ddd)', fontWeight: 500, textAlign: 'right' as const }

  const btnStyle: React.CSSProperties = {
    padding: '5px 10px',
    fontSize: 11,
    borderRadius: 6,
    border: '1px solid var(--g4, #3a3a4e)',
    background: 'var(--g3, #2a2a3e)',
    color: 'var(--g8, #ddd)',
    cursor: 'pointer',
    opacity: resyncLoading || resendLoading ? 0.5 : 1,
  }

  return (
    <div style={sectionStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>DHA Sync</span>
        {lastSync && (
          <span style={{ fontSize: 10, color: 'var(--g5, #666)' }}>
            {fmtDate(lastSync)}
          </span>
        )}
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>EA Order ID</span>
        <span style={valueStyle}>{eaOrderId}</span>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>DHA Status</span>
        <span style={valueStyle}>{statusLabel}</span>
      </div>

      {confirmedAt && (
        <div style={rowStyle}>
          <span style={labelStyle}>Termín potvrdený</span>
          <span style={{ ...valueStyle, color: 'var(--success, #4CAF50)' }}>{fmtDate(confirmedAt)}</span>
        </div>
      )}

      {rescheduledAt && (
        <div style={rowStyle}>
          <span style={labelStyle}>Presunuté</span>
          <span style={{ ...valueStyle, color: 'var(--warning, #FF9800)' }}>{fmtDate(rescheduledAt)}</span>
        </div>
      )}

      {waitingAt && (
        <div style={rowStyle}>
          <span style={labelStyle}>Čaká na diely</span>
          <span style={{ ...valueStyle, color: 'var(--warning, #FF9800)' }}>{fmtDate(waitingAt)}</span>
        </div>
      )}

      {finalizedAt && (
        <div style={rowStyle}>
          <span style={labelStyle}>Finalizované</span>
          <span style={{ ...valueStyle, color: 'var(--success, #4CAF50)' }}>
            {fmtDate(finalizedAt)}
            {attachmentsSent != null && ` (${attachmentsSent} príloh)`}
          </span>
        </div>
      )}

      {cancelledAt && (
        <div style={rowStyle}>
          <span style={labelStyle}>Zrušené v DHA</span>
          <span style={{ ...valueStyle, color: 'var(--danger, #f44336)' }}>
            {fmtDate(cancelledAt)}
            {cancelReason != null && ` (dôvod: ${cancelReason})`}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button style={btnStyle} onClick={handleResync} disabled={resyncLoading}>
          {resyncLoading ? '...' : 'Resync z DHA'}
        </button>
        <button style={btnStyle} onClick={handleResendFinalize} disabled={resendLoading}>
          {resendLoading ? '...' : 'Resend Finalize'}
        </button>
      </div>

      {actionResult && (
        <div style={{
          marginTop: 6,
          fontSize: 11,
          color: actionResult.ok ? 'var(--success, #4CAF50)' : 'var(--danger, #f44336)',
        }}>
          {actionResult.msg}
        </div>
      )}
    </div>
  )
}
