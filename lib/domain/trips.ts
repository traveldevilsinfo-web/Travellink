export type TripStatus = 'draft' | 'pending_review' | 'published' | 'paused' | 'rejected' | 'archived'

/** URL slug from a title. Callers append a short suffix on unique-violation. */
export function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '') || 'trip'
}

/**
 * Status changes an operator may make. Mirrors public.guard_trips() (the DB is the enforcer;
 * this only decides which buttons to show).
 */
export function operatorNextStatuses(status: TripStatus, everPublished: boolean): TripStatus[] {
  const next: TripStatus[] = []
  if (status === 'draft' || status === 'rejected') next.push('pending_review')
  if (status === 'pending_review') next.push('draft')
  if (status === 'published') next.push('paused')
  if (status === 'paused' && everPublished) next.push('published')
  if (status !== 'archived') next.push('archived')
  return next
}

export type TripReadiness = {
  hasSummary: boolean
  itineraryDays: number
  durationDays: number
  mediaCount: number
  hasCommission: boolean
  upcomingDepartures: number
}

/** What still blocks "Submit for review". Empty = ready. */
export function readinessIssues(t: TripReadiness): string[] {
  const issues: string[] = []
  if (!t.hasSummary) issues.push('Add a short summary')
  if (t.itineraryDays !== t.durationDays) issues.push(`Itinerary needs ${t.durationDays} day(s); has ${t.itineraryDays}`)
  if (t.mediaCount < 3) issues.push('Upload at least 3 photos')
  if (!t.hasCommission) issues.push('Set the creator commission')
  if (t.upcomingDepartures < 1) issues.push('Add at least one upcoming departure')
  return issues
}
