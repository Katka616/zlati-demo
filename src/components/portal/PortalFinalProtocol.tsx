'use client'

import { useState, useRef, useEffect } from 'react'
import { getVatRate } from '@/lib/constants'

interface Props {
  token: string
  jobData: any // from portal API
  lang: 'sk' | 'cz'
  onAction: (action: string, data?: any) => Promise<void>
}

const TEXTS = {
  sk: {
    title: 'Finálny protokol',
    desc: 'Prosím skontrolujte a podpíšte finálny protokol.',
    totalHours: 'Celkové hodiny',
    totalKm: 'Celkové km',
    totalVisits: 'Počet výjazdov',
    materials: 'Materiál',
    materialName: 'Názov',
    materialQty: 'Mn.',
    materialPrice: 'Cena s DPH',
    workDescription: 'Popis vykonanej práce',
    surchargeIncluded: 'Vrátane schváleného doplatku',
    signerNameLabel: 'Meno podpisujúceho',
    signerNamePlaceholder: 'Meno a priezvisko',
    signatureLabel: 'Podpíšte sa prstom',
    clearSignature: 'Vymazať',
    signProtocol: 'Podpísať protokol',
    signing: 'Podpisujem...',
    signFirst: 'Najprv sa podpíšte',
    signNameRequired: 'Vyplňte meno podpisujúceho',
    signedTitle: 'Protokol podpísaný',
    signedText: 'Ďakujeme za podpis! Zákazka bude uzavretá.',
    errorSending: 'Chyba pri odosielaní',
    currency: '€',
    visits: 'Návštevy',
    visitDate: 'Dátum',
    visitArrival: 'Príchod',
    visitDeparture: 'Odjazd',
    visitHours: 'Hodiny',
    visitKm: 'Km',
    summary: 'Súhrn zákazky',
    surchargeTitle: 'Doplatok klienta',
  },
  cz: {
    title: 'Finální protokol',
    desc: 'Prosím zkontrolujte a podepište finální protokol.',
    totalHours: 'Celkové hodiny',
    totalKm: 'Celkové km',
    totalVisits: 'Počet výjezdů',
    materials: 'Materiál',
    materialName: 'Název',
    materialQty: 'Mn.',
    materialPrice: 'Cena s DPH',
    workDescription: 'Popis provedené práce',
    surchargeIncluded: 'Včetně schváleného doplatku',
    signerNameLabel: 'Jméno podepisujícího',
    signerNamePlaceholder: 'Jméno a příjmení',
    signatureLabel: 'Podepište se prstem',
    clearSignature: 'Smazat',
    signProtocol: 'Podepsat protokol',
    signing: 'Podepisuji...',
    signFirst: 'Nejprve se podepište',
    signNameRequired: 'Vyplňte jméno podepisujícího',
    signedTitle: 'Protokol podepsán',
    signedText: 'Děkujeme za podpis! Zakázka bude uzavřena.',
    errorSending: 'Chyba při odesílání',
    currency: 'Kč',
    visits: 'Návštěvy',
    visitDate: 'Datum',
    visitArrival: 'Příjezd',
    visitDeparture: 'Odjezd',
    visitHours: 'Hodiny',
    visitKm: 'Km',
    summary: 'Souhrn zakázky',
    surchargeTitle: 'Doplatek klienta',
  },
}

export default function PortalFinalProtocol({ token, jobData, lang, onAction }: Props) {
  const t = TEXTS[lang] || TEXTS.cz
  const cf = (jobData?.custom_fields || {}) as Record<string, any>

  // Extract protocol/job data
  const protocolData = (cf.protocol_data || {}) as Record<string, any>
  const protocolHistory = Array.isArray(cf.protocol_history) ? cf.protocol_history : []

  // Consolidate visits from protocol history (skip settlement summary entries)
  const allVisits: Array<{ date: string; arrival?: string; departure?: string; hours: number; km: number }> = []
  for (const entry of protocolHistory) {
    if ((entry as Record<string, unknown>).isSettlementEntry) continue
    const pd = (entry.protocolData || {}) as Record<string, any>
    const visits = Array.isArray(pd.visits) ? pd.visits : []
    for (const v of visits) {
      allVisits.push({
        date: String(v.date || ''),
        arrival: v.arrival ? String(v.arrival) : undefined,
        departure: v.departure ? String(v.departure) : undefined,
        hours: Number(v.hours) || 0,
        km: Number(v.km) || 0,
      })
    }
  }
  // Fallback to protocolData.visits if no history
  if (allVisits.length === 0) {
    const visits = Array.isArray(protocolData.visits) ? protocolData.visits : []
    for (const v of visits) {
      allVisits.push({
        date: String(v.date || ''),
        arrival: v.arrival ? String(v.arrival) : undefined,
        departure: v.departure ? String(v.departure) : undefined,
        hours: Number(v.hours) || 0,
        km: Number(v.km) || 0,
      })
    }
  }

  // Priorita: settlement_data (opravené hodnoty z vyúčtovania) → agregácia z protocol_history
  const sd = cf.settlement_data as { totalHours?: number; totalKm?: number; totalVisits?: number; clientSurcharge?: number; clientSurchargeWithVat?: number } | undefined
  const protocolTotalHours = allVisits.reduce((s, v) => s + v.hours, 0)
  const protocolTotalKm = allVisits.reduce((s, v) => s + v.km, 0)
  const totalHours = sd?.totalHours ?? protocolTotalHours
  const totalKm = sd?.totalKm ?? protocolTotalKm
  const totalVisits = sd?.totalVisits ?? (allVisits.length || 1)

  // Materials — combine from all history entries (dedup + skip settlement entries)
  const rawMaterials: Array<{ name: string; qty: number; unit: string; price: number; type: string; payer: string }> = []
  for (const entry of protocolHistory) {
    if ((entry as Record<string, unknown>).isSettlementEntry) continue
    const pd = (entry.protocolData || {}) as Record<string, any>
    const parts = Array.isArray(pd.spareParts) ? pd.spareParts : []
    for (const m of parts) {
      rawMaterials.push({
        name: String(m.name || ''),
        qty: Number(m.quantity) || 1,
        unit: String(m.unit || 'ks'),
        price: Number(m.price) || 0,
        type: String(m.type || ''),
        payer: String(m.payer || ''),
      })
    }
  }
  // Deduplicate identical materials across visits — accumulate quantities
  const matDedupMap = new Map<string, { name: string; qty: number; unit: string; price: number; type: string; payer: string }>()
  for (const m of rawMaterials) {
    const key = `${m.name}|${m.price}|${m.unit}|${m.type}|${m.payer}`
    const existing = matDedupMap.get(key)
    if (existing) {
      existing.qty += m.qty
    } else {
      matDedupMap.set(key, { ...m })
    }
  }
  const allMaterials = Array.from(matDedupMap.values())
  if (allMaterials.length === 0) {
    const parts = Array.isArray(protocolData.spareParts) ? protocolData.spareParts : []
    for (const m of parts) {
      allMaterials.push({
        name: String(m.name || ''),
        qty: Number(m.quantity) || 1,
        unit: String(m.unit || 'ks'),
        price: Number(m.price) || 0,
        type: String(m.type || ''),
        payer: String(m.payer || ''),
      })
    }
  }

  const workDescription = String(
    protocolData.workDescription || cf.work_description || ''
  )

  const clientSurcharge = Number(cf.client_surcharge ?? cf.settlement_surcharge ?? 0)
  const surchargeWithVat = Number(sd?.clientSurchargeWithVat ?? cf.client_surcharge_with_vat ?? clientSurcharge)
  const hasDph = surchargeWithVat > clientSurcharge
  const surchargeApproved = !!cf.settlement_surcharge_approved

  const formatAmount = (amount: number) => {
    if (lang === 'sk') return `${amount.toLocaleString('sk-SK')} ${t.currency}`
    return `${amount.toLocaleString('cs-CZ')} ${t.currency}`
  }

  // DPH sadzba pre materiál — klient vidí ceny s DPH
  const jobCategory = String(cf.category ?? jobData?.category ?? '')
  const propertyType = (cf.property_type as 'residential' | 'commercial') || 'residential'
  const materialVatRate = getVatRate(jobCategory, propertyType, lang === 'sk' ? 'SK' : 'CZ')
  const addVat = (price: number) => Math.round(price * (1 + materialVatRate))

  // Signature pad
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSig, setHasSig] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // Form state
  const [signerName, setSignerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [signed, setSigned] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
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

  async function handleSign() {
    if (!hasSig) {
      setError(t.signFirst)
      return
    }
    if (!signerName.trim()) {
      setError(t.signNameRequired)
      return
    }
    setError('')
    setLoading(true)
    try {
      const canvas = canvasRef.current
      const signature = canvas?.toDataURL('image/png') || ''
      await onAction('sign_final_protocol', { signature, signerName: signerName.trim() })
      setSigned(true)
    } catch {
      setError(t.errorSending)
    } finally {
      setLoading(false)
    }
  }

  if (signed) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--dark, #1a1a1a)' }}>
          {t.signedTitle}
        </h2>
        <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: '14px' }}>{t.signedText}</p>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: '32px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '16px 16px 0 0',
        padding: '24px',
        color: '#fff',
        marginBottom: '0',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0' }}>{t.title}</h2>
        <p style={{ fontSize: '13px', margin: 0, opacity: 0.85 }}>{t.desc}</p>
      </div>

      {/* Summary */}
      <div style={{ background: 'var(--bg-card, #fff)', padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 0' }}>
          {t.summary}
        </h3>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            flex: 1,
            background: 'var(--bg-card, #f8f9fa)',
            borderRadius: '10px',
            padding: '12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--dark, #1a1a1a)' }}>{totalVisits}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #4B5563)', marginTop: '2px' }}>{t.totalVisits}</div>
          </div>
          <div style={{
            flex: 1,
            background: 'var(--bg-card, #f8f9fa)',
            borderRadius: '10px',
            padding: '12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--dark, #1a1a1a)' }}>{totalHours.toFixed(1)}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #4B5563)', marginTop: '2px' }}>{t.totalHours}</div>
          </div>
          <div style={{
            flex: 1,
            background: 'var(--bg-card, #f8f9fa)',
            borderRadius: '10px',
            padding: '12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--dark, #1a1a1a)' }}>{totalKm}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #4B5563)', marginTop: '2px' }}>{t.totalKm}</div>
          </div>
        </div>
      </div>

      {/* Visits table */}
      {allVisits.length > 0 && (
        <div style={{ background: 'var(--bg-card, #fff)', padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 0' }}>
            {t.visits}
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 4px', color: 'var(--text-secondary, #4B5563)', fontWeight: 500, borderBottom: '1px solid #f0f0f0' }}>{t.visitDate}</th>
                <th style={{ textAlign: 'center', padding: '6px 4px', color: 'var(--text-secondary, #4B5563)', fontWeight: 500, borderBottom: '1px solid #f0f0f0' }}>{t.visitArrival}</th>
                <th style={{ textAlign: 'center', padding: '6px 4px', color: 'var(--text-secondary, #4B5563)', fontWeight: 500, borderBottom: '1px solid #f0f0f0' }}>{t.visitDeparture}</th>
                <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text-secondary, #4B5563)', fontWeight: 500, borderBottom: '1px solid #f0f0f0' }}>{t.visitHours}</th>
                <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text-secondary, #4B5563)', fontWeight: 500, borderBottom: '1px solid #f0f0f0' }}>{t.visitKm}</th>
              </tr>
            </thead>
            <tbody>
              {allVisits.map((v, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px 4px', color: 'var(--dark, #333)', borderBottom: '1px solid #f8f8f8' }}>{v.date || `#${i + 1}`}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--dark, #333)', borderBottom: '1px solid #f8f8f8' }}>{v.arrival || '—'}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--dark, #333)', borderBottom: '1px solid #f8f8f8' }}>{v.departure || '—'}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600, color: 'var(--dark, #333)', borderBottom: '1px solid #f8f8f8' }}>{v.hours.toFixed(1)}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600, color: 'var(--dark, #333)', borderBottom: '1px solid #f8f8f8' }}>{v.km}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Materials */}
      {allMaterials.length > 0 && (
        <div style={{ background: 'var(--bg-card, #fff)', padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 0' }}>
            {t.materials}
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 4px', color: 'var(--text-secondary, #4B5563)', fontWeight: 500, borderBottom: '1px solid #f0f0f0' }}>{t.materialName}</th>
                <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text-secondary, #4B5563)', fontWeight: 500, borderBottom: '1px solid #f0f0f0' }}>{t.materialQty}</th>
                <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text-secondary, #4B5563)', fontWeight: 500, borderBottom: '1px solid #f0f0f0' }}>{t.materialPrice}</th>
              </tr>
            </thead>
            <tbody>
              {allMaterials.map((m, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px 4px', color: 'var(--dark, #333)', borderBottom: '1px solid #f8f8f8' }}>{m.name}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--dark, #333)', borderBottom: '1px solid #f8f8f8' }}>{m.qty} {m.unit}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600, color: 'var(--dark, #333)', borderBottom: '1px solid #f8f8f8' }}>{formatAmount(addVat(m.price))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Work description */}
      {workDescription && (
        <div style={{ background: 'var(--bg-card, #fff)', padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px 0' }}>
            {t.workDescription}
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--dark, #333)', margin: 0, lineHeight: 1.6 }}>{workDescription}</p>
        </div>
      )}

      {/* Surcharge info */}
      {surchargeApproved && clientSurcharge > 0 && (
        <div style={{
          background: '#e8f5e9',
          padding: '14px 20px',
          borderBottom: '1px solid #c8e6c9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '14px', color: '#2e7d32', fontWeight: 500 }}>
            ✅ {t.surchargeIncluded}{hasDph ? ' (s DPH)' : ''}
          </span>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#2e7d32' }}>
            {formatAmount(hasDph ? surchargeWithVat : clientSurcharge)}
          </span>
        </div>
      )}

      {/* Signer name */}
      <div style={{ background: 'var(--bg-card, #fff)', padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--dark, #333)', marginBottom: '8px' }}>
          {t.signerNameLabel}
        </label>
        <input
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder={t.signerNamePlaceholder}
          style={{
            width: '100%',
            padding: '12px 14px',
            border: '1.5px solid #dee2e6',
            borderRadius: '10px',
            fontSize: '15px',
            outline: 'none',
            boxSizing: 'border-box',
            color: 'var(--dark, #1a1a1a)',
          }}
        />
      </div>

      {/* Signature pad */}
      <div style={{ background: 'var(--bg-card, #fff)', padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary, #374151)', margin: '0 0 12px 0' }}>{t.signatureLabel}</p>
        <div style={{
          border: '2px solid #dee2e6',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'var(--bg-card, #fafafa)',
          position: 'relative',
        }}>
          <canvas
            ref={canvasRef}
            width={400}
            height={130}
            style={{ width: '100%', height: '130px', display: 'block', touchAction: 'none' }}
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
              background: 'none',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '13px',
              color: 'var(--text-secondary, #374151)',
              cursor: 'pointer',
            }}
          >
            {t.clearSignature}
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '8px 20px', color: '#DC3545', fontSize: '13px' }}>{error}</div>
      )}

      {/* Submit button */}
      <div style={{ padding: '20px' }}>
        <button
          onClick={handleSign}
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
          {loading ? t.signing : t.signProtocol}
        </button>
      </div>
    </div>
  )
}
