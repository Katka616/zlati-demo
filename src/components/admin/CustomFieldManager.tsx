'use client'

/**
 * CustomFieldManager — inline rendering of custom fields within entity forms.
 *
 * Shows custom field values inside entity forms.
 * Field definitions are centrally managed in /admin/settings/custom-fields.
 */

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { toTelHref } from '@/lib/phone'

type EntityType = 'partner' | 'technician' | 'job'
type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'email' | 'phone' | 'url'

interface FieldDefinition {
  id: number
  field_key: string
  label: string
  field_type: FieldType
  options: string[]
  placeholder: string | null
  is_required: boolean
  sort_order: number
  is_active: boolean
}

interface CustomFieldManagerProps {
  entityType: EntityType
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  readOnly?: boolean
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  number: 'Cislo',
  date: 'Datum',
  boolean: 'Ano/Nie',
  select: 'Vyber (jeden)',
  multiselect: 'Vyber (viac)',
  textarea: 'Dlhy text',
  email: 'Email',
  phone: 'Telefon',
  url: 'URL odkaz',
}

export default function CustomFieldManager({
  entityType,
  values,
  onChange,
  readOnly = false,
}: CustomFieldManagerProps) {
  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [loading, setLoading] = useState(true)

  const loadFields = useCallback(async () => {
    try {
      const res = await fetch(`/api/custom-fields?entity_type=${entityType}`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        // Only show active fields
        const active = (data.definitions || []).filter((d: FieldDefinition) => d.is_active)
        setFields(active)
      }
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [entityType])

  useEffect(() => { loadFields() }, [loadFields])

  if (loading) return null
  if (fields.length === 0 && readOnly) return null

  return (
    <div className="admin-detail-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Vlastne polia</h3>
        {!readOnly && (
          <Link
            href={`/admin/settings/custom-fields?entity=${entityType}`}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--gold, #C5961A)',
              textDecoration: 'none',
            }}
          >
            Spravovať v Nastaveniach
          </Link>
        )}
      </div>

      {/* Existing custom fields - rendered as form fields */}
      {fields.map((field) => (
        <div key={field.id} className="field" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="field-label">
              {field.label}
              {field.is_required && <span style={{ color: 'var(--error, #dc2626)' }}> *</span>}
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginLeft: 6, fontWeight: 400 }}>
                {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
              </span>
            </label>
          </div>
          {readOnly ? (
            <ReadOnlyValue field={field} value={values[field.field_key]} />
          ) : (
            <FieldInput
              field={field}
              value={values[field.field_key]}
              onChange={(val) => onChange(field.field_key, val)}
            />
          )}
        </div>
      ))}

      {fields.length === 0 && !readOnly && (
        <p style={{ color: 'var(--g4)', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>
          Zatiaľ žiadne vlastné polia. Definície spravíte v Nastaveniach.
        </p>
      )}
    </div>
  )
}

// ── Read-only value display ──────────────────────────────────────────

function ReadOnlyValue({ field, value }: { field: FieldDefinition; value: unknown }) {
  if (value === undefined || value === null || value === '') {
    return <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>—</span>
  }
  switch (field.field_type) {
    case 'boolean':
      return <span style={{ fontSize: 14 }}>{value ? 'Ano' : 'Nie'}</span>
    case 'multiselect':
      return (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(Array.isArray(value) ? value : []).map((v: string) => (
            <span key={v} className="status-badge status-new" style={{ fontSize: 11 }}>{v}</span>
          ))}
        </div>
      )
    case 'url':
      return <a href={String(value)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-text, #8B6914)', fontSize: 14 }}>{String(value)}</a>
    case 'email':
      return <a href={`mailto:${String(value)}`} style={{ color: 'var(--gold-text, #8B6914)', fontSize: 14 }}>{String(value)}</a>
    case 'phone':
      return toTelHref(String(value))
        ? <a href={toTelHref(String(value)) ?? undefined} style={{ color: 'var(--gold-text, #8B6914)', fontSize: 14 }}>{String(value)}</a>
        : <span style={{ fontSize: 14 }}>{String(value)}</span>
    default:
      return <span style={{ fontSize: 14 }}>{String(value)}</span>
  }
}

// ── Field input controls ─────────────────────────────────────────────

function FieldInput({ field, value, onChange }: { field: FieldDefinition; value: unknown; onChange: (val: unknown) => void }) {
  const strVal = value !== undefined && value !== null ? String(value) : ''

  switch (field.field_type) {
    case 'text': case 'email': case 'phone': case 'url':
      return (
        <input
          className="field-input"
          type={field.field_type === 'email' ? 'email' : field.field_type === 'url' ? 'url' : 'text'}
          value={strVal}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          required={field.is_required}
        />
      )
    case 'number':
      return (
        <input className="field-input" type="number" value={strVal}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : '')}
          placeholder={field.placeholder || ''} required={field.is_required}
        />
      )
    case 'date':
      return <input className="field-input" type="date" value={strVal} onChange={e => onChange(e.target.value)} required={field.is_required} />
    case 'textarea':
      return <textarea className="field-input" value={strVal} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} rows={3} style={{ resize: 'vertical' }} required={field.is_required} />
    case 'boolean':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} id={`cf-${field.field_key}`} />
          <label htmlFor={`cf-${field.field_key}`} style={{ cursor: 'pointer', fontSize: 14 }}>{field.placeholder || 'Ano'}</label>
        </div>
      )
    case 'select':
      return (
        <select className="field-input" value={strVal} onChange={e => onChange(e.target.value)} required={field.is_required}>
          <option value="">{field.placeholder || '— Vyberte —'}</option>
          {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )
    case 'multiselect': {
      const sel: string[] = Array.isArray(value) ? value : []
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(field.options || []).map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={sel.includes(opt)}
                onChange={e => onChange(e.target.checked ? [...sel, opt] : sel.filter(v => v !== opt))}
              />
              {opt}
            </label>
          ))}
        </div>
      )
    }
    default:
      return <input className="field-input" value={strVal} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} />
  }
}
