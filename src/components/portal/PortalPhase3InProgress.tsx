'use client'

import { useState } from 'react'
import { type Job, type Technician, type TechPhaseKey, type PortalPhase } from '@/data/mockData'
import { type PortalTexts } from './portalLocale'
import { PortalInlineHint } from '@/components/portal/PortalInlineHint'
import type { RescheduleRequest } from '@/types/reschedule'

interface Phase3Props {
  job: Job
  technician: Technician | null
  t: PortalTexts
  phase?: PortalPhase
  activeReschedule?: RescheduleRequest | null
  portalToken?: string
}

/** Ordered phases that show in the client timeline */
const TIMELINE_PHASES: TechPhaseKey[] = [
  'en_route', 'arrived', 'diagnostics', 'working', 'protocol_draft', 'protocol_sent',
]

/** Phase key → emoji mapping (language-independent) */
const TIMELINE_EMOJIS: Record<string, string> = {
  en_route: '🚗',
  arrived: '📍',
  diagnostics: '🔍',
  working: '🔧',
  protocol_draft: '📋',
  protocol_sent: '✅',
}

/** Map any TechPhaseKey to the nearest visible timeline step */
function resolveTimelinePhase(phase: TechPhaseKey | string): TechPhaseKey {
  // Phases that appear directly in the timeline
  if (TIMELINE_PHASES.includes(phase as TechPhaseKey)) return phase as TechPhaseKey

  // Estimate / approval loop → technik je na mieste, prebieha diagnostika / schvalovanie
  if (
    phase === 'estimate_draft' ||
    phase === 'estimate_submitted' ||
    phase === 'estimate_approved' ||
    phase === 'estimate_rejected' ||
    phase === 'diagnostic_completed'
  ) return 'diagnostics'

  // Working variants — break, waiting for material, awaiting next visit, price loops, etc.
  if (
    phase === 'break' ||
    phase === 'caka_material' ||
    phase === 'awaiting_next_visit' ||
    phase === 'price_confirmed' ||
    phase === 'work_completed' ||
    phase === 'final_price_submitted' ||
    phase === 'final_price_approved' ||
    phase === 'final_price_rejected' ||
    phase === 'client_approval_pending' ||
    phase === 'client_approved' ||
    phase === 'client_declined'
  ) return 'working'

  // Protocol / settlement phases
  if (
    phase === 'settlement_review' ||
    phase === 'settlement_correction' ||
    phase === 'settlement_approved' ||
    phase === 'price_review' ||
    phase === 'surcharge_sent' ||
    phase === 'surcharge_approved' ||
    phase === 'surcharge_declined' ||
    phase === 'price_approved' ||
    phase === 'final_protocol_draft' ||
    phase === 'final_protocol_sent' ||
    phase === 'final_protocol_signed' ||
    phase === 'invoice_ready' ||
    phase === 'departed'
  ) return 'protocol_sent'

  // Any other unknown phase defaults to en_route
  return 'en_route'
}

export function PortalPhase3InProgress({ job, technician, t, activeReschedule, portalToken }: Phase3Props) {
  const [showProposalForm, setShowProposalForm] = useState(false)
  const [proposedDate, setProposedDate] = useState('')
  const [proposedTime, setProposedTime] = useState('')
  const [proposalNote, setProposalNote] = useState('')
  const [submittingProposal, setSubmittingProposal] = useState(false)
  const [proposalSent, setProposalSent] = useState(false)
  const [proposalError, setProposalError] = useState('')

  const currentPhase = job.techPhase.phase
  const timelinePhase = resolveTimelinePhase(currentPhase)
  const currentIdx = Math.max(0, TIMELINE_PHASES.indexOf(timelinePhase as TechPhaseKey))
  const nextVisitDate = activeReschedule?.proposed_date ?? job.techPhase.estimateNextVisitDate
  const nextVisitTime = activeReschedule?.proposed_time ?? null
  const materialDeliveryDate = job.techPhase.estimateMaterialDeliveryDate
  const nextVisitLocale = job.customer_country === 'CZ' ? 'cs-CZ' : 'sk-SK'
  const isOrderingParts = currentPhase === 'caka_material'
  const isAwaitingNextVisit = currentPhase === 'awaiting_next_visit'
  const isPaused = currentPhase === 'break'

  // Mapujeme TechPhaseKey → lokalizovaný text z t.*
  const isCz = job.customer_country === 'CZ'

  const cf = (job.custom_fields as Record<string, unknown> | undefined) ?? {}
  const isDiagnosticOnly = Boolean(cf.is_diagnostics || cf.diagnostic_only)
  const surchargeWaived = cf.surcharge_waived === true
  const surchargeApprovedByOperator = cf.surcharge_approved_by_operator === true
  const surchargeAgreement = cf.surcharge_agreement as { decision?: string; amount?: number; currency?: string } | undefined
  const surchargeApprovedByClient = surchargeAgreement?.decision === 'approved'
  const surchargeApproved = surchargeApprovedByOperator || surchargeApprovedByClient
  const visitNumber = cf.current_visit_number as number | undefined
  const showVisitBadge = typeof visitNumber === 'number' && visitNumber > 1
  const nextVisitReason = cf.estimate_next_visit_reason as string | undefined
  const phaseTextMap: Record<string, string> = {
    en_route: t.timelineEnRoute,
    arrived: t.timelineArrived,
    diagnostics: t.timelineDiagnostics,
    working: isAwaitingNextVisit
      ? (isCz ? 'Čeká na další návštěvu' : 'Čaká na ďalšiu návštevu')
      : isPaused
        ? (isCz ? 'Práce přerušená' : 'Práca prerušená')
        : t.timelineWorking,
    protocol_draft: t.timelineFinishing,
    protocol_sent: t.timelineDone,
  }

  return (
    <div className="portal-phase">
      <h2 className="portal-phase-title">{t.phase3Title}</h2>

      {showVisitBadge && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
          color: '#92400E', fontWeight: 600, fontSize: 13,
          padding: '4px 12px', borderRadius: 20,
          marginBottom: 8,
        }}>
          {isCz ? `${visitNumber}. návštěva` : `${visitNumber}. návšteva`}
        </div>
      )}

      {/* Surcharge Approved notice — shown when client/operator confirmed the surcharge */}
      {surchargeApproved && !surchargeWaived && (
        <div className="portal-card" style={{ borderLeft: '3px solid var(--success, #22C55E)', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>
            {isCz ? '✅ Doplatek schválen' : '✅ Doplatok schválený'}
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {surchargeApprovedByOperator
              ? (isCz
                ? isDiagnosticOnly ? 'Doplatek byl schválen v telefonickém hovoru s operátorem.' : 'Doplatek byl schválen v telefonickém hovoru s operátorem. Technik pokračuje v opravě.'
                : isDiagnosticOnly ? 'Doplatok bol schválený v telefonickom hovore s operátorom.' : 'Doplatok bol schválený v telefonickom hovore s operátorom. Technik pokračuje v oprave.')
              : (isCz
                ? isDiagnosticOnly ? 'Doplatek byl úspěšně schválen.' : 'Doplatek byl úspěšně schválen. Technik pokračuje v opravě.'
                : isDiagnosticOnly ? 'Doplatok bol úspešne schválený.' : 'Doplatok bol úspešne schválený. Technik pokračuje v oprave.')}
          </p>
        </div>
      )}

      {/* Surcharge Waived notice — shown when operator decided to continue without surcharge */}
      {surchargeWaived && (
        <div className="portal-card" style={{ borderLeft: '3px solid var(--success, #22C55E)', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>
            {isCz ? '✅ Oprava pokračuje bez doplatku' : '✅ Oprava pokračuje bez doplatku'}
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {isCz
              ? 'Operátor rozhodl pokračovat s opravou bez nutnosti schválení doplatku. Technik pracuje na opravě.'
              : 'Operátor rozhodol pokračovať s opravou bez potreby schválenia doplatku. Technik pracuje na oprave.'}
          </p>
        </div>
      )}

      {/* Technik karta s kontaktom */}
      {technician && (
        <div className="portal-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div className="portal-tech-avatar portal-tech-avatar-sm">
              {technician.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <strong>{technician.name}</strong>
              {technician.phone && (
                <a
                  href={`tel:${technician.phone}`}
                  style={{ display: 'block', color: 'var(--gold-text, #8B6914)', fontSize: 13, textDecoration: 'none', marginTop: 2 }}
                >
                  {technician.phone}
                </a>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {technician.phone && (
              <>
                <a
                  href={`tel:${technician.phone}`}
                  className="portal-action-btn portal-action-call"
                  style={{ flex: 1, minWidth: 0 }}
                >
                  📞 {t.callTech}
                </a>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('portal-open-chat', { detail: { tab: 'tech' } }))}
                  className="portal-action-btn portal-action-chat"
                  style={{ flex: 1, minWidth: 0 }}
                >
                  💬 {t.messageTech}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('portal-open-chat', { detail: { tab: 'dispatch' } }))}
              className="portal-action-btn portal-action-support"
              style={{ flex: '1 1 100%' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M12 1a9 9 0 0 0-9 9v4a1 1 0 0 0 1 1h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H4.07A8 8 0 0 1 12 3a8 8 0 0 1 7.93 7H19a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h.5a1 1 0 0 0 .5-.07V18a3 3 0 0 1-3 3h-2.17a2 2 0 1 0 0 1H17a4 4 0 0 0 4-4v-8a9 9 0 0 0-9-9z"/></svg> {t.contactSupport}
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="portal-card">
        <div className="portal-timeline">
          {TIMELINE_PHASES.map((phase, i) => {
            const text = phaseTextMap[phase]
            const emoji = TIMELINE_EMOJIS[phase]
            if (!text) return null

            const phaseIdx = i
            const isDone = currentIdx > phaseIdx
            const isActive = currentIdx === phaseIdx
            const isPending = currentIdx < phaseIdx

            let dotClass = 'portal-timeline-dot'
            if (isDone) dotClass += ' done'
            else if (isActive) dotClass += ' active'

            return (
              <div key={phase} className="portal-timeline-item">
                <div className="portal-timeline-track">
                  <div className={dotClass}>
                    {isDone ? '✓' : isPending ? (i + 1) : (
                      isActive && isAwaitingNextVisit ? '🗓️' : isActive && isPaused ? '⏸️' : emoji
                    )}
                  </div>
                  {i < TIMELINE_PHASES.length - 1 && (
                    <div className={`portal-timeline-line${isDone ? ' done' : ''}`} />
                  )}
                </div>
                <div className={`portal-timeline-content${isPending ? ' pending' : ''}`}>
                  <span className="portal-timeline-text">{text}</span>
                  {isActive && (
                    <span className="portal-timeline-badge" style={
                      (isAwaitingNextVisit || isPaused) ? { background: 'var(--warning-bg, #FEF3C7)', color: 'var(--warning-text, #92400E)' } : undefined
                    }>
                      {isAwaitingNextVisit
                        ? (isCz ? 'Čeká' : 'Čaká')
                        : isPaused
                          ? (isCz ? 'Přerušeno' : 'Prerušené')
                          : t.timelineNow}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Vysvetlenie krokov timeline — dismissible */}
      <PortalInlineHint
        variant="info"
        text={`🔧 ${t.hintTimelineExplain}`}
        dismissible
        storageKey="portal_timeline_hint"
      />

      {isPaused && (
        <div
          className="portal-card"
          style={{
            borderLeft: '3px solid var(--gold)',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>
            {job.customer_country === 'CZ' ? 'Práce je dočasně přerušená' : 'Práca je dočasne prerušená'}
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary, #4B5563)' }}>
            {nextVisitDate
              ? (job.customer_country === 'CZ'
                ? `Další návštěva je navržená na ${new Date(`${nextVisitDate}T00:00:00`).toLocaleDateString(nextVisitLocale)}${nextVisitTime ? ` o ${nextVisitTime}` : ''}. O změně ví i operátor.`
                : `Ďalšia návšteva je navrhnutá na ${new Date(`${nextVisitDate}T00:00:00`).toLocaleDateString(nextVisitLocale)}${nextVisitTime ? ` o ${nextVisitTime}` : ''}. O zmene vie aj operátor.`)
              : (job.customer_country === 'CZ'
                ? 'Technik připravuje další termín nebo podklady pro pokračování opravy.'
                : 'Technik pripravuje ďalší termín alebo podklady na pokračovanie opravy.')}
          </p>
        </div>
      )}

      {/* Ordering parts card — shown when tech is ordering parts (caka_material phase) */}
      {isOrderingParts && (
        <div
          className="portal-card"
          style={{
            borderLeft: '3px solid var(--blue, #2563EB)',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>
            {isCz ? 'Objednáváme náhradní díly' : 'Objednávame náhradné diely'}
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary, #4B5563)' }}>
            {isCz
              ? 'Technik dokončil diagnostiku a objednává potřebné náhradní díly. Jakmile budou k dispozici, naplánujeme další návštěvu.'
              : 'Technik dokončil diagnostiku a objednáva potrebné náhradné diely. Keď budú k dispozícii, naplánujeme ďalšiu návštevu.'}
          </p>
        </div>
      )}

      {/* Material delivery date card — shown when tech is ordering parts and delivery date is known */}
      {isOrderingParts && materialDeliveryDate && (
        <div
          className="portal-card"
          style={{
            borderLeft: '3px solid var(--warning, #D97706)',
            background: 'var(--warning-bg, #FFFBEB)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning-text, #92400E)', marginBottom: 4 }}>
            📦 {isCz ? 'Materiál se očekává' : 'Materiál sa očakáva'}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--warning-text, #92400E)' }}>
            {new Date(`${materialDeliveryDate}T00:00:00`).toLocaleDateString(nextVisitLocale, { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
        </div>
      )}

      {isOrderingParts && !materialDeliveryDate && (
        <div className="portal-card" style={{ background: 'var(--bg-card)' }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary, #4B5563)', lineHeight: 1.5 }}>
            {isCz
              ? 'Technik upřesní termín dodání co nejdříve.'
              : 'Technik upresní termín dodania čoskoro.'}
          </p>
        </div>
      )}

      {/* Info */}
      <div className="portal-card">
        <div className="portal-info-row">
          <span className="portal-info-label">{t.dateLabel}</span>
          <span>{job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString(nextVisitLocale, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</span>
        </div>
        <div className="portal-info-row">
          <span className="portal-info-label">{t.addressLabel}</span>
          <span>{job.customer_address}, {job.customer_city}</span>
        </div>
      </div>

      {/* Ďalšia návšteva — klient vidí len dátum, nie interné dôvody */}
      {(job.techPhase.estimateNeedsNextVisit || !!activeReschedule) && nextVisitDate && (
        <div className="portal-card" style={{ borderLeft: '3px solid var(--gold)', background: 'var(--bg-card)' }}>
          <div className="portal-info-row">
            <span className="portal-info-label">{t.nextVisitLabel}</span>
            <span style={{ fontWeight: 600 }}>
              {new Date(`${nextVisitDate}T00:00:00`).toLocaleDateString(nextVisitLocale)}
              {nextVisitTime ? ` · ${nextVisitTime}` : ''}
            </span>
          </div>
          {activeReschedule?.reason_note && (
            <div className="portal-info-row">
              <span className="portal-info-label">{job.customer_country === 'CZ' ? 'Poznámka' : 'Poznámka'}</span>
              <span>{activeReschedule.reason_note}</span>
            </div>
          )}
          {materialDeliveryDate && (
            <div className="portal-info-row">
              <span className="portal-info-label">📦 {t.materialDeliveryLabel}</span>
              <span>
                {new Date(`${materialDeliveryDate}T00:00:00`).toLocaleDateString(nextVisitLocale)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Navrhnúť iný termín — zobrazí sa keď technik čaká / práca prerušená / objednáva diely */}
      {(isPaused || isOrderingParts || isAwaitingNextVisit) && (
        <div className="portal-card" style={{ background: 'var(--bg-card)' }}>
          {proposalSent ? (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '2px 0',
            }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>
                  {isCz ? 'Návrh termínu odeslán' : 'Návrh termínu odoslaný'}
                </div>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary, #4B5563)', lineHeight: 1.5 }}>
                  {isCz
                    ? 'Váš návrh termínu byl odeslán technikovi.'
                    : 'Váš návrh termínu bol odoslaný technikovi.'}
                </p>
              </div>
            </div>
          ) : !showProposalForm ? (
            <button
              type="button"
              onClick={() => setShowProposalForm(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '11px 0',
                borderRadius: 8,
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border, #D1D5DB)',
                color: 'var(--dark)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              🗓️ {isCz ? 'Navrhnout jiný termín' : 'Navrhnúť iný termín'}
            </button>
          ) : (
            <div>
              <div style={{ fontWeight: 700, color: 'var(--dark)', marginBottom: 14, fontSize: 15 }}>
                🗓️ {isCz ? 'Navrhnout jiný termín' : 'Navrhnúť iný termín'}
              </div>

              {/* Date */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--dark)', marginBottom: 5 }}>
                  {isCz ? 'Datum' : 'Dátum'} *
                </label>
                <input
                  type="date"
                  value={proposedDate}
                  min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                  onChange={e => setProposedDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1.5px solid var(--border, #D1D5DB)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--dark)',
                    background: 'var(--bg-card)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Time */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--dark)', marginBottom: 5 }}>
                  {isCz ? 'Čas (nepovinné)' : 'Čas (nepovinné)'}
                </label>
                <input
                  type="time"
                  value={proposedTime}
                  onChange={e => setProposedTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1.5px solid var(--border, #D1D5DB)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--dark)',
                    background: 'var(--bg-card)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Note */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--dark)', marginBottom: 5 }}>
                  {isCz ? 'Poznámka (nepovinná)' : 'Poznámka (nepovinná)'}
                </label>
                <textarea
                  value={proposalNote}
                  onChange={e => setProposalNote(e.target.value)}
                  rows={3}
                  placeholder={isCz ? 'Např. jsem doma odpoledne...' : 'Napr. som doma poobede...'}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1.5px solid var(--border, #D1D5DB)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--dark)',
                    background: 'var(--bg-card)',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Error */}
              {proposalError && (
                <div style={{
                  marginBottom: 12,
                  padding: '9px 12px',
                  background: 'var(--danger-bg, #FEF2F2)',
                  border: '1px solid var(--danger-border, #FECACA)',
                  borderRadius: 8,
                  fontSize: 13,
                  color: 'var(--danger, #DC2626)',
                }}>
                  {proposalError}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  disabled={submittingProposal || !proposedDate}
                  onClick={async () => {
                    if (!proposedDate) return
                    if (!portalToken) { setProposalError('Chýba portal token'); return }
                    setSubmittingProposal(true)
                    setProposalError('')
                    try {
                      const res = await fetch(`/api/portal/${portalToken}/action`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'propose_next_visit',
                          proposed_date: proposedDate,
                          ...(proposedTime ? { proposed_time: proposedTime } : {}),
                          ...(proposalNote.trim() ? { client_note: proposalNote.trim() } : {}),
                        }),
                      })
                      const data = await res.json()
                      if (data.success) {
                        setProposalSent(true)
                        setShowProposalForm(false)
                        if (navigator.vibrate) navigator.vibrate(50)
                      } else {
                        setProposalError(
                          isCz
                            ? 'Nepodařilo se odeslat návrh. Zkuste to znovu.'
                            : 'Nepodarilo sa odoslať návrh. Skúste znova.'
                        )
                      }
                    } catch {
                      setProposalError(
                        isCz
                          ? 'Chyba spojení. Zkuste to znovu.'
                          : 'Chyba spojenia. Skúste znova.'
                      )
                    } finally {
                      setSubmittingProposal(false)
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '11px 0',
                    borderRadius: 8,
                    background: submittingProposal || !proposedDate ? 'var(--g5, #9CA3AF)' : 'var(--gold)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 14,
                    border: 'none',
                    cursor: submittingProposal || !proposedDate ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submittingProposal
                    ? <><span className="portal-btn-spinner" />{isCz ? 'Odesílám...' : 'Odosielam...'}</>
                    : (isCz ? 'Odeslat návrh' : 'Odoslať návrh')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProposalForm(false)
                    setProposalError('')
                    setProposedDate('')
                    setProposedTime('')
                    setProposalNote('')
                  }}
                  style={{
                    padding: '11px 18px',
                    borderRadius: 8,
                    background: 'var(--bg-card)',
                    border: '1.5px solid var(--border, #D1D5DB)',
                    color: 'var(--dark)',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  {isCz ? 'Zrušit' : 'Zrušiť'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
