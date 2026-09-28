import { describe, expect, it } from 'vitest'
import { signRef, verifyRef } from './ref-cookie'

const S = 'x'.repeat(40)
const p = { c: 'creator-1', l: 'link-1', k: 'TLC-ABCD1234', t: 1_790_000_000 }

describe('ref cookie', () => {
  it('round-trips within the window', () => {
    expect(verifyRef(signRef(p, S), S, p.t + 86_400)).toEqual(p)
  })
  it('rejects tampering, wrong secret and garbage', () => {
    const v = signRef(p, S)
    const [data, mac] = v.split('.')
    const forged = Buffer.from(JSON.stringify({ ...p, c: 'attacker' })).toString('base64url')
    expect(verifyRef(`${forged}.${mac}`, S, p.t)).toBeNull()
    expect(verifyRef(`${data}.${mac}x`, S, p.t)).toBeNull()
    expect(verifyRef(v, 'y'.repeat(40), p.t)).toBeNull()
    expect(verifyRef('not-a-cookie', S, p.t)).toBeNull()
    expect(verifyRef(undefined, S, p.t)).toBeNull()
    expect(verifyRef(v, '', p.t)).toBeNull()
  })
  it('expires after 90 days and rejects future timestamps', () => {
    expect(verifyRef(signRef(p, S), S, p.t + 90 * 86_400)).toEqual(p)
    expect(verifyRef(signRef(p, S), S, p.t + 90 * 86_400 + 1)).toBeNull()
    expect(verifyRef(signRef({ ...p, t: p.t + 3600 }, S), S, p.t)).toBeNull()
  })
})
