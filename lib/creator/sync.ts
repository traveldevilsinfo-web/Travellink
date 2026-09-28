import 'server-only'
import { upsertCreatorFromInstagram, simulationAllowed } from '@/lib/creator/connect'
import { todayIST } from '@/lib/domain/dates'
import { fetchProfile, fetchReels, refreshToken, type IgReel } from '@/lib/integrations/instagram'
import { decrypt } from '@/lib/security/crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { throwIfError } from '@/lib/supabase/errors'

// Instagram → creator_reels / snapshots. Service role because the data comes from Meta, never the client
// (AGENTS.md rule 3: provider-verified data + cron). Callers pass the creator id from the session or the cron.

async function saveReels(creatorId: string, reels: IgReel[]) {
  if (!reels.length) return 0
  const db = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await db.from('creator_reels').upsert(reels.map((r) => ({
    creator_id: creatorId, ig_media_id: r.id, media_type: r.media_type, permalink: r.permalink, thumbnail_url: r.thumbnail_url,
    caption: r.caption, posted_at: r.posted_at, views: r.views, likes: r.likes, comments: r.comments, synced_at: now,
  })), { onConflict: 'creator_id,ig_media_id' })
  throwIfError(error, 'save reels')
  const withViews = reels.filter((r) => r.views != null)
  if (withViews.length) {
    const avg = Math.round(withViews.reduce((s, r) => s + r.views!, 0) / withViews.length)
    await db.from('creator_social_snapshots').update({ avg_reel_views: avg }).eq('creator_id', creatorId).eq('day', todayIST())
  }
  return reels.length
}

/** Dev stand-in while Meta App Review is pending: stable fake reels per creator. */
export function simulatedReels(creatorId: string): IgReel[] {
  const captions = ['Chakrata in 48 hours 🌲', 'Budget Spiti road trip', 'Kasol café hopping', 'Rishikesh rafting day', 'Weekend in Jibhi', 'Tiger Falls at sunrise']
  const seed = parseInt(creatorId.replace(/-/g, '').slice(0, 6), 16) || 1
  return captions.map((caption, i) => ({
    id: `sim_${creatorId.slice(0, 8)}_${i}`, media_type: 'VIDEO', permalink: `https://www.instagram.com/reel/SIM${seed.toString(36)}${i}/`,
    thumbnail_url: null, caption, posted_at: new Date(Date.now() - (i * 4 + 1) * 86_400_000).toISOString(),
    likes: ((seed * (i + 7)) % 900) + 100, comments: ((seed * (i + 3)) % 60) + 5, views: ((seed * 7919 * (i + 1)) % 48_000) + 1_200,
  }))
}

/** Picker "Refresh": pull the latest reels for one creator. */
export async function refreshReels(creatorId: string): Promise<number> {
  const db = createAdminClient()
  const { data: acct } = await db.from('creator_social_accounts').select('token_encrypted, provider_user_id').eq('creator_id', creatorId).maybeSingle()
  if (acct?.token_encrypted) return saveReels(creatorId, await fetchReels(decrypt(acct.token_encrypted)))
  if (simulationAllowed() && acct?.provider_user_id.startsWith('sim_')) return saveReels(creatorId, simulatedReels(creatorId))
  return 0
}

const REFRESH_WITHIN_MS = 15 * 86_400_000

/**
 * Daily: refresh expiring tokens, followers (→ waitlist promotion via nextCreatorStatus), reels and views;
 * then promote anyone already over the minimum (e.g. after the minimum is lowered).
 * ponytail: 150 oldest-synced accounts per run fits the 300 s limit; queue/fan-out when creators outgrow it.
 */
export async function dailyInstagramSync() {
  const db = createAdminClient()
  const { data: accts, error } = await db.from('creator_social_accounts')
    .select('creator_id, token_encrypted, token_expires_at, creators!inner(user_id)')
    .not('token_encrypted', 'is', null)
    .order('last_synced_at', { ascending: true })
    .limit(150)
  throwIfError(error, 'load accounts')
  let synced = 0, failed = 0
  for (const a of accts ?? []) {
    try {
      let token = { value: decrypt(a.token_encrypted!), expiresAt: new Date(a.token_expires_at ?? 0) }
      if (token.expiresAt.getTime() < Date.now()) { failed++; continue } // expired: creator must reconnect
      if (token.expiresAt.getTime() - Date.now() < REFRESH_WITHIN_MS) {
        const r = await refreshToken(token.value)
        token = { value: r.token, expiresAt: r.expiresAt }
      }
      const userId = (a.creators as unknown as { user_id: string }).user_id
      await upsertCreatorFromInstagram(userId, await fetchProfile(token.value), token)
      await saveReels(a.creator_id, await fetchReels(token.value))
      synced++
    } catch (e) {
      failed++
      console.error('ig sync', a.creator_id, e instanceof Error ? e.message : 'error') // ids only, never tokens
    }
  }
  const { data: promoted, error: pErr } = await db.rpc('promote_waitlist')
  throwIfError(pErr, 'promote waitlist')
  return { synced, failed, promoted: promoted ?? 0 }
}
