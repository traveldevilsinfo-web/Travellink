'use client'

import Script from 'next/script'

declare global {
  interface Window {
    turnstile?: { getResponse: (el?: string) => string | undefined; reset: (el?: string) => void }
  }
}

/** Cloudflare Turnstile widget (implicit render). Renders nothing when no site key is configured (local dev). */
export function Turnstile({ siteKey }: { siteKey?: string }) {
  if (!siteKey) return null
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div className="cf-turnstile" data-sitekey={siteKey} data-size="flexible" />
    </>
  )
}

export function turnstileToken(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.turnstile?.getResponse() || undefined
}
