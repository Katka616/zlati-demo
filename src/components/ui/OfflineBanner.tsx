'use client'

import { useState, useEffect } from 'react'
import { Language } from '@/types/protocol'
import { getTranslation } from '@/lib/i18n'

interface OfflineBannerProps {
  language: Language
  isSyncing?: boolean
  queuedCount?: number
  onSyncClick?: () => void
}

export default function OfflineBanner({
  language,
  isSyncing = false,
  queuedCount = 0,
  onSyncClick,
}: OfflineBannerProps) {
  const t = (key: string) => getTranslation(language, key as any)
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline && !isSyncing) return null

  if (isSyncing) {
    return (
      <div className="sync-banner visible">
        <span className="mini-spin" />
        {t('offline.syncBanner')}
      </div>
    )
  }

  return (
    <div className="offline-banner visible" onClick={onSyncClick}>
      <span className="dot" />
      {t('offline.banner')}
      {queuedCount > 0 && (
        <span style={{ marginLeft: 4 }}>({queuedCount})</span>
      )}
    </div>
  )
}
