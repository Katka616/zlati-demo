'use client'

import { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'

interface CustomerInfoProps {
  language: Language
  referenceNumber: string
  subject: string
  customerName: string
  customerPhone: string
  customerAddress: string
  customerCity?: string
  insurance?: string
  category?: string
}

export function CustomerInfo({
  language,
  referenceNumber,
  subject,
  customerName,
  customerPhone,
  customerAddress,
  customerCity,
  insurance,
  category,
}: CustomerInfoProps) {
  const t = (key: string) => getTranslation(language, key as any)

  const prefilledStyle = {
    backgroundColor: 'var(--gold-bg)',
    border: '1px solid var(--gold-light)',
    color: 'var(--dark)',
  }

  return (
    <div>
      {/* Prefilled tag */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--gold-bg)',
        border: '1px solid var(--gold-light)',
        color: 'var(--gold)',
        fontSize: 11,
        fontWeight: 600,
        padding: '4px 12px',
        borderRadius: 20,
        marginBottom: 16,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        {t('header.prefilledTag')}
      </div>

      {/* Case ID + Insurance */}
      <div className="field-row">
        <div className="field">
          <label className="field-label">{t('fields.caseNumber')}</label>
          <input type="text" className="field-input" value={referenceNumber} disabled style={prefilledStyle} />
        </div>
        <div className="field">
          <label className="field-label">{t('fields.insurance')}</label>
          <input type="text" className="field-input" value={insurance || ''} disabled style={prefilledStyle} />
        </div>
      </div>

      {/* Category + Subject */}
      <div className="field-row">
        <div className="field">
          <label className="field-label">{t('fields.category')}</label>
          <input type="text" className="field-input" value={category || ''} disabled style={prefilledStyle} />
        </div>
        <div className="field">
          <label className="field-label">{t('fields.subject')}</label>
          <input type="text" className="field-input" value={subject} disabled style={prefilledStyle} />
        </div>
      </div>

      {/* Client section header */}
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        letterSpacing: 1,
        color: 'var(--text-secondary)',
        marginTop: 20,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: '1px solid var(--g1)',
      }}>
        {t('sections.clientInfo')}
      </div>

      {/* Name + Phone */}
      <div className="field-row">
        <div className="field">
          <label className="field-label">{t('fields.customerName')}</label>
          <input type="text" className="field-input" value={customerName} disabled style={prefilledStyle} />
        </div>
        <div className="field">
          <label className="field-label">{t('fields.customerPhone')}</label>
          <input type="tel" className="field-input" value={customerPhone} disabled style={prefilledStyle} />
        </div>
      </div>

      {/* Address + City */}
      <div className="field-row">
        <div className="field">
          <label className="field-label">{t('fields.customerAddress')}</label>
          <input type="text" className="field-input" value={customerAddress} disabled style={prefilledStyle} />
        </div>
        <div className="field">
          <label className="field-label">{t('fields.customerCity')}</label>
          <input type="text" className="field-input" value={customerCity || ''} disabled style={prefilledStyle} />
        </div>
      </div>
    </div>
  )
}
