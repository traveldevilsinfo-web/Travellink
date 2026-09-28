import 'server-only'
import { headers } from 'next/headers'
import { env } from '@/lib/env'

/** Absolute site origin for auth redirect URLs. Prefers the configured URL so a spoofed Host can't redirect elsewhere. */
export async function siteOrigin(): Promise<string> {
  if (env.NEXT_PUBLIC_SITE_URL) return env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  return `${host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'}://${host}`
}
