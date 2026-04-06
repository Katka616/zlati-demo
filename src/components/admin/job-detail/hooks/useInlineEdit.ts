'use client'

import { useState, useRef, useCallback } from 'react'

/**
 * useInlineEdit — manages the editing state lifecycle for an inline-editable field.
 *
 * Features:
 *   - isEditing / editValue / setEditValue: controlled input state
 *   - startEdit / cancelEdit / confirmEdit: lifecycle methods
 *   - isSaving: async save in progress
 *   - justSaved: true for 2s after a successful save (triggers green flash)
 *   - Blur behavior: saves ONLY if value changed AND user didn't click Cancel
 *   - isCancelling ref prevents blur-save race condition when Cancel is clicked
 */
export function useInlineEdit<T>(
  fieldName: string,
  currentValue: T,
  onSave: (fieldName: string, value: T) => Promise<{ success: boolean }>,
) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState<T>(currentValue)
  const [isSaving, setIsSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  // Ref to track cancellation — prevents blur from triggering a save when Cancel is clicked
  const isCancellingRef = useRef(false)
  // Timer ref to clear justSaved after 2s
  const justSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startEdit = useCallback(() => {
    isCancellingRef.current = false
    setEditValue(currentValue)
    setIsEditing(true)
  }, [currentValue])

  const cancelEdit = useCallback(() => {
    isCancellingRef.current = true
    setIsEditing(false)
    setEditValue(currentValue)
  }, [currentValue])

  const confirmEdit = useCallback(async () => {
    // Do nothing if value hasn't changed
    if (editValue === currentValue) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      const result = await onSave(fieldName, editValue)
      if (result.success) {
        setIsEditing(false)
        setJustSaved(true)
        // Clear any previous timer
        if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current)
        justSavedTimerRef.current = setTimeout(() => {
          setJustSaved(false)
          justSavedTimerRef.current = null
        }, 2000)
      }
    } finally {
      setIsSaving(false)
    }
  }, [editValue, currentValue, fieldName, onSave])

  /**
   * handleBlur — called when the input loses focus.
   * Saves only if:
   *   1. value has changed
   *   2. user did NOT click Cancel (isCancellingRef.current is false)
   */
  const handleBlur = useCallback(async () => {
    // Give a tiny tick so the Cancel button's onClick fires before blur
    await new Promise(resolve => setTimeout(resolve, 0))

    if (isCancellingRef.current) {
      isCancellingRef.current = false
      return
    }

    if (!isEditing) return

    await confirmEdit()
  }, [isEditing, confirmEdit])

  return {
    isEditing,
    editValue,
    setEditValue,
    startEdit,
    cancelEdit,
    confirmEdit,
    handleBlur,
    isSaving,
    justSaved,
  }
}
