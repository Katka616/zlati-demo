'use client'

import React from 'react'
import type { TriggerType, TriggerConfig } from '@/types/automation'
import { TRIGGER_LABELS } from '@/types/automation'
import { STATUS_STEPS, TECH_PHASES, TECH_PHASE_LABELS } from '@/lib/constants'

interface Props {
  triggerType: TriggerType
  triggerConfig: TriggerConfig
  onTypeChange: (type: TriggerType) => void
  onConfigChange: (config: TriggerConfig) => void
}

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  fontSize: '13px',
  border: '1px solid #D1D5DB',
  borderRadius: '6px',
  fontFamily: "'Montserrat', sans-serif",
  background: '#fff',
  color: '#111827',
  minWidth: '140px',
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '4px',
  display: 'block',
}

const JOB_FIELD_OPTIONS = [
  { value: 'customer_name', label: 'Meno klienta' },
  { value: 'category', label: 'Kategória' },
  { value: 'urgency', label: 'Urgentnosť' },
  { value: 'status', label: 'Status' },
  { value: 'assigned_to', label: 'Priradený technik' },
  { value: 'partner_id', label: 'Poisťovňa' },
  { value: 'crm_step', label: 'Krok zákazky' },
  { value: 'tech_phase', label: 'Fáza technika' },
  { value: 'scheduled_date', label: 'Naplánovaný dátum' },
  { value: 'customer_city', label: 'Mesto klienta' },
]

const REFERENCE_EVENT_OPTIONS = [
  { value: 'job_created', label: 'Vytvorenia zákazky' },
  { value: 'last_status_change', label: 'Poslednej zmeny statusu' },
  { value: 'assigned_at', label: 'Priradenia technika' },
  { value: 'scheduled_date', label: 'Naplánovaného dátumu' },
]

export default function TriggerSelector({ triggerType, triggerConfig, onTypeChange, onConfigChange }: Props) {
  const update = (partial: Partial<TriggerConfig>) => {
    onConfigChange({ ...triggerConfig, ...partial })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Trigger type */}
      <div>
        <label style={labelStyle}>Keď nastane:</label>
        <select
          style={{ ...inputStyle, width: '100%', maxWidth: '320px' }}
          value={triggerType}
          onChange={e => {
            onTypeChange(e.target.value as TriggerType)
            onConfigChange({})
          }}
        >
          {(Object.keys(TRIGGER_LABELS) as TriggerType[]).map(t => (
            <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* Dynamic params per trigger type */}
      {triggerType === 'status_change' && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>Z CRM kroku (voliteľné)</label>
            <select
              style={inputStyle}
              value={triggerConfig.from_step !== undefined ? String(triggerConfig.from_step) : ''}
              onChange={e => update({ from_step: e.target.value !== '' ? parseInt(e.target.value) : undefined })}
            >
              <option value="">— Akýkoľvek —</option>
              {STATUS_STEPS.map((s, i) => (
                <option key={s.key} value={i}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Na CRM krok (voliteľné)</label>
            <select
              style={inputStyle}
              value={triggerConfig.to_step !== undefined ? String(triggerConfig.to_step) : ''}
              onChange={e => update({ to_step: e.target.value !== '' ? parseInt(e.target.value) : undefined })}
            >
              <option value="">— Akýkoľvek —</option>
              {STATUS_STEPS.map((s, i) => (
                <option key={s.key} value={i}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {triggerType === 'tech_phase_change' && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>Z fázy (voliteľné)</label>
            <select
              style={inputStyle}
              value={triggerConfig.from_phase || ''}
              onChange={e => update({ from_phase: e.target.value || undefined })}
            >
              <option value="">— Akákoľvek —</option>
              {TECH_PHASES.map(p => (
                <option key={p} value={p}>{(TECH_PHASE_LABELS as Record<string, string>)[p] || p}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Na fázu (voliteľné)</label>
            <select
              style={inputStyle}
              value={triggerConfig.to_phase || ''}
              onChange={e => update({ to_phase: e.target.value || undefined })}
            >
              <option value="">— Akákoľvek —</option>
              {TECH_PHASES.map(p => (
                <option key={p} value={p}>{(TECH_PHASE_LABELS as Record<string, string>)[p] || p}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {triggerType === 'field_updated' && (
        <div>
          <label style={labelStyle}>Pole zákazky</label>
          <select
            style={inputStyle}
            value={triggerConfig.field_name || ''}
            onChange={e => update({ field_name: e.target.value })}
          >
            <option value="">— Vybrať pole —</option>
            {JOB_FIELD_OPTIONS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      )}

      {triggerType === 'time_elapsed' && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>Počet minút</label>
            <input
              style={{ ...inputStyle, width: '100px' }}
              type="number"
              min={1}
              placeholder="240"
              value={triggerConfig.minutes || ''}
              onChange={e => update({ minutes: parseInt(e.target.value) || undefined })}
            />
          </div>
          <div>
            <label style={labelStyle}>Od udalosti</label>
            <select
              style={inputStyle}
              value={triggerConfig.reference_event || ''}
              onChange={e => update({ reference_event: e.target.value || undefined })}
            >
              <option value="">— Vybrať udalosť —</option>
              {REFERENCE_EVENT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {triggerType === 'schedule' && (
        <div>
          <label style={labelStyle}>Interval (minúty)</label>
          <input
            style={{ ...inputStyle, width: '120px' }}
            type="number"
            min={1}
            placeholder="60"
            value={triggerConfig.interval_minutes || ''}
            onChange={e => update({ interval_minutes: parseInt(e.target.value) || undefined })}
          />
        </div>
      )}

      {triggerType === 'message_received' && (
        <div>
          <label style={labelStyle}>Kanál</label>
          <select
            style={inputStyle}
            value={triggerConfig.channel || ''}
            onChange={e => { const v = e.target.value; update({ channel: (v === 'dispatch' || v === 'client') ? v : undefined }) }}
          >
            <option value="">— Akýkoľvek —</option>
            <option value="dispatch">Dispatch (technik)</option>
            <option value="client">Klient (portál)</option>
          </select>
        </div>
      )}

      {(triggerType === 'job_created' || triggerType === 'job_assigned' || triggerType === 'manual') && (
        <div style={{
          padding: '8px 12px',
          background: '#F9FAFB',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#4B5563',
        }}>
          Tento trigger nemá žiadne ďalšie nastavenia.
        </div>
      )}
    </div>
  )
}
