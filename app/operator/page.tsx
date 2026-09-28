import { ChartLine } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ModeBadge } from '@/components/creator/catalog-card'
import { AreaChart } from '@/components/dash/area-chart'
import { EmptyState, FunnelStrip, Kpi } from '@/components/dash/kpi'
import { RangeTabs } from '@/components/dash/range-tabs'
import { PageHeader } from '@/components/shell/app-shell'
import { requireCurrentOrg } from '@/lib/auth/guards'
import { formatDateIST, todayIST } from '@/lib/domain/dates'
import { formatINR } from '@/lib/domain/money'
import { dailySeries, groupTotals, parseRange, rangeFrom, rate, sum } from '@/lib/domain/performance'
import { compactNumber } from '@/lib/format'
import { orgPerformance } from '@/lib/operator/performance'

export const metadata: Metadata = { title: 'Performance', robots: { index: false } }

const th = (right?: boolean) => `px-4 py-3 font-bold whitespace-nowrap ${right ? 'text-right' : ''}`

export default async function Performance({ searchParams }: PageProps<'/operator'>) {
  const range = parseRange((await searchParams).range)
  const { supabase, org } = await requireCurrentOrg()
  if (org.status !== 'active') redirect('/operator/onboarding')
  const to = todayIST(), from = rangeFrom(to, range)
  const [{ rows, creators, trips: tripNames }, { data: tripRows }] = await Promise.all([
    orgPerformance(supabase, org.id, from, to),
    supabase.from('trips').select('id, title, booking_mode, lead_fee_paise, trip_commercials(creator_commission_pct)').eq('org_id', org.id).neq('status', 'archived').order('updated_at', { ascending: false }),
  ])
  const t = sum(rows)
  const byCreator = groupTotals(rows, 'creator_id')
  const byTrip = new Map(groupTotals(rows, 'trip_id').map((g) => [g.id, g]))
  const series = dailySeries(rows, from, to)

  return (
    <>
      <PageHeader title="Performance" description="Everything TripLink creators sent you, by creator and trip. Updates every 15 minutes." actions={<RangeTabs path="/operator" current={range} />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Clicks" value={t.clicks.toLocaleString('en-IN')} />
        <Kpi label="Leads" value={t.leads.toLocaleString('en-IN')} />
        <Kpi label="Bookings" value={t.bookings.toLocaleString('en-IN')} />
        <Kpi label="Sales (before GST)" value={formatINR(t.gmv_paise)} />
        <Kpi label="Creator commission" value={formatINR(t.commission_paise)} note="Bookings + lead fees" />
      </div>

      {rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={<ChartLine />} title="No creator traffic in this period">
            <p className="max-w-[48ch] text-sm text-ink-2">When creators share your trips you&apos;ll see clicks, leads and bookings per creator and per reel here.</p>
            <Link href="/operator/creators" className="text-sm font-semibold text-brand-700 hover:underline">Find creators to invite</Link>
          </EmptyState>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border bg-card p-5">
            <b>Clicks per day</b>
            <AreaChart series={series} from={formatDateIST(from).replace(/ \d{4}$/, '')} to="Today" label={`Clicks per day, ${t.clicks} in total`} />
          </section>
          <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
            <b>Funnel</b>
            <FunnelStrip items={[['Clicks', t.clicks.toLocaleString('en-IN')], ['Visitors', t.unique_visitors.toLocaleString('en-IN')], ['Leads', t.leads], ['Bookings', t.bookings]]} />
            <p className="text-sm text-ink-2">Click → lead <b className="num text-ink">{rate(t.leads, t.clicks)}</b> · click → booking <b className="num text-ink">{rate(t.bookings, t.clicks)}</b></p>
          </section>
        </div>
      )}

      {byCreator.length > 0 && (
        <section className="mt-4 overflow-hidden rounded-2xl border bg-card">
          <div className="px-5 py-4"><h2 className="text-lg font-bold">By creator</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead><tr className="bg-subtle text-left text-xs tracking-wider text-ink-3 uppercase">{['Creator', 'Followers', 'Clicks', 'Leads', 'Bookings', 'Conv.', 'Sales'].map((h, i) => <th key={h} className={th(i > 0)}>{h}</th>)}</tr></thead>
              <tbody>
                {byCreator.map((g) => {
                  const c = creators.get(g.id)
                  return (
                    <tr key={g.id} className="border-t">
                      <td className="px-4 py-3"><Link href={`/operator/creators/${g.id}`} className="font-semibold hover:text-brand-700">@{c?.handle ?? 'creator'}</Link><div className="text-sm text-ink-2">{c?.display_name}</div></td>
                      <td className="num px-4 text-right">{c?.instagram_followers ? compactNumber(c.instagram_followers) : '—'}</td>
                      <td className="num px-4 text-right">{g.clicks}</td><td className="num px-4 text-right">{g.leads}</td><td className="num px-4 text-right">{g.bookings}</td>
                      <td className="num px-4 text-right">{rate(g.bookings, g.clicks)}</td><td className="num px-4 text-right font-bold">{formatINR(g.gmv_paise)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-4 overflow-hidden rounded-2xl border bg-card">
        <div className="px-5 py-4"><h2 className="text-lg font-bold">By trip</h2></div>
        {(tripRows ?? []).length === 0 ? (
          <p className="border-t px-5 py-6 text-sm text-ink-2">No trips yet. <Link href="/operator/trips/new" className="font-semibold text-brand-700 hover:underline">List your first trip</Link>.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead><tr className="bg-subtle text-left text-xs tracking-wider text-ink-3 uppercase">{['Trip', 'Booking', 'Commission', 'Clicks', 'Leads', 'Bookings', 'Sales'].map((h, i) => <th key={h} className={th(i > 2)}>{h}</th>)}</tr></thead>
              <tbody>
                {(tripRows ?? []).map((tr) => {
                  const pct = (tr.trip_commercials as { creator_commission_pct: number } | null)?.creator_commission_pct
                  const g = byTrip.get(tr.id)
                  return (
                    <tr key={tr.id} className="border-t">
                      <td className="px-4 py-3"><Link href={`/operator/trips/${tr.id}`} className="font-semibold hover:text-brand-700">{tripNames.get(tr.id) ?? tr.title}</Link></td>
                      <td className="px-4"><ModeBadge mode={tr.booking_mode} /></td>
                      <td className="num px-4 whitespace-nowrap">{pct != null ? `${Number(pct)}%` : 'Not set'}{tr.lead_fee_paise ? ` + ${formatINR(tr.lead_fee_paise)}/lead` : ''}</td>
                      <td className="num px-4 text-right">{g?.clicks ?? 0}</td><td className="num px-4 text-right">{g?.leads ?? 0}</td><td className="num px-4 text-right">{g?.bookings ?? 0}</td>
                      <td className="num px-4 text-right font-bold">{formatINR(g?.gmv_paise ?? 0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
