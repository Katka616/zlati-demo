'use client'

/**
 * InvoiceDecisionModal — first step of CZ invoice flow.
 *
 * Technician chooses between:
 *  A) "Akceptovat fakturu" → system generates invoice (opens InvoiceFormModal)
 *  B) "Fakturu vystavím sám" → technician uploads own invoice (opens InvoiceUploadModal)
 *
 * Pattern: modal-overlay + modal-content (AcceptJobModal).
 */

import { useCallback } from 'react'
import { getTranslation } from '@/lib/i18n'
import { Language } from '@/types/protocol'
import type { InvoiceMethod } from '@/types/dispatch'

interface InvoiceDecisionModalProps {
  lang: Language
  onSelect: (method: InvoiceMethod) => void
  onCancel: () => void
}

export default function InvoiceDecisionModal({
  lang,
  onSelect,
  onCancel,
}: InvoiceDecisionModalProps) {
  const t = useCallback(
    (key: string) => getTranslation(lang, key),
    [lang]
  )

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 6 }}>{t('dispatch.invoice.title')}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
          {t('dispatch.invoice.chooseMethod')}
        </p>

        <div className="invoice-decision-buttons">
          {/* Cesta A: System generated */}
          <button
            className="invoice-decision-btn system"
            onClick={() => onSelect('system_generated')}
          >
            <span className="invoice-decision-icon">📄</span>
            <span className="invoice-decision-label">
              {t('dispatch.invoice.systemGenerated')}
            </span>
            <span className="invoice-decision-desc">
              {t('dispatch.invoice.systemGeneratedDesc')}
            </span>
          </button>

          {/* Cesta B: Self issued */}
          <button
            className="invoice-decision-btn self"
            onClick={() => onSelect('self_issued')}
          >
            <span className="invoice-decision-icon">📤</span>
            <span className="invoice-decision-label">
              {t('dispatch.invoice.selfIssued')}
            </span>
            <span className="invoice-decision-desc">
              {t('dispatch.invoice.selfIssuedDesc')}
            </span>
          </button>
        </div>

        <button
          className="btn btn-outline"
          style={{ width: '100%', marginTop: 12 }}
          onClick={onCancel}
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
