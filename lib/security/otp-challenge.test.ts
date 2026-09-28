import { describe, expect, it } from 'vitest'
import { codeMatches, newOtpCode, openChallenge, signChallenge } from './otp-challenge'

const S = 'x'.repeat(32)

describe('otp challenge', () => {
  it('round-trips data and accepts only the right code', () => {
    const t = signChallenge({ phone: '+919876543210' }, '123456', S, 1000)
    const r = openChallenge<{ phone: string }>(t, S, 1001)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.c.d.phone).toBe('+919876543210')
    expect(codeMatches(r.c, '123456', S)).toBe(true)
    expect(codeMatches(r.c, '654321', S)).toBe(false)
    expect(codeMatches(r.c, '12345', S)).toBe(false)
  })
  it('rejects tampering, other secrets and expiry', () => {
    const t = signChallenge({ a: 1 }, '000001', S, 1000)
    const [body, sig] = t.split('.')
    const forged = Buffer.from(Buffer.from(body!, 'base64url').toString().replace('"a":1', '"a":2')).toString('base64url')
    expect(openChallenge(`${forged}.${sig}`, S, 1001)).toEqual({ ok: false, reason: 'tampered' })
    expect(openChallenge(t, 'y'.repeat(32), 1001)).toEqual({ ok: false, reason: 'tampered' })
    expect(openChallenge(t, S, 1000 + 601)).toEqual({ ok: false, reason: 'expired' })
    expect(openChallenge(undefined, S)).toEqual({ ok: false, reason: 'missing' })
  })
  it('does not accept a tl_ref-style token signed with the same secret', async () => {
    const { signRef } = await import('./ref-cookie')
    expect(openChallenge(signRef({ c: 'c', l: 'l', k: 'k', t: 1 }, S), S).ok).toBe(false)
  })
  it('makes 6-digit codes', () => {
    for (let i = 0; i < 50; i++) expect(newOtpCode()).toMatch(/^\d{6}$/)
  })
})
