import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireAdmin } from '@/lib/auth/guards'
import { formatINR } from '@/lib/domain/money'
import { REQUIRED_ORG_KYC } from '@/lib/validation/operator'
import { ReviewButtons } from './review-buttons'

export const metadata: Metadata = { title: 'Approvals', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Org = { id: string; name: string; legal_name: string | null; gstin: string | null; gst_scheme: string; city: string | null; kyc_status: string; created_at: string }
type Doc = { owner_id: string; doc_type: string; storage_path: string; status: string }
type Trip = { id: string; title: string; destination: string; duration_days: number; duration_nights: number; from_price_paise: number; summary: string | null; organizations: { name: string; status: string } }

export default async function ApprovalsPage() {
  const { supabase } = await requireAdmin('ops', '/admin/approvals')
  const [{ data: orgs }, { data: trips }] = await Promise.all([
    supabase.from('organizations').select('id, name, legal_name, gstin, gst_scheme, city, kyc_status, created_at').eq('status', 'pending').order('created_at'),
    supabase.from('trips').select('id, title, destination, duration_days, duration_nights, from_price_paise, summary, organizations(name, status)').eq('status', 'pending_review').order('updated_at'),
  ])
  const orgList = (orgs ?? []) as Org[]
  const { data: docs } = orgList.length
    ? await supabase.from('kyc_documents').select('owner_id, doc_type, storage_path, status').eq('owner_type', 'org').in('owner_id', orgList.map((o) => o.id)).order('created_at', { ascending: false })
    : { data: [] }
  const docList = (docs ?? []) as Doc[]
  // KYC files are private: 60-second signed URLs, generated per page view (ARCHITECTURE §8.3).
  const signed = docList.length
    ? (await supabase.storage.from('kyc').createSignedUrls(docList.map((d) => d.storage_path), 60)).data ?? []
    : []
  const urlFor = (path: string) => signed.find((s) => s.path === path)?.signedUrl ?? undefined

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
      <h1 className="text-xl font-semibold">Approvals</h1>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Operators awaiting KYC ({orgList.length})</h2>
        {orgList.length === 0 && <p className="text-sm text-muted-foreground">Nothing to review.</p>}
        {orgList.map((o) => {
          const mine = docList.filter((d) => d.owner_id === o.id)
          const missing = REQUIRED_ORG_KYC.filter((t) => !mine.some((d) => d.doc_type === t))
          return (
            <Card key={o.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">{o.name} <Badge variant="outline">{o.kyc_status.replace('_', ' ')}</Badge></CardTitle>
                <CardDescription>{o.legal_name ?? '—'} · GSTIN {o.gstin ?? '—'} · {o.gst_scheme === 'gst5_no_itc' ? '5% no ITC' : '18% with ITC'} · {o.city ?? '—'}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ul className="text-sm">
                  {mine.map((d) => (
                    <li key={d.storage_path}>
                      {urlFor(d.storage_path) ? <a href={urlFor(d.storage_path)} target="_blank" rel="noreferrer" className="underline">{d.doc_type.replace('_', ' ')}</a> : d.doc_type}
                      {' '}<span className="text-muted-foreground">({d.status})</span>
                    </li>
                  ))}
                </ul>
                {missing.length > 0 && <p className="text-sm text-destructive">Missing: {missing.join(', ').replaceAll('_', ' ')}</p>}
                {o.kyc_status !== 'rejected' && <ReviewButtons kind="org" id={o.id} />}
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Trips awaiting review ({trips?.length ?? 0})</h2>
        {!trips?.length && <p className="text-sm text-muted-foreground">Nothing to review.</p>}
        {((trips ?? []) as unknown as Trip[]).map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle className="text-base">{t.title}</CardTitle>
              <CardDescription>
                {t.organizations.name}{t.organizations.status !== 'active' && ' (operator not yet approved)'} · {t.destination} · {t.duration_days}D/{t.duration_nights}N · from {formatINR(t.from_price_paise)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {t.summary && <p className="text-sm">{t.summary}</p>}
              <ReviewButtons kind="trip" id={t.id} />
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  )
}
