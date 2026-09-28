/** Operator performance maths over org_daily_stats rows (ARCHITECTURE §20.6). Pure. */
import { addDays, daysBetween } from './dates'

export type StatRow = {
  day: string; trip_id: string; creator_id: string; link_id: string | null
  clicks: number; unique_visitors: number; leads: number; bookings: number; gmv_paise: number; commission_paise: number
}
export type Totals = { clicks: number; unique_visitors: number; leads: number; bookings: number; gmv_paise: number; commission_paise: number }

export const RANGES = [['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']] as const
export type RangeKey = (typeof RANGES)[number][0]
export const parseRange = (v: unknown): RangeKey => RANGES.find(([k]) => k === v)?.[0] ?? '30'
/** Inclusive IST date window ending today. */
export const rangeFrom = (today: string, r: RangeKey) => addDays(today, -(Number(r) - 1))

const zero = (): Totals => ({ clicks: 0, unique_visitors: 0, leads: 0, bookings: 0, gmv_paise: 0, commission_paise: 0 })
const KEYS = Object.keys(zero()) as (keyof Totals)[]

export function sum(rows: StatRow[]): Totals {
  const t = zero()
  for (const r of rows) for (const k of KEYS) t[k] += Number(r[k])
  return t
}

/** Totals per key, busiest first (GMV, then clicks). */
export function groupTotals(rows: StatRow[], key: 'trip_id' | 'creator_id' | 'link_id'): (Totals & { id: string })[] {
  const m = new Map<string, StatRow[]>()
  for (const r of rows) { const id = r[key]; if (id) m.set(id, [...(m.get(id) ?? []), r]) }
  return [...m].map(([id, rs]) => ({ id, ...sum(rs) })).sort((a, b) => b.gmv_paise - a.gmv_paise || b.clicks - a.clicks)
}

/** One value per day from `from` to `to` inclusive, zeros for quiet days. */
export function dailySeries(rows: StatRow[], from: string, to: string, k: keyof Totals = 'clicks'): number[] {
  const out = Array.from({ length: daysBetween(from, to) + 1 }, () => 0)
  for (const r of rows) { const i = daysBetween(from, r.day); if (i >= 0 && i < out.length) out[i]! += Number(r[k]) }
  return out
}

/** "3.4%" or "—" when there is no base. */
export const rate = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '—')
