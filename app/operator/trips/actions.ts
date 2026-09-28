'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireCurrentOrg, requireTripAccess } from '@/lib/auth/guards'
import { rupeesToPaise } from '@/lib/domain/money'
import { readinessIssues, slugify } from '@/lib/domain/trips'
import { type ActionResult, AppError, toSafeError } from '@/lib/errors'
import { sanitizeImage } from '@/lib/media/image'
import { tripReadiness } from '@/lib/operator/readiness'
import { revalidatePublicTrip } from '@/lib/public/revalidate'
import { ratelimit } from '@/lib/security/ratelimit'
import { isUniqueViolation, throwIfError } from '@/lib/supabase/errors'
import {
  CommissionSchema,
  ItinerarySchema,
  MEDIA_MAX_BYTES,
  MEDIA_MIME,
  PickupSchema,
  TripDetailsSchema,
} from '@/lib/validation/trips'

const Id = z.uuid()
const MAX_MEDIA = 20

function detailsRow(d: z.output<typeof TripDetailsSchema>) {
  return {
    title: d.title,
    summary: d.summary || null,
    description_md: d.descriptionMd || null,
    trip_type: d.tripType,
    destination: d.destination,
    state: d.state || null,
    start_city: d.startCity || null,
    duration_days: d.durationDays,
    duration_nights: d.durationNights,
    difficulty: d.difficulty || null,
    min_age: d.minAge || null,
    max_group_size: d.maxGroupSize || null,
    from_price_paise: rupeesToPaise(d.fromPriceRupees),
    inclusions: d.inclusions,
    exclusions: d.exclusions,
    highlights: d.highlights,
    things_to_carry: d.thingsToCarry,
    cancellation_policy_id: d.cancellationPolicyId,
  }
}

async function assertPolicyUsable(supabase: Awaited<ReturnType<typeof requireCurrentOrg>>['supabase'], policyId: string, orgId: string) {
  const { data } = await supabase.from('cancellation_policies').select('org_id, is_system').eq('id', policyId).maybeSingle()
  const p = data as { org_id: string | null; is_system: boolean } | null
  if (!p || !(p.is_system || p.org_id === orgId)) throw new AppError('invalid_input', 'Pick a valid cancellation policy')
}

export async function createTrip(input: unknown): Promise<ActionResult> {
  let tripId: string
  try {
    const { supabase, org, id: userId } = await requireCurrentOrg()
    const data = TripDetailsSchema.parse(input)
    await ratelimit('trip:create', userId, 30, '1 h')
    await assertPolicyUsable(supabase, data.cancellationPolicyId, org.id)

    const base = slugify(`${data.title} ${data.destination}`)
    for (let attempt = 0; ; attempt++) {
      const slug = attempt === 0 ? base : `${base.slice(0, 44)}-${randomUUID().slice(0, 5)}`
      const { data: row, error } = await supabase
        .from('trips')
        .insert({ ...detailsRow(data), org_id: org.id, slug, status: 'draft' })
        .select('id')
        .single()
      if (!error) { tripId = (row as { id: string }).id; break }
      if (!isUniqueViolation(error) || attempt >= 3) throwIfError(error, 'create trip')
    }
  } catch (e) {
    return toSafeError(e)
  }
  redirect(`/operator/trips/${tripId}`)
}

export async function updateTripDetails(input: unknown): Promise<ActionResult> {
  try {
    const { tripId, ...rest } = z.object({ tripId: Id }).loose().parse(input)
    const { supabase, orgId } = await requireTripAccess(tripId)
    const data = TripDetailsSchema.parse(rest)
    await assertPolicyUsable(supabase, data.cancellationPolicyId, orgId)
    const { error } = await supabase.from('trips').update(detailsRow(data)).eq('id', tripId)
    throwIfError(error, 'update trip')
    revalidatePath(`/operator/trips/${tripId}`)
    await revalidatePublicTrip(supabase, tripId)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function saveItinerary(input: unknown): Promise<ActionResult> {
  try {
    const { tripId, ...rest } = z.object({ tripId: Id }).loose().parse(input)
    const { supabase } = await requireTripAccess(tripId)
    const { days } = ItinerarySchema.parse(rest)
    // Upsert by (trip_id, day_number) then trim extras, so a failure never leaves the itinerary empty.
    const { error } = await supabase.from('trip_itinerary_days').upsert(
      days.map((d, i) => ({ trip_id: tripId, day_number: i + 1, title: d.title, description: d.description || null, meals: d.meals, stay: d.stay || null })),
      { onConflict: 'trip_id,day_number' },
    )
    throwIfError(error, 'save itinerary')
    const { error: delErr } = await supabase.from('trip_itinerary_days').delete().eq('trip_id', tripId).gt('day_number', days.length)
    throwIfError(delErr, 'trim itinerary')
    revalidatePath(`/operator/trips/${tripId}`)
    await revalidatePublicTrip(supabase, tripId)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function uploadTripMedia(form: FormData): Promise<ActionResult> {
  try {
    const tripId = Id.parse(form.get('tripId'))
    const file = form.get('file')
    const { supabase, orgId, id: userId } = await requireTripAccess(tripId)
    await ratelimit('media:upload', userId, 100, '1 h')
    if (!(file instanceof File) || file.size === 0) throw new AppError('invalid_input', 'Choose a photo')
    if (file.size > MEDIA_MAX_BYTES) throw new AppError('invalid_input', 'Photos must be under 10 MB')
    if (!(MEDIA_MIME as readonly string[]).includes(file.type)) throw new AppError('invalid_input', 'Use JPG, PNG, WebP or AVIF')

    const { count } = await supabase.from('trip_media').select('id', { count: 'exact', head: true }).eq('trip_id', tripId)
    if ((count ?? 0) >= MAX_MEDIA) throw new AppError('invalid_input', `Up to ${MAX_MEDIA} photos per trip`)

    const img = await sanitizeImage(Buffer.from(await file.arrayBuffer()))
    const path = `orgs/${orgId}/trips/${tripId}/${randomUUID()}.${img.ext}`
    const { error: upErr } = await supabase.storage.from('public-media').upload(path, img.buffer, { contentType: img.contentType })
    throwIfError(upErr && { message: upErr.message }, 'media upload')

    const { error } = await supabase.from('trip_media').insert({ trip_id: tripId, storage_path: path, sort_order: count ?? 0 })
    throwIfError(error, 'media row')
    // first photo becomes the cover
    await supabase.from('trips').update({ cover_image_path: path }).eq('id', tripId).is('cover_image_path', null)
    revalidatePath(`/operator/trips/${tripId}`)
    await revalidatePublicTrip(supabase, tripId)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function setCover(input: unknown): Promise<ActionResult> {
  try {
    const { tripId, mediaId } = z.object({ tripId: Id, mediaId: Id }).parse(input)
    const { supabase } = await requireTripAccess(tripId)
    const { data: m } = await supabase.from('trip_media').select('storage_path').eq('id', mediaId).eq('trip_id', tripId).single()
    if (!m) throw new AppError('invalid_input', 'Photo not found')
    const { error } = await supabase.from('trips').update({ cover_image_path: (m as { storage_path: string }).storage_path }).eq('id', tripId)
    throwIfError(error, 'set cover')
    revalidatePath(`/operator/trips/${tripId}`)
    await revalidatePublicTrip(supabase, tripId)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function deleteTripMedia(input: unknown): Promise<ActionResult> {
  try {
    const { tripId, mediaId } = z.object({ tripId: Id, mediaId: Id }).parse(input)
    const { supabase } = await requireTripAccess(tripId)
    const { data: m } = await supabase.from('trip_media').delete().eq('id', mediaId).eq('trip_id', tripId).select('storage_path').single()
    const path = (m as { storage_path: string } | null)?.storage_path
    if (!path) throw new AppError('invalid_input', 'Photo not found')
    await supabase.storage.from('public-media').remove([path])
    const { data: next } = await supabase.from('trip_media').select('storage_path').eq('trip_id', tripId).order('sort_order').limit(1).maybeSingle()
    await supabase.from('trips').update({ cover_image_path: (next as { storage_path: string } | null)?.storage_path ?? null })
      .eq('id', tripId).eq('cover_image_path', path)
    revalidatePath(`/operator/trips/${tripId}`)
    await revalidatePublicTrip(supabase, tripId)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function addPickup(input: unknown): Promise<ActionResult> {
  try {
    const { tripId, ...rest } = z.object({ tripId: Id }).loose().parse(input)
    const { supabase } = await requireTripAccess(tripId)
    const p = PickupSchema.parse(rest)
    const { error } = await supabase.from('trip_pickup_points').insert({
      trip_id: tripId, city: p.city, point: p.point, time_note: p.timeNote || null, extra_price_paise: rupeesToPaise(p.extraPriceRupees),
    })
    throwIfError(error, 'add pickup')
    revalidatePath(`/operator/trips/${tripId}`)
    await revalidatePublicTrip(supabase, tripId)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function deletePickup(input: unknown): Promise<ActionResult> {
  try {
    const { tripId, pickupId } = z.object({ tripId: Id, pickupId: Id }).parse(input)
    const { supabase } = await requireTripAccess(tripId)
    const { error } = await supabase.from('trip_pickup_points').delete().eq('id', pickupId).eq('trip_id', tripId)
    throwIfError(error, 'delete pickup')
    revalidatePath(`/operator/trips/${tripId}`)
    await revalidatePublicTrip(supabase, tripId)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function saveCommission(input: unknown): Promise<ActionResult> {
  try {
    const { tripId, ...rest } = z.object({ tripId: Id }).loose().parse(input)
    const { supabase } = await requireTripAccess(tripId, ['owner', 'manager'])
    const { creatorCommissionPct } = CommissionSchema.parse(rest)
    const { data: setting } = await supabase.rpc('get_public_setting', { p_key: 'commission' })
    const floor = Number((setting as { min_creator_pct?: number } | null)?.min_creator_pct ?? 8)
    if (creatorCommissionPct < floor) throw new AppError('invalid_input', `Creator commission must be at least ${floor}%`)
    const { error } = await supabase
      .from('trip_commercials')
      .upsert({ trip_id: tripId, creator_commission_pct: creatorCommissionPct, updated_at: new Date().toISOString() }, { onConflict: 'trip_id' })
    throwIfError(error, 'save commission')
    revalidatePath(`/operator/trips/${tripId}`)
    await revalidatePublicTrip(supabase, tripId)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function changeTripStatus(input: unknown): Promise<ActionResult> {
  try {
    const { tripId, to } = z.object({ tripId: Id, to: z.enum(['draft', 'pending_review', 'published', 'paused', 'archived']) }).parse(input)
    const { supabase } = await requireTripAccess(tripId, to === 'archived' ? ['owner', 'manager'] : ['owner', 'manager', 'staff'])

    if (to === 'pending_review') {
      const issues = readinessIssues(await tripReadiness(supabase, tripId))
      if (issues.length) throw new AppError('invalid_input', `Before submitting: ${issues.join('; ')}`)
    }
    // guard_trips() is the real enforcer of which transitions an operator may make.
    const { error } = await supabase.from('trips').update({ status: to }).eq('id', tripId)
    throwIfError(error, 'change status')
    revalidatePath(`/operator/trips/${tripId}`)
    await revalidatePublicTrip(supabase, tripId)
    revalidatePath('/operator/trips')
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}
