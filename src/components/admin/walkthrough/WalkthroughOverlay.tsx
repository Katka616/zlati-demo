'use client'

/**
 * WalkthroughOverlay
 * Renderuje tmavý overlay so spotlight výrezom nad cieľovým elementom
 * a tooltip kartou s navigáciou. Používa CSS custom properties projektu.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useWalkthroughContext } from './WalkthroughProvider'

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

export default function WalkthroughOverlay() {
  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipWalkthrough,
  } = useWalkthroughContext()

  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [visible, setVisible] = useState(false)
  const rafRef = useRef<number | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── fade-in animation on activation ──
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setVisible(true), 40)
      return () => clearTimeout(timer)
    } else {
      setVisible(false)
    }
  }, [isActive])

  // ── calculate spotlight and tooltip positions ──
  const updatePositions = useCallback(() => {
    if (!currentStep) {
      setSpotlightRect(null)
      setTooltipStyle({})
      return
    }

    const target = document.querySelector<HTMLElement>(
      `[data-walkthrough="${currentStep.target}"]`,
    )

    if (!target) {
      // No target found — center tooltip
      setSpotlightRect(null)
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: 360,
        width: 'calc(100vw - 48px)',
        zIndex: 10001,
      })
      return
    }

    // Scroll into view if not visible — use instant to avoid timing issues
    const elemRect = target.getBoundingClientRect()
    const isInViewport =
      elemRect.top >= 0 &&
      elemRect.left >= 0 &&
      elemRect.bottom <= window.innerHeight &&
      elemRect.right <= window.innerWidth

    if (!isInViewport) {
      target.scrollIntoView({ behavior: 'instant', block: 'center' })
    }

    // Always recalculate after scroll (getBoundingClientRect is now up-to-date)
    const rect = target.getBoundingClientRect()
    const padding = currentStep.highlightPadding ?? 8

    setSpotlightRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    })

    const tooltipWidth = Math.min(window.innerWidth - 32, 360)
    const tooltipHeight = 200 // conservative estimate
    const vw = window.innerWidth
    const vh = window.innerHeight

    let top: number
    let left: number

    switch (currentStep.position) {
      case 'bottom':
        top = rect.bottom + padding + 12
        left = Math.max(
          16,
          Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, vw - tooltipWidth - 16),
        )
        if (top + tooltipHeight > vh - 16) {
          top = rect.top - padding - tooltipHeight - 12
        }
        break
      case 'top':
        top = rect.top - padding - tooltipHeight - 12
        left = Math.max(
          16,
          Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, vw - tooltipWidth - 16),
        )
        if (top < 16) {
          top = rect.bottom + padding + 12
        }
        break
      case 'left':
        top = Math.max(16, Math.min(rect.top + rect.height / 2 - tooltipHeight / 2, vh - tooltipHeight - 16))
        left = Math.max(16, rect.left - tooltipWidth - 12)
        if (left < 16) {
          left = Math.min(rect.right + 12, vw - tooltipWidth - 16)
        }
        break
      case 'right':
        top = Math.max(16, Math.min(rect.top + rect.height / 2 - tooltipHeight / 2, vh - tooltipHeight - 16))
        left = Math.min(rect.right + 12, vw - tooltipWidth - 16)
        if (left + tooltipWidth > vw - 16) {
          left = Math.max(16, rect.left - tooltipWidth - 12)
        }
        break
      default:
        top = rect.bottom + 12
        left = 16
    }

    setTooltipStyle({
      position: 'fixed',
      top,
      left,
      width: tooltipWidth,
      zIndex: 10001,
    })
  }, [currentStep])

  // Recalculate on step change and on scroll/resize
  useEffect(() => {
    if (!isActive) return

    // Initial calculation + secondary recalc after layout settles
    updatePositions()
    retryRef.current = setTimeout(updatePositions, 300)

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
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [isActive, updatePositions])

  if (!isActive || !currentStep) return null

  const isFirst = currentStepIndex === 0
  const isLast = currentStepIndex === totalSteps - 1

  return (
    <>
      {/* ── Dark backdrop ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        {/* When spotlight is active, ONLY use box-shadow for dark mask
            so the spotlight area is truly transparent.
            When no target, show full dark background. */}
        {!spotlightRect && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)' }} />
        )}

        {/* Spotlight cutout — transparent box, dark mask via box-shadow */}
        {spotlightRect && (
          <div
            className="walkthrough-spotlight"
            style={{
              position: 'absolute',
              top: spotlightRect.top,
              left: spotlightRect.left,
              width: spotlightRect.width,
              height: spotlightRect.height,
            }}
          />
        )}
      </div>

      {/* ── Click-anywhere-to-advance layer (pointer events) ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          cursor: 'default',
        }}
        onClick={nextStep}
        aria-hidden="true"
      />

      {/* ── Tooltip card ── */}
      <div
        className="walkthrough-tooltip"
        role="dialog"
        aria-modal="false"
        aria-label={`Krok ${currentStepIndex + 1} z ${totalSteps}: ${currentStep.title}`}
        style={{
          ...tooltipStyle,
          opacity: visible ? 1 : 0,
          transform: tooltipStyle.transform
            ? tooltipStyle.transform
            : visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step counter */}
        <div
          className="walkthrough-step-counter"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--gold)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Krok {currentStepIndex + 1} z {totalSteps}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--dark, #1f2937)',
            marginBottom: 6,
            lineHeight: 1.3,
          }}
        >
          {currentStep.title}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 13,
            color: 'var(--g4, #4B5563)',
            lineHeight: 1.55,
            marginBottom: 14,
          }}
        >
          {currentStep.description}
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentStepIndex ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: i === currentStepIndex ? 'var(--gold)' : 'var(--g7, #D1D5DB)',
                transition: 'width 0.2s ease, background 0.2s ease',
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="walkthrough-nav" style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Skip / left side */}
          <button
            className="wt-skip"
            onClick={skipWalkthrough}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--g4, #6b7280)',
              fontSize: 13,
              cursor: 'pointer',
              padding: '6px 0',
              fontFamily: 'inherit',
              textDecoration: 'underline',
            }}
          >
            Preskočiť
          </button>

          {/* Right side: Späť + Ďalej */}
          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirst && (
              <button
                className="wt-secondary"
                onClick={prevStep}
                style={{
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: 'var(--g2, #e5e7eb)',
                  color: 'var(--g4, #4b5563)',
                }}
              >
                ← Späť
              </button>
            )}
            <button
              className="wt-primary"
              onClick={nextStep}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: 'var(--gold, #d4a853)',
                color: '#fff',
                minWidth: 80,
              }}
            >
              {isLast ? 'Hotovo ✓' : 'Ďalej →'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
