'use client'

/**
 * DemoCta — floating CTA banner shown in demo mode.
 *
 * Appears after walkthrough completes or after 30s timeout.
 * Links to the magic link onboarding flow.
 */

import { useState, useEffect } from 'react'

export default function DemoCta() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('demo-mode') !== 'true') return
    if (sessionStorage.getItem('demo-cta-dismissed') === 'true') return

    // Show after 30s or when walkthrough ends (whichever comes first)
    const timer = setTimeout(() => setVisible(true), 30000)

    const handleWalkthroughDone = () => setVisible(true)
    window.addEventListener('walkthrough-done', handleWalkthroughDone)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('walkthrough-done', handleWalkthroughDone)
    }
  }, [])

  if (!visible || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('demo-cta-dismissed', 'true')
  }

  const presentationUrl = process.env.NEXT_PUBLIC_PRESENTATION_URL || 'https://zlati-prezentacia.vercel.app'

  return (
    <div style={{
      position: 'fixed',
      bottom: 72,
      left: 12,
      right: 12,
      zIndex: 9990,
      animation: 'demoCta-slideUp 0.4s ease-out',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1708, #0f0f0a)',
        border: '1px solid #D4A843',
        borderRadius: 16,
        padding: '16px 18px',
        boxShadow: '0 8px 32px rgba(212,168,67,0.15), 0 2px 8px rgba(0,0,0,0.3)',
        position: 'relative',
      }}>
        {/* Dismiss X */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: 8,
            right: 10,
            background: 'none',
            border: 'none',
            color: '#666',
            fontSize: 16,
            cursor: 'pointer',
            padding: '4px',
          }}
          aria-label="Zavřít"
        >
          ✕
        </button>

        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
          L&iacute;b&iacute; se v&aacute;m to?
        </div>
        <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5, marginBottom: 14 }}>
          Va&scaron;e &uacute;daje u&#x17E; m&aacute;me. Klikn&#x11B;te na odkaz z SMS nebo emailu a potvr&#x10F;te spolupr&aacute;ci.
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={presentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #D4A843, #aa771c)',
              color: '#fff',
              textDecoration: 'none',
              padding: '11px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Zjistit v&iacute;ce &#x2192;
          </a>
          <button
            onClick={handleDismiss}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid #333',
              borderRadius: 10,
              color: '#888',
              fontSize: 12,
              padding: '8px 14px',
              cursor: 'pointer',
            }}
          >
            Pozd&#x11B;ji
          </button>
        </div>
      </div>

      <style>{`
        @keyframes demoCta-slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
