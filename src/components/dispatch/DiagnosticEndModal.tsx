'use client'

/**
 * DiagnosticEndModal — slide-up form for terminating a job after diagnostics.
 *
 * Collects:
 * - reason (uneconomical, unrepairable, specialist_needed)
 * - description (mandatory technical reason, min 20 chars)
 * - hours (pre-filled to 1h)
 * - km (optional input)
 *
 * Sends EstimateFormData with diagnosticOnly=true to the parent.
 */

import { useState, useCallback } from 'react'
import { DispatchJob, EstimateFormData, DiagnosticEndReason } from '@/types/dispatch'
import { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'
import DictateTextarea from '@/components/ui/DictateTextarea'

interface DiagnosticEndModalProps {
    job: DispatchJob
    lang: Language
    isSubmitting: boolean
    onSubmit: (data: EstimateFormData) => void
    onCancel: () => void
}

const END_REASONS: { value: DiagnosticEndReason; labelKey: string }[] = [
    { value: 'uneconomical', labelKey: 'dispatch.diagnostic.reasonUneconomical' },
    { value: 'unrepairable', labelKey: 'dispatch.diagnostic.reasonUnrepairable' },
    { value: 'specialist_needed', labelKey: 'dispatch.diagnostic.reasonSpecialist' },
]

export default function DiagnosticEndModal({
    job,
    lang,
    isSubmitting,
    onSubmit,
    onCancel,
}: DiagnosticEndModalProps) {
    const t = useCallback((key: string) => getTranslation(lang, key), [lang])

    // --- Form state ---
    const [reason, setReason] = useState<DiagnosticEndReason | ''>('')
    const [description, setDescription] = useState('')
    const [hours, setHours] = useState(() => {
        const arrivedAt = (job.customFields as Record<string, unknown>)?.arrived_at as string | undefined
        if (arrivedAt) {
            const elapsedMs = Date.now() - new Date(arrivedAt).getTime()
            const elapsedHours = elapsedMs / (1000 * 60 * 60)
            if (elapsedHours > 0) {
                // Round to nearest 0.5h
                const rounded = Math.round(elapsedHours * 2) / 2
                return String(Math.max(0.5, rounded))
            }
        }
        return '1' // default diagnostic typically 1h
    })
    const [km, setKm] = useState(() =>
        job.distance && job.distance > 0
            ? String(Math.round(job.distance * 2 * 10) / 10)
            : ''
    )

    // --- Validation errors ---
    const [errors, setErrors] = useState<Record<string, string>>({})

    // --- Validation ---
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!reason) {
            newErrors.reason = t('common.required')
        }

        if (!description || description.trim().length < 20) {
            newErrors.description = t('dispatch.diagnostic.descError')
        }

        const h = parseFloat(hours)
        if (!hours || isNaN(h) || h <= 0) {
            newErrors.hours = t('dispatch.estimate.validationHours')
        }

        // km is optional, but if entered, must be valid
        if (km) {
            const k = parseFloat(km)
            if (isNaN(k) || k < 0) {
                newErrors.km = t('dispatch.estimate.validationKm')
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // --- Submit ---
    const handleSubmit = () => {
        if (!validate()) return

        const data: EstimateFormData = {
            diagnosticOnly: true,
            diagnosticEndReason: reason as DiagnosticEndReason,
            diagnosticEndDescription: description.trim(),
            estimatedHours: parseFloat(hours) || 0,
            kmPerVisit: km ? parseFloat(km) : 0,
            numberOfVisits: 1, // always 1 for diagnostic-only end
            materials: [],     // no materials
            needsNextVisit: false,
        }

        onSubmit(data)
    }

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div
                className="modal-content estimate-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="estimate-header">
                    <h2 className="modal-title">{t('dispatch.diagnostic.title')}</h2>
                    <span className="job-card-ref">{job.referenceNumber}</span>
                </div>

                {/* Scrollable form body */}
                <div className="estimate-body">
                    <div style={{
                        background: 'var(--input-bg)',
                        padding: 16,
                        borderRadius: 8,
                        marginBottom: 12,
                        color: 'var(--dark)',
                        fontSize: 14,
                        lineHeight: 1.5,
                        borderLeft: '4px solid var(--orange)'
                    }}>
                        {t('dispatch.diagnostic.description')}
                    </div>

                    {/* Inline hint — info about what happens after confirmation */}
                    <div style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        lineHeight: 1.5,
                        marginBottom: 20,
                        background: 'rgba(37,99,235,0.08)',
                        border: '1px solid rgba(37,99,235,0.12)',
                        color: 'var(--dark)',
                    }}>
                        {'ℹ️ '}
                        {lang === 'cz'
                            ? 'Po potvrzení odešleme zákazníkovi cenovou nabídku. Počkejte na odpověď — obvykle do 30 minut.'
                            : 'Po potvrdení odošleme zákazníkovi cenovú ponuku. Čakajte na odpoveď — obvykle do 30 minút.'}
                    </div>

                    {/* Reason selection */}
                    <div className="estimate-field-group">
                        <label>{t('dispatch.diagnostic.reasonLabel')} *</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                            {END_REASONS.map((r) => (
                                <label key={r.value} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: 12, border: '1px solid var(--border)', borderRadius: 8,
                                    cursor: 'pointer', background: reason === r.value ? 'var(--gold-bg)' : 'transparent',
                                    borderColor: reason === r.value ? 'var(--gold)' : 'var(--border)'
                                }}>
                                    <input
                                        type="radio"
                                        name="diagnosticReason"
                                        value={r.value}
                                        checked={reason === r.value}
                                        onChange={() => setReason(r.value)}
                                        style={{ width: 20, height: 20, accentColor: 'var(--gold)' }}
                                    />
                                    <span style={{ fontSize: 16, fontWeight: reason === r.value ? 600 : 400 }}>
                                        {t(r.labelKey)}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {errors.reason && <span className="field-error">{errors.reason}</span>}
                    </div>

                    {/* Description (mandatory) */}
                    <div className="estimate-field-group">
                        <label>{t('dispatch.diagnostic.descLabel')} *</label>
                        <DictateTextarea
                            value={description}
                            onChange={setDescription}
                            lang={lang}
                            formalizeContext="diagnostic"
                            placeholder={t('dispatch.diagnostic.descPlaceholder')}
                            rows={4}
                            error={!!errors.description}
                        />
                        {errors.description && <span className="field-error">{errors.description}</span>}
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                        {/* Hours */}
                        <div className="estimate-field-group" style={{ flex: 1 }}>
                            <label>{t('dispatch.estimate.hours')} *</label>
                            <div className="estimate-input-with-unit">
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    min="0.5"
                                    step="0.5"
                                    value={hours}
                                    onChange={(e) => setHours(e.target.value)}
                                    className={errors.hours ? 'input-error' : ''}
                                />
                                <span className="estimate-unit">hod</span>
                            </div>
                            {errors.hours && <span className="field-error">{errors.hours}</span>}
                        </div>

                        {/* Km (optional) */}
                        <div className="estimate-field-group" style={{ flex: 1 }}>
                            <label>{t('dispatch.estimate.km')}</label>
                            <div className="estimate-input-with-unit">
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    step="1"
                                    value={km}
                                    onChange={(e) => setKm(e.target.value)}
                                    placeholder="0"
                                    className={errors.km ? 'input-error' : ''}
                                />
                                <span className="estimate-unit">km</span>
                            </div>
                            {errors.km && <span className="field-error">{errors.km}</span>}
                        </div>
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
                        {isSubmitting ? '⏳' : `📝 ${t('dispatch.diagnostic.submit')}`}
                    </button>
                    <button
                        className="btn btn-outline btn-full"
                        style={{ padding: '12px', fontSize: 14 }}
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        {t('dispatch.diagnostic.back')}
                    </button>
                </div>
            </div>
        </div>
    )
}
