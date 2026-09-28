import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseWs = supabase.replace(/^http/, 'ws')

// ARCHITECTURE §8.5. ponytail: 'unsafe-inline' scripts (no nonce) keeps ISR working; move to nonces if ISR is dropped.
// Add PostHog/Sentry hosts to connect-src in the milestone that adds them.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://checkout.razorpay.com https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase} https://*.cdninstagram.com https://*.fbcdn.net`,
  "font-src 'self'",
  `connect-src 'self' ${supabase} ${supabaseWs} https://api.razorpay.com https://lumberjack.razorpay.com`,
  'frame-src https://api.razorpay.com https://checkout.razorpay.com https://challenges.cloudflare.com',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: supabase ? { remotePatterns: [new URL(`${supabase}/storage/v1/object/public/**`)] } : undefined,
  experimental: {
    // trip photos are ≤10 MB (ARCHITECTURE §3); one file per action call + multipart overhead
    serverActions: { bodySizeLimit: '11mb' },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
