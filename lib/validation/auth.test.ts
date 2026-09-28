import { describe, expect, it } from 'vitest'
import { PhoneSchema, safeNext } from './auth'

describe('PhoneSchema', () => {
  it.each(['9876543210', '+919876543210', '91 98765 43210', '09876543210', '+91-98765-43210'])('normalises %s', (v) => {
    expect(PhoneSchema.parse(v)).toBe('+919876543210')
  })
  it.each(['12345', '5876543210', '+14155550100', '98765432101', 'abcdefghij'])('rejects %s', (v) => {
    expect(PhoneSchema.safeParse(v).success).toBe(false)
  })
})

describe('safeNext', () => {
  it('allows internal paths', () => expect(safeNext('/creator/links?x=1')).toBe('/creator/links?x=1'))
  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', undefined, 42])('blocks %s', (v) => {
    expect(safeNext(v)).toBe('/account/profile')
  })
})
