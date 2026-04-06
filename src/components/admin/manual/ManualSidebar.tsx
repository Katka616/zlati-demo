'use client'

/**
 * ManualSidebar — Bočná navigácia systémovej príručky.
 * Sticky, scrollovateľná, s highlight aktívnej sekcie.
 */

import { MANUAL_SECTIONS } from './manualData'

interface Props {
  activeId: string
  onNavigate: (id: string) => void
}

const SECTION_GROUPS: { label: string; ids: string[] }[] = [
  { label: 'Základy', ids: ['intro', 'pipeline'] },
  { label: 'Rozhrania', ids: ['admin', 'dispatch', 'portal'] },
  { label: 'Systém', ids: ['automations', 'pricing', 'security'] },
]

export default function ManualSidebar({ activeId, onNavigate }: Props) {
  return (
    <nav
      style={{
        width: 260,
        flexShrink: 0,
        position: 'sticky',
        top: 80,
        alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        background: '#16213e',
        borderRadius: 12,
        padding: '16px 0',
      }}
    >
      <div
        style={{
          padding: '0 20px 12px',
          fontFamily: "'Cinzel', serif",
          fontSize: '0.7rem',
          fontWeight: 600,
          color: '#D4A843',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          borderBottom: '1px solid rgba(212,168,67,0.15)',
          marginBottom: 8,
        }}
      >
        Obsah
      </div>

      {SECTION_GROUPS.map((group) => (
        <div key={group.label}>
          <div
            style={{
              padding: '10px 20px 4px',
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.25)',
            }}
          >
            {group.label}
          </div>

          {group.ids.map((sectionId) => {
            const section = MANUAL_SECTIONS.find((s) => s.id === sectionId)
            if (!section) return null
            const isActive = activeId === section.id || section.subsections.some((s) => s.id === activeId)

            return (
              <div key={section.id}>
                <button
                  onClick={() => onNavigate(section.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 20px',
                    color: isActive ? '#D4A843' : 'rgba(255,255,255,0.65)',
                    background: isActive ? 'rgba(212,168,67,0.12)' : 'transparent',
                    borderLeft: isActive ? '3px solid #D4A843' : '3px solid transparent',
                    border: 'none',
                    borderRight: 'none',
                    borderTop: 'none',
                    borderBottom: 'none',
                    borderLeftWidth: 3,
                    borderLeftStyle: 'solid',
                    borderLeftColor: isActive ? '#D4A843' : 'transparent',
                    textAlign: 'left',
                    fontSize: '0.82rem',
                    fontWeight: isActive ? 600 : 400,
                    fontFamily: "'Montserrat', sans-serif",
                    cursor: 'pointer',
                    lineHeight: 1.4,
                    transition: 'all 0.18s',
                  }}
                >
                  {section.number}. {section.title}
                </button>

                {isActive &&
                  section.subsections.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => onNavigate(sub.id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '5px 20px 5px 36px',
                        color: activeId === sub.id ? 'rgba(212,168,67,0.85)' : 'rgba(255,255,255,0.4)',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        fontSize: '0.77rem',
                        fontFamily: "'Montserrat', sans-serif",
                        cursor: 'pointer',
                        lineHeight: 1.4,
                        transition: 'color 0.18s',
                        fontWeight: activeId === sub.id ? 500 : 400,
                      }}
                    >
                      {sub.title}
                    </button>
                  ))}
              </div>
            )
          })}
        </div>
      ))}

      <div
        style={{
          padding: '16px 20px 8px',
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.2)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          marginTop: 12,
        }}
      >
        Verzia 2.0 | Aktualizované: 1.4.2026
      </div>
    </nav>
  )
}
