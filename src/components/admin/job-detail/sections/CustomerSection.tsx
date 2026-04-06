'use client'

import { useState, useEffect } from 'react'
import CustomerEmotionCard from '@/components/admin/CustomerEmotionCard'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { JOB_DETAIL_TOOLTIPS } from '@/lib/tooltipContent'
import { useCallPhone } from '@/hooks/useCallPhone'
import type { Job } from '@/data/mockData'

interface CustomerSectionProps {
  job: Job
  sectionState: Record<string, boolean>
  isEditingCustomer: boolean
  setIsEditingCustomer: (v: boolean) => void
  customerEdit: {
    customer_name: string
    customer_phone: string
    customer_email: string
    customer_address: string
    customer_city: string
    customer_psc: string
    customer_country: string
  } | null
  setCustomerEdit: (v: CustomerSectionProps['customerEdit']) => void
  handleSaveCustomer: () => void
  isSaving: boolean
  onEmailClick?: (email: string) => void
}

export default function CustomerSection({
  job,
  isEditingCustomer,
  setIsEditingCustomer,
  customerEdit,
  setCustomerEdit,
  handleSaveCustomer,
  isSaving,
  onEmailClick,
}: CustomerSectionProps) {
  const callPhone = useCallPhone()
  const [relatedJobs, setRelatedJobs] = useState<any[]>([])
  const [showRelated, setShowRelated] = useState(false)

  useEffect(() => {
    if (!job.customer_phone) return
    fetch(`/api/admin/jobs/related?customerPhone=${encodeURIComponent(job.customer_phone)}&excludeJobId=${job.id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setRelatedJobs(d.jobs || []))
      .catch(err => console.warn('[CustomerSection] Related jobs load failed:', err))
  }, [job.customer_phone, job.id])

  return (
    <div style={{ background: 'var(--w, #FFF)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '14px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g4, #4B5563)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        👤 Zákazník
        {!isEditingCustomer && (
          <button
            type="button"
            onClick={() => {
              setCustomerEdit({
                customer_name: job.customer_name || '',
                customer_phone: job.customer_phone || '',
                customer_email: job.customer_email || '',
                customer_address: job.customer_address || '',
                customer_city: job.customer_city || '',
                customer_psc: job.customer_psc || '',
                customer_country: (job as any).customer_country || 'CZ',
              })
              setIsEditingCustomer(true)
            }}
            style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--gold, #C5961A)', cursor: 'pointer', fontWeight: 600, textTransform: 'none', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit' }}
          >
            ✏️ Upraviť
          </button>
        )}
      </div>

      {isEditingCustomer && customerEdit ? (
        <>
          <div className="crm-field-grid">
            <div className="crm-field">
              <span className="crm-field-label">Meno <InfoTooltip text={JOB_DETAIL_TOOLTIPS.customerName} /></span>
              <input className="crm-field-value" value={customerEdit.customer_name} onChange={e => setCustomerEdit({ ...customerEdit, customer_name: e.target.value })} />
            </div>
            <div className="crm-field">
              <span className="crm-field-label">Telefón <InfoTooltip text={JOB_DETAIL_TOOLTIPS.customerPhone} /></span>
              <input className="crm-field-value" value={customerEdit.customer_phone} onChange={e => setCustomerEdit({ ...customerEdit, customer_phone: e.target.value })} />
            </div>
            <div className="crm-field">
              <span className="crm-field-label">Email <InfoTooltip text={JOB_DETAIL_TOOLTIPS.customerEmail} /></span>
              <input className="crm-field-value" type="email" value={customerEdit.customer_email} onChange={e => setCustomerEdit({ ...customerEdit, customer_email: e.target.value })} />
            </div>
            <div className="crm-field">
              <span className="crm-field-label">Adresa <InfoTooltip text={JOB_DETAIL_TOOLTIPS.customerAddress} /></span>
              <input className="crm-field-value" value={customerEdit.customer_address} onChange={e => setCustomerEdit({ ...customerEdit, customer_address: e.target.value })} />
            </div>
            <div className="crm-field">
              <span className="crm-field-label">Mesto <InfoTooltip text={JOB_DETAIL_TOOLTIPS.customerCity} /></span>
              <input className="crm-field-value" value={customerEdit.customer_city} onChange={e => setCustomerEdit({ ...customerEdit, customer_city: e.target.value })} />
            </div>
            <div className="crm-field">
              <span className="crm-field-label">PSČ <InfoTooltip text={JOB_DETAIL_TOOLTIPS.customerPsc} /></span>
              <input className="crm-field-value" value={customerEdit.customer_psc} onChange={e => setCustomerEdit({ ...customerEdit, customer_psc: e.target.value })} />
            </div>
            <div className="crm-field">
              <span className="crm-field-label">Krajina</span>
              <select
                className="crm-field-input"
                value={customerEdit.customer_country || 'CZ'}
                onChange={e => setCustomerEdit({ ...customerEdit, customer_country: e.target.value })}
              >
                <option value="CZ">Česko</option>
                <option value="SK">Slovensko</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => { setIsEditingCustomer(false); setCustomerEdit(null) }}>Zrušiť</button>
            <button
              className="admin-btn admin-btn-gold admin-btn-sm"
              disabled={isSaving}
              onClick={handleSaveCustomer}
            >
              {isSaving ? 'Ukladám...' : 'Uložiť'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>👤</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)' }}>{job.customer_name || '—'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>📞</span>
            {job.customer_phone
              ? <button onClick={() => callPhone(job.customer_phone, job.customer_name ?? undefined)} style={{ fontSize: 13, fontWeight: 600, color: '#1565C0', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{job.customer_phone}</button>
              : <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>—</span>
            }
          </div>
          {job.customer_email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>📧</span>
              {onEmailClick ? (
                <span
                  onClick={() => onEmailClick(job.customer_email!)}
                  style={{ fontSize: 13, fontWeight: 600, color: '#D4A843', cursor: 'pointer', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  {job.customer_email}
                  <span style={{ background: '#D4A843', color: '#000', fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 700, textDecoration: 'none' }}>
                    NAPÍSAŤ
                  </span>
                </span>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{job.customer_email}</span>
              )}
            </div>
          )}
          <div style={{ borderTop: '1px solid var(--g2, #F0F0F0)', margin: '6px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>📍</span>
            {job.customer_lat && job.customer_lng ? (
              <a
                href={`https://www.google.com/maps?q=${job.customer_lat},${job.customer_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, fontWeight: 600, color: '#1565C0', textDecoration: 'none' }}
              >
                {[job.customer_address, job.customer_psc, job.customer_city].filter(Boolean).join(', ') || `${Number(job.customer_lat).toFixed(4)}, ${Number(job.customer_lng).toFixed(4)}`}
              </a>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>
                {[job.customer_address, job.customer_psc, job.customer_city].filter(Boolean).join(', ') || '—'}
              </span>
            )}
            {(job as any).customer_country && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                background: (job as any).customer_country === 'CZ' ? '#DBEAFE' : '#FEF3C7',
                color: (job as any).customer_country === 'CZ' ? '#1E40AF' : '#92400E',
              }}>
                {(job as any).customer_country}
              </span>
            )}
          </div>
          <CustomerEmotionCard jobId={job.id} />

          {(() => {
            const raw = (job as any).custom_fields?.portal_last_active_at
            if (!raw) {
              return (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '3px 8px', borderRadius: 12, background: '#FEE2E2', border: '1px solid #FECACA' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#B91C1C' }}>Portál nebol otvorený</span>
                </div>
              )
            }
            const lastActive = new Date(raw)
            const diffMs = Date.now() - lastActive.getTime()
            const diffMin = Math.floor(diffMs / 60000)
            if (diffMin <= 10) {
              return (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '3px 8px', borderRadius: 12, background: '#DCFCE7', border: '1px solid #BBF7D0' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#15803D' }}>Na portáli: pred {diffMin} min</span>
                </div>
              )
            }
            const dd = String(lastActive.getDate()).padStart(2, '0')
            const mm = String(lastActive.getMonth() + 1).padStart(2, '0')
            const hh = String(lastActive.getHours()).padStart(2, '0')
            const min = String(lastActive.getMinutes()).padStart(2, '0')
            return (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '3px 8px', borderRadius: 12, background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#9CA3AF', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#4B5563' }}>Portál naposledy: {dd}.{mm}. {hh}:{min}</span>
              </div>
            )
          })()}

          {relatedJobs.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setShowRelated(!showRelated)}
                style={{
                  fontSize: 12, fontWeight: 600, color: '#0369A1', background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {showRelated ? '▼' : '▶'} Ďalšie zákazky zákazníka ({relatedJobs.length})
              </button>
              {showRelated && (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {relatedJobs.map((rj: any) => (
                    <a
                      key={rj.id}
                      href={`/admin/jobs/${rj.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                        borderRadius: 8, background: 'var(--g1, #FAFAFA)', textDecoration: 'none',
                        border: '1px solid var(--g2, #E5E7EB)', fontSize: 12,
                      }}
                    >
                      {rj.partner_code && (
                        <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: rj.partner_color || '#1976D2', color: '#FFF' }}>
                          {rj.partner_code}
                        </span>
                      )}
                      <span style={{ fontWeight: 600, color: 'var(--dark, #1a1a1a)' }}>{rj.reference_number}</span>
                      <span style={{ color: 'var(--g4, #4B5563)', flex: 1 }}>{rj.category}</span>
                      <span style={{
                        padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                        background: rj.status === 'uzavrete' ? '#E5E7EB' : '#DBEAFE',
                        color: rj.status === 'uzavrete' ? '#6B7280' : '#1E40AF',
                      }}>
                        {({
                          prijem: 'Príjem', dispatching: 'Priradenie', naplanovane: 'Naplánované',
                          na_mieste: 'Na mieste', schvalovanie_ceny: 'Schvaľovanie ceny',
                          cenova_ponuka_klientovi: 'Cenová ponuka', praca: 'Práca',
                          rozpracovana: 'Rozpracovaná', dokoncene: 'Dokončené',
                          zuctovanie: 'Zúčtovanie', cenova_kontrola: 'Cenová kontrola',
                          ea_odhlaska: 'Odhlásenie', fakturacia: 'Fakturácia',
                          uhradene: 'Uhradené', uzavrete: 'Uzavreté',
                          cancelled: 'Zrušené', on_hold: 'Pozastavené',
                          reklamacia: 'Reklamácia', archived: 'Archivované',
                        } as Record<string, string>)[rj.status] || rj.status}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
