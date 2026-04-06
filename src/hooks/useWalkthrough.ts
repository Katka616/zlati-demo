'use client'

import { useState, useEffect, useCallback } from 'react'

export interface WalkthroughStep {
  /** data-help-target attribute value on the target element */
  target: string
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

interface UseWalkthroughResult {
  shouldShow: boolean
  currentStep: number
  totalSteps: number
  step: WalkthroughStep | null
  next: () => void
  skip: () => void
  reset: () => void
}

function storageKey(techId: number, screen: string) {
  return `walkthrough_${techId}_${screen}`
}

/**
 * Hook managing walkthrough state for a given screen.
 * Completion is stored in localStorage per technician + screen.
 */
export function useWalkthrough(
  screenKey: string,
  technicianId: number | undefined,
  steps: WalkthroughStep[]
): UseWalkthroughResult {
  const [active, setActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // Reset local state when the screen changes; walkthrough is now opt-in.
  useEffect(() => {
    setActive(false)
    setCurrentStep(0)
  }, [technicianId, screenKey, steps.length])

  const markDone = useCallback(() => {
    if (!technicianId) return
    localStorage.setItem(storageKey(technicianId, screenKey), 'done')
    setActive(false)
    setCurrentStep(0)
    // Notify DemoCta that walkthrough finished
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('walkthrough-done'))
    }
  }, [technicianId, screenKey])

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1)
    } else {
      markDone()
    }
  }, [currentStep, steps.length, markDone])

  const skip = useCallback(() => {
    markDone()
  }, [markDone])

  const reset = useCallback(() => {
    if (!technicianId) return
    localStorage.removeItem(storageKey(technicianId, screenKey))
    setCurrentStep(0)
    setActive(true)
  }, [technicianId, screenKey])

  return {
    shouldShow: active && steps.length > 0,
    currentStep,
    totalSteps: steps.length,
    step: active && steps[currentStep] ? steps[currentStep] : null,
    next,
    skip,
    reset,
  }
}

/**
 * Clear all walkthrough completions for a technician.
 * Used by the "Reset tutorials" button in dispatch settings.
 */
export function resetAllWalkthroughs(technicianId: number) {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(`walkthrough_${technicianId}_`)) {
      keys.push(key)
    }
  }
  keys.forEach(k => localStorage.removeItem(k))
  return keys.length
}
