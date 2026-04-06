'use client'

import { useState, useEffect, useRef } from 'react'

interface ReassignmentModalProps {
  isOpen: boolean
  onClose: () => void
  job: {
    id: number
    crm_step: number
    assigned_to: number | null
    reference_number: string
    custom_fields: Record<string, unknown>
    total_assignments: number
    customer_country: string
  }
  currentTechName: string
  technicians: Array<{ id: number; first_name: string; last_name: string }>
  onReassign: (techId: number | null, mode: 'direct' | 'marketplace', force?: boolean) => Promise<void>
}

type Step = 'checking' | 'protocol_required' | 'protocol_unsigned' | 'select_tech'

interface ProtocolFormData {
  hours: string
  km: string
  description: string
}

export default function ReassignmentModal({
  isOpen,
  onClose,
  job,
  currentTechName,
  technicians,
  onReassign,
}: ReassignmentModalProps) {
  const [step, setStep] = useState<Step>('checking')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTechId, setSelectedTechId] = useState<string>('')
  const [forceMode, setForceMode] = useState(false)
  const [showProtocolForm, setShowProtocolForm] = useState(false)
  const [protocolForm, setProtocolForm] = useState<ProtocolFormData>({ hours: '', km: '', description: '' })
  const [protocolSaving, setProtocolSaving] = useState(false)
  const [approveReason, setApproveReason] = useState('')
  const [notifySent, setNotifySent] = useState(false)
  const approveReasonRef = useRef<HTMLTextAreaElement>(null)
  const [coverageImpact, setCoverageImpact] = useState<{
    originalCoverage: number
    currentTechEstimatedCost: number
    remainingCoverage: number
    coveragePercentUsed: number
    warningLevel: 'none' | 'low' | 'medium' | 'high'
    currency: string
  } | null>(null)

  // On open, determine what step to show
  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setStep('checking')
    setShowProtocolForm(false)
    setNotifySent(false)
    setSelectedTechId('')
    setForceMode(false)
    setProtocolForm({ hours: '', km: '', description: '' })
    setApproveReason('')

    // If step < 3, no protocol needed — go directly to tech selection
    if (job.crm_step < 3) {
      setStep('select_tech')
      return
    }

    // Check protocol_history in custom_fields
    const history = (job.custom_fields?.protocol_history ?? []) as Array<Record<string, unknown>>
    const techHistory = history.filter(
      (h) => !job.assigned_to || h.technician_id === job.assigned_to || h.technician_id == null
    )

    if (techHistory.length === 0) {
      setStep('protocol_required')
    } else {
      // Check if latest has client signature
      const latest = techHistory[techHistory.length - 1]
      const hasSignature = !!(latest.client_signature || latest.signed_at || latest.status === 'signed')
      if (!hasSignature) {
        setStep('protocol_unsigned')
      } else {
        setStep('select_tech')
      }
    }
  }, [isOpen, job.crm_step, job.custom_fields, job.assigned_to])

  // Fetch coverage impact data when modal opens for a reassignment
  useEffect(() => {
    if (!isOpen || !job.assigned_to) {
      setCoverageImpact(null)
      return
    }
    fetch(`/api/admin/jobs/${job.id}/coverage-impact`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCoverageImpact(data) })
      .catch(() => {})
  }, [isOpen, job.id, job.assigned_to])

  if (!isOpen) return null

  // ---- Handlers ----

  async function handleSendNotification() {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${job.id}/assign`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notify_protocol_required: true }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.code === 'protocol_required' || res.status === 400) {
          setNotifySent(true)
        } else {
          setError(data.error || 'Chyba pri odosielaní výzvy.')
        }
      } else {
        setNotifySent(true)
      }
    } catch (e) {
      console.error('[ReassignmentModal] handleSendNotification error:', e)
      setError('Sieťová chyba. Skúste znova.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateProtocol() {
    if (!protocolForm.hours || !protocolForm.description) {
      setError('Vyplňte počet hodín a popis práce.')
      return
    }
    setProtocolSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/create-protocol`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hours: parseFloat(protocolForm.hours),
          km: parseFloat(protocolForm.km) || 0,
          description: protocolForm.description,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Chyba pri vytváraní protokolu.')
        return
      }
      // Protocol created — proceed to tech selection
      setShowProtocolForm(false)
      setStep('select_tech')
    } catch (e) {
      console.error('[ReassignmentModal] handleCreateProtocol error:', e)
      setError('Sieťová chyba. Skúste znova.')
    } finally {
      setProtocolSaving(false)
    }
  }

  async function handleSendProtocolLink() {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/send-protocol-link`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Chyba pri odosielaní linku.')
      } else {
        setError(null)
        setNotifySent(true)
      }
    } catch (e) {
      console.error('[ReassignmentModal] handleSendProtocolLink error:', e)
      setError('Sieťová chyba. Skúste znova.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleApproveWithoutSignature() {
    if (!approveReason.trim()) {
      setError('Zadajte dôvod schválenia bez podpisu.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/approve-protocol`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: approveReason }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Chyba pri schvaľovaní protokolu.')
      } else {
        setStep('select_tech')
      }
    } catch (e) {
      console.error('[ReassignmentModal] handleApproveWithoutSignature error:', e)
      setError('Sieťová chyba. Skúste znova.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleConfirmReassign(mode: 'direct' | 'marketplace') {
    if (mode === 'direct' && !selectedTechId) {
      setError('Vyberte technika.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      await onReassign(
        mode === 'direct' ? parseInt(selectedTechId) : null,
        mode,
        forceMode
      )
      onClose()
    } catch (e: unknown) {
      console.error('[ReassignmentModal] handleConfirmReassign error:', e)
      const msg = e instanceof Error ? e.message : 'Chyba pri zmene technika.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  // ---- Styles ----
  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  }

  const boxStyle: React.CSSProperties = {
    background: 'var(--w, #FFF)',
    borderRadius: 14,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
    padding: 24,
  }

  const headingStyle: React.CSSProperties = {
    margin: 0, fontSize: 17, fontWeight: 700,
    color: 'var(--dark, #1a1a1a)',
    fontFamily: 'Cinzel, serif',
  }

  const subStyle: React.CSSProperties = {
    fontSize: 13, color: 'var(--g4, #4B5563)', marginTop: 4,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'var(--dark, #1a1a1a)',
    display: 'block', marginBottom: 4,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 6, fontSize: 13,
    border: '1px solid var(--g6, #D0D0D0)', background: 'var(--g1, #FAFAFA)',
    color: 'var(--dark, #1a1a1a)', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  }

  const btnBase: React.CSSProperties = {
    padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left',
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
    opacity: isLoading ? 0.6 : 1,
    transition: 'opacity 0.15s',
  }

  const btnGreen: React.CSSProperties = { ...btnBase, background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }
  const btnOrange: React.CSSProperties = { ...btnBase, background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }
  const btnRed: React.CSSProperties = { ...btnBase, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }
  const btnBlue: React.CSSProperties = { ...btnBase, background: '#DBEAFE', color: '#1E3A8A', border: '1px solid #93C5FD' }
  const btnGray: React.CSSProperties = {
    padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: '1px solid var(--g6, #D0D0D0)',
    background: 'var(--w, #FFF)', color: 'var(--dark, #1a1a1a)',
  }
  const btnPrimary: React.CSSProperties = {
    padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
    cursor: isLoading ? 'default' : 'pointer', border: 'none',
    background: isLoading ? '#E5E7EB' : 'var(--accent, #1976D2)',
    color: isLoading ? '#9CA3AF' : '#FFF',
    opacity: isLoading ? 0.7 : 1,
  }

  // ---- Render helpers ----

  function renderHeader(icon: string, title: string, badge?: string) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <h3 style={headingStyle}>{title}</h3>
          </div>
          <p style={subStyle}>
            Technik: <strong>{currentTechName}</strong> &nbsp;·&nbsp; Zákazka: <strong>{job.reference_number || `#${job.id}`}</strong>
            {badge && <>&nbsp;<span style={{ marginLeft: 4, padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#FEF3C7', color: '#92400E' }}>{badge}</span></>}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--g5, #9CA3AF)', padding: 4 }}
          aria-label="Zatvoriť"
        >
          ×
        </button>
      </div>
    )
  }

  function renderError() {
    if (!error) return null
    return (
      <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#991B1B', display: 'flex', gap: 6 }}>
        <span>⚠</span>
        <span>{error}</span>
      </div>
    )
  }

  function renderStepper(current: 1 | 2) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, fontSize: 12, fontWeight: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: current === 1 ? 'var(--accent, #1976D2)' : 'var(--g5, #9CA3AF)' }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: current === 1 ? 'var(--accent, #1976D2)' : '#E5E7EB', color: current === 1 ? '#FFF' : '#9CA3AF',
            fontSize: 11, fontWeight: 700,
          }}>1</span>
          Protokol
        </div>
        <div style={{ flex: 1, height: 1, background: 'var(--g3, #E5E7EB)', margin: '0 8px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: current === 2 ? 'var(--accent, #1976D2)' : 'var(--g5, #9CA3AF)' }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: current === 2 ? 'var(--accent, #1976D2)' : '#E5E7EB', color: current === 2 ? '#FFF' : '#9CA3AF',
            fontSize: 11, fontWeight: 700,
          }}>2</span>
          Nový technik
        </div>
      </div>
    )
  }

  // ---- STEP: checking ----
  if (step === 'checking') {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={boxStyle} onClick={e => e.stopPropagation()}>
          {renderHeader('🔄', 'Zmena technika')}
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--g4, #4B5563)', fontSize: 13 }}>
            Kontrolujem stav zákazky...
          </div>
        </div>
      </div>
    )
  }

  // ---- STEP: protocol_required (no protocol at all) ----
  if (step === 'protocol_required') {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={boxStyle} onClick={e => e.stopPropagation()}>
          {renderHeader('📋', 'Zmena technika', 'Krok 1 z 2')}
          {renderStepper(1)}

          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: '#92400E' }}>
            <strong>Technik {currentTechName} musí odovzdať záverečný protokol</strong> pred zmenou na novú zákazku.
          </div>

          {renderError()}

          {notifySent && (
            <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#166534' }}>
              Výzva bola odoslaná technikovi.
            </div>
          )}

          {!showProtocolForm ? (
            <>
              <button
                style={btnGreen}
                onClick={handleSendNotification}
                disabled={isLoading || notifySent}
              >
                <span>📩</span>
                <div>
                  <div>Poslať výzvu technikovi</div>
                  <div style={{ fontSize: 11, fontWeight: 400, marginTop: 1 }}>SMS/push notifikácia — technik musí odovzdať protokol</div>
                </div>
              </button>

              <button
                style={btnOrange}
                onClick={() => { setShowProtocolForm(true); setError(null) }}
                disabled={isLoading}
              >
                <span>✏️</span>
                <div>
                  <div>Vytvoriť protokol za technika</div>
                  <div style={{ fontSize: 11, fontWeight: 400, marginTop: 1 }}>Operátor vyplní základné údaje o práci</div>
                </div>
              </button>

              <button
                style={btnRed}
                onClick={() => { setForceMode(true); setStep('select_tech') }}
                disabled={isLoading}
              >
                <span>⚡</span>
                <div>
                  <div>Núdzová zmena bez protokolu</div>
                  <div style={{ fontSize: 11, fontWeight: 400, marginTop: 1 }}>Pokračovať bez protokolu — zaznamená sa v logu</div>
                </div>
              </button>
            </>
          ) : (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', marginBottom: 12 }}>Základné údaje o vykonanej práci:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Počet hodín *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="napr. 2.5"
                    value={protocolForm.hours}
                    onChange={e => setProtocolForm(f => ({ ...f, hours: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Najazdené km</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="napr. 25"
                    value={protocolForm.km}
                    onChange={e => setProtocolForm(f => ({ ...f, km: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Stručný popis práce *</label>
                <textarea
                  rows={3}
                  placeholder="Čo technik vykonal..."
                  value={protocolForm.description}
                  onChange={e => setProtocolForm(f => ({ ...f, description: e.target.value }))}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
              {renderError()}
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btnGray} onClick={() => { setShowProtocolForm(false); setError(null) }} disabled={protocolSaving}>Späť</button>
                <button
                  onClick={handleCreateProtocol}
                  disabled={protocolSaving}
                  style={{
                    ...btnPrimary, flex: 1,
                    cursor: protocolSaving ? 'default' : 'pointer',
                    background: protocolSaving ? '#E5E7EB' : 'var(--accent, #1976D2)',
                    color: protocolSaving ? '#9CA3AF' : '#FFF',
                  }}
                >
                  {protocolSaving ? 'Ukladám...' : 'Uložiť protokol a pokračovať'}
                </button>
              </div>
            </div>
          )}

          {!showProtocolForm && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button style={btnGray} onClick={onClose} disabled={isLoading}>Zrušiť</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---- STEP: protocol_unsigned (protocol exists but no client signature) ----
  if (step === 'protocol_unsigned') {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={boxStyle} onClick={e => e.stopPropagation()}>
          {renderHeader('✍️', 'Zmena technika', 'Krok 1 z 2')}
          {renderStepper(1)}

          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: '#1E40AF' }}>
            Protokol bol odovzdaný, ale <strong>zákazník ešte nepodpísal</strong>.
          </div>

          {renderError()}

          {notifySent && (
            <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#166534' }}>
              Link na podpis bol odoslaný zákazníkovi.
            </div>
          )}

          <button
            style={btnBlue}
            onClick={handleSendProtocolLink}
            disabled={isLoading || notifySent}
          >
            <span>🔗</span>
            <div>
              <div>Znovu odoslať link na podpis</div>
              <div style={{ fontSize: 11, fontWeight: 400, marginTop: 1 }}>Zákazník dostane SMS/email s linkom na podpis</div>
            </div>
          </button>

          <div style={{ marginBottom: 8 }}>
            <button
              style={btnOrange}
              onClick={() => {
                if (approveReason.trim()) {
                  handleApproveWithoutSignature()
                } else {
                  approveReasonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  approveReasonRef.current?.focus()
                }
              }}
              disabled={isLoading}
            >
              <span>✅</span>
              <div>
                <div>Schváliť bez podpisu klienta</div>
                <div style={{ fontSize: 11, fontWeight: 400, marginTop: 1 }}>Zadajte dôvod — zaznamená sa v logu</div>
              </div>
            </button>
            <div style={{ marginLeft: 4, marginTop: -4 }}>
              <label style={labelStyle}>Dôvod schválenia bez podpisu</label>
              <textarea
                ref={approveReasonRef}
                rows={2}
                placeholder="Zákazník nedostupný, telefonické schválenie, ..."
                value={approveReason}
                onChange={e => setApproveReason(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              <button
                onClick={handleApproveWithoutSignature}
                disabled={isLoading || !approveReason.trim()}
                style={{
                  marginTop: 6, padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 700,
                  border: 'none', cursor: !approveReason.trim() || isLoading ? 'default' : 'pointer',
                  background: !approveReason.trim() ? '#E5E7EB' : '#D97706',
                  color: !approveReason.trim() ? '#9CA3AF' : '#FFF',
                }}
              >
                {isLoading ? 'Schvaľujem...' : 'Schváliť protokol'}
              </button>
            </div>
          </div>

          <button
            style={btnGreen}
            onClick={() => setStep('select_tech')}
            disabled={isLoading}
          >
            <span>➡️</span>
            <div>
              <div>Pokračovať na výber technika</div>
              <div style={{ fontSize: 11, fontWeight: 400, marginTop: 1 }}>Zákazník podpíše neskôr</div>
            </div>
          </button>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button style={btnGray} onClick={onClose} disabled={isLoading}>Zrušiť</button>
          </div>
        </div>
      </div>
    )
  }

  // ---- STEP: select_tech ----
  if (step === 'select_tech') {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={boxStyle} onClick={e => e.stopPropagation()}>
          {renderHeader('👷', job.crm_step >= 3 ? 'Zmena technika' : 'Priradenie technika', job.crm_step >= 3 ? 'Krok 2 z 2' : undefined)}
          {job.crm_step >= 3 && renderStepper(2)}

          {forceMode && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 6, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#991B1B', display: 'flex', gap: 6 }}>
              <span>⚡</span>
              <span>Núdzová zmena — zmena prebehne bez záverečného protokolu starého technika.</span>
            </div>
          )}

          {coverageImpact && coverageImpact.warningLevel !== 'none' && coverageImpact.originalCoverage > 0 && (
            <div style={{
              background: coverageImpact.warningLevel === 'high' ? '#FEE2E2' : coverageImpact.warningLevel === 'medium' ? '#FEF3C7' : '#EFF6FF',
              border: `1px solid ${coverageImpact.warningLevel === 'high' ? '#FCA5A5' : coverageImpact.warningLevel === 'medium' ? '#FCD34D' : '#BFDBFE'}`,
              borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13,
              color: coverageImpact.warningLevel === 'high' ? '#991B1B' : coverageImpact.warningLevel === 'medium' ? '#92400E' : '#1E40AF',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {coverageImpact.warningLevel === 'high' ? 'Krytie vyčerpané' : 'Znížené krytie poisťovne'}
              </div>
              <div style={{ fontSize: 12 }}>
                Pôvodné krytie: {coverageImpact.originalCoverage.toLocaleString()} {coverageImpact.currency}
                {' · '}Použité: {coverageImpact.coveragePercentUsed}%
                {' · '}Zostatok: <strong>{coverageImpact.remainingCoverage.toLocaleString()} {coverageImpact.currency}</strong>
              </div>
              {coverageImpact.warningLevel === 'high' && (
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Nový technik bude pracovať bez krytia — klient zaplatí celú sumu.
                </div>
              )}
            </div>
          )}

          {renderError()}

          {/* Priamy výber */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent, #1976D2)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>A</span>
              Priradiť priamo
            </div>
            <label style={labelStyle}>Vybrať technika</label>
            <select
              value={selectedTechId}
              onChange={e => setSelectedTechId(e.target.value)}
              style={inputStyle}
            >
              <option value="">— Vybrať technika —</option>
              {technicians
                .filter(t => t.id !== job.assigned_to)
                .map(t => (
                  <option key={t.id} value={t.id}>
                    {t.last_name} {t.first_name}
                  </option>
                ))}
            </select>
            <button
              onClick={() => handleConfirmReassign('direct')}
              disabled={!selectedTechId || isLoading}
              style={{
                marginTop: 10, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                border: 'none', width: '100%',
                cursor: !selectedTechId || isLoading ? 'default' : 'pointer',
                background: !selectedTechId ? '#E5E7EB' : '#16A34A',
                color: !selectedTechId ? '#9CA3AF' : '#FFF',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Priraďujem...' : 'Priradiť technika'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--g3, #E5E7EB)' }} />
            <span style={{ fontSize: 12, color: 'var(--g5, #9CA3AF)', fontWeight: 600 }}>alebo</span>
            <div style={{ flex: 1, height: 1, background: 'var(--g3, #E5E7EB)' }} />
          </div>

          {/* Marketplace */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#7C3AED', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>B</span>
              Poslať do marketplace
            </div>
            <button
              style={{
                ...btnBase,
                background: '#F5F3FF', color: '#4C1D95', border: '1px solid #C4B5FD',
                width: '100%',
              }}
              onClick={() => handleConfirmReassign('marketplace')}
              disabled={isLoading}
            >
              <span>🏪</span>
              <div>
                <div>Uvoľniť do marketplace</div>
                <div style={{ fontSize: 11, fontWeight: 400, marginTop: 1 }}>Zákazka sa zobrazí technikmi v ich ponukách</div>
              </div>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button style={btnGray} onClick={onClose} disabled={isLoading}>Zrušiť</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
