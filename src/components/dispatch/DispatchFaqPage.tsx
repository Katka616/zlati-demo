'use client'

/**
 * DispatchFaqPage — Full FAQ page for dispatch (technician) app.
 *
 * Features:
 * - Category chip filter (horizontal scroll)
 * - Search with diacritics normalization
 * - Native <details>/<summary> accordion
 * - "Contact dispatcher" button at bottom
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Lang } from '@/data/helpContent'
import { DISPATCH_FAQ } from '@/data/dispatchFaqContent'

interface Props {
  lang: Lang
}

// Normalize text for diacritics-insensitive search
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const UI = {
  sk: {
    title: 'FAQ / Pomoc',
    searchPlaceholder: 'Hľadať...',
    allCategories: 'Všetky',
    contactDispatcher: '💬 Kontaktovať dispečera',
    noResults: 'Žiadne výsledky pre "{{query}}"',
    back: 'Späť',
  },
  cz: {
    title: 'FAQ / Pomoc',
    searchPlaceholder: 'Hledat...',
    allCategories: 'Vše',
    contactDispatcher: '💬 Kontaktovat dispečera',
    noResults: 'Žádné výsledky pro "{{query}}"',
    back: 'Zpět',
  },
} as const

export default function DispatchFaqPage({ lang }: Props) {
  const router = useRouter()
  const ui = UI[lang]
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const normalizedSearch = normalize(search)

  const filteredCategories = useMemo(() => {
    return DISPATCH_FAQ
      .filter((cat) => activeCategory === 'all' || cat.id === activeCategory)
      .map((cat) => ({
        ...cat,
        entries: cat.entries.filter((entry) => {
          if (!normalizedSearch) return true
          const q = normalize(entry.question[lang])
          const a = normalize(entry.answer[lang])
          return q.includes(normalizedSearch) || a.includes(normalizedSearch)
        }),
      }))
      .filter((cat) => cat.entries.length > 0)
  }, [activeCategory, normalizedSearch, lang])

  const totalVisible = filteredCategories.reduce((s, c) => s + c.entries.length, 0)

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: 100,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 20px 12px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => router.back()}
          aria-label={ui.back}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 22,
            cursor: 'pointer',
            color: 'var(--dark)',
            padding: '4px 8px 4px 0',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ←
        </button>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--dark)',
          fontFamily: 'Cinzel, serif',
        }}>
          {ui.title}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 20px 0' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '10px 14px',
        }}>
          <span style={{ fontSize: 16, color: 'var(--g5)', flexShrink: 0 }}>🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ui.searchPlaceholder}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: 15,
              color: 'var(--dark)',
              flex: 1,
              fontFamily: 'Montserrat, sans-serif',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--g4)',
                fontSize: 16,
                padding: 0,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '12px 20px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        flexShrink: 0,
      }}>
        {/* "All" chip */}
        <button
          onClick={() => setActiveCategory('all')}
          style={{
            padding: '7px 14px',
            borderRadius: 20,
            border: activeCategory === 'all'
              ? '2px solid var(--gold)'
              : '1px solid var(--border)',
            background: activeCategory === 'all' ? 'var(--gold-bg)' : 'var(--bg-card)',
            color: 'var(--dark)',
            fontSize: 13,
            fontWeight: activeCategory === 'all' ? 700 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            fontFamily: 'Montserrat, sans-serif',
          }}
        >
          {ui.allCategories}
        </button>

        {DISPATCH_FAQ.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '7px 14px',
              borderRadius: 20,
              border: activeCategory === cat.id
                ? '2px solid var(--gold)'
                : '1px solid var(--border)',
              background: activeCategory === cat.id ? 'var(--gold-bg)' : 'var(--bg-card)',
              color: 'var(--dark)',
              fontSize: 13,
              fontWeight: activeCategory === cat.id ? 700 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            {cat.icon} {cat.label[lang]}
          </button>
        ))}
      </div>

      {/* FAQ content */}
      <div style={{ flex: 1, padding: '0 20px' }}>
        {totalVisible === 0 && search ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 20px',
            color: 'var(--g4)',
            fontSize: 15,
          }}>
            {ui.noResults.replace('{{query}}', search)}
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div key={cat.id} style={{ marginBottom: 24 }}>
              {/* Category heading */}
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--gold)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span>{cat.icon}</span>
                <span>{cat.label[lang]}</span>
              </div>

              {/* Accordion entries */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                overflow: 'hidden',
              }}>
                {cat.entries.map((entry, idx) => (
                  <details
                    key={entry.id}
                    style={{
                      borderBottom: idx < cat.entries.length - 1
                        ? '1px solid var(--border)'
                        : 'none',
                    }}
                  >
                    <summary style={{
                      padding: '14px 16px',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--dark)',
                      lineHeight: 1.4,
                      listStyle: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                    }}>
                      <span>{entry.question[lang]}</span>
                      <span style={{
                        color: 'var(--gold)',
                        fontSize: 18,
                        flexShrink: 0,
                        lineHeight: 1,
                        fontWeight: 400,
                      }}>
                        ›
                      </span>
                    </summary>
                    <div style={{
                      padding: '0 16px 16px',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      color: 'var(--g4)',
                      borderTop: '1px solid var(--border)',
                      paddingTop: 12,
                    }}>
                      {entry.answer[lang]}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Contact dispatcher button */}
      <div style={{
        padding: '16px 20px',
        position: 'sticky',
        bottom: 70,
      }}>
        <button
          onClick={() => router.push('/dispatch/chat')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '14px 16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--dark)',
            cursor: 'pointer',
            fontFamily: 'Montserrat, sans-serif',
          }}
        >
          {ui.contactDispatcher}
        </button>
      </div>
    </div>
  )
}
