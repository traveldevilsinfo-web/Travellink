import 'server-only'
import { handleFromUsername, nextCreatorStatus, type CreatorStatus } from '@/lib/domain/creator-gate'
import { todayIST } from '@/lib/domain/dates'
import type { IgProfile } from '@/lib/integrations/instagram'
import { encrypt } from '@/lib/security/crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { throwIfError } from '@/lib/supabase/errors'

/**
 * Creates/updates the creator from a server-verified Instagram profile.
 * Service role on purpose: follower counts must come from Meta (or the dev simulator), never from the
 * client, so no client-writable path exists for them (AGENTS.md rule 3 exception, ARCHITECTURE §20.2).
 * `userId` is always the authenticated session user.
 */
export async function upsertCreatorFromInstagram(userId: string, profile: IgProfile, token: { value: string; expiresAt: Date } | null) {
  const db = createAdminClient()
  const { data: setting } = await db.from('app_settings').select('value').eq('key', 'creator').single()
  const minFollowers = Number((setting?.value as { min_followers?: number } | null)?.min_followers ?? 1000)

  // The same Instagram account can't back two TripLink creators.
  const { data: owner } = await db.from('creator_social_accounts').select('creator_id, creators(user_id)').eq('provider_user_id', profile.user_id).maybeSingle()
  const ownerUser = (owner?.creators as { user_id: string } | null)?.user_id
  if (ownerUser && ownerUser !== userId) return { status: 'taken' as const }

  const { data: existing } = await db.from('creators').select('id, status').eq('user_id', userId).maybeSingle()
  const status = nextCreatorStatus((existing?.status as CreatorStatus | undefined) ?? null, profile.followers_count, minFollowers)

  let creatorId = existing?.id as string | undefined
  if (creatorId) {
    const { error } = await db.from('creators').update({ status, instagram_handle: profile.username, instagram_followers: profile.followers_count, instagram_verified: true }).eq('id', creatorId)
    throwIfError(error, 'update creator')
  } else {
    const base = handleFromUsername(profile.username)
    for (let i = 0; i < 5 && !creatorId; i++) {
      const handle = i === 0 ? base : `${base.slice(0, 26)}_${Math.random().toString(36).slice(2, 5)}`
      const { data, error } = await db.from('creators').insert({
        user_id: userId, handle, display_name: profile.name?.trim() || profile.username,
        instagram_handle: profile.username, instagram_followers: profile.followers_count, instagram_verified: true, status,
      }).select('id').single()
      if (!error) creatorId = data.id
      else if (error.code !== '23505') throwIfError(error, 'create creator')
    }
    if (!creatorId) throw new Error('could not allocate a handle')
    await db.from('creator_private').insert({ creator_id: creatorId })
  }

  const { error: sErr } = await db.from('creator_social_accounts').upsert({
    creator_id: creatorId, provider: 'instagram', provider_user_id: profile.user_id, username: profile.username,
    account_type: profile.account_type ?? null, profile_picture_url: profile.profile_picture_url ?? null,
    followers_count: profile.followers_count, media_count: profile.media_count ?? null,
    token_encrypted: token ? encrypt(token.value) : null, token_expires_at: token?.expiresAt.toISOString() ?? null,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: 'creator_id' })
  throwIfError(sErr, 'social account')
  await db.from('creator_social_snapshots').upsert({ creator_id: creatorId, day: todayIST(), followers_count: profile.followers_count }, { onConflict: 'creator_id,day' })
  return { status, creatorId }
}

/** Dev-only stand-in for Instagram while Meta App Review is pending (ARCHITECTURE §20.2). */
export function simulationAllowed(): boolean {
  return process.env.ALLOW_IG_SIMULATION === 'true' && process.env.VERCEL_ENV !== 'production' && process.env.NODE_ENV !== 'production'
}
