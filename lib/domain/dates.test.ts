import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, formatDateIST, todayIST } from './dates'

describe('dates', () => {
  it('uses the IST calendar day', () => {
    expect(todayIST(new Date('2026-10-01T18:29:00Z'))).toBe('2026-10-01') // 23:59 IST
    expect(todayIST(new Date('2026-10-01T18:31:00Z'))).toBe('2026-10-02') // 00:01 IST
  })
  it('counts days across months and leap years', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3)
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2)
    expect(daysBetween('2026-11-02', '2026-10-30')).toBe(-3)
  })
  it('adds days', () => expect(addDays('2026-12-30', 3)).toBe('2027-01-02'))
  it('formats for India', () => expect(formatDateIST('2026-11-12')).toBe('12 Nov 2026'))
})
