import { Store } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CatalogCard } from '@/components/creator/catalog-card'
import { ReelThumb } from '@/components/creator/reel-picker'
import { AreaChart } from '@/components/dash/area-chart'
import { PageHeader } from '@/components/shell/app-shell'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { nextPayoutDate } from '@/lib/creator/earnings'
import { catalog, commissions, earnPerTravelerPaise, linksWithStats, monthStartIST, requireActiveCreator } from '@/lib/creator/queries'
import { formatDateIST, todayIST } from '@/lib/domain/dates'
import { formatINR } from '@/lib/domain/money'
import { compactNumber } from '@/lib/format'

export const metadata: Metadata = { title: 'Home', robots: { index: false } }

export default async function CreatorHome() {
  const { supabase, creator } = await requireActiveCreator()
  const month = monthStartIST()
  const [stats, comms, trips] = await Promise.all([linksWithStats(supabase, creator.id, month), commissions(supabase, creator.id), catalog(supabase, { limit: 12 })])

  const thisMonth = comms.filter((c) => c.created_at.slice(0, 10) >= month && c.status !== 'reversed')
  const earned = thisMonth.reduce((s, c) => s + c.amount_paise, 0)
  const pending = comms.filter((c) => c.status === 'pending').reduce((s, c) => s + c.amount_paise, 0)
  const payable = comms.filter((c) => c.status === 'payable').reduce((s, c) => s + c.amount_paise, 0)
  // cumulative earnings per day this month
  const days = Number(todayIST().slice(8, 10))
  const byDay = Array.from({ length: days }, (_, i) => thisMonth.filter((c) => Number(c.created_at.slice(8, 10)) <= i + 1).reduce((s, c) => s + c.amount_paise, 0) / 100)
  const topLinks = [...stats.links].sort((a, b) => b.stats.commission_paise - a.stats.commission_paise || b.stats.clicks - a.stats.clicks).slice(0, 4)
  const topTrips = [...trips].sort((a, b) => earnPerTravelerPaise(b) - earnPerTravelerPaise(a)).slice(0, 3)
  const t = stats.total

  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}
        title={`Hi ${creator.display_name.split(' ')[0]}`}
        actions={<Link href="/creator/storefront" className={buttonVariants({ variant: 'outline' })}><Store />My storefront</Link>}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="flex flex-col gap-1.5 rounded-2xl border bg-card p-5">
          <span className="text-sm text-ink-2">Earned this month</span>
          <span className="num text-[38px] font-extrabold tracking-[-0.03em]">{formatINR(earned)}</span>
          <span className="text-sm text-ink-2">
            {formatINR(pending)} pending · next payout <b className="text-ink">{formatDateIST(nextPayoutDate(todayIST()))}</b>
            {payable > 0 && <> ({formatINR(payable)})</>}
          </span>
          {earned > 0 ? (
            <AreaChart series={byDay} from={formatDateIST(month).replace(/ \d{4}$/, '')} to="Today" label={`Earnings this month, ${formatINR(earned)} so far`} format={(n) => `₹${Math.round(n).toLocaleString('en-IN')}`} />
          ) : (
            <p className="mt-3 rounded-xl bg-subtle px-4 py-3 text-sm text-ink-2">Your earnings chart starts with your first booking. Share a trip link in your next reel to get going.</p>
          )}
        </section>
        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border bg-card p-5">
            <b>This month</b>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {([['Clicks', t.clicks], ['Leads', t.leads], ['Bookings', t.bookings], ['Conversion', t.clicks ? `${((t.bookings / t.clicks) * 100).toFixed(1)}%` : '—']] as const).map(([k, v]) => (
                <div key={k}><div className="text-xs text-ink-3">{k}</div><b className="num text-xl">{typeof v === 'number' ? v.toLocaleString('en-IN') : v}</b></div>
              ))}
            </div>
          </section>
          <section className="flex flex-col gap-2 rounded-2xl bg-brand-50 p-5">
            <b>Share your first trips</b>
            <span className="text-sm text-ink-2">Creators with 5 or more trips on their storefront earn about twice as much.</span>
            <Link href="/creator/trips" className={buttonVariants({ size: 'sm', className: 'self-start' })}>Find trips</Link>
          </section>
        </div>
      </div>

      <section className="mt-4 rounded-2xl border bg-card">
        <div className="flex items-center justify-between px-5 py-4"><h2 className="text-lg font-bold">Your links, ranked by earnings</h2><Link href="/creator/links" className="text-sm font-semibold text-brand-700 hover:underline">All links</Link></div>
        {topLinks.length === 0 ? (
          <p className="border-t px-5 py-6 text-sm text-ink-2">No links yet. Pick a trip and tap <b>Get my link</b>. Use one link per reel.</p>
        ) : (
          <ul>
            {topLinks.map((l) => (
              <li key={l.id} className="flex items-center gap-3 border-t px-5 py-3.5">
                {l.creator_reels && <span className="w-9 shrink-0"><ReelThumb src={l.creator_reels.thumbnail_url} /></span>}
                <div className="min-w-0 flex-1">
                  <b className="block truncate">{l.label ?? l.trips?.title ?? 'Storefront'}</b>
                  <span className="text-sm text-ink-2">{l.creator_reels?.views != null && `${compactNumber(l.creator_reels.views)} views · `}{l.stats.clicks} clicks · {l.stats.leads} leads · {l.stats.bookings} bookings</span>
                </div>
                <b className="num">{formatINR(l.stats.commission_paise)}</b>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Top-earning trips for you</h2><Link href="/creator/trips" className="text-sm font-semibold text-brand-700 hover:underline">Find trips</Link></div>
        {topTrips.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{topTrips.map((trip, i) => <CatalogCard key={trip.id} trip={trip} priority={i < 2} />)}</div>
        ) : (
          <p className="text-sm text-ink-2">New trips are being added. <Badge variant="brand">Check back soon</Badge></p>
        )}
      </section>
    </>
  )
}
