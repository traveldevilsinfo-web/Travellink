import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth/guards'
import { safeNext } from '@/lib/validation/auth'
import { MfaForm } from './mfa-form'

export const metadata: Metadata = { title: 'Two-factor verification', robots: { index: false } }

export default async function MfaPage({ searchParams }: PageProps<'/mfa'>) {
  const next = safeNext((await searchParams).next, '/')
  const user = await requireUser(`/mfa?next=${encodeURIComponent(next)}`)
  if (user.aal === 'aal2') redirect(next)

  const { data } = await user.supabase.auth.mfa.listFactors()
  const factor = data?.totp.find((f) => f.status === 'verified')

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{factor ? 'Enter your authenticator code' : 'Set up two-factor authentication'}</CardTitle>
          <CardDescription>
            {factor
              ? 'Open your authenticator app and enter the 6-digit code.'
              : 'Required for admin and money pages. Use Google Authenticator, 1Password or similar.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MfaForm next={next} factorId={factor?.id} />
        </CardContent>
      </Card>
    </main>
  )
}
