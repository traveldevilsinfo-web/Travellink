import { describe, expect, it } from 'vitest'
import { describeCommission, nextPayoutDate } from './earnings'

describe('describeCommission', () => {
  const base = { confirmable_at: '2026-10-13T00:00:00Z', payable_at: '2026-11-02T00:00:00Z', reversed_reason: null }
  it('always gives a next step with a date', () => {
    expect(describeCommission({ ...base, status: 'pending' }).next).toBe('Confirms on 13 Oct 2026')
    expect(describeCommission({ ...base, status: 'confirmed' }).next).toBe('Payable after 2 Nov 2026')
  })
  it('explains reversals', () => {
    expect(describeCommission({ ...base, status: 'reversed', reversed_reason: 'Duplicate booking' }).next).toBe('Duplicate booking')
    expect(describeCommission({ ...base, status: 'reversed' }).tone).toBe('danger')
  })
  it('maps on_hold to a friendly label', () => expect(describeCommission({ ...base, status: 'on_hold' }).label).toBe('Under review'))
})

describe('nextPayoutDate', () => {
  it.each([
    ['2026-10-01', '2026-10-05'],
    ['2026-10-05', '2026-11-05'],
    ['2026-12-20', '2027-01-05'],
  ])('%s → %s', (today, next) => expect(nextPayoutDate(today)).toBe(next))
})

describe('describeCommission dates', () => {
  it('shows the IST calendar date of a timestamp', () => {
    // 29 Oct 00:00 IST is 28 Oct 18:30 UTC
    const d = describeCommission({ status: 'pending', confirmable_at: '2026-10-28T18:30:00Z', payable_at: '2026-10-28T18:30:00Z', reversed_reason: null })
    expect(d.next).toBe('Confirms on 29 Oct 2026')
  })
})
