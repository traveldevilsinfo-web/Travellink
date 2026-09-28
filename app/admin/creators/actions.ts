'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { type ActionResult, AppError, toSafeError } from '@/lib/errors'
import { ratelimit } from '@/lib/security/ratelimit'
import { throwIfError } from '@/lib/supabase/errors'

const OverrideSchema = z.object({ id: z.guid(), reason: z.string().trim().min(5, 'Give a reason (min 5 characters)').max(300) })

/** Manual waitlist → active (e.g. followers checked from a screenshot before Meta App Review). The creators
 *  audit trigger records the admin, before/after and status_note, so the reason is audited with the change. */
export async function activateCreator(input: unknown): Promise<ActionResult> {
  try {
    const { supabase, id: adminId } = await requireAdmin('ops', '/admin/creators')
    const d = OverrideSchema.parse(input)
    await ratelimit('admin:review', adminId, 200, '1 h')
    const { data, error } = await supabase.from('creators').update({ status: 'active', status_note: `admin: ${d.reason}` }).eq('id', d.id).eq('status', 'waitlist').select('handle')
    throwIfError(error, 'activate creator')
    if (!data?.length) throw new AppError('invalid_input', 'This creator is no longer on the waitlist')
    revalidatePath('/admin/creators')
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}
