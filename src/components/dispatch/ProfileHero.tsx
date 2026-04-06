'use client'

import { useState } from 'react'
import { TechnicianProfile, CATEGORY_ICONS } from '@/types/dispatch'
import { SPECIALIZATIONS } from '@/lib/constants'

/** All available appliance brands a technician can select */
const ALL_BRANDS = [
  'Vaillant', 'Junkers', 'Protherm', 'Buderus', 'Viessmann',
  'Bosch', 'Ariston', 'Baxi', 'Immergas', 'Ferroli',
  'Daikin', 'Mitsubishi', 'Panasonic', 'Toshiba', 'LG',
  'Samsung', 'Electrolux', 'Whirlpool', 'Miele', 'Siemens',
]

interface Props {
  technician: TechnicianProfile
  t: (key: string) => string
  onBrandsChange?: (brands: string[]) => void
  onSpecializationsChange?: (specs: string[]) => void
  onEmailChange?: (email: string) => void
}

export default function ProfileHero({ technician, t, onBrandsChange, onSpecializationsChange, onEmailChange }: Props) {
  const [editingBrands, setEditingBrands] = useState(false)
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    technician.applianceBrands ?? []
  )
  const [editingSpecs, setEditingSpecs] = useState(false)
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>(
    technician.specializations ?? []
  )
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState(technician.email || '')

  const initials = technician.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const flag = technician.country === 'SK' ? '🇸🇰' : '🇨🇿'

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    )
  }

  const saveBrands = () => {
    onBrandsChange?.(selectedBrands)
    setEditingBrands(false)
  }

  const cancelBrands = () => {
    setSelectedBrands(technician.applianceBrands ?? [])
    setEditingBrands(false)
  }

  const toggleSpec = (spec: string) =>
    setSelectedSpecs(prev => prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec])

  const saveSpecs = () => {
    onSpecializationsChange?.(selectedSpecs)
    setEditingSpecs(false)
  }

  const cancelSpecs = () => {
    setSelectedSpecs(technician.specializations ?? [])
    setEditingSpecs(false)
  }

  /** Extract the 2-digit prefix from a SPECIALIZATIONS entry (e.g. '01' from '01. Plumber') */
  const getSpecId = (spec: string) => spec.substring(0, 2)

  /** Get localized label for a specialization */
  const getSpecLabel = (spec: string) => {
    const id = getSpecId(spec)
    const label = t(`profilePage.specializationLabels.${id}`)
    return label.startsWith('profilePage.') ? spec.replace(/^\d+\.\s*/, '') : label
  }

  return (
    <div className="profile-card profile-hero-card">
      {/* Top row: Avatar + Info */}
      <div className="profile-hero-row">
        <div className="profile-hero-avatar">
          {technician.avatar ? (
            <img src={technician.avatar} alt={technician.name} />
          ) : (
            <span className="profile-hero-initials">{initials}</span>
          )}
        </div>

        <div className="profile-hero-info">
          <h2 className="profile-hero-name">
            {flag} {technician.name}
          </h2>
          <p className="profile-hero-phone">{technician.phone}</p>

          {/* Email — inline edit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {editingEmail ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                <input
                  type="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  placeholder="email@example.com"
                  style={{
                    flex: 1, padding: '4px 8px', fontSize: 13, borderRadius: 6,
                    border: '1px solid var(--g6, #444)', background: 'var(--bg-elevated, #1a1a1a)',
                    color: 'var(--text-primary)', outline: 'none', minWidth: 0,
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { onEmailChange?.(emailDraft.trim()); setEditingEmail(false) }
                    if (e.key === 'Escape') { setEmailDraft(technician.email || ''); setEditingEmail(false) }
                  }}
                />
                <button
                  onClick={() => { onEmailChange?.(emailDraft.trim()); setEditingEmail(false) }}
                  style={{ fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                >✓</button>
                <button
                  onClick={() => { setEmailDraft(technician.email || ''); setEditingEmail(false) }}
                  style={{ fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--g4)' }}
                >✕</button>
              </div>
            ) : (
              <>
                <span style={{ fontSize: 13, color: technician.email ? 'var(--text-secondary)' : 'var(--gold, #D4A843)' }}>
                  ✉️ {technician.email || 'Zadať e-mail'}
                </span>
                {onEmailChange && (
                  <button
                    onClick={() => { setEmailDraft(technician.email || ''); setEditingEmail(true) }}
                    style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--g4)' }}
                  >✏️</button>
                )}
              </>
            )}
          </div>

          {technician.rating != null && technician.rating > 0 ? (
            <div className="profile-hero-rating">
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  className={`star ${i < Math.round(technician.rating!) ? 'filled' : ''}`}
                >
                  ★
                </span>
              ))}
              <span className="rating-value">{Number(technician.rating).toFixed(1)}</span>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('profilePage.noRating')}</span>
          )}
        </div>
      </div>

      {/* Specializations — always visible, editable */}
      <div className="profile-brands-section">
        <div className="profile-section-header">
          <span className="profile-brands-label">{t('profilePage.specializations')}</span>
          {!editingSpecs && onSpecializationsChange && (
            <button className="profile-edit-btn" onClick={() => setEditingSpecs(true)}>✏️</button>
          )}
        </div>
        {editingSpecs ? (
          <div className="profile-brands-editor">
            <div className="profile-brands-grid">
              {SPECIALIZATIONS.map((spec) => (
                <button
                  key={spec}
                  className={`brand-chip ${selectedSpecs.includes(spec) ? 'selected' : ''}`}
                  onClick={() => toggleSpec(spec)}
                >
                  {CATEGORY_ICONS[spec] || '🔧'} {selectedSpecs.includes(spec) ? '✓ ' : ''}{getSpecLabel(spec)}
                </button>
              ))}
            </div>
            <div className="profile-edit-actions">
              <button className="btn btn-outline btn-sm" onClick={cancelSpecs}>{t('common.cancel')}</button>
              <button className="btn btn-gold btn-sm" onClick={saveSpecs}>{t('common.save')}</button>
            </div>
          </div>
        ) : selectedSpecs.length > 0 ? (
          <div className="profile-hero-specs">
            {selectedSpecs.map((spec) => (
              <span key={spec} className="spec-badge">
                {CATEGORY_ICONS[spec] || '🔧'} {getSpecLabel(spec)}
              </span>
            ))}
          </div>
        ) : (
          <p
            onClick={() => onSpecializationsChange && setEditingSpecs(true)}
            style={{
              fontSize: 13, color: 'var(--gold, #D4A843)', margin: '6px 0 0',
              cursor: onSpecializationsChange ? 'pointer' : undefined,
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(212,168,67,0.06)',
              border: '1px dashed rgba(212,168,67,0.3)',
            }}
          >
            {t('profilePage.noSpecializations')}
          </p>
        )}
      </div>

      {/* Appliance Brands — always visible, encourages technician to fill in */}
      <div className="profile-brands-section">
        <div className="profile-section-header">
          <span className="profile-brands-label">{t('profilePage.brands')}</span>
          {!editingBrands && onBrandsChange && (
            <button
              className="profile-edit-btn"
              onClick={() => setEditingBrands(true)}
            >
              ✏️
            </button>
          )}
        </div>

        {editingBrands ? (
          <div className="profile-brands-editor">
            <div className="profile-brands-grid">
              {ALL_BRANDS.map((brand) => (
                <button
                  key={brand}
                  className={`brand-chip ${selectedBrands.includes(brand) ? 'selected' : ''}`}
                  onClick={() => toggleBrand(brand)}
                >
                  {selectedBrands.includes(brand) ? '✓ ' : ''}{brand}
                </button>
              ))}
            </div>
            <div className="profile-edit-actions">
              <button className="btn btn-outline btn-sm" onClick={cancelBrands}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-gold btn-sm" onClick={saveBrands}>
                {t('common.save')}
              </button>
            </div>
          </div>
        ) : selectedBrands.length > 0 ? (
          <div className="profile-hero-brands">
            {selectedBrands.map((brand) => (
              <span key={brand} className="brand-badge">
                {brand}
              </span>
            ))}
          </div>
        ) : (
          <p
            onClick={() => onBrandsChange && setEditingBrands(true)}
            style={{
              fontSize: 13, color: 'var(--gold, #D4A843)', margin: '6px 0 0',
              cursor: onBrandsChange ? 'pointer' : undefined,
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(212,168,67,0.06)',
              border: '1px dashed rgba(212,168,67,0.3)',
            }}
          >
            {t('profilePage.noBrands')}
          </p>
        )}
      </div>
    </div>
  )
}
