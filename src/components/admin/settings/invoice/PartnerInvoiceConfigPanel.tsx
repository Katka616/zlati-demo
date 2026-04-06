'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface PartnerOption {
  id: number
  code: string
  name: string
  color: string
}

interface InvoiceConfig {
  id?: number
  partner_id: number
  partner_code: string
  vs_prefix: string
  invoice_number_template: string
  payment_term_days: number
  bank_iban: string | null
  bank_account: string | null
  bank_code: string | null
  reverse_charge: boolean
  vat_rate_override: number | null
  note_template: string | null
  email_to: string | null
  email_cc: string | null
  email_subject_template: string
  email_body_template: string | null
  auto_send_on_issue: boolean
  attach_pdf: boolean
  attach_isdoc: boolean
  attach_protocol: boolean
  attach_photos: boolean
}

const DEFAULT_CONFIG: Omit<InvoiceConfig, 'partner_id' | 'partner_code'> = {
  vs_prefix: '9',
  invoice_number_template: 'ZR-P-{PARTNER_CODE}-{VS}',
  payment_term_days: 30,
  bank_iban: null,
  bank_account: null,
  bank_code: null,
  reverse_charge: false,
  vat_rate_override: null,
  note_template: null,
  email_to: null,
  email_cc: null,
  email_subject_template: 'Faktúra {INVOICE_NUMBER} — zákazka {JOB_REF}',
  email_body_template: null,
  auto_send_on_issue: false,
  attach_pdf: true,
  attach_isdoc: false,
  attach_protocol: false,
  attach_photos: false,
}

export default function PartnerInvoiceConfigPanel() {
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [selectedPartner, setSelectedPartner] = useState<PartnerOption | null>(null)
  const [config, setConfig] = useState<InvoiceConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Load partners from invoice configs
  useEffect(() => {
    fetch('/api/admin/invoice-settings')
      .then(r => r.json())
      .then(data => {
        if (data.configs) {
          const partnerList: PartnerOption[] = data.configs.map((c: InvoiceConfig & { _partner_name?: string }) => ({
            id: c.partner_id,
            code: c.partner_code,
            name: c._partner_name || c.partner_code,
            color: '#BF953F',
          }))
          setPartners(partnerList)
          if (partnerList.length > 0 && !selectedPartner) {
            setSelectedPartner(partnerList[0])
          }
        }
      })
      .catch(err => console.error('[PartnerInvoiceConfigPanel] load failed', err))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Also load from partners API as fallback
  useEffect(() => {
    fetch('/api/admin/operations?type=partners')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.partners) && data.partners.length > 0) {
          const partnerList: PartnerOption[] = data.partners.map((p: { id: number; code: string; name: string; color?: string }) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            color: p.color || '#BF953F',
          }))
          setPartners(prev => prev.length > 0 ? prev : partnerList)
          if (!selectedPartner && partnerList.length > 0) {
            setSelectedPartner(partnerList[0])
          }
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load config for selected partner
  const loadConfig = useCallback(async (partnerId: number, partnerCode: string) => {
    try {
      const res = await fetch(`/api/admin/invoice-settings?partnerId=${partnerId}`)
      const data = await res.json()
      if (data.config) {
        setConfig(data.config)
      } else {
        setConfig({
          partner_id: partnerId,
          partner_code: partnerCode,
          ...DEFAULT_CONFIG,
        })
      }
    } catch {
      setConfig({
        partner_id: partnerId,
        partner_code: partnerCode,
        ...DEFAULT_CONFIG,
      })
    }
  }, [])

  useEffect(() => {
    if (selectedPartner) {
      loadConfig(selectedPartner.id, selectedPartner.code)
    }
  }, [selectedPartner, loadConfig])

  const handleSave = async () => {
    if (!config || !selectedPartner) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/invoice-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId: selectedPartner.id,
          partnerCode: selectedPartner.code,
          vsPrefix: config.vs_prefix,
          invoiceNumberTemplate: config.invoice_number_template,
          paymentTermDays: config.payment_term_days,
          bankIban: config.bank_iban,
          bankAccount: config.bank_account,
          bankCode: config.bank_code,
          reverseCharge: config.reverse_charge,
          vatRateOverride: config.vat_rate_override,
          noteTemplate: config.note_template,
          emailTo: config.email_to,
          emailCc: config.email_cc,
          emailSubjectTemplate: config.email_subject_template,
          emailBodyTemplate: config.email_body_template,
          autoSendOnIssue: config.auto_send_on_issue,
          attachPdf: config.attach_pdf,
          attachIsdoc: config.attach_isdoc,
          attachProtocol: config.attach_protocol,
          attachPhotos: config.attach_photos,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
        setToast({ type: 'success', msg: 'Konfigurácia uložená' })
      } else {
        setToast({ type: 'error', msg: 'Chyba pri ukladaní' })
      }
    } catch {
      setToast({ type: 'error', msg: 'Chyba pri ukladaní' })
    }
    setSaving(false)
    setTimeout(() => setToast(null), 3000)
  }

  // Preview invoice number from template
  const previewInvoiceNumber = config
    ? config.invoice_number_template
        .replace('{PARTNER_CODE}', selectedPartner?.code || 'AXA')
        .replace('{VS}', `${config.vs_prefix}2026${String(1).padStart(5, '0')}`)
    : ''

  return (
    <div style={{ display: 'flex', gap: 24, minHeight: 400 }}>
      {/* Partner list */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--g5)', marginBottom: 12, letterSpacing: '0.05em' }}>
          Partneri
        </div>
        {partners.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPartner(p)}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 16px',
              marginBottom: 4,
              border: selectedPartner?.id === p.id ? '1px solid var(--gold)' : '1px solid var(--g3)',
              borderRadius: 8,
              background: selectedPartner?.id === p.id ? 'var(--g2)' : 'transparent',
              color: 'var(--g9)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: 14,
              fontFamily: 'Montserrat, sans-serif',
              transition: 'all 0.15s',
            }}
          >
            <span style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: p.color || 'var(--gold)',
              marginRight: 8,
            }} />
            {p.name}
            <span style={{ display: 'block', fontSize: 11, color: 'var(--g5)', marginTop: 2 }}>
              {p.code}
            </span>
          </button>
        ))}
        {partners.length === 0 && (
          <div style={{ color: 'var(--g5)', fontSize: 13 }}>Žiadni partneri</div>
        )}
      </div>

      {/* Config form */}
      {config && selectedPartner && (
        <div style={{ flex: 1, maxWidth: 600 }}>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Cinzel, serif', color: 'var(--gold)', marginBottom: 20 }}>
            {selectedPartner.name}
          </div>

          {/* VS Prefix */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>VS Prefix</label>
            <input
              type="text"
              maxLength={5}
              value={config.vs_prefix}
              onChange={e => setConfig({ ...config, vs_prefix: e.target.value.replace(/[^0-9]/g, '') })}
              style={inputStyle}
              placeholder="9"
            />
            <div style={hintStyle}>Číslo na začiatku variabilného symbolu. AXA=2, EA=1, SEC=3</div>
          </div>

          {/* Invoice Number Template */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Šablóna čísla faktúry</label>
            <input
              type="text"
              value={config.invoice_number_template}
              onChange={e => setConfig({ ...config, invoice_number_template: e.target.value })}
              style={inputStyle}
              placeholder="ZR-P-{PARTNER_CODE}-{VS}"
            />
            <div style={hintStyle}>
              Tokeny: {'{PARTNER_CODE}'}, {'{VS}'} — Náhľad: <strong style={{ color: 'var(--gold)' }}>{previewInvoiceNumber}</strong>
            </div>
          </div>

          {/* Payment Term Days */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Splatnosť (dni)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={config.payment_term_days}
              onChange={e => setConfig({ ...config, payment_term_days: Math.max(1, Math.min(120, parseInt(e.target.value) || 30)) })}
              style={{ ...inputStyle, width: 100 }}
            />
          </div>

          {/* Bank IBAN Override */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>IBAN (override)</label>
            <input
              type="text"
              value={config.bank_iban || ''}
              onChange={e => setConfig({ ...config, bank_iban: e.target.value || null })}
              style={inputStyle}
              placeholder="Prázdne = globálny ZR IBAN"
            />
          </div>

          {/* Bank Account + Code */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Číslo účtu</label>
              <input
                type="text"
                value={config.bank_account || ''}
                onChange={e => setConfig({ ...config, bank_account: e.target.value || null })}
                style={inputStyle}
                placeholder="Prázdne = globálny"
              />
            </div>
            <div style={{ width: 100 }}>
              <label style={labelStyle}>Kód banky</label>
              <input
                type="text"
                value={config.bank_code || ''}
                onChange={e => setConfig({ ...config, bank_code: e.target.value || null })}
                style={inputStyle}
                placeholder="0100"
              />
            </div>
          </div>

          {/* Reverse Charge */}
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Reverse charge (prenos DPH)</label>
            <button
              onClick={() => setConfig({ ...config, reverse_charge: !config.reverse_charge })}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                background: config.reverse_charge ? 'var(--gold)' : 'var(--g3)',
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute',
                top: 2,
                left: config.reverse_charge ? 22 : 2,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>

          {/* VAT Rate Override */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>DPH override (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={config.vat_rate_override ?? ''}
              onChange={e => {
                const val = e.target.value === '' ? null : parseFloat(e.target.value)
                setConfig({ ...config, vat_rate_override: val })
              }}
              style={{ ...inputStyle, width: 100 }}
              placeholder="auto"
            />
            <div style={hintStyle}>Prázdne = automaticky z pricing engine (12% stavba, 21% ostatné)</div>
          </div>

          {/* Note Template */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Šablóna poznámky na faktúre</label>
            <textarea
              value={config.note_template || ''}
              onChange={e => setConfig({ ...config, note_template: e.target.value || null })}
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              placeholder="Zakázka č. {JOB_REF}. {CATEGORY}."
            />
            <div style={hintStyle}>
              Tokeny: {'{JOB_REF}'}, {'{CATEGORY}'}, {'{PARTNER_NAME}'}, {'{VAT_RATE}'}
            </div>
          </div>

          {/* ── Email Nastavenia ─────────────────────────── */}
          <div style={{ borderTop: '1px solid var(--g3)', marginTop: 24, paddingTop: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Cinzel, serif', color: 'var(--gold)', marginBottom: 16 }}>
              Automatické emaily
            </div>

            {/* Auto-send toggle */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Automaticky odoslať pri vystavení</label>
              <button
                onClick={() => setConfig({ ...config, auto_send_on_issue: !config.auto_send_on_issue })}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: config.auto_send_on_issue ? 'var(--gold)' : 'var(--g3)',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 2,
                  left: config.auto_send_on_issue ? 22 : 2,
                  width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {/* Email To */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Email príjemcu</label>
              <input
                type="email"
                value={config.email_to || ''}
                onChange={e => setConfig({ ...config, email_to: e.target.value || null })}
                style={inputStyle}
                placeholder="fakturace@partner.cz"
              />
            </div>

            {/* Email CC */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>CC (čiarkou oddelené)</label>
              <input
                type="text"
                value={config.email_cc || ''}
                onChange={e => setConfig({ ...config, email_cc: e.target.value || null })}
                style={inputStyle}
                placeholder="kopia@partner.cz, uctarna@partner.cz"
              />
            </div>

            {/* Subject template */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Predmet emailu</label>
              <input
                type="text"
                value={config.email_subject_template}
                onChange={e => setConfig({ ...config, email_subject_template: e.target.value })}
                style={inputStyle}
                placeholder="Faktúra {INVOICE_NUMBER} — zákazka {JOB_REF}"
              />
            </div>

            {/* Body template */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Telo emailu (HTML)</label>
              <textarea
                value={config.email_body_template || ''}
                onChange={e => setConfig({ ...config, email_body_template: e.target.value || null })}
                style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
                placeholder="<p>Dobrý deň,</p><p>v prílohe zasielame faktúru č. {INVOICE_NUMBER}...</p>"
              />
              <div style={hintStyle}>
                Premenné: {'{INVOICE_NUMBER}'}, {'{VS}'}, {'{SUMA}'}, {'{SUMA_BEZ_DPH}'}, {'{JOB_REF}'}, {'{PARTNER_NAME}'}, {'{DUZP}'}, {'{SPLATNOST}'}, {'{KATEGORIA}'}, {'{ZAKAZNIK}'}
              </div>
            </div>

            {/* Attachment toggles */}
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--g6)', marginBottom: 12 }}>
              Prílohy
            </div>
            {([
              { key: 'attach_pdf' as const, label: 'PDF faktúry' },
              { key: 'attach_protocol' as const, label: 'Servisný protokol (fotky)' },
              { key: 'attach_photos' as const, label: 'Fotodokumentácia' },
              { key: 'attach_isdoc' as const, label: 'ISDOC XML (pripravuje sa)' },
            ] as const).map(({ key, label }) => (
              <div key={key} style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => setConfig({ ...config, [key]: !config[key] })}
                  style={{
                    width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: config[key] ? 'var(--gold)' : 'var(--g3)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 2,
                    left: config[key] ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s',
                  }} />
                </button>
                <span style={{ fontSize: 13, color: config[key] ? 'var(--g9)' : 'var(--g5)' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 32px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--gold)',
              color: 'var(--g1)',
              fontWeight: 700,
              fontSize: 14,
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.6 : 1,
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            {saving ? 'Ukladám...' : 'Uložiť konfiguráciu'}
          </button>

          {/* Toast */}
          {toast && (
            <div style={{
              marginTop: 12,
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 13,
              background: toast.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: toast.type === 'success' ? 'var(--success, #22c55e)' : 'var(--danger, #dc2626)',
              border: toast.type === 'success' ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(220,38,38,0.2)',
            }}>
              {toast.msg}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--g6)',
  marginBottom: 6,
  fontFamily: 'Montserrat, sans-serif',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid var(--g3)',
  background: 'var(--g1)',
  color: 'var(--g9)',
  fontSize: 14,
  fontFamily: 'Montserrat, sans-serif',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--g5)',
  marginTop: 4,
}
