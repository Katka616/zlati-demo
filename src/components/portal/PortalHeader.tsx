'use client'

import { useState } from 'react'
import { INSURANCE_COLORS, INSURANCE_SHORT, type InsuranceKey } from '@/data/mockData'
import { type PortalLang } from './portalLocale'

interface LangOption {
  value: PortalLang
  label: string
  flag: string
}

interface PortalHeaderProps {
  referenceNumber: string
  insurance: InsuranceKey
  lang: PortalLang
  langOptions: LangOption[]
  onLangChange: (lang: PortalLang) => void
  helpButton?: React.ReactNode
}

export function PortalHeader({ referenceNumber, insurance, lang, langOptions, onLangChange, helpButton }: PortalHeaderProps) {
  const insuranceColor = INSURANCE_COLORS[insurance] || '#666'
  const insuranceShort = INSURANCE_SHORT[insurance] || insurance
  const [showLangMenu, setShowLangMenu] = useState(false)

  const currentOption = langOptions.find(o => o.value === lang)

  return (
    <header className="portal-header">
      <div className="portal-header-top">
        <div className="portal-header-logo">
          <img
            src="/logo.png"
            alt="Zlatí Řemeslníci"
            width={28}
            height={28}
            className="portal-header-logo-img"
          />
          <span className="portal-header-logo-text">Zlatí Řemeslníci</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Language picker */}
          <div style={{ position: 'relative' }}>
            <button
              className="portal-lang-btn"
              onClick={() => setShowLangMenu(!showLangMenu)}
              aria-label="Change language"
            >
              {currentOption?.flag} <span className="portal-lang-code">{lang.toUpperCase()}</span>
            </button>
            {showLangMenu && (
              <>
                <div
                  className="portal-lang-overlay"
                  onClick={() => setShowLangMenu(false)}
                />
                <div className="portal-lang-menu">
                  {langOptions.map(opt => (
                    <button
                      key={opt.value}
                      className={`portal-lang-option${opt.value === lang ? ' active' : ''}`}
                      onClick={() => {
                        onLangChange(opt.value)
                        setShowLangMenu(false)
                      }}
                    >
                      <span>{opt.flag}</span>
                      <span>{opt.label}</span>
                      {opt.value === lang && <span style={{ marginLeft: 'auto' }}>✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {helpButton}
          <div
            className="portal-header-badge"
            style={{ background: insuranceColor }}
          >
            {insuranceShort}
          </div>
        </div>
      </div>
      <div className="portal-header-ref">
        #{referenceNumber}
      </div>
    </header>
  )
}
