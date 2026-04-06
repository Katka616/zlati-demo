'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import SectionCollapsible from '@/components/admin/SectionCollapsible'
import JobMatchingSection from '@/components/admin/JobMatchingSection'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { JOB_DETAIL_TOOLTIPS } from '@/lib/tooltipContent'
import { getTechPhaseStyle, TECH_PHASE_LABELS } from '@/lib/constants'
import RemoveTechnicianModal from '@/components/admin/RemoveTechnicianModal'
import ReassignmentModal from '@/components/admin/job-detail/ReassignmentModal'
import QuickTechMessageModal from '@/components/admin/QuickTechMessageModal'
import { useCallPhone } from '@/hooks/useCallPhone'
import type { Job, TechPhase } from '@/data/mockData'
import type { JobTechnicianSummary, ApiTechnician } from '@/lib/jobAdapter'

interface TechnicianSectionProps {
  job: Job
  sectionState: Record<string, boolean>
  techPhase: TechPhase
  technicianData: JobTechnicianSummary | null
  assignedTech: ApiTechnician | undefined
  technicians: ApiTechnician[]
  handleAssign: (technicianId: number | null) => void
  isSaving: boolean
  onShowCalendar: () => void
  onEmailClick?: (email: string) => void
}

export default function TechnicianSection({
  job,
  sectionState,
  techPhase,
  technicianData,
  assignedTech,
  technicians,
  handleAssign,
  isSaving,
  onShowCalendar,
  onEmailClick: _onEmailClick,
}: TechnicianSectionProps) {
  const callPhone = useCallPhone()
  const techPhone = assignedTech?.phone || technicianData?.phone
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [pendingTechId, setPendingTechId] = useState<number | null>(null)
  const [techRelatedJobs, setTechRelatedJobs] = useState<any[]>([])
  const [showTechRelated, setShowTechRelated] = useState(false)
  const [techSearch, setTechSearch] = useState('')
  const [showTechDropdown, setShowTechDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [quickMsgTech, setQuickMsgTech] = useState<{ id: number; name: string } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const stripDiacritics = useCallback((s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  , [])

  const filteredTechnicians = useMemo(() => {
    const available = technicians.filter(t => t.id !== job.assigned_to)
    if (!techSearch.trim()) return available
    const q = stripDiacritics(techSearch.trim())
    return available.filter(t => {
      const name = stripDiacritics(`${t.first_name} ${t.last_name}`)
      const specs = stripDiacritics((t.specializations ?? []).join(' '))
      return name.includes(q) || specs.includes(q)
    })
  }, [technicians, job.assigned_to, techSearch, stripDiacritics])

  // Click-outside handler
  useEffect(() => {
    if (!showTechDropdown) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTechDropdown(false)
        setTechSearch('')
        setHighlightedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showTechDropdown])

  useEffect(() => {
    const techId = assignedTech?.id || technicianData?.id
    if (!techId) return
    fetch(`/api/admin/jobs/related?technicianId=${techId}&excludeJobId=${job.id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setTechRelatedJobs(d.jobs || []))
      .catch(err => console.warn('[TechnicianSection] Related jobs load failed:', err))
  }, [assignedTech?.id, technicianData?.id, job.id])

  return (
    <SectionCollapsible
      id="sec-tech"
      icon="👷"
      title="Technik & Priradenie"
      forceOpen={sectionState['sec-tech']}
    >
      {/* Priradený technik */}
      {assignedTech ? (
        <div style={{ padding: '12px', background: '#F0FDF4', borderRadius: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <a
              href={`/admin/technicians/${assignedTech.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontWeight: 600, color: '#166534', textDecoration: 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
            >
              {assignedTech.first_name} {assignedTech.last_name}
            </a>
            {techPhase.phase && techPhase.phase !== 'offer_sent' && (() => {
              const ps = getTechPhaseStyle(techPhase.phase)
              return (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
                  background: ps.bg, color: ps.color, whiteSpace: 'nowrap',
                }}>
                  {ps.emoji} {TECH_PHASE_LABELS[techPhase.phase as keyof typeof TECH_PHASE_LABELS] || techPhase.phase}
                </span>
              )
            })()}
          </div>
          {techPhone ? (
            <button onClick={() => callPhone(techPhone, `${assignedTech?.first_name ?? ''} ${assignedTech?.last_name ?? ''}`.trim() || undefined)} style={{ fontSize: 13, color: '#047857', textDecoration: 'none', display: 'block', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>📞 {techPhone}</button>
          ) : (
            <span style={{ fontSize: 13, color: '#374151', display: 'block' }}>{assignedTech.phone}</span>
          )}
          <button
            style={{ marginTop: 8, fontSize: 12, color: '#B91C1C', background: 'none', border: '1px solid #FCA5A5', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
            onClick={() => setShowRemoveModal(true)}
            disabled={isSaving}
          >
            Odobrať
          </button>
        </div>
      ) : technicianData ? (
        <div style={{ padding: '12px', background: '#F0FDF4', borderRadius: 8, marginBottom: 12 }}>
          <a
            href={`/admin/technicians/${technicianData.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontWeight: 600, color: '#166534', textDecoration: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            {technicianData.name}
          </a>
          <div style={{ fontSize: 13, color: '#047857' }}>{technicianData.phone}</div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: '#4B5563', marginBottom: 12 }}>Nepriradený</p>
      )}

      {/* Manuálne priradenie cez searchable dropdown */}
      <div className="crm-field" style={{ marginBottom: 20 }}>
        <span className="crm-field-label">{assignedTech || technicianData ? 'Zmeniť technika' : 'Priradiť technika'} <InfoTooltip text={JOB_DETAIL_TOOLTIPS.assignTechnician} /></span>
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <input
              ref={searchInputRef}
              type="text"
              className="crm-field-input"
              placeholder="Hľadať technika..."
              value={techSearch}
              onChange={e => {
                setTechSearch(e.target.value)
                setShowTechDropdown(true)
                setHighlightedIndex(-1)
              }}
              onFocus={() => setShowTechDropdown(true)}
              onKeyDown={e => {
                if (!showTechDropdown) {
                  if (e.key === 'ArrowDown' || e.key === 'Enter') {
                    setShowTechDropdown(true)
                    e.preventDefault()
                  }
                  return
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setHighlightedIndex(i => Math.min(i + 1, filteredTechnicians.length - 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setHighlightedIndex(i => Math.max(i - 1, 0))
                } else if (e.key === 'Enter' && highlightedIndex >= 0 && highlightedIndex < filteredTechnicians.length) {
                  e.preventDefault()
                  const tech = filteredTechnicians[highlightedIndex]
                  setShowTechDropdown(false)
                  setTechSearch('')
                  setHighlightedIndex(-1)
                  if (job.assigned_to) {
                    setPendingTechId(tech.id)
                    setShowReassignModal(true)
                  } else {
                    handleAssign(tech.id)
                  }
                } else if (e.key === 'Escape') {
                  setShowTechDropdown(false)
                  setTechSearch('')
                  setHighlightedIndex(-1)
                }
              }}
              disabled={isSaving}
              style={{ paddingLeft: 32 }}
            />
            <span style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, pointerEvents: 'none', opacity: 0.5,
            }}>
              🔍
            </span>
          </div>
          {showTechDropdown && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: '#fff', border: '1px solid var(--g3, #D1D5DB)', borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 280, overflowY: 'auto',
              marginTop: 4,
            }}>
              {filteredTechnicians.length === 0 ? (
                <div style={{ padding: '12px 16px', fontSize: 13, color: '#6B7280', textAlign: 'center' }}>
                  Žiadny technik nenájdený
                </div>
              ) : (
                filteredTechnicians.map((t, idx) => (
                  <div
                    key={t.id}
                    style={{
                      padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: idx === highlightedIndex ? '#F3F4F6' : 'transparent',
                      borderBottom: idx < filteredTechnicians.length - 1 ? '1px solid #F3F4F6' : 'none',
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => {
                      setShowTechDropdown(false)
                      setTechSearch('')
                      setHighlightedIndex(-1)
                      if (job.assigned_to) {
                        setPendingTechId(t.id)
                        setShowReassignModal(true)
                      } else {
                        handleAssign(t.id)
                      }
                    }}
                  >
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                      <span style={{ fontWeight: 600, color: '#1a1a1a' }}>
                        {t.first_name} {t.last_name}
                      </span>
                      <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(t.specializations ?? []).length > 0 ? (
                          (t.specializations ?? []).map((spec: string, si: number) => (
                            <span key={si} style={{
                              fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                              background: '#E5E7EB', color: '#374151', whiteSpace: 'nowrap',
                            }}>
                              {spec}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: 11, color: '#9CA3AF' }}>Všetko</span>
                        )}
                      </span>
                    </div>
                    <button
                      title={`Napísať správu: ${t.first_name} ${t.last_name}`}
                      onClick={e => {
                        e.stopPropagation()
                        setShowTechDropdown(false)
                        setTechSearch('')
                        setHighlightedIndex(-1)
                        setQuickMsgTech({ id: t.id, name: `${t.first_name} ${t.last_name}` })
                      }}
                      style={{
                        flexShrink: 0, width: 28, height: 28, borderRadius: 6,
                        border: '1px solid #BFDBFE', background: '#EFF6FF',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; e.currentTarget.style.borderColor = '#93C5FD' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE' }}
                    >
                      💬
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Termín a akceptácia */}
      <div className="crm-field-grid" style={{ marginTop: 16 }}>
        <div className="crm-field-group-label" style={{ gridColumn: '1 / -1' }}>Termín a pridelenie</div>
        <div className="crm-field">
          <span className="crm-field-label">Dohodnutý termín <InfoTooltip text={JOB_DETAIL_TOOLTIPS.scheduledDate} /></span>
          <div className="crm-field-value readonly">
            {job.scheduled_date
              ? `${new Date(job.scheduled_date).toLocaleDateString('sk-SK')}${job.scheduled_time ? ` · ${job.scheduled_time}` : ''}`
              : '—'}
          </div>
        </div>
        <div className="crm-field">
          <span className="crm-field-label">Akceptované technikom <InfoTooltip text={JOB_DETAIL_TOOLTIPS.acceptedByTech} /></span>
          <div className="crm-field-value readonly">
            {job.assigned_at
              ? new Date(job.assigned_at).toLocaleString('sk-SK')
              : '—'}
          </div>
        </div>
      </div>
      {(assignedTech || technicianData) && (
        <button
          onClick={onShowCalendar}
          style={{
            margin: '8px 0', padding: '6px 12px', fontSize: 12,
            fontWeight: 600, border: '1px solid var(--g3)', borderRadius: 6,
            background: 'var(--g1)', color: 'var(--dark)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          📅 Kalendár technika
        </button>
      )}

      {/* Ďalšie zákazky technika */}
      {techRelatedJobs.length > 0 && (
        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <button
            onClick={() => setShowTechRelated(!showTechRelated)}
            style={{
              fontSize: 12, fontWeight: 600, color: '#0369A1', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {showTechRelated ? '▼' : '▶'} Aktívne zákazky technika ({techRelatedJobs.length})
          </button>
          {showTechRelated && (
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {techRelatedJobs.map((rj: any) => (
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
                    background: '#DBEAFE', color: '#1E40AF',
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

      {/* Matching technikov */}
      <div data-matching-section style={{ borderTop: '1px solid var(--g2, #F0F0F0)', paddingTop: 16, margin: '0 -20px', padding: '16px 20px 0' }}>
        <JobMatchingSection jobId={job.id} hasTechnician={!!assignedTech} defaultCollapsed={!!assignedTech} onAssign={(techId) => handleAssign(techId)} />
      </div>

      <RemoveTechnicianModal
        isOpen={showRemoveModal}
        technicianName={`${assignedTech?.first_name || ''} ${assignedTech?.last_name || ''}`.trim()}
        referenceNumber={job.reference_number || `#${job.id}`}
        onClose={() => setShowRemoveModal(false)}
        onConfirm={async (reason, note) => {
          setShowRemoveModal(false)
          handleAssign(null)
          // Write removal reason to audit log
          try {
            await fetch(`/api/audit-log`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                entity_type: 'job',
                entity_id: job.id,
                action: 'technician_removed',
                changes: { reason, note, technician: `${assignedTech?.first_name || ''} ${assignedTech?.last_name || ''}`.trim() },
              }),
            })
          } catch { /* audit is best-effort */ }
        }}
        isLoading={isSaving}
      />

      <ReassignmentModal
        isOpen={showReassignModal}
        onClose={() => { setShowReassignModal(false); setPendingTechId(null) }}
        job={{
          id: job.id,
          crm_step: job.currentStep ?? 0,
          assigned_to: job.assigned_to ?? null,
          reference_number: job.reference_number || `#${job.id}`,
          custom_fields: (job.custom_fields as Record<string, unknown>) ?? {},
          total_assignments: job.total_assignments ?? 0,
          customer_country: job.customer_country || 'SK',
        }}
        currentTechName={`${assignedTech?.first_name || ''} ${assignedTech?.last_name || ''}`.trim() || technicianData?.name || ''}
        technicians={technicians.map(t => ({ id: t.id, first_name: t.first_name, last_name: t.last_name }))}
        onReassign={async (techId, _mode, _force) => {
          setShowReassignModal(false)
          setPendingTechId(null)
          handleAssign(techId)
        }}
      />

      {quickMsgTech && (
        <QuickTechMessageModal
          jobId={job.id}
          jobRef={job.reference_number || `#${job.id}`}
          jobAddress={job.customer_address ?? undefined}
          jobCategory={job.category ?? undefined}
          technicianId={quickMsgTech.id}
          technicianName={quickMsgTech.name}
          onClose={() => setQuickMsgTech(null)}
          onSent={() => setQuickMsgTech(null)}
        />
      )}
    </SectionCollapsible>
  )
}
