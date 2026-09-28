import { describe, expect, it } from 'vitest'
import { TripSearchSchema, durationRange, monthEnd } from './search'

describe('TripSearchSchema', () => {
  it('parses good params', () => {
    expect(TripSearchSchema.parse({ q: ' spiti ', month: '2026-11', min: '5000', days: '5-7', type: 'group', page: '2' }))
      .toEqual({ q: 'spiti', dest: undefined, month: '2026-11', min: 5000, max: undefined, days: '5-7', type: 'group', page: 2 })
  })
  it('drops junk instead of throwing', () => {
    const r = TripSearchSchema.parse({ month: '2026-13', min: 'abc', days: '99', type: 'cruise', page: '-1', q: ['a', 'b'] })
    expect(r).toEqual({ q: 'a', dest: undefined, month: undefined, min: undefined, max: undefined, days: undefined, type: undefined, page: undefined })
  })
})

describe('helpers', () => {
  it('maps duration buckets', () => {
    expect(durationRange('3-4')).toEqual([3, 4])
    expect(durationRange('8+')).toEqual([8, 60])
    expect(durationRange(undefined)).toBeUndefined()
  })
  it('finds month end incl. leap Feb', () => {
    expect(monthEnd('2028-02')).toBe('2028-02-29')
    expect(monthEnd('2026-12')).toBe('2026-12-31')
  })
})
