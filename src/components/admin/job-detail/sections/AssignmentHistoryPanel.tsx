'use client'

// ─── AssignmentHistoryPanel ────────────────────────────────────────────────────
// Zobrazuje históriu technikov na zákazke pri reassignment-och.
// Renderuje sa LEN ak totalAssignments > 1.

interface BreakdownEntry {
  assignmentId: number
  technicianName: string
  technicianId: number
  status: string
  cost: number
  invoice_data?: Record<string, unknown> | null
  invoice_uploaded_file_id?: number | null
  work_data?: Record<string, unknown> | null
}

interface ProtocolHistoryEntry {
  technician_id?: number
  clientSignature?: string
  protocolType?: string
}

interface AggregateData {
  aggregate_tech_costs?: number
  aggregate_prior_costs?: number
  aggregate_margin?: number
  aggregate_margin_met?: boolean
  aggregate_breakdown?: BreakdownEntry[]
}

export interface AssignmentHistoryPanelProps {
  jobId: number
  totalAssignments: number
  currentTechName?: string
  aggregateData?: AggregateData
  protocolHistory?: ProtocolHistoryEntry[]
  /** Mena zákazky — 'Kč' alebo '€'. Default 'Kč'. */
  currency?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(value: number, currency = 'Kč'): string {
  return new Intl.NumberFormat('cs-CZ').format(Math.round(value)) + '\u00a0' + currency
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  active:     { label: 'Aktívny',      bg: '#DCFCE7', color: '#166534' },
  completed:  { label: 'Dokončený',    bg: '#DCFCE7', color: '#166534' },
  reassigned: { label: 'Vymenený',     bg: '#FEF3C7', color: '#92400E' },
  cancelled:  { label: 'Zrušený',      bg: '#FEE2E2', color: '#991B1B' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? { label: status, bg: 'var(--g2, #F5F5F5)', color: 'var(--dark, #1a1a1a)' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 10,
      fontSize: 11,
      fontWeight: 600,
      background: cfg.bg,
      color: cfg.color,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

// ─── Protocol Badge ───────────────────────────────────────────────────────────

function ProtocolBadge({
  entry,
  protocolHistory,
}: {
  entry: BreakdownEntry
  protocolHistory: ProtocolHistoryEntry[]
}) {
  // Check for urgent flag first
  const isUrgentMissing = entry.work_data?.protocol_pending === true

  const match = protocolHistory.find(
    (ph) => ph.technician_id != null && ph.technician_id === entry.technicianId
  )

  let label: string
  let bg: string
  let color: string

  if (isUrgentMissing || !match) {
    label = isUrgentMissing ? 'Protokol chýba (urgentná zmena)' : 'Protokol chýba'
    bg = 'rgba(220,38,38,0.12)'
    color = 'var(--danger, #DC2626)'
  } else if (match.clientSignature) {
    label = 'Protokol kompletný'
    bg = 'rgba(22,163,74,0.12)'
    color = 'var(--success, #16A34A)'
  } else {
    label = 'Čaká na podpis'
    bg = 'rgba(217,119,6,0.12)'
    color = 'var(--warning, #D97706)'
  }

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 600,
      background: bg,
      color,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

// ─── Invoice Badge ────────────────────────────────────────────────────────────

const INVOICE_STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  validated:  { label: 'Na úhradu',       bg: '#DBEAFE', color: '#1E40AF' },
  in_batch:   { label: 'V dávke',         bg: '#EDE9FE', color: '#6D28D9' },
  paid:       { label: 'Uhradená',        bg: 'rgba(22,163,74,0.12)', color: 'var(--success, #16A34A)' },
  generated:  { label: 'Vygenerovaná',    bg: 'rgba(22,163,74,0.12)', color: 'var(--success, #16A34A)' },
  uploaded:   { label: 'Nahratá',         bg: 'rgba(22,163,74,0.12)', color: 'var(--success, #16A34A)' },
  draft:      { label: 'Draft',           bg: 'var(--g2, #F5F5F5)', color: 'var(--g4, #4B5563)' },
  rejected:   { label: 'Zamietnutá',      bg: '#FEE2E2', color: '#991B1B' },
}

function InvoiceBadge({ entry }: { entry: BreakdownEntry }) {
  const hasInvoice = entry.invoice_data != null || entry.invoice_uploaded_file_id != null

  if (hasInvoice) {
    const invStatus = (entry.invoice_data as Record<string, unknown>)?.invoice_status as string | undefined
    const cfg = invStatus ? INVOICE_STATUS_MAP[invStatus] : undefined
    const label = cfg?.label ?? (entry.invoice_uploaded_file_id != null ? 'Faktúra nahratá' : 'Faktúra vystavená')
    const bg = cfg?.bg ?? 'rgba(22,163,74,0.12)'
    const color = cfg?.color ?? 'var(--success, #16A34A)'
    return (
      <span style={{
        display: 'inline-block', padding: '2px 8px', borderRadius: 6,
        fontSize: 11, fontWeight: 600, background: bg, color, whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    )
  }

  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, background: 'var(--g2, #F5F5F5)',
      color: 'var(--g4, #4B5563)', whiteSpace: 'nowrap',
    }}>
      Bez faktúry
    </span>
  )
}

/** Zobrazenie hodín a km z work_data */
function WorkDataCell({ entry }: { entry: BreakdownEntry }) {
  const wd = entry.work_data as Record<string, unknown> | null | undefined
  if (!wd) return <span style={{ color: 'var(--g4, #4B5563)', fontSize: 11 }}>—</span>
  const hours = (wd.totalHours ?? wd.hours ?? 0) as number
  const km = (wd.totalKm ?? wd.km ?? 0) as number
  const visits = Array.isArray(wd.visits) ? wd.visits.length : 0
  return (
    <span style={{ fontSize: 11, color: 'var(--dark, #1a1a1a)' }}>
      {hours > 0 ? `${hours}h` : '—'}
      {km > 0 ? ` · ${km} km` : ''}
      {visits > 1 ? ` · ${visits}×` : ''}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssignmentHistoryPanel({
  totalAssignments,
  aggregateData,
  protocolHistory = [],
  currency = 'Kč',
}: AssignmentHistoryPanelProps) {
  // Render nothing for single-assignment jobs
  if ((totalAssignments ?? 1) <= 1) return null

  const breakdown = aggregateData?.aggregate_breakdown ?? []
  const totalCosts = aggregateData?.aggregate_tech_costs ?? 0
  const priorCosts = aggregateData?.aggregate_prior_costs
  const margin = aggregateData?.aggregate_margin
  const marginMet = aggregateData?.aggregate_margin_met

  const hasFinancials = totalCosts > 0 || (margin != null)

  return (
    <div style={{
      background: 'var(--w, #FFF)',
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      padding: '14px 16px',
      marginBottom: 12,
    }}>

      {/* Header */}
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--g4, #4B5563)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span>👷</span>
        <span>História technikov</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 11,
          fontWeight: 600,
          background: 'var(--g2, #F5F5F5)',
          color: 'var(--g4, #4B5563)',
          borderRadius: 10,
          padding: '1px 8px',
        }}>
          {totalAssignments}×
        </span>
      </div>

      {/* Warning banner — margin not met */}
      {marginMet === false && (
        <div style={{
          background: '#FEE2E2',
          border: '1px solid var(--danger, #DC2626)',
          borderLeft: '3px solid var(--danger, #DC2626)',
          borderRadius: 8,
          padding: '8px 12px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#991B1B' }}>
            Celkové náklady presahujú krytie poisťovne!
          </span>
        </div>
      )}

      {/* Assignment table */}
      {breakdown.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12,
          }}>
            <thead>
              <tr>
                {(['Technik', 'Status', 'Hod/Km', 'Protokol', 'Faktúra', 'Náklady'] as const).map(h => (
                  <th key={h} style={{
                    textAlign: h === 'Náklady' ? 'right' : 'left',
                    padding: '4px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--g4, #4B5563)',
                    borderBottom: '1px solid var(--g2, #F5F5F5)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {breakdown.map((entry, idx) => (
                <tr
                  key={entry.assignmentId}
                  style={{
                    background: idx % 2 === 0 ? 'transparent' : 'var(--g1, #FAFAFA)',
                  }}
                >
                  <td style={{ padding: '7px 8px', color: 'var(--dark, #1a1a1a)', fontWeight: 500 }}>
                    {entry.technicianName || '—'}
                  </td>
                  <td style={{ padding: '7px 8px' }}>
                    <StatusBadge status={entry.status} />
                  </td>
                  <td style={{ padding: '7px 8px' }}>
                    <WorkDataCell entry={entry} />
                  </td>
                  <td style={{ padding: '7px 8px' }}>
                    <ProtocolBadge entry={entry} protocolHistory={protocolHistory} />
                  </td>
                  <td style={{ padding: '7px 8px' }}>
                    <InvoiceBadge entry={entry} />
                  </td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--dark, #1a1a1a)', whiteSpace: 'nowrap' }}>
                    {entry.cost > 0 ? fmtMoney(entry.cost, currency) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{
          fontSize: 12,
          color: 'var(--g4, #4B5563)',
          fontStyle: 'italic',
          padding: '6px 0 8px',
        }}>
          Detail technikov nie je k dispozícii.
        </div>
      )}

      {/* Summary row */}
      {hasFinancials && (
        <>
          <div style={{
            borderTop: '1px solid var(--g2, #F5F5F5)',
            margin: '10px 0 8px',
          }} />

          {/* Total costs */}
          {totalCosts > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--g4, #4B5563)' }}>
                Celkové náklady (všetci technici)
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark, #1a1a1a)' }}>
                {fmtMoney(totalCosts, currency)}
              </span>
            </div>
          )}

          {/* Prior costs (coverage from insurer) */}
          {priorCosts != null && priorCosts > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--g4, #4B5563)' }}>
                Krytie poisťovne
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>
                {fmtMoney(priorCosts, currency)}
              </span>
            </div>
          )}

          {/* Margin */}
          {margin != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--g4, #4B5563)' }}>
                Marža
              </span>
              <span style={{
                fontSize: 14,
                fontWeight: 700,
                color: marginMet !== false ? 'var(--success, #16A34A)' : 'var(--danger, #DC2626)',
              }}>
                {fmtMoney(margin, currency)}
                {marginMet === false && (
                  <span style={{
                    marginLeft: 8,
                    fontSize: 10,
                    fontWeight: 700,
                    background: '#FEE2E2',
                    color: '#991B1B',
                    borderRadius: 4,
                    padding: '2px 6px',
                  }}>
                    POD MINIMOM
                  </span>
                )}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
