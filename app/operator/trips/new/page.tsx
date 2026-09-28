import type { Metadata } from 'next'
import { requireCurrentOrg } from '@/lib/auth/guards'
import { TripDetailsForm } from '../trip-forms'

export const metadata: Metadata = { title: 'New trip', robots: { index: false } }

export default async function NewTripPage() {
  const { supabase, org } = await requireCurrentOrg()
  const { data } = await supabase.from('cancellation_policies').select('id, name').or(`is_system.eq.true,org_id.eq.${org.id}`).order('name')
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold">New trip</h1>
      <TripDetailsForm
        policies={(data ?? []) as { id: string; name: string }[]}
        defaults={{
          title: '', summary: '', descriptionMd: '', tripType: 'group', destination: '', state: '', startCity: '',
          durationDays: '3', durationNights: '2', difficulty: '', minAge: '0', maxGroupSize: '0', fromPriceRupees: '',
          inclusions: '', exclusions: '', highlights: '', thingsToCarry: '', cancellationPolicyId: '',
        }}
      />
    </div>
  )
}
