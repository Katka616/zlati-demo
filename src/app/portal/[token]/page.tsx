'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Legacy portal route — all real portal links use /client/[token].
// This redirect ensures any old /portal/ URLs still work.
export default function PortalTokenRedirect() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  useEffect(() => {
    if (token) {
      router.replace(`/client/${encodeURIComponent(token)}`)
    }
  }, [token, router])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
      <div className="spinner" />
    </div>
  )
}
