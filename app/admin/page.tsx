import { requireAdmin } from '@/lib/auth/guards'

export default async function AdminHome() {
  await requireAdmin()
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold">Admin console</h1>
      <p className="text-sm text-muted-foreground">MFA verified. Approval queues arrive in M2.</p>
    </main>
  )
}
