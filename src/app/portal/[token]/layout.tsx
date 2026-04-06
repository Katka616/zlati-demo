import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Sledovanie opravy | Zlatí Řemeslníci',
  description: 'Sledujte priebeh vašej opravy v reálnom čase',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1A1A1A',
}

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
