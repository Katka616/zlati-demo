'use client'

import { useState, useRef, useEffect } from 'react'
import { ClientPriceQuote as PriceBreakdown, type ClientPriceQuote } from './ClientPriceQuote'
import { getPortalTexts } from './portalLocale'
import { getVatRate } from '@/lib/constants'

interface Props {
  token: string
  jobData: any // from portal API
  lang: 'sk' | 'cz'
  onAction: (action: string, data?: any) => Promise<void>
}

const TEXTS = {
  sk: {
    title: 'Doplatok za opravu',
    desc: 'Technik dokončil prácu. Celkové náklady presahujú krytie poisťovne.',
    surchargeAmount: 'Výška doplatku',
    surchargeWithVat: 'Doplatok vrátane DPH',
    approveBtn: 'Súhlasím s doplatkom',
    declineBtn: 'Nesúhlasím',
    breakdown: 'Rozpis nákladov',
    workCost: 'Práca',
    travelCost: 'Cestovné',
    materialCost: 'Materiál',
    emergencyCost: 'Pohotovostný príplatok',
    coverageLimit: 'Krytie poisťovne',
    overLimit: 'Nad rámec krytia',
    signatureLabel: 'Podpíšte sa pre potvrdenie',
    clearSignature: 'Vymazať',
    confirmReject: 'Naozaj nechcete súhlasiť? Oprava môže byť pozastavená.',
    rejectBack: 'Späť',
    rejectConfirm: 'Potvrdiť odmietnutie',
    approvedTitle: 'Doplatok schválený',
    approvedText: 'Ďakujeme! Zákazka bude pokračovať.',
    rejectedTitle: 'Doplatok odmietnutý',
    rejectedText: 'Vaše rozhodnutie bolo zaznamenané. Budeme vás kontaktovať.',
    signFirst: 'Najprv sa podpíšte',
    errorSending: 'Chyba pri odosielaní',
    currency: '€',
  },
  cz: {
    title: 'Doplatek za opravu',
    desc: 'Technik dokončil práci. Celkové náklady přesahují krytí pojišťovny.',
    surchargeAmount: 'Výše doplatku',
    surchargeWithVat: 'Doplatek včetně DPH',
    approveBtn: 'Souhlasím s doplatkem',
    declineBtn: 'Nesouhlasím',
    breakdown: 'Rozpis nákladů',
    workCost: 'Práce',
    travelCost: 'Cestovné',
    materialCost: 'Materiál',
    emergencyCost: 'Pohotovostní příplatek',
    coverageLimit: 'Krytí pojišťovny',
    overLimit: 'Nad rámec krytí',
    signatureLabel: 'Podepište se pro potvrzení',
    clearSignature: 'Smazat',
    confirmReject: 'Opravdu nechcete souhlasit? Oprava může být pozastavena.',
    rejectBack: 'Zpět',
    rejectConfirm: 'Potvrdit odmítnutí',
    approvedTitle: 'Doplatek schválen',
    approvedText: 'Děkujeme! Zakázka bude pokračovat.',
    rejectedTitle: 'Doplatek odmítnut',
    rejectedText: 'Vaše rozhodnutí bylo zaznamenáno. Budeme vás kontaktovat.',
    signFirst: 'Nejprve se podepište',
    errorSending: 'Chyba při odesílání',
    currency: 'Kč',
  },
}

export default function PortalSettlementQuote({ token, jobData, lang, onAction }: Props) {
  const t = TEXTS[lang] || TEXTS.cz
  const cf = (jobData?.custom_fields || {}) as Record<string, any>

  // Full price quote from pricing engine (generated when surcharge was sent)
  const priceQuote = cf.client_price_quote as ClientPriceQuote | undefined
  const portalTexts = getPortalTexts(lang)

  // Extract financial data from jobData
  // Priority: settlement_data (canonical) → old settlement_*_cost scalars → approved_* legacy
  const sd = cf.settlement_data as { laborTotal?: number; travelTotal?: number; materialsTotal?: number } | undefined
  const laborCost = Number(sd?.laborTotal ?? cf.settlement_labor_cost ?? cf.approved_total ?? 0)
  const travelCost = Number(sd?.travelTotal ?? cf.settlement_travel_cost ?? cf.approved_travel ?? 0)
  const materialCost = Number(sd?.materialsTotal ?? cf.settlement_material_cost ?? cf.approved_material ?? 0)
  const emergencyCost = Number((sd as any)?.emergencyFee ?? cf.settlement_emergency_cost ?? 0)
  const coverageLimit = Number(cf.coverage_limit ?? jobData?.coverage ?? 0)
  const clientSurcharge = Number(cf.client_surcharge ?? cf.settlement_surcharge ?? 0)
  // Prefer client_price_quote.clientDoplatok which already has correct VAT applied by pricing engine.
  // Fallback: multiply clientSurcharge (bez DPH) by category-aware VAT rate from constants.ts.
  const quoteWithVat = Number(priceQuote?.clientDoplatok ?? 0)
  const jobCategory = String(cf.category ?? jobData?.category ?? '')
  const propertyType = (cf.property_type as 'residential' | 'commercial') || 'residential'
  const country = lang === 'sk' ? 'SK' : 'CZ'
  const vatRate = getVatRate(jobCategory, propertyType, country)
  const surchargeWithVat = quoteWithVat > 0
    ? quoteWithVat
    : Math.round(clientSurcharge * (1 + vatRate) * 100) / 100

  // Signature pad
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSig, setHasSig] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // State
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null)

  // Canvas setup — match internal resolution to displayed size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  function getPos(e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    }
  }

  function startDraw(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    setIsDrawing(true)
    lastPos.current = getPos(e, canvas)
  }

  function draw(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    if (lastPos.current) {
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
    lastPos.current = pos
    setHasSig(true)
  }

  function stopDraw(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault()
    setIsDrawing(false)
    lastPos.current = null
  }

  function clearSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
  }

  async function handleApprove() {
    if (!hasSig) {
      setError(t.signFirst)
      return
    }
    setError('')
    setLoading(true)
    try {
      const canvas = canvasRef.current
      const signature = canvas?.toDataURL('image/png') || ''
      await onAction('approve_settlement_surcharge', { signature })
      setResult('approved')
    } catch {
      setError(t.errorSending)
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    setLoading(true)
    try {
      await onAction('decline_settlement_surcharge', {})
      setResult('rejected')
    } catch {
      setError(t.errorSending)
    } finally {
      setLoading(false)
      setShowRejectConfirm(false)
    }
  }

  const formatAmount = (amount: number) => {
    if (lang === 'sk') return `${amount.toLocaleString('sk-SK')} ${t.currency}`
    return `${amount.toLocaleString('cs-CZ')} ${t.currency}`
  }

  if (result === 'approved') {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--dark, #111827)' }}>
          {t.approvedTitle}
        </h2>
        <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: '14px' }}>{t.approvedText}</p>
      </div>
    )
  }

  if (result === 'rejected') {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--dark, #111827)' }}>
          {t.rejectedTitle}
        </h2>
        <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: '14px' }}>{t.rejectedText}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 0 32px 0' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--gold, #C5A55A) 0%, #b8963f 100%)',
        borderRadius: '16px 16px 0 0',
        padding: '24px',
        color: '#fff',
        marginBottom: '0',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0' }}>{t.title}</h2>
        <p style={{ fontSize: '13px', margin: 0, opacity: 0.9 }}>{t.desc}</p>
      </div>

      {/* Pricing breakdown — full ClientPriceQuote when available, simple fallback otherwise */}
      {priceQuote ? (
        <div style={{
          background: 'var(--bg-card, #fff)',
          borderRadius: '0',
          padding: '8px 16px 0',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <PriceBreakdown quote={priceQuote} t={portalTexts} />
        </div>
      ) : (
        <>
          <div style={{
            background: 'var(--bg-card, #fff)',
            borderRadius: '0',
            padding: '20px',
            borderBottom: '1px solid #f0f0f0',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 0' }}>
              {t.breakdown}
            </h3>

            {laborCost > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: 'var(--text-secondary, #4B5563)', fontSize: '14px' }}>{t.workCost}</span>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--dark, #111827)' }}>{formatAmount(laborCost)}</span>
              </div>
            )}

            {travelCost > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: 'var(--text-secondary, #4B5563)', fontSize: '14px' }}>{t.travelCost}</span>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--dark, #111827)' }}>{formatAmount(travelCost)}</span>
              </div>
            )}

            {materialCost > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: 'var(--text-secondary, #4B5563)', fontSize: '14px' }}>{t.materialCost}</span>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--dark, #111827)' }}>{formatAmount(materialCost)}</span>
              </div>
            )}

            {emergencyCost > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: 'var(--text-secondary, #4B5563)', fontSize: '14px' }}>{t.emergencyCost}</span>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--dark, #111827)' }}>{formatAmount(emergencyCost)}</span>
              </div>
            )}

            {coverageLimit > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#28a745', fontSize: '14px' }}>{t.coverageLimit}</span>
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#28a745' }}>- {formatAmount(coverageLimit)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #1a1a1a' }}>
              <span style={{ fontWeight: 700, fontSize: '16px' }}>{t.overLimit}</span>
              <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--gold, #C5A55A)' }}>{formatAmount(clientSurcharge)}</span>
            </div>
          </div>

          {/* Surcharge total with VAT */}
          <div style={{
            background: '#fff3cd',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #ffc107',
          }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#856404' }}>{t.surchargeWithVat}</span>
            <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gold, #C5A55A)' }}>{formatAmount(surchargeWithVat)}</span>
          </div>
        </>
      )}

      {/* Signature pad */}
      <div style={{ background: 'var(--bg-card, #fff)', padding: '20px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary, #374151)', fontWeight: 500, margin: '0 0 12px 0' }}>{t.signatureLabel}</p>
        <div style={{
          border: '2px solid #dee2e6',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'var(--bg-card, #fafafa)',
          position: 'relative',
        }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '120px', display: 'block', touchAction: 'none' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          {!hasSig && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              pointerEvents: 'none',
            }}>
              ✍️ {t.signatureLabel}
            </div>
          )}
        </div>
        {hasSig && (
          <button
            onClick={clearSignature}
            style={{
              marginTop: '8px',
              background: 'var(--bg-card, #F3F4F6)',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-secondary, #374151)',
              cursor: 'pointer',
            }}
          >
            {t.clearSignature}
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '0 20px', color: '#DC3545', fontSize: '13px', marginBottom: '8px' }}>{error}</div>
      )}

      {/* Buttons */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onClick={handleApprove}
          disabled={loading}
          style={{
            background: 'var(--gold, #C5A55A)',
            color: '#000',
            border: 'none',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 600,
            width: '100%',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {t.approveBtn}
        </button>

        {!showRejectConfirm ? (
          <button
            onClick={() => setShowRejectConfirm(true)}
            disabled={loading}
            style={{
              background: 'var(--bg-card, #F3F4F6)',
              color: 'var(--text-secondary, #374151)',
              border: '1px solid #D1D5DB',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 600,
              width: '100%',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {t.declineBtn}
          </button>
        ) : (
          <div style={{
            background: 'var(--bg-card, #F9FAFB)',
            border: '1px solid var(--g3, #D1D5DB)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #374151)', margin: '0 0 12px 0', fontWeight: 500 }}>
              {t.confirmReject}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowRejectConfirm(false)}
                style={{
                  flex: 1,
                  background: 'var(--bg-card, #F3F4F6)',
                  color: 'var(--text-secondary, #374151)',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t.rejectBack}
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                style={{
                  flex: 1,
                  background: '#DC3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {t.rejectConfirm}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
