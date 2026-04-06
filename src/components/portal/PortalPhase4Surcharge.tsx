'use client'

import { useState } from 'react'
import { type Job } from '@/data/mockData'
import { useToast } from '@/components/ui/Toast'
import { type PortalTexts } from './portalLocale'
import SignaturePad from '@/components/dispatch/SignaturePad'
import { ClientPriceQuote as PriceBreakdown, type ClientPriceQuote } from './ClientPriceQuote'
import { PortalInlineHint } from '@/components/portal/PortalInlineHint'

interface Phase4Props {
  job: Job
  t: PortalTexts
  token?: string
  lang?: string
  onRefresh?: () => void
}

export function PortalPhase4Surcharge({ job, t, token, lang, onRefresh }: Phase4Props) {
  const { showToast } = useToast()
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)

  const surcharge = job.techPhase.clientSurcharge
  const cf = (job as unknown as { custom_fields?: Record<string, unknown> }).custom_fields ?? {}
  const surchargeReason = cf.surcharge_reason as string | undefined
  const priceQuote = cf.client_price_quote as ClientPriceQuote | undefined
  const quoteSurcharge = Number(priceQuote?.clientDoplatok ?? surcharge ?? 0)
  const hasPayableSurcharge = quoteSurcharge > 0

  const handleApprove = async () => {
    if (!signature) {
      showToast(t.errorSignFirst)
      return
    }

    if (!token) {
      setDecision('approved')
      showToast(`${t.surchargeApprovedTitle} ✅`)
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/portal/${token}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_surcharge', signature })
      })
      if (!res.ok) throw new Error('Action failed')

      setDecision('approved')
      if (navigator.vibrate) navigator.vibrate(50)
      showToast(`${t.surchargeApprovedTitle} ✅`)
      onRefresh?.()
    } catch (err) {
      console.error(err)
      showToast(t.errorGeneric)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!showRejectConfirm) {
      setShowRejectConfirm(true)
      return
    }

    if (!token) {
      setDecision('rejected')
      if (navigator.vibrate) navigator.vibrate(50)
      showToast(t.surchargeRejectedTitle)
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/portal/${token}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline_surcharge' })
      })
      if (!res.ok) throw new Error('Action failed')

      setDecision('rejected')
      if (navigator.vibrate) navigator.vibrate(50)
      showToast(t.surchargeRejectedTitle)
      onRefresh?.()
    } catch (err) {
      console.error(err)
      showToast(t.errorGeneric)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (decision) {
    return (
      <div className="portal-card" style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>
          {decision === 'approved' ? '✅' : '❌'}
        </div>
        <h3 style={{ marginBottom: 8 }}>
          {decision === 'approved' ? t.surchargeApprovedTitle : t.surchargeRejectedTitle}
        </h3>
        <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 14 }}>
          {decision === 'approved'
            ? (cf.is_diagnostics || cf.diagnostic_only
              ? (lang === 'sk' ? 'Ďakujeme za schválenie.' : lang === 'en' ? 'Thank you for your approval.' : 'Děkujeme za schválení.')
              : t.surchargeApprovedText)
            : t.surchargeRejectedText}
        </p>
        {decision === 'approved' && token && (
          <a
            href={`/api/portal/${token}/quote-pdf`}
            download
            style={{
              display: 'inline-block',
              marginTop: 16,
              padding: '10px 20px',
              background: 'var(--gold, #C9A84C)',
              color: '#000',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            {lang === 'sk' ? '⬇ Stiahnuť podpísanú cenovú ponuku'
              : lang === 'en' ? '⬇ Download signed price quote'
              : '⬇ Stáhnout podepsanou cenovou nabídku'}
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="portal-phase">
      <h2 className="portal-phase-title">{t.phase4Title}</h2>

      {!hasPayableSurcharge && (
        <div className="portal-card" style={{ borderLeft: '3px solid var(--green)', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>
            {lang === 'cz' ? 'Doplatek není potřeba' : 'Doplatok nie je potrebný'}
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary, #4B5563)' }}>
            {lang === 'cz'
              ? 'Práce může pokračovat bez dalšího schvalování. Pokud technik cenu ještě upraví, uvidíte změnu přímo tady.'
              : 'Práca môže pokračovať bez ďalšieho schvaľovania. Ak technik cenu ešte upraví, zmenu uvidíte priamo tu.'}
          </p>
        </div>
      )}

      {/* Cenová ponuka — plný rozpis ak je dostupný, inak jednoduchý fallback */}
      {priceQuote ? (
        <>
          <div className="portal-card" style={{ padding: '8px 16px' }}>
            <p className="pq-heading">{t.priceQuoteTitle}</p>
            <PriceBreakdown quote={priceQuote} t={t} />
          </div>
          {token && (
            <div style={{ textAlign: 'center', margin: '4px 0 8px' }}>
              <a
                href={`/api/portal/${token}/quote-pdf`}
                download
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
              >
                ⬇ {lang === 'sk' ? 'Stiahnuť PDF' : lang === 'en' ? 'Download PDF' : 'Stáhnout PDF'}
              </a>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="portal-card">
            <div className="portal-surcharge-row">
              <span>{t.beyondInsurance}</span>
              <span className="portal-surcharge-amount" style={{ color: 'var(--orange)' }}>
                {t.formatPrice(surcharge)}
              </span>
            </div>
            {surchargeReason && (
              <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary, #4B5563)', lineHeight: 1.5 }}>
                {surchargeReason}
              </p>
            )}
          </div>
          <div className="portal-card" style={{ textAlign: 'center', padding: 24 }}>
            <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 13, marginBottom: 4 }}>{t.yourSurcharge}</p>
            <div className="portal-surcharge-big" style={{ color: 'var(--gold, #bf953f)' }}>
              {t.formatPrice(surcharge)}
            </div>
            <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 12, marginTop: 8 }}>
              {t.surchargeNote}
            </p>
          </div>
        </>
      )}

      {hasPayableSurcharge && (
        <div style={{ marginBottom: 16 }}>
          <SignaturePad
            existingSignature={signature}
            onSave={setSignature}
            onClear={() => setSignature(null)}
            lang={(lang === 'cz' ? 'cz' : 'sk') as 'sk' | 'cz'}
          />
        </div>
      )}

      {/* Varovanie pred rozhodnutím */}
      {hasPayableSurcharge && (
        <PortalInlineHint
          variant="warning"
          text={t.hintSurchargeWarning}
          dismissible={false}
        />
      )}

      {/* Akcie */}
      {hasPayableSurcharge && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn btn-green btn-full" onClick={handleApprove} disabled={isSubmitting}>
            {isSubmitting ? <><span className="portal-btn-spinner" />{t.submitting}</> : t.approveBtn}
          </button>

          {showRejectConfirm ? (
            <div className="portal-card" style={{ border: '2px solid var(--red)', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary, #4B5563)', marginBottom: 12 }}>
                {t.rejectConfirmText}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={() => setShowRejectConfirm(false)} disabled={isSubmitting}>
                  {t.rejectBackBtn}
                </button>
                <button className="btn btn-red" onClick={handleReject} disabled={isSubmitting}>
                  {isSubmitting ? <><span className="portal-btn-spinner" />{t.submitting}</> : t.rejectConfirmBtn}
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-outline btn-full" onClick={handleReject} disabled={isSubmitting}>
              {t.rejectBtn}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
