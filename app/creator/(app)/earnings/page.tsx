import { Wallet } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState, Kpi } from '@/components/dash/kpi'
import { PageHeader } from '@/components/shell/app-shell'
import { Badge } from '@/components/ui/badge'
import { describeCommission, nextPayoutDate } from '@/lib/creator/earnings'
import { commissions, requireActiveCreator } from '@/lib/creator/queries'
import { formatDateIST, todayIST } from '@/lib/domain/dates'
import { formatINR } from '@/lib/domain/money'

export const metadata: Metadata = { title: 'Earnings', robots: { index: false } }

const TABS = [['all', 'All'], ['pending', 'Pending'], ['payable', 'Payable'], ['paid', 'Paid'], ['reversed', 'Reversed']] as const

export default async function Earnings({ searchParams }: PageProps<'/creator/earnings'>) {
  const tab = (await searchParams).tab
  const current = TABS.some(([k]) => k === tab) ? (tab as string) : 'all'
  const { supabase, creator } = await requireActiveCreator('/creator/earnings')
  const all = await commissions(supabase, creator.id)
  const sum = (...s: string[]) => all.filter((c) => s.includes(c.status)).reduce((a, c) => a + c.amount_paise, 0)
  const fy = todayIST() >= `${todayIST().slice(0, 4)}-04-01` ? `${todayIST().slice(0, 4)}-04-01` : `${Number(todayIST().slice(0, 4)) - 1}-04-01`
  const rows = all.filter((c) => current === 'all' || (current === 'pending' ? ['pending', 'confirmed', 'on_hold'].includes(c.status) : c.status === current))

  return (
    <>
      <PageHeader title="Earnings" description="Every rupee shows what happens next. Payouts go to your UPI on the 5th." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi badgeLabel tone="warning" label="Pending" value={formatINR(sum('pending', 'on_hold'))} />
        <Kpi badgeLabel tone="teal" label="Confirmed" value={formatINR(sum('confirmed'))} />
        <Kpi badgeLabel tone="success" label={`Payable on ${formatDateIST(nextPayoutDate(todayIST())).replace(/ \d{4}$/, '')}`} value={formatINR(sum('payable'))} />
        <Kpi badgeLabel label="Paid this year" value={formatINR(all.filter((c) => c.status === 'paid' && c.created_at >= fy).reduce((a, c) => a + c.amount_paise, 0))} />
      </div>
      <nav className="mb-4 flex gap-0.5 overflow-x-auto border-b" aria-label="Filter earnings">
        {TABS.map(([k, label]) => (
          <Link key={k} href={k === 'all' ? '/creator/earnings' : `/creator/earnings?tab=${k}`} aria-current={current === k ? 'page' : undefined}
            className="-mb-px inline-flex min-h-11 items-center border-b-[2.5px] border-transparent px-3.5 font-semibold whitespace-nowrap text-ink-2 hover:text-ink aria-[current=page]:border-brand aria-[current=page]:text-brand-700">{label}</Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <EmptyState icon={<Wallet />} title={current === 'all' ? 'No earnings yet' : 'Nothing here yet'}>
          <p className="max-w-[40ch] text-sm text-ink-2">Commissions appear here as soon as a follower books with your link.</p>
        </EmptyState>
      ) : (
        <ul className="overflow-hidden rounded-2xl border bg-card">
          {rows.map((c) => {
            const d = describeCommission(c)
            return (
              <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-t px-4 py-3.5 first:border-t-0 md:grid-cols-[minmax(0,2fr)_1fr_1.4fr_110px] md:items-center">
                <div className="min-w-0"><b>Booking · {c.trip_title}</b><div className="text-sm text-ink-2">{c.travelers_count} traveler{c.travelers_count > 1 ? 's' : ''} · {formatDateIST(c.departure_start)}</div></div>
                <div className="row-span-2 text-right md:row-span-1 md:text-left"><Badge variant={d.tone}>{d.label}</Badge></div>
                <div className={`text-sm ${d.tone === 'danger' ? 'text-danger' : 'text-brand-700 md:text-ink-2'}`}>{d.next}</div>
                <b className={`num md:text-right ${c.status === 'reversed' ? 'text-ink-3 line-through' : ''}`}>{formatINR(c.amount_paise)}</b>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-ink-3">You never see traveler names or numbers.</p>
    </>
  )
}
