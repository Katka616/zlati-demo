'use client'

import { useState } from 'react'
import { RESCHEDULE_REASON_CODES, PAUSE_WORK_REASON_CODES } from '@/lib/constants'

interface RescheduleModalProps {
  job: { id: string; scheduledDate?: string; scheduledTime?: string; customerName: string }
  onClose: () => void
  onSuccess: () => void
  mode?: 'schedule' | 'pause_work'
  lang?: 'sk' | 'cz'
}

export default function RescheduleModal({ job, onClose, onSuccess, mode = 'schedule', lang = 'sk' }: RescheduleModalProps) {
  const tl = (sk: string, cz: string) => lang === 'cz' ? cz : sk
  const [reasonCode, setReasonCode] = useState('')
  const [reasonNote, setReasonNote] = useState('')
  const [proposedDate, setProposedDate] = useState('')
  const [proposedTime, setProposedTime] = useState('')
  const [proposedMessage, setProposedMessage] = useState('')
  const [materialDeliveryDate, setMaterialDeliveryDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reasonCode) { setError(tl('Vyberte dôvod zmeny termínu', 'Vyberte důvod změny termínu')); return }
    if (reasonCode === 'other' && !reasonNote.trim()) { setError(tl('Zadajte dôvod zmeny', 'Zadejte důvod změny')); return }
    if ((reasonCode === 'missing_material' || reasonCode === 'material_order') && !materialDeliveryDate) { setError(tl('Zadajte očakávaný dátum dodania dielu', 'Zadejte očekávaný datum dodání dílu')); return }
    if (!proposedDate) { setError(tl('Zadajte navrhovaný dátum', 'Zadejte navrhovaný datum')); return }

    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          job_id: parseInt(job.id),
          reason_code: reasonCode,
          proposed_date: proposedDate,
          proposed_time: proposedTime || undefined,
          proposed_message: proposedMessage || undefined,
          reason_note: reasonNote || undefined,
          material_delivery_date: (reasonCode === 'missing_material' || reasonCode === 'material_order') && materialDeliveryDate ? materialDeliveryDate : undefined,
          mode: isPauseMode ? 'pause_work' : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || tl('Nepodarilo sa odoslať žiadosť', 'Nepodařilo se odeslat žádost'))
        return
      }
      onSuccess()
    } catch {
      setError(tl('Chyba siete. Skúste znova.', 'Chyba sítě. Zkuste znovu.'))
    } finally {
      setIsLoading(false)
    }
  }

  const formattedOriginalDate = job.scheduledDate
    ? new Date(job.scheduledDate).toLocaleDateString(lang === 'cz' ? 'cs-CZ' : 'sk-SK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const isPauseMode = mode === 'pause_work'

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
          background: '#1a1a2e', borderRadius: 16, padding: 24,
          maxWidth: 420, width: '90%', maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
            {isPauseMode ? tl('⏸️ Prerušiť prácu', '⏸️ Přerušit práci') : tl('🗓️ Zmena termínu', '🗓️ Změna termínu')}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 20, cursor: 'pointer', padding: 4 }}
          >
            ✕
          </button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 20, lineHeight: 1.4 }}>
          {isPauseMode
            ? `${job.customerName} — ${tl('zadajte dôvod prerušenia a navrhnite ďalšiu návštevu. Klient aj operátor dostanú okamžitú informáciu.', 'zadejte důvod přerušení a navrhněte další návštěvu. Klient i operátor dostanou okamžitou informaci.')}`
            : job.customerName}
        </p>

        {/* Current date (readonly) */}
        {formattedOriginalDate && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              {tl('Aktuálny termín', 'Aktuální termín')}
            </div>
            <div style={{
              background: 'rgba(218,165,32,0.15)', border: '1px solid rgba(218,165,32,0.4)',
              borderRadius: 8, padding: '10px 14px', color: 'var(--gold, #daa520)',
              fontSize: 14, fontWeight: 600,
            }}>
              {formattedOriginalDate}
              {job.scheduledTime && <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 400 }}> · {job.scheduledTime}</span>}
            </div>
          </div>
        )}

        {/* Reason dropdown */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            {isPauseMode ? tl('Dôvod prerušenia *', 'Důvod přerušení *') : tl('Dôvod zmeny *', 'Důvod změny *')}
          </label>
          <select
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
            style={{
              background: '#2a2a3e', border: '1px solid #4b5563', borderRadius: 8,
              padding: 10, color: reasonCode ? '#fff' : '#9ca3af', width: '100%', fontSize: 14,
            }}
          >
            <option value="">{tl('— Vyberte dôvod —', '— Vyberte důvod —')}</option>
            {(isPauseMode ? PAUSE_WORK_REASON_CODES : RESCHEDULE_REASON_CODES).map((r) => (
              <option key={r.code} value={r.code}>{lang === 'cz' ? r.cz : r.sk}</option>
            ))}
          </select>
        </div>

        {/* Dátum dodania dielu — len pre missing_material */}
        {(reasonCode === 'missing_material' || reasonCode === 'material_order') && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              {tl('Dátum dodania dielu *', 'Datum dodání dílu *')}
            </label>
            <input
              type="date"
              value={materialDeliveryDate}
              onChange={(e) => setMaterialDeliveryDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{
                background: '#2a2a3e', border: '1px solid #4b5563', borderRadius: 8,
                padding: 10, color: '#fff', width: '100%', fontSize: 14, boxSizing: 'border-box' as const,
              }}
            />
          </div>
        )}

        {/* Reason note (only if "other") */}
        {reasonCode === 'other' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              {tl('Popíšte dôvod *', 'Popište důvod *')}
            </label>
            <textarea
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder={tl('Zadajte dôvod zmeny termínu...', 'Zadejte důvod změny termínu...')}
              rows={3}
              style={{
                background: '#2a2a3e', border: '1px solid #4b5563', borderRadius: 8,
                padding: 10, color: '#fff', width: '100%', fontSize: 14,
                resize: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Proposed date */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            {isPauseMode ? tl('Dátum ďalšej návštevy *', 'Datum další návštěvy *') : tl('Navrhovaný nový dátum *', 'Navrhované nové datum *')}
          </label>
          <input
            type="date"
            value={proposedDate}
            onChange={(e) => setProposedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            style={{
              background: '#2a2a3e', border: '1px solid #4b5563', borderRadius: 8,
              padding: 10, color: '#fff', width: '100%', fontSize: 14, boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Proposed time */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            {isPauseMode ? tl('Čas ďalšej návštevy (nepovinné)', 'Čas další návštěvy (nepovinné)') : tl('Navrhovaný čas (nepovinné)', 'Navrhovaný čas (nepovinné)')}
          </label>
          <input
            type="time"
            value={proposedTime}
            onChange={(e) => setProposedTime(e.target.value)}
            style={{
              background: '#2a2a3e', border: '1px solid #4b5563', borderRadius: 8,
              padding: 10, color: '#fff', width: '100%', fontSize: 14, boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Message for client */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            {isPauseMode ? tl('Správa pre klienta a operátora (nepovinné)', 'Zpráva klientovi a operátorovi (nepovinné)') : tl('Správa pre klienta (nepovinné)', 'Zpráva klientovi (nepovinné)')}
          </label>
          <textarea
            value={proposedMessage}
            onChange={(e) => setProposedMessage(e.target.value)}
            placeholder={tl('Napr. Ospravedlňujem sa za zmenu termínu...', 'Např. Omlouvám se za změnu termínu...')}
            rows={3}
            style={{
              background: '#2a2a3e', border: '1px solid #4b5563', borderRadius: 8,
              padding: 10, color: '#fff', width: '100%', fontSize: 14,
              resize: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Info text */}
        <div style={{
          background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 12px',
          marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 14 }}>ℹ️</span>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 1.5 }}>
            {isPauseMode
              ? tl('Zákazka sa prepne do stavu prerušená alebo čaká na materiál podľa zvoleného dôvodu. Klient dostane SMS s návrhom ďalšej návštevy.', 'Zakázka se přepne do stavu přerušena nebo čeká na materiál podle zvoleného důvodu. Klient dostane SMS s návrhem další návštěvy.')
              : tl('Klient dostane SMS s návrhom nového termínu a bude môcť súhlasiť alebo navrhnúť iný čas.', 'Klient dostane SMS s návrhem nového termínu a bude moci souhlasit nebo navrhnout jiný čas.')}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)',
            borderRadius: 8, padding: '10px 12px', marginBottom: 16,
            color: '#f87171', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Buttons */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          style={{
            background: isLoading ? '#9a7b14' : 'var(--gold, #daa520)', color: '#fff',
            border: 'none', padding: 14, borderRadius: 10, fontWeight: 700,
            fontSize: 15, cursor: isLoading ? 'not-allowed' : 'pointer', width: '100%',
            marginBottom: 10,
          }}
        >
          {isLoading ? tl('⏳ Odosiela sa...', '⏳ Odesílá se...') : isPauseMode ? tl('Prerušiť prácu a odoslať termín', 'Přerušit práci a odeslat termín') : tl('Odoslať žiadosť o zmenu', 'Odeslat žádost o změnu')}
        </button>

        <button
          onClick={onClose}
          disabled={isLoading}
          style={{
            background: 'none', border: '1px solid #4b5563', borderRadius: 10,
            padding: 12, color: 'rgba(255,255,255,0.85)', fontSize: 14, cursor: 'pointer', width: '100%',
          }}
        >
          {tl('Zrušiť', 'Zrušit')}
        </button>
      </div>
    </div>
  )
}
