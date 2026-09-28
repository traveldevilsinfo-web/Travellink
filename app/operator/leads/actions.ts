'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentOrg } from '@/lib/auth/guards'
import { rupeesToPaise } from '@/lib/domain/money'
import { type ActionResult, AppError, toSafeError } from '@/lib/errors'
import { ratelimit } from '@/lib/security/ratelimit'
import { isUniqueViolation, throwIfError } from '@/lib/supabase/errors'
import { LeadStatusSchema, MarkBookedSchema } from '@/lib/validation/leads'

// mark_lead_booked / set_lead_status are security definer: they check org membership of the lead's trip
// and compute the commission from DB rates, so the user session is all we pass.

export async function markLeadBooked(input: unknown): Promise<ActionResult> {
  try {
    const { supabase, id: userId } = await requireCurrentOrg()
    const d = MarkBookedSchema.parse(input)
    await ratelimit('lead:book', userId, 120, '1 h')
    const { error } = await supabase.rpc('mark_lead_booked', {
      p_lead: d.leadId, p_booking_ref: d.bookingRef, p_travelers: d.travelers, p_amount_paise: rupeesToPaise(d.amountRupees), p_departure: d.departureId,
    })
    if (isUniqueViolation(error)) throw new AppError('invalid_input', `Booking reference ${d.bookingRef} is already used`)
    if (error?.code === '22023') throw new AppError('invalid_input', error.message)
    throwIfError(error, 'mark booked')
    revalidatePath('/operator/leads')
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function setLeadStatus(input: unknown): Promise<ActionResult> {
  try {
    const { supabase, id: userId } = await requireCurrentOrg()
    const d = LeadStatusSchema.parse(input)
    await ratelimit('lead:status', userId, 300, '1 h')
    const { error } = await supabase.rpc('set_lead_status', { p_lead: d.leadId, p_status: d.status })
    if (error?.code === '22023') throw new AppError('invalid_input', error.message)
    throwIfError(error, 'lead status')
    revalidatePath('/operator/leads')
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}
