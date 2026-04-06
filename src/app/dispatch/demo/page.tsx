'use client'

/**
 * /dispatch/demo — Plne klikateľné offline demo
 *
 * Reusne reálne komponenty (ActiveJobFullscreen) s lokálnym state.
 * Žiadne API volania, žiadna DB — každý návštevník má nezávislé demo.
 * Po refreshi sa vráti na začiatok.
 */

import { useReducer, useCallback, useRef, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import ActiveJobFullscreen from '@/components/dispatch/ActiveJobFullscreen'
import { getStatusBadge } from '@/lib/statusBadge'
import { demoReducer, createInitialState } from './demoReducer'
import type { TechActionType, EstimateFormData, DispatchJob } from '@/types/dispatch'

const Walkthrough = dynamic(() => import('@/components/dispatch/Walkthrough'), { ssr: false })

const LANG = 'cz' as const

// ── Mobile Frame — constrains width on desktop ─────────────────────

function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="demo-frame-wrap">
      {children}
      <style>{`
        .demo-frame-wrap {
          max-width: 430px;
          margin: 0 auto;
          min-height: 100vh;
          position: relative;
        }
        .demo-frame-wrap .dispatch-tab-bar-wrap {
          max-width: 430px;
        }
        .demo-frame-wrap .ajf-bottom-area {
          max-width: 430px;
        }
      `}</style>
    </div>
  )
}

// ── Welcome Screen ──────────────────────────────────────────────────

function DemoWelcome({ onStart }: { onStart: () => void }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      color: '#f5f5f5',
      fontFamily: 'Montserrat, sans-serif',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <span style={{
        fontFamily: 'Cinzel, serif',
        fontSize: 14,
        fontWeight: 700,
        color: '#D4A843',
        letterSpacing: 3,
        marginBottom: 24,
      }}>
        ZLATÍ ŘEMESLNÍCI
      </span>

      <h1 style={{
        fontFamily: 'Cinzel, serif',
        fontSize: 24,
        fontWeight: 700,
        color: '#fff',
        marginBottom: 12,
        lineHeight: 1.3,
      }}>
        Vyzkoušejte si aplikaci
      </h1>

      <p style={{
        color: '#999',
        fontSize: 14,
        lineHeight: 1.6,
        maxWidth: 320,
        marginBottom: 32,
      }}>
        Projděte si celý proces zakázky — od výjezdu po vyúčtování. Vše běží jen ve vašem prohlížeči.
      </p>

      <button
        onClick={onStart}
        style={{
          padding: '16px 48px',
          background: 'linear-gradient(135deg, #D4A843, #aa771c)',
          color: '#fff',
          border: 'none',
          borderRadius: 14,
          cursor: 'pointer',
          fontSize: 16,
          fontWeight: 700,
          fontFamily: 'Montserrat, sans-serif',
          boxShadow: '0 4px 20px rgba(212,168,67,0.3)',
        }}
      >
        Začít demo
      </button>

      <p style={{
        color: '#666',
        fontSize: 11,
        marginTop: 16,
      }}>
        Žádné přihlášení, žádná registrace
      </p>
    </div>
  )
}

// ── Dashboard ───────────────────────────────────────────────────────

function DemoDashboard({ jobs, onSelectJob, onAcceptJob }: {
  jobs: Record<string, DispatchJob>
  onSelectJob: (id: string) => void
  onAcceptJob: (id: string) => void
}) {
  const jobList = Object.values(jobs)
  const activeCount = jobList.filter(j => (j.crmStep ?? 0) < 9).length
  const marketplaceJobs = jobList.filter(j => (j.crmStep ?? 0) <= 1)
  const activeJobs = jobList.filter(j => (j.crmStep ?? 0) >= 2 && (j.crmStep ?? 0) < 9)
  const doneJobs = jobList.filter(j => (j.crmStep ?? 0) >= 9)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg, #fafaf8)',
      fontFamily: 'Montserrat, sans-serif',
    }} data-theme="dark">
      {/* Header */}
      <div style={{
        background: '#0a0a0a',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(212,168,67,0.3)',
      }}>
        <span style={{
          fontFamily: 'Cinzel, serif',
          fontSize: 13,
          fontWeight: 700,
          color: '#D4A843',
          letterSpacing: 2,
        }}>
          ZLATÍ ŘEMESLNÍCI
        </span>
        <span style={{
          float: 'right',
          fontSize: 11,
          color: '#666',
          background: 'rgba(212,168,67,0.15)',
          padding: '4px 10px',
          borderRadius: 8,
          fontWeight: 600,
        }}>
          DEMO
        </span>
      </div>

      {/* Greeting */}
      <div style={{ padding: '20px 20px 8px' }}>
        <h2 style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--text-primary, #1f2937)',
          margin: 0,
        }}>
          Vaše zakázky
        </h2>
        <p style={{
          fontSize: 13,
          color: 'var(--text-secondary, #6b7280)',
          margin: '4px 0 0',
        }}>
          Klikněte na zakázku pro zobrazení detailu
        </p>
      </div>

      {/* Filter chips */}
      <div style={{
        padding: '8px 16px 4px',
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {[
          { label: `Aktivní ${activeCount}`, active: true },
          { label: 'Dnes', active: false },
          { label: 'Na cestě', active: false },
          { label: 'Na místě', active: false },
          { label: 'Pracuje', active: false },
          { label: 'Dokončené', active: false },
        ].map(chip => (
          <span key={chip.label} style={{
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            background: chip.active ? 'var(--gold, #D4A843)' : 'rgba(255,255,255,0.06)',
            color: chip.active ? '#fff' : 'var(--text-secondary, #9ca3af)',
            border: chip.active ? 'none' : '1px solid rgba(255,255,255,0.1)',
          }}>
            {chip.label}
          </span>
        ))}
      </div>

      {/* Job cards — grouped by status */}
      <div data-help-target="demo-job-list" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 90 }}>

        {/* Marketplace — new offers */}
        {marketplaceJobs.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold, #D4A843)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>
              Nové nabídky
            </div>
            {marketplaceJobs.map(job => (
              <div key={job.id} style={{
                padding: '16px 18px',
                background: 'rgba(212,168,67,0.08)',
                border: '1.5px solid rgba(212,168,67,0.3)',
                borderRadius: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #f5f5f5)' }}>{job.customerName}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: 6 }}>URGENT</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary, #9ca3af)', marginBottom: 4 }}>{job.customerAddress}, {job.customerCity}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary, #777)', marginBottom: 4 }}>{job.subject}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary, #777)', marginBottom: 12 }}>
                  {job.distance} km · {job.scheduledTime}
                </div>
                <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: 'rgba(34,197,94,0.7)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 }}>
                    Termín od klienta
                  </div>
                  <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 700 }}>
                    {job.scheduledTime}
                  </div>
                </div>
                <button
                  onClick={() => onAcceptJob(job.id)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #D4A843, #aa771c)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Přijmout zakázku
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Active jobs */}
        {activeJobs.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary, #9ca3af)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>
              Aktivní zakázky
            </div>
            {activeJobs.map(job => (
              <button
                key={job.id}
                onClick={() => onSelectJob(job.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '16px 18px',
                  background: 'var(--surface, rgba(255,255,255,0.04))',
                  border: '1px solid var(--border, rgba(255,255,255,0.08))',
                  borderRadius: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #f5f5f5)' }}>{job.customerName}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary, #9ca3af)', fontWeight: 600 }}>{job.referenceNumber}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary, #9ca3af)', marginBottom: 4 }}>{job.customerAddress}, {job.customerCity}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary, #777)' }}>{job.subject}</div>
                <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: '#D4A843', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {job.scheduledDate && (
                    <span>
                      {new Date(job.scheduledDate).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })}
                      {job.scheduledTime && ` · ${job.scheduledTime}`}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Done jobs */}
        {doneJobs.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary, #9ca3af)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>
              Dokončené
            </div>
            {doneJobs.map(job => (
              <div key={job.id} style={{
                padding: '14px 18px',
                background: 'rgba(34,197,94,0.04)',
                border: '1px solid rgba(34,197,94,0.12)',
                borderRadius: 14,
                opacity: 0.7,
                marginBottom: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f5f5f5)' }}>{job.customerName}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>✓</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary, #777)' }}>{job.customerAddress}, {job.customerCity}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Demo Complete Screen ────────────────────────────────────────────

function DemoComplete({ onRestart }: { onRestart: () => void }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      color: '#f5f5f5',
      fontFamily: 'Montserrat, sans-serif',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>

      <h1 style={{
        fontFamily: 'Cinzel, serif',
        fontSize: 22,
        fontWeight: 700,
        color: '#D4A843',
        marginBottom: 12,
      }}>
        Demo dokončeno!
      </h1>

      <p style={{
        color: '#999',
        fontSize: 14,
        lineHeight: 1.6,
        maxWidth: 320,
        marginBottom: 32,
      }}>
        Právě jste prošli celým procesem zakázky — od výjezdu po vyúčtování.
        Přihlaste se do své aplikace a začněte přijímat reálné zakázky.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={onRestart}
          style={{
            padding: '14px 36px',
            background: 'transparent',
            color: '#D4A843',
            border: '1.5px solid #D4A843',
            borderRadius: 12,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'Montserrat, sans-serif',
          }}
        >
          Spustit demo znovu
        </button>
      </div>
    </div>
  )
}

// ── Demo Protocol Modal ─────────────────────────────────────────────

function DemoProtocolModal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a2e', borderRadius: 16, padding: 28,
          maxWidth: 380, width: '90%', textAlign: 'center',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 36, marginBottom: 16 }}>📋</div>
        <h3 style={{
          fontFamily: 'Cinzel, serif',
          color: '#D4A843',
          fontSize: 18,
          marginBottom: 12,
        }}>
          Finální protokol
        </h3>
        <p style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: 13,
          lineHeight: 1.5,
          marginBottom: 24,
        }}>
          V reálné aplikaci zde vyplníte protokol s popisem opravy, použitým materiálem a podpisem klienta.
        </p>
        <button
          onClick={onDone}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg, #D4A843, #aa771c)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Montserrat, sans-serif',
          }}
        >
          Odeslat protokol (demo)
        </button>
      </div>
    </div>
  )
}

// ── Demo Settlement Modal ───────────────────────────────────────────

function DemoSettlementModal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a2e', borderRadius: 16, padding: 28,
          maxWidth: 380, width: '90%', textAlign: 'center',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 36, marginBottom: 16 }}>🧾</div>
        <h3 style={{
          fontFamily: 'Cinzel, serif',
          color: '#D4A843',
          fontSize: 18,
          marginBottom: 12,
        }}>
          Vyúčtování zakázky
        </h3>
        <div style={{
          background: 'rgba(212,168,67,0.1)',
          border: '1px solid rgba(212,168,67,0.3)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          textAlign: 'left',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Práce (2h)</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>1 800 Kč</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Materiál</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>120 Kč</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Cestovné</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>830 Kč</span>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#D4A843', fontSize: 14, fontWeight: 700 }}>Celkem</span>
            <span style={{ color: '#D4A843', fontSize: 14, fontWeight: 700 }}>2 750 Kč</span>
          </div>
        </div>
        <button
          onClick={onDone}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Montserrat, sans-serif',
          }}
        >
          Potvrdit vyúčtování
        </button>
      </div>
    </div>
  )
}

// ── Demo Toast ──────────────────────────────────────────────────────

function DemoToast({ message, onHide }: { message: string; onHide: () => void }) {
  useEffect(() => {
    const t = setTimeout(onHide, 2000)
    return () => clearTimeout(t)
  }, [onHide])

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(212,168,67,0.95)',
      color: '#fff',
      padding: '10px 24px',
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 600,
      zIndex: 9999,
      fontFamily: 'Montserrat, sans-serif',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      {message}
    </div>
  )
}

// ── Demo Bottom Bar — same look as real BottomTabBar, no navigation ─

const DEMO_TABS = [
  { id: 'home', label: 'Domů', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 10.5L12 3l9.5 7.5"/><path d="M4.5 9.5V19.5a2 2 0 002 2h11a2 2 0 002-2V9.5"/><path d="M9.5 21.5v-7a1 1 0 011-1h3a1 1 0 011 1v7"/></svg>, active: true },
  { id: 'marketplace', label: 'Nabídky', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></svg> },
  { id: 'deals', label: 'Zakázky', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 4h.5a2 2 0 012 2v13a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2h.5"/><rect x="9" y="2.5" width="6" height="3.5" rx="1.5"/><path d="M9 12.5h6"/><path d="M9 16h4"/></svg> },
  { id: 'calendar', label: 'Kalendář', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M3 9.5h18"/><path d="M8 2.5v3"/><path d="M16 2.5v3"/></svg> },
  { id: 'sms', label: 'Zprávy', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 21l-3-3H4a2.5 2.5 0 01-2.5-2.5v-10A2.5 2.5 0 014 3h16a2.5 2.5 0 012.5 2.5v10A2.5 2.5 0 0120 18h-8.5L7.5 21z"/><path d="M8 9.5h8"/><path d="M8 13h5"/></svg> },
]

function DemoBottomBar({ onToast, onHome }: { onToast: (msg: string) => void; onHome: () => void }) {
  return (
    <div className="dispatch-tab-bar-wrap">
      <nav className="dispatch-tab-bar" data-help-target="bottom-nav">
        {DEMO_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`tab-item ${tab.active ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => {
              if (tab.id === 'home' || tab.id === 'deals') { onHome(); return }
              onToast(`Demo: ${tab.label} — dostupné v plné verzi`)
            }}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

// ── Main Demo Page ──────────────────────────────────────────────────

export default function DemoPage() {
  const [state, dispatch] = useReducer(demoReducer, undefined, createInitialState)
  const [toast, setToast] = useState<string | null>(null)
  const [showProtocolModal, setShowProtocolModal] = useState(false)
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const autoApproveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Force dark theme + set demo mode flag for walkthrough
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    try { sessionStorage.setItem('demo-mode', 'true') } catch { /* ignore */ }
    return () => { /* leave theme as-is on unmount */ }
  }, [])

  // ── Global fetch interceptor — prevent all API calls in demo ──────
  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
      // Only intercept /api/ calls — let external resources (fonts, etc.) through
      if (url.startsWith('/api/')) {
        const mockJson = (data: unknown, status = 200) =>
          new Response(JSON.stringify(data), {
            status,
            headers: { 'Content-Type': 'application/json' },
          })
        // Status changes — simulate success
        if (url.includes('/api/dispatch/status')) {
          return mockJson({ success: true, job: null })
        }
        // Photos — return empty
        if (url.includes('/api/dispatch/photos')) {
          return mockJson({ photos: [] })
        }
        // Jobs detail — return active job data
        if (url.match(/\/api\/dispatch\/jobs\//)) {
          return mockJson({ success: true })
        }
        // Settlement
        if (url.includes('/api/dispatch/settlement')) {
          return mockJson({ settlement: null })
        }
        // Chat
        if (url.includes('/api/dispatch/chat')) {
          return mockJson({ messages: [] })
        }
        // Schedule
        if (url.includes('/api/dispatch/schedule')) {
          return mockJson({ success: true })
        }
        // Dashboard stats
        if (url.includes('/api/dispatch/dashboard')) {
          return mockJson({ activeJobs: 0, marketplace: 0, unreadMessages: 0 })
        }
        // Catch-all for any other API call
        return mockJson({ success: true })
      }
      return originalFetch(input, init)
    }) as typeof window.fetch

    return () => { window.fetch = originalFetch }
  }, [])

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (autoApproveRef.current) clearTimeout(autoApproveRef.current)
    }
  }, [])

  // Trigger walkthrough when entering job detail
  useEffect(() => {
    if (state.screen === 'job-detail') {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('trigger-walkthrough'))
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [state.screen])

  const activeJob = state.activeJobId ? state.jobs[state.activeJobId] : null

  // Check if all jobs are done (demo complete)
  const allDone = Object.values(state.jobs).every(j => (j.crmStep ?? 0) >= 9 && j.techPhase === 'departed')

  // ── Handlers for ActiveJobFullscreen ──────────────────────────────

  const handleStepAction = useCallback(async (_jobId: string, action: TechActionType): Promise<boolean> => {
    const job = state.jobs[_jobId]
    if (!job) return false

    // Intercept actions that need special handling
    const phase = job.techPhase || ''
    const step = job.crmStep ?? 0

    // Photo modal actions — just advance phase
    if (action === 'open_photos' || (action as string) === 'start_diagnostics') {
      if (step === 3 && (phase === 'arrived' || phase === '')) {
        dispatch({ type: 'PHOTOS_DONE', jobId: _jobId })
        setToast('Demo: Fotky nahrány')
        return true
      }
      if (step === 6 && phase === 'work_completed') {
        dispatch({ type: 'PHOTOS_DONE', jobId: _jobId })
        setToast('Demo: Fotky nahrány')
        return true
      }
    }

    // Protocol form — show demo modal
    if (action === 'submit_protocol') {
      setShowProtocolModal(true)
      return true
    }

    // Settlement — show demo modal
    if (action === 'view_invoice' || action === 'approve_settlement') {
      setShowSettlementModal(true)
      return true
    }

    // Finalize work — show protocol modal
    if (action === 'finalize_work') {
      setShowProtocolModal(true)
      return true
    }

    // Standard step action
    dispatch({ type: 'STEP_ACTION', jobId: _jobId, action })

    // Auto-approve estimate after 2s delay
    if (action === 'submit_estimate' || (step === 3 && phase === 'diagnostics')) {
      // First move to estimate_submitted via SUBMIT_ESTIMATE
      dispatch({ type: 'SUBMIT_ESTIMATE', jobId: _jobId })
      autoApproveRef.current = setTimeout(() => {
        dispatch({ type: 'AUTO_APPROVE_ESTIMATE', jobId: _jobId })
      }, 2500)
      return true
    }

    return true
  }, [state.jobs])

  const handleSubmitEstimate = useCallback(async (_jobId: string, _data: EstimateFormData): Promise<boolean> => {
    dispatch({ type: 'SUBMIT_ESTIMATE', jobId: _jobId })
    // Auto-approve after delay
    autoApproveRef.current = setTimeout(() => {
      dispatch({ type: 'AUTO_APPROVE_ESTIMATE', jobId: _jobId })
    }, 2500)
    setToast('Odhad odeslán — čekáme na schválení...')
    return true
  }, [])

  const handleProtocolDone = useCallback(() => {
    if (state.activeJobId) {
      dispatch({ type: 'PROTOCOL_DONE', jobId: state.activeJobId })
    }
    setShowProtocolModal(false)
    setToast('Protokol odeslán')
  }, [state.activeJobId])

  const handleSettlementDone = useCallback(() => {
    if (state.activeJobId) {
      dispatch({ type: 'SETTLEMENT_DONE', jobId: state.activeJobId })
    }
    setShowSettlementModal(false)
    // Go back to dashboard after short delay
    setTimeout(() => {
      dispatch({ type: 'BACK_TO_DASHBOARD' })
    }, 500)
  }, [state.activeJobId])

  const handleRestart = useCallback(() => {
    // Reset all state by replacing with fresh initial state
    const fresh = createInitialState()
    // Can't call createInitialState in reducer, so dispatch individual resets
    // Simpler: just reload the page
    window.location.reload()
  }, [])

  // ── Render ────────────────────────────────────────────────────────

  // Welcome screen
  if (state.screen === 'welcome') {
    return <MobileFrame><DemoWelcome onStart={() => dispatch({ type: 'START_DEMO' })} /></MobileFrame>
  }

  // All jobs done
  if (allDone && state.screen === 'dashboard') {
    return <MobileFrame><DemoComplete onRestart={handleRestart} /></MobileFrame>
  }

  // Job detail
  if (state.screen === 'job-detail' && activeJob) {
    const statusBadge = getStatusBadge(activeJob.crmStep ?? 2, activeJob.techPhase)

    return (
      <MobileFrame>
      <div className="dispatch-page" data-theme="dark">
        {toast && <DemoToast message={toast} onHide={() => setToast(null)} />}

        {/* Back button overlay */}
        <div style={{
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 200,
        }}>
          <button
            onClick={() => dispatch({ type: 'BACK_TO_DASHBOARD' })}
            style={{
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '8px 14px',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>
            Přehled
          </button>
        </div>

        <ActiveJobFullscreen
          job={activeJob}
          lang={LANG}
          statusBadge={statusBadge}
          onStepAction={handleStepAction}
          onSubmitEstimate={handleSubmitEstimate}
          onCallCustomer={() => setToast('Demo: Hovor simulován')}
          onNavigate={() => setToast('Demo: Navigace simulována')}
          onOpenProtocol={() => setShowProtocolModal(true)}
          onJobUpdated={() => {/* no-op in demo */}}
        />

        {showProtocolModal && (
          <DemoProtocolModal
            onDone={handleProtocolDone}
            onClose={() => setShowProtocolModal(false)}
          />
        )}

        {showSettlementModal && (
          <DemoSettlementModal
            onDone={handleSettlementDone}
            onClose={() => setShowSettlementModal(false)}
          />
        )}
        <DemoBottomBar onToast={setToast} onHome={() => dispatch({ type: 'BACK_TO_DASHBOARD' })} />
      </div>
      </MobileFrame>
    )
  }

  // Dashboard
  return (
    <>
    <MobileFrame>
    <div className="dispatch-page" data-theme="dark">
      {toast && <DemoToast message={toast} onHide={() => setToast(null)} />}
      <DemoDashboard
        jobs={state.jobs}
        onSelectJob={(id) => dispatch({ type: 'SELECT_JOB', jobId: id })}
        onAcceptJob={(id) => { dispatch({ type: 'ACCEPT_JOB', jobId: id }); setToast('Zakázka přijata!') }}
      />
      <DemoBottomBar onToast={setToast} onHome={() => dispatch({ type: 'BACK_TO_DASHBOARD' })} />
    </div>
    </MobileFrame>
    <Walkthrough technicianId={99999} lang={LANG} />
    </>
  )
}
