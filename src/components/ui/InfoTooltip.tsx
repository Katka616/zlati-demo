'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface InfoTooltipProps {
  text: string
  position?: 'above' | 'below'
}

/**
 * InfoTooltip — renders tooltip bubble via React Portal into document.body
 * so it is never clipped by parent overflow: hidden / auto containers.
 */
export default function InfoTooltip({ text, position = 'above' }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false)
  const iconRef = useRef<HTMLSpanElement>(null)
  const bubbleRef = useRef<HTMLSpanElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'above' | 'below' } | null>(null)

  const show = useCallback(() => setVisible(true), [])
  const hide = useCallback(() => setVisible(false), [])
  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setVisible(v => !v)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!visible) return
    function handleClickOutside(e: MouseEvent) {
      if (
        iconRef.current && !iconRef.current.contains(e.target as Node) &&
        bubbleRef.current && !bubbleRef.current.contains(e.target as Node)
      ) {
        setVisible(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [visible])

  // Calculate position when visible
  useEffect(() => {
    if (!visible || !iconRef.current) {
      setCoords(null)
      return
    }

    const calculate = () => {
      const icon = iconRef.current
      if (!icon) return

      const rect = icon.getBoundingClientRect()
      const bubbleWidth = 280
      const bubbleHeight = 120 // conservative estimate
      const gap = 8

      // Decide placement: prefer requested, flip if no room
      let placement = position
      if (placement === 'above' && rect.top < bubbleHeight + gap + 8) {
        placement = 'below'
      } else if (placement === 'below' && rect.bottom + bubbleHeight + gap + 8 > window.innerHeight) {
        placement = 'above'
      }

      // Vertical
      const top = placement === 'above'
        ? rect.top + window.scrollY - gap
        : rect.bottom + window.scrollY + gap

      // Horizontal: center on icon, clamp to viewport
      let left = rect.left + window.scrollX + rect.width / 2
      // Clamp so bubble stays 8px from edges
      left = Math.max(bubbleWidth / 2 + 8, Math.min(left, window.innerWidth - bubbleWidth / 2 - 8))

      setCoords({ top, left, placement })
    }

    calculate()

    // Recalculate on scroll/resize
    window.addEventListener('scroll', calculate, true)
    window.addEventListener('resize', calculate)
    return () => {
      window.removeEventListener('scroll', calculate, true)
      window.removeEventListener('resize', calculate)
    }
  }, [visible, position])

  return (
    <span className="info-tooltip-wrap" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span
        ref={iconRef}
        className="info-tooltip-icon"
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={toggle}
        onFocus={show}
        onBlur={hide}
        role="button"
        aria-label="Vysvetlenie"
        tabIndex={0}
      >
        i
      </span>
      {visible && coords && createPortal(
        <span
          ref={bubbleRef}
          className="info-tooltip-portal-bubble"
          style={{
            position: 'absolute',
            top: coords.placement === 'above' ? coords.top : coords.top,
            left: coords.left,
            transform: coords.placement === 'above'
              ? 'translate(-50%, -100%)'
              : 'translate(-50%, 0)',
            zIndex: 99999,
            maxWidth: 320,
            minWidth: 200,
            width: 'max-content',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 12.5,
            lineHeight: 1.55,
            fontWeight: 400,
            color: '#F5F0E8',
            background: '#2d2d2d',
            boxShadow: '0 4px 16px rgba(0,0,0,0.28)',
            pointerEvents: 'auto',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            letterSpacing: 'normal',
            fontFamily: 'Montserrat, system-ui, sans-serif',
          }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {/* Caret arrow */}
          <span
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              ...(coords.placement === 'above'
                ? {
                    bottom: -5,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '5px solid #2d2d2d',
                  }
                : {
                    top: -5,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderBottom: '5px solid #2d2d2d',
                  }),
              width: 0,
              height: 0,
            }}
          />
          {text}
        </span>,
        document.body
      )}
    </span>
  )
}
