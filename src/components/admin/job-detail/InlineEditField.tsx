'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { useInlineEdit } from './hooks/useInlineEdit'

interface InlineEditFieldProps {
  value: string | number | null
  displayValue?: React.ReactNode
  fieldName: string
  fieldType: 'text' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'textarea'
  options?: { value: string; label: string }[]
  placeholder?: string
  onSave: (fieldName: string, value: unknown) => Promise<{ success: boolean }>
  readOnly?: boolean
  validate?: (value: unknown) => string | null
  label?: string
}

/**
 * InlineEditField — click-to-edit field with 4 visual states:
 *   1. Normal: text + faint pencil icon (opacity 0)
 *   2. Hover: yellow highlight + dashed underline
 *   3. Editing: input/select/textarea with gold border + Save/Cancel buttons
 *   4. Saved: green flash for 2 seconds
 *
 * Uses CSS custom properties: var(--gold), var(--g3), var(--dark), var(--g4).
 * Dark mode via [data-theme="dark"] in globals.css.
 * Keyboard: Enter = save (except textarea), Escape = cancel.
 */
export default function InlineEditField({
  value,
  displayValue,
  fieldName,
  fieldType,
  options,
  placeholder,
  onSave,
  readOnly = false,
  validate,
  label,
}: InlineEditFieldProps) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(null)
  const [validationError, setValidationError] = React.useState<string | null>(null)

  const {
    isEditing,
    editValue,
    setEditValue,
    startEdit,
    cancelEdit,
    confirmEdit,
    handleBlur,
    isSaving,
    justSaved,
  } = useInlineEdit(
    fieldName,
    value ?? '',
    onSave as (fieldName: string, value: string | number) => Promise<{ success: boolean }>,
  )

  // Focus the input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      // For text inputs, place cursor at end
      if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        const len = inputRef.current.value.length
        inputRef.current.setSelectionRange(len, len)
      }
    }
  }, [isEditing])

  const handleClick = useCallback(() => {
    if (!readOnly && !isEditing) {
      startEdit()
    }
  }, [readOnly, isEditing, startEdit])

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
      return
    }
    // Enter saves for all types except textarea
    if (e.key === 'Enter' && fieldType !== 'textarea') {
      e.preventDefault()
      if (validate) {
        const err = validate(editValue)
        if (err) { setValidationError(err); return }
      }
      setValidationError(null)
      await confirmEdit()
    }
  }, [cancelEdit, confirmEdit, editValue, fieldType, validate])

  const handleSaveClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (validate) {
      const err = validate(editValue)
      if (err) { setValidationError(err); return }
    }
    setValidationError(null)
    await confirmEdit()
  }, [confirmEdit, editValue, validate])

  const handleCancelClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setValidationError(null)
    cancelEdit()
  }, [cancelEdit])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setEditValue(e.target.value as typeof editValue)
    if (validate) {
      const err = validate(e.target.value)
      setValidationError(err)
    }
  }, [setEditValue, validate])

  // Auto-resize textarea
  const handleTextareaInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  // ── Class names ──────────────────────────────────────────────────────────────

  const containerClass = [
    'inline-edit-field',
    isEditing ? 'inline-edit-field--editing' : '',
    justSaved && !isEditing ? 'inline-edit-field--saved' : '',
  ].filter(Boolean).join(' ')

  // ── Display (non-editing) ────────────────────────────────────────────────────

  const displayText = displayValue ?? (value !== null && value !== undefined && value !== '' ? String(value) : (
    <span style={{ color: 'var(--g4, #9ca3af)', fontStyle: 'italic' }}>{placeholder ?? '—'}</span>
  ))

  if (readOnly) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px' }}>
        {label && <span style={{ color: 'var(--g4, #9ca3af)', marginRight: 4, fontSize: 12 }}>{label}: </span>}
        {displayText}
      </span>
    )
  }

  // ── Editing state ────────────────────────────────────────────────────────────

  if (isEditing) {
    const inputStyle: React.CSSProperties = {
      border: '2px solid var(--gold, #D4A853)',
      borderRadius: 4,
      padding: '4px 8px',
      fontSize: 'inherit',
      fontFamily: 'inherit',
      outline: 'none',
      background: 'var(--w, #fff)',
      color: 'var(--dark, #1f2937)',
      minWidth: 120,
    }

    let inputEl: React.ReactNode

    if (fieldType === 'select' && options) {
      inputEl = (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={String(editValue ?? '')}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={inputStyle}
          disabled={isSaving}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )
    } else if (fieldType === 'textarea') {
      inputEl = (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={String(editValue ?? '')}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onInput={handleTextareaInput}
          placeholder={placeholder}
          disabled={isSaving}
          style={{
            ...inputStyle,
            minHeight: 60,
            resize: 'vertical',
            width: '100%',
          }}
        />
      )
    } else {
      inputEl = (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={fieldType === 'phone' ? 'tel' : fieldType}
          value={String(editValue ?? '')}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={isSaving}
          style={inputStyle}
        />
      )
    }

    return (
      <span className={containerClass} style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
        {label && (
          <span style={{ color: 'var(--g4, #9ca3af)', fontSize: 12, marginBottom: 2 }}>{label}</span>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {inputEl}
          <span className="inline-edit-actions">
            <button
              className="save-btn"
              onMouseDown={handleSaveClick}
              disabled={isSaving}
              title="Uložiť (Enter)"
              aria-label="Uložiť"
            >
              {isSaving ? '⏳' : '✓'}
            </button>
            <button
              className="cancel-btn"
              onMouseDown={handleCancelClick}
              disabled={isSaving}
              title="Zrušiť (Esc)"
              aria-label="Zrušiť"
            >
              ✕
            </button>
          </span>
        </span>
        {validationError && (
          <span style={{ color: 'var(--danger, #ef4444)', fontSize: 11, marginTop: 2 }}>
            {validationError}
          </span>
        )}
      </span>
    )
  }

  // ── Normal / Saved state ─────────────────────────────────────────────────────

  return (
    <span
      className={containerClass}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      title={readOnly ? undefined : 'Kliknúť pre úpravu'}
      aria-label={label ? `${label}: ${value ?? placeholder ?? '—'}` : undefined}
    >
      {label && (
        <span style={{ color: 'var(--g4, #9ca3af)', fontSize: 12, marginRight: 4 }}>{label}: </span>
      )}
      {displayText}
      {!readOnly && (
        <span className="inline-edit-icon" aria-hidden="true">✏️</span>
      )}
    </span>
  )
}
