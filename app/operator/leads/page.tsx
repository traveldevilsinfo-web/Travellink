import { Inbox, MessageCircle } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState } from '@/components/dash/kpi'
import { PageHeader } from '@/components/shell/app-shell'
import { Badge } from '@/components/ui/badge'
import { requireCurrentOrg } from '@/lib/auth/guards'
import { formatDateIST } from '@/lib/domain/dates'
import { formatINR } from '@/lib/domain/money'
import { LeadActions } from './lead-actions'

export const metadata: Metadata = { title: 'Leads', robots: { index: false } }

const TABS = [['open', 'Open'], ['new', 'New'], ['contacted', 'Contacted'], ['converted', 'Booked'], ['lost', 'Lost'], ['all', 'All']] as const
const STATUS: Record<string, [string, 'info' | 'warning' | 'success' | 'neutral']> = {
  new: ['New', 'info'], contacted: ['Contacted', 'warning'], payment_link_sent: ['Contacted', 'warning'], converted: ['Booked', 'success'], lost: ['Lost', 'neutral'],
}
const FEE: Record<string, string> = { pending: 'lead fee pending', confirmed: 'lead fee confirmed', paid: 'lead fee paid', rejected: 'no lead fee' }

type Lead = {
  id: string; name: string | null; phone: string; travelers: number | null; message: string | null; status: string; fee_status: string
  lead_fee_paise: number; created_at: string; departure_id: string | null; trip_id: string
  trips: { title: string }; creators: { handle: string } | null; departures: { start_date: string } | null
}

export default async function LeadsPage({ searchParams }: PageProps<'/operator/leads'>) {
  const sp = await searchParams
  const tab = TABS.find(([k]) => k === sp.status)?.[0] ?? 'open'
  const { supabase, org } = await requireCurrentOrg()
  const { data: trips } = await supabase.from('trips').select('id, title').eq('org_id', org.id).neq('status', 'archived').order('title')
  const tripIds = (trips ?? []).map((t) => t.id)
  const tripFilter = typeof sp.trip === 'string' && tripIds.includes(sp.trip) ? sp.trip : null

  let q = supabase.from('leads')
    .select('id, name, phone, travelers, message, status, fee_status, lead_fee_paise, created_at, departure_id, trip_id, trips!inner(title), creators(handle), departures(start_date)')
    .in('trip_id', tripFilter ? [tripFilter] : tripIds.length ? tripIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false }).limit(200)
  if (tab === 'open') q = q.in('status', ['new', 'contacted', 'payment_link_sent'])
  else if (tab !== 'all') q = q.eq('status', tab)
  const [{ data }, { data: deps }] = await Promise.all([
    q,
    tripIds.length ? supabase.from('departures').select('id, trip_id, start_date').in('trip_id', tripIds).order('start_date') : Promise.resolve({ data: [] }),
  ])
  const leads = (data ?? []) as unknown as Lead[]
  const depsFor = (tripId: string) => (deps ?? []).filter((d) => d.trip_id === tripId).map((d) => ({ id: d.id, label: formatDateIST(d.start_date) }))
  const href = (o: { status?: string; trip?: string | null }) => {
    const p = new URLSearchParams()
    const s = o.status ?? tab, t = o.trip === undefined ? tripFilter : o.trip
    if (s !== 'open') p.set('status', s)
    if (t) p.set('trip', t)
    return `/operator/leads${p.size ? `?${p}` : ''}`
  }

  return (
    <>
      <PageHeader title="Leads" description="OTP-verified enquiries from your trip pages. Mark them booked so the creator is credited." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav className="flex gap-0.5 overflow-x-auto overflow-y-hidden border-b" aria-label="Lead status">
          {TABS.map(([k, label]) => (
            <Link key={k} href={href({ status: k })} aria-current={tab === k ? 'page' : undefined}
              className="-mb-px inline-flex min-h-11 items-center border-b-[2.5px] border-transparent px-3.5 font-semibold whitespace-nowrap text-ink-2 hover:text-ink aria-[current=page]:border-brand aria-[current=page]:text-brand-700">{label}</Link>
          ))}
        </nav>
        {(trips ?? []).length > 1 && (
          <nav className="flex flex-wrap gap-2" aria-label="Filter by trip">
            <Link href={href({ trip: null })} aria-current={!tripFilter ? 'true' : undefined} className="rounded-full border bg-card px-3 py-1.5 text-sm font-semibold aria-[current=true]:border-ink aria-[current=true]:bg-ink aria-[current=true]:text-white">All trips</Link>
            {(trips ?? []).map((t) => <Link key={t.id} href={href({ trip: t.id })} aria-current={tripFilter === t.id ? 'true' : undefined} className="rounded-full border bg-card px-3 py-1.5 text-sm font-semibold aria-[current=true]:border-ink aria-[current=true]:bg-ink aria-[current=true]:text-white">{t.title}</Link>)}
          </nav>
        )}
      </div>

      {leads.length === 0 ? (
        <EmptyState icon={<Inbox />} title={tab === 'open' ? 'No open leads' : 'Nothing here'}>
          <p className="max-w-[48ch] text-sm text-ink-2">When a follower enquires from your trip page, their verified WhatsApp number lands here, with the creator who sent them.</p>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {leads.map((l) => {
            const [label, tone] = STATUS[l.status] ?? [l.status, 'neutral']
            const wa = `https://wa.me/${l.phone.replace('+', '')}?text=${encodeURIComponent(`Hi ${l.name ?? ''}, this is ${org.name} about ${l.trips.title}.`)}`
            return (
              <li key={l.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 md:flex-row md:items-start">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2"><b className="text-[17px]">{l.name ?? 'Traveler'}</b><Badge variant={tone}>{label}</Badge>{l.creators && <Badge variant="brand">via @{l.creators.handle}</Badge>}</div>
                  <div className="text-sm text-ink-2">
                    {l.trips.title} · {l.travelers ?? 1} traveler{(l.travelers ?? 1) > 1 ? 's' : ''} · {l.departures ? formatDateIST(l.departures.start_date) : 'flexible dates'}
                  </div>
                  {l.message && <p className="rounded-xl bg-subtle px-3 py-2 text-sm">“{l.message}”</p>}
                  <div className="text-xs text-ink-3">
                    {new Date(l.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · WhatsApp verified
                    {l.lead_fee_paise > 0 && FEE[l.fee_status] && ` · ${formatINR(l.lead_fee_paise)} ${FEE[l.fee_status]}`}
                  </div>
                </div>
                <div className="flex flex-col gap-2 md:items-end">
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 self-start rounded-[10px] border px-3 text-sm font-semibold text-success hover:border-ink-3 md:self-end">
                    <MessageCircle className="size-4" aria-hidden /><span className="num">{l.phone.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2')}</span>
                  </a>
                  <LeadActions leadId={l.id} status={l.status} travelers={l.travelers ?? 1} departureId={l.departure_id} departures={depsFor(l.trip_id)} creator={l.creators?.handle ?? null} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
