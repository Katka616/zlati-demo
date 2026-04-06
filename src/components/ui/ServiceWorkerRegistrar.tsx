'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations?.()
        .then(async (registrations) => {
          await Promise.all(registrations.map((registration) => registration.unregister()))

          if (typeof caches !== 'undefined' && typeof caches.keys === 'function') {
            const names = await caches.keys()
            await Promise.all(names.map((name) => caches.delete(name)))
          }
        })
        .catch(() => {
          // Ignore cleanup failures in local dev.
        })
      return
    }

    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {
        // SW registration failed — app works fine without it
      })
  }, [])

  return null
}
