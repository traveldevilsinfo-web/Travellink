import { describe, expect, it } from 'vitest'
import { formatINR, pct, rupeesToPaise } from './money'

describe('pct', () => {
  it('matches the ARCHITECTURE §7.2 worked example', () => {
    const taxable = rupeesToPaise(20_000)
    const gst = pct(taxable, 5)
    const total = taxable + gst
    const creator = pct(taxable, 10)
    const platform = pct(taxable, 5)
    expect(gst).toBe(100_000)
    expect(creator).toBe(200_000)
    expect(platform).toBe(100_000)
    expect(pct(creator + platform, 18)).toBe(54_000) // ₹540 GST on fee
    expect(pct(taxable, 0.5)).toBe(10_000) // ₹100 GST TCS
    expect(pct(total, 0.1)).toBe(2_100) // ₹21 IT e-com TDS
  })

  it('rounds half up to the paisa', () => {
    expect(pct(1, 50)).toBe(1) // 0.5 → 1
    expect(pct(3, 50)).toBe(2) // 1.5 → 2
    expect(pct(1, 49.99)).toBe(0)
    expect(pct(333, 12.25)).toBe(41) // 40.7925 → 41
  })

  it('stays exact beyond float precision', () => {
    expect(pct(Number.MAX_SAFE_INTEGER - 1, 100)).toBe(Number.MAX_SAFE_INTEGER - 1)
  })

  it('rejects floats, negatives and bad percents', () => {
    expect(() => pct(10.5, 5)).toThrow()
    expect(() => pct(-1, 5)).toThrow()
    expect(() => pct(100, 101)).toThrow()
    expect(() => pct(100, 0.123)).toThrow()
    expect(() => pct(100, Number.NaN)).toThrow()
  })
})

describe('formatINR', () => {
  it('uses Indian digit grouping', () => {
    expect(formatINR(2_100_000)).toBe('₹21,000')
    expect(formatINR(2_100_050)).toBe('₹21,000.50')
    expect(formatINR(1_00_00_000_00)).toBe('₹1,00,00,000')
  })
})
