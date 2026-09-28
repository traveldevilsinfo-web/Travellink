import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

// Stateless OTP for enquiries: the code never leaves the server except via the delivery channel.
// The challenge (httpOnly cookie) holds the pending enquiry and HMAC(code); it is useless without the code.

export const OTP_COOKIE = 'tl_otp'
export const OTP_TTL_SEC = 10 * 60

export type Challenge<T> = { n: string; h: string; e: number; d: T }

// 'tl-otp|' domain-separates these MACs from tl_ref, which is signed with the same secret.
const mac = (data: string, secret: string) => createHmac('sha256', secret).update(`tl-otp|${data}`).digest('base64url')
const codeHash = (n: string, code: string, secret: string) => mac(`otp:${n}:${code}`, secret)
const eq = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

export const newOtpCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0')

export function signChallenge<T>(data: T, code: string, secret: string, nowSec = Math.floor(Date.now() / 1000)): string {
  const n = randomBytes(12).toString('base64url')
  const body = Buffer.from(JSON.stringify({ n, h: codeHash(n, code, secret), e: nowSec + OTP_TTL_SEC, d: data } satisfies Challenge<T>)).toString('base64url')
  return `${body}.${mac(body, secret)}`
}

/** 'ok' with the data, or why it failed. Callers rate-limit attempts per nonce. */
export function openChallenge<T>(token: string | undefined, secret: string, nowSec = Math.floor(Date.now() / 1000)):
  { ok: true; c: Challenge<T> } | { ok: false; reason: 'missing' | 'tampered' | 'expired' } {
  if (!token || !secret) return { ok: false, reason: 'missing' }
  const [body, sig] = token.split('.')
  if (!body || !sig || !eq(sig, mac(body, secret))) return { ok: false, reason: 'tampered' }
  const c = JSON.parse(Buffer.from(body, 'base64url').toString()) as Challenge<T>
  if (typeof c.e !== 'number' || typeof c.h !== 'string' || c.e < nowSec) return { ok: false, reason: 'expired' }
  return { ok: true, c }
}

export const codeMatches = (c: Challenge<unknown>, code: string, secret: string) => /^\d{6}$/.test(code) && eq(c.h, codeHash(c.n, code, secret))
