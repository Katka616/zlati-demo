'use client'

import { useState, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import ContactQuickActions from '@/components/admin/ContactQuickActions'
import SLADeadline from '@/components/admin/SLADeadline'
import DocumentsPhotosPanel from '@/components/admin/DocumentsPhotosPanel'
import RepairVerificationWidget from '@/components/admin/RepairVerificationWidget'
import PdfPreviewModal from '@/components/admin/PdfPreviewModal'
import InvoiceUploadModal from '@/components/admin/InvoiceUploadModal'
import InfoTooltip from '@/components/ui/InfoTooltip'
import DhaSyncSection from './DhaSyncSection'
import { JOB_DETAIL_TOOLTIPS } from '@/lib/tooltipContent'
import type { Job, Pricing } from '@/data/mockData'
import type { TechPhoto } from './HandymanAppSection'

// ── Local type aliases matching the component-local types in sidebar deps ─────
type QuickAction = { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean; title?: string }
type Metric = { value: string; label: string; color?: string }

interface RightSidebarProps {
  job: Job
  currentStep: number
  livePricing: Pricing | null
  currency: string
  jobId: number
  quickActions: QuickAction[]
  metrics: Metric[]
  techPhotos: TechPhoto[]
  techPhotosLoaded: boolean
  editingProtocolIdx: number | null
  startEditProtocol: (idx: number) => void
  setJob: (updater: (prev: Job | null) => Job | null) => void
  onRefresh?: () => void
  onError?: (msg: string) => void
}

export default function RightSidebar({
  job,
  currentStep,
  livePricing,
  currency,
  jobId,
  quickActions,
  metrics,
  techPhotos,
  techPhotosLoaded,
  editingProtocolIdx,
  startEditProtocol,
  setJob,
  onRefresh,
  onError,
}: RightSidebarProps) {
  const displayJob = job

  const [previewPdf, setPreviewPdf] = useState<{ base64: string; filename: string } | null>(null)
  const [previewLoadingIdx, setPreviewLoadingIdx] = useState<number | null>(null)

  // Invoice upload modal state
  const [invoiceUploadOpen, setInvoiceUploadOpen] = useState(false)
  // Invoice action loading states
  const [invoiceDownloadLoading, setInvoiceDownloadLoading] = useState(false)
  const [invoiceResetLoading, setInvoiceResetLoading] = useState(false)

  const handleInvoiceReset = useCallback(async () => {
    if (!window.confirm('Odstrániť faktúru technika? Technik bude môcť nahrať novú.')) return
    setInvoiceResetLoading(true)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/invoice-reset`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        onRefresh?.()
      } else {
        const err = await res.json().catch(() => ({}))
        onError?.(err.error || 'Nepodarilo sa odstrániť faktúru.')
      }
    } catch {
      onError?.('Nepodarilo sa odstrániť faktúru.')
    } finally {
      setInvoiceResetLoading(false)
    }
  }, [jobId, onRefresh, onError])
  // Invoice field saved feedback state
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({})

  // Mini timeline state
  type TimelineEntry = {
    id: string
    type: string
    created_at: string
    // message
    message?: string
    from_role?: string
    // note
    content?: string
    author_name?: string
    // audit
    action?: string
    changed_by_name?: string
    // reminder
    reminder_title?: string
    // call
    call_summary?: string
    call_created_by_name?: string
    call_direction?: string
  }
  const [timelineEvents, setTimelineEvents] = useState<TimelineEntry[]>([])
  const [showAllTimeline, setShowAllTimeline] = useState(false)

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/timeline?limit=10`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((d: unknown) => {
        if (Array.isArray(d)) setTimelineEvents(d as TimelineEntry[])
      })
      .catch(err => console.warn('[RightSidebar] Timeline load failed:', err))
  }, [jobId])

  // SLA static badge calculation (for steps 10-15)
  const slaBadge = useMemo(() => {
    if (currentStep < 10 || currentStep >= 16) return null
    const createdMs = new Date(displayJob.created_at).getTime()
    const now = Date.now()
    // Measure total job age from creation — simple and reliable
    const hoursElapsed = Math.round((now - createdMs) / 3600000)
    const met = hoursElapsed <= 24
    return { met, hours: hoursElapsed }
  }, [currentStep, displayJob.created_at])

  // Download original uploaded invoice file (PDF/image) via photo_id stored in invoice_data
  const handleDownloadUploadedInvoice = useCallback(async (photoId: number, invoiceNumber: string) => {
    setInvoiceDownloadLoading(true)
    try {
      const res = await fetch(`/api/admin/invoices/${photoId}/download`, { credentials: 'include' })
      if (!res.ok) { onError?.('Nepodarilo sa stiahnuť faktúru.'); return }
      const blob = await res.blob()
      const contentDisposition = res.headers.get('Content-Disposition') || ''
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/)
      const serverFilename = filenameMatch?.[1]
      const ext = blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : 'jpg'
      const fallbackName = invoiceNumber && invoiceNumber !== '—' ? `faktura-${invoiceNumber}.${ext}` : `faktura-${jobId}.${ext}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = serverFilename || fallbackName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      onError?.('Nepodarilo sa stiahnuť faktúru.')
    } finally {
      setInvoiceDownloadLoading(false)
    }
  }, [jobId])

  const handleDownloadProtocol = useCallback((visitNumber: number | undefined, referenceNumber: string | undefined) => {
    const visitParam = visitNumber != null ? `?visit=${visitNumber}` : ''
    const visitLabel = visitNumber != null ? `-v${visitNumber}` : ''
    const filename = `protokol-${referenceNumber || jobId}${visitLabel}.pdf`
    const url = `/api/admin/jobs/${jobId}/protocol-pdf${visitParam}`
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [jobId])

  const handlePreviewProtocol = useCallback(async (idx: number, visitNumber: number | undefined, referenceNumber: string | undefined) => {
    setPreviewLoadingIdx(idx)
    try {
      const visitParam = visitNumber != null ? `?visit=${visitNumber}` : ''
      const visitLabel = visitNumber != null ? `-v${visitNumber}` : ''
      const filename = `protokol-${referenceNumber || jobId}${visitLabel}.pdf`
      const res = await fetch(`/api/admin/jobs/${jobId}/protocol-pdf${visitParam}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Chyba pri načítaní PDF')
      const blob = await res.blob()
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const dataUrl = reader.result as string
          resolve(dataUrl.split(',')[1] || '')
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      setPreviewPdf({ base64, filename })
    } catch {
      onError?.('Nepodarilo sa načítať protokol PDF.')
    } finally {
      setPreviewLoadingIdx(null)
    }
  }, [jobId])

  return (
    <>
      {/* Diagnostic-Only Alert Banner */}
      {!!displayJob.custom_fields?.diagnostic_only && (
        <div style={{
          background: '#FFF3E0',
          border: '1px solid #FF9800',
          borderLeft: '4px solid #F57C00',
          borderRadius: 8,
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#E65100', fontSize: '15px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span> Ukončené diagnostikou
          </div>
          <div style={{ color: '#5D4037', fontSize: '14px', lineHeight: 1.5 }}>
            Technik nevykonal opravu. Dôvod: <br /><strong>
              {displayJob.custom_fields.diagnostic_end_reason === 'uneconomical' ? 'Nerentabilná oprava' :
                displayJob.custom_fields.diagnostic_end_reason === 'unrepairable' ? 'Neopraviteľné zariadenie' :
                  displayJob.custom_fields.diagnostic_end_reason === 'specialist_needed' ? 'Potrebný špeciálny technik' :
                    String(displayJob.custom_fields.diagnostic_end_reason ?? '')}
            </strong>
          </div>
          {!!displayJob.custom_fields.diagnostic_end_description && (
            <div style={{ color: '#5D4037', fontSize: '13px', background: 'rgba(255,255,255,0.6)', padding: '8px', borderRadius: '4px', marginTop: '4px' }}>
              <em>&quot;{String(displayJob.custom_fields.diagnostic_end_description)}&quot;</em>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div data-walkthrough="quick-actions">
        <ContactQuickActions
          actions={quickActions}
        />
      </div>

      {/* Marža — zjednodušený widget */}
      {(() => {
        const prM = livePricing ?? displayJob?.pricing
        if (!prM?.margin || prM.margin <= 0) return null
        const marginVal = Math.round(prM.margin)
        const marginPct = prM.marginPct ?? 0
        const cur = prM.currency || 'Kč'
        return (
          <div style={{ background: 'var(--w, #FFF)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g4, #4B5563)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>💰 Marža</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: marginPct >= 35 ? '#16A34A' : marginPct >= 15 ? '#D97706' : '#DC2626' }}>
              {marginVal.toLocaleString('cs-CZ')} {cur}
            </div>
            <div style={{ fontSize: 12, color: 'var(--g4, #4B5563)', marginTop: 2 }}>
              {marginPct}% {marginPct >= 35 ? '— Výborná' : marginPct >= 15 ? '— Dobrá' : '— Nízka'}
            </div>
          </div>
        )
      })()}

      {/* Mini Timeline */}
      {timelineEvents.length > 0 && (
        <div style={{
          background: 'var(--w, #FFF)', borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '14px 16px', marginBottom: 12,
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: 'var(--g4, #4B5563)',
            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            📋 Posledná aktivita
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {timelineEvents.slice(0, showAllTimeline ? undefined : 5).map((evt, i) => {
              const typeIcon =
                evt.type === 'audit' ? '🔄'
                : evt.type === 'message' ? '💬'
                : evt.type === 'note' ? '📝'
                : evt.type === 'reminder' ? '🔔'
                : evt.type === 'call' ? '📞'
                : '●'

              // Audit action → slovenský preklad
              const AUDIT_LABELS: Record<string, string> = {
                status_change: 'Zmena statusu',
                assign_technician: 'Priradenie technika',
                unassign_technician: 'Odobratie technika',
                reassign_technician: 'Zmena technika',
                approve_estimate: 'Schválenie odhadu',
                reject_estimate: 'Zamietnutie odhadu',
                dispatch_approve_settlement: 'Schválenie vyúčtovania',
                dispatch_approve_estimate: 'Schválenie odhadu (dispatch)',
                submit_estimate: 'Odoslanie odhadu',
                submit_protocol: 'Odoslanie protokolu',
                approve_protocol: 'Schválenie protokolu',
                send_surcharge: 'Odoslanie doplatku klientovi',
                portal_approve_surcharge: 'Klient schválil doplatok',
                portal_decline_surcharge: 'Klient odmietol doplatok',
                portal_sign_protocol: 'Klient podpísal protokol',
                portal_rate: 'Klient ohodnotil službu',
                cancel_job: 'Zrušenie zákazky',
                cancel_issue_resolved: 'Klient zrušil — problém vyriešený',
                settlement_surcharge_flagged: 'Doplatok sa zmenil po vyúčtovaní',
                settlement_correction: 'Korekcia vyúčtovania',
                price_review_approved: 'Cenová kontrola schválená',
                ea_submit: 'EA odhláška odoslaná',
                ea_approved: 'EA odhláška schválená',
                invoice_created: 'Faktúra vytvorená',
                invoice_sent: 'Faktúra odoslaná',
                payment_received: 'Platba prijatá',
                job_closed: 'Zákazka uzavretá',
                schedule_change: 'Zmena termínu',
                priority_change: 'Zmena priority',
                operator_assigned: 'Priradenie operátora',
                create: 'Zákazka vytvorená',
                update: 'Úprava zákazky',
                note_added: 'Pridaná poznámka',
                photo_uploaded: 'Nahrané fotky',
                repair_verify: 'AI overenie opravy',
                estimate_auto_approved: 'Automatické schválenie odhadu',
                final_price_auto_approved: 'Automatické schválenie finálnej ceny',
                final_price_surcharge_auto_sent: 'Doplatok auto-odoslaný klientovi (finálna cena)',
                settlement_surcharge_auto_sent: 'Doplatok auto-odoslaný klientovi (zúčtovanie)',
                margin_absorbed: 'Cena schválená (marža absorbovaná ZR)',
              }

              let text = ''
              if (evt.type === 'message') {
                const roleLabel = evt.from_role === 'operator' ? 'Operátor' : evt.from_role === 'tech' ? 'Technik' : evt.from_role === 'client' ? 'Klient' : evt.from_role === 'system' ? 'Systém' : (evt.from_role ?? '')
                const msg = evt.message ?? ''
                // Skrátiť systémové správy — zobraz len prvých 60 znakov
                text = `${roleLabel}: ${msg.length > 60 ? msg.slice(0, 60) + '…' : msg}`
              } else if (evt.type === 'note') {
                text = evt.content ?? ''
              } else if (evt.type === 'audit') {
                const action = evt.action ?? ''
                text = AUDIT_LABELS[action] ?? action.replace(/_/g, ' ')
              } else if (evt.type === 'reminder') {
                text = evt.reminder_title ?? ''
              } else if (evt.type === 'call') {
                const dir = evt.call_direction === 'inbound' ? '↙' : evt.call_direction === 'outbound' ? '↗' : ''
                text = `${dir} ${evt.call_summary ?? 'Hovor'}`.trim()
              }

              const author = evt.author_name ?? evt.changed_by_name ?? evt.call_created_by_name ?? undefined
              const visibleCount = showAllTimeline ? timelineEvents.length : Math.min(5, timelineEvents.length)

              return (
                <div key={evt.id} style={{
                  display: 'flex', gap: 8, fontSize: 12,
                  paddingBottom: 6,
                  borderBottom: i < visibleCount - 1 ? '1px solid var(--g2, #F0F0F0)' : 'none',
                }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{typeIcon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--dark, #1a1a1a)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {text}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--g4, #4B5563)', marginTop: 1 }}>
                      {new Date(evt.created_at).toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      {author ? ` · ${author}` : ''}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {timelineEvents.length > 5 && (
            <button
              onClick={() => setShowAllTimeline(s => !s)}
              style={{
                marginTop: 8, fontSize: 11, fontWeight: 600, color: '#0369A1',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              {showAllTimeline ? 'Zobraziť menej' : `Zobraziť všetko (${timelineEvents.length})`}
            </button>
          )}
        </div>
      )}

      {/* Client Feedback Rating */}
      {typeof displayJob.custom_fields?.rating === 'number' && (
        <div style={{
          background: 'var(--w, #FFF)',
          border: '1px solid #FBC02D',
          borderRadius: 8,
          padding: '16px',
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(251, 192, 45, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#F57F17', textTransform: 'uppercase' }}>Hodnotenie klienta <InfoTooltip text={JOB_DETAIL_TOOLTIPS.clientRating} /></span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#E65100' }}>{Number(displayJob.custom_fields.rating)}/5 ⭐</span>
          </div>
          {typeof displayJob.custom_fields?.rating_comment === 'string' && displayJob.custom_fields.rating_comment && (
            <div style={{ fontSize: 13, color: '#555', fontStyle: 'italic', background: '#FFFDE7', padding: '8px 12px', borderRadius: 6, borderLeft: '3px solid #FBC02D' }}>
              &quot;{String(displayJob.custom_fields.rating_comment)}&quot;
            </div>
          )}
        </div>
      )}

      {/* SLA — removed from here, replaced by SLA Ring widget in page.tsx */}

      {/* Invoice Tracking Section */}
      {(currentStep >= 13) && (() => {
        const cf = (displayJob.custom_fields || {}) as Record<string, unknown>
        const invData = (cf.invoice_data as Record<string, unknown>) || {}

        type InvField = { label: string; type: 'text' | 'date'; invoiceDataKey: string; fallbackKey: string }
        const invoiceFields: InvField[] = [
          { label: 'Číslo faktúry', type: 'text', invoiceDataKey: 'invoiceNumber', fallbackKey: 'invoice_number' },
          { label: 'Dátum vystavenia', type: 'date', invoiceDataKey: 'issueDate', fallbackKey: 'invoice_date' },
          { label: 'Dátum splatnosti', type: 'date', invoiceDataKey: 'dueDate', fallbackKey: 'invoice_due_date' },
          { label: 'Dátum úhrady', type: 'date', invoiceDataKey: 'paymentDate', fallbackKey: 'payment_date' },
        ]

        const getFieldValue = (f: InvField): string => {
          const fromInvData = invData[f.invoiceDataKey]
          if (fromInvData !== undefined && fromInvData !== null && fromInvData !== '') return String(fromInvData)
          const fallback = cf[f.fallbackKey]
          if (fallback !== undefined && fallback !== null && fallback !== '') return String(fallback)
          return ''
        }

        return (
          <div style={{
            background: 'var(--w, #FFF)', border: '1px solid var(--g7, #E0E0E0)', borderRadius: 12,
            padding: 16, marginTop: 12,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark, #1a1a1a)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              Fakturácia <InfoTooltip text={JOB_DETAIL_TOOLTIPS.fakturaciaSection} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {invoiceFields.map(f => (
                <div key={f.invoiceDataKey}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#4B5563', marginBottom: 4, textTransform: 'uppercase' }}>
                    {f.label}
                  </div>
                  <input
                    type={f.type}
                    value={getFieldValue(f)}
                    placeholder={f.type === 'date' ? '' : '—'}
                    onChange={e => {
                      setJob(prev => {
                        if (!prev) return prev
                        const prevCf = (prev.custom_fields as Record<string, unknown>) || {}
                        const prevInvData = (prevCf.invoice_data as Record<string, unknown>) || {}
                        return {
                          ...prev,
                          custom_fields: {
                            ...prevCf,
                            invoice_data: { ...prevInvData, [f.invoiceDataKey]: e.target.value },
                          },
                        }
                      })
                    }}
                    onBlur={async (e) => {
                      const prevCf = (displayJob.custom_fields as Record<string, unknown>) || {}
                      const prevInvData = (prevCf.invoice_data as Record<string, unknown>) || {}
                      const updatedCf = {
                        ...prevCf,
                        invoice_data: { ...prevInvData, [f.invoiceDataKey]: e.target.value },
                      }
                      const res = await fetch(`/api/admin/jobs/${displayJob.id}`, {
                        method: 'PUT',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ custom_fields: updatedCf }),
                      })
                      if (res.ok) {
                        setSavedFields(prev => ({ ...prev, [f.invoiceDataKey]: true }))
                        setTimeout(() => setSavedFields(prev => ({ ...prev, [f.invoiceDataKey]: false })), 2000)
                      }
                    }}
                    style={{
                      width: '100%', padding: '6px 10px', borderRadius: 6,
                      border: '1px solid var(--g7, #D0D0D0)', fontSize: 13, fontWeight: 600,
                      color: 'var(--dark, #1a1a1a)', background: 'var(--g1, #FAFAFA)',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  {savedFields[f.invoiceDataKey] && (
                    <span style={{ fontSize: 10, color: '#059669', fontWeight: 600, marginTop: 2, display: 'block' }}>
                      ✓ Uložené
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Documents & Photos Panel */}
      <div data-walkthrough="photos-sidebar">
        <DocumentsPhotosPanel
          jobId={jobId}
          techPhotos={techPhotos}
          techPhotosLoaded={techPhotosLoaded}
          onPhotosUploaded={onRefresh}
        />
      </div>

      {/* Repair Verification Widget — pod technikove fotky */}
      {currentStep >= 10 && (
        <RepairVerificationWidget
          repairVerification={displayJob.custom_fields?.repair_verification as never}
          jobId={displayJob.id}
          onRefresh={onRefresh}
        />
      )}

      {/* Protokoly */}
      <div style={{ background: 'var(--w, #FFF)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g4, #4B5563)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          📝 Protokoly <InfoTooltip text={JOB_DETAIL_TOOLTIPS.protokoly} />
        </div>
        {(() => {
          const cf = (displayJob.custom_fields || {}) as Record<string, unknown>
          const protocolHistory = cf.protocol_history as Array<Record<string, unknown>> | undefined
          if (protocolHistory && protocolHistory.length > 0) {
            return protocolHistory.map((proto, i) => {
              const visitNumber = proto.visitNumber != null ? Number(proto.visitNumber) : undefined
              const refNumber = displayJob.reference_number
              return (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < protocolHistory.length - 1 ? '1px solid var(--g2, #F0F0F0)' : 'none', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>📝</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--dark, #1a1a1a)' }}>
                        {(() => {
                          const typeKey = String(proto.protocolType || proto.protocol_type || proto.type || 'standard_work')
                          const typeLabels: Record<string, string> = {
                            standard_work: 'Štandardná oprava',
                            surcharge: 'Dohoda o doplatku',
                            diagnostic_only: 'Len diagnostika',
                            special_diagnostic: 'Špeciálna diagnostika',
                            multi_visit: 'Viacnásobná návšteva',
                            completed_surcharge: 'Dokončené s doplatkom',
                          }
                          return typeLabels[typeKey] || typeKey
                        })()}
                        {visitNumber != null ? ` (návšteva ${visitNumber})` : ''}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--g4, #4B5563)' }}>
                        {(proto.createdAt || proto.submittedAt || proto.submitted_at) ? new Date(String(proto.createdAt || proto.submittedAt || proto.submitted_at)).toLocaleDateString('sk-SK') : ''}
                      </div>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: '#E8F5E9', color: 'var(--green, #2E7D32)', flexShrink: 0 }}>
                      Odoslaný
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, paddingLeft: 22 }}>
                    <button
                      onClick={() => handleDownloadProtocol(visitNumber, refNumber)}
                      title="Stiahnuť protokol PDF"
                      style={{
                        fontSize: 11,
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: '1px solid #ddd',
                        background: '#fff',
                        color: 'var(--dark, #1a1a1a)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontWeight: 500,
                      }}
                    >
                      ⬇ Stiahnuť
                    </button>
                    <button
                      onClick={() => handlePreviewProtocol(i, visitNumber, refNumber)}
                      disabled={previewLoadingIdx === i}
                      title="Zobraziť náhľad protokolu"
                      style={{
                        fontSize: 11,
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: '1px solid #ddd',
                        background: '#fff',
                        color: 'var(--dark, #1a1a1a)',
                        cursor: previewLoadingIdx === i ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontWeight: 500,
                        opacity: previewLoadingIdx === i ? 0.6 : 1,
                      }}
                    >
                      {previewLoadingIdx === i ? '⏳ Načítavam...' : '👁 Náhľad'}
                    </button>
                  </div>
                </div>
              )
            })
          }
          return (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📋</div>
              <div style={{ color: 'var(--text-muted, #6B7280)', fontSize: 12, marginBottom: 12 }}>
                Protokol ešte neodoslaný
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleDownloadProtocol(undefined, displayJob.reference_number)}
                  title="Stiahnuť protokol PDF"
                  style={{
                    fontSize: 11, padding: '5px 10px', borderRadius: 6,
                    border: '1px solid var(--border, #E8E2D6)', background: 'var(--w, #fff)',
                    color: 'var(--dark, #1a1a1a)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500,
                  }}
                >
                  ⬇ Stiahnuť PDF
                </button>
                <button
                  onClick={() => handlePreviewProtocol(0, undefined, displayJob.reference_number)}
                  disabled={previewLoadingIdx === 0}
                  title="Zobraziť náhľad protokolu"
                  style={{
                    fontSize: 11, padding: '5px 10px', borderRadius: 6,
                    border: '1px solid var(--border, #E8E2D6)', background: 'var(--w, #fff)',
                    color: 'var(--dark, #1a1a1a)', cursor: previewLoadingIdx === 0 ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500,
                    opacity: previewLoadingIdx === 0 ? 0.6 : 1,
                  }}
                >
                  {previewLoadingIdx === 0 ? '⏳ ...' : '👁 Náhľad'}
                </button>
                <button
                  onClick={() => {
                    const token = (displayJob as unknown as Record<string, unknown>).portal_token as string | undefined
                    if (token) {
                      window.open(`/protocol/${token}`, '_blank')
                    } else {
                      onError?.('Protokol link nie je dostupný — zákazka nemá portal token.')
                    }
                  }}
                  style={{
                    fontSize: 11, padding: '5px 10px', borderRadius: 6,
                    border: '1px solid var(--gold, #BF953F)', background: 'var(--gold-bg, #FBF6EB)',
                    color: 'var(--gold-dark, #AA771C)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600,
                  }}
                >
                  📤 Nahrať protokol
                </button>
              </div>
            </div>
          )
        })()}
      </div>

      {/* PDF Preview Modal */}
      {previewPdf && (
        <PdfPreviewModal
          pdfBase64={previewPdf.base64}
          filename={previewPdf.filename}
          onClose={() => setPreviewPdf(null)}
        />
      )}

      {/* Faktúry technika */}
      <div style={{ background: 'var(--w, #FFF)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g4, #4B5563)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            🧾 Faktúry technika <InfoTooltip text={JOB_DETAIL_TOOLTIPS.fakturyTechnika} />
          </span>
          <button
            onClick={() => setInvoiceUploadOpen(true)}
            title="Nahrať faktúru technika"
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid var(--gold, #D4A843)',
              background: 'var(--gold, #D4A843)',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            📤 Nahrať
          </button>
        </div>
        {(() => {
          const cf = (displayJob.custom_fields || {}) as Record<string, unknown>
          const invData = cf.invoice_data as Record<string, unknown> | undefined
          const invNumber = invData?.invoiceNumber ?? cf.invoice_number
          const hasInvoice = !!(invNumber || invData?.uploadedFileId || invData?.method)
          if (hasInvoice) {
            const invDate = invData?.issueDate ?? cf.invoice_date
            const settlementData = cf.settlement_data as Record<string, unknown> | undefined
            const amount = settlementData?.paymentFromZR ?? invData?.grandTotal ?? invData?.amount
            const isPaid = !!(cf.payment_date || invData?.paymentDate || (displayJob as unknown as Record<string, unknown>).payment_status === 'paid' || invData?.invoice_status === 'paid')
            const invNumberStr = invNumber ? String(invNumber) : '—'
            // photo_id is stored by the upload route into invoice_data.photo_id or uploadedFileId
            const photoId = invData?.photo_id != null ? Number(invData.photo_id)
              : invData?.uploadedFileId != null ? Number(invData.uploadedFileId)
              : null
            const isSelfIssued = invData?.method === 'self_issued' || invData?.method === 'sk_upload'
            const invoiceStatus = invData?.invoice_status as string | undefined
            const mismatchReason = invData?.mismatch_reason as string | undefined
            const mismatchDetails = invData?.mismatch_details as string | undefined

            const smBtnStyle: React.CSSProperties = {
              fontSize: 11,
              fontWeight: 500,
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid #ddd',
              background: '#fff',
              color: 'var(--dark, #1a1a1a)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              whiteSpace: 'nowrap' as const,
            }

            return (
              <div style={{ fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                  <span style={{ fontSize: 14 }}>🧾</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--dark, #1a1a1a)' }}>{invNumberStr}</div>
                    <div style={{ fontSize: 11, color: 'var(--g4, #4B5563)' }}>
                      {invDate ? new Date(String(invDate)).toLocaleDateString('sk-SK') : ''}
                      {amount ? ` · ${Number(amount).toLocaleString('cs-CZ')} Kč` : ''}
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                    background: isPaid ? '#E8F5E9' : '#FFF3E0',
                    color: isPaid ? 'var(--green, #2E7D32)' : '#E65100',
                    flexShrink: 0,
                  }}>
                    {isPaid ? 'Uhradená' : 'Vystavená'}
                  </span>
                  {invoiceStatus === 'review_needed' && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                      background: '#FFF3E0', color: '#E65100', flexShrink: 0,
                    }}>
                      ⚠ Na preskúmanie
                    </span>
                  )}
                  {invoiceStatus === 'validated' && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                      background: '#E8F5E9', color: '#2E7D32', flexShrink: 0,
                    }}>
                      ✓ Overená
                    </span>
                  )}
                </div>
                {/* Mismatch warning */}
                {invoiceStatus === 'review_needed' && (mismatchReason || mismatchDetails) && (
                  <div style={{
                    marginTop: 6, padding: '6px 8px', borderRadius: 6,
                    background: '#FFF8E1', border: '1px solid #FFE082',
                    fontSize: 11, color: '#5D4037',
                  }}>
                    {mismatchDetails && (
                      <div style={{ fontWeight: 600, marginBottom: mismatchReason ? 3 : 0 }}>{mismatchDetails}</div>
                    )}
                    {mismatchReason && (
                      <div><span style={{ fontWeight: 600 }}>Dôvod technika: </span>{mismatchReason}</div>
                    )}
                  </div>
                )}
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6, marginTop: 6, paddingLeft: 22, flexWrap: 'wrap' }}>
                  {isSelfIssued && photoId != null ? (
                    <>
                      <button
                        style={{ ...smBtnStyle, opacity: invoiceDownloadLoading ? 0.6 : 1 }}
                        title="Stiahnuť nahratú faktúru (originál)"
                        disabled={invoiceDownloadLoading}
                        onClick={() => handleDownloadUploadedInvoice(photoId, invNumberStr)}
                      >
                        {invoiceDownloadLoading ? '⏳' : '⬇'} Stiahnuť
                      </button>
                      <button
                        style={smBtnStyle}
                        title="Zobraziť nahratú faktúru"
                        onClick={() => window.open(`/api/admin/invoices/${photoId}/download?preview=1`, '_blank', 'noopener,noreferrer')}
                      >
                        👁 Náhľad
                      </button>
                    </>
                  ) : !isSelfIssued ? (
                    <>
                      <button
                        style={smBtnStyle}
                        title="Tlačiť / uložiť ako PDF"
                        onClick={() => window.open(`/api/admin/invoices/${jobId}/pdf`, '_blank', 'noopener,noreferrer')}
                      >
                        🖨 Tlačiť
                      </button>
                      <button
                        style={smBtnStyle}
                        title="Zobraziť náhľad faktúry"
                        onClick={() => window.open(`/api/admin/invoices/${jobId}/preview`, '_blank', 'noopener,noreferrer')}
                      >
                        👁 Náhľad
                      </button>
                    </>
                  ) : null}
                  <button
                    style={{ ...smBtnStyle, color: 'var(--danger, #dc2626)', opacity: invoiceResetLoading ? 0.6 : 1 }}
                    title="Odstrániť faktúru technika"
                    disabled={invoiceResetLoading}
                    onClick={handleInvoiceReset}
                  >
                    🗑 Odstrániť
                  </button>
                </div>
              </div>
            )
          }
          return (
            <div style={{ color: '#9E9E9E', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
              Zatiaľ bez faktúry
            </div>
          )
        })()}
      </div>

      {/* DHA Sync — only for EA jobs with ea_order_id */}
      <DhaSyncSection
        jobId={jobId}
        customFields={(displayJob as unknown as Record<string, unknown>).custom_fields as Record<string, unknown> ?? {}}
      />

      {/* Invoice Upload Modal */}
      <InvoiceUploadModal
        isOpen={invoiceUploadOpen}
        onClose={() => setInvoiceUploadOpen(false)}
        preselectedJobId={jobId}
        type="technician"
        onSuccess={() => {
          setInvoiceUploadOpen(false)
          onRefresh?.()
        }}
      />
    </>
  )
}
