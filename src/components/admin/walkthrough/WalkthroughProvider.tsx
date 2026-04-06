'use client'

/**
 * WalkthroughProvider
 * React Context provider pre správu stavu interaktívneho sprievodcu v admin CRM.
 * Dokončenie sa oznamuje cez onComplete callback (volajúca stránka si uloží stav).
 */

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import type { WalkthroughStep } from './walkthroughSteps'

// ─── Context types ────────────────────────────────────────────────────────────

export interface WalkthroughContextValue {
  isActive: boolean
  currentStepIndex: number
  currentStep: WalkthroughStep | null
  totalSteps: number
  startWalkthrough: (steps: WalkthroughStep[]) => void
  nextStep: () => void
  prevStep: () => void
  skipWalkthrough: () => void
  goToStep: (index: number) => void
}

const WalkthroughContext = createContext<WalkthroughContextValue | null>(null)

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWalkthroughContext(): WalkthroughContextValue {
  const ctx = useContext(WalkthroughContext)
  if (!ctx) {
    throw new Error('useWalkthroughContext must be used inside WalkthroughProvider')
  }
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface WalkthroughProviderProps {
  children: ReactNode
  /** Called when walkthrough is completed or skipped */
  onComplete?: () => void
}

export default function WalkthroughProvider({
  children,
  onComplete,
}: WalkthroughProviderProps) {
  const [isActive, setIsActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const stepsRef = useRef<WalkthroughStep[]>([])
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // ── mark done ──
  const markDone = useCallback(() => {
    setIsActive(false)
    setCurrentStepIndex(0)
    stepsRef.current = []
    onCompleteRef.current?.()
  }, [])

  // ── API ──
  const startWalkthrough = useCallback(
    (steps: WalkthroughStep[]) => {
      if (!steps.length) return
      stepsRef.current = steps
      setCurrentStepIndex(0)
      setIsActive(true)
    },
    [],
  )

  const nextStep = useCallback(() => {
    const total = stepsRef.current.length
    setCurrentStepIndex(prev => {
      if (prev >= total - 1) {
        // last step → mark done
        markDone()
        return 0
      }
      return prev + 1
    })
  }, [markDone])

  const prevStep = useCallback(() => {
    setCurrentStepIndex(prev => Math.max(0, prev - 1))
  }, [])

  const skipWalkthrough = useCallback(() => {
    markDone()
  }, [markDone])

  const goToStep = useCallback((index: number) => {
    const total = stepsRef.current.length
    if (index >= 0 && index < total) {
      setCurrentStepIndex(index)
    }
  }, [])

  const currentStep =
    isActive && stepsRef.current[currentStepIndex] ? stepsRef.current[currentStepIndex] : null

  const value: WalkthroughContextValue = {
    isActive,
    currentStepIndex,
    currentStep,
    totalSteps: stepsRef.current.length,
    startWalkthrough,
    nextStep,
    prevStep,
    skipWalkthrough,
    goToStep,
  }

  return (
    <WalkthroughContext.Provider value={value}>
      {children}
    </WalkthroughContext.Provider>
  )
}
