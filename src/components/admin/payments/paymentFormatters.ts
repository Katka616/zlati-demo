/**
 * Shared formatter utilities, constants, and styles for the Payments page tabs.
 */

import type { BatchStatus } from '@/lib/constants'
import type { TabKey } from './paymentTypes'

// ── Formatters ────────────────────────────────────────────────────────

export function fmtKc(amount: number): string {
  return new Intl.NumberFormat('cs-CZ').format(Math.round(amount)) + ' Kc'
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function maskIban(iban: string): string {
  if (iban.length <= 8) return iban
  return iban.slice(0, 4) + '...' + iban.slice(-4)
}

export function getDueUrgency(dueDate: string | null): 'overdue' | 'urgent' | 'normal' {
  if (!dueDate) return 'normal'
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'overdue'
  if (diff <= 3) return 'urgent'
  return 'normal'
}

// ── Constants ─────────────────────────────────────────────────────────

export const urgencyColors = {
  overdue: { bg: '#FEF2F2', text: 'var(--danger)', badge: '#F44336' },
  urgent: { bg: '#FFF8E1', text: '#E65100', badge: '#FF9800' },
  normal: { bg: 'transparent', text: 'var(--dark)', badge: 'var(--g5)' },
}

export const BATCH_COLORS: Record<BatchStatus, string> = {
  draft: 'var(--text-muted)',
  approved: 'var(--pastel-green-text)',
  exported: 'var(--pastel-blue-text)',
  sent: 'var(--pastel-gold-text)',
  completed: 'var(--pastel-green-text)',
}

export const PARTNER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Koncept', color: 'var(--text-muted)', bg: 'var(--pastel-warm-gray-bg)' },
  issued: { label: 'Vystavená', color: 'var(--pastel-blue-text)', bg: 'var(--pastel-blue-bg)' },
  sent: { label: 'Odoslaná', color: 'var(--pastel-purple-text)', bg: 'var(--pastel-purple-bg)' },
  paid: { label: 'Uhradená', color: 'var(--pastel-green-text)', bg: 'var(--pastel-green-bg)' },
  cancelled: { label: 'Zrušená', color: 'var(--pastel-rose-text)', bg: 'var(--pastel-rose-bg)' },
  overdue: { label: 'Po splatnosti', color: 'var(--pastel-gold-text)', bg: 'var(--pastel-gold-bg)' },
}

export const ACTIVE_STATUSES: BatchStatus[] = ['draft', 'approved', 'exported']
export const HISTORY_STATUSES: BatchStatus[] = ['sent', 'completed']

export const TAB_CONFIG: { key: TabKey; label: string }[] = [
  { key: 'due', label: 'Splatnosti' },
  { key: 'batches', label: 'Dávkové platby' },
  { key: 'archive', label: 'Archív faktúr' },
  { key: 'accountant', label: 'Pre účtovníčku' },
  { key: 'partners', label: 'Faktúry partnerom' },
]

export const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Všetky' },
  { value: 'generated', label: 'Vygenerovana' },
  { value: 'uploaded', label: 'Nahrana' },
  { value: 'validated', label: 'Overena' },
  { value: 'in_batch', label: 'V davke' },
  { value: 'paid', label: 'Uhradena' },
  { value: 'rejected', label: 'Zamietnutá' },
]

// ── Shared Styles ─────────────────────────────────────────────────────

export const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: 12,
  padding: '16px 20px',
  marginBottom: 12,
  border: '1px solid var(--border)',
}

export const badgeStyle = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 600,
  color: '#fff',
  background: color,
})

export const buttonBase: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

export const primaryButton: React.CSSProperties = {
  ...buttonBase,
  background: 'var(--gold)',
  color: '#fff',
}

export const secondaryButton: React.CSSProperties = {
  ...buttonBase,
  background: 'var(--g7)',
  color: '#fff',
}

export const dangerButton: React.CSSProperties = {
  ...buttonBase,
  background: 'var(--danger)',
  color: '#fff',
}

export const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: 'var(--dark)',
  marginBottom: 12,
  marginTop: 24,
}

export const thStyle: React.CSSProperties = {
  textAlign: 'left' as const,
  padding: '8px 12px',
  fontWeight: 600,
  color: 'var(--dark)',
  fontSize: 13,
}

export const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  color: 'var(--dark)',
  fontSize: 13,
}

export const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 0,
  borderBottom: '2px solid var(--g7)',
  marginBottom: 20,
  overflowX: 'auto',
}

export const tabItemStyle = (active: boolean): React.CSSProperties => ({
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: active ? 700 : 500,
  color: active ? 'var(--gold)' : 'var(--text-secondary)',
  borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
  marginBottom: -2,
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
})

export const filterBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  alignItems: 'center',
  marginBottom: 16,
}

export const selectStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid var(--g6)',
  fontSize: 13,
  fontFamily: 'inherit',
  color: 'var(--dark)',
  background: 'var(--bg-card)',
}

export const inputStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid var(--g6)',
  fontSize: 13,
  fontFamily: 'inherit',
  color: 'var(--dark)',
  background: 'var(--bg-card)',
  minWidth: 120,
}

export const summaryBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '10px 16px',
  background: 'var(--bg-card)',
  borderRadius: 10,
  border: '1px solid var(--g7)',
  marginBottom: 16,
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--dark)',
  flexWrap: 'wrap',
}
