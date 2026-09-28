import Link from 'next/link'
import { redirect } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { myOrgs, requireUser } from '@/lib/auth/guards'

export default async function OperatorHome() {
  const user = await requireUser('/operator')
  const membership = (await myOrgs(user))[0]
  if (!membership || membership.organizations.status !== 'active') redirect('/operator/onboarding')
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold">{membership.organizations.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Bookings and settlements arrive in later milestones.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/operator/trips" className={buttonVariants()}>Manage trips</Link>
        <Link href="/operator/onboarding" className={buttonVariants({ variant: 'outline' })}>Company & KYC</Link>
      </div>
    </main>
  )
}
