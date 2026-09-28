import { Search } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CatalogCard } from '@/components/creator/catalog-card'
import { EmptyState } from '@/components/dash/kpi'
import { PageHeader } from '@/components/shell/app-shell'
import { catalog, earnPerTravelerPaise, requireActiveCreator } from '@/lib/creator/queries'
import { CATALOG_FILTERS, filterCatalog, parseCatalogFilter } from '@/lib/domain/catalog'

export const metadata: Metadata = { title: 'Find trips', robots: { index: false } }

export default async function FindTrips({ searchParams }: PageProps<'/creator/trips'>) {
  const sp = await searchParams
  const f = parseCatalogFilter(sp.f)
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 60) : ''
  const { supabase, creator } = await requireActiveCreator('/creator/trips')
  const all = (await catalog(supabase)).map((t) => ({ ...t, operator: t.organizations?.name ?? '', earn_paise: earnPerTravelerPaise(t) }))
  // ponytail: filtered in memory; move to SQL when the catalog passes a few hundred trips
  const trips = filterCatalog(all, f, q, creator.home_city)

  return (
    <>
      <PageHeader title="Find trips to promote" description="You earn a share of the trip price before GST, plus a fixed fee for qualified enquiries on trips that offer it." />
      <form className="mb-4 flex max-w-[420px] items-center gap-2.5 rounded-xl border-[1.5px] bg-card px-3.5 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-50" role="search">
        <Search className="size-5 text-ink-3" aria-hidden />
        <input name="q" defaultValue={q} placeholder="Search trips, places, operators" aria-label="Search trips" className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none" />
        {f !== 'all' && <input type="hidden" name="f" value={f} />}
      </form>
      <nav className="mb-5 flex gap-2 overflow-x-auto" aria-label="Filters">
        {CATALOG_FILTERS.map(([k, label]) => (
          <Link key={k} href={{ pathname: '/creator/trips', query: { ...(q ? { q } : {}), ...(k !== 'all' ? { f: k } : {}) } }} aria-current={f === k ? 'true' : undefined}
            className="inline-flex h-9 shrink-0 items-center rounded-full border bg-card px-3.5 text-sm font-semibold hover:border-ink-3 aria-[current=true]:border-ink aria-[current=true]:bg-ink aria-[current=true]:text-white">
            {label}
          </Link>
        ))}
      </nav>
      {trips.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{trips.map((t, i) => <CatalogCard key={t.id} trip={t} priority={i < 2} />)}</div>
      ) : (
        <EmptyState icon={<Search />} title={f === 'near' && !creator.home_city ? 'Add your home city to see trips near you' : 'No trips match'}>
          <Link href="/creator/trips" className="text-sm font-semibold text-brand-700 hover:underline">Clear filters</Link>
        </EmptyState>
      )}
    </>
  )
}
