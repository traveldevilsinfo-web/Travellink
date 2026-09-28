import { requireCreator } from '@/lib/auth/guards'

export default async function CreatorHome() {
  const { creator } = await requireCreator()
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold">Creator dashboard</h1>
      <p className="text-sm text-muted-foreground">@{creator.handle} · {creator.status}. Links, earnings and payouts arrive in M4.</p>
    </main>
  )
}
