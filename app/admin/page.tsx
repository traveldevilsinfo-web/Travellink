import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'

export default async function AdminHome() {
  await requireAdmin()
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold">Admin console</h1>
      <Link href="/admin/approvals" className="mt-4 block underline">Approvals queue →</Link>
      <Link href="/admin/creators" className="mt-2 block underline">Creator waitlist →</Link>
    </main>
  )
}
