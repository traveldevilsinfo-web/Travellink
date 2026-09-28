import type { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { safeNext } from '@/lib/validation/auth'
import { devLoginAllowed } from '@/lib/dev'
import { DevLogin } from './dev-login'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } }

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const sp = await searchParams
  const next = safeNext(sp.next)
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to TripLink</CardTitle>
          <CardDescription>Use your mobile number. We&apos;ll text you a code.</CardDescription>
        </CardHeader>
        <CardContent>
          {sp.error === 'link' && (
            <p role="alert" className="mb-4 text-sm text-destructive">That sign-in link is invalid or expired. Try again.</p>
          )}
          <LoginForm next={next} turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
          {devLoginAllowed() && <DevLogin />}
        </CardContent>
      </Card>
    </main>
  )
}
