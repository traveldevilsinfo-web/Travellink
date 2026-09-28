'use server'

import { cookies } from 'next/headers'
import { otpSimulationAllowed } from '@/lib/dev'
import { type ActionResult, AppError, toSafeError } from '@/lib/errors'
import { verifyTurnstile } from '@/lib/integrations/turnstile'
import { captureLead } from '@/lib/leads/capture'
import { codeMatches, newOtpCode, OTP_COOKIE, OTP_TTL_SEC, openChallenge, signChallenge } from '@/lib/security/otp-challenge'
import { ratelimit } from '@/lib/security/ratelimit'
import { REF_COOKIE, verifyRef } from '@/lib/security/ref-cookie'
import { clientIp, ipHash } from '@/lib/security/request'
import { UUID_RE } from '@/lib/tracking/ids'
import { EnquirySchema, VerifyEnquirySchema } from '@/lib/validation/leads'

// Public enquiry (ARCHITECTURE §20.3 enquiry mode, §20.4 qualified leads). No auth: travelers are anonymous.
// Order: validate → bot check → rate limit → OTP → capture (server-only, re-validated in SQL).

type Pending = Omit<ReturnType<typeof EnquirySchema.parse>, 'turnstileToken'>

function secret(): string {
  const s = process.env.REF_COOKIE_SECRET
  if (!s || s.length < 32) throw new AppError('config', 'Enquiries are not available right now. Please try WhatsApp.')
  return s
}

export async function startEnquiry(input: unknown): Promise<ActionResult<{ devCode?: string; phoneEnd: string }>> {
  try {
    const { turnstileToken, ...d } = EnquirySchema.parse(input)
    await verifyTurnstile(turnstileToken, await clientIp())
    await ratelimit('enq:ip', await ipHash(), 10, '1 h')
    await ratelimit('enq:phone', d.phone, 3, '10 m')
    const code = newOtpCode()
    // ponytail: dev shows the code on screen; production needs the WhatsApp/SMS sender (MSG91 or BSP) wired here.
    if (!otpSimulationAllowed()) throw new AppError('config', 'Phone verification is coming soon. Please ask on WhatsApp for now.')
    ;(await cookies()).set(OTP_COOKIE, signChallenge<Pending>(d, code, secret()), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: OTP_TTL_SEC,
    })
    return { ok: true, data: { devCode: code, phoneEnd: d.phone.slice(-4) } }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function verifyEnquiry(input: unknown): Promise<ActionResult<{ duplicate: boolean }>> {
  try {
    const { code } = VerifyEnquirySchema.parse(input)
    const jar = await cookies()
    const s = secret()
    const opened = openChallenge<Pending>(jar.get(OTP_COOKIE)?.value, s)
    if (!opened.ok) throw new AppError('invalid_input', 'That code has expired. Send a new one.')
    await ratelimit('enq:verify', opened.c.n, 5, '10 m')
    if (!codeMatches(opened.c, code, s)) throw new AppError('invalid_input', "That code doesn't match. Check the last message and try again.")

    const d = opened.c.d
    const ref = verifyRef(jar.get(REF_COOKIE)?.value, s) // last-click creator attribution (signed, 90 days)
    const vid = jar.get('tl_vid')?.value
    const res = await captureLead({
      tripId: d.tripId, departureId: d.departureId, name: d.name, phone: d.phone, travelers: d.travelers, message: d.message,
      creatorId: ref?.c ?? null, linkId: ref?.l ?? null, visitorId: vid && UUID_RE.test(vid) ? vid : null,
    })
    jar.delete(OTP_COOKIE)
    return { ok: true, data: { duplicate: res.duplicate } }
  } catch (e) {
    return toSafeError(e)
  }
}
