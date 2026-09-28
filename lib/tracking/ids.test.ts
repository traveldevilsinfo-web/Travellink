import { describe, expect, it } from 'vitest'
import { LINK_CODE_RE, newClickId } from './ids'

describe('ids', () => {
  it('click ids are readable and unique enough', () => {
    const ids = new Set(Array.from({ length: 2000 }, newClickId))
    expect(ids.size).toBe(2000)
    for (const id of ids) expect(id).toMatch(/^TLC-[A-HJ-NP-Z2-9]{8}$/)
  })
  it('link codes are strict', () => {
    expect(LINK_CODE_RE.test('5c658b7')).toBe(true)
    for (const bad of ['', 'ab', 'AB12CD', '../etc', 'a b c', 'x'.repeat(17)]) expect(LINK_CODE_RE.test(bad)).toBe(false)
  })
})
