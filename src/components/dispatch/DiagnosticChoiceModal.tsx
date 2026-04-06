'use client'

/**
 * DiagnosticChoiceModal — simple slide-up modal to choose between:
 * 1. Pokračovať s odhadom ceny (EstimateFormModal)
 * 2. Ukončiť diagnostikou (DiagnosticEndModal)
 */

import { useCallback } from 'react'
import { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'
import HintText from '@/components/ui/HintText'

interface DiagnosticChoiceModalProps {
    lang: Language
    onChooseEstimate: () => void
    onChooseDiagnosticEnd: () => void
    onCancel: () => void
}

export default function DiagnosticChoiceModal({
    lang,
    onChooseEstimate,
    onChooseDiagnosticEnd,
    onCancel,
}: DiagnosticChoiceModalProps) {
    const t = useCallback((key: string) => getTranslation(lang, key), [lang])

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div
                className="modal-content estimate-modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ paddingBottom: 32 }}
            >
                <div className="estimate-header" style={{ marginBottom: 24 }}>
                    <h2 className="modal-title">{t('dispatch.diagnostic.choiceTitle')}</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 16px' }}>
                    <div>
                        <button
                            className="btn btn-outline btn-full"
                            style={{ padding: 20, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, border: '2px solid var(--gold)', color: 'var(--gold)', fontWeight: 600, background: 'transparent' }}
                            onClick={onChooseEstimate}
                        >
                            <span style={{ fontSize: 24 }}>💰</span>
                            {t('dispatch.diagnostic.continueEstimate')}
                        </button>
                        <HintText text={t('dispatch.hints.diag_continue')} />
                    </div>

                    <div>
                        <button
                            className="btn btn-outline btn-full"
                            style={{ padding: 20, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, border: '2px solid var(--gold)', color: 'var(--gold)', fontWeight: 600, background: 'transparent' }}
                            onClick={onChooseDiagnosticEnd}
                        >
                            <span style={{ fontSize: 24 }}>🔍</span>
                            {t('dispatch.diagnostic.endDiagnostic')}
                        </button>
                        <HintText text={t('dispatch.hints.diag_end')} />
                    </div>

                    <button
                        className="btn btn-outline btn-full"
                        style={{ padding: 16, fontSize: 14, marginTop: 16, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', borderRadius: 8 }}
                        onClick={onCancel}
                    >
                        {t('dispatch.diagnostic.back')}
                    </button>
                </div>
            </div>
        </div>
    )
}
