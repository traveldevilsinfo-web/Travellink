import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { myOrgs, requireUser } from '@/lib/auth/guards'
import { KYC_DOC_TYPES, REQUIRED_ORG_KYC } from '@/lib/validation/operator'
import { AgreementForm, KycUploadForm, OrgCreateForm, OrgDetailsForm } from './onboarding-forms'

export const metadata: Metadata = { title: 'Operator onboarding', robots: { index: false } }

const DOC_LABELS: Record<(typeof KYC_DOC_TYPES)[number], string> = {
  pan: 'Company PAN card',
  gst_certificate: 'GST registration certificate',
  cancelled_cheque: 'Cancelled cheque (for payouts)',
  incorporation: 'Incorporation certificate (optional)',
}

type Org = {
  id: string; name: string; status: string; kyc_status: string; legal_name: string | null; gstin: string | null
  gst_scheme: 'gst5_no_itc' | 'gst18_with_itc'; description: string | null; city: string | null
  support_phone: string | null; support_email: string | null
}

export default async function OnboardingPage() {
  const user = await requireUser('/operator/onboarding')
  const membership = (await myOrgs(user))[0]

  if (!membership) {
    return (
      <div className="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>List your trips on TripLink</CardTitle>
            <CardDescription>Start with your company name. You&apos;ll add GST and KYC details next.</CardDescription>
          </CardHeader>
          <CardContent><OrgCreateForm /></CardContent>
        </Card>
      </div>
    )
  }

  const orgId = membership.organizations.id
  const canEdit = membership.role !== 'staff'
  const [{ data: org }, { data: contacts }, { data: docs }, { data: priv }] = await Promise.all([
    user.supabase.from('organizations').select('id, name, status, kyc_status, legal_name, gstin, gst_scheme, description, city').eq('id', orgId).single(),
    // contacts are column-hidden from the public; members read them through this function
    user.supabase.rpc('get_org_contacts', { p_org: orgId }).maybeSingle(),
    user.supabase.from('kyc_documents').select('doc_type, status, notes, created_at').eq('owner_type', 'org').eq('owner_id', orgId).order('created_at', { ascending: false }),
    user.supabase.from('organization_private').select('agreement_version, agreement_accepted_at').eq('org_id', orgId).maybeSingle(),
  ])
  const o = { ...(org as Omit<Org, 'support_phone' | 'support_email'>), ...((contacts ?? {}) as Pick<Org, 'support_phone' | 'support_email'>) } as Org
  const docList = (docs ?? []) as { doc_type: string; status: string; notes: string | null }[]
  const latestDoc = (t: string) => docList.find((d) => d.doc_type === t)

  const detailsDone = !!(o.legal_name && o.gstin && o.support_phone && o.support_email)
  const kycDone = REQUIRED_ORG_KYC.every((t) => latestDoc(t) && latestDoc(t)!.status !== 'rejected')
  const agreementDone = !!priv?.agreement_accepted_at

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">{o.name}</h1>
        <StatusBanner status={o.status} kycStatus={o.kyc_status} allDone={detailsDone && kycDone && agreementDone} />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>1. Company details {detailsDone && <Badge variant="secondary">Done</Badge>}</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <OrgDetailsForm
              defaults={{
                orgId, legalName: o.legal_name ?? '', gstin: o.gstin ?? '', gstScheme: o.gst_scheme, description: o.description ?? '',
                city: o.city ?? '', supportPhone: o.support_phone ?? '', supportEmail: o.support_email ?? '',
              }}
            />
          ) : <p className="text-sm text-muted-foreground">Only owners and managers can edit company details.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. KYC documents {kycDone && <Badge variant="secondary">Done</Badge>}</CardTitle>
          <CardDescription>JPG, PNG or PDF, up to 5 MB. Only our verification team can see these.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {KYC_DOC_TYPES.map((t) => {
            const d = latestDoc(t)
            return (
              <div key={t} className="flex flex-col gap-1">
                {d && (
                  <p className="text-xs text-muted-foreground">
                    Uploaded · <Badge variant={d.status === 'rejected' ? 'destructive' : 'outline'}>{d.status.replace('_', ' ')}</Badge>
                    {d.notes && <span className="ml-1">— {d.notes}</span>}
                  </p>
                )}
                {canEdit && <KycUploadForm orgId={orgId} docType={t} label={DOC_LABELS[t]} />}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Operator agreement {agreementDone && <Badge variant="secondary">Accepted {priv?.agreement_version}</Badge>}</CardTitle>
        </CardHeader>
        <CardContent>
          {agreementDone ? <p className="text-sm text-muted-foreground">Thanks — you&apos;re all set here.</p>
            : membership.role === 'owner' ? <AgreementForm orgId={orgId} />
            : <p className="text-sm text-muted-foreground">The company owner needs to accept this.</p>}
        </CardContent>
      </Card>

      {o.status === 'active' && <Link href="/operator/trips" className="text-sm underline">Go to your trips →</Link>}
    </div>
  )
}

function StatusBanner({ status, kycStatus, allDone }: { status: string; kycStatus: string; allDone: boolean }) {
  if (status === 'active') return <p className="text-sm">✅ Approved. Your published trips are live.</p>
  if (kycStatus === 'rejected') return <p className="text-sm text-destructive">We couldn&apos;t verify your documents. Please check the notes below and re-upload.</p>
  if (allDone) return <p className="text-sm">⏳ Under review. We usually verify within 2 working days. You can start creating trips meanwhile.</p>
  return <p className="text-sm text-muted-foreground">Complete the 3 steps below to get verified.</p>
}
