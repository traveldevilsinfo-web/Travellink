import { myOrgs, requireUser } from '@/lib/auth/guards'
import { AppError } from '@/lib/errors'

export default async function OperatorHome() {
  const user = await requireUser('/operator')
  const orgs = await myOrgs(user)
  if (orgs.length === 0) throw new AppError('forbidden', 'No organization')
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold">Operator dashboard</h1>
      <ul className="mt-4 text-sm">
        {orgs.map((m) => <li key={m.organizations.id}>{m.organizations.name} · {m.role} · {m.organizations.status}</li>)}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">Trips and departures arrive in M2.</p>
    </main>
  )
}
