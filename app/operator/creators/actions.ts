'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentOrg } from '@/lib/auth/guards'
import { type ActionResult, AppError, toSafeError } from '@/lib/errors'
import { ratelimit } from '@/lib/security/ratelimit'
import { isUniqueViolation, throwIfError } from '@/lib/supabase/errors'
import { InviteSchema } from '@/lib/validation/invites'

/** RLS (ci_insert) re-checks: manager of this org, own public trip, active creator, commission ≥ floor. */
export async function inviteCreator(input: unknown): Promise<ActionResult> {
  try {
    const { supabase, org, id: userId } = await requireCurrentOrg(['owner', 'manager'])
    const d = InviteSchema.parse(input)
    await ratelimit('invite:create', userId, 100, '1 d')
    const { data: setting } = await supabase.rpc('get_public_setting', { p_key: 'commission' })
    const floor = Number((setting as { min_creator_pct?: number } | null)?.min_creator_pct ?? 8)
    if (d.commissionPct !== '' && d.commissionPct < floor) throw new AppError('invalid_input', `Custom commission must be at least ${floor}%`)
    const { error } = await supabase.from('collab_invites').insert({
      org_id: org.id, trip_id: d.tripId, creator_id: d.creatorId, commission_pct: d.commissionPct === '' ? null : d.commissionPct, message: d.message || null,
    })
    if (isUniqueViolation(error)) throw new AppError('invalid_input', 'This creator already has an open invite for that trip.')
    if (error?.code === '42501') throw new AppError('invalid_input', 'Only published trips can be shared with creators.')
    throwIfError(error, 'invite')
    revalidatePath(`/operator/creators/${d.creatorId}`)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}
