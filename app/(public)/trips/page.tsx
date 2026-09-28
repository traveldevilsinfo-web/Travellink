import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchFilters } from '@/components/trip/search-filters'
import { TripGrid } from '@/components/trip/trip-card'
import { PAGE_SIZE, searchTrips } from '@/lib/public/queries'
import { TripSearchSchema } from '@/lib/validation/search'

export const metadata: Metadata = {
  title: 'Explore trips',
  description: 'Search group trips, weekend getaways and creator-hosted experiences across India by month, budget and duration.',
  alternates: { canonical: '/trips' },
}

export default async function TripsPage({ searchParams }: PageProps<'/trips'>) {
  const raw = await searchParams
  const s = TripSearchSchema.parse(raw)
  const { trips, total, page } = await searchTrips(s)
  const pages = Math.ceil(total / PAGE_SIZE)
  const pageHref = (p: number) => {
    const u = new URLSearchParams()
    for (const [k, v] of Object.entries(s)) if (v != null && k !== 'page') u.set(k, String(v))
    if (p > 1) u.set('page', String(p))
    const qs = u.toString()
    return qs ? `/trips?${qs}` : '/trips'
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Explore trips</h1>
      <SearchFilters s={s} />
      <p className="text-sm text-muted-foreground" aria-live="polite">{total} trip{total === 1 ? '' : 's'} found</p>
      {trips.length ? <TripGrid trips={trips} priorityCount={2} /> : (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">No trips match these filters</p>
          <p className="mt-1 text-sm text-muted-foreground">Try another month or a bigger budget. <Link href="/trips" className="underline">Clear filters</Link></p>
        </div>
      )}
      {pages > 1 && (
        <nav className="flex justify-center gap-4 text-sm" aria-label="Pagination">
          {page > 1 && <Link href={pageHref(page - 1)} rel="prev" className="underline">← Previous</Link>}
          <span>Page {page} of {pages}</span>
          {page < pages && <Link href={pageHref(page + 1)} rel="next" className="underline">Next →</Link>}
        </nav>
      )}
    </main>
  )
}
