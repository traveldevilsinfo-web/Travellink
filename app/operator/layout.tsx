import { Plus } from 'lucide-react'
import Link from 'next/link'
import { AppShell } from '@/components/shell/app-shell'
import { buttonVariants } from '@/components/ui/button'
import { myOrgs, requireUser } from '@/lib/auth/guards'

export default async function OperatorLayout({ children }: LayoutProps<'/operator'>) {
  const user = await requireUser('/operator')
  const org = (await myOrgs(user))[0]?.organizations
  const initials = (org?.name ?? 'New operator').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <AppShell
      kind="operator"
      user={{ name: org?.name ?? 'Set up your company', sub: org ? (org.status === 'active' ? 'Operator · verified' : 'Operator · in review') : 'Operator', initials, color: 'var(--ink)' }}
      actions={org ? <Link href="/operator/trips/new" className={buttonVariants({ variant: 'dark', size: 'sm' })}><Plus />List a trip</Link> : null}
    >
      {children}
    </AppShell>
  )
}
