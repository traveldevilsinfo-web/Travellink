import Link from 'next/link'
import { SearchFilters } from '@/components/trip/search-filters'
import { TripGrid } from '@/components/trip/trip-card'
import { destinations, latestTrips } from '@/lib/public/queries'

export const revalidate = 3600

export default async function Home() {
  const [trips, dests] = await Promise.all([latestTrips(8), destinations()])
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-8 sm:py-12">
      <section className="flex flex-col gap-4">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Group trips picked by creators you follow</h1>
        <p className="max-w-xl text-muted-foreground">Verified operators, clear refund policies, and secure payments. Book the trip you saw on Instagram.</p>
        <SearchFilters s={{}} />
      </section>

      {dests.length > 0 && (
        <section aria-labelledby="dest-h">
          <h2 id="dest-h" className="mb-3 text-lg font-semibold">Popular destinations</h2>
          <ul className="flex flex-wrap gap-2">
            {dests.slice(0, 12).map((d) => (
              <li key={d.slug}>
                <Link href={`/destinations/${d.slug}`} className="inline-block rounded-full border px-3 py-1.5 text-sm hover:bg-muted">
                  {d.name} <span className="text-muted-foreground">({d.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="new-h">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="new-h" className="text-lg font-semibold">Newly listed trips</h2>
          <Link href="/trips" className="text-sm underline">See all</Link>
        </div>
        {trips.length ? <TripGrid trips={trips} priorityCount={2} /> : <p className="text-muted-foreground">New trips are on their way. Check back soon.</p>}
      </section>
    </main>
  )
}
