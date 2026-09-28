/** Creator eligibility (ARCHITECTURE §20.2). Pure. */

export type CreatorStatus = 'pending' | 'active' | 'suspended' | 'waitlist'
export const PROFESSIONAL_TYPES = ['BUSINESS', 'MEDIA_CREATOR'] as const

export function isProfessional(accountType: string | null | undefined): boolean {
  return !!accountType && (PROFESSIONAL_TYPES as readonly string[]).includes(accountType.toUpperCase())
}

/**
 * Status after an Instagram connect/sync. Crossing the gate activates; we never demote an active
 * creator for dropping below it, and never lift a suspension automatically.
 */
export function nextCreatorStatus(current: CreatorStatus | null, followers: number, minFollowers: number): CreatorStatus {
  if (current === 'suspended') return 'suspended'
  if (current === 'active') return 'active'
  return followers >= minFollowers ? 'active' : 'waitlist'
}

/** Instagram username → a valid TripLink handle (^[a-z0-9_.]{3,30}$). */
export function handleFromUsername(username: string): string {
  const h = username.toLowerCase().replace(/[^a-z0-9_.]/g, '').replace(/^\.+|\.+$/g, '').slice(0, 30)
  return h.length >= 3 ? h : `${h}_tl`.slice(0, 30).padEnd(3, '_')
}

export const followersToGo = (followers: number, min: number) => Math.max(0, min - followers)
