'use client'

import React, { useRef, useState, useEffect } from 'react'
import type { AutomationAction, ActionType } from '@/types/automation'
import { ACTION_LABELS } from '@/types/automation'
import { STATUS_STEPS } from '@/lib/constants'

interface Props {
  action: AutomationAction
  onChange: (action: AutomationAction) => void
  onDelete: () => void
}

const VARIABLE_CHIPS: { code: string; label: string }[] = [
  { code: '{{job.reference_number}}', label: 'Číslo zákazky' },
  { code: '{{job.customer_name}}', label: 'Meno klienta' },
  { code: '{{job.category}}', label: 'Kategória' },
  { code: '{{job.customer_city}}', label: 'Mesto' },
  { code: '{{job.customer_phone}}', label: 'Telefón klienta' },
  { code: '{{job.urgency}}', label: 'Urgentnosť' },
  { code: '{{partner.name}}', label: 'Poisťovňa' },
  { code: '{{technician.first_name}}', label: 'Meno technika' },
  { code: '{{technician.last_name}}', label: 'Priezvisko technika' },
  { code: '{{technician.phone}}', label: 'Telefón technika' },
]

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  fontSize: '13px',
  border: '1px solid #D1D5DB',
  borderRadius: '6px',
  fontFamily: "'Montserrat', sans-serif",
  background: '#fff',
  color: '#111827',
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '3px',
  display: 'block',
}

const JOB_FIELDS = [
  { value: 'description', label: 'Popis zákazky' },
  { value: 'urgency', label: 'Urgentnosť' },
  { value: 'category', label: 'Kategória' },
  { value: 'scheduled_date', label: 'Naplánovaný dátum' },
  { value: 'due_date', label: 'Termín splnenia' },
  { value: 'customer_city', label: 'Mesto klienta' },
  { value: 'priority_flag', label: 'Priorita' },
]

function VariableChipBar({ onInsert }: { onInsert: (v: string) => void }) {
  return (
    <div className="automation-variable-chips">
      {VARIABLE_CHIPS.map(v => (
        <span
          key={v.code}
          className="automation-variable-chip"
          onClick={() => onInsert(v.code)}
          title={`Vloží: ${v.code}`}
        >
          + {v.label}
        </span>
      ))}
    </div>
  )
}

export default function ActionBuilder({ action, onChange, onDelete }: Props) {
  const [activeTextarea, setActiveTextarea] = useState<string | null>(null)
  const refs = useRef<Record<string, HTMLTextAreaElement | HTMLInputElement | null>>({})
  const [aiFields, setAiFields] = useState<{ id: number; field_key: string; label: string }[]>([])
  const [emailAliases, setEmailAliases] = useState<{ sendAsEmail: string; displayName: string; isDefault: boolean }[]>([])

  useEffect(() => {
    if (action.type === 'run_ai_field') {
      fetch('/api/admin/ai-fields').then(r => r.json()).then(d => {
        setAiFields(d.definitions || [])
      }).catch((err) => console.warn('[ActionBuilder] Nepodarilo sa načítať AI polia:', err))
    }
    if (action.type === 'send_email') {
      fetch('/api/admin/email/aliases').then(r => r.json()).then(d => {
        setEmailAliases(d.aliases || [])
      }).catch((err) => console.warn('[ActionBuilder] Nepodarilo sa načítať email aliasy:', err))
    }
  }, [action.type])

  const updateType = (type: ActionType) => {
    onChange({ type, config: {}, delay_seconds: action.delay_seconds })
  }

  const updateConfig = (partial: Record<string, unknown>) => {
    onChange({ ...action, config: { ...action.config, ...partial } })
  }

  const insertVariable = (v: string) => {
    const key = activeTextarea
    if (!key) return
    const el = refs.current[key]
    if (!el) return
    const pos = (el as HTMLTextAreaElement).selectionStart ?? (el as HTMLInputElement).value.length
    const current = String(action.config[key] || '')
    const next = current.slice(0, pos) + v + current.slice(pos)
    updateConfig({ [key]: next })
    setTimeout(() => {
      const newPos = pos + v.length
      ;(el as HTMLTextAreaElement).setSelectionRange?.(newPos, newPos)
      el.focus()
    }, 10)
  }

  const needsVariables = ['send_push', 'send_sms', 'send_email', 'add_note'].includes(action.type)

  return (
    <div className="automation-action-row" style={{
      border: '1px solid #E5E7EB',
      borderRadius: '6px',
      padding: '10px 12px',
      background: '#FAFAF8',
      position: 'relative',
    }}>
      {/* Delete */}
      <button
        onClick={onDelete}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          color: '#4B5563',
          lineHeight: 1,
          padding: '2px',
        }}
        title="Odstrániť akciu"
      >
        ✕
      </button>

      <div style={{ paddingRight: '24px', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
        {/* Action type */}
        <div>
          <label style={labelStyle}>Typ akcie</label>
          <select
            style={{ ...inputStyle, maxWidth: '280px' }}
            value={action.type}
            onChange={e => updateType(e.target.value as ActionType)}
          >
            {(Object.keys(ACTION_LABELS) as ActionType[]).map(t => (
              <option key={t} value={t}>{ACTION_LABELS[t]}</option>
            ))}
          </select>
        </div>

        {/* send_push */}
        {action.type === 'send_push' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <label style={labelStyle}>Príjemca</label>
                <select style={inputStyle} value={String(action.config.recipient || 'operator')} onChange={e => updateConfig({ recipient: e.target.value })}>
                  <option value="operator">Operátor</option>
                  <option value="technician">Technik</option>
                  <option value="all">Všetci</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={labelStyle}>Nadpis notifikácie</label>
                <input
                  ref={el => { refs.current['title'] = el }}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                  value={String(action.config.title || '')}
                  onChange={e => updateConfig({ title: e.target.value })}
                  onFocus={() => setActiveTextarea('title')}
                  placeholder="Nová urgentná zákazka"
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Text notifikácie</label>
              <textarea
                ref={el => { refs.current['body'] = el }}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', minHeight: '60px', resize: 'vertical' }}
                value={String(action.config.body || '')}
                onChange={e => updateConfig({ body: e.target.value })}
                onFocus={() => setActiveTextarea('body')}
                placeholder="{{job.customer_name}} — {{job.category}}"
              />
            </div>
            <VariableChipBar onInsert={insertVariable} />
          </div>
        )}

        {/* send_sms */}
        {action.type === 'send_sms' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={labelStyle}>Komu poslať SMS</label>
              <select style={inputStyle} value={String(action.config.recipient || 'client')} onChange={e => updateConfig({ recipient: e.target.value })}>
                <option value="client">Zákazníkovi</option>
                <option value="technician">Technikovi</option>
              </select>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>
                Telefónne číslo sa doplní automaticky zo zákazky
              </div>
            </div>
            <div>
              <label style={labelStyle}>Text SMS správy</label>
              <textarea
                ref={el => { refs.current['message'] = el }}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', minHeight: '70px', resize: 'vertical' }}
                value={String(action.config.message || '')}
                onChange={e => updateConfig({ message: e.target.value })}
                onFocus={() => setActiveTextarea('message')}
                placeholder="Dobrý den, vas technik je na ceste k vam..."
              />
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>
                Tip: SMS sa odosielajú bez diakritiky kvôli nižším nákladom (160 znakov na segment)
              </div>
            </div>
            <VariableChipBar onInsert={insertVariable} />
          </div>
        )}

        {/* send_email */}
        {action.type === 'send_email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <label style={labelStyle}>Príjemca</label>
                <select style={inputStyle} value={String(action.config.recipient || 'client')} onChange={e => updateConfig({ recipient: e.target.value })}>
                  <option value="client">Klient</option>
                  <option value="technician">Technik</option>
                  <option value="operator">Operátor</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Odosielateľ (alias)</label>
                <select
                  style={inputStyle}
                  value={String(action.config.fromAlias || '')}
                  onChange={e => updateConfig({ fromAlias: e.target.value || undefined })}
                >
                  <option value="">— Predvolený —</option>
                  {emailAliases.map(a => (
                    <option key={a.sendAsEmail} value={a.sendAsEmail}>
                      {a.displayName ? `${a.displayName} <${a.sendAsEmail}>` : a.sendAsEmail}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={labelStyle}>Predmet</label>
                <input
                  ref={el => { refs.current['subject'] = el }}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                  value={String(action.config.subject || '')}
                  onChange={e => updateConfig({ subject: e.target.value })}
                  onFocus={() => setActiveTextarea('subject')}
                  placeholder="Zákazka {{job.reference_number}}"
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Text emailu</label>
              <textarea
                ref={el => { refs.current['body'] = el }}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical' }}
                value={String(action.config.body || '')}
                onChange={e => updateConfig({ body: e.target.value })}
                onFocus={() => setActiveTextarea('body')}
                placeholder="Vážený/á {{job.customer_name}}..."
              />
            </div>
            <VariableChipBar onInsert={insertVariable} />
          </div>
        )}

        {/* update_field */}
        {action.type === 'update_field' && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <label style={labelStyle}>Pole zákazky</label>
              <select style={inputStyle} value={String(action.config.field || '')} onChange={e => updateConfig({ field: e.target.value })}>
                <option value="">— Vybrať —</option>
                {JOB_FIELDS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <label style={labelStyle}>Hodnota</label>
              <input
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                value={String(action.config.value || '')}
                onChange={e => updateConfig({ value: e.target.value })}
                placeholder="napr. urgent alebo now"
              />
            </div>
          </div>
        )}

        {/* update_custom_field */}
        {action.type === 'update_custom_field' && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <label style={labelStyle}>Vlastné pole</label>
              <input
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                value={String(action.config.field || '')}
                onChange={e => updateConfig({ field: e.target.value })}
                placeholder="napr. priorita, typ_poruchy"
              />
            </div>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <label style={labelStyle}>Nová hodnota</label>
              <input
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                value={String(action.config.value || '')}
                onChange={e => updateConfig({ value: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* add_note */}
        {action.type === 'add_note' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={labelStyle}>Obsah poznámky</label>
              <textarea
                ref={el => { refs.current['content'] = el }}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', minHeight: '70px', resize: 'vertical' }}
                value={String(action.config.content || '')}
                onChange={e => updateConfig({ content: e.target.value })}
                onFocus={() => setActiveTextarea('content')}
                placeholder="Automatická poznámka: {{job.category}}"
              />
            </div>
            <VariableChipBar onInsert={insertVariable} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#374151', fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={Boolean(action.config.is_pinned)}
                onChange={e => updateConfig({ is_pinned: e.target.checked })}
              />
              Pripnúť poznámku
            </label>
          </div>
        )}

        {/* add_tag */}
        {action.type === 'add_tag' && (
          <div>
            <label style={labelStyle}>Tag</label>
            <input
              style={{ ...inputStyle, maxWidth: '200px' }}
              value={String(action.config.tag || '')}
              onChange={e => updateConfig({ tag: e.target.value })}
              placeholder="napr. vip, urgent"
            />
          </div>
        )}

        {/* advance_step */}
        {action.type === 'advance_step' && (
          <div>
            <label style={labelStyle}>Cieľový CRM krok (voliteľné — prázdne = ďalší)</label>
            <select
              style={{ ...inputStyle, maxWidth: '260px' }}
              value={action.config.target_step !== undefined ? String(action.config.target_step) : ''}
              onChange={e => updateConfig({ target_step: e.target.value !== '' ? parseInt(e.target.value) : undefined })}
            >
              <option value="">— Ďalší v poradí —</option>
              {STATUS_STEPS.map((s, i) => (
                <option key={s.key} value={i}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* assign_technician */}
        {action.type === 'assign_technician' && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <label style={labelStyle}>Metóda</label>
              <select
                style={inputStyle}
                value={String(action.config.method || 'best_match')}
                onChange={e => updateConfig({ method: e.target.value })}
              >
                <option value="best_match">Najlepší match (automaticky)</option>
                <option value="specific">Konkrétny technik</option>
              </select>
            </div>
            {action.config.method === 'specific' && (
              <div>
                <label style={labelStyle}>Číslo technika</label>
                <input
                  style={{ ...inputStyle, width: '100px' }}
                  type="number"
                  value={String(action.config.technician_id || '')}
                  onChange={e => updateConfig({ technician_id: parseInt(e.target.value) || undefined })}
                  placeholder="napr. 5"
                />
              </div>
            )}
          </div>
        )}

        {/* create_reminder */}
        {action.type === 'create_reminder' && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <label style={labelStyle}>Text pripomienky</label>
              <input
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                value={String(action.config.text || '')}
                onChange={e => updateConfig({ text: e.target.value })}
                placeholder="Skontrolovať stav zákazky"
              />
            </div>
            <div>
              <label style={labelStyle}>O koľko minút</label>
              <input
                style={{ ...inputStyle, width: '100px' }}
                type="number"
                min={1}
                value={String(action.config.minutes || '')}
                onChange={e => updateConfig({ minutes: parseInt(e.target.value) || undefined })}
                placeholder="60"
              />
            </div>
          </div>
        )}

        {/* call_webhook */}
        {action.type === 'call_webhook' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <label style={labelStyle}>Metóda</label>
                <select style={inputStyle} value={String(action.config.method || 'POST')} onChange={e => updateConfig({ method: e.target.value })}>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label style={labelStyle}>URL</label>
                <input
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                  value={String(action.config.url || '')}
                  onChange={e => updateConfig({ url: e.target.value })}
                  placeholder="https://hooks.zapier.com/..."
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Headers (JSON)</label>
              <textarea
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', minHeight: '50px', resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                value={String(action.config.headers || '')}
                onChange={e => updateConfig({ headers: e.target.value })}
                placeholder={'{"Authorization": "Bearer token"}'}
              />
            </div>
            <div>
              <label style={labelStyle}>Body (JSON)</label>
              <textarea
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', minHeight: '60px', resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                value={String(action.config.body || '')}
                onChange={e => updateConfig({ body: e.target.value })}
                placeholder={'{"jobId": "{{job.reference_number}}"}'}
              />
            </div>
          </div>
        )}

        {/* run_ai_field */}
        {action.type === 'run_ai_field' && (
          <div>
            <label style={labelStyle}>AI pole</label>
            <select
              style={{ ...inputStyle, maxWidth: '280px' }}
              value={String(action.config.ai_field_id || '')}
              onChange={e => updateConfig({ ai_field_id: parseInt(e.target.value) || undefined })}
            >
              <option value="">— Vybrať AI pole —</option>
              {aiFields.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* call_voicebot */}
        {action.type === 'call_voicebot' && (
          <div>
            <label style={labelStyle}>Scenár hovoru</label>
            <input
              style={{ ...inputStyle, maxWidth: '240px' }}
              value={String(action.config.scenario || '')}
              onChange={e => updateConfig({ scenario: e.target.value })}
              placeholder="napr. pripomienka termínu"
            />
          </div>
        )}

        {/* Delay */}
        <div>
          <label style={{ ...labelStyle, color: '#374151' }}>Oneskoriť o (sekundy, voliteľné)</label>
          <input
            style={{ ...inputStyle, width: '110px' }}
            type="number"
            min={0}
            value={action.delay_seconds !== undefined ? action.delay_seconds : ''}
            onChange={e => onChange({ ...action, delay_seconds: e.target.value !== '' ? parseInt(e.target.value) : undefined })}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  )
}
