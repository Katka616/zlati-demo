'use client'

/**
 * Calls page — /dispatch/calls
 *
 * Figma: Support hotlines list with click-to-call.
 * Shows different numbers for SK and CZ technicians.
 */

import { useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { SUPPORT_HOTLINES, SupportHotline } from '@/types/dispatch'
import { getTranslation } from '@/lib/i18n'
import { Language } from '@/types/protocol'

export default function CallsPage() {
  const { technician } = useAuth()

  const lang: Language = technician?.country === 'CZ' ? 'cz' : 'sk'
  const t = useCallback(
    (key: string) => getTranslation(lang, key),
    [lang]
  )

  const country = technician?.country || 'SK'
  const hotlines = SUPPORT_HOTLINES.filter((h) => h.country === country)

  return (
    <>
      <div className="dispatch-header">
        <h1>{t('dispatch.tabs.calls')}</h1>
        <p>{t('dispatch.calls.subtitle')}</p>
      </div>

      <div className="calls-list">
        {hotlines.map((hotline) => (
          <HotlineCard key={hotline.id} hotline={hotline} t={t} />
        ))}

        {/* Emergency notice */}
        <div className="calls-notice">
          <span className="calls-notice-icon">ℹ️</span>
          <span>{t('dispatch.calls.emergencyNote')}</span>
        </div>
      </div>
    </>
  )
}

function HotlineCard({
  hotline,
  t,
}: {
  hotline: SupportHotline
  t: (key: string) => string
}) {
  return (
    <a
      href={`tel:${hotline.phoneNumber.replace(/\s/g, '')}`}
      className="hotline-card"
    >
      <div className="hotline-icon">{hotline.icon}</div>
      <div className="hotline-info">
        <div className="hotline-name">{hotline.name}</div>
        <div className="hotline-phone">{hotline.phoneNumber}</div>
        <div className="hotline-hours">
          🕐 {hotline.workingHours}
        </div>
      </div>
      <div className="hotline-call-icon">📞</div>
    </a>
  )
}
