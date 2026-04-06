'use client'

/**
 * SettlementResultModal — Shows the pricing result to the technician.
 *
 * Breakdown: what insurer pays, what client pays (surcharge), what tech receives from ZR.
 * Three surcharge states:
 *   1. surcharge + already approved → green info + "collect from client" + continue button
 *   2. surcharge + waiting → "waiting for client approval"
 *   3. no surcharge → continue to final protocol
 * All states include a dispute button for the technician.
 */

import { useState } from 'react'
import type { DispatchJob, SettlementData } from '@/types/dispatch'
import type { Language } from '@/types/protocol'

interface Props {
  job: DispatchJob
  lang: Language
  settlementData: SettlementData | null
  onApprovePrice: () => Promise<void>
  onDispute?: (reason: string) => Promise<void>
  onClose: () => void
}

export default function SettlementResultModal({
  job,
  lang,
  settlementData,
  onApprovePrice,
  onDispute,
  onClose,
}: Props) {
  const [approving, setApproving] = useState(false)
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputing, setDisputing] = useState(false)

  const sd = settlementData
  const cur = sd?.currency === 'CZK' ? 'Kč' : '€'
  const hasSurcharge = (sd?.clientSurcharge ?? 0) > 0

  // Check if client already approved the surcharge (via portal diagnostic or quote approval)
  const surchargeAgreement = job.customFields?.surcharge_agreement as { decision?: string } | undefined
  const surchargeAlreadyApproved = surchargeAgreement?.decision === 'approved'

  // VAT breakdown pre doplatok — použiť DPH sadzbu z settlement dát
  const surchargeNoVat = sd?.clientSurcharge ?? 0
  const surchargeWithVat = sd?.clientSurchargeWithVat ?? 0
  const surchargeVatAmount = surchargeWithVat > 0 ? surchargeWithVat - surchargeNoVat : 0
  const sdAny = sd as unknown as Record<string, unknown> | undefined
  const surchargeVatRate = sdAny?.dphRate
    ? Math.round(Number(sdAny.dphRate) * 100)
    : (surchargeNoVat > 0 && surchargeVatAmount > 0
      ? Math.round((surchargeVatAmount / surchargeNoVat) * 100)
      : (sd?.currency === 'EUR' ? 23 : 12))

  const handleApprove = async () => {
    setApproving(true)
    try {
      await onApprovePrice()
    } finally {
      setApproving(false)
    }
  }

  const handleDispute = async () => {
    if (!onDispute || disputeReason.trim().length < 10) return
    setDisputing(true)
    try {
      await onDispute(disputeReason.trim())
      onClose()
    } finally {
      setDisputing(false)
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  }

  const contentStyle: React.CSSProperties = {
    background: 'var(--surface)',
    borderRadius: '16px 16px 0 0',
    padding: '20px',
    maxHeight: '85vh',
    overflow: 'auto',
    width: '100%',
    maxWidth: '500px',
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  }

  const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: '4px',
  }

  const sectionStyle: React.CSSProperties = {
    marginBottom: '16px',
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '10px',
  }

  const cardTitleStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  }

  const cardValueStyle: React.CSSProperties = {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--gold)',
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--divider)',
  }

  const rowValueStyle: React.CSSProperties = {
    fontWeight: 600,
    color: 'var(--text-primary)',
  }

  const infoBannerStyle: React.CSSProperties = {
    background: 'var(--info-bg)',
    border: '1px solid var(--info-border)',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '16px',
    lineHeight: 1.5,
  }

  const primaryBtnStyle: React.CSSProperties = {
    background: 'var(--gold)',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 600,
    width: '100%',
    cursor: 'pointer',
    marginBottom: '10px',
  }

  const secondaryBtnStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 600,
    width: '100%',
    cursor: 'pointer',
  }

  if (!sd) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
          <div style={headerStyle}>
            <span style={titleStyle}>💰 {lang === 'sk' ? 'Výsledok ceny' : 'Výsledek ceny'}</span>
            <button style={closeBtnStyle} onClick={onClose}>✕</button>
          </div>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
            {lang === 'sk' ? 'Dáta sa načítavajú...' : 'Data se načítají...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <span style={titleStyle}>
            💰 {lang === 'sk' ? 'Výsledok ceny zákazky' : 'Výsledek ceny zakázky'}
          </span>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        {/* Main summary cards */}
        <div style={sectionStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: hasSurcharge ? '1fr 1fr' : '1fr', gap: '10px' }}>
            <div style={{ ...cardStyle, background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
              <div style={cardTitleStyle}>
                {lang === 'sk' ? '🏦 Platí poisťovňa' : '🏦 Platí pojišťovna'}
              </div>
              <div style={cardValueStyle}>{sd.paymentFromZR.toFixed(2)} {cur}</div>
            </div>

            {hasSurcharge && (
              <div style={{ ...cardStyle, background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
                <div style={cardTitleStyle}>
                  {lang === 'sk' ? '👤 Platí klient' : '👤 Platí klient'}
                </div>
                <div style={{ ...cardValueStyle, color: 'var(--warning)' }}>
                  {surchargeWithVat.toFixed(2)} {cur}
                </div>
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>{lang === 'sk' ? 'Bez DPH' : 'Bez DPH'}</span>
                    <span style={{ fontWeight: 600 }}>{surchargeNoVat.toFixed(2)} {cur}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>DPH ({surchargeVatRate}%)</span>
                    <span style={{ fontWeight: 600 }}>{surchargeVatAmount.toFixed(2)} {cur}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detailed breakdown — identical to invoice */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            {lang === 'sk' ? 'Rozpis faktúry' : 'Rozpis faktury'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Labor: 1st hour */}
            {sd.isAgreedPrice && sd.agreedPriceWork ? (
              <div style={rowStyle}>
                <div>
                  <span>{lang === 'sk' ? 'Dohodnutá cena za prácu' : 'Dohodnutá cena za práci'}</span>
                </div>
                <span style={rowValueStyle}>{sd.agreedPriceWork.toFixed(2)} {cur}</span>
              </div>
            ) : (
              <>
                <div style={rowStyle}>
                  <div>
                    <span>{lang === 'sk' ? '1. hodina práce' : '1. hodina práce'}</span>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {sd.laborFirstHour.toFixed(1)} h × {sd.laborFirstHourRate} {cur}/h
                    </div>
                  </div>
                  <span style={rowValueStyle}>
                    {(sd.laborFirstHour * sd.laborFirstHourRate).toFixed(2)} {cur}
                  </span>
                </div>
                {sd.laborAdditionalHours > 0 && (
                  <div style={rowStyle}>
                    <div>
                      <span>{lang === 'sk' ? 'Ďalšie hodiny' : 'Další hodiny'}</span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {sd.laborAdditionalHours.toFixed(1)} h × {sd.laborAdditionalHourRate} {cur}/h
                      </div>
                    </div>
                    <span style={rowValueStyle}>
                      {(sd.laborAdditionalHours * sd.laborAdditionalHourRate).toFixed(2)} {cur}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Travel */}
            {sd.travelTotal > 0 && (
              <div style={rowStyle}>
                <div>
                  <span>{lang === 'sk' ? 'Cestovné' : 'Cestovné'}</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {sd.travelKm} km × {sd.travelRatePerKm} {cur}/km
                    {sd.travelVisits > 1 ? ` × ${sd.travelVisits} ${lang === 'sk' ? 'výjazdy' : 'výjezdy'}` : ''}
                  </div>
                </div>
                <span style={rowValueStyle}>{sd.travelTotal.toFixed(2)} {cur}</span>
              </div>
            )}

            {/* Emergency fee */}
            {sd.emergencyFee > 0 && (
              <div style={rowStyle}>
                <span>{lang === 'sk' ? 'Pohotovostný poplatok' : 'Pohotovostní poplatek'}</span>
                <span style={rowValueStyle}>{sd.emergencyFee.toFixed(2)} {cur}</span>
              </div>
            )}

            {/* Individual materials */}
            {sd.materials && sd.materials.length > 0 && (
              <>
                {sd.materials.map((m, i) => (
                  <div key={i} style={rowStyle}>
                    <div>
                      <span>{m.name || (lang === 'sk' ? 'Materiál' : 'Materiál')}</span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {m.quantity} {m.unit} × {m.unitPrice.toFixed(2)} {cur}
                      </div>
                    </div>
                    <span style={rowValueStyle}>
                      {m.totalPrice.toFixed(2)} {cur}
                    </span>
                  </div>
                ))}
              </>
            )}

            {/* Surcharge deduction — bez DPH (paymentFromZR = subtotal - clientSurcharge) */}
            {hasSurcharge && (
              <div style={{ ...rowStyle, color: 'var(--warning)' }}>
                <div>
                  <span>− {lang === 'sk' ? 'Doplatok od klienta' : 'Doplatek od klienta'}</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {lang === 'sk' ? 'Klient zaplatí priamo technikovi' : 'Klient zaplatí přímo technikovi'}
                  </div>
                </div>
                <span style={{ fontWeight: 600 }}>−{surchargeNoVat.toFixed(2)} {cur}</span>
              </div>
            )}

            {/* Total — MUST match invoice */}
            <div style={{
              ...rowStyle,
              borderTop: '2px solid var(--gold)',
              borderBottom: 'none',
              fontWeight: 700,
              color: 'var(--dark)',
              fontSize: '16px',
              paddingTop: '12px',
              marginTop: '4px',
            }}>
              <span>{lang === 'sk' ? 'Na faktúru od ZR' : 'Na fakturu od ZR'}</span>
              <span style={{ color: 'var(--gold)' }}>{sd.paymentFromZR.toFixed(2)} {cur}</span>
            </div>

            {/* Client pays separately */}
            {hasSurcharge && (
              <div style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                textAlign: 'right',
                paddingTop: '4px',
              }}>
                + {surchargeWithVat.toFixed(2)} {cur} {lang === 'sk' ? 'od klienta osobne (s DPH)' : 'od klienta osobně (s DPH)'}
              </div>
            )}
          </div>
        </div>

        {/* Surcharge info or continue button — 3 states */}
        {hasSurcharge && surchargeAlreadyApproved ? (
          /* State 1: Surcharge exists AND client already approved */
          <>
            <div style={{
              ...infoBannerStyle,
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: 'var(--green, #16a34a)',
            }}>
              ✅ {lang === 'sk'
                ? `Klient schválil doplatok ${surchargeWithVat.toFixed(2)} ${cur} (s DPH). Vyberte od klienta osobne.`
                : `Klient schválil doplatek ${surchargeWithVat.toFixed(2)} ${cur} (s DPH). Vyberte od klienta osobně.`}
            </div>
            <button
              style={{ ...primaryBtnStyle, opacity: approving ? 0.7 : 1 }}
              disabled={approving}
              onClick={handleApprove}
            >
              {approving ? '⏳' : '📋'}{' '}
              {lang === 'sk' ? 'Pokračovať k finálnemu protokolu' : 'Pokračovat k finálnímu protokolu'}
            </button>
          </>
        ) : hasSurcharge ? (
          /* State 2: Surcharge exists but client hasn't approved yet */
          <>
            <div style={infoBannerStyle}>
              📤 {lang === 'sk'
                ? `Klientovi bol odoslaný rozpočet na schválenie vo výške ${surchargeWithVat.toFixed(2)} ${cur} (vrátane DPH ${surchargeVatRate}%). Čakáme na jeho odpoveď.`
                : `Klientovi byl odeslán rozpočet ke schválení ve výši ${surchargeWithVat.toFixed(2)} ${cur} (včetně DPH ${surchargeVatRate}%). Čekáme na jeho odpověď.`}
            </div>
            <button style={secondaryBtnStyle} onClick={onClose}>
              {lang === 'sk' ? 'Zavrieť — čakám na klienta' : 'Zavřít — čekám na klienta'}
            </button>
          </>
        ) : (
          /* State 3: No surcharge */
          <>
            <button
              style={{ ...primaryBtnStyle, opacity: approving ? 0.7 : 1 }}
              disabled={approving}
              onClick={handleApprove}
            >
              {approving ? '⏳' : '📋'}{' '}
              {lang === 'sk' ? 'Pokračovať k finálnemu protokolu' : 'Pokračovat k finálnímu protokolu'}
            </button>
          </>
        )}

        {/* Dispute settlement — available in all states */}
        {!showDisputeForm ? (
          <button
            style={{
              ...secondaryBtnStyle,
              marginTop: '8px',
              color: 'var(--danger, #DC2626)',
              fontSize: '14px',
            }}
            onClick={() => setShowDisputeForm(true)}
          >
            ⚠️ {lang === 'sk' ? 'Rozporujem vyúčtovanie' : 'Rozporuji vyúčtování'}
          </button>
        ) : (
          <div style={{
            marginTop: '12px',
            background: 'rgba(220, 38, 38, 0.05)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            borderRadius: '8px',
            padding: '12px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--danger, #DC2626)', marginBottom: '8px' }}>
              {lang === 'sk' ? 'Dôvod rozporovania:' : 'Důvod rozporování:'}
            </div>
            <textarea
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              placeholder={lang === 'sk'
                ? 'Napíšte prečo nesúhlasíte s vyúčtovaním (min. 10 znakov)...'
                : 'Napište proč nesouhlasíte s vyúčtováním (min. 10 znaků)...'}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--divider)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                style={{
                  ...primaryBtnStyle,
                  background: 'var(--danger, #DC2626)',
                  color: '#FFF',
                  flex: 1,
                  opacity: disputing || disputeReason.trim().length < 10 ? 0.5 : 1,
                }}
                disabled={disputing || disputeReason.trim().length < 10}
                onClick={handleDispute}
              >
                {disputing ? '⏳' : '⚠️'}{' '}
                {lang === 'sk' ? 'Odoslať' : 'Odeslat'}
              </button>
              <button
                style={{ ...secondaryBtnStyle, flex: 1 }}
                onClick={() => { setShowDisputeForm(false); setDisputeReason('') }}
              >
                {lang === 'sk' ? 'Zrušiť' : 'Zrušit'}
              </button>
            </div>
          </div>
        )}

        {/* Close button when no other close exists */}
        {!hasSurcharge && !showDisputeForm && (
          <button style={{ ...secondaryBtnStyle, marginTop: '8px' }} onClick={onClose}>
            {lang === 'sk' ? 'Zavrieť' : 'Zavřít'}
          </button>
        )}
      </div>
    </div>
  )
}
