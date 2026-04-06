'use client'

import { useState } from 'react'

// Same status colors as MobileJobCard
const STATUS_FILTERS = [
  { key: 'prijem', label: 'Príjem', color: '#3B82F6' },
  { key: 'dispatching', label: 'Dispatching', color: '#8B5CF6' },
  { key: 'naplanovane', label: 'Naplánované', color: '#D97706' },
  { key: 'na_mieste', label: 'Na mieste', color: '#DC2626' },
  { key: 'schvalovanie_ceny', label: 'Schvaľovanie', color: '#EA580C' },
  { key: 'cenova_ponuka_klientovi', label: 'Ponuka klient.', color: '#0891B2' },
  { key: 'dokoncene', label: 'Dokončené', color: '#16A34A' },
  { key: 'zuctovanie', label: 'Zúčtovanie', color: '#0D9488' },
  { key: 'cenova_kontrola', label: 'Cen. kontrola', color: '#0D9488' },
  { key: 'ea_odhlaska', label: 'EA odhláška', color: '#9333EA' },
  { key: 'fakturacia', label: 'Fakturácia', color: '#DB2777' },
  { key: 'uhradene', label: 'Uhradené', color: '#059669' },
  { key: 'uzavrete', label: 'Uzavreté', color: '#78716C' },
]

const PARTNER_FILTERS = [
  { key: '1', label: 'AXA', color: '#00008F' },
  { key: '2', label: 'Europ Assistance', color: '#003399' },
  { key: '3', label: 'Security Support', color: '#DC2626' },
]

const PRIORITY_FILTERS = [
  { key: 'urgent', label: 'Urgentné', color: '#DC2626' },
  { key: 'complaint', label: 'Sťažnosť', color: '#EA580C' },
  { key: 'vip', label: 'VIP', color: '#CA8A04' },
  { key: 'escalated', label: 'Eskalované', color: '#9333EA' },
]

interface MobileFilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  selectedStatuses: string[]
  selectedPartners: string[]
  selectedPriorities: string[]
  totalCount: number
  onStatusToggle: (key: string) => void
  onPartnerToggle: (key: string) => void
  onPriorityToggle: (key: string) => void
  onReset: () => void
  onApply: () => void
}

export default function MobileFilterDrawer({
  isOpen, onClose, selectedStatuses, selectedPartners, selectedPriorities,
  totalCount, onStatusToggle, onPartnerToggle, onPriorityToggle, onReset, onApply
}: MobileFilterDrawerProps) {
  if (!isOpen) return null

  function Chip({ label, color, selected, onToggle }: { label: string; color: string; selected: boolean; onToggle: () => void }) {
    return (
      <button
        onClick={onToggle}
        style={{
          padding: '8px 14px',
          borderRadius: 24,
          fontSize: 12,
          fontWeight: 500,
          border: selected ? 'none' : '1px solid var(--border, #E7E0D5)',
          background: selected ? color : 'var(--bg-card, #fff)',
          color: selected ? '#fff' : 'var(--text-secondary, #57534E)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
          minHeight: 36,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {label}
      </button>
    )
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted, #78716C)', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: 10 }}>{title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 7 }}>{children}</div>
      </div>
    )
  }

  return (
    <>
      <div className="admin-filter-drawer-overlay" onClick={onClose} />
      <div className="admin-filter-drawer">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border, #E7E0D5)', flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 18, fontWeight: 600, color: 'var(--text-primary, #0C0A09)' }}>Filtre</span>
          <button onClick={onReset} style={{ background: 'none', border: 'none', color: 'var(--gold, #BF953F)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Resetovať</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto' as const, padding: 20 }}>
          <Section title="Status">
            {STATUS_FILTERS.map(s => (
              <Chip key={s.key} label={s.label} color={s.color} selected={selectedStatuses.includes(s.key)} onToggle={() => onStatusToggle(s.key)} />
            ))}
          </Section>

          <Section title="Partner">
            {PARTNER_FILTERS.map(p => (
              <Chip key={p.key} label={p.label} color={p.color} selected={selectedPartners.includes(p.key)} onToggle={() => onPartnerToggle(p.key)} />
            ))}
          </Section>

          <Section title="Priorita">
            {PRIORITY_FILTERS.map(p => (
              <Chip key={p.key} label={p.label} color={p.color} selected={selectedPriorities.includes(p.key)} onToggle={() => onPriorityToggle(p.key)} />
            ))}
          </Section>
        </div>

        {/* Apply button */}
        <div style={{ padding: '12px 20px 28px', flexShrink: 0 }}>
          <button
            onClick={onApply}
            className="admin-btn-gold"
            style={{ width: '100%', padding: 16, fontSize: 15, borderRadius: 14 }}
          >
            Použiť filtre ({totalCount} zákaziek)
          </button>
        </div>
      </div>
    </>
  )
}
