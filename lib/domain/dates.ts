/** Trip dates are calendar dates in IST, stored as `date` (YYYY-MM-DD). */
export type IsoDate = string

const IST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })

export function todayIST(now: Date = new Date()): IsoDate {
  return IST.format(now)
}

function toUtcMs(d: IsoDate): number {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y!, m! - 1, day!)
}

/** b − a in whole days. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / 86_400_000)
}

export function addDays(d: IsoDate, n: number): IsoDate {
  return new Date(toUtcMs(d) + n * 86_400_000).toISOString().slice(0, 10)
}

export function formatDateIST(d: IsoDate): string {
  return new Date(toUtcMs(d)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
