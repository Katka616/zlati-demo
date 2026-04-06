'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { FilterRule, FilterFieldKey, FilterOperator, FilterValue, FilterTemplate } from '@/types/filters'
import {
  FILTER_FIELD_CONFIG,
  OPERATOR_LABELS,
  FILTER_TEMPLATES,
  newRuleId,
  isCustomField,
  buildCustomFieldConfig,
} from '@/lib/filterFields'
import type { DBCustomFieldDefinition } from '@/lib/db'

// ─── Props ───────────────────────────────────────────────────────────────────

export interface QueryBuilderProps {
  rules: FilterRule[]
  onRulesChange: (rules: FilterRule[]) => void
  partners: { id: number; name: string }[]
  technicians: { id: number; first_name: string; last_name: string }[]
  totalCount: number
  isLoading?: boolean
  /** External control — when provided, overrides internal panelOpen state */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Hide the internal trigger bar (+ Podmienka, summary chip, templates, clear all).
   *  Use when the parent provides its own trigger (e.g. + Filter button in toolbar). */
  hideBar?: boolean
  /** Custom field definitions for the 'job' entity — shown as a separate group in field selector. */
  customFieldDefs?: DBCustomFieldDefinition[]
}

// ─── Operators that require no value input ───────────────────────────────────

const NO_VALUE_OPERATORS = new Set<FilterOperator>([
  'is_empty',
  'is_not_empty',
  'date_today',
  'date_this_week',
])

// ─── Popover hook ────────────────────────────────────────────────────────────

function usePopover() {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return { ref, open, setOpen, toggle: () => setOpen(p => !p) }
}

// ─── LogicToggle ─────────────────────────────────────────────────────────────

function LogicToggle({
  value,
  onChange,
}: {
  value: 'AND' | 'OR'
  onChange: (v: 'AND' | 'OR') => void
}) {
  const isAnd = value === 'AND'
  return (
    <button
      onClick={() => onChange(isAnd ? 'OR' : 'AND')}
      style={{
        padding: '4px 10px',
        borderRadius: 6,
        border: 'none',
        cursor: 'pointer',
        fontFamily: "'Montserrat', sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        background: isAnd ? '#EEF2FF' : '#FFF7ED',
        color: isAnd ? '#3730a3' : '#c2410c',
        minWidth: 56,
        transition: 'background 0.15s, color 0.15s',
      }}
      title={isAnd ? 'Prepnúť na ALEBO' : 'Prepnúť na A'}
    >
      {isAnd ? 'A' : 'ALEBO'}
    </button>
  )
}

// ─── FieldSelector popover ───────────────────────────────────────────────────

function FieldSelectorPopover({
  currentField,
  onSelect,
  onClose,
  customFieldDefs,
}: {
  currentField: FilterFieldKey
  onSelect: (field: FilterFieldKey) => void
  onClose: () => void
  customFieldDefs?: DBCustomFieldDefinition[]
}) {
  const standardFields = Object.entries(FILTER_FIELD_CONFIG) as [FilterFieldKey, (typeof FILTER_FIELD_CONFIG)[keyof typeof FILTER_FIELD_CONFIG]][]
  const customFields = (customFieldDefs ?? []).filter(d => d.entity_type === 'job')

  const renderButton = (key: FilterFieldKey, label: string) => (
    <button
      key={key}
      onClick={() => { onSelect(key); onClose() }}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '7px 14px',
        border: 'none',
        background: currentField === key ? '#F0F4FF' : 'transparent',
        color: currentField === key ? '#3730a3' : '#1A1A1A',
        fontFamily: "'Montserrat', sans-serif",
        fontSize: 13,
        cursor: 'pointer',
        fontWeight: currentField === key ? 600 : 400,
      }}
      onMouseEnter={e => {
        if (currentField !== key) (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'
      }}
      onMouseLeave={e => {
        if (currentField !== key) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      {label}
    </button>
  )

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        zIndex: 1000,
        background: '#fff',
        border: '1px solid #E8E2D6',
        borderRadius: 12,
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        minWidth: 180,
        maxHeight: 340,
        overflowY: 'auto',
        padding: '6px 0',
      }}
    >
      {standardFields.map(([key, cfg]) => renderButton(key, cfg.label))}

      {customFields.length > 0 && (
        <>
          <div style={{
            padding: '6px 14px 4px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#9CA3AF',
            borderTop: '1px solid #F3F4F6',
            marginTop: 4,
          }}>
            Vlastné polia
          </div>
          {customFields.map(d => renderButton(`cf:${d.field_key}` as FilterFieldKey, d.label))}
        </>
      )}
    </div>
  )
}

// ─── OperatorSelector popover ────────────────────────────────────────────────

function OperatorSelectorPopover({
  operators,
  currentOperator,
  onSelect,
  onClose,
}: {
  operators: FilterOperator[]
  currentOperator: FilterOperator
  onSelect: (op: FilterOperator) => void
  onClose: () => void
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        zIndex: 1000,
        background: '#fff',
        border: '1px solid #E8E2D6',
        borderRadius: 12,
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        minWidth: 190,
        padding: '6px 0',
      }}
    >
      {operators.map(op => (
        <button
          key={op}
          onClick={() => {
            onSelect(op)
            onClose()
          }}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '7px 14px',
            border: 'none',
            background: currentOperator === op ? '#F0F4FF' : 'transparent',
            color: currentOperator === op ? '#3730a3' : '#1A1A1A',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 13,
            cursor: 'pointer',
            fontWeight: currentOperator === op ? 600 : 400,
          }}
          onMouseEnter={e => {
            if (currentOperator !== op) (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'
          }}
          onMouseLeave={e => {
            if (currentOperator !== op) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          }}
        >
          {OPERATOR_LABELS[op]}
        </button>
      ))}
    </div>
  )
}

// ─── Multi-select popover ────────────────────────────────────────────────────

function MultiSelectPopover({
  options,
  selected,
  onToggle,
  onClose,
}: {
  options: { value: string; label: string; color?: string }[]
  selected: string[]
  onToggle: (value: string) => void
  onClose: () => void
}) {
  const selectedSet = new Set(selected)
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        zIndex: 1000,
        background: '#fff',
        border: '1px solid #E8E2D6',
        borderRadius: 12,
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        minWidth: 210,
        maxHeight: 280,
        overflowY: 'auto',
        padding: '6px 0',
      }}
    >
      {options.map(opt => {
        const checked = selectedSet.has(opt.value)
        return (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              textAlign: 'left',
              padding: '7px 14px',
              border: 'none',
              background: checked ? '#F0F4FF' : 'transparent',
              color: '#1A1A1A',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 13,
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              if (!checked) (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'
            }}
            onMouseLeave={e => {
              if (!checked) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: checked ? 'none' : '1.5px solid #D1D5DB',
                background: checked ? '#4F46E5' : '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 10,
                color: '#fff',
                fontWeight: 700,
              }}
            >
              {checked ? '✓' : ''}
            </span>
            {opt.color && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: opt.color,
                  flexShrink: 0,
                }}
              />
            )}
            <span>{opt.label}</span>
          </button>
        )
      })}
      {selected.length > 0 && (
        <div style={{ padding: '8px 14px 4px' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '7px 0',
              borderRadius: 7,
              border: 'none',
              background: '#4F46E5',
              color: '#fff',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Potvrdiť ({selected.length})
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Templates popover ───────────────────────────────────────────────────────

function TemplatesPopover({
  templates,
  onApply,
  onClose,
}: {
  templates: FilterTemplate[]
  onApply: (template: FilterTemplate) => void
  onClose: () => void
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        right: 0,
        zIndex: 1000,
        background: '#fff',
        border: '1px solid #E8E2D6',
        borderRadius: 12,
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        minWidth: 240,
        padding: '6px 0',
      }}
    >
      <div
        style={{
          padding: '6px 14px 8px',
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          color: '#9CA3AF',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          borderBottom: '1px solid #F3F4F6',
          marginBottom: 4,
        }}
      >
        Rýchle šablóny
      </div>
      {templates.map(t => (
        <button
          key={t.id}
          onClick={() => {
            onApply(t)
            onClose()
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            textAlign: 'left',
            padding: '8px 14px',
            border: 'none',
            background: 'transparent',
            color: '#1A1A1A',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 13,
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          }}
        >
          <span style={{ fontSize: 16 }}>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

// ─── ValueEditor ─────────────────────────────────────────────────────────────

interface ValueEditorProps {
  rule: FilterRule
  partners: { id: number; name: string }[]
  technicians: { id: number; first_name: string; last_name: string }[]
  onChange: (value: FilterValue) => void
  customFieldDefs?: DBCustomFieldDefinition[]
}

function ValueEditor({ rule, partners, technicians, onChange, customFieldDefs }: ValueEditorProps) {
  const { field, operator, value } = rule
  const fieldCfg = isCustomField(field)
    ? (() => {
        const key = field.slice(3)
        const def = (customFieldDefs ?? []).find(d => d.field_key === key)
        return def ? buildCustomFieldConfig(def) : { label: key, type: 'text' as const, operators: [] }
      })()
    : FILTER_FIELD_CONFIG[field as keyof typeof FILTER_FIELD_CONFIG]

  // No value editors for these operators
  if (NO_VALUE_OPERATORS.has(operator)) {
    return null
  }

  const popover = usePopover()

  // ── Multi-select (enum / id-select / custom-select with is_any_of / is_not_any_of) ──────
  if (
    (fieldCfg.type === 'enum' || fieldCfg.type === 'id-select' || fieldCfg.type === 'custom-select') &&
    (operator === 'is_any_of' || operator === 'is_not_any_of')
  ) {
    // Build options list
    let options: { value: string; label: string; color?: string }[] = []

    if (fieldCfg.staticOptions) {
      options = fieldCfg.staticOptions
    } else if (fieldCfg.optionsKey === 'partners') {
      options = partners.map(p => ({ value: String(p.id), label: p.name }))
    } else if (fieldCfg.optionsKey === 'technicians') {
      options = technicians.map(t => ({
        value: String(t.id),
        label: `${t.first_name} ${t.last_name}`,
      }))
    }

    const selected: string[] = Array.isArray(value) ? (value as string[]) : []

    // Summary label
    let summaryLabel = 'Vybrať...'
    if (selected.length === 1) {
      summaryLabel = options.find(o => o.value === selected[0])?.label ?? selected[0]
    } else if (selected.length === 2) {
      const labels = selected.map(v => options.find(o => o.value === v)?.label ?? v)
      summaryLabel = labels.join(', ')
    } else if (selected.length > 2) {
      const first = options.find(o => o.value === selected[0])?.label ?? selected[0]
      const second = options.find(o => o.value === selected[1])?.label ?? selected[1]
      summaryLabel = `${first}, ${second} +${selected.length - 2}`
    }

    const handleToggle = (val: string) => {
      const next = selected.includes(val)
        ? selected.filter(v => v !== val)
        : [...selected, val]
      onChange(next)
    }

    return (
      <div ref={popover.ref} style={{ position: 'relative' }}>
        <button
          onClick={popover.toggle}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: `1px solid ${popover.open ? '#4F46E5' : '#E8E2D6'}`,
            background: selected.length > 0 ? '#F0F4FF' : '#fff',
            color: selected.length > 0 ? '#3730a3' : '#6B7280',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            maxWidth: 220,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {selected.length > 0 && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#4F46E5',
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {summaryLabel}
          </span>
          <span style={{ color: '#9CA3AF', fontSize: 10, marginLeft: 'auto', flexShrink: 0 }}>▾</span>
        </button>
        {popover.open && (
          <MultiSelectPopover
            options={options}
            selected={selected}
            onToggle={handleToggle}
            onClose={() => popover.setOpen(false)}
          />
        )}
      </div>
    )
  }

  // ── Date: between ────────────────────────────────────────────────────────
  if (fieldCfg.type === 'date' && operator === 'date_between') {
    const dateRange = (value && typeof value === 'object' && !Array.isArray(value) && 'from' in value)
      ? (value as { from?: string; to?: string })
      : { from: '', to: '' }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="date"
          value={dateRange.from ?? ''}
          max={dateRange.to ?? undefined}
          onChange={e => onChange({ from: e.target.value, to: dateRange.to })}
          style={dateInputStyle}
        />
        <span style={{ color: '#9CA3AF', fontSize: 12 }}>–</span>
        <input
          type="date"
          value={dateRange.to ?? ''}
          min={dateRange.from ?? undefined}
          onChange={e => onChange({ from: dateRange.from, to: e.target.value })}
          style={dateInputStyle}
        />
      </div>
    )
  }

  // ── Date: before / after ─────────────────────────────────────────────────
  if (fieldCfg.type === 'date' && (operator === 'date_before' || operator === 'date_after')) {
    return (
      <input
        type="date"
        value={typeof value === 'string' ? value : ''}
        onChange={e => onChange(e.target.value)}
        style={dateInputStyle}
      />
    )
  }

  // ── Date: last N days ────────────────────────────────────────────────────
  if (fieldCfg.type === 'date' && operator === 'date_last_n_days') {
    const nVal = (value && typeof value === 'object' && !Array.isArray(value) && 'n' in value)
      ? (value as { n: number }).n
      : 7

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="number"
          min={1}
          max={365}
          value={nVal}
          onChange={e => onChange({ n: Number(e.target.value) })}
          style={{
            ...textInputStyle,
            width: 60,
          }}
        />
        <span
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 12,
            color: '#6B7280',
          }}
        >
          dní
        </span>
      </div>
    )
  }

  // ── Number input ─────────────────────────────────────────────────────────
  if (fieldCfg.type === 'number') {
    return (
      <input
        type="number"
        placeholder="Číslo..."
        value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
        onChange={e => onChange(e.target.value)}
        style={{ ...textInputStyle, width: 100 }}
      />
    )
  }

  // ── Boolean select ───────────────────────────────────────────────────────
  if (fieldCfg.type === 'boolean') {
    return (
      <select
        value={typeof value === 'string' ? value : ''}
        onChange={e => onChange(e.target.value)}
        style={{ ...textInputStyle, width: 100 }}
      >
        <option value="">–</option>
        <option value="true">Áno</option>
        <option value="false">Nie</option>
      </select>
    )
  }

  // ── Text input (contains, not_contains, starts_with, equals) ────────────
  if (fieldCfg.type === 'text' || (fieldCfg.type === 'enum' && operator === 'equals')) {
    return (
      <input
        type="text"
        placeholder="Hodnota..."
        value={typeof value === 'string' ? value : ''}
        onChange={e => onChange(e.target.value)}
        style={textInputStyle}
      />
    )
  }

  return null
}

// ─── Shared input styles ─────────────────────────────────────────────────────

const textInputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #E8E2D6',
  fontFamily: "'Montserrat', sans-serif",
  fontSize: 12,
  color: '#1A1A1A',
  background: '#fff',
  outline: 'none',
  width: 140,
}

const dateInputStyle: React.CSSProperties = {
  padding: '5px 8px',
  borderRadius: 6,
  border: '1px solid #E8E2D6',
  fontFamily: "'Montserrat', sans-serif",
  fontSize: 12,
  color: '#1A1A1A',
  background: '#fff',
  outline: 'none',
}

// ─── RuleRow ─────────────────────────────────────────────────────────────────

interface RuleRowProps {
  rule: FilterRule
  index: number
  partners: { id: number; name: string }[]
  technicians: { id: number; first_name: string; last_name: string }[]
  onChange: (id: string, updates: Partial<FilterRule>) => void
  onRemove: (id: string) => void
  customFieldDefs?: DBCustomFieldDefinition[]
}

function RuleRow({ rule, index, partners, technicians, onChange, onRemove, customFieldDefs }: RuleRowProps) {
  // Resolve field config — custom fields (cf:) use dynamically built config
  const fieldCfg = isCustomField(rule.field)
    ? (() => {
        const key = rule.field.slice(3)
        const def = (customFieldDefs ?? []).find(d => d.field_key === key)
        return def ? buildCustomFieldConfig(def) : { label: key, type: 'text' as const, operators: ['contains', 'equals', 'is_empty', 'is_not_empty'] as import('@/types/filters').FilterOperator[] }
      })()
    : FILTER_FIELD_CONFIG[rule.field as keyof typeof FILTER_FIELD_CONFIG]

  const fieldPopover = usePopover()
  const operatorPopover = usePopover()

  const handleFieldChange = useCallback(
    (newField: FilterFieldKey) => {
      const newCfg = isCustomField(newField)
        ? (() => {
            const key = newField.slice(3)
            const def = (customFieldDefs ?? []).find(d => d.field_key === key)
            return def ? buildCustomFieldConfig(def) : { operators: ['contains', 'equals'] as import('@/types/filters').FilterOperator[] }
          })()
        : FILTER_FIELD_CONFIG[newField as keyof typeof FILTER_FIELD_CONFIG]
      const firstOp = newCfg.operators[0]
      onChange(rule.id, {
        field: newField,
        operator: firstOp,
        value: NO_VALUE_OPERATORS.has(firstOp) ? null : (firstOp === 'is_any_of' || firstOp === 'is_not_any_of') ? [] : null,
      })
    },
    [rule.id, onChange]
  )

  const handleOperatorChange = useCallback(
    (newOp: FilterOperator) => {
      const needsNoValue = NO_VALUE_OPERATORS.has(newOp)
      const needsArray = newOp === 'is_any_of' || newOp === 'is_not_any_of'
      const needsDateRange = newOp === 'date_between'
      const needsN = newOp === 'date_last_n_days'

      let newValue: FilterValue = null
      if (!needsNoValue) {
        if (needsArray) newValue = []
        else if (needsDateRange) newValue = { from: '', to: '' }
        else if (needsN) newValue = { n: 7 }
        else newValue = ''
      }

      onChange(rule.id, { operator: newOp, value: newValue })
    },
    [rule.id, onChange]
  )

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 0',
        flexWrap: 'wrap',
      }}
    >
      {/* Logic toggle — only for index > 0 */}
      {index > 0 ? (
        <LogicToggle
          value={rule.logic}
          onChange={logic => onChange(rule.id, { logic })}
        />
      ) : (
        <div
          style={{
            minWidth: 56,
            padding: '4px 10px',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            color: '#9CA3AF',
            letterSpacing: '0.04em',
          }}
        >
          KDE
        </div>
      )}

      {/* Field selector */}
      <div ref={fieldPopover.ref} style={{ position: 'relative' }}>
        <button
          onClick={fieldPopover.toggle}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: `1px solid ${fieldPopover.open ? '#4F46E5' : '#E8E2D6'}`,
            background: fieldPopover.open ? '#F0F4FF' : '#fff',
            color: '#1A1A1A',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {fieldCfg.label}
          <span style={{ color: '#9CA3AF', fontSize: 10 }}>▾</span>
        </button>
        {fieldPopover.open && (
          <FieldSelectorPopover
            currentField={rule.field}
            onSelect={handleFieldChange}
            onClose={() => fieldPopover.setOpen(false)}
            customFieldDefs={customFieldDefs}
          />
        )}
      </div>

      {/* Operator selector */}
      <div ref={operatorPopover.ref} style={{ position: 'relative' }}>
        <button
          onClick={operatorPopover.toggle}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: `1px solid ${operatorPopover.open ? '#4F46E5' : '#E8E2D6'}`,
            background: operatorPopover.open ? '#F0F4FF' : '#fff',
            color: '#6B7280',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {OPERATOR_LABELS[rule.operator]}
          <span style={{ color: '#9CA3AF', fontSize: 10 }}>▾</span>
        </button>
        {operatorPopover.open && (
          <OperatorSelectorPopover
            operators={fieldCfg.operators}
            currentOperator={rule.operator}
            onSelect={handleOperatorChange}
            onClose={() => operatorPopover.setOpen(false)}
          />
        )}
      </div>

      {/* Value editor */}
      <ValueEditor
        rule={rule}
        partners={partners}
        technicians={technicians}
        onChange={value => onChange(rule.id, { value })}
        customFieldDefs={customFieldDefs}
      />

      {/* Remove button */}
      <button
        onClick={() => onRemove(rule.id)}
        title="Odstrániť podmienku"
        style={{
          padding: '5px 8px',
          borderRadius: 6,
          border: '1px solid #E8E2D6',
          background: 'transparent',
          color: '#9CA3AF',
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 13,
          cursor: 'pointer',
          lineHeight: 1,
          marginLeft: 2,
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'
          ;(e.currentTarget as HTMLButtonElement).style.color = '#DC2626'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#FECACA'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#E8E2D6'
        }}
      >
        ×
      </button>
    </div>
  )
}

// ─── QueryBuilder main component ─────────────────────────────────────────────

export default function QueryBuilder({
  rules,
  onRulesChange,
  partners,
  technicians,
  totalCount,
  isLoading = false,
  open: externalOpen,
  onOpenChange,
  hideBar = false,
  customFieldDefs,
}: QueryBuilderProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = externalOpen !== undefined
  const panelOpen = isControlled ? externalOpen : internalOpen

  const setPanelOpen = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof val === 'function' ? val(panelOpen) : val
    if (isControlled) {
      onOpenChange?.(next)
    } else {
      setInternalOpen(next)
    }
  }, [isControlled, onOpenChange, panelOpen])

  const templatesPopover = usePopover()

  const hasRules = rules.length > 0

  // Add new default rule
  const handleAddRule = useCallback(() => {
    const newRule: FilterRule = {
      id: newRuleId(),
      logic: 'AND',
      field: 'status',
      operator: 'is_any_of',
      value: [],
    }
    onRulesChange([...rules, newRule])
    setPanelOpen(true)
  }, [rules, onRulesChange])

  // Update a rule field
  const handleRuleChange = useCallback(
    (id: string, updates: Partial<FilterRule>) => {
      onRulesChange(rules.map(r => (r.id === id ? { ...r, ...updates } : r)))
    },
    [rules, onRulesChange]
  )

  // Remove a rule
  const handleRuleRemove = useCallback(
    (id: string) => {
      const next = rules.filter(r => r.id !== id)
      onRulesChange(next)
      if (next.length === 0) setPanelOpen(false)
    },
    [rules, onRulesChange]
  )

  // Clear all rules
  const handleClearAll = useCallback(() => {
    onRulesChange([])
    setPanelOpen(false)
  }, [onRulesChange])

  // Apply a template
  const handleApplyTemplate = useCallback(
    (template: FilterTemplate) => {
      const newRules: FilterRule[] = template.rules.map(r => ({
        ...r,
        id: newRuleId(),
      }))
      onRulesChange(newRules)
      setPanelOpen(true)
    },
    [onRulesChange]
  )

  return (
    <div
      style={{
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      {/* ── Filter bar — hidden when parent provides its own trigger ─────────── */}
      {!hideBar && <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {/* + Podmienka button */}
        <button
          onClick={() => {
            if (!panelOpen) {
              setPanelOpen(true)
              if (rules.length === 0) handleAddRule()
            } else {
              setPanelOpen(false)
            }
          }}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: `1px solid ${panelOpen ? '#4F46E5' : '#E8E2D6'}`,
            background: panelOpen ? '#EEF2FF' : '#fff',
            color: panelOpen ? '#3730a3' : '#1A1A1A',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          Podmienka
        </button>

        {/* Active rules summary chip */}
        {hasRules && (
          <button
            onClick={() => setPanelOpen(p => !p)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid #C7D2FE',
              background: '#EEF2FF',
              color: '#3730a3',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#4F46E5',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {rules.length}
            </span>
            {rules.length === 1 ? 'podmienka' : rules.length < 5 ? 'podmienky' : 'podmienok'}
            {' · '}
            {isLoading ? (
              <span style={{ color: '#9CA3AF' }}>...</span>
            ) : (
              <span>{totalCount} zákaziek</span>
            )}
          </button>
        )}

        {/* Templates button */}
        <div ref={templatesPopover.ref} style={{ position: 'relative' }}>
          <button
            onClick={templatesPopover.toggle}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid #E8E2D6',
              background: '#fff',
              color: '#6B7280',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14 }}>⚡</span>
            Šablóny
          </button>
          {templatesPopover.open && (
            <TemplatesPopover
              templates={FILTER_TEMPLATES}
              onApply={handleApplyTemplate}
              onClose={() => templatesPopover.setOpen(false)}
            />
          )}
        </div>

        {/* Clear all button */}
        {hasRules && (
          <button
            onClick={handleClearAll}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid #FECACA',
              background: '#FEF2F2',
              color: '#DC2626',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Zrušiť všetky
          </button>
        )}
      </div>}

      {/* ── QueryBuilder panel ──────────────────────────────────────────────── */}
      {(hideBar || panelOpen) && (
        <div
          style={{
            marginTop: hideBar ? 0 : 10,
            border: hideBar ? 'none' : '1px solid #E8E2D6',
            borderRadius: hideBar ? 0 : 12,
            background: hideBar ? 'transparent' : '#FAFAF9',
            padding: hideBar ? '12px 0 4px' : '14px 16px 10px',
          }}
        >
          {/* Panel header */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#9CA3AF',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            KDE:
          </div>

          {/* Rule rows */}
          {rules.map((rule, index) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              index={index}
              partners={partners}
              technicians={technicians}
              onChange={handleRuleChange}
              onRemove={handleRuleRemove}
              customFieldDefs={customFieldDefs}
            />
          ))}

          {/* + Add condition button */}
          <button
            onClick={handleAddRule}
            style={{
              marginTop: 8,
              padding: '6px 14px',
              borderRadius: 7,
              border: '1px dashed #D1D5DB',
              background: 'transparent',
              color: '#6B7280',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#4F46E5'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#4F46E5'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#D1D5DB'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#6B7280'
            }}
          >
            <span style={{ fontSize: 14 }}>+</span>
            Pridať podmienku
          </button>

          {/* Footer */}
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: '1px solid #E8E2D6',
              fontSize: 12,
              color: '#9CA3AF',
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {isLoading ? (
              'Načítava...'
            ) : (
              <>
                Zobrazuje:{' '}
                <strong style={{ color: '#1A1A1A' }}>{totalCount}</strong> zákaziek
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// QueryBuilderProps is already exported above via `export interface QueryBuilderProps`
