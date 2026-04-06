'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { SIDEBAR_STORAGE_KEY } from '@/components/admin/AdminLayout'

const JOB_VIEWS_KEY = 'crm_saved_views'
const JOB_ACTIVE_VIEW_KEY = 'crm_active_view_id'
const JOB_WORKING_STATE_KEY = 'crm_jobs_working_state'

function emitSidebarPreferenceChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('admin-sidebar-pref-changed'))
}

export default function OperatorUiPreferencesPanel() {
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [hasSavedViews, setHasSavedViews] = useState(false)
  const [hasWorkingState, setHasWorkingState] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const refreshState = useCallback(() => {
    if (typeof window === 'undefined') return
    setSidebarHidden(localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1')
    setHasSavedViews(Boolean(localStorage.getItem(JOB_VIEWS_KEY) || localStorage.getItem(JOB_ACTIVE_VIEW_KEY)))
    setHasWorkingState(Boolean(sessionStorage.getItem(JOB_WORKING_STATE_KEY)))
  }, [])

  useEffect(() => {
    refreshState()
  }, [refreshState])

  const showMessage = (nextMessage: string) => {
    setMessage(nextMessage)
    window.setTimeout(() => setMessage(null), 2500)
  }

  const updateSidebarHidden = (hidden: boolean) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(SIDEBAR_STORAGE_KEY, hidden ? '1' : '0')
    setSidebarHidden(hidden)
    emitSidebarPreferenceChanged()
    showMessage(hidden ? 'Sidebar bude predvolene skrytý.' : 'Sidebar bude predvolene zobrazený.')
  }

  const resetSidebarPreference = () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(SIDEBAR_STORAGE_KEY)
    setSidebarHidden(false)
    emitSidebarPreferenceChanged()
    showMessage('Preferencia sidebaru bola resetovaná.')
  }

  const resetSavedViews = () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(JOB_VIEWS_KEY)
    localStorage.removeItem(JOB_ACTIVE_VIEW_KEY)
    setHasSavedViews(false)
    showMessage('Uložené pohľady zákaziek boli odstránené.')
  }

  const resetWorkingState = () => {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(JOB_WORKING_STATE_KEY)
    setHasWorkingState(false)
    showMessage('Dočasné filtre a pracovný stav zákaziek boli vymazané.')
  }

  const sidebarLabel = useMemo(() => (sidebarHidden ? 'Skrytý' : 'Zobrazený'), [sidebarHidden])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          background: '#fff',
          border: '1px solid #E8E2D6',
          borderRadius: 14,
          padding: 18,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Zobrazenie rozhrania</div>
        <div style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>
          Osobné preferencie dashboardu a zoznamu zákaziek bez zásahu do dát v databáze.
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #E8E2D6',
          borderRadius: 14,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Sidebar</div>
            <div style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>
              Aktuálna preferencia: {sidebarLabel}.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`admin-btn ${!sidebarHidden ? 'admin-btn-gold' : 'admin-btn-outline'}`}
              onClick={() => updateSidebarHidden(false)}
            >
              Zobraziť
            </button>
            <button
              type="button"
              className={`admin-btn ${sidebarHidden ? 'admin-btn-gold' : 'admin-btn-outline'}`}
              onClick={() => updateSidebarHidden(true)}
            >
              Skryť
            </button>
            <button type="button" className="admin-btn admin-btn-outline" onClick={resetSidebarPreference}>
              Reset
            </button>
          </div>
        </div>

        <div style={{ height: 1, background: '#F3F4F6' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Uložené pohľady zákaziek</div>
            <div style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>
              {hasSavedViews ? 'Existujú uložené pohľady a aktívny výber.' : 'Nie sú uložené žiadne vlastné pohľady.'}
            </div>
          </div>
          <button type="button" className="admin-btn admin-btn-outline" onClick={resetSavedViews} disabled={!hasSavedViews}>
            Vymazať pohľady
          </button>
        </div>

        <div style={{ height: 1, background: '#F3F4F6' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Dočasný pracovný stav</div>
            <div style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>
              {hasWorkingState ? 'Sú uložené dočasné filtre a rozpracovaný stav zoznamu zákaziek.' : 'Dočasný pracovný stav je čistý.'}
            </div>
          </div>
          <button type="button" className="admin-btn admin-btn-outline" onClick={resetWorkingState} disabled={!hasWorkingState}>
            Vymazať filtre
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 12,
            padding: '12px 14px',
            color: '#166534',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      )}
    </div>
  )
}
