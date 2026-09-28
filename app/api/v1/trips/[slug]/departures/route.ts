import { NextResponse } from 'next/server'
import { z } from 'zod'
import { todayIST } from '@/lib/domain/dates'
import { AppError } from '@/lib/errors'
import { ratelimit } from '@/lib/security/ratelimit'
import { ipHash } from '@/lib/security/request'
import { createPublicClient } from '@/lib/supabase/public'

export const dynamic = 'force-dynamic'

const Slug = z.string().regex(/^[a-z0-9-]{1,80}$/)

/** GET /api/v1/trips/{slug}/departures — fresh seats-left for the ISR trip page (ARCHITECTURE §9.2, §12). Public. */
export async function GET(_req: Request, ctx: RouteContext<'/api/v1/trips/[slug]/departures'>) {
  const slug = Slug.safeParse((await ctx.params).slug)
  if (!slug.success) return NextResponse.json({ error: { code: 'invalid_input', message: 'Bad slug' } }, { status: 400 })
  try {
    await ratelimit('api:public', await ipHash(), 120, '1 m')
  } catch (e) {
    if (e instanceof AppError && e.code === 'rate_limited') {
      return NextResponse.json({ error: { code: 'rate_limited', message: 'Too many requests' } }, { status: 429 })
    }
    throw e
  }

  const { data, error } = await createPublicClient()
    .from('departures')
    .select('id, start_date, capacity, seats_booked, seats_held, status, trips!inner(slug, status)')
    .eq('trips.slug', slug.data)
    .eq('trips.status', 'published')
    .gte('start_date', todayIST())
    .in('status', ['open', 'sold_out'])
    .order('start_date')
  if (error) return NextResponse.json({ error: { code: 'upstream', message: 'Try again' } }, { status: 503 })

  const departures = (data as { id: string; start_date: string; capacity: number; seats_booked: number; seats_held: number; status: string }[]).map((d) => ({
    id: d.id,
    startDate: d.start_date,
    seatsLeft: Math.max(0, d.capacity - d.seats_booked - d.seats_held),
    status: d.status,
  }))
  return NextResponse.json({ departures }, { headers: { 'Cache-Control': 'no-store' } })
}
