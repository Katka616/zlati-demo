'use client'

/**
 * VoicebotCallModal — Operator launches an ad-hoc voicebot call for a job.
 * Operator picks an outgoing scenario (which defines AI behavior) and
 * optionally adds a free-text instruction that gets appended as POKYN OPERÁTORA.
 */

import React, { useState, useEffect, useRef } from 'react'
import { X, Phone, Bot, User, Wrench, Loader, CheckCircle } from 'lucide-react'
import type { CustomScenario } from '@/lib/voicebotConfigTypes'

interface Props {
  jobId: number
  customerName: string | null
  customerPhone: string | null
  technicianName: string | null
  technicianPhone: string | null
  initialRecipient?: Recipient
  onClose: () => void
  onQueued: () => void
}

type Recipient = 'customer' | 'technician'

interface ScenarioOption {
  key: string
  label: string
  emoji?: string
  recipient: 'customer' | 'technician' | 'both'
}

// Fallback scenario list shown while API loads
const FALLBACK_SCENARIOS: Record<Recipient, ScenarioOption[]> = {
  customer: [
    { key: 'client_surcharge',  label: 'Schválenie doplatku',  emoji: '💶', recipient: 'customer' },
    { key: 'client_schedule',   label: 'Potvrdenie termínu',   emoji: '📅', recipient: 'customer' },
    { key: 'client_protocol',   label: 'Podpis protokolu',     emoji: '📝', recipient: 'customer' },
    { key: 'operator_custom',   label: 'Vlastný pokyn',        emoji: '✏️', recipient: 'both' },
  ],
  technician: [
    { key: 'tech_dispatch',     label: 'Dispatch technika',    emoji: '🔧', recipient: 'technician' },
    { key: 'operator_custom',   label: 'Vlastný pokyn',        emoji: '✏️', recipient: 'both' },
  ],
}

function buildScenarioOptions(
  automated: ScenarioOption[],
  manual: CustomScenario[],
  recipient: Recipient
): ScenarioOption[] {
  const all: ScenarioOption[] = [
    ...automated,
    ...manual.map(s => ({ key: s.key, label: s.label, recipient: s.recipient })),
  ]
  return all.filter(s => s.recipient === recipient || s.recipient === 'both')
}

export default function VoicebotCallModal({
  jobId,
  customerName,
  customerPhone,
  technicianName,
  technicianPhone,
  initialRecipient = 'customer',
  onClose,
  onQueued,
}: Props) {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const [issueText, setIssueText] = useState('')
  const [recipient, setRecipient] = useState<Recipient>(initialRecipient)
  const [scenarioOptions, setScenarioOptions] = useState<{ customer: ScenarioOption[]; technician: ScenarioOption[] }>(FALLBACK_SCENARIOS)
  const [scenarioPrompts, setScenarioPrompts] = useState<Record<string, string>>({})
  const [promptExpanded, setPromptExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<'success' | 'pending' | 'error' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canCallCustomer = !!customerPhone
  const canCallTechnician = !!technicianPhone
  const activeScenarios = scenarioOptions[recipient] ?? []
  const isCustomScenario = selectedScenario === 'operator_custom'

  // Fetch scenarios + prompts from API
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/voicebot/scenarios').then(r => r.ok ? r.json() : null),
      fetch('/api/admin/voicebot/prompts').then(r => r.ok ? r.json() : null),
    ]).then(([scenariosData, promptsData]) => {
      if (scenariosData) {
        const automated: ScenarioOption[] = Array.isArray(scenariosData.automated)
          ? scenariosData.automated.map((s: { key: string; label: string; emoji?: string; recipient: 'customer' | 'technician' | 'both' }) => ({
              key: s.key, label: s.label, emoji: s.emoji, recipient: s.recipient,
            }))
          : []
        const manual: CustomScenario[] = Array.isArray(scenariosData.manual) ? scenariosData.manual : []
        setScenarioOptions({
          customer:   buildScenarioOptions(automated, manual, 'customer'),
          technician: buildScenarioOptions(automated, manual, 'technician'),
        })
      }
      if (promptsData?.prompts) {
        const map: Record<string, string> = {}
        for (const p of promptsData.prompts as { scenario: string; language: string; prompt_text: string }[]) {
          // Prefer 'cs', fall back to first available language per scenario
          if (p.language === 'cs' || !map[p.scenario]) {
            map[p.scenario] = p.prompt_text
          }
        }
        setScenarioPrompts(map)
      }
    }).catch(() => {})
  }, [])

  const handleRecipientChange = (r: Recipient) => {
    setRecipient(r)
    setSelectedScenario(null)
    setIssueText('')
  }

  const handleScenarioSelect = (key: string) => {
    setSelectedScenario(key)
    setPromptExpanded(false)
    if (key !== 'operator_custom') {
      setIssueText('')
    }
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const canSubmit = selectedScenario !== null &&
    (!isCustomScenario || issueText.trim().length > 0) &&
    !submitting &&
    result !== 'success'

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setErrorMsg('')
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/voicebot-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient,
          scenario: selectedScenario,
          issue_text: issueText.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.queued === false && data.reason === 'already_pending') {
        setResult('pending')
      } else if (data.queued) {
        setResult('success')
        setTimeout(() => { onQueued(); onClose() }, 1800)
      } else {
        setErrorMsg(data.error ?? 'Nepodarilo sa zaradiť hovor.')
        setResult('error')
      }
    } catch {
      setErrorMsg('Chyba pripojenia.')
      setResult('error')
    } finally {
      setSubmitting(false)
    }
  }

  const recipientLabel = recipient === 'customer' ? 'Zákazník' : 'Technik'
  const recipientDetail = recipient === 'customer'
    ? (customerName || 'Zákazník')
    : (technicianName || 'Technik')
  const selectedScenarioLabel = activeScenarios.find(s => s.key === selectedScenario)?.label ?? selectedScenario

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'var(--g4)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: 8, fontFamily: "'Montserrat', sans-serif",
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--w, #fff)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          width: '100%', maxWidth: 480,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid var(--border, #E8E2D6)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--gold-bg, #FBF6EB)',
            border: '1px solid var(--gold-light, #fcf6ba)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Bot size={20} style={{ color: 'var(--gold, #bf953f)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--dark, #1A1A1A)', fontFamily: "'Montserrat', sans-serif" }}>
              AI Voicebot — manuálny hovor
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #78716C)', fontFamily: "'Montserrat', sans-serif" }}>
              Voicebot zavolá a vybaví úlohu za teba
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--g4)', lineHeight: 1, padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Scenario selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Scenár hovoru</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {activeScenarios.map(sc => (
                <button
                  key={sc.key}
                  onClick={() => handleScenarioSelect(sc.key)}
                  style={{
                    padding: '5px 12px', borderRadius: 20,
                    border: selectedScenario === sc.key
                      ? '1.5px solid var(--gold, #bf953f)'
                      : '1.5px solid var(--border, #E8E2D6)',
                    background: selectedScenario === sc.key
                      ? 'var(--gold-bg, #FBF6EB)'
                      : 'transparent',
                    color: selectedScenario === sc.key
                      ? 'var(--gold-dark, #aa771c)'
                      : 'var(--dark, #1A1A1A)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Montserrat', sans-serif",
                    transition: 'all 0.12s',
                  }}
                >
                  {sc.emoji ? `${sc.emoji} ${sc.label}` : sc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt preview — shown when scenario selected (except operator_custom which has no base prompt) */}
          {selectedScenario && !isCustomScenario && (
            <div style={{ marginBottom: 14 }}>
              <div style={{
                background: 'var(--g1, #F9F9F7)',
                border: '1px solid var(--g2, #E5E7EB)',
                borderLeft: '3px solid var(--gold, #BF953F)',
                borderRadius: 8,
                padding: '10px 12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--g5, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Montserrat', sans-serif" }}>
                    Čo bude AI riešiť
                  </span>
                  {scenarioPrompts[selectedScenario] && scenarioPrompts[selectedScenario].length > 180 && (
                    <button
                      onClick={() => setPromptExpanded(p => !p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--gold-dark, #aa771c)', fontFamily: "'Montserrat', sans-serif", padding: 0 }}
                    >
                      {promptExpanded ? 'Zbaliť ▲' : 'Zobraziť viac ▼'}
                    </button>
                  )}
                </div>
                {scenarioPrompts[selectedScenario] ? (
                  <div style={{
                    fontSize: 12, color: 'var(--g6, #4B5563)', lineHeight: 1.55,
                    fontFamily: 'monospace, "Courier New"',
                    maxHeight: promptExpanded ? 260 : 80,
                    overflowY: promptExpanded ? 'auto' : 'hidden',
                    transition: 'max-height 0.2s',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {scenarioPrompts[selectedScenario]}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--g5, #6B7280)', fontStyle: 'italic', fontFamily: "'Montserrat', sans-serif" }}>
                    Prompt nie je nastavený — bude použitý fallback.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Issue text */}
          {selectedScenario && (
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}>
                {isCustomScenario ? 'Pokyn pre voicebot *' : 'Doplnkové inštrukcie (voliteľné)'}
              </div>
              <textarea
                ref={textareaRef}
                value={issueText}
                onChange={e => setIssueText(e.target.value)}
                placeholder={isCustomScenario
                  ? 'Napíš čo má voicebot vybaviť — napr. „Opýtaj sa zákazníka, či potvrdí termín na utorok 10:00"'
                  : 'Pridaj kontext alebo špeciálne požiadavky pre voicebot...'}
                maxLength={500}
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 12px', borderRadius: 10,
                  border: isCustomScenario && !issueText.trim()
                    ? '1.5px solid var(--danger, #EF4444)'
                    : '1.5px solid var(--border, #E8E2D6)',
                  fontSize: 13, fontFamily: "'Montserrat', sans-serif",
                  color: 'var(--dark, #1A1A1A)',
                  background: 'var(--w, #fff)',
                  resize: 'vertical', outline: 'none',
                  transition: 'border-color 0.12s',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--gold, #bf953f)' }}
                onBlur={e => {
                  e.target.style.borderColor = (isCustomScenario && !issueText.trim())
                    ? 'var(--danger, #EF4444)'
                    : 'var(--border, #E8E2D6)'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                {isCustomScenario && !issueText.trim() ? (
                  <span style={{ fontSize: 11, color: 'var(--danger, #EF4444)', fontFamily: "'Montserrat', sans-serif" }}>Povinné — voicebot potrebuje vedieť čo má riešiť</span>
                ) : (
                  <span />
                )}
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Montserrat', sans-serif" }}>{issueText.length}/500</span>
              </div>
            </div>
          )}

          {/* Recipient toggle */}
          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Komu zavolať?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Customer */}
              <button
                onClick={() => handleRecipientChange('customer')}
                disabled={!canCallCustomer}
                title={!canCallCustomer ? 'Zákazník nemá telefónne číslo' : undefined}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                  border: recipient === 'customer' ? '1.5px solid var(--gold, #bf953f)' : '1.5px solid var(--border, #E8E2D6)',
                  background: recipient === 'customer' ? 'var(--gold-bg, #FBF6EB)' : 'var(--w, #fff)',
                  cursor: canCallCustomer ? 'pointer' : 'not-allowed',
                  opacity: canCallCustomer ? 1 : 0.4,
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <User size={13} style={{ color: recipient === 'customer' ? 'var(--gold-dark, #aa771c)' : 'var(--g4)' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: recipient === 'customer' ? 'var(--gold-dark, #aa771c)' : 'var(--dark)', fontFamily: "'Montserrat', sans-serif" }}>
                    Zákazník
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--dark, #1A1A1A)', fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}>{customerName || '—'}</div>
                {customerPhone && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'Montserrat', sans-serif" }}>{customerPhone}</div>}
              </button>

              {/* Technician */}
              <button
                onClick={() => handleRecipientChange('technician')}
                disabled={!canCallTechnician}
                title={!canCallTechnician ? 'Zákazka nemá priradeného technika' : undefined}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                  border: recipient === 'technician' ? '1.5px solid var(--warning, #d97706)' : '1.5px solid var(--border, #E8E2D6)',
                  background: recipient === 'technician' ? 'var(--warning-bg, #fffbeb)' : 'var(--w, #fff)',
                  cursor: canCallTechnician ? 'pointer' : 'not-allowed',
                  opacity: canCallTechnician ? 1 : 0.4,
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <Wrench size={13} style={{ color: recipient === 'technician' ? 'var(--warning, #d97706)' : 'var(--g4)' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: recipient === 'technician' ? 'var(--warning, #d97706)' : 'var(--dark)', fontFamily: "'Montserrat', sans-serif" }}>
                    Technik
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--dark, #1A1A1A)', fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}>{technicianName || '—'}</div>
                {technicianPhone && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'Montserrat', sans-serif" }}>{technicianPhone}</div>}
              </button>
            </div>
          </div>

          {/* Result states */}
          {result === 'success' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: 'var(--success-bg, #f0fdf4)', border: '1px solid var(--success-border, #86efac)', color: 'var(--success-text, #15803d)', fontSize: 13, fontWeight: 600, fontFamily: "'Montserrat', sans-serif" }}>
              <CheckCircle size={15} />
              Voicebot zaradený — zavolá {recipientLabel} o chvíľu.
            </div>
          )}

          {result === 'pending' && (
            <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: 'var(--warning-bg, #fffbeb)', border: '1px solid var(--warning-border, #fcd34d)', color: 'var(--warning, #d97706)', fontSize: 13, fontFamily: "'Montserrat', sans-serif" }}>
              Pre túto zákazku už čaká hovor v poradí. Počkaj na jeho dokončenie.
            </div>
          )}

          {result === 'error' && (
            <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: 'var(--danger-bg, #fef2f2)', border: '1px solid var(--danger-border, #fecaca)', color: 'var(--danger-text, #dc2626)', fontSize: 13, fontFamily: "'Montserrat', sans-serif" }}>
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={() => { if (canSubmit) setShowConfirm(true) }}
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '11px',
              borderRadius: 10, border: 'none',
              background: canSubmit ? 'var(--gold, #bf953f)' : 'var(--border, #E8E2D6)',
              color: canSubmit ? '#fff' : 'var(--text-muted, #78716C)',
              fontSize: 14, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: "'Montserrat', sans-serif",
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (canSubmit) e.currentTarget.style.background = 'var(--gold-dark, #aa771c)' }}
            onMouseLeave={e => { if (canSubmit) e.currentTarget.style.background = 'var(--gold, #bf953f)' }}
          >
            {submitting
              ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Zaraďujem...</>
              : <><Phone size={15} /> Spustiť voicebot pre {recipientLabel}</>
            }
          </button>
        </div>
      </div>

      {/* ── Confirmation modal ── */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--w, #fff)', borderRadius: 14, padding: 28, maxWidth: 420, width: '90%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', fontFamily: "'Montserrat', sans-serif" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--dark)', marginBottom: 16 }}>Potvrdiť spustenie voicebota</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: 80, flexShrink: 0 }}>Komu</span>
                <span style={{ fontSize: 14, color: 'var(--dark)', fontWeight: 600 }}>{recipientLabel} — {recipientDetail}</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: 80, flexShrink: 0 }}>Scenár</span>
                <span style={{ fontSize: 14, color: 'var(--dark)', fontWeight: 600 }}>{selectedScenarioLabel}</span>
              </div>
              {issueText.trim() && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: 80, flexShrink: 0 }}>Pokyn</span>
                  <span style={{ fontSize: 14, color: 'var(--dark)', lineHeight: 1.5 }}>{issueText.trim()}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--dark)', cursor: 'pointer', fontSize: 14, fontFamily: "'Montserrat', sans-serif" }}
              >
                Zrušiť
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleSubmit() }}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--gold, #bf953f)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: "'Montserrat', sans-serif", display: 'flex', alignItems: 'center', gap: 7 }}
              >
                <Phone size={14} /> Potvrdiť a spustiť
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
