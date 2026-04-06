'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function AiCommandLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { technician, isLoading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !technician) {
      router.replace('/login')
    } else if (technician.role !== 'operator') {
      router.replace('/dispatch')
    }
  }, [isLoading, isAuthenticated, technician, router])

  if (isLoading || !isAuthenticated || !technician || technician.role !== 'operator') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', background: 'var(--g1)' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--g1)',
      color: 'var(--g9)',
    }}>
      {children}
    </div>
  )
}
