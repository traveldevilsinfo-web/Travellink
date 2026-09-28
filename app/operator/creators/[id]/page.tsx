import { ChevronRight, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { ReelThumb } from '@/components/creator/reel-picker'
import { FunnelStrip, Kpi } from '@/components/dash/kpi'
import { RangeTabs } from '@/components/dash/range-tabs'
import { Badge } from '@/components/ui/badge'
import { requireCurrentOrg } from '@/lib/auth/guards'
import { formatDateIST, todayIST } from '@/lib/domain/dates'
import { formatINR } from '@/lib/domain/money'
import { groupTotals, parseRange, rangeFrom, rate, sum } from '@/lib/domain/performance'
import { compactNumber } from '@/lib/format'
import { inviteOptions, orgPerformance } from '@/lib/operator/performance'
import { siteUrl } from '@/lib/site'
import { InviteDialog } from '../invite-dialog'

export const metadata: Metadata = { title: 'Creator', robots: { index: false } }

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

type LinkRow = { link_id: string; code: string; label: string | null; trip_title: string; created_at: string; reel_permalink: string | null; reel_thumbnail_url: string | null; reel_views: number | null }
const INVITE: Record<string, ['Pending' | 'Accepted' | 'Declined' | 'Withdrawn', 'warning' | 'success' | 'neutral']> = {
  pending: ['Pending', 'warning'], accepted: ['Accepted', 'success'], declined: ['Declined', 'neutral'], withdrawn: ['Withdrawn', 'neutral'],
}

export default async function CreatorDetail({ params, searchParams }: PageProps<'/operator/creators/[id]'>) {
  const id = z.guid().safeParse((await params).id)
  if (!id.success) notFound()
  const range = parseRange((await searchParams).range)
  const { supabase, org } = await requireCurrentOrg()
  const { data: creator } = await supabase.from('creators').select('id, handle, display_name, bio, home_city, instagram_handle, instagram_followers, languages').eq('id', id.data).eq('status', 'active').maybeSingle()
  if (!creator) notFound()
  const to = todayIST(), from = rangeFrom(to, range)
  const [perf, { data: links }, { data: invites }, { data: overrides }, invite] = await Promise.all([
    orgPerformance(supabase, org.id, from, to, creator.id),
    supabase.rpc('org_creator_links', { p_org: org.id, p_creator: creator.id }),
    supabase.from('collab_invites').select('id, commission_pct, status, created_at, trips(title)').eq('org_id', org.id).eq('creator_id', creator.id).order('created_at', { ascending: false }),
    supabase.from('commission_overrides').select('commission_pct, valid_from, valid_to, trips!inner(title, org_id)').eq('creator_id', creator.id).eq('trips.org_id', org.id).order('valid_from', { ascending: false }),
    inviteOptions(supabase, org.id),
  ])
  const t = sum(perf.rows)
  const byLink = new Map(groupTotals(perf.rows, 'link_id').map((g) => [g.id, g]))
  const linkRows = (links ?? []) as LinkRow[]
  const views = linkRows.map((l) => l.reel_views).filter((v): v is number => v != null)
  const path = `/operator/creators/${creator.id}`

  return (
    <>
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-ink-3" aria-label="Breadcrumb"><Link href="/operator/creators" className="font-semibold text-ink-2 hover:text-brand-700">Creators</Link><ChevronRight className="size-4" aria-hidden /><span>@{creator.handle}</span></nav>
      <header className="mb-5 flex flex-wrap items-start gap-4 rounded-2xl border bg-card p-5">
        <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-[conic-gradient(#F58529,#DD2A7B,#8134AF,#F58529)] p-[3px]"><span className="grid size-full place-items-center rounded-full border-[3px] border-white bg-brand text-2xl font-bold text-white">{creator.display_name[0]?.toUpperCase()}</span></span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-2xl font-extrabold">{creator.display_name}</h1>
          <span className="text-ink-2">@{creator.handle}{creator.home_city && ` · ${creator.home_city}`}{creator.languages.length > 0 && ` · ${creator.languages.join(', ')}`}</span>
          {creator.bio && <p className="max-w-[60ch] text-sm">{creator.bio}</p>}
          <div className="mt-1 flex flex-wrap gap-3 text-sm">
            {creator.instagram_handle && <a href={`https://instagram.com/${creator.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">Instagram<ExternalLink className="size-3.5" aria-hidden /></a>}
            <a href={`${siteUrl()}/@${creator.handle}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">Storefront<ExternalLink className="size-3.5" aria-hidden /></a>
          </div>
        </div>
        <InviteDialog creatorId={creator.id} handle={creator.handle} trips={invite.trips} floor={invite.floor} size="default" />
      </header>

      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Followers" value={creator.instagram_followers ? compactNumber(creator.instagram_followers) : '—'} note="Verified with Instagram" />
        <Kpi label="Avg reel views" value={views.length ? compactNumber(Math.round(views.reduce((a, b) => a + b, 0) / views.length)) : '—'} note="Reels linked to your trips" />
        <Kpi label="Links for your trips" value={linkRows.length} />
        <Kpi label="Sales from them" value={formatINR(t.gmv_paise)} note={`${formatINR(t.commission_paise)} commission`} />
      </div>

      <section className="mb-4 flex flex-col gap-3 rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><b>Results for your trips</b><RangeTabs path={path} current={range} /></div>
        <FunnelStrip items={[['Clicks', t.clicks.toLocaleString('en-IN')], ['Visitors', t.unique_visitors.toLocaleString('en-IN')], ['Leads', t.leads], ['Bookings', t.bookings], ['Conversion', rate(t.bookings, t.clicks)]]} />
      </section>

      <section className="mb-4 overflow-hidden rounded-2xl border bg-card">
        <div className="px-5 py-4"><h2 className="text-lg font-bold">Their reels and links for your trips</h2></div>
        {linkRows.length === 0 ? (
          <p className="border-t px-5 py-6 text-sm text-ink-2">@{creator.handle} hasn&apos;t shared your trips yet. Send an invite to get them started.</p>
        ) : (
          <ul>
            {linkRows.map((l) => {
              const g = byLink.get(l.link_id)
              return (
                <li key={l.link_id} className="flex items-center gap-3 border-t px-5 py-3.5">
                  {(l.reel_permalink || l.reel_thumbnail_url) && (l.reel_permalink
                    ? <a href={l.reel_permalink} target="_blank" rel="noopener noreferrer" className="w-10 shrink-0" aria-label="Open reel on Instagram"><ReelThumb src={l.reel_thumbnail_url} /></a>
                    : <span className="w-10 shrink-0"><ReelThumb src={l.reel_thumbnail_url} /></span>)}
                  <div className="min-w-0 flex-1">
                    <b className="block truncate">{l.label ?? l.trip_title}</b>
                    <span className="text-sm text-ink-2">{l.trip_title} · since {formatDateIST(todayIST(new Date(l.created_at)))}{l.reel_views != null && ` · ${compactNumber(l.reel_views)} views`}</span>
                  </div>
                  <div className="text-right text-sm"><b className="num">{plural(g?.clicks ?? 0, 'click')}</b><div className="text-ink-2 num">{plural(g?.leads ?? 0, 'lead')} · {plural(g?.bookings ?? 0, 'booking')}</div></div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <b>Invites</b>
          {(invites ?? []).length === 0 ? <p className="mt-2 text-sm text-ink-2">No invites yet.</p> : (
            <ul className="mt-2 flex flex-col gap-2">
              {(invites ?? []).map((i) => {
                const [label, tone] = INVITE[i.status] ?? ['Pending', 'warning']
                return <li key={i.id} className="flex items-center justify-between gap-2 text-sm"><span>{(i.trips as { title: string } | null)?.title}{i.commission_pct != null && ` · ${Number(i.commission_pct)}%`} <span className="text-ink-3">· {formatDateIST(todayIST(new Date(i.created_at)))}</span></span><Badge variant={tone}>{label}</Badge></li>
              })}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <b>Custom commission</b>
          {(overrides ?? []).length === 0 ? <p className="mt-2 text-sm text-ink-2">Standard trip rates apply. Send an invite with a custom rate; it applies once they accept.</p> : (
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {(overrides ?? []).map((o, k) => <li key={k} className="flex justify-between gap-2"><span>{(o.trips as { title: string }).title}</span><b className="num">{Number(o.commission_pct)}% from {formatDateIST(o.valid_from)}</b></li>)}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
