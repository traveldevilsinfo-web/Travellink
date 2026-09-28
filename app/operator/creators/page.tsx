import { Users } from 'lucide-react'
import type { Metadata } from 'next'
import { EmptyState } from '@/components/dash/kpi'
import { PageHeader } from '@/components/shell/app-shell'
import { requireCurrentOrg } from '@/lib/auth/guards'

export const metadata: Metadata = { title: 'Find creators', robots: { index: false } }

export default async function Page() {
  await requireCurrentOrg()
  return (
    <>
      <PageHeader title="Find creators" description="Every creator here is Instagram-verified with 1,000+ followers. Invite them to promote your trips." />
      <EmptyState icon={<Users />} title="Creator discovery arrives with milestone M5">
        <p className="max-w-[48ch] text-sm text-ink-2">You&apos;ll browse verified creators by niche, city and followers, and invite them to a trip with a custom commission.</p>
      </EmptyState>
    </>
  )
}
