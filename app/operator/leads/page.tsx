import { Inbox } from 'lucide-react'
import type { Metadata } from 'next'
import { EmptyState } from '@/components/dash/kpi'
import { PageHeader } from '@/components/shell/app-shell'
import { requireCurrentOrg } from '@/lib/auth/guards'

export const metadata: Metadata = { title: 'Leads', robots: { index: false } }

export default async function Page() {
  await requireCurrentOrg()
  return (
    <>
      <PageHeader title="Leads" description="Enquiries from creator links. Mark them booked so the creator is credited." />
      <EmptyState icon={<Inbox />} title="No leads yet">
        <p className="max-w-[48ch] text-sm text-ink-2">When a follower enquires through a creator&apos;s link, it lands here and on your WhatsApp. Lead capture ships in milestone M5.</p>
      </EmptyState>
    </>
  )
}
