'use server'

import { redirect } from 'next/navigation'
import { verifyTurnstile } from '@/lib/integrations/turnstile'
import { type ActionResult, AppError, toSafeError } from '@/lib/errors'
import { ratelimit } from '@/lib/security/ratelimit'
import { clientIp, ipHash } from '@/lib/security/request'
import { siteOrigin } from '@/lib/security/origin'
import { createServerClient } from '@/lib/supabase/server'
import { MagicLinkSchema, SendOtpSchema, VerifyOtpSchema, safeNext } from '@/lib/validation/auth'

// No auth guard: these ARE the sign-in actions. Order: validate → bot check → rate limit → Supabase.

export async function sendPhoneOtp(input: unknown): Promise<ActionResult> {
  try {
    const { phone, turnstileToken } = SendOtpSchema.parse(input)
    await verifyTurnstile(turnstileToken, await clientIp())
    await ratelimit('otp:phone', phone, 3, '10 m')
    await ratelimit('otp:ip', await ipHash(), 10, '1 h')
    const supabase = await createServerClient()
    const { error } = await supabase.auth.signInWithOtp({ phone })
    if (error) throw new AppError('upstream', error.message)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function verifyPhoneOtp(input: unknown): Promise<ActionResult> {
  let next: string
  try {
    const data = VerifyOtpSchema.parse(input)
    await ratelimit('login:ip', await ipHash(), 10, '10 m')
    const supabase = await createServerClient()
    const { error } = await supabase.auth.verifyOtp({ phone: data.phone, token: data.token, type: 'sms' })
    if (error) return { ok: false, error: 'That code is wrong or expired.' }
    next = safeNext(data.next)
  } catch (e) {
    return toSafeError(e)
  }
  redirect(next)
}

export async function sendMagicLink(input: unknown): Promise<ActionResult> {
  try {
    const data = MagicLinkSchema.parse(input)
    await verifyTurnstile(data.turnstileToken, await clientIp())
    await ratelimit('magic:ip', await ipHash(), 5, '10 m')
    await ratelimit('magic:email', data.email.toLowerCase(), 3, '10 m')
    const supabase = await createServerClient()
    const redirectTo = `${await siteOrigin()}/callback?next=${encodeURIComponent(safeNext(data.next))}`
    const { error } = await supabase.auth.signInWithOtp({ email: data.email, options: { emailRedirectTo: redirectTo } })
    if (error) throw new AppError('upstream', error.message)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function signInWithGoogle(next: unknown): Promise<ActionResult> {
  let url: string
  try {
    await ratelimit('login:ip', await ipHash(), 10, '10 m')
    const supabase = await createServerClient()
    const redirectTo = `${await siteOrigin()}/callback?next=${encodeURIComponent(safeNext(next))}`
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error || !data.url) throw new AppError('upstream', error?.message ?? 'No OAuth URL')
    url = data.url
  } catch (e) {
    return toSafeError(e)
  }
  redirect(url)
}

export async function signOut(): Promise<void> {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/')
}
