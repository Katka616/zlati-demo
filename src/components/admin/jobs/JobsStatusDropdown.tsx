'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { STATUS_FILTER_LIST } from '@/hooks/useJobsFilter'
import { JOB_STATUS_BADGE_CONFIG, type JobStatus } from '@/lib/constants'

interface JobsStatusDropdownProps {
  jobId: number
  x: number
  y: number
  currentStatus: string
  onSelectStatus: (jobId: number, status: string) => void
}

const JobsStatusDropdown = React.forwardRef<HTMLDivElement, JobsStatusDropdownProps>(
  function JobsStatusDropdown({ jobId, x, y, currentStatus, onSelectStatus }, ref) {
    return (
      <div
        ref={ref}
        style={{
          position: 'fixed',
          left: x,
          top: y,
          background: '#fff',
          border: '1px solid #E8E2D6',
          borderRadius: '10px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
          zIndex: 9999,
          minWidth: '190px',
          overflow: 'hidden',
          fontFamily: "'Montserrat', sans-serif",
        }}
      >
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #F3F4F6', fontSize: '10px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Zmeniť stav
        </div>
        <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
          {STATUS_FILTER_LIST.map(s => {
            const c = JOB_STATUS_BADGE_CONFIG[s.key as JobStatus] || { bg: '#F3F4F6', color: '#374151' }
            const isActive = s.key === currentStatus
            return (
              <button
                key={s.key}
                onClick={() => onSelectStatus(jobId, s.key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 12px', border: 'none', textAlign: 'left',
                  background: isActive ? c.bg : '#fff', cursor: 'pointer',
                  fontSize: '12px', fontWeight: isActive ? 700 : 500,
                  color: isActive ? c.color : '#374151',
                  fontFamily: "'Montserrat', sans-serif",
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#F9FAFB' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = '#fff' }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{s.label}</span>
                {isActive && <Check size={12} style={{ color: c.color, flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
)

export default JobsStatusDropdown
