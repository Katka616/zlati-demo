'use client'

/**
 * HelpPanel — Slide-in contextual help panel (from right side).
 * Shows page-specific help content based on current pathname.
 */

import { usePathname } from 'next/navigation'
import { getHelpContent } from '@/data/helpContent'

interface HelpPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  const pathname = usePathname()
  const content = getHelpContent(pathname, 'admin')

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`help-panel-backdrop${isOpen ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={`help-panel${isOpen ? ' open' : ''}`}
        role="complementary"
        aria-label="Nápoveda"
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--g7)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--gold)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 16,
              flexShrink: 0,
            }}>?</span>
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 600,
              fontSize: 15,
              color: 'var(--dark)',
            }}>
              {content ? content.title : 'Nápoveda'}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Zavrieť nápovedu"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--g4)',
              fontSize: 20,
              lineHeight: 1,
              padding: 4,
              borderRadius: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {!content ? (
            <p style={{ color: 'var(--g4)', fontSize: 14, lineHeight: 1.6 }}>
              Pre túto stránku nie je nápoveda k dispozícii.
            </p>
          ) : (
            <>
              {/* Description */}
              <p style={{
                color: 'var(--g4)',
                fontSize: 14,
                lineHeight: 1.65,
                marginBottom: 24,
              }}>
                {content.description}
              </p>

              {/* Actions */}
              {content.actions.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--g4)',
                    marginBottom: 12,
                  }}>
                    Akcie
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {content.actions.map((action, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '10px 12px',
                          background: 'var(--g7)',
                          borderRadius: 8,
                          borderLeft: '3px solid var(--gold)',
                        }}
                      >
                        <div style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: 'var(--dark)',
                          marginBottom: 3,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                          {action.icon && <span>{action.icon}</span>}
                          {action.label}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--g4)', lineHeight: 1.5 }}>
                          {action.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {content.tips.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--g4)',
                    marginBottom: 12,
                  }}>
                    Tipy
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {content.tips.map((tip, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 8,
                          fontSize: 13,
                          color: 'var(--dark)',
                          lineHeight: 1.55,
                        }}
                      >
                        <span style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }}>•</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related pages */}
              {content.relatedPages && content.relatedPages.length > 0 && (
                <div>
                  <h3 style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--g4)',
                    marginBottom: 12,
                  }}>
                    Súvisiace stránky
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {content.relatedPages.map((page, i) => (
                      <a
                        key={i}
                        href={page.href}
                        onClick={onClose}
                        style={{
                          padding: '6px 12px',
                          background: 'var(--surface)',
                          border: '1px solid var(--gold)',
                          borderRadius: 20,
                          fontSize: 12,
                          color: 'var(--gold)',
                          fontWeight: 600,
                          textDecoration: 'none',
                          transition: 'background 0.15s',
                        }}
                      >
                        {page.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — link to full manual */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--g7)',
          flexShrink: 0,
        }}>
          <a
            href="/admin/manual"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--gold)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: 16 }}>📖</span>
            Otvoriť kompletnú príručku
          </a>
        </div>
      </aside>
    </>
  )
}
