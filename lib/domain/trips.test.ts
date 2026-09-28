import { describe, expect, it } from 'vitest'
import { operatorNextStatuses, readinessIssues, slugify } from './trips'

describe('slugify', () => {
  it.each([
    ['Chakrata Weekend Escape', 'chakrata-weekend-escape'],
    ['  Spiti   Valley — 7N/8D!! ', 'spiti-valley-7n-8d'],
    ['Café Trek à Goa', 'cafe-trek-a-goa'],
    ['!!!', 'trip'],
    ['a'.repeat(80), 'a'.repeat(50)],
  ])('%s → %s', (input, out) => expect(slugify(input)).toBe(out))
})

describe('operatorNextStatuses', () => {
  it('matches guard_trips()', () => {
    expect(operatorNextStatuses('draft', false)).toEqual(['pending_review', 'archived'])
    expect(operatorNextStatuses('rejected', false)).toEqual(['pending_review', 'archived'])
    expect(operatorNextStatuses('pending_review', false)).toEqual(['draft', 'archived'])
    expect(operatorNextStatuses('published', true)).toEqual(['paused', 'archived'])
    expect(operatorNextStatuses('paused', true)).toEqual(['published', 'archived'])
    expect(operatorNextStatuses('paused', false)).toEqual(['archived'])
    expect(operatorNextStatuses('archived', true)).toEqual([])
  })
  it('never lets an operator publish from draft', () => {
    expect(operatorNextStatuses('draft', true)).not.toContain('published')
  })
})

describe('readinessIssues', () => {
  const ready = { hasSummary: true, itineraryDays: 3, durationDays: 3, mediaCount: 3, hasCommission: true, upcomingDepartures: 1 }
  it('is empty when complete', () => expect(readinessIssues(ready)).toEqual([]))
  it('lists every gap', () => {
    expect(readinessIssues({ hasSummary: false, itineraryDays: 1, durationDays: 3, mediaCount: 0, hasCommission: false, upcomingDepartures: 0 })).toHaveLength(5)
  })
})
