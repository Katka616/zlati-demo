'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import InfoTooltip from '@/components/ui/InfoTooltip'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { ADMIN_PAGE_TOOLTIPS } from '@/lib/tooltipContent'
import { apiFetch, ApiError } from '@/lib/apiFetch'

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

interface CustomFieldDefinitionsManagerProps {
  entityType: EntityType
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  number: 'Číslo',
  date: 'Dátum',
  boolean: 'Áno/Nie',
  select: 'Výber (jeden)',
  multiselect: 'Výber (viac)',
  textarea: 'Dlhý text',
  email: 'Email',
  phone: 'Telefón',
  url: 'URL odkaz',
}

const FIELD_TYPES: FieldType[] = [
  'text',
  'number',
  'date',
  'boolean',
  'select',
  'multiselect',
  'textarea',
  'email',
  'phone',
  'url',
]

const emptyField = {
  label: '',
  field_key: '',
  field_type: 'text' as FieldType,
  options: '',
  placeholder: '',
  is_required: false,
}

function createFieldKey(label: string) {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50)
}

export default function CustomFieldDefinitionsManager({
  entityType,
}: CustomFieldDefinitionsManagerProps) {
  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingField, setEditingField] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyField })
  const [deletingField, setDeletingField] = useState<FieldDefinition | null>(null)

  const loadFields = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/custom-fields?entity_type=${entityType}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Nepodarilo sa načítať vlastné polia')
      const data = await res.json()
      setFields((data.definitions || []).filter((field: FieldDefinition) => field.is_active))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setLoading(false)
    }
  }, [entityType])

  useEffect(() => {
    void loadFields()
  }, [loadFields])

  useEffect(() => {
    setShowForm(false)
    setEditingField(null)
    setForm({ ...emptyField })
    setError(null)
  }, [entityType])

  const entityLabel = useMemo(() => {
    if (entityType === 'job') return 'zákazky'
    if (entityType === 'technician') return 'technikov'
    return 'partnerov'
  }, [entityType])

  const startCreate = () => {
    setForm({ ...emptyField })
    setEditingField(null)
    setShowForm(true)
    setError(null)
  }

  const startEdit = (field: FieldDefinition) => {
    setForm({
      label: field.label,
      field_key: field.field_key,
      field_type: field.field_type,
      options: (field.options || []).join(', '),
      placeholder: field.placeholder || '',
      is_required: field.is_required,
    })
    setEditingField(field.id)
    setShowForm(true)
    setError(null)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingField(null)
    setForm({ ...emptyField })
    setError(null)
  }

  const handleLabelChange = (label: string) => {
    setForm((prev) => ({
      ...prev,
      label,
      ...(editingField ? {} : { field_key: createFieldKey(label) }),
    }))
  }

  const handleSave = async () => {
    if (!form.label.trim() || !form.field_key.trim()) {
      setError('Vyplňte názov a kľúč poľa')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        entity_type: entityType,
        field_key: form.field_key,
        label: form.label.trim(),
        field_type: form.field_type,
        options: form.options
          ? form.options.split(',').map((option) => option.trim()).filter(Boolean)
          : [],
        placeholder: form.placeholder.trim() || undefined,
        is_required: form.is_required,
      }

      const url = editingField ? `/api/custom-fields/${editingField}` : '/api/custom-fields'
      const method = editingField ? 'PUT' : 'POST'
      await apiFetch(url, { method, body: payload, credentials: 'include' })

      closeForm()
      await loadFields()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'duplicate_field_key') {
        setError('Kľúč poľa už existuje')
      } else {
        setError(err instanceof Error ? err.message : 'Nepodarilo sa uložiť pole')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (field: FieldDefinition) => {
    setDeletingField(field)
  }

  const doDelete = async () => {
    if (!deletingField) return
    const fieldId = deletingField.id
    setDeletingField(null)
    try {
      await apiFetch(`/api/custom-fields/${fieldId}`, { method: 'DELETE', credentials: 'include' })
      await loadFields()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa odstrániť pole')
    }
  }

  const handleMove = async (id: number, direction: 'up' | 'down') => {
    const idx = fields.findIndex((field) => field.id === id)
    if (idx < 0) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === fields.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const fieldA = fields[idx]
    const fieldB = fields[swapIdx]
    const newOrderA = fieldA.sort_order === fieldB.sort_order
      ? direction === 'up'
        ? fieldB.sort_order - 1
        : fieldB.sort_order + 1
      : fieldB.sort_order
    const newOrderB = fieldA.sort_order

    const optimistic = [...fields]
    optimistic[idx] = { ...fieldA, sort_order: newOrderA }
    optimistic[swapIdx] = { ...fieldB, sort_order: newOrderB }
    optimistic.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    setFields(optimistic)

    try {
      await Promise.all([
        apiFetch(`/api/custom-fields/${fieldA.id}`, { method: 'PUT', credentials: 'include', body: { sort_order: newOrderA } }),
        apiFetch(`/api/custom-fields/${fieldB.id}`, { method: 'PUT', credentials: 'include', body: { sort_order: newOrderB } }),
      ])
    } catch {
      await loadFields()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          background: '#fff',
          border: '1px solid #E8E2D6',
          borderRadius: 14,
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Definície vlastných polí</div>
            <div style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>
              Správa dodatočných polí pre formuláre {entityLabel}.
            </div>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={startCreate}
              className="admin-btn admin-btn-gold"
            >
              + Nové pole
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 12,
            padding: '12px 14px',
            color: '#B91C1C',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {showForm && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #E8E2D6',
            borderRadius: 14,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
            {editingField ? 'Upraviť pole' : 'Nové vlastné pole'}
          </div>

          <div className="field">
            <label className="field-label">
              Názov poľa *
              <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.customFieldName} />
            </label>
            <input
              className="field-input"
              value={form.label}
              onChange={(event) => handleLabelChange(event.target.value)}
              placeholder="napr. Certifikácia, Interná poznámka, Poisťovňa"
            />
          </div>

          <div className="field">
            <label className="field-label">
              Kľúč
              <span style={{ fontSize: 11, color: '#4B5563', marginLeft: 6, fontWeight: 400 }}>
                (automaticky z názvu)
              </span>
            </label>
            <input
              className="field-input"
              value={form.field_key}
              onChange={(event) => setForm((prev) => ({ ...prev, field_key: event.target.value }))}
              disabled={editingField !== null}
              style={{ opacity: editingField !== null ? 0.65 : 1 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'end' }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label">
                Typ poľa *
                <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.customFieldType} />
              </label>
              <select
                className="field-input"
                value={form.field_type}
                onChange={(event) => setForm((prev) => ({ ...prev, field_type: event.target.value as FieldType }))}
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {FIELD_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(event) => setForm((prev) => ({ ...prev, is_required: event.target.checked }))}
              />
              Povinné pole
              <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.customFieldRequired} />
            </label>
          </div>

          {(form.field_type === 'select' || form.field_type === 'multiselect') && (
            <div className="field">
              <label className="field-label">
                Možnosti (oddelené čiarkou) *
                <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.customFieldOptions} />
              </label>
              <input
                className="field-input"
                value={form.options}
                onChange={(event) => setForm((prev) => ({ ...prev, options: event.target.value }))}
                placeholder="Možnosť 1, Možnosť 2, Možnosť 3"
              />
            </div>
          )}

          <div className="field">
            <label className="field-label">
              Placeholder
              <InfoTooltip text={ADMIN_PAGE_TOOLTIPS.customFieldPlaceholder} />
            </label>
            <input
              className="field-input"
              value={form.placeholder}
              onChange={(event) => setForm((prev) => ({ ...prev, placeholder: event.target.value }))}
              placeholder="Text zobrazený v prázdnom poli"
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button type="button" className="admin-btn admin-btn-outline" onClick={closeForm}>
              Zrušiť
            </button>
            <button type="button" className="admin-btn admin-btn-gold" onClick={handleSave} disabled={saving}>
              {saving ? 'Ukladám...' : editingField ? 'Uložiť zmeny' : 'Uložiť pole'}
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          background: '#fff',
          border: '1px solid #E8E2D6',
          borderRadius: 14,
          padding: 18,
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', color: '#374151', fontSize: 14, padding: '28px 0' }}>
            Načítavam vlastné polia...
          </div>
        ) : fields.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#374151', fontSize: 14, padding: '28px 0' }}>
            Zatiaľ nie sú vytvorené žiadne vlastné polia.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fields.map((field, index) => (
              <div
                key={field.id}
                style={{
                  border: '1px solid #ECE7DF',
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{field.label}</div>
                    <span className="status-badge available" style={{ fontSize: 10 }}>
                      {FIELD_TYPE_LABELS[field.field_type]}
                    </span>
                    {field.is_required && (
                      <span className="status-badge pending" style={{ fontSize: 10 }}>
                        Povinné
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>
                    {field.placeholder || ''}
                  </div>
                  {field.options?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {field.options.map((option) => (
                        <span key={option} className="status-badge available" style={{ fontSize: 10 }}>
                          {option}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline admin-btn-sm"
                    onClick={() => handleMove(field.id, 'up')}
                    disabled={index === 0}
                  >
                    ▲ Hore
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline admin-btn-sm"
                    onClick={() => handleMove(field.id, 'down')}
                    disabled={index === fields.length - 1}
                  >
                    ▼ Dole
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline admin-btn-sm"
                    onClick={() => startEdit(field)}
                  >
                    Upraviť
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline admin-btn-sm"
                    onClick={() => handleDelete(field)}
                    style={{ color: '#B91C1C', borderColor: '#FCA5A5' }}
                  >
                    Zmazať
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!deletingField}
        title="Odstrániť pole"
        message={deletingField ? `Naozaj chcete odstrániť pole "${deletingField.label}"?` : ''}
        variant="danger"
        confirmLabel="Zmazať"
        cancelLabel="Zrušiť"
        onConfirm={doDelete}
        onCancel={() => setDeletingField(null)}
      />
    </div>
  )
}
