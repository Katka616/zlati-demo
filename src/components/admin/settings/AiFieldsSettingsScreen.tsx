'use client'

import React, { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { ADMIN_PAGE_TOOLTIPS } from '@/lib/tooltipContent'

// CRM step labels for checkbox display — must match STATUS_STEPS in constants.ts (15 steps, 0–14)
const CRM_STEP_LABELS: Record<number, string> = {
  0: 'Príjem', 1: 'Priradenie', 2: 'Naplánované', 3: 'Na mieste',
  4: 'Schvaľovanie ceny', 5: 'Ponuka klientovi', 6: 'Práca', 7: 'Rozpracovaná',
  8: 'Dokončené', 9: 'Zúčtovanie', 10: 'Cenová kontrola', 11: 'EA Odhláška',
  12: 'Fakturácia', 13: 'Uhradené', 14: 'Uzavreté',
}

const AVAILABLE_VARIABLES: { code: string; label: string }[] = [
  { code: '{{job.category}}', label: 'Kategória' },
  { code: '{{job.description}}', label: 'Popis zákazky' },
  { code: '{{job.urgency}}', label: 'Urgentnosť' },
  { code: '{{job.customer_name}}', label: 'Meno klienta' },
  { code: '{{job.customer_city}}', label: 'Mesto klienta' },
  { code: '{{job.customer_address}}', label: 'Adresa klienta' },
  { code: '{{job.customer_country}}', label: 'Krajina' },
  { code: '{{job.customer_phone}}', label: 'Telefón klienta' },
  { code: '{{job.status}}', label: 'Status' },
  { code: '{{job.tech_phase}}', label: 'Fáza technika' },
  { code: '{{job.crm_step}}', label: 'Krok zákazky' },
  { code: '{{job.reference_number}}', label: 'Číslo zákazky' },
  { code: '{{job.messages}}', label: 'Správy' },
  { code: '{{job.custom_fields}}', label: 'Vlastné polia' },
  { code: '{{partner.name}}', label: 'Poisťovňa' },
  { code: '{{partner.code}}', label: 'Kód poisťovne' },
  { code: '{{partner.country}}', label: 'Krajina poisťovne' },
]

const TECHNICIAN_VARIABLES: { code: string; label: string }[] = [
  { code: '{{technician.first_name}}', label: 'Meno technika' },
  { code: '{{technician.last_name}}', label: 'Priezvisko technika' },
  { code: '{{technician.phone}}', label: 'Telefón technika' },
  { code: '{{technician.specializations}}', label: 'Špecializácie' },
  { code: '{{technician.rating}}', label: 'Hodnotenie' },
  { code: '{{technician.status}}', label: 'Status technika' },
  { code: '{{technician.city}}', label: 'Mesto technika' },
  { code: '{{technician.country}}', label: 'Krajina technika' },
]

const DASHBOARD_VARIABLES: { code: string; label: string }[] = [
  { code: '{{stats.total_jobs}}', label: 'Celkový počet zákaziek' },
  { code: '{{stats.active_jobs}}', label: 'Aktívne zákazky' },
  { code: '{{stats.completed_today}}', label: 'Dokončené dnes' },
  { code: '{{stats.revenue_mtd}}', label: 'Tržby tento mesiac' },
  { code: '{{stats.pending_invoices}}', label: 'Neuhradené faktúry' },
]

const DISPLAY_LOCATION_LABELS: Record<string, string> = {
  job_sidepanel: 'Zákazka (panel)',
  job_detail: 'Zákazka (detail)',
  technician_profile: 'Profil technika',
  dashboard: 'Dashboard',
}

interface AiFieldDef {
  id: number
  field_key: string
  label: string
  description: string | null
  prompt_template: string
  output_format: string
  output_options: string[]
  model: string
  max_tokens: number
  temperature: number
  trigger_on: string
  trigger_crm_steps: number[]
  entity_type: string
  display_locations: string[]
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

const emptyDef: Omit<AiFieldDef, 'id' | 'created_at' | 'updated_at'> = {
  field_key: '', label: '', description: null,
  prompt_template: '', output_format: 'text', output_options: [],
  model: 'gpt-5.4', max_tokens: 200, temperature: 0.3,
  trigger_on: 'manual_only', trigger_crm_steps: [],
  entity_type: 'job',
  display_locations: ['job_sidepanel'],
  is_active: true, sort_order: 0,
}

export default function AiFieldsPage() {
  const [definitions, setDefinitions] = useState<AiFieldDef[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | 'new' | null>(null)
  const [editForm, setEditForm] = useState<typeof emptyDef>({ ...emptyDef })
  const [saving, setSaving] = useState(false)
  const [testJobId, setTestJobId] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    rendered_prompt: string
    system_prompt: string
    llm_output: string | null
    model: string
  } | null>(null)
  const [optionsInput, setOptionsInput] = useState('')

  const fetchDefinitions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-fields')
      if (res.ok) {
        const data = await res.json()
        setDefinitions(data.definitions || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDefinitions() }, [fetchDefinitions])

  const expandCard = (def: AiFieldDef | null) => {
    if (def) {
      setExpandedId(def.id)
      setEditForm({
        field_key: def.field_key,
        label: def.label,
        description: def.description,
        prompt_template: def.prompt_template,
        output_format: def.output_format,
        output_options: def.output_options,
        model: def.model,
        max_tokens: def.max_tokens,
        temperature: def.temperature,
        trigger_on: def.trigger_on,
        trigger_crm_steps: def.trigger_crm_steps,
        entity_type: def.entity_type || 'job',
        display_locations: def.display_locations || ['job_sidepanel'],
        is_active: def.is_active,
        sort_order: def.sort_order,
      })
      setOptionsInput(def.output_options.join(', '))
    } else {
      setExpandedId('new')
      setEditForm({ ...emptyDef })
      setOptionsInput('')
    }
    setTestResult(null)
    setTestJobId('')
  }

  const collapse = () => {
    setExpandedId(null)
    setTestResult(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...editForm,
        output_options: editForm.output_format === 'label'
          ? optionsInput.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
      }

      if (expandedId === 'new') {
        const res = await fetch('/api/admin/ai-fields', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          await fetchDefinitions()
          collapse()
        }
      } else {
        const res = await fetch(`/api/admin/ai-fields/${expandedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          await fetchDefinitions()
          collapse()
        }
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (def: AiFieldDef) => {
    try {
      if (def.is_active) {
        await fetch(`/api/admin/ai-fields/${def.id}`, { method: 'DELETE' })
      } else {
        await fetch(`/api/admin/ai-fields/${def.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: true }),
        })
      }
      await fetchDefinitions()
    } catch {
      // ignore
    }
  }

  const handleTest = async (defId: number) => {
    if (!testJobId) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`/api/admin/ai-fields/${defId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: parseInt(testJobId, 10) }),
      })
      if (res.ok) {
        const data = await res.json()
        setTestResult(data.test_result)
      }
    } catch {
      // ignore
    } finally {
      setTesting(false)
    }
  }

  const toggleCrmStep = (step: number) => {
    setEditForm(prev => ({
      ...prev,
      trigger_crm_steps: prev.trigger_crm_steps.includes(step)
        ? prev.trigger_crm_steps.filter((s: number) => s !== step)
        : [...prev.trigger_crm_steps, step].sort((a: number, b: number) => a - b),
    }))
  }

  const toggleDisplayLocation = (loc: string) => {
    setEditForm(prev => ({
      ...prev,
      display_locations: prev.display_locations.includes(loc)
        ? prev.display_locations.filter((l: string) => l !== loc)
        : [...prev.display_locations, loc],
    }))
  }

  const cardStyle = (isActive: boolean, isExpanded: boolean): React.CSSProperties => ({
    background: '#fff',
    border: '1px solid #E8E2D6',
    borderLeft: `3px solid ${isActive ? '#bf953f' : '#D1D5DB'}`,
    borderRadius: '8px',
    padding: isExpanded ? '16px' : '12px 16px',
    cursor: isExpanded ? 'default' : 'pointer',
    transition: 'all 0.2s',
  })

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontSize: '13px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontFamily: "'Montserrat', sans-serif",
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: '#4B5563',
    marginBottom: '4px',
    display: 'block',
    fontFamily: 'inherit',
  }

  function renderEditForm(def: AiFieldDef | null) {
    const isNew = def === null
    const currentId = isNew ? 'new' : def!.id

    return (
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: isNew ? '12px' : 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Label + Key */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Názov</label>
            <input
              style={inputStyle}
              value={editForm.label}
              onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))}
              placeholder="Zhrnutie zákazky"
            />
          </div>
          <div>
            <label style={labelStyle}>Kľúč</label>
            <input
              style={{
                ...inputStyle,
                ...(isNew ? {} : { background: '#F3F4F6', color: '#4B5563' }),
              }}
              value={editForm.field_key}
              onChange={e => isNew ? setEditForm(p => ({ ...p, field_key: e.target.value })) : undefined}
              disabled={!isNew}
              placeholder="zhrnutie_zakazky"
            />
          </div>
        </div>

        {/* Output format + Entity Type + Trigger */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>
              Výstupný formát
              <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.aiFieldOutputFormat} />
            </label>
            <select
              style={inputStyle}
              value={editForm.output_format}
              onChange={e => setEditForm(p => ({ ...p, output_format: e.target.value }))}
            >
              <option value="text">Text</option>
              <option value="number">Číslo</option>
              <option value="label">Výber z možností</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Entita</label>
            <select
              style={inputStyle}
              value={editForm.entity_type}
              onChange={e => setEditForm(p => ({ ...p, entity_type: e.target.value }))}
            >
              <option value="job">Zákazka</option>
              <option value="technician">Technik</option>
              <option value="global">Dashboard / Globálne</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>
              Trigger
              <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.aiFieldTrigger} />
            </label>
            <select
              style={inputStyle}
              value={editForm.trigger_on}
              onChange={e => setEditForm(p => ({ ...p, trigger_on: e.target.value }))}
            >
              <option value="manual_only">Manuálne</option>
              <option value="status_change">Pri zmene statusu</option>
              <option value="job_created">Pri vytvorení zákazky</option>
            </select>
          </div>
        </div>

        {/* Display Locations */}
        <div>
          <label style={labelStyle}>
            Kde zobraziť
            <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.aiFieldDisplayLocation} />
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {Object.entries(DISPLAY_LOCATION_LABELS).map(([loc, locLabel]) => {
              const active = editForm.display_locations.includes(loc)
              return (
                <button
                  key={loc}
                  onClick={() => toggleDisplayLocation(loc)}
                  style={{
                    background: active ? '#bf953f' : '#F3F4F6',
                    color: active ? '#fff' : '#6B7280',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {locLabel}
                </button>
              )
            })}
          </div>
        </div>

        {/* Output Options (only for label) */}
        {editForm.output_format === 'label' && (
          <div>
            <label style={labelStyle}>Možnosti (čiarkou oddelené)</label>
            <input
              style={inputStyle}
              value={optionsInput}
              onChange={e => setOptionsInput(e.target.value)}
              placeholder="nizky, stredny, vysoky"
            />
            {optionsInput && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                {optionsInput.split(',').map((s: string) => s.trim()).filter(Boolean).map((opt: string, i: number) => (
                  <span key={i} style={{
                    background: '#F3F4F6',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    color: '#374151',
                  }}>
                    {opt}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CRM Steps (only for status_change + job entity) */}
        {editForm.trigger_on === 'status_change' && editForm.entity_type === 'job' && (
          <div>
            <label style={labelStyle}>CRM kroky (kedy sa spustí)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.entries(CRM_STEP_LABELS).map(([step, label]) => {
                const stepNum = parseInt(step)
                const active = editForm.trigger_crm_steps.includes(stepNum)
                return (
                  <button
                    key={step}
                    onClick={() => toggleCrmStep(stepNum)}
                    style={{
                      background: active ? '#bf953f' : '#F3F4F6',
                      color: active ? '#fff' : '#6B7280',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Model + Max tokens + Temperature */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>
              Model
              <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.aiFieldModel} />
            </label>
            <select
              style={inputStyle}
              value={editForm.model}
              onChange={e => setEditForm(p => ({ ...p, model: e.target.value }))}
            >
              <option value="gpt-5.4">gpt-5.4</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>
              Max tokens
              <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.aiFieldMaxTokens} />
            </label>
            <input
              style={inputStyle}
              type="number"
              min={50}
              max={1000}
              value={editForm.max_tokens}
              onChange={e => setEditForm(p => ({ ...p, max_tokens: parseInt(e.target.value) || 200 }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Teplota: {editForm.temperature.toFixed(1)}</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={editForm.temperature}
              onChange={e => setEditForm(p => ({ ...p, temperature: parseFloat(e.target.value) }))}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>
        </div>

        {/* Prompt template */}
        <div>
          <label style={labelStyle}>
            Prompt šablóna
            <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.aiFieldPromptTemplate} />
          </label>
          <textarea
            style={{
              ...inputStyle,
              fontFamily: "'Courier New', monospace",
              minHeight: '120px',
              resize: 'vertical',
            }}
            value={editForm.prompt_template}
            onChange={e => setEditForm(p => ({ ...p, prompt_template: e.target.value }))}
            placeholder="Na základe nasledujúcich údajov..."
          />
          <div style={{
            marginTop: '8px',
            padding: '8px 10px',
            background: '#F9FAFB',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#4B5563',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Dostupné premenné:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {(editForm.entity_type === 'technician'
                ? TECHNICIAN_VARIABLES
                : editForm.entity_type === 'global'
                  ? DASHBOARD_VARIABLES
                  : AVAILABLE_VARIABLES
              ).map(v => (
                <span
                  key={v.code}
                  style={{
                    background: '#FFF7ED',
                    border: '1px solid #FDE68A',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    color: '#92400E',
                    fontWeight: 500,
                  }}
                  onClick={() => {
                    setEditForm(p => ({ ...p, prompt_template: p.prompt_template + ' ' + v.code }))
                  }}
                  title={`Vloží: ${v.code}`}
                >
                  + {v.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Test section (only for existing definitions) */}
        {!isNew && currentId !== 'new' && (
          <div style={{
            background: '#FAFAF8',
            border: '1px solid #E8E2D6',
            borderRadius: '6px',
            padding: '12px',
          }}>
            <label style={labelStyle}>Otestovať na zákazke</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                type="number"
                placeholder="ID zákazky (napr. 5)"
                value={testJobId}
                onChange={e => setTestJobId(e.target.value)}
              />
              <button
                onClick={() => handleTest(currentId as number)}
                disabled={testing || !testJobId}
                style={{
                  background: '#bf953f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: testing || !testJobId ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  opacity: testing || !testJobId ? 0.6 : 1,
                }}
              >
                {testing ? 'Testujem...' : 'Otestovať'}
              </button>
            </div>

            {testResult && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
                    Renderovaný prompt:
                  </div>
                  <pre style={{
                    background: '#F3F4F6',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '150px',
                    overflow: 'auto',
                    margin: 0,
                  }}>
                    {testResult.rendered_prompt}
                  </pre>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
                    LLM výstup ({testResult.model}):
                  </div>
                  <pre style={{
                    background: '#DEF7EC',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: '#03543F',
                    margin: 0,
                  }}>
                    {testResult.llm_output || '(prázdny výstup)'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button
            onClick={collapse}
            style={{
              background: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Zrušiť
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !editForm.label || !editForm.field_key || !editForm.prompt_template}
            style={{
              background: '#bf953f',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: saving || !editForm.label || !editForm.field_key || !editForm.prompt_template
                ? 'not-allowed'
                : 'pointer',
              opacity: saving || !editForm.label || !editForm.field_key || !editForm.prompt_template ? 0.6 : 1,
            }}
          >
            {saving ? 'Ukladám...' : isNew ? 'Vytvoriť' : 'Uložiť'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout title="AI Polia" backHref="/admin/settings">
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        {/* New field button */}
        <div
          onClick={() => expandedId !== 'new' ? expandCard(null) : collapse()}
          style={{
            border: '2px dashed #bf953f',
            borderRadius: '8px',
            padding: '14px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            color: '#bf953f',
            fontWeight: 600,
            fontSize: '14px',
            marginBottom: '16px',
            fontFamily: 'inherit',
            background: expandedId === 'new' ? '#FFF8E7' : 'transparent',
          }}
        >
          + Nové AI pole
        </div>

        {/* New field form */}
        {expandedId === 'new' && renderEditForm(null)}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#4B5563' }}>
            Načítavam...
          </div>
        )}

        {/* Definition cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
          {definitions.map(def => (
            <div key={def.id}>
              <div
                style={cardStyle(def.is_active, expandedId === def.id)}
                onClick={() => expandedId !== def.id ? expandCard(def) : undefined}
              >
                {/* Card header (always visible) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                      {def.label}
                    </div>
                    <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '2px' }}>
                      {(() => {
                        const entityLabel = def.entity_type === 'technician' ? 'Technik' : def.entity_type === 'global' ? 'Dashboard' : 'Zákazka'
                        const formatLabel: Record<string, string> = { text: 'Text', number: 'Číslo', label: 'Výber', json: 'JSON' }
                        return `${entityLabel} · ${formatLabel[def.output_format] || def.output_format} · ${
                          def.trigger_on === 'status_change'
                            ? `spustenie na kroku ${def.trigger_crm_steps.join(', ')}`
                            : def.trigger_on === 'job_created'
                              ? 'pri vytvorení zákazky'
                              : 'manuálne spustenie'
                        }`
                      })()}
                    </div>
                  </div>
                  {/* Active toggle pill */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleActive(def) }}
                    style={{
                      background: def.is_active ? '#DEF7EC' : '#F3F4F6',
                      color: def.is_active ? '#03543F' : '#6B7280',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '3px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {def.is_active ? 'Aktívne' : 'Neaktívne'}
                  </button>
                </div>

                {/* Expanded edit form */}
                {expandedId === def.id && (
                  <div style={{ marginTop: '16px' }}>
                    {renderEditForm(def)}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {!loading && definitions.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#4B5563',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}>
              Žiadne AI polia. Kliknite na + Nové AI pole pre vytvorenie.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
