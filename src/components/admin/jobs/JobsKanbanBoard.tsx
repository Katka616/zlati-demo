'use client'

import React from 'react'
import { STATUS_STEPS } from '@/lib/constants'

interface DBJob {
  id: number
  reference_number: string | null
  partner_id: number | null
  category: string
  status: string
  urgency: string
  customer_name: string | null
  assigned_to: number | null
}

interface JobsKanbanBoardProps {
  jobs: DBJob[]
  isLoading: boolean
  emptyState: React.ReactNode
  partners: { id: number; name: string }[]
  technicians: { id: number; first_name: string; last_name: string }[]
  draggingJobId: number | null
  dragOverStep: string | null
  onDrop: (targetStepKey: string) => void
  onDragStart: (jobId: number) => void
  onDragEnd: () => void
  onOpenSidePanel: (jobId: number) => void
  onSetDragOverStep: (step: string | null) => void
}

export default function JobsKanbanBoard({
  jobs, isLoading, emptyState, partners, technicians,
  draggingJobId, dragOverStep,
  onDrop, onDragStart, onDragEnd, onOpenSidePanel, onSetDragOverStep,
}: JobsKanbanBoardProps) {
  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#F9FAFB', padding: '16px' }}>
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
          <div style={{ width: '36px', height: '36px', border: '4px solid rgba(191,149,63,0.3)', borderTopColor: '#bf953f', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : jobs.length === 0 ? (
        <div style={{
          minHeight: '240px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#fff',
          border: '1px solid #E8E2D6',
          borderRadius: '16px'
        }}>
          {emptyState}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '12px', minWidth: 'max-content', paddingBottom: '8px' }}>
          {STATUS_STEPS.map((step) => {
            const colJobs = jobs.filter(j => j.status === step.key)
            const isOver = dragOverStep === step.key
            return (
              <div
                key={step.key}
                onDragOver={(e) => { e.preventDefault(); onSetDragOverStep(step.key) }}
                onDragLeave={() => onSetDragOverStep(null)}
                onDrop={() => onDrop(step.key)}
                style={{
                  width: '240px', flexShrink: 0, borderRadius: '10px',
                  background: isOver ? 'rgba(191,149,63,0.06)' : '#F3F4F6',
                  border: isOver ? '2px dashed #bf953f' : '2px solid transparent',
                  transition: 'border-color 0.15s, background 0.15s',
                  display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto'
                }}
              >
                {/* Column header */}
                <div style={{
                  padding: '10px 12px 8px', borderBottom: '1px solid #E5E7EB',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#fff', borderRadius: '10px 10px 0 0', flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '15px' }}>{step.emoji}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1A1A1A', fontFamily: "'Montserrat', sans-serif" }}>{step.label}</span>
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '999px',
                    background: colJobs.length > 0 ? step.color : '#E5E7EB',
                    color: colJobs.length > 0 ? '#fff' : '#4B5563'
                  }}>{colJobs.length}</span>
                </div>

                {/* Cards */}
                <div style={{ overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  {colJobs.map(job => {
                    const partnerName = partners.find(p => p.id === job.partner_id)?.name ?? ''
                    const tech = technicians.find(t => t.id === job.assigned_to)
                    const techName = tech ? `${tech.first_name} ${tech.last_name}` : null
                    const urgencyColor = job.urgency === 'urgent' ? { bg: '#FEE2E2', text: '#DC2626' } : null
                    return (
                      <div
                        key={job.id}
                        draggable
                        onDragStart={() => onDragStart(job.id)}
                        onDragEnd={onDragEnd}
                        onClick={() => onOpenSidePanel(job.id)}
                        style={{
                          background: '#fff', borderRadius: '8px', padding: '10px 12px',
                          boxShadow: draggingJobId === job.id ? '0 8px 24px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.08)',
                          cursor: 'grab', transition: 'box-shadow 0.15s, opacity 0.15s',
                          opacity: draggingJobId === job.id ? 0.5 : 1,
                          border: '1px solid #F3F4F6',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-text, #8B6914)', fontFamily: 'monospace' }}>
                            {job.reference_number ?? `#${job.id}`}
                          </span>
                          {urgencyColor && (
                            <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: urgencyColor.bg, color: urgencyColor.text }}>
                              {job.urgency === 'urgent' ? 'URGENT' : 'NÍZKA'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1A1A1A', marginBottom: '4px', lineHeight: 1.3, fontFamily: "'Montserrat', sans-serif" }}>
                          {job.customer_name ?? '—'}
                        </div>
                        {job.category && (
                          <div style={{ fontSize: '11px', color: '#4B5563', marginBottom: '4px' }}>{job.category}</div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          {partnerName && job.partner_id ? (
                            <a
                              href={`/admin/partners/${job.partner_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ fontSize: '10px', color: '#4B5563', background: '#F3F4F6', padding: '1px 6px', borderRadius: '4px', textDecoration: 'none', cursor: 'pointer' }}
                              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              {partnerName}
                            </a>
                          ) : <span />}
                          {techName && tech ? (
                            <a
                              href={`/admin/technicians/${tech.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ fontSize: '10px', color: '#4B5563', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', cursor: 'pointer' }}
                              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              <span style={{ width: '16px', height: '16px', background: step.color, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '8px', fontWeight: 700 }}>
                                {(tech?.first_name?.[0] ?? '') + (tech?.last_name?.[0] ?? '')}
                              </span>
                              {tech?.first_name}
                            </a>
                          ) : (
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Bez technika</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {colJobs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)', fontSize: '12px', fontStyle: 'italic' }}>
                      Žiadne zákazky
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
