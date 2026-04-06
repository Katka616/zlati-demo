'use client'

import React from 'react'
import { Search, Filter, Plus } from 'lucide-react'
import MobileJobCard from '@/components/admin/MobileJobCard'
import MobileFilterDrawer from '@/components/admin/MobileFilterDrawer'
import { SkeletonList } from '@/components/ui/SkeletonCard'
import { JOB_STATUS_BADGE_CONFIG, type JobStatus } from '@/lib/constants'
import { followUpColor, type FollowUp } from '@/lib/followUpEngine'

interface DBJobMini {
  id: number
  reference_number: string
  customer_name?: string | null
  customer_city?: string | null
  status: string
  category?: string | null
  partner_id?: number | null
  scheduled_date?: string | null
  assigned_to?: number | null
  priority_flag?: string | null
  [key: string]: unknown
}

interface JobsMobileViewProps {
  searchQuery: string
  mobileFilterOpen: boolean
  mobileFilterStatuses: string[]
  mobileFilterPartners: string[]
  mobileFilterPriorities: string[]
  mobileFilteredJobs: DBJobMini[]
  isLoading: boolean
  emptyStateContent: React.ReactNode
  partners: { id: number; name: string }[]
  technicians: { id: number; first_name: string; last_name: string }[]
  followUpMap: Map<number, FollowUp>
  currentPage: number
  totalPages: number
  onSearchChange: (value: string) => void
  onOpenFilterDrawer: () => void
  onCloseFilterDrawer: () => void
  onOpenJob: (id: number) => void
  onNewJob: () => void
  onPageChange: (page: number) => void
  onStatusToggle: (key: string) => void
  onPartnerToggle: (key: string) => void
  onPriorityToggle: (key: string) => void
  onFilterReset: () => void
  onFilterApply: () => void
}

export default function JobsMobileView({
  searchQuery,
  mobileFilterOpen,
  mobileFilterStatuses,
  mobileFilterPartners,
  mobileFilterPriorities,
  mobileFilteredJobs,
  isLoading,
  emptyStateContent,
  partners,
  technicians,
  followUpMap,
  currentPage,
  totalPages,
  onSearchChange,
  onOpenFilterDrawer,
  onCloseFilterDrawer,
  onOpenJob,
  onNewJob,
  onPageChange,
  onStatusToggle,
  onPartnerToggle,
  onPriorityToggle,
  onFilterReset,
  onFilterApply,
}: JobsMobileViewProps) {
  const activeFilterCount = mobileFilterStatuses.length + mobileFilterPartners.length + mobileFilterPriorities.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--bg-page, #FAF8F5)' }}>

      {/* Mobile search bar */}
      <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-card, #fff)', borderRadius: 12,
          border: '1px solid var(--border, #E7E0D5)',
          padding: '10px 14px',
        }}>
          <Search size={18} style={{ color: 'var(--text-muted, #A8A29E)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Hladaj klienta, adresu..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              flex: 1, fontSize: 14, color: 'var(--text-primary, #0C0A09)',
              fontFamily: 'inherit',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--text-muted, #A8A29E)', display: 'flex' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Mobile action bar */}
      <div style={{ display: 'flex', gap: 10, padding: '10px 16px', alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={onOpenFilterDrawer}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', borderRadius: 10,
            background: activeFilterCount > 0 ? 'var(--gold, #BF953F)' : 'var(--bg-card, #fff)',
            color: activeFilterCount > 0 ? '#fff' : 'var(--text-primary, #0C0A09)',
            border: activeFilterCount > 0 ? 'none' : '1px solid var(--border, #E7E0D5)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Filter size={16} />
          Filtre
          {activeFilterCount > 0 && (
            <span style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
              {activeFilterCount}
            </span>
          )}
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={onNewJob}
          className="admin-btn-gold"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}
        >
          <Plus size={16} />
          Nová zákazka
        </button>
      </div>

      {/* Job count */}
      <div style={{ padding: '0 16px 6px', fontSize: 12, color: 'var(--text-muted, #78716C)', fontWeight: 500 }}>
        {mobileFilteredJobs.length} zákaziek
      </div>

      {/* Mobile job list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLoading ? (
          <SkeletonList count={5} />
        ) : mobileFilteredJobs.length === 0 ? (
          <div style={{ padding: '32px 0' }}>
            {emptyStateContent}
          </div>
        ) : (
          mobileFilteredJobs.map((job, index) => {
            const partner = partners.find(p => p.id === job.partner_id)
            const tech = technicians.find(t => t.id === job.assigned_to)
            const techName = tech ? `${tech.first_name} ${tech.last_name}` : undefined
            const fu = followUpMap.get(job.id)
            const fuBadge = fu ? (() => {
              const colors = followUpColor(fu.priority, fu.hoursOverdue > 0)
              return { timeText: fu.timeText, actionText: fu.actionText, overdue: fu.hoursOverdue > 0, ...colors }
            })() : null
            const statusLabel = JOB_STATUS_BADGE_CONFIG[job.status as JobStatus]?.label || job.status
            return (
              <div key={job.id} className="fade-in-card" style={{ animationDelay: `${index * 0.06}s` }}>
                <MobileJobCard
                  job={{
                    id: job.id,
                    reference_number: job.reference_number,
                    customer_name: job.customer_name || '',
                    customer_city: job.customer_city || undefined,
                    crm_step: (job.crm_step as number) ?? 0,
                    status: job.status,
                    category: job.category || undefined,
                    partner_name: partner?.name || undefined,
                    scheduled_date: job.scheduled_date || undefined,
                    technician_name: techName,
                    priority_flag: job.priority_flag as string | undefined,
                    assigned_to: job.assigned_to as number | null | undefined,
                  }}
                  statusLabel={statusLabel}
                  statusKey={job.status}
                  onClick={() => onOpenJob(job.id)}
                  followUpBadge={fuBadge}
                />
              </div>
            )
          })
        )}

        {/* Pagination on mobile */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
            {currentPage > 1 && (
              <button
                onClick={() => onPageChange(currentPage - 1)}
                style={{
                  padding: '10px 20px', borderRadius: 10,
                  border: '1px solid var(--border, #E7E0D5)',
                  background: 'var(--bg-card, #fff)', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                  color: 'var(--text-primary, #0C0A09)',
                }}
              >
                Predchádzajúce
              </button>
            )}
            {currentPage < totalPages && (
              <button
                onClick={() => onPageChange(currentPage + 1)}
                className="admin-btn-gold"
                style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}
              >
                Načítať ďalšie
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={mobileFilterOpen}
        onClose={onCloseFilterDrawer}
        selectedStatuses={mobileFilterStatuses}
        selectedPartners={mobileFilterPartners}
        selectedPriorities={mobileFilterPriorities}
        totalCount={mobileFilteredJobs.length}
        onStatusToggle={onStatusToggle}
        onPartnerToggle={onPartnerToggle}
        onPriorityToggle={onPriorityToggle}
        onReset={onFilterReset}
        onApply={onFilterApply}
      />
    </div>
  )
}
