import { ChartLine } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ModeBadge } from '@/components/creator/catalog-card'
import { EmptyState, Kpi } from '@/components/dash/kpi'
import { PageHeader } from '@/components/shell/app-shell'
import { requireCurrentOrg } from '@/lib/auth/guards'
import { formatINR } from '@/lib/domain/money'

export const metadata: Metadata = { title: 'Performance', robots: { index: false } }

export default async function Performance() {
  const { supabase, org } = await requireCurrentOrg()
  if (org.status !== 'active') redirect('/operator/onboarding')
  const { data } = await supabase
    .from('trips')
    .select('id, title, status, booking_mode, lead_fee_paise, trip_commercials(creator_commission_pct)')
    .eq('org_id', org.id)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })
  const trips = data ?? []

  return (
    <>
      <PageHeader title="Performance" description="Everything TripLink creators sent you, by creator, link and trip." />
      {/* ponytail: live numbers need the org_daily_stats rollup (M5); until then show zeros, never estimates */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Clicks" value="0" /><Kpi label="Leads" value="0" /><Kpi label="Bookings" value="0" />
        <Kpi label="Sales (GMV)" value={formatINR(0)} /><Kpi label="Commission owed" value={formatINR(0)} />
      </div>
      <div className="mt-4">
        <EmptyState icon={<ChartLine />} title="Your creator results will show here">
          <p className="max-w-[48ch] text-sm text-ink-2">As soon as creators share your trips, you&apos;ll see clicks, leads and bookings per creator and per reel, updated every 15 minutes.</p>
          <Link href="/operator/creators" className="text-sm font-semibold text-brand-700 hover:underline">Invite creators</Link>
        </EmptyState>
      </div>
      <section className="mt-4 overflow-hidden rounded-2xl border bg-card">
        <div className="px-5 py-4"><h2 className="text-lg font-bold">By trip</h2></div>
        {trips.length === 0 ? (
          <p className="border-t px-5 py-6 text-sm text-ink-2">No trips yet. <Link href="/operator/trips/new" className="font-semibold text-brand-700 hover:underline">List your first trip</Link>.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead><tr className="bg-subtle text-left text-xs tracking-wider text-ink-3 uppercase">{['Trip', 'Booking', 'Commission', 'Clicks', 'Leads', 'Bookings'].map((h, i) => <th key={h} className={`px-4 py-3 font-bold whitespace-nowrap ${i > 2 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
              <tbody>
                {trips.map((t) => {
                  const pct = (t.trip_commercials as { creator_commission_pct: number } | null)?.creator_commission_pct
                  return (
                    <tr key={t.id} className="border-t">
                      <td className="px-4 py-3"><Link href={`/operator/trips/${t.id}`} className="font-semibold hover:text-brand-700">{t.title}</Link></td>
                      <td className="px-4"><ModeBadge mode={t.booking_mode} /></td>
                      <td className="num px-4 whitespace-nowrap">{pct != null ? `${pct}%` : 'Not set'}{t.lead_fee_paise ? ` + ${formatINR(t.lead_fee_paise)}/lead` : ''}</td>
                      <td className="num px-4 text-right">0</td><td className="num px-4 text-right">0</td><td className="num px-4 text-right">0</td>
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
