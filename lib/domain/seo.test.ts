import { describe, expect, it } from 'vitest'
import { jsonLdScript, tripJsonLd } from './seo'

type Ld = { '@type': string; offers: Record<string, string>[]; aggregateRating?: unknown }

const base = {
  slug: 'chakrata', title: 'Chakrata Weekend', summary: 'Falls and camps', destination: 'Chakrata', state: 'Uttarakhand',
  durationDays: 3, operatorName: 'Travel Devils', ratingAvg: 0, ratingCount: 0, imageUrls: ['https://x/1.webp'],
  departures: [{ startDate: '2026-11-10', minPricePaise: 1_000_000, seatsOpen: true }, { startDate: '2026-11-17', minPricePaise: 1_000_000, seatsOpen: false }],
}

describe('tripJsonLd', () => {
  it('builds TouristTrip + offers in rupees', () => {
    const [trip] = tripJsonLd(base, 'https://triplink.in') as [Ld]
    expect(trip['@type']).toBe('TouristTrip')
    expect(trip.offers[0]).toMatchObject({ price: '10000.00', priceCurrency: 'INR', availability: 'https://schema.org/InStock' })
    expect(trip.offers[1]!.availability).toBe('https://schema.org/SoldOut')
  })
  it('omits AggregateRating without real reviews', () => {
    expect((tripJsonLd(base, 'https://t')[0] as Record<string, unknown>).aggregateRating).toBeUndefined()
    expect((tripJsonLd({ ...base, ratingAvg: 4.64, ratingCount: 12 }, 'https://t')[0] as Ld).aggregateRating)
      .toEqual({ '@type': 'AggregateRating', ratingValue: '4.6', reviewCount: 12 })
  })
})

describe('jsonLdScript', () => {
  it('cannot break out of the script tag', () => {
    const out = jsonLdScript({ name: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('<')
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>')
  })
})
