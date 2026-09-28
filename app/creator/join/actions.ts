'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireUser } from '@/lib/auth/guards'
import { simulationAllowed, upsertCreatorFromInstagram } from '@/lib/creator/connect'
import { type ActionResult, AppError, toSafeError } from '@/lib/errors'
import { ratelimit } from '@/lib/security/ratelimit'
import { throwIfError, isUniqueViolation } from '@/lib/supabase/errors'

/** Dev-only Instagram stand-in (ARCHITECTURE §20.2). Refuses unless ALLOW_IG_SIMULATION=true outside production. */
export async function simulateInstagram(input: unknown): Promise<ActionResult> {
  try {
    if (!simulationAllowed()) throw new AppError('forbidden', 'Instagram simulation is disabled')
    const user = await requireUser('/creator/join/connect')
    const { followers, username } = z.object({ followers: z.coerce.number<string | number>().int().min(0).max(100_000_000), username: z.string().regex(/^[a-zA-Z0-9_.]{1,30}$/) }).parse(input)
    await ratelimit('ig:sim', user.id, 20, '10 m')
    const res = await upsertCreatorFromInstagram(user.id, { user_id: `sim_${user.id}`, username, name: username, account_type: 'MEDIA_CREATOR', followers_count: followers, media_count: 120 }, null)
    if (res.status === 'taken') throw new AppError('invalid_input', 'That Instagram account is already connected to another TripLink creator.')
  } catch (e) {
    return toSafeError(e)
  }
  redirect('/creator/join/check')
}

const ProfileSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter your name').max(60),
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,30}$/, 'Use 3–30 letters, numbers, dots or underscores'),
  homeCity: z.string().trim().max(60),
  bio: z.string().trim().max(200),
})
export type ProfileInput = z.input<typeof ProfileSchema>

export async function saveCreatorProfile(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser('/creator/join/profile')
    const d = ProfileSchema.parse(input)
    await ratelimit('creator:profile', user.id, 20, '1 h')
    // creators_self_update RLS + guard_creators: only own row, and status/tier/referral stay locked.
    const { error } = await user.supabase.from('creators')
      .update({ display_name: d.displayName, handle: d.handle, home_city: d.homeCity || null, bio: d.bio || null })
      .eq('user_id', user.id)
    if (isUniqueViolation(error)) throw new AppError('invalid_input', `triplink.in/@${d.handle} is taken. Try another.`)
    throwIfError(error, 'save profile')
  } catch (e) {
    return toSafeError(e)
  }
  redirect('/creator/join/rules')
}

export async function acceptCreatorRules(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser('/creator/join/rules')
    z.object({ disclose: z.literal(true), honest: z.literal(true), earnings: z.literal(true) }, 'Tick all three to continue').parse(input)
    const { error } = await user.supabase.from('consents').insert({ user_id: user.id, purpose: 'creator_agreement', granted: true, version: 'v1' })
    throwIfError(error, 'consent')
  } catch (e) {
    return toSafeError(e)
  }
  redirect('/creator')
}
