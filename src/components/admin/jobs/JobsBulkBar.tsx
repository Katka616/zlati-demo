'use client'

import { ChevronDown, Archive, PanelRightClose } from 'lucide-react'
import { STATUS_FILTER_LIST } from '@/hooks/useJobsFilter'

interface JobsBulkBarProps {
  selectedCount: number
  technicians: { id: number; first_name: string; last_name: string }[]
  processing: boolean
  feedback: { type: 'success' | 'error'; message: string } | null
  onBulkUpdate: (field: string, value: string) => void
  onClearSelection: () => void
}

export default function JobsBulkBar({
  selectedCount,
  technicians,
  processing,
  feedback,
  onBulkUpdate,
  onClearSelection,
}: JobsBulkBarProps) {
  if (selectedCount === 0) return null

  const selectStyle: React.CSSProperties = {
    appearance: 'none', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff', padding: '6px 28px 6px 10px', borderRadius: '6px', fontSize: '12px',
    cursor: processing ? 'not-allowed' : 'pointer', fontFamily: "'Montserrat', sans-serif",
    opacity: processing ? 0.5 : 1,
  }

  return (
    <div style={{
      position: 'absolute', bottom: 'calc(100% + 16px)', left: '50%', transform: 'translateX(-50%)',
      background: '#1A1A1A', color: '#fff', padding: '12px 20px', borderRadius: '12px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: '16px',
      zIndex: 50, whiteSpace: 'nowrap',
    }}>
      {/* Count badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ background: '#bf953f', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
          {selectedCount}
        </span>
        <span style={{ fontWeight: 500, fontSize: '13px' }}>
          {selectedCount === 1 ? 'zákazka' : selectedCount < 5 ? 'zákazky' : 'zákaziek'}
        </span>
      </div>

      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Status update */}
        <div style={{ position: 'relative' }}>
          <select
            disabled={processing}
            onChange={(e) => { if (e.target.value) { onBulkUpdate('status', e.target.value); e.target.value = ''; } }}
            style={selectStyle}
          >
            <option value="" style={{ color: '#1A1A1A' }}>Zmeniť stav...</option>
            {STATUS_FILTER_LIST.map(s => (
              <option key={s.key} value={s.key} style={{ color: '#1A1A1A' }}>{s.label}</option>
            ))}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.75)' }} />
        </div>

        {/* Urgency update */}
        <div style={{ position: 'relative' }}>
          <select
            disabled={processing}
            onChange={(e) => { if (e.target.value) { onBulkUpdate('urgency', e.target.value === 'true' ? 'urgent' : 'normal'); e.target.value = ''; } }}
            style={selectStyle}
          >
            <option value="" style={{ color: '#1A1A1A' }}>Urgentnosť...</option>
            <option value="true" style={{ color: '#1A1A1A' }}>🔴 Urgentné</option>
            <option value="false" style={{ color: '#1A1A1A' }}>⚪ Normálna</option>
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.75)' }} />
        </div>

        {/* Technician assign */}
        <div style={{ position: 'relative' }}>
          <select
            disabled={processing}
            onChange={(e) => { if (e.target.value !== '') { onBulkUpdate('assigned_to', e.target.value); e.target.value = ''; } }}
            style={selectStyle}
          >
            <option value="" style={{ color: '#1A1A1A' }}>Priradiť technika...</option>
            <option value="0" style={{ color: '#1A1A1A' }}>— Odpriradiť —</option>
            {technicians.map(t => (
              <option key={t.id} value={String(t.id)} style={{ color: '#1A1A1A' }}>{t.first_name} {t.last_name}</option>
            ))}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.75)' }} />
        </div>

        {/* Archive button */}
        <button
          disabled={processing}
          onClick={() => onBulkUpdate('status', 'archived')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.85)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px',
            cursor: processing ? 'not-allowed' : 'pointer', fontFamily: "'Montserrat', sans-serif",
            opacity: processing ? 0.5 : 1, transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(158,158,158,0.3)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
          title="Archivovať vybrané zákazky"
        >
          <Archive size={14} /> Archivovať
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{
          fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px',
          background: feedback.type === 'success' ? 'rgba(21,128,61,0.3)' : 'rgba(185,28,28,0.3)',
          color: feedback.type === 'success' ? '#4ADE80' : '#FCA5A5',
          border: `1px solid ${feedback.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(252,165,165,0.3)'}`,
        }}>
          {feedback.type === 'success' ? '✓' : '✕'} {feedback.message}
        </div>
      )}

      {/* Loading spinner */}
      {processing && (
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>Ukladám...</div>
      )}

      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)' }} />

      {/* Close */}
      <button
        onClick={onClearSelection}
        style={{ padding: '4px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        title="Zrušiť výber"
      >
        <PanelRightClose size={18} style={{ color: 'rgba(255,255,255,0.75)' }} />
      </button>
    </div>
  )
}
