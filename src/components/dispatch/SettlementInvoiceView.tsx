'use client'

/**
 * SettlementInvoiceView — Read-only settlement summary before invoicing.
 *
 * Shows complete breakdown: hours × rate, km × rate × visits, materials individually,
 * emergency fee, MINUS client surcharge, = Total for invoice from ZR.
 * Buttons: Vystaviť faktúru / Nahrať vlastnú faktúru.
 */

import type { DispatchJob, SettlementData } from '@/types/dispatch'
import type { Language } from '@/types/protocol'

interface Props {
  job: DispatchJob
  lang: Language
  /** Called when CZ technician wants to issue invoice (opens InvoiceDecisionModal).
   *  For SK technicians, onSkUpload is used instead. */
  onIssueInvoice: () => void
  /** Called when SK technician wants to upload own invoice. */
  onSkUpload?: () => void
  onClose: () => void
}

export default function SettlementInvoiceView({
  job,
  lang,
  onIssueInvoice,
  onSkUpload,
  onClose,
}: Props) {
  const isSk = lang === 'sk'
  // Try to get settlement data from job custom fields
  const sd = (job as any).customFields?.settlement_data as SettlementData | null
  const cur = sd?.currency === 'CZK' ? 'Kč' : '€'
  const hasSurcharge = (sd?.clientSurcharge ?? 0) > 0

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
    background: 'var(--bg-primary)',
    borderRadius: '16px 16px 0 0',
    padding: '20px',
    maxHeight: '85vh',
    overflow: 'auto',
    width: '100%',
    maxWidth: '500px',
    color: 'var(--text-primary)',
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
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '8px 0',
    fontSize: '14px',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border)',
    gap: '8px',
  }

  const rowLabelStyle: React.CSSProperties = {
    flex: 1,
  }

  const rowSubStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  }

  const rowValueStyle: React.CSSProperties = {
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
  }

  const subtractRowStyle: React.CSSProperties = {
    ...rowStyle,
    color: 'var(--warning)',
  }

  const totalRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0 6px',
    borderTop: '2px solid var(--border)',
    marginTop: '8px',
  }

  const totalLabelStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  }

  const totalValueStyle: React.CSSProperties = {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--gold)',
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
    background: 'var(--g8)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 600,
    width: '100%',
    cursor: 'pointer',
    marginBottom: '10px',
  }

  const closeLinkStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
    padding: '8px',
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <span style={titleStyle}>
            🧾 {isSk ? 'Vyúčtovanie zákazky' : 'Vyúčtování zakázky'}
          </span>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        {/* Reference */}
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          padding: '10px 12px',
          marginBottom: '16px',
          fontSize: '13px',
          color: 'var(--text-secondary)',
        }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.referenceNumber}</span>
          {' · '}
          {job.customerName}
          {' · '}
          {job.customerCity}
        </div>

        {sd ? (
          <>
            {/* Full breakdown */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>
                {isSk ? 'Detailné rozúčtovanie' : 'Detailní rozúčtování'}
              </div>

              {/* Labor — agreed price or hourly */}
              {sd.isAgreedPrice && sd.agreedPriceWork ? (
                <div style={rowStyle}>
                  <div style={rowLabelStyle}>
                    <div>{isSk ? 'Dohodnutá cena za prácu' : 'Dohodnutá cena za práci'}</div>
                  </div>
                  <span style={rowValueStyle}>{sd.agreedPriceWork.toFixed(2)} {cur}</span>
                </div>
              ) : (
                <>
                  {/* Labor - first hour */}
                  {sd.laborFirstHour > 0 && (
                    <div style={rowStyle}>
                      <div style={rowLabelStyle}>
                        <div>{isSk ? 'Práca — 1. hodina' : 'Práce — 1. hodina'}</div>
                        <div style={rowSubStyle}>
                          {sd.laborFirstHour.toFixed(1)} h × {sd.laborFirstHourRate} {cur}/h
                        </div>
                      </div>
                      <span style={rowValueStyle}>
                        {(sd.laborFirstHour * sd.laborFirstHourRate).toFixed(2)} {cur}
                      </span>
                    </div>
                  )}

                  {/* Labor - additional hours */}
                  {sd.laborAdditionalHours > 0 && (
                    <div style={rowStyle}>
                      <div style={rowLabelStyle}>
                        <div>{isSk ? 'Práca — ďalšie hodiny' : 'Práce — další hodiny'}</div>
                        <div style={rowSubStyle}>
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
                  <div style={rowLabelStyle}>
                    <div>{isSk ? 'Cestovné' : 'Cestovné'}</div>
                    <div style={rowSubStyle}>
                      {sd.travelKm} km × {sd.travelRatePerKm} {cur}/km × {sd.travelVisits}{' '}
                      {isSk ? 'výjazdy' : 'výjezdy'}
                    </div>
                  </div>
                  <span style={rowValueStyle}>{sd.travelTotal.toFixed(2)} {cur}</span>
                </div>
              )}

              {/* Emergency fee */}
              {sd.emergencyFee > 0 && (
                <div style={rowStyle}>
                  <div style={rowLabelStyle}>
                    <div>{isSk ? 'Pohotovostný poplatok' : 'Pohotovostní poplatek'}</div>
                  </div>
                  <span style={rowValueStyle}>{sd.emergencyFee.toFixed(2)} {cur}</span>
                </div>
              )}

              {/* Materials individually */}
              {sd.materials?.map((mat, i) => (
                <div key={i} style={rowStyle}>
                  <div style={rowLabelStyle}>
                    <div>{mat.name}</div>
                    <div style={rowSubStyle}>
                      {mat.quantity} {mat.unit} × {mat.unitPrice.toFixed(2)} {cur}
                    </div>
                  </div>
                  <span style={rowValueStyle}>{mat.totalPrice.toFixed(2)} {cur}</span>
                </div>
              ))}

              {/* Surcharge deduction */}
              {hasSurcharge && (
                <div style={subtractRowStyle}>
                  <div style={rowLabelStyle}>
                    <div>− {isSk ? 'Doplatok od klienta' : 'Doplatek od klienta'}</div>
                    <div style={{ ...rowSubStyle, color: 'var(--warning)' }}>
                      {isSk ? 'Klient zaplatí priamo technikovi' : 'Klient zaplatí přímo technikovi'}
                    </div>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--warning)', whiteSpace: 'nowrap' }}>
                    −{sd.clientSurcharge.toFixed(2)} {cur}
                  </span>
                </div>
              )}
            </div>

            {/* Total */}
            <div style={totalRowStyle}>
              <span style={totalLabelStyle}>
                {isSk ? 'Na faktúru od ZR' : 'Na fakturu od ZR'}
              </span>
              <span style={totalValueStyle}>{sd.paymentFromZR.toFixed(2)} {cur}</span>
            </div>

            {hasSurcharge && (
              <div style={{
                marginTop: '10px',
                marginBottom: '16px',
                background: 'rgba(191,149,63,0.06)',
                borderRadius: '10px',
                border: '1px solid var(--gold, #C9A84C)',
                padding: '12px 14px',
                display: 'flex',
                gap: '10px',
              }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {isSk ? 'Uhradí ZR' : 'Uhradí ZR'}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gold, #C9A84C)' }}>
                    {sd.paymentFromZR.toFixed(0)} {cur}
                  </div>
                </div>
                <div style={{ width: '1px', background: 'var(--border)' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {isSk ? 'Uhradí klient' : 'Uhradí klient'}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--warning, #E6A817)' }}>
                    {(sd.clientSurchargeWithVat ?? sd.clientSurcharge).toFixed(0)} {cur}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {isSk ? 's DPH' : 's DPH'}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {(job.approvedTotal ?? 0).toFixed(2)} {(job as any).customer_country === 'SK' ? '€' : 'Kč'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {isSk ? 'Schválená celková suma' : 'Schválená celková částka'}
            </div>
          </div>
        )}

        {/* Buttons — CZ: system generate or self-issue; SK: upload own invoice only */}
        {isSk ? (
          <button style={primaryBtnStyle} onClick={onSkUpload || onIssueInvoice}>
            &#128196; {isSk ? 'Nahrať faktúru' : 'Nahrát fakturu'}
          </button>
        ) : (
          <>
            <button style={primaryBtnStyle} onClick={onIssueInvoice}>
              &#129534; {isSk ? 'Vystaviť faktúru' : 'Vystavit fakturu'}
            </button>

            <button style={secondaryBtnStyle} onClick={onIssueInvoice}>
              &#128228; {isSk ? 'Nahrať vlastnú faktúru' : 'Nahrát vlastní fakturu'}
            </button>
          </>
        )}

        <button style={closeLinkStyle} onClick={onClose}>
          {isSk ? 'Zavrieť' : 'Zavřít'}
        </button>
      </div>
    </div>
  )
}
