import 'server-only'
import type { SessionUser } from '@/lib/auth/guards'
import type { StatRow } from '@/lib/domain/performance'
import { throwIfError } from '@/lib/supabase/errors'

type Sb = SessionUser['supabase']
export type CreatorCard = { id: string; handle: string; display_name: string; instagram_followers: number | null; home_city: string | null }

/** org_daily_stats rows (RLS: own org) plus the creators and trips they mention. Never raw clicks. */
export async function orgPerformance(sb: Sb, orgId: string, from: string, to: string, creatorId?: string) {
  let q = sb.from('org_daily_stats')
    .select('day, trip_id, creator_id, link_id, clicks, unique_visitors, leads, bookings, gmv_paise, commission_paise')
    .eq('org_id', orgId).gte('day', from).lte('day', to)
  if (creatorId) q = q.eq('creator_id', creatorId)
  const { data, error } = await q
  throwIfError(error, 'org stats')
  const rows = (data ?? []) as StatRow[]
  const creatorIds = [...new Set(rows.map((r) => r.creator_id))]
  const [{ data: creators }, { data: trips }] = await Promise.all([
    creatorIds.length ? sb.from('creators').select('id, handle, display_name, instagram_followers, home_city').in('id', creatorIds) : Promise.resolve({ data: [] }),
    sb.from('trips').select('id, title').eq('org_id', orgId),
  ])
  return {
    rows,
    creators: new Map(((creators ?? []) as CreatorCard[]).map((c) => [c.id, c])),
    trips: new Map((trips ?? []).map((t) => [t.id, t.title])),
  }
}

/** Published trips an operator can invite creators to, with the standard rate, plus the commission floor. */
export async function inviteOptions(sb: Sb, orgId: string) {
  const [{ data: trips }, { data: setting }] = await Promise.all([
    sb.from('trips').select('id, title, trip_commercials(creator_commission_pct)').eq('org_id', orgId).eq('status', 'published').order('title'),
    sb.rpc('get_public_setting', { p_key: 'commission' }),
  ])
  return {
    trips: (trips ?? []).map((t) => ({ id: t.id, title: t.title, pct: (t.trip_commercials as { creator_commission_pct: number } | null)?.creator_commission_pct != null ? Number((t.trip_commercials as { creator_commission_pct: number }).creator_commission_pct) : null })),
    floor: Number((setting as { min_creator_pct?: number } | null)?.min_creator_pct ?? 8),
  }
}
