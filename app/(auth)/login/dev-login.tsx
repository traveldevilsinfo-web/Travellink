'use client'

import { useState, useTransition } from 'react'
import { devSignIn } from './dev-actions'

export function DevLogin() {
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  return (
    <div className="mt-4 flex flex-col gap-2 rounded-2xl border-[1.5px] border-dashed border-brand bg-brand-50 p-4">
      <b className="text-sm">Development: sign in as a seeded test user</b>
      <div className="grid grid-cols-2 gap-2">
        {(['creator', 'operator', 'traveler', 'admin'] as const).map((r) => (
          <button key={r} type="button" disabled={pending} className="h-10 rounded-xl border bg-card text-sm font-semibold capitalize hover:border-ink-3" onClick={() => start(async () => { const res = await devSignIn(r); if (res && !res.ok) setError(res.error) })}>{r}</button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  )
}
