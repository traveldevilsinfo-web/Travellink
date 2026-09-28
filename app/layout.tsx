import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const sans = Plus_Jakarta_Sans({ variable: '--font-sans', subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'TripLink — creators share trips, operators get bookings', template: '%s · TripLink' },
  description:
    'The travel affiliate platform for India. Operators list trips, Instagram creators share affiliate links, and every click, lead and booking is tracked.',
  openGraph: { siteName: 'TripLink', locale: 'en_IN', type: 'website' },
}

export const viewport: Viewport = { themeColor: '#FF5A1F', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en-IN" className={`${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
