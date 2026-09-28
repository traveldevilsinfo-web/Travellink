import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'

export default async function AdminHome() {
  await requireAdmin()
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold">Admin console</h1>
      <Link href="/admin/approvals" className="mt-4 inline-block underline">Approvals queue →</Link>
    </main>
  )
}
