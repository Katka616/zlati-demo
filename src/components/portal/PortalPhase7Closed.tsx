'use client'

import { type Job } from '@/data/mockData'
import { type PortalTexts } from './portalLocale'

interface Phase7Props {
    job: Job
    t: PortalTexts
    token?: string
    isApiMode?: boolean
}

export function PortalPhase7Closed({ job, t, token, isApiMode }: Phase7Props) {
    const hasProtocol = Array.isArray(job.custom_fields?.protocol_history) && job.custom_fields.protocol_history.length > 0

    return (
        <div className="portal-phase">
            <div className="portal-card" style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                <h2 style={{ marginBottom: 8, fontSize: 24, fontWeight: 700 }}>
                    {t.closedTitle}
                </h2>
                <p style={{ color: 'var(--text-secondary, #4B5563)', fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>
                    {t.closedText(job.reference_number)}
                </p>

                {isApiMode && token && hasProtocol && (
                    <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary, #4B5563)', marginBottom: 16 }}>
                            {t.docsAvailable}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <a
                                href={`/api/portal/${token}/pdf`}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline btn-full"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            >
                                <span>📄</span>
                                {t.downloadSignedProtocol}
                            </a>
                            <a
                                href={`/api/portal/${token}/download-all`}
                                download
                                className="btn btn-gold btn-full"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}
                            >
                                <span>📦</span>
                                {t.downloadAllDocs}
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
