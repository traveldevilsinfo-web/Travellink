import { Code } from 'lucide-react'
import type { Metadata } from 'next'
import { EmptyState } from '@/components/dash/kpi'
import { PageHeader } from '@/components/shell/app-shell'
import { requireCurrentOrg } from '@/lib/auth/guards'

export const metadata: Metadata = { title: 'Integrations', robots: { index: false } }

export default async function Page() {
  await requireCurrentOrg()
  return (
    <>
      <PageHeader title="Integrations" description="For trips booked on your own website. Send us each booking and we credit the right creator." />
      <EmptyState icon={<Code />} title="Postback API and pixel">
        <p className="max-w-[48ch] text-sm text-ink-2">
          Get an API key and a thank-you-page pixel so bookings on your site are credited automatically. Arrives in milestone M6.
        </p>
      </EmptyState>
    </>
  )
}
