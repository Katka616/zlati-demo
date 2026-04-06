'use client'

/**
 * EstimateFormModal — slide-up form for technician price estimate after diagnostic.
 *
 * Collects: work hours, km per visit, number of visits, materials list,
 * next-visit info, and optional note. Sends EstimateFormData to parent.
 *
 * Pattern: AcceptJobModal slide-up (modal-overlay + modal-content).
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { DispatchJob, EstimateFormData, EstimateMaterial, SpecialPricingInput, DrainTechnique, ContaminationLevel, PestTaskType, PestSeverity } from '@/types/dispatch'
import { MATERIAL_UNITS, Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'
import { getMaterialSuggestions, filterSuggestions, getBrandSuggestions, getTypeSuggestions, getCategoryCode, type MaterialSuggestion } from '@/lib/materialCatalog'
import DictateTextarea from '@/components/ui/DictateTextarea'
import HintText from '@/components/ui/HintText'

interface EstimateFormModalProps {
  job: DispatchJob
  lang: Language
  isSubmitting: boolean
  onSubmit: (data: EstimateFormData) => void
  onCancel: () => void
}

// ── Rate key resolver (mirrors pricingInputBuilder.ts logic) ──────────────────
// Uses category codes (08./09. = kanalizacia, special set, else standard)
const KANALIZACIA_CODES = ['08.', '09.']
const SPECIAL_CODES = ['03.', '04.', '05.', '06.', '07.', '11.', '12.', '14.', '15.', '20.']

function getRateKeyForCategory(category: string): 'standard' | 'special' | 'kanalizacia' {
  const cat = category ?? ''
  if (KANALIZACIA_CODES.some(c => cat.startsWith(c))) return 'kanalizacia'
  if (SPECIAL_CODES.some(c => cat.startsWith(c))) return 'special'
  return 'standard'
}

// ── Special pricing detection ─────────────────────────────────────────────────
const DRAIN_CODES = ['08.', '09.']
const PEST_CODES = ['20.']

function getSpecialPricingType(category: string): 'drain' | 'pest' | null {
  const cat = category ?? ''
  if (DRAIN_CODES.some(c => cat.startsWith(c))) return 'drain'
  if (PEST_CODES.some(c => cat.startsWith(c))) return 'pest'
  return null
}

// Low-rate threshold — below this h1 is considered suspiciously low and we show a soft notice
const LOW_RATE_THRESHOLD_CZK = 200
const LOW_RATE_THRESHOLD_EUR = 8

const NEXT_VISIT_REASONS = [
  { value: 'material_order', labelKey: 'dispatch.estimate.reasonMaterialOrder' },
  { value: 'complex_repair', labelKey: 'dispatch.estimate.reasonComplex' },
  { value: 'material_purchase', labelKey: 'dispatch.estimate.reasonPurchase' },
] as const

function createEmptyMaterial(): EstimateMaterial {
  return {
    id: crypto.randomUUID(),
    name: '',
    quantity: 1,
    unit: 'ks',
    pricePerUnit: 0,
  }
}

export default function EstimateFormModal({
  job,
  lang,
  isSubmitting,
  onSubmit,
  onCancel,
}: EstimateFormModalProps) {
  const t = useCallback(
    (key: string) => getTranslation(lang, key),
    [lang]
  )

  // --- Pre-fill from existing estimate data ---
  const prev = job.estimateData

  // --- GPS measured km (fetched async, used as prefill if no prev data) ---
  const [gpsKm, setGpsKm] = useState<number | null>(null)

  useEffect(() => {
    if (prev?.kmPerVisit) return // already have previous estimate — no need for GPS
    if (!job?.id) return
    fetch(`/api/jobs/${job.id}/gps-routes`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.routes?.length > 0) {
          const latest = data.routes[data.routes.length - 1]
          if (latest.measured_km && latest.measured_km > 0) {
            setGpsKm(Math.round(Number(latest.measured_km) * 10) / 10)
          }
        }
      })
      .catch(() => {}) // non-fatal
  }, [job?.id, prev?.kmPerVisit])

  // --- Form state ---
  const [estimatedHours, setEstimatedHours] = useState<string>(
    prev?.estimatedHours ? String(prev.estimatedHours) : ''
  )
  const [kmPerVisit, setKmPerVisit] = useState<string>(() => {
    if (prev?.kmPerVisit) return String(prev.kmPerVisit)
    return job.distance && job.distance > 0
      ? String(Math.round(job.distance * 2 * 10) / 10)
      : ''
  })

  // Apply GPS measured km as prefill once it loads (only if field is still at default/empty and no prev)
  useEffect(() => {
    if (!gpsKm) return
    if (prev?.kmPerVisit) return // don't overwrite existing estimate
    setKmPerVisit(String(gpsKm))
  }, [gpsKm, prev?.kmPerVisit])
  const [numberOfVisits, setNumberOfVisits] = useState(prev?.numberOfVisits ?? 1)
  const [materials, setMaterials] = useState<EstimateMaterial[]>(
    prev?.materials?.length ? prev.materials.map(m => ({ ...m, id: m.id || crypto.randomUUID() })) : []
  )
  const [needsNextVisit, setNeedsNextVisit] = useState(prev?.needsNextVisit ?? false)
  const [nextVisitReason, setNextVisitReason] = useState(prev?.nextVisitReason ?? '')
  const [nextVisitDate, setNextVisitDate] = useState(prev?.nextVisitDate ?? '')
  const [materialDeliveryDate, setMaterialDeliveryDate] = useState(prev?.materialDeliveryDate ?? '')
  const [materialPurchaseHours, setMaterialPurchaseHours] = useState<string>(
    prev?.materialPurchaseHours ? String(prev.materialPurchaseHours) : ''
  )
  const [cannotCalculateNow, setCannotCalculateNow] = useState(prev?.cannotCalculateNow ?? false)
  const [note, setNote] = useState(prev?.note ?? '')

  // ── Special pricing state (drain / pest) ────────────────────────────────
  const specialType = getSpecialPricingType(job.category ?? '')
  const prevSp = prev?.specialPricing
  const [agreedPrice, setAgreedPrice] = useState<string>(
    prevSp?.agreedPrice ? String(prevSp.agreedPrice) : ''
  )
  // Drain fields
  const [pipeMeters, setPipeMeters] = useState<string>(
    (prevSp?.type === 'drain' && prevSp.pipe_meters) ? String(prevSp.pipe_meters) : ''
  )
  const [contamination, setContamination] = useState<ContaminationLevel>(
    (prevSp?.type === 'drain' && prevSp.contamination_level) ? prevSp.contamination_level : 'moderate'
  )
  const [techniques, setTechniques] = useState<DrainTechnique[]>(
    (prevSp?.type === 'drain' && prevSp.techniques) ? prevSp.techniques : []
  )
  // Pest fields
  const [pestTaskType, setPestTaskType] = useState<PestTaskType>(
    (prevSp?.type === 'pest' && prevSp.task_type) ? prevSp.task_type : 'rodent'
  )
  const [pestSeverity, setPestSeverity] = useState<PestSeverity>(
    (prevSp?.type === 'pest' && prevSp.severity) ? prevSp.severity : 'moderate'
  )

  // --- Validation errors ---
  const [errors, setErrors] = useState<Record<string, string>>({})

  // --- Material suggestions (hybrid: static catalog + DB custom materials) ---
  const catalogSuggestions = useMemo(() => getMaterialSuggestions(job.category, lang), [job.category, lang])
  const [dbSuggestions, setDbSuggestions] = useState<MaterialSuggestion[]>([])
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null)

  // Fetch custom materials from DB on mount
  useEffect(() => {
    const code = getCategoryCode(job.category)
    if (!code) return
    fetch(`/api/dispatch/materials?category=${code}&lang=${lang}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.materials) {
          setDbSuggestions(data.materials.map((m: { name: string; brand?: string }) => ({
            name: m.name,
            brand: m.brand || undefined,
          })))
        }
      })
      .catch(err => console.error('[EstimateForm] Failed to load custom materials:', err))
  }, [job.category, lang])

  // Merge: catalog first, then DB (deduped by name)
  const allSuggestions = useMemo(() => {
    const catalogNames = new Set(catalogSuggestions.map(s => s.name.toLowerCase()))
    const unique = dbSuggestions.filter(s => !catalogNames.has(s.name.toLowerCase()))
    return [...catalogSuggestions, ...unique]
  }, [catalogSuggestions, dbSuggestions])

  const applySuggestion = (matId: string, suggestion: MaterialSuggestion) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === matId ? { ...m, name: suggestion.name, brand: suggestion.brand || '' } : m))
    )
    setActiveSuggestionId(null)
  }

  // --- Material handlers ---
  const addMaterial = () => {
    setMaterials((prev) => [...prev, createEmptyMaterial()])
  }

  const removeMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id))
  }

  const updateMaterial = (id: string, field: keyof EstimateMaterial, value: string | number) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    )
  }

  // --- Computed ---
  const materialTotal = materials.reduce(
    (sum, m) => sum + (m.quantity || 0) * (m.pricePerUnit || 0),
    0
  )

  const currencyLabel = job.country === 'CZ' ? 'Kč' : '€'

  // ── Rate check state ──────────────────────────────────────────────────────
  const srKey = getRateKeyForCategory(job.category ?? '')

  type RatesLoadState = 'loading' | 'missing' | 'low' | 'ok'
  const [ratesState, setRatesState] = useState<RatesLoadState>('loading')
  const [rateH1, setRateH1] = useState<string>('')
  const [rateH2, setRateH2] = useState<string>('')
  const [rateKm, setRateKm] = useState<string>('')
  const [ratesSaving, setRatesSaving] = useState(false)
  const [ratesSaved, setRatesSaved] = useState(false)
  const [ratesExpanded, setRatesExpanded] = useState(false)
  const [currentH1, setCurrentH1] = useState<number>(0)

  useEffect(() => {
    // Special pricing categories (drain/pest) use agreed price, not hourly rates
    // Skip rate check entirely — missing rates are expected and OK
    if (specialType) {
      setRatesState('ok')
      return
    }

    // Fetch service_rates for the current job's category from the rates endpoint
    fetch('/api/dispatch/profile/rates', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) { setRatesState('missing'); return }
        const sr = data.service_rates?.[srKey]
        const h1 = sr?.h1 ?? 0
        const h2 = sr?.h2 ?? 0
        const km = data.travel_costs_per_km ?? 0

        setCurrentH1(h1)
        setRateH1(h1 ? String(h1) : '')
        setRateH2(h2 ? String(h2) : '')
        setRateKm(km ? String(km) : '')

        if (!h1 && !h2 && !km) {
          setRatesState('missing')
          return
        }

        const lowThreshold = job.country === 'CZ' ? LOW_RATE_THRESHOLD_CZK : LOW_RATE_THRESHOLD_EUR
        if (h1 > 0 && h1 < lowThreshold) {
          setRatesState('low')
          return
        }

        setRatesState('ok')
      })
      .catch((err) => {
        console.error('[EstimateFormModal] rates fetch error:', err)
        // Non-fatal: let technician proceed — pricing engine will warn operator about 0 rates
        setRatesState('ok')
      })
  }, [srKey, job.country, specialType])

  const handleSaveRates = async () => {
    const h1 = parseFloat(rateH1) || 0
    const h2 = parseFloat(rateH2) || 0
    const km = parseFloat(rateKm) || 0

    setRatesSaving(true)
    try {
      const res = await fetch('/api/dispatch/profile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'pricing',
          data: { firstHourRate: h1, additionalHourRate: h2, kmRate: km },
        }),
      })

      if (res.ok) {
        setCurrentH1(h1)
        setRatesSaved(true)
        setRatesExpanded(false)
        const lowThreshold = job.country === 'CZ' ? LOW_RATE_THRESHOLD_CZK : LOW_RATE_THRESHOLD_EUR
        if (h1 > 0 && h1 < lowThreshold) {
          setRatesState('low')
        } else {
          setRatesState('ok')
        }
        setTimeout(() => setRatesSaved(false), 3000)
      } else {
        console.error('[EstimateFormModal] Failed to save rates:', await res.text())
      }
    } catch (err) {
      console.error('[EstimateFormModal] Save rates error:', err)
    } finally {
      setRatesSaving(false)
    }
  }

  // --- Validation ---
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Special pricing: require agreedPrice
    if (specialType && !cannotCalculateNow) {
      const price = parseFloat(agreedPrice)
      if (!agreedPrice || isNaN(price) || price <= 0) {
        newErrors.agreedPrice = lang === 'cz'
          ? 'Zadejte vaši cenu za práci'
          : 'Zadajte vašu cenu za prácu'
      }
    }

    if (!cannotCalculateNow) {
      // Hours: required for normal categories, optional but recommended for special
      if (!specialType) {
        const hours = parseFloat(estimatedHours)
        if (!estimatedHours || isNaN(hours) || hours <= 0) {
          newErrors.hours = t('dispatch.estimate.validationHours')
        }
      }

      const km = parseFloat(kmPerVisit)
      if (kmPerVisit === '' || isNaN(km) || km < 0) {
        newErrors.km = t('dispatch.estimate.validationKm')
      }

      // Validate materials — skip empty rows (no name, no price)
      materials.forEach((m, i) => {
        const isEmpty = !m.name.trim() && m.pricePerUnit === 0 && m.quantity <= 1
        if (isEmpty) return // skip auto-initialized empty rows
        if (!m.name.trim()) {
          newErrors[`mat_name_${i}`] = t('dispatch.estimate.validationMaterialName')
        }
        if (m.quantity <= 0) {
          newErrors[`mat_qty_${i}`] = t('dispatch.estimate.validationMaterialQty')
        }
        if (m.pricePerUnit < 0) {
          newErrors[`mat_price_${i}`] = lang === 'cz'
            ? 'Cena materiálu nemůže být záporná'
            : 'Cena materiálu nemôže byť záporná'
        }
      })
    }

    if (needsNextVisit && numberOfVisits <= 1) {
      newErrors.visits = lang === 'cz'
        ? 'Pokud je potřeba další výjezd, počet výjezdů musí být alespoň 2'
        : 'Ak je potrebná ďalšia návšteva, počet výjazdov musí byť aspoň 2'
    }

    if (needsNextVisit && !nextVisitReason) {
      newErrors.reason = t('dispatch.estimate.validationReason')
    }

    if (needsNextVisit && nextVisitReason === 'material_order' && !materialDeliveryDate) {
      newErrors.materialDeliveryDate = t('dispatch.estimate.validationDeliveryDate')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // --- Submit ---
  const handleSubmit = () => {
    if (!validate()) return

    // Build special pricing input if applicable
    let spInput: SpecialPricingInput | undefined
    if (specialType === 'drain') {
      spInput = {
        type: 'drain',
        agreedPrice: parseFloat(agreedPrice) || 0,
        pipe_meters: parseFloat(pipeMeters) || undefined,
        contamination_level: contamination,
        techniques: techniques.length > 0 ? techniques : undefined,
      }
    } else if (specialType === 'pest') {
      spInput = {
        type: 'pest',
        agreedPrice: parseFloat(agreedPrice) || 0,
        task_type: pestTaskType,
        severity: pestSeverity,
      }
    }

    const data: EstimateFormData = {
      estimatedHours: parseFloat(estimatedHours) || 0,
      kmPerVisit: parseFloat(kmPerVisit) || 0,
      numberOfVisits,
      materials: materials.filter(m => m.name.trim()), // skip empty rows
      needsNextVisit,
      nextVisitReason: needsNextVisit ? nextVisitReason : undefined,
      nextVisitDate: needsNextVisit && nextVisitDate ? nextVisitDate : undefined,
      materialDeliveryDate: needsNextVisit && nextVisitReason === 'material_order' && materialDeliveryDate
        ? materialDeliveryDate : undefined,
      materialPurchaseHours: nextVisitReason === 'material_purchase'
        ? parseFloat(materialPurchaseHours) || undefined
        : undefined,
      cannotCalculateNow,
      note: note.trim() || undefined,
      specialPricing: spInput,
    }

    onSubmit(data)

    // Fire-and-forget: save non-catalog materials to DB for future suggestions
    const code = getCategoryCode(job.category)
    if (code && materials.length > 0) {
      const catalogNames = new Set(catalogSuggestions.map(s => s.name.toLowerCase()))
      const newMaterials = materials.filter(m => m.name.trim() && !catalogNames.has(m.name.trim().toLowerCase()))
      for (const m of newMaterials) {
        fetch('/api/dispatch/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_code: code,
            name: m.name.trim(),
            brand: m.brand?.trim() || undefined,
            type: undefined,
            lang,
          }),
        }).catch(err => console.error('[EstimateForm] Failed to save custom material:', err))
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content estimate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="estimate-header">
          <h2 className="modal-title">{t('dispatch.estimate.title')}</h2>
          <span className="job-card-ref">{job.referenceNumber}</span>
        </div>

        {/* Scrollable form body */}
        <div className="estimate-body">

          {/* ── Rate check panel ─────────────────────────────────────────── */}
          {ratesState === 'missing' && (
            <div style={{
              background: 'rgba(212, 168, 67, 0.1)',
              border: '1px solid var(--gold)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}>
              <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {t('dispatch.estimate.ratesWarning')}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="estimate-field-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 13 }}>{t('dispatch.estimate.ratesH1')} ({currencyLabel}/hod) *</label>
                  <div className="estimate-input-with-unit">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="10"
                      value={rateH1}
                      onChange={(e) => setRateH1(e.target.value)}
                      placeholder="0"
                    />
                    <span className="estimate-unit">{currencyLabel}</span>
                  </div>
                </div>

                <div className="estimate-field-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 13 }}>{t('dispatch.estimate.ratesH2')} ({currencyLabel}/hod)</label>
                  <div className="estimate-input-with-unit">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="10"
                      value={rateH2}
                      onChange={(e) => setRateH2(e.target.value)}
                      placeholder="0"
                    />
                    <span className="estimate-unit">{currencyLabel}</span>
                  </div>
                </div>

                <div className="estimate-field-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 13 }}>{t('dispatch.estimate.ratesKm')} ({currencyLabel}/km)</label>
                  <div className="estimate-input-with-unit">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.5"
                      value={rateKm}
                      onChange={(e) => setRateKm(e.target.value)}
                      placeholder="0"
                    />
                    <span className="estimate-unit">{currencyLabel}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-gold btn-full"
                style={{ marginTop: 14, fontSize: 14, padding: '11px 16px' }}
                onClick={handleSaveRates}
                disabled={ratesSaving}
              >
                {ratesSaving ? t('dispatch.estimate.ratesSaving') : t('dispatch.estimate.ratesSave')}
              </button>

              {ratesSaved && (
                <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--success)', textAlign: 'center' }}>
                  ✓ {t('dispatch.estimate.ratesSaved')}
                </p>
              )}
            </div>
          )}

          {/* ── Soft low-rate notice ──────────────────────────────────────── */}
          {ratesState === 'low' && !ratesExpanded && (
            <div style={{
              background: 'rgba(212, 168, 67, 0.06)',
              border: '1px solid var(--gold)',
              borderRadius: 12,
              padding: '10px 14px',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', flex: 1, lineHeight: 1.4 }}>
                {t('dispatch.estimate.ratesWarningInfo').replace('{h1}', String(currentH1))}
              </p>
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--gold)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  padding: 0,
                }}
                onClick={() => setRatesExpanded(true)}
              >
                {t('dispatch.estimate.ratesExpand')}
              </button>
            </div>
          )}

          {/* ── Expanded rate editor (from soft notice) ──────────────────── */}
          {ratesState === 'low' && ratesExpanded && (
            <div style={{
              background: 'rgba(212, 168, 67, 0.06)',
              border: '1px solid var(--gold)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="estimate-field-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 13 }}>{t('dispatch.estimate.ratesH1')} ({currencyLabel}/hod)</label>
                  <div className="estimate-input-with-unit">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="10"
                      value={rateH1}
                      onChange={(e) => setRateH1(e.target.value)}
                    />
                    <span className="estimate-unit">{currencyLabel}</span>
                  </div>
                </div>

                <div className="estimate-field-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 13 }}>{t('dispatch.estimate.ratesH2')} ({currencyLabel}/hod)</label>
                  <div className="estimate-input-with-unit">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="10"
                      value={rateH2}
                      onChange={(e) => setRateH2(e.target.value)}
                    />
                    <span className="estimate-unit">{currencyLabel}</span>
                  </div>
                </div>

                <div className="estimate-field-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 13 }}>{t('dispatch.estimate.ratesKm')} ({currencyLabel}/km)</label>
                  <div className="estimate-input-with-unit">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.5"
                      value={rateKm}
                      onChange={(e) => setRateKm(e.target.value)}
                    />
                    <span className="estimate-unit">{currencyLabel}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  type="button"
                  className="btn btn-gold"
                  style={{ flex: 1, fontSize: 14, padding: '11px 16px' }}
                  onClick={handleSaveRates}
                  disabled={ratesSaving}
                >
                  {ratesSaving ? t('dispatch.estimate.ratesSaving') : t('dispatch.estimate.ratesSave')}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: 13, padding: '11px 14px' }}
                  onClick={() => setRatesExpanded(false)}
                  disabled={ratesSaving}
                >
                  ✕
                </button>
              </div>

              {ratesSaved && (
                <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--success)', textAlign: 'center' }}>
                  ✓ {t('dispatch.estimate.ratesSaved')}
                </p>
              )}
            </div>
          )}

          {/* Cannot calculate checkbox */}
          <label className="estimate-checkbox-row">
            <input
              type="checkbox"
              checked={cannotCalculateNow}
              onChange={(e) => setCannotCalculateNow(e.target.checked)}
            />
            <span>{t('dispatch.estimate.cannotCalculate')}</span>
          </label>
          <HintText text={t('dispatch.hints.estimate_cannot_calc')} />

          {/* Main fields — hidden when cannotCalculateNow */}
          {!cannotCalculateNow && (
            <>
              {/* ── SPECIAL PRICING: Agreed price (drain/pest only) ────────── */}
              {specialType && (
                <div style={{
                  background: 'rgba(212, 168, 67, 0.08)',
                  border: '1px solid var(--gold)',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 12 }}>
                    {specialType === 'drain'
                      ? (lang === 'cz' ? '🚿 Čištění odpadů — úkolová práce' : '🚿 Čistenie odpadov — úkolová práca')
                      : (lang === 'cz' ? '🐀 Deratizace — úkolová práce' : '🐀 Deratizácia — úkolová práca')
                    }
                  </div>

                  {/* Agreed price — main input */}
                  <div className="estimate-field-group" style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>
                      {lang === 'cz' ? 'Vaše cena za práci' : 'Vaša cena za prácu'} ({currencyLabel}) *
                    </label>
                    <div className="estimate-input-with-unit">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="100"
                        value={agreedPrice}
                        onChange={(e) => setAgreedPrice(e.target.value)}
                        placeholder="0"
                        className={errors.agreedPrice ? 'input-error' : ''}
                        style={{ fontSize: 18, fontWeight: 700, padding: '12px 14px' }}
                      />
                      <span className="estimate-unit">{currencyLabel}</span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      {lang === 'cz'
                        ? 'Celková dohodnutá suma za práci (bez cestovného a materiálu)'
                        : 'Celková dohodnutá suma za prácu (bez cestovného a materiálu)'}
                    </p>
                    {errors.agreedPrice && <span className="field-error">{errors.agreedPrice}</span>}
                    {parseFloat(agreedPrice) > 0 && (
                      <div style={{
                        background: 'rgba(33, 150, 243, 0.06)',
                        border: '1px solid rgba(33, 150, 243, 0.2)',
                        borderRadius: 6,
                        padding: '6px 10px',
                        marginTop: 8,
                        fontSize: 11,
                        color: '#1565C0',
                        lineHeight: 1.4,
                      }}>
                        {lang === 'cz'
                          ? 'ℹ Pojišťovna hradí práci hodinově. Pokud vaše cena převyšuje hodinové krytí, rozdíl doplatí zákazník.'
                          : 'ℹ Poisťovňa hradí prácu hodinovo. Ak vaša cena prevyšuje hodinové krytie, rozdiel doplatí zákazník.'}
                      </div>
                    )}
                  </div>

                  {/* ── Drain-specific context fields ── */}
                  {specialType === 'drain' && (
                    <>
                      <div className="estimate-field-group" style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 12 }}>
                          {lang === 'cz' ? 'Metráž potrubí' : 'Metráž potrubia'} (m)
                        </label>
                        <div className="estimate-input-with-unit">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="1"
                            value={pipeMeters}
                            onChange={(e) => setPipeMeters(e.target.value)}
                            placeholder="0"
                          />
                          <span className="estimate-unit">m</span>
                        </div>
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                          {lang === 'cz' ? 'Znečištění' : 'Znečistenie'}
                        </label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {([
                            { value: 'light' as const, label: lang === 'cz' ? 'Lehké' : 'Ľahké' },
                            { value: 'moderate' as const, label: lang === 'cz' ? 'Střední' : 'Stredné' },
                            { value: 'heavy' as const, label: lang === 'cz' ? 'Těžké' : 'Ťažké' },
                          ]).map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setContamination(opt.value)}
                              style={{
                                flex: 1,
                                padding: '8px 4px',
                                borderRadius: 8,
                                border: contamination === opt.value ? '2px solid var(--gold)' : '1px solid var(--border)',
                                background: contamination === opt.value ? 'rgba(212, 168, 67, 0.15)' : 'var(--surface)',
                                color: 'var(--text-primary)',
                                fontWeight: contamination === opt.value ? 600 : 400,
                                fontSize: 13,
                                cursor: 'pointer',
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: 4 }}>
                        <label style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                          {lang === 'cz' ? 'Použitá technika' : 'Použitá technika'}
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {([
                            { value: 'manual_rod' as const, label: lang === 'cz' ? 'Ruční hrot' : 'Ručný hrot' },
                            { value: 'high_pressure_jet' as const, label: lang === 'cz' ? 'Vysokotlak' : 'Vysokotlak' },
                            { value: 'camera_inspection' as const, label: lang === 'cz' ? 'Kamera' : 'Kamera' },
                            { value: 'suction_truck' as const, label: lang === 'cz' ? 'Cisterna' : 'Cisterna' },
                          ]).map(opt => {
                            const isSelected = techniques.includes(opt.value)
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setTechniques(prev =>
                                  isSelected ? prev.filter(t => t !== opt.value) : [...prev, opt.value]
                                )}
                                style={{
                                  padding: '7px 12px',
                                  borderRadius: 8,
                                  border: isSelected ? '2px solid var(--gold)' : '1px solid var(--border)',
                                  background: isSelected ? 'rgba(212, 168, 67, 0.15)' : 'var(--surface)',
                                  color: 'var(--text-primary)',
                                  fontWeight: isSelected ? 600 : 400,
                                  fontSize: 12,
                                  cursor: 'pointer',
                                }}
                              >
                                {isSelected ? '✓ ' : ''}{opt.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── Pest-specific context fields ── */}
                  {specialType === 'pest' && (
                    <>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                          {lang === 'cz' ? 'Typ zásahu' : 'Typ zásahu'}
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {([
                            { value: 'rodent' as const, label: lang === 'cz' ? '🐀 Hlodavci' : '🐀 Hlodavce' },
                            { value: 'insect' as const, label: '🪳 Hmyz' },
                            { value: 'wasp_nest' as const, label: lang === 'cz' ? '🐝 Vosí hnízdo' : '🐝 Osie hniezdo' },
                            { value: 'disinfection' as const, label: lang === 'cz' ? '🧴 Dezinfekce' : '🧴 Dezinfekcia' },
                          ]).map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setPestTaskType(opt.value)}
                              style={{
                                flex: '1 0 45%',
                                padding: '10px 8px',
                                borderRadius: 8,
                                border: pestTaskType === opt.value ? '2px solid var(--gold)' : '1px solid var(--border)',
                                background: pestTaskType === opt.value ? 'rgba(212, 168, 67, 0.15)' : 'var(--surface)',
                                color: 'var(--text-primary)',
                                fontWeight: pestTaskType === opt.value ? 600 : 400,
                                fontSize: 13,
                                cursor: 'pointer',
                                textAlign: 'center',
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: 4 }}>
                        <label style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                          {lang === 'cz' ? 'Závažnost' : 'Závažnosť'}
                        </label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {([
                            { value: 'minor' as const, label: lang === 'cz' ? 'Mírná' : 'Mierna' },
                            { value: 'moderate' as const, label: lang === 'cz' ? 'Střední' : 'Stredná' },
                            { value: 'severe' as const, label: lang === 'cz' ? 'Závažná' : 'Vážna' },
                          ]).map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setPestSeverity(opt.value)}
                              style={{
                                flex: 1,
                                padding: '8px 4px',
                                borderRadius: 8,
                                border: pestSeverity === opt.value ? '2px solid var(--gold)' : '1px solid var(--border)',
                                background: pestSeverity === opt.value ? 'rgba(212, 168, 67, 0.15)' : 'var(--surface)',
                                color: 'var(--text-primary)',
                                fontWeight: pestSeverity === opt.value ? 600 : 400,
                                fontSize: 13,
                                cursor: 'pointer',
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Estimated hours — for special categories shown with different label */}
              <div className="estimate-field-group">
                <label>
                  {specialType
                    ? (lang === 'cz' ? 'Odhadovaný čas na místě (hod)' : 'Odhadovaný čas na mieste (hod)')
                    : t('dispatch.estimate.hours')
                  }
                  {!specialType && ' *'}
                </label>
                <div className="estimate-input-with-unit">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder="0"
                    className={errors.hours ? 'input-error' : ''}
                  />
                  <span className="estimate-unit">hod</span>
                </div>
                {specialType ? (
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {lang === 'cz'
                      ? 'Pro výpočet fakturace pojišťovně. Vaše odměna je dle dohodnuté ceny výše.'
                      : 'Pre výpočet fakturácie poisťovni. Vaša odmena je podľa dohodnutej sumy vyššie.'}
                  </p>
                ) : (
                  <HintText text={t('dispatch.hints.estimate_hours')} />
                )}
                {errors.hours && <span className="field-error">{errors.hours}</span>}
              </div>

              {/* Km per visit */}
              <div className="estimate-field-group">
                <label>{t('dispatch.estimate.km')} *</label>
                <div className="estimate-input-with-unit">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={kmPerVisit}
                    onChange={(e) => setKmPerVisit(e.target.value)}
                    placeholder="0"
                    className={errors.km ? 'input-error' : ''}
                  />
                  <span className="estimate-unit">km</span>
                </div>
                <HintText text={t('dispatch.hints.estimate_km')} />
                {errors.km && <span className="field-error">{errors.km}</span>}
              </div>

              {/* Number of visits — stepper */}
              <div className="estimate-field-group">
                <label>{t('dispatch.estimate.visits')}</label>
                <div className="estimate-stepper">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setNumberOfVisits((v) => Math.max(1, v - 1))}
                    disabled={numberOfVisits <= 1}
                  >
                    −
                  </button>
                  <span className="stepper-value">{numberOfVisits}</span>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => {
                      const newValue = numberOfVisits + 1
                      setNumberOfVisits(newValue)
                      // Auto-check needsNextVisit when visits >= 2
                      if (newValue >= 2 && !needsNextVisit) {
                        setNeedsNextVisit(true)
                      }
                    }}
                  >
                    +
                  </button>
                </div>
                <HintText text={t('dispatch.hints.estimate_visits')} />
                {errors.visits && <span className="field-error">{errors.visits}</span>}
              </div>

              {/* ── Materials section ── */}
              <div className="estimate-section-divider">
                <span>{t('dispatch.estimate.materials')}</span>
              </div>

              {/* Material hint */}
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 8px', fontStyle: 'italic' }}>
                {t('dispatch.estimate.materialHint')}
              </p>

              {materials.map((mat, idx) => (
                <div key={mat.id} className="estimate-material-card">
                  <div className="estimate-material-header">
                    <span className="estimate-material-num">#{idx + 1}</span>
                    <button
                      type="button"
                      className="estimate-material-remove"
                      onClick={() => removeMaterial(mat.id)}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Material name — dropdown autocomplete */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder={t('dispatch.estimate.materialName')}
                      value={mat.name}
                      onChange={(e) => {
                        updateMaterial(mat.id, 'name', e.target.value)
                        setActiveSuggestionId(e.target.value.length >= 1 ? `name_${mat.id}` : null)
                      }}
                      onFocus={() => { if (mat.name.length >= 1) setActiveSuggestionId(`name_${mat.id}`) }}
                      onBlur={() => setTimeout(() => setActiveSuggestionId(null), 150)}
                      className={`estimate-material-input ${errors[`mat_name_${idx}`] ? 'input-error' : ''}`}
                    />
                    {activeSuggestionId === `name_${mat.id}` && (() => {
                      const filtered = filterSuggestions(allSuggestions, mat.name).slice(0, 8)
                      if (filtered.length === 0) return null
                      return (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                          maxHeight: 180, overflowY: 'auto',
                        }}>
                          {filtered.map((s, si) => (
                            <button
                              key={si}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                applySuggestion(mat.id, s)
                                setActiveSuggestionId(null)
                              }}
                              style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                padding: '8px 12px', fontSize: 13, border: 'none',
                                background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)',
                                borderBottom: si < filtered.length - 1 ? '1px solid var(--divider)' : 'none',
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>{s.name}</span>
                              {s.brand && <span style={{ color: 'var(--text-secondary)', fontSize: 11, marginLeft: 6 }}>{s.brand}</span>}
                            </button>
                          ))}
                        </div>
                      )
                    })()}
                  </div>

                  {idx === 0 && <HintText text={t('dispatch.hints.estimate_material_name')} />}

                  {/* Brand — with dropdown suggestions based on selected name */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="text"
                        placeholder={t('dispatch.estimate.materialBrand')}
                        value={mat.brand || ''}
                        onChange={(e) => {
                          updateMaterial(mat.id, 'brand', e.target.value)
                          setActiveSuggestionId(e.target.value.length >= 0 ? `brand_${mat.id}` : null)
                        }}
                        onFocus={() => setActiveSuggestionId(`brand_${mat.id}`)}
                        onBlur={() => setTimeout(() => setActiveSuggestionId(null), 150)}
                        className="estimate-material-input"
                      />
                      {activeSuggestionId === `brand_${mat.id}` && (() => {
                        const brands = getBrandSuggestions(job.category, mat.name, lang)
                          .filter(b => !mat.brand || b.toLowerCase().includes((mat.brand || '').toLowerCase()))
                        if (brands.length === 0) return null
                        return (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                            background: 'var(--surface)', border: '1px solid var(--border)',
                            borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                            maxHeight: 150, overflowY: 'auto',
                          }}>
                            {brands.map((b, bi) => (
                              <button
                                key={bi} type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { updateMaterial(mat.id, 'brand', b); setActiveSuggestionId(null) }}
                                style={{
                                  display: 'block', width: '100%', textAlign: 'left',
                                  padding: '7px 12px', fontSize: 13, border: 'none',
                                  background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)',
                                  borderBottom: bi < brands.length - 1 ? '1px solid var(--divider)' : 'none',
                                }}
                              >{b}</button>
                            ))}
                          </div>
                        )
                      })()}
                    </div>

                    {/* Type / size — with dropdown suggestions based on selected name */}
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="text"
                        placeholder={t('dispatch.estimate.materialType')}
                        value={mat.materialType || ''}
                        onChange={(e) => {
                          updateMaterial(mat.id, 'materialType', e.target.value)
                          setActiveSuggestionId(e.target.value.length >= 0 ? `type_${mat.id}` : null)
                        }}
                        onFocus={() => setActiveSuggestionId(`type_${mat.id}`)}
                        onBlur={() => setTimeout(() => setActiveSuggestionId(null), 150)}
                        className="estimate-material-input"
                      />
                      {activeSuggestionId === `type_${mat.id}` && (() => {
                        const types = getTypeSuggestions(job.category, mat.name, lang)
                          .filter(tp => !mat.materialType || tp.toLowerCase().includes((mat.materialType || '').toLowerCase()))
                        if (types.length === 0) return null
                        return (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                            background: 'var(--surface)', border: '1px solid var(--border)',
                            borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                            maxHeight: 150, overflowY: 'auto',
                          }}>
                            {types.map((tp, ti) => (
                              <button
                                key={ti} type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { updateMaterial(mat.id, 'materialType', tp); setActiveSuggestionId(null) }}
                                style={{
                                  display: 'block', width: '100%', textAlign: 'left',
                                  padding: '7px 12px', fontSize: 13, border: 'none',
                                  background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)',
                                  borderBottom: ti < types.length - 1 ? '1px solid var(--divider)' : 'none',
                                }}
                              >{tp}</button>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                  {idx === 0 && <HintText text={t('dispatch.hints.estimate_material_type')} />}

                  <div className="estimate-material-row">
                    {/* Quantity */}
                    <div className="estimate-material-field">
                      <label>{t('dispatch.estimate.materialQty')}</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="1"
                        value={mat.quantity === 0 ? '' : mat.quantity}
                        onChange={(e) => {
                          const raw = e.target.value
                          updateMaterial(mat.id, 'quantity', raw === '' ? 0 : parseFloat(raw))
                        }}
                        className={errors[`mat_qty_${idx}`] ? 'input-error' : ''}
                      />
                    </div>

                    {/* Unit */}
                    <div className="estimate-material-field">
                      <label>{t('dispatch.estimate.materialUnit')}</label>
                      <select
                        value={mat.unit}
                        onChange={(e) => updateMaterial(mat.id, 'unit', e.target.value)}
                      >
                        {MATERIAL_UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    {/* Price per unit — label depends on tech VAT payer status */}
                    <div className="estimate-material-field">
                      <label>{t(job.techIsVatPayer ? 'dispatch.estimate.materialPriceWithoutVat' : 'dispatch.estimate.materialPriceWithVat')}</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={mat.pricePerUnit === 0 ? '' : mat.pricePerUnit}
                        onChange={(e) => {
                          const raw = e.target.value
                          updateMaterial(mat.id, 'pricePerUnit', raw === '' ? 0 : parseFloat(raw))
                        }}
                        className={errors[`mat_price_${idx}`] ? 'input-error' : ''}
                      />
                    </div>
                  </div>

                  {idx === 0 && <HintText text={t('dispatch.hints.estimate_material_price')} />}

                  {/* Line total */}
                  <div className="estimate-material-line-total">
                    = {((mat.quantity || 0) * (mat.pricePerUnit || 0)).toFixed(2)} {currencyLabel}
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="btn btn-outline btn-full estimate-add-material-btn"
                onClick={addMaterial}
              >
                + {t('dispatch.estimate.addMaterial')}
              </button>

              {/* Material total */}
              {materials.length > 0 && (
                <div className="estimate-summary-row">
                  <span>{t(job.techIsVatPayer ? 'dispatch.estimate.materialTotalWithoutVat' : 'dispatch.estimate.materialTotalWithVat')}</span>
                  <strong>{materialTotal.toFixed(2)} {currencyLabel}</strong>
                </div>
              )}
            </>
          )}

          {/* ── Next visit section ── */}
          <div className="estimate-section-divider">
            <span>{t('dispatch.estimate.nextVisitSection')}</span>
          </div>

          <label className="estimate-checkbox-row">
            <input
              type="checkbox"
              checked={needsNextVisit}
              onChange={(e) => {
                const checked = e.target.checked
                setNeedsNextVisit(checked)
                // When checking needsNextVisit, auto-bump visits to at least 2
                if (checked && numberOfVisits <= 1) {
                  setNumberOfVisits(2)
                }
              }}
            />
            <span>{t('dispatch.estimate.needsNextVisit')}</span>
          </label>
          <HintText text={t('dispatch.hints.estimate_next_visit')} />

          {needsNextVisit && (
            <>
              <div className="estimate-field-group">
                <label>{t('dispatch.estimate.nextVisitReason')} *</label>
                <select
                  value={nextVisitReason}
                  onChange={(e) => setNextVisitReason(e.target.value)}
                  className={errors.reason ? 'input-error' : ''}
                >
                  <option value="">{t('dispatch.estimate.selectReason')}</option>
                  {NEXT_VISIT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {t(r.labelKey)}
                    </option>
                  ))}
                </select>
                <HintText text={t('dispatch.hints.estimate_next_reason')} />
                {errors.reason && <span className="field-error">{errors.reason}</span>}
              </div>

              {nextVisitReason === 'material_purchase' && (
                <div className="estimate-field-group">
                  <label>{t('dispatch.estimate.purchaseHours')}</label>
                  <div className="estimate-input-with-unit">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.5"
                      value={materialPurchaseHours}
                      onChange={(e) => setMaterialPurchaseHours(e.target.value)}
                      placeholder="0"
                    />
                    <span className="estimate-unit">hod</span>
                  </div>
                </div>
              )}

              {/* Dátum dodania materiálu — len pre material_order */}
              {nextVisitReason === 'material_order' && (
                <div className="estimate-field-group">
                  <label>{t('dispatch.estimate.materialDeliveryDate')}</label>
                  <input
                    type="date"
                    value={materialDeliveryDate}
                    onChange={(e) => setMaterialDeliveryDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="estimate-date-input"
                  />
                  {errors.materialDeliveryDate && (
                    <span className="estimate-error">{errors.materialDeliveryDate}</span>
                  )}
                </div>
              )}

              {/* Dátum ďalšej návštevy — vždy ak needsNextVisit */}
              <div className="estimate-field-group">
                <label>{t('dispatch.estimate.nextVisitDate')}</label>
                <input
                  type="date"
                  value={nextVisitDate}
                  onChange={(e) => setNextVisitDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="estimate-date-input"
                />
              </div>
            </>
          )}

          {/* Note */}
          <div className="estimate-field-group">
            <label>{t('dispatch.estimate.note')}</label>
            <DictateTextarea
              value={note}
              onChange={setNote}
              lang={lang}
              formalizeContext="estimate"
              placeholder={t('dispatch.estimate.notePlaceholder')}
              rows={3}
            />
            <HintText text={t('dispatch.hints.estimate_note')} />
          </div>
        </div>

        {/* Footer actions */}
        <div className="modal-actions" style={{ flexDirection: 'column', gap: 10 }}>
          <button
            className="btn btn-gold btn-full"
            style={{
              padding: '16px',
              fontSize: 17,
              fontWeight: 700,
              minHeight: 56,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '⏳' : `📋 ${t('dispatch.estimate.submit')}`}
          </button>
          <button
            className="btn btn-outline btn-full"
            style={{ padding: '12px', fontSize: 14 }}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t('dispatch.estimate.back')}
          </button>
        </div>
      </div>
    </div>
  )
}
