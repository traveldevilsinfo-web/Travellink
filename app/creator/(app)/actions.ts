'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireActiveCreator } from '@/lib/creator/queries'
import { refreshReels } from '@/lib/creator/sync'
import { type ActionResult, toSafeError } from '@/lib/errors'
import { ratelimit } from '@/lib/security/ratelimit'
import { throwIfError } from '@/lib/supabase/errors'
import { CollectionSchema, CreateLinkSchema, StorefrontListSchema } from '@/lib/validation/links'

const revalidateStorefront = (handle: string) => { revalidatePath('/creator/storefront'); revalidatePath(`/c/${handle}`) }

export async function createLink(input: unknown): Promise<ActionResult<{ code: string }>> {
  try {
    const { supabase, creator } = await requireActiveCreator('/creator/trips')
    const data = CreateLinkSchema.parse(input)
    await ratelimit('link:create', creator.id, 60, '1 h')
    // RLS (links_own_insert) re-checks own creator id + active status; the composite FK keeps reel_id to own reels.
    const { data: row, error } = await supabase
      .from('creator_links')
      .insert({ creator_id: creator.id, trip_id: data.tripId, label: data.label, channel: 'instagram', reel_id: data.reelId ?? null })
      .select('code')
      .single()
    throwIfError(error, 'create link')
    if (data.tripId) {
      // A linked trip joins the end of the storefront's main list (no-op if it's already there).
      const { data: last } = await supabase.from('storefront_items').select('position').eq('creator_id', creator.id).is('collection_id', null).order('position', { ascending: false }).limit(1).maybeSingle()
      await supabase.from('storefront_items').insert({ creator_id: creator.id, trip_id: data.tripId, position: (last?.position ?? 0) + 1 })
      revalidateStorefront(creator.handle)
    }
    revalidatePath('/creator/links')
    return { ok: true, data: { code: String(row!.code) } }
  } catch (e) {
    return toSafeError(e)
  }
}

export type ReelOption = { id: string; permalink: string | null; thumbnail_url: string | null; caption: string | null; posted_at: string | null; views: number | null }

/** Reels for the Get link picker; `refresh` pulls the latest from Instagram first. */
export async function myReels(input: unknown): Promise<ActionResult<ReelOption[]>> {
  try {
    const { supabase, creator } = await requireActiveCreator('/creator/trips')
    const { refresh } = z.object({ refresh: z.boolean() }).parse(input)
    if (refresh) {
      await ratelimit('reels:refresh', creator.id, 6, '1 h')
      await refreshReels(creator.id)
    }
    const { data, error } = await supabase.from('creator_reels').select('id, permalink, thumbnail_url, caption, posted_at, views').eq('creator_id', creator.id).order('posted_at', { ascending: false, nullsFirst: false }).limit(12)
    throwIfError(error, 'reels')
    return { ok: true, data: data ?? [] }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function saveStorefrontList(input: unknown): Promise<ActionResult> {
  try {
    const { supabase, creator } = await requireActiveCreator('/creator/storefront')
    const d = StorefrontListSchema.parse(input)
    await ratelimit('storefront:save', creator.id, 120, '1 h')
    const { error } = await supabase.rpc('set_storefront_list', { p_collection: d.collectionId as string, p_trip_ids: d.tripIds })
    throwIfError(error, 'save storefront')
    revalidateStorefront(creator.handle)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function createCollection(input: unknown): Promise<ActionResult> {
  try {
    const { supabase, creator } = await requireActiveCreator('/creator/storefront')
    const { title } = CollectionSchema.parse(input)
    await ratelimit('storefront:save', creator.id, 120, '1 h')
    const { count } = await supabase.from('storefront_collections').select('id', { count: 'exact', head: true }).eq('creator_id', creator.id)
    if ((count ?? 0) >= 12) return { ok: false, error: 'You can have up to 12 collections.' }
    const { error } = await supabase.from('storefront_collections').insert({ creator_id: creator.id, title, position: (count ?? 0) + 1 })
    throwIfError(error, 'create collection')
    revalidateStorefront(creator.handle)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function deleteCollection(input: unknown): Promise<ActionResult> {
  try {
    const { supabase, creator } = await requireActiveCreator('/creator/storefront')
    const { id } = z.object({ id: z.guid() }).parse(input)
    const { error } = await supabase.from('storefront_collections').delete().eq('id', id).eq('creator_id', creator.id)
    throwIfError(error, 'delete collection')
    revalidateStorefront(creator.handle)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}
