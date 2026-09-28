'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTripAccess } from '@/lib/auth/guards'
import { daysBetween, todayIST } from '@/lib/domain/dates'
import { rupeesToPaise } from '@/lib/domain/money'
import { type ActionResult, AppError, toSafeError } from '@/lib/errors'
import { throwIfError } from '@/lib/supabase/errors'
import { DepartureSchema } from '@/lib/validation/trips'

const Id = z.uuid()

export async function saveDeparture(input: unknown): Promise<ActionResult> {
  try {
    const { tripId, departureId, ...rest } = z.object({ tripId: Id, departureId: Id.optional() }).loose().parse(input)
    const { supabase } = await requireTripAccess(tripId)
    const d = DepartureSchema.parse(rest)

    const { data: trip } = await supabase.from('trips').select('duration_days').eq('id', tripId).single()
    const duration = (trip as { duration_days: number }).duration_days
    if (daysBetween(d.startDate, d.endDate) !== duration - 1) {
      throw new AppError('invalid_input', `This is a ${duration}-day trip, so the end date must be ${duration - 1} day(s) after the start`)
    }
    if (d.startDate <= todayIST()) throw new AppError('invalid_input', 'Start date must be in the future')
    if (d.balanceDueDaysBefore < d.bookingCutoffDays) {
      throw new AppError('invalid_input', 'Balance due date must be on or before the booking cutoff')
    }

    const row = {
      start_date: d.startDate,
      end_date: d.endDate,
      capacity: d.capacity,
      deposit_per_person_paise: rupeesToPaise(d.depositPerPersonRupees),
      balance_due_days_before: d.balanceDueDaysBefore,
      booking_cutoff_days: d.bookingCutoffDays,
    }
    let depId = departureId
    if (depId) {
      // guard_departures() rejects capacity below seats already sold/held
      const { error } = await supabase.from('departures').update(row).eq('id', depId).eq('trip_id', tripId)
      throwIfError(error, 'update departure')
    } else {
      const { data, error } = await supabase.from('departures').insert({ ...row, trip_id: tripId }).select('id').single()
      throwIfError(error, 'create departure')
      depId = (data as { id: string }).id
    }

    // Options are updated in place by id: bookings reference them (FK), so never delete-and-recreate.
    const { data: existing } = await supabase.from('departure_price_options').select('id').eq('departure_id', depId)
    const keep = new Set(d.options.flatMap((o) => (o.id ? [o.id] : [])))
    const removed = ((existing ?? []) as { id: string }[]).map((o) => o.id).filter((id) => !keep.has(id))
    if (removed.length) {
      const { error } = await supabase.from('departure_price_options').delete().in('id', removed)
      throwIfError(error, 'remove options')
    }
    for (const [i, o] of d.options.entries()) {
      const opt = { label: o.label, price_paise: rupeesToPaise(o.priceRupees), is_default: o.isDefault, sort_order: i }
      const { error } = o.id
        ? await supabase.from('departure_price_options').update(opt).eq('id', o.id).eq('departure_id', depId)
        : await supabase.from('departure_price_options').insert({ ...opt, departure_id: depId })
      throwIfError(error, 'save option')
    }

    await syncFromPrice(supabase, tripId)
    revalidatePath(`/operator/trips/${tripId}/departures`)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function closeDeparture(input: unknown): Promise<ActionResult> {
  try {
    const { tripId, departureId } = z.object({ tripId: Id, departureId: Id }).parse(input)
    const { supabase } = await requireTripAccess(tripId, ['owner', 'manager'])
    const { error } = await supabase.from('departures').update({ status: 'closed' }).eq('id', departureId).eq('trip_id', tripId).eq('status', 'open')
    throwIfError(error, 'close departure')
    await syncFromPrice(supabase, tripId)
    revalidatePath(`/operator/trips/${tripId}/departures`)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

/** Keeps the "from ₹X" display price honest: lowest option across open upcoming departures. */
async function syncFromPrice(supabase: Awaited<ReturnType<typeof requireTripAccess>>['supabase'], tripId: string) {
  const { data } = await supabase
    .from('departure_price_options')
    .select('price_paise, departures!inner(trip_id, status, start_date)')
    .eq('departures.trip_id', tripId)
    .eq('departures.status', 'open')
    .gte('departures.start_date', todayIST())
    .order('price_paise')
    .limit(1)
  const min = (data as { price_paise: number }[] | null)?.[0]?.price_paise
  if (min) await supabase.from('trips').update({ from_price_paise: min }).eq('id', tripId)
}
