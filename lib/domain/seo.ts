/** Structured data for a trip page (ARCHITECTURE §13). Pure: no Next imports. */

export type TripSeoInput = {
  slug: string
  title: string
  summary: string | null
  destination: string
  state: string | null
  durationDays: number
  operatorName: string
  ratingAvg: number
  ratingCount: number
  imageUrls: string[]
  departures: { startDate: string; minPricePaise: number; seatsOpen: boolean }[]
}

const rupees = (paise: number) => (paise / 100).toFixed(2)

export function tripJsonLd(t: TripSeoInput, siteUrl: string) {
  const url = `${siteUrl}/trips/${t.slug}`
  const trip: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: t.title,
    description: t.summary ?? undefined,
    url,
    image: t.imageUrls.slice(0, 5),
    touristType: 'Leisure',
    itinerary: { '@type': 'Place', name: [t.destination, t.state].filter(Boolean).join(', ') },
    provider: { '@type': 'Organization', name: t.operatorName },
    offers: t.departures.map((d) => ({
      '@type': 'Offer',
      price: rupees(d.minPricePaise),
      priceCurrency: 'INR',
      availability: d.seatsOpen ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      validFrom: d.startDate,
      url,
    })),
  }
  // Only real reviews (Google policy + ARCHITECTURE §13).
  if (t.ratingCount > 0) {
    trip.aggregateRating = { '@type': 'AggregateRating', ratingValue: t.ratingAvg.toFixed(1), reviewCount: t.ratingCount }
  }
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trips', item: `${siteUrl}/trips` },
      { '@type': 'ListItem', position: 2, name: t.title, item: url },
    ],
  }
  return [trip, breadcrumbs]
}

/** JSON for a <script type="application/ld+json">; escapes "<" so content can't close the tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
