'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/guards'
import { revalidatePublicTrip } from '@/lib/public/revalidate'
import { type ActionResult, AppError, toSafeError } from '@/lib/errors'
import { ratelimit } from '@/lib/security/ratelimit'
import { throwIfError } from '@/lib/supabase/errors'
import { ReviewDecisionSchema } from '@/lib/validation/operator'

// Uses the admin's own session (aal2): RLS lets admins update orgs/trips/kyc and the audit
// triggers record auth.uid() as the actor. No service role needed.

export async function reviewOrg(input: unknown): Promise<ActionResult> {
  try {
    const { supabase, id: adminId } = await requireAdmin('ops', '/admin/approvals')
    const d = ReviewDecisionSchema.parse(input)
    await ratelimit('admin:review', adminId, 200, '1 h')
    const approve = d.decision === 'approve'

    const { error: docErr } = await supabase
      .from('kyc_documents')
      .update({ status: approve ? 'approved' : 'rejected', reviewed_by: adminId, reviewed_at: new Date().toISOString(), notes: approve ? null : d.notes })
      .eq('owner_type', 'org').eq('owner_id', d.id).in('status', ['submitted', 'in_review'])
    throwIfError(docErr, 'review kyc docs')

    const { error } = await supabase
      .from('organizations')
      .update(approve ? { status: 'active', kyc_status: 'approved' } : { kyc_status: 'rejected' })
      .eq('id', d.id)
    throwIfError(error, 'review org')
    // ponytail: Route linked-account creation on approval lands in M6 (outbox job).
    revalidatePath('/admin/approvals')
    if (approve) revalidatePath('/', 'layout') // all of this operator's trips may now be public
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}

export async function reviewTrip(input: unknown): Promise<ActionResult> {
  try {
    const { supabase, id: adminId } = await requireAdmin('ops', '/admin/approvals')
    const d = ReviewDecisionSchema.parse(input)
    await ratelimit('admin:review', adminId, 200, '1 h')

    if (d.decision === 'approve') {
      const { data: trip } = await supabase.from('trips').select('status, organizations(status)').eq('id', d.id).single()
      const t = trip as { status: string; organizations: { status: string } } | null
      if (!t || t.status !== 'pending_review') throw new AppError('invalid_input', 'Trip is not awaiting review')
      if (t.organizations.status !== 'active') throw new AppError('invalid_input', "Approve the operator's KYC first")
    }
    const { error } = await supabase
      .from('trips')
      .update(d.decision === 'approve'
        ? { status: 'published', published_at: new Date().toISOString(), review_notes: null }
        : { status: 'rejected', review_notes: d.notes })
      .eq('id', d.id)
      .eq('status', 'pending_review')
    throwIfError(error, 'review trip')
    revalidatePath('/admin/approvals')
    await revalidatePublicTrip(supabase, d.id)
    return { ok: true }
  } catch (e) {
    return toSafeError(e)
  }
}
