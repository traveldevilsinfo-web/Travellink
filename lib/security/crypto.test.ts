import { randomBytes } from 'node:crypto'
import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
beforeAll(() => { process.env.PII_ENCRYPTION_KEY = randomBytes(32).toString('base64') })
const { decrypt, encrypt } = await import('./crypto')

describe('crypto', () => {
  it('round-trips and never repeats ciphertext', () => {
    const a = encrypt('IGAAT-secret-token'), b = encrypt('IGAAT-secret-token')
    expect(a).not.toBe(b)
    expect(a.startsWith('v1:')).toBe(true)
    expect(a).not.toContain('secret')
    expect(decrypt(a)).toBe('IGAAT-secret-token')
  })
  it('rejects tampering', () => {
    const [v, iv, tag, ct] = encrypt('ABCDE1234F').split(':')
    const flipped = Buffer.from(ct!, 'base64url'); flipped[0] = flipped[0]! ^ 1
    expect(() => decrypt([v, iv, tag, flipped.toString('base64url')].join(':'))).toThrow()
  })
  it('rejects a wrong-size key', () => {
    process.env.PII_ENCRYPTION_KEY = Buffer.alloc(16).toString('base64')
    expect(() => encrypt('x')).toThrow('32 bytes')
  })
})
