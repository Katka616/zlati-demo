'use client'

import { useState, useEffect } from 'react'
import { useDispatchLang } from '@/hooks/useDispatchLang'

export interface MaterialChecklistItem {
  name: string
  qty: number
  unit: string
  brands?: string[]
  suggestedPayer?: 'pojistovna' | 'klient'
  coverageReason?: string
  ready: boolean
}

export interface MaterialChecklistResult {
  allReady: boolean
  missingNote: string
  items: MaterialChecklistItem[]
}

interface MaterialChecklistModalProps {
  parts: Array<{
    name: string
    qty: number
    unit: string
    brands?: string[]
    suggestedPayer?: 'pojistovna' | 'klient'
    coverageReason?: string
  }>
  onConfirm: (result: MaterialChecklistResult) => void
  onClose: () => void
}

export default function MaterialChecklistModal({
  parts,
  onConfirm,
  onClose,
}: MaterialChecklistModalProps) {
  const { lang } = useDispatchLang()
  const cz = lang === 'cz'
  const [items, setItems] = useState<MaterialChecklistItem[]>(() =>
    parts.map((p) => ({ ...p, ready: true }))
  )
  const [missingNote, setMissingNote] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger fade-in after mount
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const allReady = items.every((i) => i.ready)
  const someUnchecked = items.some((i) => !i.ready)

  function toggleItem(index: number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ready: !item.ready } : item))
    )
  }

  function handleConfirm() {
    onConfirm({ allReady, missingNote, items })
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.55)',
        padding: '16px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      <div
        style={{
          background: 'var(--bg-primary, #ffffff)',
          borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
          width: '100%',
          maxWidth: 420,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'transform 0.2s ease, opacity 0.2s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 20px 14px',
            borderBottom: '1px solid var(--g2, #f0f0f0)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🔧</span>
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--dark, #111827)',
                  lineHeight: 1.2,
                }}
              >
                {cz ? 'Materiály na opravu' : 'Materiály na opravu'}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--g4, #6B7280)',
                  marginTop: 2,
                }}
              >
                {cz ? 'Zkontrolujte, co máte připraveno' : 'Skontrolujte, čo máte pripravené'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={cz ? 'Zavřít' : 'Zavrieť'}
            style={{
              background: 'var(--g1, #F9FAFB)',
              border: 'none',
              borderRadius: 10,
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 18,
              color: 'var(--g5, #9CA3AF)',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Parts list */}
        <div
          style={{
            overflowY: 'auto',
            flex: 1,
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {items.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                color: 'var(--g4, #6B7280)',
                fontSize: 14,
              }}
            >
              {cz ? 'Žádné materiály nebyly doporučeny.' : 'Žiadne materiály neboli odporúčané.'}
            </div>
          ) : (
            items.map((item, idx) => (
              <button
                key={idx}
                onClick={() => toggleItem(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: item.ready
                    ? '1.5px solid var(--g2, #E5E7EB)'
                    : '1.5px solid #FECACA',
                  background: item.ready ? 'var(--bg-primary, #fff)' : '#FEF2F2',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                {/* Checkbox circle */}
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    border: item.ready
                      ? '2px solid var(--success, #22c55e)'
                      : '2px solid #FCA5A5',
                    background: item.ready ? 'var(--success, #22c55e)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  {item.ready && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2.5 7L5.5 10L11.5 4"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: item.ready ? 'var(--dark, #111827)' : '#B91C1C',
                      lineHeight: 1.3,
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 5,
                    }}
                  >
                    <span>{item.name}</span>
                    {item.suggestedPayer === 'pojistovna' && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--success, #16a34a)',
                          background: 'rgba(22, 163, 74, 0.1)',
                          borderRadius: 4,
                          padding: '1px 5px',
                          lineHeight: 1.4,
                          flexShrink: 0,
                        }}
                      >
                        {cz ? 'Pojišťovna' : 'Poisťovňa'}
                      </span>
                    )}
                    {item.suggestedPayer === 'klient' && (
                      <span
                        title={item.coverageReason || undefined}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--warning, #d97706)',
                          background: 'rgba(217, 119, 6, 0.1)',
                          borderRadius: 4,
                          padding: '1px 5px',
                          lineHeight: 1.4,
                          flexShrink: 0,
                          cursor: item.coverageReason ? 'help' : 'default',
                        }}
                      >
                        Klient
                      </span>
                    )}
                    <span
                      style={{
                        fontWeight: 500,
                        color: item.ready ? 'var(--g4, #6B7280)' : '#EF4444',
                        fontSize: 13,
                      }}
                    >
                      {item.qty} {item.unit}
                    </span>
                  </div>
                  {item.brands && item.brands.length > 0 && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--g4, #6B7280)',
                        fontWeight: 500,
                        marginTop: 2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.brands.join(', ')}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}

          {/* Missing note textarea — shown only when something unchecked */}
          {someUnchecked && (
            <div style={{ marginTop: 4 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--dark, #111827)',
                  marginBottom: 6,
                }}
              >
                {cz ? 'Poznámka — co chybí?' : 'Poznámka — čo chýba?'}
              </label>
              <textarea
                value={missingNote}
                onChange={(e) => setMissingNote(e.target.value)}
                placeholder={cz ? 'Např. potřebuji objednat kartuši...' : 'Napr. potrebujem objednať kartuš...'}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid var(--g2, #E5E7EB)',
                  background: 'var(--bg-primary, #fff)',
                  fontSize: 14,
                  color: 'var(--dark, #111827)',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gold, #D4A017)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--g2, #E5E7EB)'
                }}
              />
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div
          style={{
            padding: '14px 16px 20px',
            borderTop: '1px solid var(--g2, #f0f0f0)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {allReady ? (
            <button
              onClick={handleConfirm}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                border: 'none',
                background: 'var(--gold, #D4A017)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: 0.2,
              }}
            >
              {cz ? 'Vše připraveno — vyrazit' : 'Všetko pripravené — vyraziť'}
            </button>
          ) : (
            <>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--g4, #6B7280)',
                  textAlign: 'center',
                  paddingBottom: 2,
                }}
              >
                {cz ? 'Některé položky nejsou zaškrtnuty' : 'Niektoré položky nie sú zaškrtnuté'}
              </div>
              <button
                onClick={handleConfirm}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 12,
                  border: '2px solid var(--g3, #D1D5DB)',
                  background: 'transparent',
                  color: 'var(--g5, #6B7280)',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {cz ? 'Vyrazit i tak' : 'Vyraziť aj tak'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
