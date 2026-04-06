'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface InvoiceUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (data: { jobId?: number; invoiceNumber?: string; amount?: number }) => void
  preselectedJobId?: number
  type?: 'technician' | 'partner'
}

interface ExtractedInvoice {
  invoiceNumber?: string
  variabilniSymbol?: string
  issueDate?: string
  taxableDate?: string
  dueDate?: string
  supplierName?: string
  supplierIco?: string
  supplierDic?: string
  supplierIban?: string
  supplierBankAccount?: string
  subtotal?: number
  vatAmount?: number
  grandTotal?: number
  vatRate?: number
  confidence?: number
  suggestedJobs?: Array<{ id: number; reference_number: string; customer_name?: string }>
}

type Step = 1 | 2 | 3

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

export default function InvoiceUploadModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedJobId,
  type: defaultType = 'technician',
}: InvoiceUploadModalProps) {
  const [step, setStep] = useState<Step>(1)
  const [invoiceType, setInvoiceType] = useState<'technician' | 'partner'>(defaultType)
  const [jobIdInput, setJobIdInput] = useState(preselectedJobId ? String(preselectedJobId) : '')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedInvoice | null>(null)
  const [editedFields, setEditedFields] = useState<ExtractedInvoice>({})
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>(preselectedJobId)
  const [savedData, setSavedData] = useState<{ jobId?: number; invoiceNumber?: string; amount?: number } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setInvoiceType(defaultType)
      setJobIdInput(preselectedJobId ? String(preselectedJobId) : '')
      setSelectedFile(null)
      setFileDataUrl(null)
      setIsDragging(false)
      setIsLoading(false)
      setError(null)
      setExtracted(null)
      setEditedFields({})
      setSelectedJobId(preselectedJobId)
      setSavedData(null)
    }
  }, [isOpen, defaultType, preselectedJobId])

  const handleFileSelect = useCallback((file: File) => {
    setError(null)
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Nepodporovaný formát. Povolené: JPEG, PNG, PDF.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('Súbor je príliš veľký. Maximum 10 MB.')
      return
    }
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setFileDataUrl(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleZoneClick = () => fileInputRef.current?.click()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || !fileDataUrl) {
      setError('Prosím vyberte súbor.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        file: fileDataUrl,
        type: invoiceType,
      }
      if (selectedJobId) body.jobId = selectedJobId
      const res = await fetch('/api/admin/invoices/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.details || data.error || 'Chyba pri spracovaní faktúry.')
        return
      }
      const ext = data.extracted ?? {}
      if (data.suggestedJobs?.length) ext.suggestedJobs = data.suggestedJobs
      setExtracted(ext)
      setEditedFields(ext)
      if (data.saved && data.jobId) {
        // Already saved to job — go to success
        setSavedData({ jobId: data.jobId, invoiceNumber: ext.invoiceNumber, amount: ext.grandTotal })
        setSelectedJobId(data.jobId)
        setStep(3)
        onSuccess?.({ jobId: data.jobId, invoiceNumber: ext.invoiceNumber, amount: ext.grandTotal })
      } else {
        setStep(2)
      }
    } catch {
      setError('Sieťová chyba. Skúste znova.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!fileDataUrl) return
    if (!selectedJobId) {
      setError('Vyberte zákazku pre uloženie faktúry.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        file: fileDataUrl,
        type: invoiceType,
        jobId: selectedJobId,
      }
      const res = await fetch('/api/admin/invoices/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.details || data.error || 'Chyba pri ukladaní.')
        return
      }
      const result = {
        jobId: selectedJobId,
        invoiceNumber: editedFields.invoiceNumber,
        amount: editedFields.grandTotal,
      }
      setSavedData(result)
      setStep(3)
      onSuccess?.(result)
    } catch {
      setError('Sieťová chyba. Skúste znova.')
    } finally {
      setIsLoading(false)
    }
  }

  const updateField = (key: keyof ExtractedInvoice, value: string | number) => {
    setEditedFields((prev) => ({ ...prev, [key]: value }))
  }

  const confidenceBadge = (confidence?: number) => {
    if (confidence === undefined) return null
    let bg: string, color: string, label: string
    if (confidence >= 90) {
      bg = '#d1fae5'; color = '#065f46'; label = `Vysoká spoľahlivosť (${confidence}%)`
    } else if (confidence >= 50) {
      bg = '#fef3c7'; color = '#92400e'; label = `Stredná spoľahlivosť (${confidence}%)`
    } else {
      bg = 'var(--pastel-rose-bg)'; color = 'var(--pastel-rose-text)'; label = `Nízka spoľahlivosť (${confidence}%)`
    }
    return (
      <span style={{ background: bg, color, padding: '2px 10px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
        {label}
      </span>
    )
  }

  if (!isOpen) return null

  const backdropStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px',
  }

  const modalStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    borderRadius: 16,
    boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
    width: '100%',
    maxWidth: 520,
    maxHeight: '90vh',
    overflowY: 'auto',
    fontFamily: 'Montserrat, sans-serif',
    position: 'relative',
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px 0',
    marginBottom: 4,
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 18, fontWeight: 700, color: 'var(--dark)',
  }

  const closeBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', fontSize: 22, lineHeight: 1, padding: 4,
    borderRadius: 6,
  }

  const bodyStyle: React.CSSProperties = { padding: '16px 24px 24px' }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'var(--dark)', marginBottom: 4, display: 'block',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1.5px solid var(--g6)', borderRadius: 8,
    padding: '8px 12px', fontSize: 14, color: 'var(--dark)',
    background: 'var(--bg-card)', outline: 'none', boxSizing: 'border-box',
  }

  const goldBtnStyle: React.CSSProperties = {
    background: 'var(--gold)', color: '#fff', border: 'none',
    borderRadius: 10, padding: '11px 28px', fontSize: 14, fontWeight: 700,
    fontFamily: 'inherit', cursor: 'pointer', transition: 'opacity 0.15s',
  }

  const secondaryBtnStyle: React.CSSProperties = {
    background: 'none', color: 'var(--text-secondary)', border: '1.5px solid var(--g6)',
    borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600,
    fontFamily: 'inherit', cursor: 'pointer',
  }

  const dropZoneStyle: React.CSSProperties = {
    border: `2px dashed ${isDragging ? 'var(--gold)' : 'var(--g6)'}`,
    borderRadius: 12,
    padding: '32px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    background: isDragging ? 'rgba(180,140,50,0.05)' : 'transparent',
    transition: 'border-color 0.2s, background 0.2s',
    userSelect: 'none',
  }

  const fieldGrid: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px',
  }

  // --- STEP 1 ---
  const renderStep1 = () => (
    <div>
      <div style={headerStyle}>
        <span style={titleStyle}>Nahrať faktúru</span>
        <button style={closeBtnStyle} onClick={onClose} aria-label="Zavrieť">&#x00D7;</button>
      </div>
      <div style={bodyStyle}>
        <div
          style={dropZoneStyle}
          onClick={handleZoneClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleZoneClick()}
        >
          {selectedFile && fileDataUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              {selectedFile.type.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileDataUrl}
                  alt="nahled"
                  style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }}
                />
              ) : (
                <div style={{ fontSize: 40, lineHeight: 1 }}>&#x1F4C4;</div>
              )}
              <span style={{ fontSize: 13, color: 'var(--dark)', fontWeight: 600 }}>{selectedFile.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {(selectedFile.size / 1024).toFixed(0)} KB
              </span>
              <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>Kliknúť pre zmenu</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 36, color: 'var(--text-muted)', lineHeight: 1 }}>&#x1F4CE;</div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>
                Pretiahnite súbor alebo kliknite
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>JPEG, PNG, PDF — max 10 MB</span>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />

        <div style={{ marginTop: 20 }}>
          <label style={labelStyle}>Typ faktúry</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['technician', 'partner'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setInvoiceType(t)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: `1.5px solid ${invoiceType === t ? 'var(--gold)' : 'var(--g6)'}`,
                  background: invoiceType === t ? 'rgba(180,140,50,0.08)' : 'transparent',
                  color: invoiceType === t ? 'var(--gold)' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                }}
              >
                {t === 'technician' ? 'Technik' : 'Partner'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Zákazka (voliteľné)</label>
          <input
            style={inputStyle}
            placeholder="ID zákazky alebo referenčné číslo…"
            value={jobIdInput}
            onChange={(e) => {
              setJobIdInput(e.target.value)
              const num = parseInt(e.target.value)
              setSelectedJobId(isNaN(num) ? undefined : num)
            }}
          />
        </div>

        {error && (
          <div style={{ marginTop: 12, color: 'var(--danger)', fontSize: 13, fontWeight: 500 }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button style={secondaryBtnStyle} onClick={onClose}>Zrušiť</button>
          <button
            style={{ ...goldBtnStyle, opacity: isLoading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            onClick={handleUpload}
            disabled={isLoading}
          >
            {isLoading ? <Spinner /> : null}
            {isLoading ? 'Spracúva sa…' : 'Nahrať a spracovať'}
          </button>
        </div>
      </div>
    </div>
  )

  // --- STEP 2 ---
  const renderStep2 = () => {
    const ef = editedFields
    const hasSuggestedJobs = extracted?.suggestedJobs && extracted.suggestedJobs.length > 0 && !selectedJobId

    return (
      <div>
        <div style={headerStyle}>
          <span style={titleStyle}>Skontrolovať extrahované dáta</span>
          <button style={closeBtnStyle} onClick={onClose} aria-label="Zavrieť">&#x00D7;</button>
        </div>
        <div style={bodyStyle}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {confidenceBadge(extracted?.confidence)}
          </div>

          <div style={fieldGrid}>
            <FormField label="Číslo faktúry" value={ef.invoiceNumber ?? ''} onChange={(v) => updateField('invoiceNumber', v)} inputStyle={inputStyle} labelStyle={labelStyle} />
            <FormField label="Variabilný symbol" value={ef.variabilniSymbol ?? ''} onChange={(v) => updateField('variabilniSymbol', v)} inputStyle={inputStyle} labelStyle={labelStyle} />
            <FormField label="Dátum vystavenia" value={ef.issueDate ?? ''} onChange={(v) => updateField('issueDate', v)} type="date" inputStyle={inputStyle} labelStyle={labelStyle} />
            <FormField label="DÚZP" value={ef.taxableDate ?? ''} onChange={(v) => updateField('taxableDate', v)} type="date" inputStyle={inputStyle} labelStyle={labelStyle} />
            <FormField label="Splatnosť" value={ef.dueDate ?? ''} onChange={(v) => updateField('dueDate', v)} type="date" inputStyle={inputStyle} labelStyle={labelStyle} />
            <FormField label="Dodávateľ" value={ef.supplierName ?? ''} onChange={(v) => updateField('supplierName', v)} inputStyle={inputStyle} labelStyle={labelStyle} />
            <FormField label="IČO" value={ef.supplierIco ?? ''} onChange={(v) => updateField('supplierIco', v)} inputStyle={inputStyle} labelStyle={labelStyle} />
            <FormField label="DIČ" value={ef.supplierDic ?? ''} onChange={(v) => updateField('supplierDic', v)} inputStyle={inputStyle} labelStyle={labelStyle} />
            <FormField label="IBAN" value={ef.supplierIban ?? ''} onChange={(v) => updateField('supplierIban', v)} inputStyle={inputStyle} labelStyle={labelStyle} />
            <FormField label="Číslo účtu" value={ef.supplierBankAccount ?? ''} onChange={(v) => updateField('supplierBankAccount', v)} inputStyle={inputStyle} labelStyle={labelStyle} />
            <FormField label="Základ (Kč)" value={ef.subtotal !== undefined ? String(ef.subtotal) : ''} onChange={(v) => updateField('subtotal', parseFloat(v) || 0)} type="number" inputStyle={inputStyle} labelStyle={labelStyle} />
            <FormField label="DPH (Kč)" value={ef.vatAmount !== undefined ? String(ef.vatAmount) : ''} onChange={(v) => updateField('vatAmount', parseFloat(v) || 0)} type="number" inputStyle={inputStyle} labelStyle={labelStyle} />
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ ...labelStyle, fontWeight: 700 }}>Celkom (Kč)</label>
              <input
                style={{ ...inputStyle, fontWeight: 700, fontSize: 16, border: '1.5px solid var(--gold)' }}
                type="number"
                value={ef.grandTotal !== undefined ? String(ef.grandTotal) : ''}
                onChange={(ev) => updateField('grandTotal', parseFloat(ev.target.value) || 0)}
              />
            </div>
            <FormField label="Sadzba DPH %" value={ef.vatRate !== undefined ? String(ef.vatRate) : ''} onChange={(v) => updateField('vatRate', parseFloat(v) || 0)} type="number" inputStyle={inputStyle} labelStyle={labelStyle} />
          </div>

          {hasSuggestedJobs && (
            <div style={{ marginTop: 20 }}>
              <div style={{ ...labelStyle, marginBottom: 8, fontSize: 13 }}>Navrhované zákazky</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {extracted!.suggestedJobs!.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      border: `1.5px solid ${selectedJobId === job.id ? 'var(--gold)' : 'var(--g6)'}`,
                      background: selectedJobId === job.id ? 'rgba(180,140,50,0.07)' : 'transparent',
                      textAlign: 'left', width: '100%', fontFamily: 'Montserrat, sans-serif',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>
                      {job.reference_number}
                    </span>
                    {job.customer_name && (
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{job.customer_name}</span>
                    )}
                    {selectedJobId === job.id && (
                      <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>&#x2713; Vybraná</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 12, color: 'var(--danger)', fontSize: 13, fontWeight: 500 }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <button style={secondaryBtnStyle} onClick={() => { setStep(1); setError(null) }}>
              Späť
            </button>
            <button
              style={{ ...goldBtnStyle, opacity: isLoading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? <Spinner /> : null}
              {isLoading ? 'Ukladá sa…' : 'Uložiť'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- STEP 3 ---
  const renderStep3 = () => (
    <div>
      <div style={headerStyle}>
        <span style={titleStyle}>Hotovo</span>
        <button style={closeBtnStyle} onClick={onClose} aria-label="Zavrieť">&#x00D7;</button>
      </div>
      <div style={{ ...bodyStyle, textAlign: 'center', paddingTop: 32, paddingBottom: 36 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: '#d1fae5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 28,
        }}>
          &#x2713;
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>
          Faktúra úspešne spracovaná
        </div>
        {savedData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16, marginBottom: 28, alignItems: 'center' }}>
            {savedData.jobId && (
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Zákazka:{' '}
                <strong style={{ color: 'var(--dark)' }}>#{savedData.jobId}</strong>
              </span>
            )}
            {savedData.invoiceNumber && (
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Č. faktúry:{' '}
                <strong style={{ color: 'var(--dark)' }}>{savedData.invoiceNumber}</strong>
              </span>
            )}
            {savedData.amount !== undefined && (
              <span style={{ fontSize: 16, color: 'var(--dark)', fontWeight: 700, marginTop: 4 }}>
                {savedData.amount.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
              </span>
            )}
          </div>
        )}
        <button style={{ ...goldBtnStyle, paddingLeft: 40, paddingRight: 40 }} onClick={onClose}>
          Zavrieť
        </button>
      </div>
    </div>
  )

  return (
    <div
      style={backdropStyle}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div ref={modalRef} style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FormFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  inputStyle: React.CSSProperties
  labelStyle: React.CSSProperties
}

function FormField({ label, value, onChange, type = 'text', inputStyle, labelStyle }: FormFieldProps) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        style={inputStyle}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes _ivSpinnerAnim { to { transform: rotate(360deg); } }`}</style>
      <span
        style={{
          display: 'inline-block',
          width: 15,
          height: 15,
          border: '2px solid rgba(255,255,255,0.35)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          animation: '_ivSpinnerAnim 0.7s linear infinite',
          flexShrink: 0,
        }}
      />
    </>
  )
}
