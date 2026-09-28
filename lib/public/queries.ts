import 'server-only'
import { todayIST } from '@/lib/domain/dates'
import { slugify } from '@/lib/domain/trips'
import { createPublicClient } from '@/lib/supabase/public'
import { type TripSearch, durationRange, monthEnd } from '@/lib/validation/search'

// Public read models. Everything goes through the anon client, so RLS + column grants decide
// what is visible: published trips of active operators only, no commission, no contacts.

export const PAGE_SIZE = 24

export type TripCard = {
  id: string; slug: string; title: string; destination: string; state: string | null; trip_type: string
  duration_days: number; duration_nights: number; from_price_paise: number; cover_image_path: string | null
  organizations: { name: string; rating_avg: number; rating_count: number }
}

const CARD = 'id, slug, title, destination, state, trip_type, duration_days, duration_nights, from_price_paise, cover_image_path, organizations(name, rating_avg, rating_count)'

/**
 * `next build` in CI has no database (SKIP_ENV_VALIDATION). Only then do ISR pages prerender empty;
 * at runtime errors throw so a DB blip never gets cached as an empty page.
 */
const offlineBuild = () => process.env.NEXT_PHASE === 'phase-production-build' && !!process.env.SKIP_ENV_VALIDATION

async function run<T>(label: string, q: PromiseLike<{ data: unknown; error: { message: string } | null; count?: number | null }>, fallback: T) {
  const { data, error, count } = await q
  if (error) {
    if (offlineBuild()) return { data: fallback, count: 0 }
    throw new Error(`${label}: ${error.message}`)
  }
  return { data: (data ?? fallback) as T, count: count ?? 0 }
}

const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

export async function searchTrips(s: TripSearch) {
  const sb = createPublicClient()
  const withMonth = !!s.month
  let q = sb
    .from('trips')
    .select(withMonth ? `${CARD}, departures!inner(start_date, status)` : CARD, { count: 'exact' })
    .eq('status', 'published')

  if (s.q) q = q.textSearch('search', s.q, { type: 'websearch', config: 'simple' })
  if (s.dest) q = q.ilike('destination', `%${likeEscape(s.dest)}%`)
  if (s.type) q = q.eq('trip_type', s.type)
  if (s.min != null) q = q.gte('from_price_paise', s.min * 100)
  if (s.max != null) q = q.lte('from_price_paise', s.max * 100)
  const d = durationRange(s.days)
  if (d) q = q.gte('duration_days', d[0]).lte('duration_days', d[1])
  if (s.month) {
    const start = `${s.month}-01` < todayIST() ? todayIST() : `${s.month}-01`
    q = q.eq('departures.status', 'open').gte('departures.start_date', start).lte('departures.start_date', monthEnd(s.month))
  }
  const page = s.page ?? 1
  const from = (page - 1) * PAGE_SIZE
  const res = await run<TripCard[]>('searchTrips', q.order('published_at', { ascending: false }).range(from, from + PAGE_SIZE - 1), [])
  return { trips: res.data, total: res.count, page }
}

export async function latestTrips(limit = 8) {
  const sb = createPublicClient()
  return (await run<TripCard[]>('latestTrips', sb.from('trips').select(CARD).eq('status', 'published').order('published_at', { ascending: false }).limit(limit), [])).data
}

export type Destination = { slug: string; name: string; state: string | null; count: number }

/** ponytail: derived from trips (no destinations table); fine until a few thousand trips. */
export async function destinations(): Promise<Destination[]> {
  const sb = createPublicClient()
  const { data } = await run<{ destination: string; state: string | null }[]>(
    'destinations', sb.from('trips').select('destination, state').eq('status', 'published').limit(5000), [],
  )
  const map = new Map<string, Destination>()
  for (const t of data) {
    const slug = slugify(t.destination)
    const cur = map.get(slug)
    if (cur) cur.count++
    else map.set(slug, { slug, name: t.destination, state: t.state, count: 1 })
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

export async function tripsForDestination(slug: string) {
  const dest = (await destinations()).find((d) => d.slug === slug)
  if (!dest) return null
  const sb = createPublicClient()
  const { data } = await run<TripCard[]>('tripsForDestination',
    sb.from('trips').select(CARD).eq('status', 'published').ilike('destination', likeEscape(dest.name)).order('published_at', { ascending: false }).limit(60), [])
  return { destination: dest, trips: data }
}

export type TripDetail = TripCard & {
  booking_mode: 'platform' | 'redirect' | 'enquiry'; lead_fee_paise: number
  summary: string | null; description_md: string | null; start_city: string | null; difficulty: string | null
  min_age: number | null; max_group_size: number | null; inclusions: string[]; exclusions: string[]
  highlights: string[]; things_to_carry: string[]; updated_at: string; org_id: string
  organizations: TripCard['organizations'] & { slug: string; city: string | null; legal_name: string | null; gstin: string | null }
  cancellation_policies: { name: string; rules: { min_days_before: number; refund_pct: number }[]; deposit_non_refundable: boolean }
  host: { handle: string; display_name: string; avatar_url: string | null } | null
  trip_itinerary_days: { day_number: number; title: string; description: string | null; meals: string[]; stay: string | null }[]
  trip_media: { storage_path: string; alt: string | null; sort_order: number }[]
  trip_pickup_points: { id: string; city: string; point: string; time_note: string | null; extra_price_paise: number }[]
  departures: {
    id: string; start_date: string; end_date: string; status: string; deposit_per_person_paise: number
    departure_price_options: { id: string; label: string; price_paise: number; is_default: boolean; sort_order: number }[]
  }[]
}

export async function tripBySlug(slug: string): Promise<TripDetail | null> {
  const sb = createPublicClient()
  const { data } = await run<TripDetail | null>('tripBySlug',
    sb.from('trips')
      .select(`id, slug, title, destination, state, trip_type, duration_days, duration_nights, from_price_paise, cover_image_path,
        booking_mode, lead_fee_paise, summary, description_md, start_city, difficulty, min_age, max_group_size, inclusions, exclusions, highlights,
        things_to_carry, updated_at, org_id,
        organizations(name, slug, city, legal_name, gstin, rating_avg, rating_count),
        cancellation_policies(name, rules, deposit_non_refundable),
        host:creators!trips_hosted_by_creator_id_fkey(handle, display_name, avatar_url),
        trip_itinerary_days(day_number, title, description, meals, stay),
        trip_media(storage_path, alt, sort_order),
        trip_pickup_points(id, city, point, time_note, extra_price_paise),
        departures(id, start_date, end_date, status, deposit_per_person_paise, departure_price_options(id, label, price_paise, is_default, sort_order))`)
      .eq('slug', slug)
      .eq('status', 'published')
      .gte('departures.start_date', todayIST())
      .in('departures.status', ['open', 'sold_out'])
      .maybeSingle(), null)
  if (!data) return null
  data.trip_itinerary_days.sort((a, b) => a.day_number - b.day_number)
  data.trip_media.sort((a, b) => a.sort_order - b.sort_order)
  data.departures.sort((a, b) => a.start_date.localeCompare(b.start_date))
  for (const d of data.departures) d.departure_price_options.sort((a, b) => a.sort_order - b.sort_order)
  return data
}

export async function publishedReviews(tripId: string) {
  const sb = createPublicClient()
  return (await run<{ id: string; rating: number; title: string | null; body: string | null; operator_reply: string | null; created_at: string }[]>(
    'reviews', sb.from('reviews').select('id, rating, title, body, operator_reply, created_at').eq('trip_id', tripId).eq('status', 'published').order('created_at', { ascending: false }).limit(10), [],
  )).data
}

export type PublicCreator = { id: string; handle: string; display_name: string; bio: string | null; avatar_url: string | null; cover_url: string | null; instagram_handle: string | null; instagram_followers: number | null; home_city: string | null }

export async function creatorByHandle(handle: string) {
  const sb = createPublicClient()
  const { data: creator } = await run<PublicCreator | null>(
    'creator', sb.from('creators').select('id, handle, display_name, bio, avatar_url, cover_url, instagram_handle, instagram_followers, home_city').eq('handle', handle.toLowerCase()).eq('status', 'active').maybeSingle(), null)
  if (!creator) return null
  // Trips the creator links to (security-definer function; creator_links itself stays private) + trips they host.
  // ponytail: ordering/collections arrive with storefront_items in Phase 2.
  const { data: linked } = await run<{ trip_id: string }[]>('storefrontIds', sb.rpc('storefront_trip_ids', { p_handle: creator.handle }), [])
  const ids = linked.map((r) => r.trip_id)
  const { data: trips } = await run<TripCard[]>('storefrontTrips',
    sb.from('trips').select(CARD).eq('status', 'published')
      .or(ids.length ? `hosted_by_creator_id.eq.${creator.id},id.in.(${ids.join(',')})` : `hosted_by_creator_id.eq.${creator.id}`)
      .order('published_at', { ascending: false }).limit(48), [])
  return { creator, trips }
}

export async function sitemapEntries() {
  const sb = createPublicClient()
  const [trips, creators] = await Promise.all([
    run<{ slug: string; updated_at: string }[]>('sitemap trips', sb.from('trips').select('slug, updated_at').eq('status', 'published').limit(10000), []),
    run<{ handle: string; updated_at: string }[]>('sitemap creators', sb.from('creators').select('handle, updated_at').eq('status', 'active').limit(10000), []),
  ])
  return { trips: trips.data, creators: creators.data, destinations: await destinations() }
}
