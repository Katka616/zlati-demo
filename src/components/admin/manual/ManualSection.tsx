'use client'

/**
 * ManualSection — Jedna sekcia systémovej príručky.
 * Collapsible s animáciou, sidebar-friendly scroll-targets.
 *
 * SECURITY NOTE: dangerouslySetInnerHTML is safe here — content comes
 * exclusively from our static manualData.ts file, never from user input or DB.
 */

import { useState } from 'react'
import type { ManualSection as ManualSectionType } from './manualData'

interface Props {
  section: ManualSectionType
}

export default function ManualSection({ section }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <section
      id={section.id}
      style={{
        marginBottom: 48,
        scrollMarginTop: 80,
      }}
    >
      {/* Section header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          cursor: 'pointer',
          userSelect: 'none',
          marginBottom: collapsed ? 0 : 24,
          paddingBottom: 14,
          borderBottom: '2px solid var(--g3, #E8E2D6)',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            background: 'linear-gradient(135deg, #D4A843, #b8882a)',
            color: '#1a1a2e',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Cinzel', serif",
            fontSize: '0.95rem',
            fontWeight: 700,
            flexShrink: 0,
            boxShadow: '0 3px 10px rgba(212,168,67,0.35)',
          }}
        >
          {section.number}
        </div>
        <h2
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '1.35rem',
            fontWeight: 700,
            color: '#1a1a2e',
            margin: 0,
            flex: 1,
          }}
        >
          {section.title}
        </h2>
        <span
          style={{
            color: '#5a5a6e',
            fontSize: '1rem',
            transition: 'transform 0.25s ease',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        >
          &#9660;
        </span>
      </div>

      {/* Section body */}
      {!collapsed && (
        <div>
          {section.intro && (
            <p
              style={{
                lineHeight: 1.75,
                color: '#2d2d2d',
                marginBottom: 20,
                fontSize: '0.93rem',
              }}
              dangerouslySetInnerHTML={{ __html: section.intro }}
            />
          )}

          {section.subsections.map((sub) => (
            <div
              key={sub.id}
              id={sub.id}
              style={{
                marginBottom: 32,
                scrollMarginTop: 80,
              }}
            >
              <h3
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  color: '#16213e',
                  marginBottom: 12,
                  paddingLeft: 14,
                  borderLeft: '3px solid #D4A843',
                }}
              >
                {sub.title}
              </h3>
              <div
                className="manual-content"
                dangerouslySetInnerHTML={{ __html: sub.content }}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
