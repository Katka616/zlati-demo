'use client'

/**
 * Walkthrough — interaktívny step-by-step tutoriál pre dispatch obrazovky.
 *
 * Zobrazuje tmavý overlay so "spotlight" výrezom nad cieľovým elementom
 * a tooltip s popisom kroku. Dokončenie sa ukladá do localStorage
 * (per technik + per obrazovka), takže sa tutoriál nezobrazí znovu.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useWalkthrough } from '@/hooks/useWalkthrough'
import { getWalkthroughSteps } from '@/data/helpContent'
import type { Lang } from '@/data/helpContent'
import { getTranslation } from '@/lib/i18n'

interface Props {
  technicianId: number | undefined
  lang?: Lang
}

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

export default function Walkthrough({ technicianId, lang = 'sk' }: Props) {
  const t = (key: string) => getTranslation(lang, key)
  const pathname = usePathname()
  const steps = getWalkthroughSteps(pathname, lang)
  const { shouldShow, currentStep, totalSteps, step, next, skip, reset } = useWalkthrough(
    pathname,
    technicianId,
    steps,
  )

  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [visible, setVisible] = useState(false)
  const rafRef = useRef<number | null>(null)

  // Listen for external trigger (from HelpTip "Spustiť sprievodcu" button)
  useEffect(() => {
    const handleTrigger = () => {
      if (steps.length > 0) {
        reset()
      }
    }
    window.addEventListener('trigger-walkthrough', handleTrigger)
    return () => window.removeEventListener('trigger-walkthrough', handleTrigger)
  }, [steps.length, reset])

  // Auto-trigger walkthrough in demo mode on every page navigation
  useEffect(() => {
    if (typeof window === 'undefined') return
    const isDemo = sessionStorage.getItem('demo-mode') === 'true'
    if (!isDemo || steps.length === 0 || !technicianId) return
    // Small delay to let the page render and data-help-target elements mount
    const timer = setTimeout(() => reset(), 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, steps.length, technicianId])

  // Animate in when walkthrough becomes active
  useEffect(() => {
    if (shouldShow) {
      const timer = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(timer)
    } else {
      setVisible(false)
    }
  }, [shouldShow])

  // Find target element and compute spotlight + tooltip positions
  const updatePositions = useCallback(() => {
    if (!step) {
      setSpotlightRect(null)
      setTooltipStyle({})
      return
    }

    const target = document.querySelector<HTMLElement>(`[data-help-target="${step.target}"]`)
    if (!target) {
      // No target found — skip to next step automatically
      next()
      return
    }

    const rect = target.getBoundingClientRect()
    const padding = 12

    setSpotlightRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    })

    // Measure actual tooltip height instead of guessing
    const tooltipEl = document.querySelector<HTMLElement>('.walkthrough-tooltip')
    const tooltipWidth = Math.min(window.innerWidth - 32, 340)
    const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 220
    const gap = 16 // space between tooltip and spotlight
    const vw = window.innerWidth
    const vh = window.innerHeight

    let top: number
    let left: number

    switch (step.position) {
      case 'bottom':
        top = rect.bottom + padding + gap
        left = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, vw - tooltipWidth - 16))
        // If overflows bottom, flip to top
        if (top + tooltipHeight > vh - 16) {
          top = rect.top - padding - tooltipHeight - gap
        }
        break
      case 'top':
        top = rect.top - padding - tooltipHeight - gap
        left = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, vw - tooltipWidth - 16))
        // If overflows top, flip to bottom
        if (top < 16) {
          top = rect.bottom + padding + gap
        }
        break
      case 'left':
        top = Math.max(16, Math.min(rect.top + rect.height / 2 - tooltipHeight / 2, vh - tooltipHeight - 16))
        left = Math.max(16, rect.left - tooltipWidth - gap)
        break
      case 'right':
        top = Math.max(16, Math.min(rect.top + rect.height / 2 - tooltipHeight / 2, vh - tooltipHeight - 16))
        left = Math.min(rect.right + gap, vw - tooltipWidth - 16)
        break
      default:
        top = rect.bottom + gap
        left = 16
    }

    setTooltipStyle({
      position: 'fixed',
      top,
      left,
      width: tooltipWidth,
      zIndex: 9999,
    })
  }, [step])

  // Recalculate on step change and on scroll/resize
  useEffect(() => {
    if (!shouldShow) return

    updatePositions()

    const onResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updatePositions)
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [shouldShow, updatePositions])

  if (!shouldShow || !step) return null

  const isLast = currentStep === totalSteps - 1

  return (
    <>
      {/* Overlay with spotlight cutout */}
      <div
        className="walkthrough-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9997,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
          pointerEvents: 'none',
        }}
      >
        {spotlightRect ? (
          /* Spotlight cutout — single box-shadow creates the dark overlay with a transparent hole */
          <div
            style={{
              position: 'absolute',
              top: spotlightRect.top,
              left: spotlightRect.left,
              width: spotlightRect.width,
              height: spotlightRect.height,
              borderRadius: 12,
              background: 'transparent',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
              border: '2px solid var(--gold, #D4A843)',
            }}
          />
        ) : (
          /* No target found — full dark background */
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
        )}
      </div>

      {/* Click-anywhere-to-skip overlay (pointer events layer) */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          cursor: 'default',
        }}
        onClick={skip}
        aria-hidden="true"
      />

      {/* Tooltip */}
      <div
        className="walkthrough-tooltip"
        style={{
          ...tooltipStyle,
          background: 'var(--surface)',
          borderRadius: 12,
          padding: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
          border: '1px solid var(--border, rgba(0,0,0,0.08))',
          opacity: visible ? 1 : 0,
          transform: tooltipStyle.transform
            ? tooltipStyle.transform
            : visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step counter */}
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--gold)',
          letterSpacing: '0.04em',
          marginBottom: 6,
          textTransform: 'uppercase',
        }}>
          {currentStep + 1} z {totalSteps}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--dark)',
          marginBottom: 6,
          lineHeight: 1.3,
        }}>
          {step.title}
        </div>

        {/* Description */}
        <div style={{
          fontSize: 13,
          color: 'var(--g4, #4B5563)',
          lineHeight: 1.55,
          marginBottom: 14,
        }}>
          {step.description}
        </div>

        {/* Progress dots */}
        <div style={{
          display: 'flex',
          gap: 5,
          marginBottom: 14,
        }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentStep ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: i === currentStep ? 'var(--gold)' : 'var(--g7, #D1D5DB)',
                transition: 'width 0.2s ease, background 0.2s ease',
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={skip}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--g4, #6B7280)',
              fontSize: 13,
              cursor: 'pointer',
              padding: '6px 0',
              fontWeight: 500,
            }}
          >
            {t('help.walkthroughSkip')}
          </button>
          <button
            onClick={next}
            style={{
              background: 'var(--gold)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              minWidth: 80,
            }}
          >
            {isLast ? t('help.walkthroughDone') : t('help.walkthroughNext')}
          </button>
        </div>
      </div>
    </>
  )
}
