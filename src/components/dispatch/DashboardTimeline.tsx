'use client'

import { DispatchJob } from '@/types/dispatch'
import { Language } from '@/types/protocol'
import { getSmartButton } from '@/lib/smartButton'
import { getCategoryLabel } from '@/lib/constants'
import { getTranslation } from '@/lib/i18n'
import { openGoogleMapsNavigation } from '@/lib/dispatchUtils'

interface DashboardTimelineProps {
  jobs: DispatchJob[]
  activeJobId?: string | number | null
  lang: Language
  onJobClick: (jobId: string | number) => void
}

const PARTNER_COLORS: Record<string, string> = {
  AXA: '#00008F',
  EA: '#003399',
  'Europ Assistance': '#003399',
  SEC: '#E31E24',
  Security: '#E31E24',
  Allianz: '#E31E24',
}

function getPartnerShortName(insurance: string): string {
  if (!insurance) return ''
  if (insurance.toUpperCase().includes('AXA')) return 'AXA'
  if (insurance.toLowerCase().includes('europ') || insurance.toUpperCase() === 'EA') return 'EA'
  if (insurance.toLowerCase().includes('security') || insurance.toLowerCase().includes('allianz')) return 'SEC'
  return insurance.slice(0, 3).toUpperCase()
}

function getPartnerColor(insurance: string): string {
  const short = getPartnerShortName(insurance)
  return PARTNER_COLORS[short] ?? '#6B7280'
}

function extractStartTime(scheduledTime?: string): string | null {
  if (!scheduledTime) return null
  // Handle both "12:00 - 14:00" (with spaces) and "12:00-14:00" (without spaces)
  const part = scheduledTime.split(/\s*-\s*/)[0].trim()
  if (/^\d{1,2}:\d{2}$/.test(part)) return part
  return null
}

export default function DashboardTimeline({
  jobs,
  activeJobId,
  lang,
  onJobClick,
}: DashboardTimelineProps) {
  if (jobs.length === 0) return null

  return (
    <div style={{ padding: '12px 16px 0' }}>
      {jobs.map((job, index) => {
        const isActive = String(job.id) === String(activeJobId)
        const isLast = index === jobs.length - 1
        const isUnscheduled = !job.scheduledDate && !job.scheduledTime
        const todayStr = new Date().toISOString().split('T')[0]
        const isOverdue = !!job.scheduledDate && job.scheduledDate.split('T')[0] < todayStr
        const startTime = extractStartTime(job.scheduledTime)

        const smartBtn = getSmartButton(
          job.crmStep ?? 0,
          job.techPhase as any,
          lang,
          {
            hasPhotos: Boolean(job.finalPhotosUploaded),
            hasEstimate: Boolean(job.estimateData),
            hasInvoice: Boolean((job as any).customFields?.invoice_data),
            invoicePaid: (job as any).customFields?.payment_status === 'paid' || ((job as any).customFields?.invoice_data as any)?.invoice_status === 'paid',
            paymentHold: !!((job as any).customFields?.tech_payment_hold),
            paymentHoldReason: ((job as any).customFields?.tech_payment_hold as any)?.reason,
            country: job.country,
          }
        )

        const isActionNeeded = smartBtn.variant === 'primary' || smartBtn.variant === 'secondary'
        const isWaiting = smartBtn.variant === 'waiting'

        // Dot style
        const isWarning = isUnscheduled || isOverdue
        const dotBackground = isActive
          ? 'var(--gold)'
          : isWarning
          ? 'var(--danger)'
          : 'var(--bg, #F7F6F3)'
        const dotBorderColor = isActive
          ? 'var(--gold)'
          : isWarning
          ? 'var(--danger)'
          : 'var(--gold)'

        // Card style
        let cardBorder = '1px solid var(--border, #E5E5E0)'
        let cardBoxShadow = 'none'
        let cardBorderLeft = undefined as string | undefined
        if (isActive) {
          cardBorder = '2px solid var(--gold)'
          cardBoxShadow = '0 3px 12px rgba(196,162,101,0.15)'
        } else if (isWarning) {
          cardBorderLeft = '3px solid var(--danger)'
        }

        const partnerShort = getPartnerShortName(job.insurance)
        const partnerColor = getPartnerColor(job.insurance)

        return (
          <div
            key={job.id}
            onClick={() => onJobClick(job.id)}
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 10,
              cursor: 'pointer',
            }}
          >
            {/* Left column: time + dot + line */}
            <div
              style={{
                width: 52,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {/* Time label */}
              {isActive ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gold)',
                    minWidth: 42,
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {getTranslation(lang, 'dispatch.dashboard.timeline.now') || 'Teraz'}
                </span>
              ) : isOverdue ? (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--danger)',
                    minWidth: 42,
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {new Date(job.scheduledDate!).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}
                </span>
              ) : startTime ? (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--text-primary, var(--dark))',
                    minWidth: 42,
                    textAlign: 'center',
                  }}
                >
                  {startTime}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--g5)',
                    minWidth: 42,
                    textAlign: 'center',
                    lineHeight: 1.3,
                  }}
                >
                  {getTranslation(lang, 'dispatch.dashboard.timeline.noTime') || 'bez termínu'}
                </span>
              )}

              {/* Dot */}
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  border: `2px solid ${dotBorderColor}`,
                  background: dotBackground,
                  marginTop: 4,
                  flexShrink: 0,
                  zIndex: 1,
                }}
              />

              {/* Vertical line */}
              {!isLast && (
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    background: isUnscheduled ? 'transparent' : 'var(--g2)',
                    marginTop: 4,
                    minHeight: 16,
                  }}
                />
              )}
            </div>

            {/* Right column: job card */}
            <div
              style={{
                flex: 1,
                background: 'var(--bg-card, var(--card, #fff))',
                border: cardBorder,
                borderLeft: cardBorderLeft ?? cardBorder,
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: cardBoxShadow,
                marginBottom: 2,
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ padding: '12px 14px' }}>
              {/* Top row: name + ref */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, var(--dark))', letterSpacing: '-0.2px', fontFamily: "'Montserrat', sans-serif" }}>
                  {job.customerName}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-secondary, var(--g5))', fontWeight: 600, background: 'var(--surface, rgba(0,0,0,0.05))', padding: '2px 8px', borderRadius: 6 }}>
                  {job.referenceNumber || job.id}
                </span>
              </div>

              {/* Address — high contrast */}
              <div style={{ fontSize: 12, color: 'var(--text-primary, var(--dark, #374151))', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Montserrat', sans-serif", opacity: 0.8 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--g4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                {job.customerAddress}{job.customerCity ? `, ${job.customerCity}` : ''}
              </div>

              {/* Problem description */}
              {((job as any).subject || job.name) && (
                <div style={{
                  fontSize: 12, color: 'var(--g5, #9CA3AF)', marginBottom: 10, lineHeight: 1.4,
                  fontStyle: 'italic', fontFamily: "'Montserrat', sans-serif",
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                  {(job as any).subject || job.name}
                </div>
              )}

              {/* Footer: status + time */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border, var(--g2))' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: isActionNeeded ? 'rgba(239,68,68,0.15)' : isWaiting ? 'rgba(245,158,11,0.15)' : isUnscheduled ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
                  color: isActionNeeded ? '#f87171' : isWaiting ? '#fbbf24' : isUnscheduled ? '#f87171' : '#60a5fa',
                  fontFamily: "'Montserrat', sans-serif",
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: isActionNeeded ? '#ef4444' : isWaiting ? '#f59e0b' : isUnscheduled ? '#ef4444' : '#3b82f6' }} />
                  {smartBtn.label || (isUnscheduled ? (lang === 'cz' ? 'Je třeba naplánovat' : 'Treba naplánovať') : (lang === 'cz' ? 'Naplánováno' : 'Naplánované'))}
                </span>
                {job.scheduledDate && (
                  <span style={{ fontSize: 12, color: 'var(--g4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Montserrat', sans-serif" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--g5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {job.scheduledTime || new Date(job.scheduledDate).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
              </div>{/* end padding wrapper */}

              {/* Action bar — inside card */}
              <div onClick={e => e.stopPropagation()} style={{ borderTop: '1px solid var(--border, #E8E3D9)', display: 'flex' }}>
                <button onClick={e => { e.stopPropagation(); openGoogleMapsNavigation(job.customerAddress || '', job.customerCity || '') }} style={{ flex: 1, padding: '9px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', background: 'none', border: 'none', borderRight: '1px solid var(--border, #E8E3D9)', fontFamily: "'Montserrat', sans-serif", color: '#2563eb' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"/></svg>
                  {getTranslation(lang, 'dispatch.navigate') || 'Navigovat'}
                </button>
                <button onClick={e => { e.stopPropagation(); window.location.href = `tel:${job.customerPhone}` }} style={{ flex: 1, padding: '9px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', background: 'none', border: 'none', borderRight: '1px solid var(--border, #E8E3D9)', fontFamily: "'Montserrat', sans-serif", color: '#16a34a' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
                  {lang === 'cz' ? 'Zavolat' : 'Zavolať'}
                </button>
                <button onClick={e => { e.stopPropagation(); window.location.href = `/dispatch/chat?job=${job.id}` }} style={{ flex: 1, padding: '9px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', background: 'none', border: 'none', fontFamily: "'Montserrat', sans-serif", color: 'var(--gold-dark, #aa771c)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                  Chat
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
