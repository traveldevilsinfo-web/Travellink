import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { requireCurrentOrg } from '@/lib/auth/guards'
import { formatINR } from '@/lib/domain/money'
import { STATUS_LABEL } from '@/lib/operator/status'

export const metadata: Metadata = { title: 'Trips', robots: { index: false } }

export default async function TripsPage() {
  const { supabase, org } = await requireCurrentOrg()
  const { data } = await supabase
    .from('trips')
    .select('id, title, destination, status, duration_days, duration_nights, from_price_paise, updated_at')
    .eq('org_id', org.id)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })
  const trips = (data ?? []) as { id: string; title: string; destination: string; status: string; duration_days: number; duration_nights: number; from_price_paise: number }[]

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Your trips</h1>
        <Link href="/operator/trips/new" className={buttonVariants()}>New trip</Link>
      </div>
      {org.status !== 'active' && (
        <p className="mb-4 rounded-md bg-muted p-3 text-sm">
          Your company is still being verified. You can build trips now; they go live after we approve your KYC.
        </p>
      )}
      {trips.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">No trips yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first trip. It stays a draft until you submit it for review.</p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {trips.map((t) => {
            const s = STATUS_LABEL[t.status] ?? { label: t.status, variant: 'outline' as const }
            return (
              <li key={t.id}>
                <Link href={`/operator/trips/${t.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.destination} · {t.duration_days}D/{t.duration_nights}N · from {formatINR(t.from_price_paise)}
                    </p>
                  </div>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
