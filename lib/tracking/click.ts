import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

// Server-only click logging for /r/[code]. Service role on purpose: clicks and creator_links have no
// public read/write policies, and the redirect must work for anonymous followers (AGENTS.md rule 3).

export type ResolvedLink = {
  linkId: string; creatorId: string; handle: string; tripSlug: string | null; live: boolean
}

export async function resolveLink(code: string): Promise<ResolvedLink | null> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('creator_links')
    .select('id, is_active, creator_id, creators!creator_links_creator_id_fkey!inner(handle, status), trips!creator_links_trip_id_fkey(slug, status)')
    .eq('code', code)
    .maybeSingle()
  if (error) console.error('resolveLink', error.code, error.message)
  if (!data) return null
  const creator = data.creators as unknown as { handle: string; status: string }
  const t = data.trips as unknown as { slug: string; status: string } | null
  return {
    linkId: data.id,
    creatorId: data.creator_id,
    handle: creator.handle,
    tripSlug: t && t.status === 'published' ? t.slug : null,
    live: data.is_active && creator.status === 'active',
  }
}

export async function logClick(c: { linkId: string; creatorId: string; tripId?: string | null; visitorId: string; ipHash: string; uaHash: string; referrer: string | null; isBot: boolean; clickId: string }) {
  const { error } = await createAdminClient().from('clicks').insert({
    link_id: c.linkId, creator_id: c.creatorId, trip_id: c.tripId ?? null, visitor_id: c.visitorId,
    ip_hash: c.ipHash, ua_hash: c.uaHash, referrer: c.referrer, is_bot: c.isBot, click_id: c.clickId,
  })
  if (error) console.error('logClick', error.code) // no PII
}
