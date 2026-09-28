'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/guards'
import { type ActionResult, AppError, toSafeError } from '@/lib/errors'
import { ratelimit } from '@/lib/security/ratelimit'
import { ProfileSchema } from '@/lib/validation/auth'

const MARKETING_CONSENT_VERSION = 'v1'

export async function updateProfile(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser('/account/profile')
    const data = ProfileSchema.parse(input)
    await ratelimit('profile:update', user.id, 20, '1 h')

    const { data: before } = await user.supabase.from('profiles').select('marketing_opt_in').eq('id', user.id).single()
    const { error } = await user.supabase
      .from('profiles')
      .update({ full_name: data.fullName, city: data.city || null, marketing_opt_in: data.marketingOptIn })
      .eq('id', user.id)
    if (error) throw new AppError('upstream', error.message)

    // DPDP: every change to marketing consent is recorded (ARCHITECTURE §8.3).
    if (before && before.marketing_opt_in !== data.marketingOptIn) {
      await user.supabase.from('consents').insert({
        user_id: user.id,
        purpose: 'marketing_whatsapp',
        granted: data.marketingOptIn,
        version: MARKETING_CONSENT_VERSION,
      })
    }
    revalidatePath('/account/profile')
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}
