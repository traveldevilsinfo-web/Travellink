import { z } from 'zod'

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v)
const optInt = (min: number, max: number) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : Number(first(v))), z.number().int().min(min).max(max).optional().catch(undefined))

export const TRIP_TYPES = ['group', 'experiential', 'package', 'creator_hosted'] as const

/** /trips?q=&dest=&month=2026-11&min=&max=&days=&type=&page= — bad values are dropped, never 500. */
export const TripSearchSchema = z.object({
  q: z.preprocess(first, z.string().trim().max(80).optional().catch(undefined)),
  dest: z.preprocess(first, z.string().trim().max(60).optional().catch(undefined)),
  month: z.preprocess(first, z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional().catch(undefined)),
  min: optInt(0, 10_000_000), // rupees
  max: optInt(0, 10_000_000),
  days: z.preprocess(first, z.enum(['1-2', '3-4', '5-7', '8+']).optional().catch(undefined)),
  type: z.preprocess(first, z.enum(TRIP_TYPES).optional().catch(undefined)),
  page: optInt(1, 100),
})

export type TripSearch = z.output<typeof TripSearchSchema>

export function durationRange(days: TripSearch['days']): [number, number] | undefined {
  if (!days) return undefined
  if (days === '8+') return [8, 60]
  const [a, b] = days.split('-').map(Number)
  return [a!, b!]
}

/** Last day of a YYYY-MM month. */
export function monthEnd(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10)
}
