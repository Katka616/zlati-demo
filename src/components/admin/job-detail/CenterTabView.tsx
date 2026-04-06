'use client'

/**
 * CenterTabView — Tab wrapper pre stredovú sekciu job detailu.
 * 5 tabov: Priebeh, Diagnostika, Cena & Faktúry, Komunikácia, Dokumenty
 * Auto-select podľa CRM kroku (buildSectionState logika).
 * Deti sú renderované cez children props — existujúce komponenty sa neprepisujú.
 */

import { useState, useEffect, type ReactNode } from 'react'
import { Wrench, Search, DollarSign, MessageSquare, FileText } from 'lucide-react'

type TabId = 'priebeh' | 'diagnostika' | 'cena' | 'komunikacia' | 'dokumenty'

interface CenterTabViewProps {
  currentStep: number
  /** Number of unread messages for badge */
  unreadCount?: number
  /** Number of photos for badge */
  photoCount?: number
  /** Tab content slots */
  priebeh: ReactNode
  diagnostika: ReactNode
  cena: ReactNode
  komunikacia: ReactNode
  dokumenty: ReactNode
}

const TABS: Array<{ id: TabId; label: string; icon: typeof Wrench }> = [
  { id: 'priebeh', label: 'Priebeh', icon: Wrench },
  { id: 'diagnostika', label: 'Diagnostika', icon: Search },
  { id: 'cena', label: 'Cena & Faktúry', icon: DollarSign },
  { id: 'komunikacia', label: 'Komunikácia', icon: MessageSquare },
  { id: 'dokumenty', label: 'Dokumenty', icon: FileText },
]

/** Determine which tab should be auto-selected based on CRM step */
function getDefaultTab(step: number): TabId {
  if (step <= 1) return 'komunikacia'   // First contact phase
  if (step <= 3) return 'priebeh'       // Technician at work
  if (step === 4 || step === 5) return 'priebeh' // Estimate approval
  if (step === 6) return 'priebeh'      // Completed work
  if (step >= 7 && step <= 8) return 'cena' // Settlement / price check
  if (step >= 9) return 'cena'          // Invoicing, payment
  return 'priebeh'
}

export default function CenterTabView({
  currentStep,
  unreadCount = 0,
  photoCount = 0,
  priebeh,
  diagnostika,
  cena,
  komunikacia,
  dokumenty,
}: CenterTabViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>(() => getDefaultTab(currentStep))

  // Auto-switch tab when step changes
  useEffect(() => {
    setActiveTab(getDefaultTab(currentStep))
  }, [currentStep])

  // Listen for external tab-switch requests (e.g. from handleAction)
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail as TabId
      if (tab && ['priebeh', 'diagnostika', 'cena', 'komunikacia', 'dokumenty'].includes(tab)) {
        setActiveTab(tab)
      }
    }
    window.addEventListener('crm-switch-tab', handler)
    return () => window.removeEventListener('crm-switch-tab', handler)
  }, [])

  const content: Record<TabId, ReactNode> = { priebeh, diagnostika, cena, komunikacia, dokumenty }

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 3,
        background: 'var(--w, #FFF)',
        border: '1px solid var(--border, #E5E5E5)',
        borderRadius: 12, padding: 3, marginBottom: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          let badge: number | null = null
          if (tab.id === 'komunikacia' && unreadCount > 0) badge = unreadCount
          if (tab.id === 'dokumenty' && photoCount > 0) badge = photoCount

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: '1 0 auto', padding: '7px 12px', borderRadius: 8,
                fontSize: 11, fontWeight: isActive ? 700 : 600,
                textAlign: 'center', cursor: 'pointer',
                color: isActive ? 'var(--gold-text, #8B6914)' : 'var(--g4, #4B5563)',
                background: isActive ? 'var(--gold-light, #FBF6EB)' : 'transparent',
                border: 'none', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <Icon size={14} strokeWidth={2} />
              {tab.label}
              {badge != null && badge > 0 && (
                <span style={{
                  background: 'var(--danger, #DC2626)', color: '#FFF',
                  fontSize: 8, fontWeight: 800,
                  padding: '1px 4px', borderRadius: 8,
                  minWidth: 14, textAlign: 'center',
                }}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content with fade animation */}
      <div key={activeTab} style={{ animation: 'tabFadeIn 0.2s ease' }}>
        {content[activeTab]}
      </div>

      <style>{`
        @keyframes tabFadeIn {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
