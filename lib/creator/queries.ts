import 'server-only'
import { redirect } from 'next/navigation'
import { requireUser, type SessionUser } from '@/lib/auth/guards'
import { todayIST } from '@/lib/domain/dates'

type Sb = SessionUser['supabase']

export type CreatorContext = SessionUser & {
  creator: { id: string; handle: string; display_name: string; status: string; tier: string; home_city: string | null; bio: string | null }
  social: { username: string; followers_count: number; media_count: number | null; profile_picture_url: string | null } | null
}

/** Active creator or a redirect into the join flow (ARCHITECTURE §20.2). */
export async function requireActiveCreator(next = '/creator'): Promise<CreatorContext> {
  const user = await requireUser(next)
  const { data: creator } = await user.supabase
    .from('creators')
    .select('id, handle, display_name, status, tier, home_city, bio')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!creator) redirect('/creator/join')
  if (creator.status !== 'active') redirect('/creator/join/check')
  const { count: agreed } = await user.supabase.from('consents').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('purpose', 'creator_agreement').eq('granted', true)
  if (!agreed) redirect('/creator/join/rules')
  const { data: social } = await user.supabase
    .from('creator_social_accounts')
    .select('username, followers_count, media_count, profile_picture_url')
    .eq('creator_id', creator.id)
    .maybeSingle()
  return { ...user, creator, social }
}

export type CatalogTrip = {
  id: string; slug: string; title: string; destination: string; state: string | null
  duration_days: number; duration_nights: number; from_price_paise: number; cover_image_path: string | null
  booking_mode: 'platform' | 'redirect' | 'enquiry'; lead_fee_paise: number
  organizations: { name: string } | null
  trip_commercials: { creator_commission_pct: number } | null
  departures: { start_date: string; status: string }[]
}

const CATALOG = `id, slug, title, destination, state, duration_days, duration_nights, from_price_paise, cover_image_path,
  booking_mode, lead_fee_paise, organizations(name), trip_commercials(creator_commission_pct),
  departures(start_date, status)`

/** Published trips with this creator's commission. trip_commercials RLS only shows rates to active creators. */
export async function catalog(sb: Sb, opts: { slug?: string; limit?: number } = {}) {
  let q = sb.from('trips').select(CATALOG).eq('status', 'published').gte('departures.start_date', todayIST()).order('published_at', { ascending: false })
  if (opts.slug) q = q.eq('slug', opts.slug)
  if (opts.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw new Error(`catalog: ${error.message}`)
  return (data ?? []) as unknown as CatalogTrip[]
}

export const commissionPct = (t: CatalogTrip) => Number(t.trip_commercials?.creator_commission_pct ?? 0)
/** What the creator earns per traveler at the "from" price, in paise. */
export const earnPerTravelerPaise = (t: CatalogTrip) => Math.round((t.from_price_paise * commissionPct(t)) / 100)
export const nextDeparture = (t: CatalogTrip) => t.departures.filter((d) => d.status === 'open').map((d) => d.start_date).sort()[0] ?? null

export type LinkRow = {
  id: string; code: string; label: string | null; trip_id: string | null; created_at: string; trips: { title: string; slug: string } | null
  creator_reels: { permalink: string | null; thumbnail_url: string | null; views: number | null } | null
}
export type StatRow = { day: string; link_id: string | null; clicks: number; unique_visitors: number; leads: number; bookings: number; gmv_paise: number; commission_paise: number }

export async function linksWithStats(sb: Sb, creatorId: string, sinceDay?: string) {
  const [links, stats] = await Promise.all([
    sb.from('creator_links').select('id, code, label, trip_id, created_at, trips!creator_links_trip_id_fkey(title, slug), creator_reels!creator_links_reel_fk(permalink, thumbnail_url, views)').eq('creator_id', creatorId).eq('is_active', true).order('created_at', { ascending: false }),
    (sinceDay ? sb.from('creator_daily_stats').select('*').eq('creator_id', creatorId).gte('day', sinceDay) : sb.from('creator_daily_stats').select('*').eq('creator_id', creatorId)),
  ])
  const rows = (stats.data ?? []) as StatRow[]
  const per = new Map<string, Omit<StatRow, 'day' | 'link_id'>>()
  const total = { clicks: 0, unique_visitors: 0, leads: 0, bookings: 0, gmv_paise: 0, commission_paise: 0 }
  for (const r of rows) {
    for (const k of Object.keys(total) as (keyof typeof total)[]) total[k] += Number(r[k])
    if (!r.link_id) continue
    const cur = per.get(r.link_id) ?? { clicks: 0, unique_visitors: 0, leads: 0, bookings: 0, gmv_paise: 0, commission_paise: 0 }
    for (const k of Object.keys(cur) as (keyof typeof cur)[]) cur[k] += Number(r[k])
    per.set(r.link_id, cur)
  }
  const empty = { clicks: 0, unique_visitors: 0, leads: 0, bookings: 0, gmv_paise: 0, commission_paise: 0 }
  return {
    links: ((links.data ?? []) as unknown as LinkRow[]).map((l) => ({ ...l, stats: per.get(l.id) ?? empty })),
    total,
    daily: rows,
  }
}

export type CommissionRow = {
  id: string; trip_title: string; departure_start: string; travelers_count: number; amount_paise: number
  status: 'pending' | 'confirmed' | 'payable' | 'in_payout' | 'paid' | 'reversed' | 'on_hold'
  confirmable_at: string; payable_at: string; reversed_reason: string | null; created_at: string
}
export async function commissions(sb: Sb, creatorId: string) {
  const { data } = await sb
    .from('commissions')
    .select('id, trip_title, departure_start, travelers_count, amount_paise, status, confirmable_at, payable_at, reversed_reason, created_at')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
  return (data ?? []) as CommissionRow[]
}

export function monthStartIST(): string {
  return `${todayIST().slice(0, 7)}-01`
}
