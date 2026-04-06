'use client'

import React from 'react'
import { DispatchJob } from '@/types/dispatch'
import { useDispatchLang } from '@/hooks/useDispatchLang'

interface JobStatusBarProps {
    job: DispatchJob
    lang: 'sk' | 'cz'
}

interface Milestone {
    label: string
    shortLabel: string
    isDone: boolean
    isActive: boolean
    icon: string
}

/**
 * Compact mobile-friendly status bar.
 * Shows max 5 milestones — a sliding window around the current phase.
 * Each milestone gets a fixed-width column so labels never overlap.
 */
export default function JobStatusBar({ job, lang }: JobStatusBarProps) {
    const { t } = useDispatchLang()
    const step = job.crmStep ?? 0
    const phase = job.techPhase
    const cf = job.customFields || {}

    // All milestones — full list with short labels for mobile
    const allMilestones: Milestone[] = [
        {
            label: t('dispatch.statusBar.planned'),
            shortLabel: t('dispatch.statusBar.planShort'),
            isDone: step >= 2,
            isActive: step === 1,
            icon: '📋'
        },
        {
            label: t('dispatch.statusBar.enRoute'),
            shortLabel: t('dispatch.statusBar.enRouteShort'),
            isDone: !!(cf.arrived_at) || step >= 3,
            isActive: step === 2 && (phase === 'en_route' || phase === 'offer_accepted'),
            icon: '🚗'
        },
        {
            label: t('dispatch.statusBar.onSite'),
            shortLabel: t('dispatch.statusBar.onSiteShort'),
            isDone: !!(cf.arrived_at) || step >= 3,
            isActive: step === 2 && phase === 'arrived',
            icon: '📍'
        },
        {
            label: t('dispatch.statusBar.diagnostic'),
            shortLabel: t('dispatch.statusBar.diagShort'),
            isDone: !!(cf.submit_diagnostic_at) || step >= 4,
            isActive: step === 3 && (phase === 'arrived' || phase === 'diagnostics'),
            icon: '🔍'
        },
        {
            label: t('dispatch.statusBar.estimate'),
            shortLabel: t('dispatch.statusBar.estimateShort'),
            isDone: !!(cf.submit_estimate_at) || step >= 5,
            isActive: step === 3 && phase === 'estimate_draft',
            icon: '💰'
        },
        {
            label: t('dispatch.statusBar.approval'),
            shortLabel: t('dispatch.statusBar.approvalShort'),
            isDone: step >= 6,
            isActive: step === 4 || step === 5,
            icon: '⏳'
        },
        {
            label: t('dispatch.statusBar.repair'),
            shortLabel: t('dispatch.statusBar.repairShort'),
            isDone: !!(cf.start_work_at) || step >= 7 || ['protocol_draft', 'protocol_sent', 'departed'].includes(phase || ''),
            isActive: phase === 'working' || phase === 'break',
            icon: '🔧'
        },
        {
            label: t('dispatch.statusBar.settlement'),
            shortLabel: t('dispatch.statusBar.settlementShort'),
            isDone: step >= 8 || ['settlement_approved', 'price_approved', 'price_review', 'surcharge_sent', 'surcharge_approved', 'final_protocol_draft', 'final_protocol_sent', 'final_protocol_signed', 'invoice_ready'].includes(phase || ''),
            isActive: step === 7,
            icon: '📊'
        },
        {
            label: t('dispatch.statusBar.protocol'),
            shortLabel: t('dispatch.statusBar.protocolShort'),
            isDone: !!(cf.submit_protocol_at) || !!(cf.protocol_signed_at) || step >= 8,
            isActive: phase === 'protocol_draft' || phase === 'protocol_sent',
            icon: '📝'
        },
        {
            label: t('dispatch.statusBar.invoice'),
            shortLabel: t('dispatch.statusBar.invoiceShort'),
            isDone: !!(cf.invoice_data) || step >= 10,
            isActive: step >= 8 && step < 10 && !cf.invoice_data,
            icon: '🧾'
        },
        {
            label: t('dispatch.statusBar.done'),
            shortLabel: t('dispatch.statusBar.doneShort'),
            isDone: step >= 12,
            isActive: step >= 10,
            icon: '✅'
        },
    ]

    // Find the active milestone index (or first not-done)
    let activeIdx = allMilestones.findIndex(m => m.isActive)
    if (activeIdx === -1) {
        activeIdx = allMilestones.findIndex(m => !m.isDone)
        if (activeIdx === -1) activeIdx = allMilestones.length - 1
    }

    // Show a 5-item sliding window centered on the active milestone
    const WINDOW = 5
    let startIdx = Math.max(0, activeIdx - 2)
    if (startIdx + WINDOW > allMilestones.length) {
        startIdx = Math.max(0, allMilestones.length - WINDOW)
    }
    const visible = allMilestones.slice(startIdx, startIdx + WINDOW)

    const hasMore = startIdx + WINDOW < allMilestones.length
    const hasPrev = startIdx > 0

    return (
        <div style={{
            padding: '14px 8px 10px',
            width: '100%',
            background: 'var(--bg-card)',
            borderRadius: '12px',
            marginBottom: '10px',
            position: 'relative',
            border: '1px solid var(--border-active, rgba(191, 149, 63, 0.25))',
        }}>

            {/* Scroll hint arrows */}
            {hasPrev && (
                <div style={{
                    position: 'absolute',
                    left: '2px',
                    top: '24px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--gold, #bf953f)',
                    zIndex: 3,
                }}>‹</div>
            )}
            {hasMore && (
                <div style={{
                    position: 'absolute',
                    right: '2px',
                    top: '24px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--gold, #bf953f)',
                    zIndex: 3,
                }}>›</div>
            )}

            <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '0 8px',
            }}>
                {visible.map((m, idx) => {
                    const isDone = m.isDone
                    const isActive = m.isActive

                    return (
                        <div key={startIdx + idx} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: `${100 / WINDOW}%`,
                            position: 'relative',
                            minWidth: 0,
                        }}>
                            {/* Connector line */}
                            {idx < visible.length - 1 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '15px',
                                    left: 'calc(50% + 15px)',
                                    right: 'calc(-50% + 15px)',
                                    height: '3px',
                                    borderRadius: '2px',
                                    background: visible[idx + 1].isDone
                                        ? 'var(--success-text, #15803d)'
                                        : 'var(--text-muted, #78716C)',
                                    opacity: visible[idx + 1].isDone ? 1 : 0.35,
                                    zIndex: 1,
                                }} />
                            )}

                            {/* Circle */}
                            <div style={{
                                position: 'relative',
                                zIndex: 2,
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                background: isDone
                                    ? 'var(--success-text, #15803d)'
                                    : isActive
                                        ? 'var(--gold, #bf953f)'
                                        : 'var(--bg-card, #fff)',
                                border: isDone
                                    ? '2px solid var(--success-text, #15803d)'
                                    : isActive
                                        ? '2px solid var(--gold-dark, #aa771c)'
                                        : '2px solid var(--text-muted, #78716C)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '13px',
                                color: isDone
                                    ? '#fff'
                                    : isActive
                                        ? '#fff'
                                        : 'var(--text-muted, #78716C)',
                                fontWeight: 700,
                                boxShadow: isActive
                                    ? '0 0 0 4px var(--gold-bg, rgba(191, 149, 63, 0.15)), 0 2px 8px rgba(191, 149, 63, 0.3)'
                                    : isDone
                                        ? '0 2px 6px rgba(21, 128, 61, 0.25)'
                                        : 'none',
                                marginBottom: '6px',
                                flexShrink: 0,
                            }}>
                                {isDone ? '✓' : m.icon}
                            </div>

                            {/* Label */}
                            <span style={{
                                fontSize: '12px',
                                fontWeight: isActive ? 700 : isDone ? 600 : 500,
                                color: isDone
                                    ? 'var(--success-text, #15803d)'
                                    : isActive
                                        ? 'var(--gold-dark, #aa771c)'
                                        : 'var(--text-muted, #78716C)',
                                textAlign: 'center',
                                lineHeight: 1.2,
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                padding: '0 2px',
                                letterSpacing: isActive ? '0.02em' : '0',
                            }}>
                                {m.shortLabel}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
