'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveCreator } from '@/lib/creator/queries'
import { type ActionResult, toSafeError } from '@/lib/errors'
import { ratelimit } from '@/lib/security/ratelimit'
import { throwIfError } from '@/lib/supabase/errors'
import { CreateLinkSchema } from '@/lib/validation/links'

export async function createLink(input: unknown): Promise<ActionResult<{ code: string }>> {
  try {
    const { supabase, creator } = await requireActiveCreator('/creator/trips')
    const data = CreateLinkSchema.parse(input)
    await ratelimit('link:create', creator.id, 60, '1 h')
    // RLS (links_own_insert) re-checks: own creator id + active status.
    const { data: row, error } = await supabase
      .from('creator_links')
      .insert({ creator_id: creator.id, trip_id: data.tripId, label: data.label, channel: 'instagram' })
      .select('code')
      .single()
    throwIfError(error, 'create link')
    revalidatePath('/creator/links')
    return { ok: true, data: { code: String(row!.code) } }
  } catch (e) {
    return toSafeError(e)
  }
}
