import { Receipt } from 'lucide-react'
import type { Metadata } from 'next'
import { EmptyState } from '@/components/dash/kpi'
import { PageHeader } from '@/components/shell/app-shell'
import { requireCurrentOrg } from '@/lib/auth/guards'

export const metadata: Metadata = { title: 'Billing', robots: { index: false } }

export default async function Page() {
  await requireCurrentOrg()
  return (
    <>
      <PageHeader title="Billing" description="Commission on bookings made on your own website or by enquiry is invoiced monthly. TripLink checkout bookings are settled automatically." />
      <EmptyState icon={<Receipt />} title="No invoices yet">
        <p className="max-w-[48ch] text-sm text-ink-2">Your first invoice is created on the 1st of the month after creators drive a reported booking. Arrives in milestone M6.</p>
      </EmptyState>
    </>
  )
}
