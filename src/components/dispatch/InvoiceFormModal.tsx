'use client'

/**
 * InvoiceFormModal — Cesta A: system-generated invoice.
 *
 * 1. Loads technician billing data (GET /api/dispatch/billing)
 * 2. Loads invoice preview (GET /api/dispatch/invoice/preview?jobId=X&dphRate=Y)
 * 3. Editable supplier fields (technician can fix billing info)
 * 4. Read-only buyer fields (our company — non-editable)
 * 5. Czech invoice legal fields (dates, payment method)
 * 6. Invoice number + evidencni cislo (manually entered, linked)
 * 7. Variabilni symbol (required)
 * 8. DPH rate (radio group) with legal notes
 * 9. Invoice preview table (items, totals, payment breakdown)
 * 10. Submit -> POST /api/dispatch/invoice -> server PDF (GET /api/dispatch/invoice/pdf) -> download
 *
 * Pattern: modal-overlay + modal-content (AcceptJobModal).
 */

import { useState, useEffect, useCallback } from 'react'
import { getTranslation } from '@/lib/i18n'
import { Language } from '@/types/protocol'
import { INVOICE_BUYER_CZ, CZ_DPH_OPTIONS } from '@/lib/constants'
import { generateInvoiceHtml } from '@/lib/invoiceTemplate'
import DispatchToast, { useDispatchToast } from './DispatchToast'
import type {
  CzDphRate,
  TechnicianBillingData,
  InvoiceData,
  InvoiceLineItem,
} from '@/types/dispatch'

interface InvoiceFormModalProps {
  lang: Language
  jobId: string
  onSuccess: () => void
  onCancel: () => void
}

interface InvoicePreview {
  items: InvoiceLineItem[]
  subtotal: number
  vatTotal: number
  grandTotal: number
  referenceNumber?: string
  protocolSubmittedAt?: string | null
  billing?: TechnicianBillingData | null
  suggestedDphRate?: CzDphRate
  dphExplanation?: string
  paymentBreakdown?: {
    subtotalGross: number
    clientSurcharge: number
    clientSurchargeWithVat: number
    paymentFromZR: number
    paymentFromCustomer: number
    paymentFromCustomerWithVat: number
  }
}

const EMPTY_BILLING: TechnicianBillingData = {
  billing_name: null,
  billing_street: null,
  billing_city: null,
  billing_psc: null,
  ico: null,
  dic: null,
  ic_dph: null,
  platca_dph: false,
  iban: null,
  bank_account_number: null,
  bank_code: null,
  registration: null,
  invoice_note: null,
}

/** Format number as Czech currency: 1 234,50 Kc */
function fmtCzk(value: number): string {
  const abs = Math.abs(value)
  const fixed = abs.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')
  const sign = value < 0 ? '-' : ''
  return `${sign}${formatted},${decPart}\u00A0Kc`
}

/** Format date as YYYY-MM-DD for input[type=date] */
function toDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Format date as DD.MM.YYYY for display */
function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}

/** Get DPH legal note based on selected rate */
function getDphNote(rate: CzDphRate): string | null {
  if (rate === 'reverse_charge') {
    return 'Daň odvede zákazník dle § 92a zákona o DPH'
  }
  if (rate === 'non_vat_payer') {
    return 'Dodavatel není plátcem DPH. Faktura není daňovým dokladem.'
  }
  return null
}

export default function InvoiceFormModal({
  lang,
  jobId,
  onSuccess,
  onCancel,
}: InvoiceFormModalProps) {
  const t = useCallback(
    (key: string) => getTranslation(lang, key),
    [lang]
  )
  const { toast, showToast, hideToast } = useDispatchToast()

  // -- State --
  const [billing, setBilling] = useState<TechnicianBillingData>(EMPTY_BILLING)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [evidencniCislo, setEvidencniCislo] = useState('')
  const [invoiceNumberLastEdited, setInvoiceNumberLastEdited] = useState<'invoice' | 'evidencni' | null>(null)
  const [variabilniSymbol, setVariabilniSymbol] = useState('')
  const [dphRate, setDphRate] = useState<CzDphRate>('21')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aresLoading, setAresLoading] = useState(false)
  // Post-submit: show generated invoice for review before closing
  const [generatedInvoice, setGeneratedInvoice] = useState<InvoiceData | null>(null)
  const [invoiceHtml, setInvoiceHtml] = useState<string | null>(null)

  // Invoice dates
  const today = toDateInput(new Date())
  const [issueDate, setIssueDate] = useState(today)
  const [duzp, setDuzp] = useState(today)
  const [deliveryDate, setDeliveryDate] = useState(today)
  const [dueDate, setDueDate] = useState(toDateInput(new Date(Date.now() + 14 * 86400000)))

  // Invoice preview
  const [preview, setPreview] = useState<InvoicePreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  // DPH auto-suggestion: apply only once on first load
  const [dphSuggestionApplied, setDphSuggestionApplied] = useState(false)
  const [dphExplanation, setDphExplanation] = useState<string | null>(null)

  // -- Load billing data --
  useEffect(() => {
    fetch('/api/dispatch/billing', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data) => {
        if (data.billing) setBilling(data.billing)
      })
      .catch(() => setError('Nepodařilo se načíst fakturační údaje'))
      .finally(() => setLoading(false))
  }, [])

  // -- Load invoice preview when DPH rate changes --
  useEffect(() => {
    if (loading) return
    setPreviewLoading(true)
    setPreviewError(null)

    fetch(
      `/api/dispatch/invoice/preview?jobId=${encodeURIComponent(jobId)}&dphRate=${encodeURIComponent(dphRate)}`,
      { credentials: 'include' }
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data: InvoicePreview) => {
        setPreview(data)
        // VS sa NEVYPĹŇA automaticky — technik ho zadá sám
        // Set billing from preview if we haven't loaded it yet
        if (data.billing) {
          setBilling((prev) => {
            // Only update if still at empty defaults
            if (!prev.billing_name && !prev.ico) return data.billing!
            return prev
          })
        }
        // DPH auto-suggestion: apply only on first load (not when user changes DPH manually)
        if (!dphSuggestionApplied && data.suggestedDphRate) {
          setDphRate(data.suggestedDphRate)
          setDphSuggestionApplied(true)
        }
        // Always update explanation text from the latest response
        setDphExplanation(data.dphExplanation || null)
        // Set dates from protocolSubmittedAt
        if (data.protocolSubmittedAt) {
          const pDate = new Date(data.protocolSubmittedAt)
          if (!isNaN(pDate.getTime())) {
            const deliveryStr = toDateInput(pDate)
            setDeliveryDate(deliveryStr)
            setDuzp(deliveryStr)
            // Due date = 14 days from delivery
            const due = new Date(pDate.getTime() + 14 * 86400000)
            setDueDate(toDateInput(due))
          }
        }
      })
      .catch(() => setPreviewError('Nepodařilo se načíst náhled faktury'))
      .finally(() => setPreviewLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dphRate, loading, jobId])

  // -- Helpers --
  const updateField = (
    field: keyof TechnicianBillingData,
    value: string | boolean
  ) => {
    setBilling((prev) => ({ ...prev, [field]: value }))
  }

  // Linked invoice number / evidencni cislo
  const handleInvoiceNumberChange = (val: string) => {
    setInvoiceNumber(val)
    setInvoiceNumberLastEdited('invoice')
    // Auto-sync to evidencni cislo unless it was explicitly diverged
    if (invoiceNumberLastEdited !== 'evidencni') {
      setEvidencniCislo(val)
    }
  }

  const handleEvidencniCisloChange = (val: string) => {
    setEvidencniCislo(val)
    setInvoiceNumberLastEdited('evidencni')
    // Auto-sync to invoice number unless it was explicitly diverged
    if (invoiceNumberLastEdited !== 'invoice') {
      setInvoiceNumber(val)
    }
  }

  // -- ARES lookup --
  const handleAresLookup = async () => {
    const ico = (billing.ico || '').trim()
    if (!ico || ico.length < 6) return
    setAresLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ares/lookup?ico=${encodeURIComponent(ico)}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || err.error || 'Nepodařilo se načíst data z ARES')
      }
      const json = await res.json()
      const d = json.data || json // ARES API returns { success, data: {...} }
      setBilling((prev) => ({
        ...prev,
        billing_name: d.billing_name ?? prev.billing_name,
        billing_street: d.billing_street ?? prev.billing_street,
        billing_city: d.billing_city ?? prev.billing_city,
        billing_psc: d.billing_psc ?? prev.billing_psc,
        dic: d.dic ?? prev.dic,
        ic_dph: d.ic_dph ?? prev.ic_dph,
        platca_dph: d.platca_dph ?? prev.platca_dph,
        // IBAN, bank_account_number, bank_code intentionally NOT overwritten
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba při načítání z ARES')
    } finally {
      setAresLoading(false)
    }
  }

  // -- Submit --
  const handleSubmit = async () => {
    if (!/^\d{1,10}$/.test(variabilniSymbol.trim())) {
      setError('Variabilní symbol musí být 1–10 číslic')
      return
    }
    if (!invoiceNumber.trim()) {
      setError('Číslo faktury je povinné')
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/dispatch/invoice', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          method: 'system_generated',
          invoiceNumber: invoiceNumber.trim(),
          evidencniCislo: evidencniCislo.trim() || invoiceNumber.trim(),
          variabilniSymbol: variabilniSymbol.trim(),
          dphRate,
          issueDate,
          duzp,
          dueDate,
          supplierOverrides: billing,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Chyba při ukládání')
      }

      const { invoice } = (await res.json()) as { invoice: InvoiceData }

      // Generate PDF and show preview instead of closing
      await generatePdfPreview(invoice)

      setGeneratedInvoice(invoice)
      showToast(t('dispatch.invoice.success'), 'success')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Neznámá chyba')
    } finally {
      setSubmitting(false)
    }
  }

  // -- Invoice HTML preview (srcdoc — works on iOS Safari unlike blob URLs) --
  const generatePdfPreview = async (invoice: InvoiceData) => {
    const html = generateInvoiceHtml(invoice)
    setInvoiceHtml(html)
  }

  // Download invoice — server-side PDF via /api/dispatch/invoice/pdf
  const handleDownloadPdf = async () => {
    if (!generatedInvoice) return
    try {
      const res = await fetch(
        `/api/dispatch/invoice/pdf?jobId=${encodeURIComponent(jobId)}`,
        { credentials: 'include' }
      )
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `faktura-${generatedInvoice.invoiceNumber || jobId}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch {
      // Fallback: open HTML version in new tab for browser print
      const html = generateInvoiceHtml(generatedInvoice)
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    }
  }

  // Go back to edit mode (reset generated state)
  const handleEditInvoice = () => {
    setInvoiceHtml(null)
    setGeneratedInvoice(null)
  }

  // Confirm and close
  const handleConfirmAndClose = () => {
    onSuccess()
  }

  // ================================================================
  // STYLES
  // ================================================================

  const styles = {
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
    },
    modal: {
      background: 'var(--surface, #fff)',
      borderRadius: 12,
      width: '100%',
      maxWidth: 640,
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    },
    header: {
      padding: '20px 24px 12px',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    },
    headerTitle: {
      margin: 0,
      fontSize: 18,
      fontWeight: 700,
      color: 'var(--dark)',
    },
    headerSub: {
      color: 'var(--text-secondary)',
      fontSize: 13,
      marginTop: 4,
    },
    scrollBody: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '16px 24px 24px',
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: 700,
      color: 'var(--dark)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      marginBottom: 8,
      marginTop: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    editableBox: {
      background: 'var(--bg-card, #fafaf8)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: 12,
    },
    readonlyBox: {
      background: 'var(--readonly-bg)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: 12,
      color: 'var(--dark)',
      fontSize: 14,
      lineHeight: 1.6,
    },
    readonlyBadge: {
      fontSize: 10,
      background: 'var(--bg-secondary)',
      color: 'var(--text-secondary)',
      padding: '2px 6px',
      borderRadius: 4,
      fontWeight: 500,
    },
    fieldRow: {
      marginBottom: 8,
    },
    fieldLabel: {
      display: 'block',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--dark)',
      marginBottom: 3,
    },
    fieldInput: {
      width: '100%',
      padding: '8px 10px',
      border: '1px solid var(--input-border)',
      borderRadius: 6,
      fontSize: 14,
      color: 'var(--dark)',
      background: 'var(--input-bg, #fff)',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    halfRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10,
    },
    errorBox: {
      background: 'var(--danger-bg)',
      border: '1px solid var(--danger-border)',
      borderRadius: 8,
      padding: '10px 14px',
      color: 'var(--danger-text)',
      fontSize: 13,
      marginBottom: 12,
    },
    dphOptions: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: 8,
      marginTop: 6,
    },
    dphOption: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 14,
      color: 'var(--dark)',
      cursor: 'pointer',
      padding: '6px 12px',
      border: '1px solid var(--input-border)',
      borderRadius: 6,
      background: 'var(--input-bg, #fff)',
    },
    dphOptionSelected: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 14,
      color: '#fff',
      cursor: 'pointer',
      padding: '6px 12px',
      border: '1px solid var(--gold)',
      borderRadius: 6,
      background: 'var(--gold)',
      fontWeight: 600,
    },
    dphNote: {
      marginTop: 8,
      padding: '8px 12px',
      background: 'var(--warning-bg)',
      border: '1px solid var(--warning-border)',
      borderRadius: 6,
      fontSize: 13,
      color: 'var(--warning-text)',
      fontStyle: 'italic' as const,
    },
    tableWrap: {
      overflowX: 'auto' as const,
      marginTop: 12,
      border: '1px solid var(--border)',
      borderRadius: 8,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      fontSize: 13,
    },
    th: {
      background: 'var(--gold)',
      color: '#fff',
      fontWeight: 600,
      padding: '8px 10px',
      textAlign: 'right' as const,
      whiteSpace: 'nowrap' as const,
      fontSize: 12,
    },
    thFirst: {
      background: 'var(--gold)',
      color: '#fff',
      fontWeight: 600,
      padding: '8px 10px',
      textAlign: 'left' as const,
      fontSize: 12,
    },
    td: {
      padding: '7px 10px',
      textAlign: 'right' as const,
      color: 'var(--dark)',
      borderBottom: '1px solid var(--divider)',
      whiteSpace: 'nowrap' as const,
    },
    tdFirst: {
      padding: '7px 10px',
      textAlign: 'left' as const,
      color: 'var(--dark)',
      borderBottom: '1px solid var(--divider)',
    },
    rowEven: {
      background: 'var(--bg-card, #fff)',
    },
    rowOdd: {
      background: 'var(--bg-card, #fafaf8)',
    },
    totalsRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 10px',
      fontSize: 14,
      color: 'var(--dark)',
    },
    grandTotalRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 14px',
      fontSize: 16,
      fontWeight: 700,
      background: 'var(--gold)',
      color: '#fff',
      borderRadius: 8,
      marginTop: 4,
    },
    breakdownBox: {
      background: 'var(--warning-bg)',
      border: '1px solid var(--gold)',
      borderRadius: 8,
      padding: 14,
      marginTop: 12,
    },
    breakdownTitle: {
      fontSize: 13,
      fontWeight: 700,
      color: 'var(--dark)',
      marginBottom: 8,
    },
    breakdownRow: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 13,
      color: 'var(--dark)',
      padding: '3px 0',
    },
    footer: {
      padding: '16px 24px',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: 0,
      flexShrink: 0,
    },
    btnOutline: {
      flex: 1,
      padding: '12px 16px',
      border: '1px solid var(--btn-outline-border)',
      borderRadius: 8,
      background: 'var(--bg-card, #fff)',
      color: 'var(--dark)',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
    },
    btnPrimary: {
      flex: 1,
      padding: '12px 16px',
      border: 'none',
      borderRadius: 8,
      background: 'var(--gold)',
      color: '#fff',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
    },
    btnDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    loadingSpinner: {
      textAlign: 'center' as const,
      padding: '20px 0',
      color: 'var(--text-secondary)',
      fontSize: 14,
    },
    dateRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10,
      marginBottom: 8,
    },
    readonlyInput: {
      width: '100%',
      padding: '8px 10px',
      border: '1px solid var(--border)',
      borderRadius: 6,
      fontSize: 14,
      color: 'var(--text-secondary)',
      background: 'var(--readonly-bg)',
      boxSizing: 'border-box' as const,
    },
    deliveryDateDisplay: {
      width: '100%',
      padding: '8px 10px',
      border: '1px solid var(--border)',
      borderRadius: 6,
      fontSize: 14,
      color: 'var(--dark)',
      background: 'var(--readonly-bg)',
      boxSizing: 'border-box' as const,
      fontWeight: 500,
    },
    aresBtn: {
      padding: '8px 12px',
      fontSize: 12,
      fontWeight: 600,
      border: 'none',
      borderRadius: 6,
      background: 'var(--gold)',
      color: '#fff',
      cursor: 'pointer',
      whiteSpace: 'nowrap' as const,
      height: 'fit-content',
    },
    aresBtnDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  }

  // ================================================================
  // RENDER
  // ================================================================

  if (loading) {
    return (
      <div style={styles.overlay} onClick={onCancel}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={{ ...styles.loadingSpinner, padding: 60 }}>Načítám...</div>
        </div>
      </div>
    )
  }

  const dphNote = getDphNote(dphRate)

  // ── Invoice preview screen (after generation) ──
  if (generatedInvoice && invoiceHtml) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.header}>
            <h3 style={styles.headerTitle}>Kontrola faktury</h3>
            <p style={styles.headerSub}>
              {generatedInvoice.invoiceNumber} &middot; {fmtCzk(generatedInvoice.grandTotal || 0)}
            </p>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <iframe
              srcDoc={invoiceHtml}
              title="Náhled faktury"
              sandbox="allow-same-origin"
              style={{ flex: 1, width: '100%', border: 'none', minHeight: 400, background: '#fff' }}
            />
          </div>
          <div style={{ ...styles.footer, flexDirection: 'row' as const, gap: 8 }}>
            <button
              style={styles.btnOutline}
              onClick={handleEditInvoice}
            >
              Upravit
            </button>
            <button
              style={{ ...styles.btnOutline, flex: 0, whiteSpace: 'nowrap' as const }}
              onClick={handleDownloadPdf}
            >
              PDF
            </button>
            <button
              style={styles.btnPrimary}
              onClick={handleConfirmAndClose}
            >
              Potvrdit
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* -- Header (fixed) -- */}
        <div style={styles.header}>
          <h3 style={styles.headerTitle}>
            {t('dispatch.invoice.systemGenerated')}
          </h3>
          <p style={styles.headerSub}>
            {t('dispatch.invoice.editable')}
          </p>
        </div>

        {/* -- Scrollable body -- */}
        <div style={styles.scrollBody}>
          {error && <div style={styles.errorBox}>{error}</div>}

          {/* == Supplier (editable) == */}
          <div style={styles.sectionLabel}>
            {t('dispatch.invoice.supplier')}
          </div>
          <div style={styles.editableBox}>
            <div style={styles.fieldRow}>
              <label style={styles.fieldLabel}>Název / Jméno</label>
              <input
                style={styles.fieldInput}
                value={billing.billing_name || ''}
                onChange={(e) => updateField('billing_name', e.target.value)}
              />
            </div>
            <div style={styles.fieldRow}>
              <label style={styles.fieldLabel}>Ulice</label>
              <input
                style={styles.fieldInput}
                value={billing.billing_street || ''}
                onChange={(e) => updateField('billing_street', e.target.value)}
              />
            </div>
            <div style={styles.halfRow}>
              <div style={styles.fieldRow}>
                <label style={styles.fieldLabel}>Město</label>
                <input
                  style={styles.fieldInput}
                  value={billing.billing_city || ''}
                  onChange={(e) => updateField('billing_city', e.target.value)}
                />
              </div>
              <div style={styles.fieldRow}>
                <label style={styles.fieldLabel}>PSČ</label>
                <input
                  style={styles.fieldInput}
                  value={billing.billing_psc || ''}
                  onChange={(e) => updateField('billing_psc', e.target.value)}
                />
              </div>
            </div>
            <div style={styles.halfRow}>
              <div style={styles.fieldRow}>
                <label style={styles.fieldLabel}>IČO</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                  <input
                    style={{ ...styles.fieldInput, flex: 1 }}
                    value={billing.ico || ''}
                    onChange={(e) => updateField('ico', e.target.value)}
                  />
                  <button
                    style={{
                      ...styles.aresBtn,
                      ...((!(billing.ico || '').trim() || (billing.ico || '').trim().length < 6 || aresLoading)
                        ? styles.aresBtnDisabled
                        : {}),
                    }}
                    onClick={handleAresLookup}
                    disabled={!(billing.ico || '').trim() || (billing.ico || '').trim().length < 6 || aresLoading}
                    type="button"
                  >
                    {aresLoading ? 'Hledám...' : 'ARES'}
                  </button>
                </div>
              </div>
              <div style={styles.fieldRow}>
                <label style={styles.fieldLabel}>DIČ</label>
                <input
                  style={styles.fieldInput}
                  value={billing.dic || ''}
                  onChange={(e) => updateField('dic', e.target.value)}
                />
              </div>
            </div>
            <div style={styles.fieldRow}>
              <label style={styles.fieldLabel}>Registrace</label>
              <input
                style={styles.fieldInput}
                value={billing.registration || ''}
                onChange={(e) => updateField('registration', e.target.value)}
                placeholder="Spisová značka, registrační číslo"
              />
            </div>
            <div style={styles.halfRow}>
              <div style={styles.fieldRow}>
                <label style={styles.fieldLabel}>Č. účtu</label>
                <input
                  style={styles.fieldInput}
                  value={billing.bank_account_number || ''}
                  onChange={(e) => updateField('bank_account_number', e.target.value)}
                />
              </div>
              <div style={styles.fieldRow}>
                <label style={styles.fieldLabel}>Kód banky</label>
                <input
                  style={styles.fieldInput}
                  value={billing.bank_code || ''}
                  onChange={(e) => updateField('bank_code', e.target.value)}
                />
              </div>
            </div>
            <div style={styles.fieldRow}>
              <label style={styles.fieldLabel}>IBAN</label>
              <input
                style={styles.fieldInput}
                value={billing.iban || ''}
                onChange={(e) => updateField('iban', e.target.value)}
              />
            </div>
            <div style={styles.fieldRow}>
              <label style={styles.fieldLabel}>Poznámka na faktuře</label>
              <textarea
                style={{ ...styles.fieldInput, resize: 'vertical' as const, minHeight: 64 }}
                value={billing.invoice_note || ''}
                onChange={(e) => updateField('invoice_note', e.target.value)}
                placeholder="Volitelná poznámka, která se zobrazí na faktuře"
                rows={3}
              />
            </div>
          </div>

          {/* == Buyer (read-only) == */}
          <div style={styles.sectionLabel}>
            {t('dispatch.invoice.buyer')}
            <span style={styles.readonlyBadge}>
              {t('dispatch.invoice.notEditable')}
            </span>
          </div>
          <div style={styles.readonlyBox}>
            <strong>{INVOICE_BUYER_CZ.name}</strong>
            <br />
            {INVOICE_BUYER_CZ.street}
            <br />
            {INVOICE_BUYER_CZ.psc} {INVOICE_BUYER_CZ.city}
            <br />
            IČO: {INVOICE_BUYER_CZ.ico}
            <br />
            DIČ: {INVOICE_BUYER_CZ.dic}
          </div>

          {/* == Czech invoice legal fields == */}
          <div style={styles.sectionLabel}>Údaje faktury</div>
          <div style={styles.editableBox}>
            {/* Invoice number + Evidencni cislo */}
            <div style={styles.halfRow}>
              <div style={styles.fieldRow}>
                <label style={styles.fieldLabel}>Číslo faktury *</label>
                <input
                  style={styles.fieldInput}
                  value={invoiceNumber}
                  onChange={(e) => handleInvoiceNumberChange(e.target.value)}
                  placeholder="napr. FV-2026-001"
                  maxLength={30}
                />
              </div>
              <div style={styles.fieldRow}>
                <label style={styles.fieldLabel}>Evidenční číslo daň. dokladu</label>
                <input
                  style={styles.fieldInput}
                  value={evidencniCislo}
                  onChange={(e) => handleEvidencniCisloChange(e.target.value)}
                  placeholder="napr. FV-2026-001"
                  maxLength={30}
                />
              </div>
            </div>

            {/* Dates row 1: Datum dodání + Datum splatnosti */}
            <div style={styles.dateRow}>
              <div style={styles.fieldRow}>
                <label style={styles.fieldLabel}>Datum dodání</label>
                <div style={styles.deliveryDateDisplay}>
                  {fmtDate(deliveryDate)}
                </div>
              </div>
              <div style={styles.fieldRow}>
                <label style={styles.fieldLabel}>Datum splatnosti</label>
                <input
                  type="date"
                  style={styles.fieldInput}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Dates row 2: Datum vystavení + DUZP */}
            <div style={styles.dateRow}>
              <div style={styles.fieldRow}>
                <label style={styles.fieldLabel}>Datum vystavení</label>
                <input
                  type="date"
                  style={styles.fieldInput}
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div style={styles.fieldRow}>
                <label style={styles.fieldLabel}>DUZP</label>
                <input
                  type="date"
                  style={styles.fieldInput}
                  value={duzp}
                  onChange={(e) => setDuzp(e.target.value)}
                />
              </div>
            </div>

            {/* Payment method + Forma úhrady */}
            <div style={styles.dateRow}>
              <div style={styles.fieldRow}>
                <label style={styles.fieldLabel}>Forma úhrady</label>
                <input
                  style={styles.readonlyInput}
                  value="Bankovní převod"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* == Variabilni symbol == */}
          <div style={{ ...styles.fieldRow, marginTop: 16 }}>
            <label style={styles.fieldLabel}>{t('dispatch.invoice.variabilniSymbol')} *</label>
            <input
              style={styles.fieldInput}
              value={variabilniSymbol}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                setVariabilniSymbol(val)
                // Auto-prepis do čísla faktury a evidenčního čísla
                setInvoiceNumber(val)
                setEvidencniCislo(val)
              }}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder=""
              maxLength={10}
            />
          </div>

          {/* == DPH rate == */}
          <div style={{ marginTop: 16 }}>
            <div style={styles.sectionLabel}>
              {t('dispatch.invoice.dphRate')}
            </div>
            <div style={styles.dphOptions}>
              {CZ_DPH_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  style={dphRate === opt.value ? styles.dphOptionSelected : styles.dphOption}
                >
                  <input
                    type="radio"
                    name="dphRate"
                    value={opt.value}
                    checked={dphRate === opt.value}
                    onChange={() => setDphRate(opt.value)}
                    style={{ display: 'none' }}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            {dphNote && (
              <div style={styles.dphNote}>{dphNote}</div>
            )}
            {dphExplanation && (
              <div style={{
                marginTop: 8,
                padding: '8px 12px',
                background: 'var(--surface, #f8f8f6)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}>
                {dphExplanation}
              </div>
            )}
          </div>

          {/* == Invoice preview == */}
          <div style={styles.sectionLabel}>Náhled položek faktury</div>

          {previewLoading && (
            <div style={styles.loadingSpinner}>Načítám položky...</div>
          )}

          {previewError && (
            <div style={styles.errorBox}>{previewError}</div>
          )}

          {preview && !previewLoading && (
            <>
              {/* Items table */}
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.thFirst}>Popis</th>
                      <th style={styles.th}>Množ.</th>
                      <th style={styles.th}>Jedn.</th>
                      <th style={styles.th}>Jedn. cena</th>
                      <th style={styles.th}>Základ</th>
                      <th style={styles.th}>Sazba</th>
                      <th style={styles.th}>DPH</th>
                      <th style={styles.th}>Celkem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(preview.items ?? []).map((item, idx) => (
                      <tr
                        key={idx}
                        style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}
                      >
                        <td style={styles.tdFirst}>{item.description}</td>
                        <td style={styles.td}>{item.quantity}</td>
                        <td style={styles.td}>{item.unit}</td>
                        <td style={styles.td}>{fmtCzk(item.unitPrice)}</td>
                        <td style={styles.td}>{fmtCzk(item.totalWithoutVat)}</td>
                        <td style={styles.td}>{item.vatRate}%</td>
                        <td style={styles.td}>{fmtCzk(item.vatAmount)}</td>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{fmtCzk(item.totalWithVat)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div style={{ marginTop: 12 }}>
                <div style={styles.totalsRow}>
                  <span>Celkem bez DPH</span>
                  <strong>{fmtCzk(preview.subtotal)}</strong>
                </div>
                <div style={styles.totalsRow}>
                  <span>DPH</span>
                  <strong>{fmtCzk(preview.vatTotal)}</strong>
                </div>
                <div style={styles.grandTotalRow}>
                  <span>CELKEM K ÚHRADĚ</span>
                  <span>{fmtCzk(preview.grandTotal)}</span>
                </div>
              </div>

              {/* Payment breakdown */}
              {preview.paymentBreakdown && preview.paymentBreakdown.clientSurcharge > 0 && (
                <div style={styles.breakdownBox}>
                  <div style={styles.breakdownTitle}>Rozklad platby</div>
                  <div style={styles.breakdownRow}>
                    <span>Celkové náklady (bez DPH)</span>
                    <span>{fmtCzk(preview.paymentBreakdown.subtotalGross)}</span>
                  </div>
                  <div style={styles.breakdownRow}>
                    <span>Doplatek klienta (bez DPH)</span>
                    <span>{fmtCzk(preview.paymentBreakdown.clientSurcharge)}</span>
                  </div>
                  <div style={styles.breakdownRow}>
                    <span>Doplatek klienta (s DPH)</span>
                    <span>{fmtCzk(preview.paymentBreakdown.clientSurchargeWithVat)}</span>
                  </div>
                  <div style={{ ...styles.breakdownRow, borderTop: '1px solid var(--gold)', paddingTop: 6, marginTop: 4, fontWeight: 600 }}>
                    <span>K úhradě od Zlatí Řemeslníci</span>
                    <span>{fmtCzk(preview.paymentBreakdown.paymentFromZR)}</span>
                  </div>
                  <div style={{ ...styles.breakdownRow, fontWeight: 600 }}>
                    <span>K úhradě od klienta (s DPH)</span>
                    <span>{fmtCzk(preview.paymentBreakdown.paymentFromCustomerWithVat)}</span>
                  </div>
                </div>
              )}

              {/* Summary line */}
              {preview.referenceNumber && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                  Ref.: {preview.referenceNumber} | Vystaveno: {fmtDate(issueDate)} | DUZP: {fmtDate(duzp)} | Splatnost: {fmtDate(dueDate)}
                </div>
              )}
            </>
          )}

          {!preview && !previewLoading && !previewError && (
            <div style={{ ...styles.loadingSpinner, color: 'var(--text-secondary)' }}>
              Zvolte sazbu DPH pro zobrazení náhledu
            </div>
          )}
        </div>

        {/* -- Footer (fixed) -- */}
        <div style={styles.footer}>
          {error && (
            <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600, width: '100%', textAlign: 'center', marginBottom: 8 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button
              style={styles.btnOutline}
              onClick={onCancel}
            >
              {submitting ? 'Zavřít' : t('common.cancel')}
            </button>
            <button
              style={{
                ...styles.btnPrimary,
                ...(submitting ? styles.btnDisabled : {}),
              }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Generuji...' : t('dispatch.invoice.generate')}
            </button>
          </div>
        </div>

      </div>
      <DispatchToast message={toast?.message ?? ''} type={toast?.type ?? 'success'} visible={!!toast} onClose={hideToast} />
    </div>
  )
}
