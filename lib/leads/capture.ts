import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { throwIfError } from '@/lib/supabase/errors'

/**
 * Anonymous traveler enquiry → lead. Service role because travelers have no account and leads have no
 * client write path (AGENTS.md rule 3 exception). Call only after the OTP is verified server-side.
 * capture_lead() re-checks the trip, phone, attribution, dedupe, self-referral and the monthly cap.
 */
export async function captureLead(l: {
  tripId: string; departureId: string | null; name: string; phone: string; travelers: number; message: string
  creatorId: string | null; linkId: string | null; visitorId: string | null
}) {
  const { data, error } = await createAdminClient().rpc('capture_lead', {
    p_trip: l.tripId, p_departure: l.departureId as string, p_name: l.name, p_phone: l.phone, p_travelers: l.travelers,
    p_message: l.message, p_creator: l.creatorId as string, p_link: l.linkId as string, p_visitor: l.visitorId as string,
  })
  throwIfError(error, 'capture lead')
  const row = (data as { lead_id: string; duplicate: boolean; lead_fee_paise: number }[])[0]!
  return { leadId: row.lead_id, duplicate: row.duplicate }
}
