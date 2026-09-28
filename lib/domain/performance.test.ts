import { describe, expect, it } from 'vitest'
import { dailySeries, groupTotals, parseRange, rangeFrom, rate, sum, type StatRow } from './performance'

const r = (o: Partial<StatRow>): StatRow => ({ day: '2026-09-28', trip_id: 't1', creator_id: 'c1', link_id: 'l1', clicks: 0, unique_visitors: 0, leads: 0, bookings: 0, gmv_paise: 0, commission_paise: 0, ...o })
const rows = [
  r({ clicks: 10, unique_visitors: 8, leads: 1 }),
  r({ day: '2026-09-29', clicks: 5, bookings: 1, gmv_paise: 3_000_000, commission_paise: 450_000 }),
  r({ day: '2026-09-29', trip_id: 't2', creator_id: 'c2', link_id: null, clicks: 40 }),
]

describe('performance', () => {
  it('sums every metric', () => {
    expect(sum(rows)).toEqual({ clicks: 55, unique_visitors: 8, leads: 1, bookings: 1, gmv_paise: 3_000_000, commission_paise: 450_000 })
  })
  it('groups by creator and trip, GMV first', () => {
    expect(groupTotals(rows, 'creator_id').map((g) => [g.id, g.clicks])).toEqual([['c1', 15], ['c2', 40]])
    expect(groupTotals(rows, 'link_id').map((g) => g.id)).toEqual(['l1']) // null links skipped
  })
  it('fills quiet days with zeros', () => {
    expect(dailySeries(rows, '2026-09-27', '2026-09-29')).toEqual([0, 10, 45])
  })
  it('ranges are inclusive and default to 30 days', () => {
    expect(rangeFrom('2026-09-29', '7')).toBe('2026-09-23')
    expect(parseRange('x')).toBe('30')
  })
  it('rates guard against zero', () => {
    expect(rate(1, 55)).toBe('1.8%')
    expect(rate(1, 0)).toBe('—')
  })
})
