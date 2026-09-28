'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/guards'
import { type ActionResult, AppError, toSafeError } from '@/lib/errors'
import { ratelimit } from '@/lib/security/ratelimit'
import { VerifyTotpSchema, safeNext } from '@/lib/validation/auth'

export async function enrollTotp(): Promise<ActionResult<{ factorId: string; qrCode: string; secret: string }>> {
  try {
    const user = await requireUser('/mfa')
    await ratelimit('mfa:enroll', user.id, 5, '1 h')
    const { data: factors } = await user.supabase.auth.mfa.listFactors()
    // Drop abandoned (unverified) enrolments so re-enrolling doesn't collide.
    for (const f of factors?.all ?? []) {
      if (f.factor_type === 'totp' && f.status === 'unverified') await user.supabase.auth.mfa.unenroll({ factorId: f.id })
    }
    const { data, error } = await user.supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator app' })
    if (error || !data) throw new AppError('upstream', error?.message ?? 'enroll failed')
    return { ok: true, data: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret } }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function verifyTotp(input: unknown): Promise<ActionResult> {
  let next: string
  try {
    const user = await requireUser('/mfa')
    const data = VerifyTotpSchema.parse(input)
    await ratelimit('mfa:verify', user.id, 5, '10 m')
    const { error } = await user.supabase.auth.mfa.challengeAndVerify({ factorId: data.factorId, code: data.code })
    if (error) return { ok: false, error: 'That code is wrong or expired.' }
    next = safeNext(data.next, '/')
  } catch (e) {
    return toSafeError(e)
  }
  redirect(next)
}
