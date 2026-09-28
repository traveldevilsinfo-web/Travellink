import 'server-only'
import { redirect } from 'next/navigation'
import { AppError } from '@/lib/errors'
import { createServerClient } from '@/lib/supabase/server'

type AdminRole = 'super_admin' | 'ops' | 'finance' | 'support'
type OrgRole = 'owner' | 'manager' | 'staff'

export type SessionUser = {
  id: string
  aal: 'aal1' | 'aal2'
  supabase: Awaited<ReturnType<typeof createServerClient>>
}

// Layer 2 of ARCHITECTURE §8.2. RLS is still the real boundary; these give clean redirects/errors.
// Unauthenticated → /login, missing MFA → /mfa, wrong role → AppError('forbidden').

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null
  return { id: claims.sub, aal: claims.aal === 'aal2' ? 'aal2' : 'aal1', supabase }
}

export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login')
  return user
}

function requireAal2(user: SessionUser, next?: string) {
  if (user.aal !== 'aal2') redirect(next ? `/mfa?next=${encodeURIComponent(next)}` : '/mfa')
}

export async function requireAdmin(role?: AdminRole, next = '/admin') {
  const user = await requireUser(next)
  requireAal2(user, next)
  // security definer fns: work for every admin role, unlike the super_admin-only admin_users policy.
  const { data, error } = role
    ? await user.supabase.rpc('has_admin_role', { r: role })
    : await user.supabase.rpc('is_admin')
  if (error || data !== true) throw new AppError('forbidden', 'Not an admin')
  return user
}

export async function requireCreator({ active = false } = {}, next = '/creator') {
  const user = await requireUser(next)
  const { data: creator } = await user.supabase
    .from('creators')
    .select('id, handle, status, tier')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!creator) throw new AppError('forbidden', 'Not a creator')
  if (active && creator.status !== 'active') throw new AppError('forbidden', 'Creator not active')
  return { ...user, creator: creator as { id: string; handle: string; status: string; tier: string } }
}

/** Owners/managers must have MFA for money pages (settlements, payouts). Pass { mfa: true } there. */
export async function requireOrgRole(orgId: string, roles: OrgRole[], { mfa = false } = {}, next = '/operator') {
  const user = await requireUser(next)
  const { data: member } = await user.supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle()
  const role = (member as { role: OrgRole } | null)?.role
  if (!role || !roles.includes(role)) throw new AppError('forbidden', 'Not an org member with required role')
  if (mfa && (role === 'owner' || role === 'manager')) requireAal2(user, next)
  return { ...user, orgRole: role }
}

/** Orgs the user belongs to (RLS-scoped). Used to pick an org before requireOrgRole. */
export async function myOrgs(user: SessionUser) {
  const { data } = await user.supabase
    .from('org_members')
    .select('role, organizations(id, name, slug, status)')
    .eq('user_id', user.id)
  return (data ?? []) as unknown as { role: OrgRole; organizations: { id: string; name: string; slug: string; status: string } }[]
}


/**
 * The org the operator is working in. ponytail: first membership only; add an org switcher
 * (cookie + requireOrgRole) when an owner actually runs two brands.
 */
export async function requireCurrentOrg(roles: OrgRole[] = ['owner', 'manager', 'staff'], { mfa = false } = {}, next = '/operator') {
  const user = await requireUser(next)
  const orgs = await myOrgs(user)
  const first = orgs[0]
  if (!first) redirect('/operator/onboarding')
  const member = await requireOrgRole(first.organizations.id, roles, { mfa }, next)
  return { ...member, org: first.organizations }
}

/**
 * Operator access to one trip. trips_read also exposes *published* trips to everyone, so a readable
 * trip proves nothing: look up its org, then check membership.
 */
export async function requireTripAccess(tripId: string, roles: OrgRole[] = ['owner', 'manager', 'staff']) {
  const user = await requireUser('/operator/trips')
  const { data: trip } = await user.supabase.from('trips').select('id, org_id').eq('id', tripId).maybeSingle()
  if (!trip) throw new AppError('forbidden', 'Trip not found')
  const member = await requireOrgRole((trip as { org_id: string }).org_id, roles, {}, '/operator/trips')
  return { ...member, orgId: (trip as { org_id: string }).org_id }
}
