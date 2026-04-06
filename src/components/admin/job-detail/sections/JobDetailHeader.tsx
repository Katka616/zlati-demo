'use client'

import { useState, useRef, useEffect } from 'react'
import { Zap, Clock, CheckCircle2, MoreVertical, XCircle, Archive, ExternalLink, Link2 } from 'lucide-react'
import PriorityFlagBadge from '@/components/admin/PriorityFlagBadge'
import OperatorAssignmentWidget from '@/components/admin/job-detail/sections/OperatorAssignmentWidget'
import { STATUS_STEPS, translateCategory } from '@/lib/constants'
import { getNextActionLabel } from '@/lib/statusEngine'
import { timeAgoFromDb, getAgeColor } from '@/lib/date-utils'
import type { Job } from '@/data/mockData'

interface JobDetailHeaderProps {
  job: Job
  jobId: number
  currentStep: number
  partnerData: { id: number; name: string; code: string; color: string } | null
  currentPartner: { id: number; name: string; code: string; color: string | null } | undefined
  currentOperatorId: number | null
  currentOperatorName: string | null
  techPhase?: string | null
  onCancelClick: () => void
  onLoadJob: (silent?: boolean) => void
  onOperatorAssigned: (operatorId: number, operatorName: string) => void
}

export default function JobDetailHeader({
  job,
  jobId,
  currentStep,
  partnerData,
  currentPartner,
  currentOperatorId,
  currentOperatorName,
  techPhase,
  onCancelClick,
  onLoadJob,
  onOperatorAssigned,
}: JobDetailHeaderProps) {
  const nextAction = getNextActionLabel(currentStep, techPhase)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const partnerCode = currentPartner?.code || partnerData?.code
  const partnerColor = currentPartner?.color || partnerData?.color || '#1976D2'
  const isDiagOnly = !!job.custom_fields?.diagnostic_only

  const ActionIcon = nextAction.type === 'action' ? Zap : nextAction.type === 'waiting' ? Clock : CheckCircle2
  const actionBg = nextAction.type === 'action' ? '#FFF7ED' : nextAction.type === 'waiting' ? '#EFF6FF' : '#F0FDF4'
  const actionColor = nextAction.type === 'action' ? '#C2410C' : nextAction.type === 'waiting' ? '#1E40AF' : '#065F46'
  const actionBorder = nextAction.type === 'action' ? '#FDBA74' : nextAction.type === 'waiting' ? '#93C5FD' : '#86EFAC'

  return (
    <>
    {/* ROW 1: Primary — Ref number, Status, Action, Operator, Menu */}
    <div className="crm-job-header" data-walkthrough="job-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="case-num" style={{
        fontSize: (job.reference_number || '').length > 18 ? 16 : (job.reference_number || '').length > 14 ? 18 : 22,
        fontWeight: 800, letterSpacing: -0.5, whiteSpace: 'nowrap',
      }}>
        {job.reference_number}
      </div>

      <PriorityFlagBadge
        jobId={job.id}
        currentFlag={(job.priority_flag as import('@/lib/constants').PriorityFlag | null) || null}
        onFlagChanged={() => onLoadJob(true)}
      />

      <span className="spacer" />

      {/* Status pill */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700,
        background: STATUS_STEPS[currentStep]?.color || '#808080', color: '#FFF',
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
      }}>
        {STATUS_STEPS[currentStep]?.label || job.status}
      </span>

      {/* Next action badge */}
      {nextAction.label && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
          background: actionBg, color: actionColor,
          border: `1px solid ${actionBorder}`, whiteSpace: 'nowrap',
        }}>
          <ActionIcon size={12} strokeWidth={2.5} /> {nextAction.label}
        </span>
      )}

      {/* Operator */}
      <div data-walkthrough="operator-badge">
        <OperatorAssignmentWidget
          jobId={jobId}
          currentOperatorId={currentOperatorId}
          currentOperatorName={currentOperatorName}
          onAssigned={onOperatorAssigned}
        />
      </div>

      {/* Overflow menu (Cancel, Archive, Portal links) */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{
            width: 30, height: 30, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--g3, #9CA3AF)',
            border: '1px solid var(--border, #E5E5E5)', background: 'transparent',
          }}
        >
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 4,
            background: 'var(--w, #FFF)', border: '1px solid var(--border, #E5E5E5)',
            borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: 200, zIndex: 50, overflow: 'hidden',
          }}>
            {job.status !== 'cancelled' && job.status !== 'archived' && (
              <button onClick={() => { setMenuOpen(false); onCancelClick() }} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '10px 14px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#DC2626',
                textAlign: 'left', fontFamily: 'inherit',
              }}>
                <XCircle size={14} /> Zrušiť zákazku
              </button>
            )}
            <button onClick={() => setMenuOpen(false)} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '10px 14px', border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--dark, #1a1a1a)',
              textAlign: 'left', fontFamily: 'inherit',
            }}>
              <Archive size={14} /> Archivovať
            </button>
            {(job as any).portal_token && (
              <>
                <div style={{ height: 1, background: 'var(--border, #E5E5E5)' }} />
                <button onClick={() => { window.open(`/client/${(job as any).portal_token}`, '_blank'); setMenuOpen(false) }} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '10px 14px', border: 'none', background: 'transparent',
                  cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--dark, #1a1a1a)',
                  textAlign: 'left', fontFamily: 'inherit',
                }}>
                  <ExternalLink size={14} /> Portál klienta
                </button>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/client/${(job as any).portal_token}`); setMenuOpen(false) }} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '10px 14px', border: 'none', background: 'transparent',
                  cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--dark, #1a1a1a)',
                  textAlign: 'left', fontFamily: 'inherit',
                }}>
                  <Link2 size={14} /> Kopírovať klientský link
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>

    {/* ROW 1.5: Job Name — krátky popis + adresa + (partner) */}
    {(() => {
      // job_title z LLM (uložený v custom_fields), fallback na skrátený popis
      const jobTitle = (job.custom_fields as Record<string, unknown> | undefined)?.job_title as string | undefined
      const desc = job.description || ''
      const firstPhrase = desc.split(/[,.\n]/).map(s => s.trim()).filter(Boolean)[0] || ''
      const words = firstPhrase.split(/\s+/)
      const shortDesc = jobTitle || (words.length > 5 ? words.slice(0, 5).join(' ') : firstPhrase)
      const addr = [job.customer_address, job.customer_city].filter(Boolean).join(', ')
      if (!shortDesc && !addr) return null
      return (
        <div style={{ padding: '2px 0 4px', fontSize: 14, fontWeight: 500, color: 'var(--dark, #1a1a1a)', lineHeight: 1.4 }}>
          {shortDesc && <span>{shortDesc}</span>}
          {shortDesc && addr && <span style={{ color: 'var(--g4, #4B5563)' }}>, </span>}
          {addr && <span style={{ color: 'var(--g4, #4B5563)' }}>{addr}</span>}
          <span style={{ color: 'var(--g4, #4B5563)' }}> (asistence)</span>
        </div>
      )
    })()}

    {/* ROW 2: Secondary — Partner, Category, Urgency, Country, Age, Activity, Diag tag */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 10px', fontSize: 12, flexWrap: 'wrap' }}>
      {partnerCode && (
        <span style={{ fontWeight: 700, color: partnerColor }}>{partnerCode}</span>
      )}
      <span style={{ color: 'var(--g3, #9CA3AF)', fontSize: 8 }}>●</span>
      <span style={{ color: 'var(--g4, #4B5563)' }}>{translateCategory(job.category)}</span>
      <span style={{ color: 'var(--g3, #9CA3AF)', fontSize: 8 }}>●</span>
      <span style={{ fontWeight: 600, color: job.urgency === 'urgent' ? '#DC2626' : 'var(--g4, #4B5563)' }}>
        {job.urgency === 'urgent' ? 'Urgentná' : 'Normálna'}
      </span>
      {job.customer_country && (
        <>
          <span style={{ color: 'var(--g3, #9CA3AF)', fontSize: 8 }}>●</span>
          <span style={{ color: 'var(--g4, #4B5563)' }}>{job.customer_country}</span>
        </>
      )}
      <span style={{ color: 'var(--g3, #9CA3AF)', fontSize: 8 }}>●</span>
      <span style={{ color: 'var(--g4, #4B5563)' }}>Vek: </span>
      <span style={{ fontWeight: 600, color: getAgeColor(job.created_at) }}>{timeAgoFromDb(job.created_at)}</span>
      <span style={{ color: 'var(--g3, #9CA3AF)', fontSize: 8 }}>●</span>
      <span style={{ color: 'var(--g4, #4B5563)' }}>Aktivita: </span>
      <span style={{ fontWeight: 600, color: getAgeColor(job.updated_at) }}>{timeAgoFromDb(job.updated_at)}</span>
      {isDiagOnly && (
        <span style={{
          marginLeft: 4, padding: '2px 8px', borderRadius: 6,
          background: '#FFF3E0', color: '#E65100',
          fontWeight: 700, fontSize: 10,
        }}>
          DIAGNOSTIKA BEZ OPRAVY
        </span>
      )}
      {Number((job.custom_fields as Record<string, unknown> | undefined)?.current_visit_number) > 1 && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          background: '#7c3aed', color: 'white', padding: '4px 12px',
          borderRadius: '16px', fontSize: '0.75rem', fontWeight: 700,
        }}>
          {'🔄'} Návšteva {String((job.custom_fields as Record<string, unknown>).current_visit_number)} z {String((job.custom_fields as Record<string, unknown>).estimate_visits || (job.custom_fields as Record<string, unknown>).current_visit_number)}
        </span>
      )}
    </div>
    </>
  )
}
