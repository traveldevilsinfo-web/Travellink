import { describe, expect, it } from 'vitest'
import { filterCatalog, parseCatalogFilter } from './catalog'

const t = (o: Partial<Parameters<typeof filterCatalog>[0][number]>) => ({
  title: 'Trip', destination: 'Chakrata', state: 'Uttarakhand', start_city: 'Delhi', operator: 'Travel Devils',
  booking_mode: 'platform' as const, lead_fee_paise: 0, earn_paise: 100_000, ...o,
})
const trips = [
  t({ title: 'A', earn_paise: 50_000 }),
  t({ title: 'B', booking_mode: 'enquiry', lead_fee_paise: 20_000, start_city: 'Mumbai' }),
  t({ title: 'C', booking_mode: 'redirect', earn_paise: 200_000, destination: 'Spiti' }),
]
const titles = (x: { title: string }[]) => x.map((y) => y.title)

describe('filterCatalog', () => {
  it('searches title, place, state and operator', () => {
    expect(titles(filterCatalog(trips, 'all', 'spiti', null))).toEqual(['C'])
    expect(titles(filterCatalog(trips, 'all', 'travel devils', null))).toHaveLength(3)
  })
  it('filters by lead fee and booking mode', () => {
    expect(titles(filterCatalog(trips, 'lead', '', null))).toEqual(['B'])
    expect(titles(filterCatalog(trips, 'redirect', '', null))).toEqual(['C'])
  })
  it('sorts by earnings including lead fee', () => {
    expect(titles(filterCatalog(trips, 'earning', '', null))).toEqual(['C', 'B', 'A'])
  })
  it('near me matches the home city, empty without one', () => {
    expect(titles(filterCatalog(trips, 'near', '', 'mumbai'))).toEqual(['B'])
    expect(filterCatalog(trips, 'near', '', null)).toEqual([])
  })
  it('falls back to all for unknown filters', () => {
    expect(parseCatalogFilter('nope')).toBe('all')
    expect(parseCatalogFilter('near')).toBe('near')
  })
})
