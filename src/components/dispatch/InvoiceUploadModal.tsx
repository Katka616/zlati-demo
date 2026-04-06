'use client'

/**
 * InvoiceUploadModal — Cesta B: technician uploads own invoice.
 *
 * 1. Loads invoice preview (items table) from GET /api/dispatch/invoice/preview
 * 2. DPH rate selector — items table updates when changed
 * 3. Editable supplier billing info (pre-loaded from preview)
 * 4. Read-only buyer info (our company)
 * 5. Confirmation checkbox
 * 6. File upload (PDF or image) with preview
 * 7. Submit → POST /api/dispatch/invoice (self_issued) + POST /api/dispatch/invoice/upload
 *
 * Pattern: modal-overlay + modal-content (same as InvoiceFormModal).
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getTranslation } from '@/lib/i18n'
import { Language } from '@/types/protocol'
import { INVOICE_BUYER_CZ, CZ_DPH_OPTIONS } from '@/lib/constants'
import DispatchToast, { useDispatchToast } from './DispatchToast'
import type {
  CzDphRate,
  TechnicianBillingData,
  InvoiceLineItem,
} from '@/types/dispatch'

interface InvoiceUploadModalProps {
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

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.webp'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

/** Format number as Czech currency: 1 234,50 Kč */
function fmtCzk(value: number): string {
  const abs = Math.abs(value)
  const fixed = abs.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')
  const sign = value < 0 ? '-' : ''
  return `${sign}${formatted},${decPart}\u00A0Kč`
}

export default function InvoiceUploadModal({
  lang,
  jobId,
  onSuccess,
  onCancel,
}: InvoiceUploadModalProps) {
  const t = useCallback(
    (key: string) => getTranslation(lang, key),
    [lang]
  )
  const { toast, showToast, hideToast } = useDispatchToast()
  const fileRef = useRef<HTMLInputElement>(null)

  // -- State --
  const [dphRate, setDphRate] = useState<CzDphRate>('21')
  const [billing, setBilling] = useState<TechnicianBillingData>(EMPTY_BILLING)
  const [billingLoaded, setBillingLoaded] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null)
  const [mismatchReason, setMismatchReason] = useState('')

  // Invoice preview
  const [preview, setPreview] = useState<InvoicePreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // -- Load invoice preview (and billing from it) --
  useEffect(() => {
    setPreviewLoading(true)
    setPreviewError(null)

    fetch(
      `/api/dispatch/invoice/preview?jobId=${encodeURIComponent(jobId)}&dphRate=${encodeURIComponent(dphRate)}`,
      { credentials: 'include' }
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data: InvoicePreview) => {
        setPreview(data)
        // Load billing from preview response (only first time)
        if (!billingLoaded && data.billing) {
          setBilling(data.billing)
          setBillingLoaded(true)
        }
      })
      .catch(() => setPreviewError('Nepodařilo se načíst náhled faktury'))
      .finally(() => setPreviewLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dphRate, jobId])

  // -- Helpers --
  const updateField = (
    field: keyof TechnicianBillingData,
    value: string | boolean
  ) => {
    setBilling((prev) => ({ ...prev, [field]: value }))
  }

  // -- File handling --
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > MAX_FILE_SIZE) {
      setError('Soubor je příliš velký (max 10 MB)')
      return
    }

    setFile(selected)
    setError(null)

    const reader = new FileReader()
    reader.onload = () => {
      setFilePreview(reader.result as string)
    }
    reader.readAsDataURL(selected)
  }

  const removeFile = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setFile(null)
    setFilePreview(null)
    setMismatchWarning(null)
    setMismatchReason('')
    if (fileRef.current) fileRef.current.value = ''
  }

  // -- Submit --
  const handleSubmit = async () => {
    if (!file || !filePreview) {
      setError('Vyberte soubor k nahrání')
      return
    }
    if (!confirmed) {
      setError('Potvrďte, že fakturační údaje souhlasí')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Step 1: Mark job as self_issued with billing + dph info
      // Skip if we're re-submitting after a mismatch warning (invoice already declared)
      if (!mismatchWarning) {
        const invoiceRes = await fetch('/api/dispatch/invoice', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            method: 'self_issued',
            dphRate,
            supplierOverrides: billing,
            confirmed: true,
          }),
        })

        if (!invoiceRes.ok) {
          const err = await invoiceRes.json().catch(() => ({}))
          throw new Error(err.error || 'Chyba při ukládání faktury')
        }
      }

      // Step 2: Upload the file
      const uploadRes = await fetch('/api/dispatch/invoice/upload', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          filename: file.name,
          data: filePreview,
          ...(mismatchReason ? { mismatch_reason: mismatchReason } : {}),
        }),
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}))
        throw new Error(err.error || 'Chyba při nahrávání souboru')
      }

      const uploadData = await uploadRes.json()
      if (uploadData.needsReason) {
        setMismatchWarning(uploadData.validation?.message || 'Suma na faktúre nesúhlasí s vyúčtovaním.')
        return
      }

      showToast(t('dispatch.invoice.uploadSuccess'), 'success')
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Neznámá chyba')
    } finally {
      setSubmitting(false)
    }
  }

  const isPdf = file?.type === 'application/pdf'
  const canSubmit = !!file && confirmed && !submitting && !previewError && (!mismatchWarning || mismatchReason.trim().length > 0)

  // -- Generovanie PDF rozpisu k fakturaci --
  const [downloadingBreakdown, setDownloadingBreakdown] = useState(false)

  const handleDownloadBreakdown = async () => {
    if (!preview) return
    setDownloadingBreakdown(true)
    try {
      const rateLabel = dphRate === 'reverse_charge' ? 'Přenos daňové povinnosti (§ 92a)'
        : dphRate === 'non_vat_payer' ? 'Neplátce DPH'
        : dphRate + ' %'

      const itemRows = preview.items.map(item => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:left">${item.description}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right">${item.quantity}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:center">${item.unit}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right">${fmtCzk(item.unitPrice)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right">${fmtCzk(item.totalWithoutVat)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right">${item.vatRate} %</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right">${fmtCzk(item.vatAmount)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:600">${fmtCzk(item.totalWithVat)}</td>
        </tr>
      `).join('')

      const pb = preview.paymentBreakdown
      const paymentBreakdownHtml = pb && pb.clientSurcharge > 0 ? `
        <div style="margin-top:16px;padding:12px;border:1px solid #c9a227;border-radius:8px;background:#fffdf5">
          <div style="font-weight:700;margin-bottom:8px">Rozklad platby</div>
          <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Celkové náklady (bez DPH)</span><span>${fmtCzk(pb.subtotalGross)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Doplatek klienta (bez DPH)</span><span>${fmtCzk(pb.clientSurcharge)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Doplatek klienta (s DPH)</span><span>${fmtCzk(pb.clientSurchargeWithVat)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-weight:700;border-top:1px solid #c9a227;margin-top:4px"><span>K úhradě od Zlatí Řemeslníci</span><span>${fmtCzk(pb.paymentFromZR)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-weight:700"><span>K úhradě od klienta (s DPH)</span><span>${fmtCzk(pb.paymentFromCustomerWithVat)}</span></div>
        </div>
      ` : ''

      const html = `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"><title>Rozpis k fakturaci</title></head>
<body style="font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:20px;max-width:900px;margin:0 auto">
  <h2 style="margin:0 0 4px;font-size:18px;color:#1a1a1a">Rozpis k fakturaci</h2>
  <p style="color:#78716C;font-size:12px;margin:0 0 16px">${preview.referenceNumber ? 'Ref.: ' + preview.referenceNumber + ' | ' : ''}Sazba DPH: ${rateLabel}</p>
  <table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead>
      <tr style="background:#c9a227;color:#fff">
        <th style="padding:8px;text-align:left">Popis</th>
        <th style="padding:8px;text-align:right">Množ.</th>
        <th style="padding:8px;text-align:center">Jedn.</th>
        <th style="padding:8px;text-align:right">Jedn. cena</th>
        <th style="padding:8px;text-align:right">Základ</th>
        <th style="padding:8px;text-align:right">Sazba</th>
        <th style="padding:8px;text-align:right">DPH</th>
        <th style="padding:8px;text-align:right">Celkem</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div style="margin-top:12px">
    <div style="display:flex;justify-content:space-between;padding:6px 0"><span>Celkem bez DPH</span><strong>${fmtCzk(preview.subtotal)}</strong></div>
    <div style="display:flex;justify-content:space-between;padding:6px 0"><span>DPH</span><strong>${fmtCzk(preview.vatTotal)}</strong></div>
    <div style="display:flex;justify-content:space-between;padding:10px 14px;background:#c9a227;color:#fff;font-weight:700;font-size:16px;border-radius:8px;margin-top:4px"><span>CELKEM K ÚHRADĚ</span><span>${fmtCzk(preview.grandTotal)}</span></div>
  </div>
  ${paymentBreakdownHtml}
</body>
</html>`

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      window.open(URL.createObjectURL(blob), '_blank')
    } catch {
      showToast('Chyba při generování PDF', 'error')
    } finally {
      setDownloadingBreakdown(false)
    }
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
    checkboxRow: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 20,
      padding: '12px 14px',
      background: 'var(--warning-bg)',
      border: '1px solid var(--gold)',
      borderRadius: 8,
      cursor: 'pointer',
    },
    checkbox: {
      marginTop: 2,
      width: 18,
      height: 18,
      accentColor: 'var(--gold)',
      flexShrink: 0,
      cursor: 'pointer',
    },
    checkboxLabel: {
      fontSize: 14,
      color: 'var(--dark)',
      fontWeight: 500,
      lineHeight: 1.4,
      cursor: 'pointer',
    },
    dropzone: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px',
      border: '2px dashed var(--input-border)',
      borderRadius: 10,
      background: 'var(--bg-card, #fafaf8)',
      cursor: 'pointer',
      marginTop: 16,
      transition: 'border-color 0.2s',
    },
    dropzoneIcon: {
      fontSize: 36,
      marginBottom: 8,
      opacity: 0.6,
    },
    dropzoneText: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--dark)',
      marginBottom: 4,
    },
    dropzoneHint: {
      fontSize: 12,
      color: 'var(--text-secondary)',
    },
    filePreviewBox: {
      marginTop: 16,
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      background: 'var(--bg-card, #fafaf8)',
    },
    fileInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 14px',
    },
    fileIcon: {
      fontSize: 24,
      flexShrink: 0,
    },
    fileName: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--dark)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    },
    fileSize: {
      fontSize: 12,
      color: 'var(--text-secondary)',
    },
    fileRemove: {
      marginLeft: 'auto',
      background: 'none',
      border: 'none',
      fontSize: 18,
      color: 'var(--text-secondary)',
      cursor: 'pointer',
      padding: '4px 8px',
      borderRadius: 4,
      flexShrink: 0,
    },
    fileImage: {
      width: '100%',
      maxHeight: 200,
      objectFit: 'contain' as const,
      background: 'var(--bg-card, #fff)',
      borderTop: '1px solid var(--border)',
    },
    footer: {
      padding: '16px 24px',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      gap: 10,
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
  }

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* -- Header (fixed) -- */}
        <div style={styles.header}>
          <h3 style={styles.headerTitle}>Nahrát vlastní fakturu</h3>
          <p style={styles.headerSub}>
            Zkontrolujte položky a fakturační údaje, pak nahrajte svou fakturu
          </p>
        </div>

        {/* -- Scrollable body -- */}
        <div style={styles.scrollBody}>
          {error && <div style={styles.errorBox}>{error}</div>}

          {/* == Invoice items preview == */}
          <div style={styles.sectionLabel}>Položky k fakturaci</div>

          {previewLoading && (
            <div style={styles.loadingSpinner}>Načítám položky...</div>
          )}

          {previewError && (
            <div style={styles.errorBox}>{previewError}</div>
          )}

          {preview && !previewLoading && (
            <>
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
                    {preview.items.map((item, idx) => (
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

              {/* Download breakdown button */}
              <button
                style={{
                  width: '100%',
                  marginTop: 14,
                  padding: '10px 16px',
                  border: '1px solid var(--gold)',
                  borderRadius: 8,
                  background: 'var(--bg-card, #fff)',
                  color: 'var(--gold)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: downloadingBreakdown ? 'not-allowed' : 'pointer',
                  opacity: downloadingBreakdown ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onClick={handleDownloadBreakdown}
                disabled={downloadingBreakdown}
              >
                {downloadingBreakdown ? 'Generuji...' : 'Stáhnout rozpis k fakturaci (PDF)'}
              </button>
            </>
          )}

          {/* == DPH rate selector == */}
          <div style={{ marginTop: 20 }}>
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
          </div>

          {/* == Supplier billing (editable) == */}
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
                <input
                  style={styles.fieldInput}
                  value={billing.ico || ''}
                  onChange={(e) => updateField('ico', e.target.value)}
                />
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

          {/* == File upload == */}
          <div style={styles.sectionLabel}>Nahrát fakturu</div>

          {!file ? (
            <label style={styles.dropzone}>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <span style={styles.dropzoneIcon}>&#128196;</span>
              <span style={styles.dropzoneText}>
                Klikněte pro výběr souboru
              </span>
              <span style={styles.dropzoneHint}>
                PDF, JPG, PNG, WebP -- max 10 MB
              </span>
            </label>
          ) : (
            <div style={styles.filePreviewBox}>
              <div style={styles.fileInfo}>
                <span style={styles.fileIcon}>
                  {isPdf ? '\uD83D\uDCCB' : '\uD83D\uDDBC\uFE0F'}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={styles.fileName}>{file.name}</div>
                  <div style={styles.fileSize}>
                    {(file.size / 1024).toFixed(0)} KB
                  </div>
                </div>
                <button
                  type="button"
                  style={styles.fileRemove}
                  onClick={removeFile}
                  title="Odebrat"
                >
                  &#10005;
                </button>
              </div>

              {/* Image preview (not for PDF) */}
              {!isPdf && filePreview && (
                <img
                  src={filePreview}
                  alt="Náhled faktury"
                  style={styles.fileImage}
                />
              )}
            </div>
          )}
        </div>

        {/* -- Confirmation checkbox (fixed, always visible) -- */}
        <div
          style={{ ...styles.checkboxRow, padding: '10px 16px', borderTop: '1px solid var(--divider)' }}
          onClick={() => setConfirmed((prev) => !prev)}
        >
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={styles.checkbox}
            onClick={(e) => e.stopPropagation()}
          />
          <span style={styles.checkboxLabel}>
            Potvrzuji, že fakturační údaje souhlasí s mou fakturou
          </span>
        </div>

        {/* -- Mismatch reason prompt -- */}
        {mismatchWarning && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--divider)' }}>
            <div style={{ ...styles.errorBox, marginBottom: 10, background: '#FFF8E1', borderColor: '#F59E0B', color: '#92400E' }}>
              ⚠️ {mismatchWarning}
            </div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', display: 'block', marginBottom: 6 }}>
              {t('dispatch.invoice.mismatchReasonLabel')}
            </label>
            <textarea
              value={mismatchReason}
              onChange={e => setMismatchReason(e.target.value)}
              placeholder={t('dispatch.invoice.mismatchReasonPlaceholder')}
              rows={2}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--divider)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {/* -- Footer (fixed) -- */}
        {error && (
          <div style={{ ...styles.errorBox, margin: '0 16px 8px' }}>{error}</div>
        )}
        <div style={styles.footer}>
          <button
            style={styles.btnOutline}
            onClick={onCancel}
            disabled={submitting}
          >
            {t('common.cancel')}
          </button>
          <button
            style={{
              ...styles.btnPrimary,
              ...(!canSubmit ? styles.btnDisabled : {}),
            }}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? t('dispatch.invoice.uploading') : mismatchWarning ? t('dispatch.invoice.confirmAndUpload') : t('dispatch.invoice.upload')}
          </button>
        </div>
      </div>
      <DispatchToast message={toast?.message ?? ''} type={toast?.type ?? 'success'} visible={!!toast} onClose={hideToast} />
    </div>
  )
}
