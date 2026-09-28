import 'server-only'
import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'

/** Cloudflare Turnstile server check. Skipped outside production when no secret is set. */
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<void> {
  if (!env.TURNSTILE_SECRET_KEY) {
    if (process.env.VERCEL_ENV === 'production') throw new AppError('config', 'Turnstile not configured')
    return
  }
  if (!token) throw new AppError('bot_check_failed', 'Missing Turnstile token')
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, ...(ip ? { remoteip: ip } : {}) })
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
  const json = (await res.json()) as { success?: boolean }
  if (!json.success) throw new AppError('bot_check_failed', 'Turnstile rejected')
}
