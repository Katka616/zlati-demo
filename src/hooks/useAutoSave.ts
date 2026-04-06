'use client'

import { useEffect, useRef, useCallback } from 'react'
import { saveFormState, loadFormState, clearDraft } from '@/lib/offlineQueue'
import { ProtocolFormData } from '@/types/protocol'

const AUTO_SAVE_INTERVAL = 30_000 // 30 seconds

interface UseAutoSaveOptions {
  taskId: string
  formData: ProtocolFormData
  onRestore: (data: Partial<ProtocolFormData>) => void
  onSaveNotify?: () => void
  onRestoreNotify?: () => void
  enabled?: boolean
}

export function useAutoSave({
  taskId,
  formData,
  onRestore,
  onSaveNotify,
  onRestoreNotify,
  enabled = true,
}: UseAutoSaveOptions) {
  const formDataRef = useRef(formData)
  const hasRestoredRef = useRef(false)

  // Keep ref current
  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  const saveDraft = useCallback(async () => {
    if (!taskId || !enabled) return
    try {
      await saveFormState(taskId, formDataRef.current as unknown as Record<string, unknown>)
      onSaveNotify?.()
    } catch {
      // Silent fail — auto-save is best-effort
    }
  }, [taskId, enabled, onSaveNotify])

  const restoreDraft = useCallback(async () => {
    if (!taskId || !enabled || hasRestoredRef.current) return
    hasRestoredRef.current = true

    try {
      const draft = await loadFormState(taskId)
      if (draft && draft.data) {
        onRestore(draft.data)
        onRestoreNotify?.()
      }
    } catch {
      // Silent fail
    }
  }, [taskId, enabled, onRestore, onRestoreNotify])

  const removeDraft = useCallback(async () => {
    if (!taskId) return
    try {
      await clearDraft(taskId)
    } catch {
      // Silent fail
    }
  }, [taskId])

  // Restore on mount
  useEffect(() => {
    restoreDraft()
  }, [restoreDraft])

  // Periodic auto-save
  useEffect(() => {
    if (!taskId || !enabled) return

    const interval = setInterval(saveDraft, AUTO_SAVE_INTERVAL)
    return () => clearInterval(interval)
  }, [taskId, enabled, saveDraft])

  // Save on visibility change (user switches app)
  useEffect(() => {
    if (!taskId || !enabled) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveDraft()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [taskId, enabled, saveDraft])

  // Save before page unload
  useEffect(() => {
    if (!taskId || !enabled) return

    const handleBeforeUnload = () => {
      // Use sync approach for beforeunload
      if (taskId && formDataRef.current) {
        saveFormState(taskId, formDataRef.current as unknown as Record<string, unknown>).catch(() => {})
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [taskId, enabled])

  return { saveDraft, removeDraft }
}
