'use client'

/**
 * UpcomingJobAlert — 1-hour pre-repair check-in for technicians.
 *
 * Displays a persistent alert when a scheduled job is 30–90 minutes away.
 * Prompts:
 *   1. Are you on time? → If delayed, enter delay_minutes
 *   2. Do you have all materials ready? → Yes/No
 *
 * Submits to POST /api/dispatch/status with action 'pre_repair_checkin'
 * which stores delay_minutes + material_ready in job custom_fields
 * and alerts CRM + Client Portal.
 */

import { useState, useCallback } from 'react'
import type { DispatchJob } from '@/types/dispatch'
import { getTranslation } from '@/lib/i18n'
import { getCategoryLabel } from '@/lib/constants'

interface UpcomingJobAlertProps {
    job: DispatchJob
    lang: 'sk' | 'cz'
    onDismiss: () => void
}

export default function UpcomingJobAlert({ job, lang, onDismiss }: UpcomingJobAlertProps) {
    const t = (key: string) => getTranslation(lang, key)

    const [step, setStep] = useState<'timing' | 'delay' | 'material' | 'submitting' | 'done'>('timing')
    const [isDelayed, setIsDelayed] = useState(false)
    const [delayMinutes, setDelayMinutes] = useState(15)
    const [materialReady, setMaterialReady] = useState<boolean | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleOnTime = () => {
        setIsDelayed(false)
        setStep('material')
    }

    const handleDelayed = () => {
        setIsDelayed(true)
        setStep('delay')
    }

    const handleDelayConfirm = () => {
        setStep('material')
    }

    const handleMaterial = useCallback(async (ready: boolean) => {
        setMaterialReady(ready)
        setStep('submitting')
        setError(null)

        try {
            const res = await fetch('/api/dispatch/status', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId: job.id,
                    action: 'pre_repair_checkin',
                    data: {
                        is_delayed: isDelayed,
                        delay_minutes: isDelayed ? delayMinutes : 0,
                        material_ready: ready,
                    },
                }),
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Failed')
            }

            setStep('done')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Chyba')
            setStep('material')
        }
    }, [job.id, isDelayed, delayMinutes])

    const scheduledLabel = [job.scheduledDate, job.scheduledTime].filter(Boolean).join(' o ')

    return (
        <div className="upcoming-job-alert">
            <div className="upcoming-job-alert-header">
                <span className="upcoming-job-alert-title">{t('dispatch.upcomingAlert.title')}</span>
                <button className="upcoming-job-alert-close" onClick={onDismiss}>✕</button>
            </div>

            <div className="upcoming-job-alert-info">
                <span>{t('dispatch.upcomingAlert.jobLabel')}: <strong>{job.referenceNumber}</strong></span>
                <span>{t('dispatch.upcomingAlert.scheduledAt')}: <strong>{scheduledLabel}</strong></span>
                <span>{job.customerCity} — {getCategoryLabel(job.category)}</span>
            </div>

            {error && (
                <div className="upcoming-job-alert-error">⚠️ {error}</div>
            )}

            {/* Step 1: On time? */}
            {step === 'timing' && (
                <div className="upcoming-job-alert-section">
                    <p className="upcoming-job-alert-question">{t('dispatch.upcomingAlert.onTimeQ')}</p>
                    <div className="upcoming-job-alert-buttons">
                        <button className="btn btn-green btn-sm" onClick={handleOnTime}>
                            {t('dispatch.upcomingAlert.yesOnTime')}
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={handleDelayed}>
                            {t('dispatch.upcomingAlert.noDelayed')}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 1b: Delay input */}
            {step === 'delay' && (
                <div className="upcoming-job-alert-section">
                    <label className="upcoming-job-alert-question">{t('dispatch.upcomingAlert.delayLabel')}</label>
                    <div className="upcoming-job-alert-delay-row">
                        <input
                            type="number"
                            inputMode="numeric"
                            className="upcoming-job-alert-delay-input"
                            value={delayMinutes || ''}
                            min={5}
                            max={180}
                            step={5}
                            onChange={e => setDelayMinutes(Math.max(5, parseInt(e.target.value) || 15))}
                        />
                        <span>min</span>
                    </div>
                    <button className="btn btn-gold btn-sm" onClick={handleDelayConfirm} style={{ marginTop: 10 }}>
                        {lang === 'cz' ? 'Pokračovat →' : 'Pokračovať →'}
                    </button>
                </div>
            )}

            {/* Step 2: Material ready? */}
            {step === 'material' && (
                <div className="upcoming-job-alert-section">
                    <p className="upcoming-job-alert-question">{t('dispatch.upcomingAlert.materialQ')}</p>
                    <div className="upcoming-job-alert-buttons">
                        <button className="btn btn-green btn-sm" onClick={() => handleMaterial(true)}>
                            {t('dispatch.upcomingAlert.materialYes')}
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleMaterial(false)}>
                            {t('dispatch.upcomingAlert.materialNo')}
                        </button>
                    </div>
                </div>
            )}

            {/* Submitting */}
            {step === 'submitting' && (
                <div className="upcoming-job-alert-section" style={{ textAlign: 'center' }}>
                    <p>{t('dispatch.upcomingAlert.submitting')}</p>
                </div>
            )}

            {/* Done */}
            {step === 'done' && (
                <div className="upcoming-job-alert-section" style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 600 }}>{t('dispatch.upcomingAlert.submitted')}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('dispatch.upcomingAlert.submittedDetail')}</p>
                    {isDelayed && (
                        <p style={{ fontSize: 13, color: 'var(--orange)' }}>
                            ⏱ Meškanie: {delayMinutes} min
                        </p>
                    )}
                    {materialReady === false && (
                        <p style={{ fontSize: 13, color: 'var(--red)' }}>
                            ⚠️ Materiál nie je pripravený
                        </p>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={onDismiss} style={{ marginTop: 12 }}>
                        {lang === 'cz' ? 'Zavřít' : 'Zavrieť'}
                    </button>
                </div>
            )}
        </div>
    )
}
