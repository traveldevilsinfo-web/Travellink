import 'server-only'
import { todayIST } from '@/lib/domain/dates'
import type { TripReadiness } from '@/lib/domain/trips'
import type { createServerClient } from '@/lib/supabase/server'

type Sb = Awaited<ReturnType<typeof createServerClient>>

export async function tripReadiness(supabase: Sb, tripId: string): Promise<TripReadiness> {
  const [trip, days, media, comm, deps] = await Promise.all([
    supabase.from('trips').select('summary, duration_days').eq('id', tripId).single(),
    supabase.from('trip_itinerary_days').select('id', { count: 'exact', head: true }).eq('trip_id', tripId),
    supabase.from('trip_media').select('id', { count: 'exact', head: true }).eq('trip_id', tripId),
    supabase.from('trip_commercials').select('trip_id').eq('trip_id', tripId).maybeSingle(),
    supabase.from('departures').select('id', { count: 'exact', head: true }).eq('trip_id', tripId).eq('status', 'open').gte('start_date', todayIST()),
  ])
  const t = trip.data as { summary: string | null; duration_days: number }
  return {
    hasSummary: !!t.summary,
    durationDays: t.duration_days,
    itineraryDays: days.count ?? 0,
    mediaCount: media.count ?? 0,
    hasCommission: !!comm.data,
    upcomingDepartures: deps.count ?? 0,
  }
}
