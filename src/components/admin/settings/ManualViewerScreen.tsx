'use client'

/**
 * ManualViewerScreen — Systémová príručka Zlatí Řemeslníci v2.
 *
 * Natívny React komponent (nahradil iframe + statický HTML).
 * Obsahuje sidebar navigáciu, fulltextové vyhľadávanie a collapsible sekcie.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import ManualSidebar from '@/components/admin/manual/ManualSidebar'
import ManualSection from '@/components/admin/manual/ManualSection'
import { MANUAL_SECTIONS, MANUAL_LAST_UPDATED } from '@/components/admin/manual/manualData'

export default function ManualViewerScreen() {
  const [activeId, setActiveId] = useState('intro')
  const [search, setSearch] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)

  const handleNavigate = useCallback((id: string) => {
    setActiveId(id)
    setMobileNavOpen(false)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // Track active section on scroll
  useEffect(() => {
    const allIds = MANUAL_SECTIONS.flatMap((s) => [s.id, ...s.subsections.map((sub) => sub.id)])

    const handleScroll = () => {
      let current = allIds[0]
      for (const id of allIds) {
        const el = document.getElementById(id)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= 120) current = id
        }
      }
      setActiveId(current)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Filter sections by search
  const filteredSections = search.trim()
    ? MANUAL_SECTIONS.map((section) => ({
        ...section,
        subsections: section.subsections.filter(
          (sub) =>
            sub.title.toLowerCase().includes(search.toLowerCase()) ||
            sub.content.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(
        (section) =>
          section.subsections.length > 0 ||
          section.title.toLowerCase().includes(search.toLowerCase()) ||
          (section.intro && section.intro.toLowerCase().includes(search.toLowerCase()))
      )
    : MANUAL_SECTIONS

  return (
    <AdminLayout title="Systémová príručka" backHref="/admin/settings">
      {/* Search bar */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        {/* Mobile nav toggle */}
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          style={{
            display: 'none',
            background: '#16213e',
            color: '#D4A843',
            border: 'none',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
          className="manual-mobile-toggle"
        >
          &#9776; Obsah
        </button>

        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <span
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9CA3AF',
              fontSize: '0.85rem',
              pointerEvents: 'none',
            }}
          >
            &#128269;
          </span>
          <input
            type="text"
            placeholder="Hľadať v príručke..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 16px 9px 36px',
              borderRadius: 24,
              border: '1px solid #E8E2D6',
              fontSize: '0.85rem',
              fontFamily: "'Montserrat', sans-serif",
              outline: 'none',
              background: '#fff',
              color: '#2d2d2d',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              &#10005;
            </button>
          )}
        </div>

        <div
          style={{
            fontSize: '0.75rem',
            color: '#9CA3AF',
            whiteSpace: 'nowrap',
          }}
        >
          Aktualizované: {MANUAL_LAST_UPDATED}
        </div>
      </div>

      {/* Layout: sidebar + main */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        {/* Sidebar — desktop always visible, mobile toggled */}
        <div className={`manual-sidebar-wrap ${mobileNavOpen ? 'open' : ''}`}>
          <ManualSidebar activeId={activeId} onNavigate={handleNavigate} />
        </div>

        {/* Main content */}
        <div ref={mainRef} style={{ flex: 1, minWidth: 0 }}>
          {filteredSections.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 60,
                color: '#9CA3AF',
                fontSize: '0.9rem',
              }}
            >
              Nič sa nenašlo pre &quot;{search}&quot;
            </div>
          ) : (
            filteredSections.map((section) => (
              <ManualSection key={section.id} section={section} />
            ))
          )}
        </div>
      </div>

      {/* Scoped styles for manual content (HTML from manualData) */}
      <style>{`
        /* Mobile sidebar */
        .manual-sidebar-wrap {
          display: block;
        }
        .manual-mobile-toggle {
          display: none !important;
        }
        @media (max-width: 768px) {
          .manual-sidebar-wrap {
            display: none;
            position: fixed;
            top: 60px;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 200;
            background: rgba(0,0,0,0.5);
            padding: 16px;
          }
          .manual-sidebar-wrap.open {
            display: block;
          }
          .manual-sidebar-wrap nav {
            width: 280px !important;
            max-height: calc(100vh - 100px) !important;
          }
          .manual-mobile-toggle {
            display: block !important;
          }
        }

        /* Content styling for HTML from manualData */
        .manual-content p {
          line-height: 1.75;
          color: #2d2d2d;
          margin-bottom: 12px;
          font-size: 0.93rem;
        }
        .manual-content ul, .manual-content ol {
          padding-left: 24px;
          margin-bottom: 14px;
        }
        .manual-content li {
          line-height: 1.7;
          font-size: 0.93rem;
          margin-bottom: 5px;
        }
        .manual-content strong {
          color: #1a1a2e;
          font-weight: 600;
        }
        .manual-content code {
          background: #f3f0e8;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.85rem;
          color: #b8882a;
        }

        /* Cards */
        .manual-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }
        .manual-card {
          background: #fff;
          border: 1px solid #E8E2D6;
          border-radius: 10px;
          padding: 18px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          transition: transform 0.18s, box-shadow 0.18s;
        }
        .manual-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(0,0,0,0.1);
        }
        .manual-card-icon { font-size: 1.6rem; margin-bottom: 8px; }
        .manual-card-title { font-weight: 700; font-size: 0.9rem; color: #1a1a2e; margin-bottom: 6px; }
        .manual-card-desc { font-size: 0.82rem; color: #5a5a6e; line-height: 1.55; }

        /* Table */
        .manual-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
          margin-bottom: 20px;
        }
        .manual-table th {
          background: #16213e;
          color: #D4A843;
          padding: 10px 14px;
          text-align: left;
          font-weight: 600;
          font-size: 0.82rem;
        }
        .manual-table th:first-child { border-radius: 8px 0 0 0; }
        .manual-table th:last-child { border-radius: 0 8px 0 0; }
        .manual-table td {
          padding: 10px 14px;
          border-bottom: 1px solid #E8E2D6;
          color: #2d2d2d;
        }
        .manual-table tr:hover td {
          background: rgba(212,168,67,0.05);
        }

        /* Timeline / Steps */
        .manual-timeline {
          margin-bottom: 20px;
        }
        .manual-step {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 10px 0;
          border-left: 2px solid #E8E2D6;
          margin-left: 18px;
          padding-left: 20px;
          position: relative;
        }
        .manual-step::before {
          content: '';
          position: absolute;
          left: -6px;
          top: 14px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #E8E2D6;
        }
        .manual-step-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          background: linear-gradient(135deg, #D4A843, #b8882a);
          color: #1a1a2e;
          border-radius: 8px;
          font-family: 'Cinzel', serif;
          font-size: 0.8rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .manual-step-num.gold {
          background: linear-gradient(135deg, #b8882a, #8B6914);
          color: #fff;
        }
        .manual-step-num.dark {
          background: #4e342e;
          color: #fff;
        }
        .manual-step-num.blue-bg { background: #DBEAFE; color: #1D4ED8; }
        .manual-step-num.orange-bg { background: #FFF3E0; color: #E65100; }
        .manual-step-num.green-bg { background: #E8F5E9; color: #2E7D32; }
        .manual-step-num.purple-bg { background: #F3E5F5; color: #7B1FA2; }
        .manual-step-num.teal-bg { background: #E0F2F1; color: #00695C; }
        .manual-step-num.gold-bg { background: #FFF8E1; color: #F57F17; }
        .manual-step-num.gray-bg { background: #ECEFF1; color: #455A64; }
        .manual-step div {
          font-size: 0.9rem;
          line-height: 1.6;
          color: #2d2d2d;
          padding-top: 3px;
        }

        /* Badges */
        .manual-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        .manual-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.78rem;
          font-weight: 600;
        }
        .manual-badge.blue { background: #DBEAFE; color: #1D4ED8; }
        .manual-badge.orange { background: #FFF3E0; color: #E65100; }
        .manual-badge.green { background: #E8F5E9; color: #2E7D32; }
        .manual-badge.purple { background: #F3E5F5; color: #7B1FA2; }
        .manual-badge.teal { background: #E0F2F1; color: #00695C; }
        .manual-badge.gold { background: #FFF8E1; color: #F57F17; }
        .manual-badge.gray { background: #ECEFF1; color: #455A64; }

        /* Info/Warning boxes */
        .manual-info {
          background: #EFF6FF;
          border-left: 4px solid #3B82F6;
          padding: 14px 18px;
          border-radius: 0 8px 8px 0;
          margin-bottom: 16px;
          font-size: 0.88rem;
          line-height: 1.6;
          color: #1E40AF;
        }
        .manual-warning {
          background: #FEF3C7;
          border-left: 4px solid #F59E0B;
          padding: 14px 18px;
          border-radius: 0 8px 8px 0;
          margin-bottom: 16px;
          font-size: 0.88rem;
          line-height: 1.6;
          color: #92400E;
        }
      `}</style>
    </AdminLayout>
  )
}
