/** Creator "Find trips" filters (ARCHITECTURE §20.4, UI brief F3). Pure. */

export const CATALOG_FILTERS = [
  ['all', 'All'], ['earning', 'Highest earning'], ['lead', 'Pays per lead'], ['near', 'Near me'],
  ['platform', 'Book on TripLink'], ['redirect', "Operator's site"], ['enquiry', 'Enquiry'],
] as const
export type CatalogFilter = (typeof CATALOG_FILTERS)[number][0]

export type FilterableTrip = {
  title: string; destination: string; state: string | null; start_city: string | null; operator: string
  booking_mode: 'platform' | 'redirect' | 'enquiry'; lead_fee_paise: number; earn_paise: number
}

export const parseCatalogFilter = (v: unknown): CatalogFilter =>
  CATALOG_FILTERS.find(([k]) => k === v)?.[0] ?? 'all'

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()

export function filterCatalog<T extends FilterableTrip>(trips: T[], f: CatalogFilter, q: string, homeCity: string | null): T[] {
  const query = norm(q)
  let out = query ? trips.filter((t) => norm(`${t.title} ${t.destination} ${t.state ?? ''} ${t.operator}`).includes(query)) : trips
  if (f === 'lead') out = out.filter((t) => t.lead_fee_paise > 0)
  if (f === 'near') {
    const city = norm(homeCity)
    // ponytail: same start city (or destination) only; add geo distance when trips get coordinates
    out = city ? out.filter((t) => norm(t.start_city) === city || norm(t.destination) === city) : []
  }
  if (f === 'platform' || f === 'redirect' || f === 'enquiry') out = out.filter((t) => t.booking_mode === f)
  if (f === 'earning') out = [...out].sort((a, b) => b.earn_paise + b.lead_fee_paise - (a.earn_paise + a.lead_fee_paise))
  return out
}
