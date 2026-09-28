'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { simulateInstagram } from '../actions'

/** Dev only: stands in for Instagram until Meta App Review is approved. */
export function SimulateForm() {
  const [followers, setFollowers] = useState('12400')
  const [username, setUsername] = useState('riya.travels')
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-dashed border-brand bg-brand-50 p-5"
      onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await simulateInstagram({ followers, username }); if (r && !r.ok) setError(r.error) }) }}
    >
      <b className="text-sm">Development mode: simulate Instagram</b>
      <p className="text-sm text-ink-2">Real Instagram connect turns on once INSTAGRAM_APP_ID is set. Pick what Instagram would return.</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">Username<input value={username} onChange={(e) => setUsername(e.target.value)} className="h-11 rounded-xl border bg-card px-3 font-normal" /></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Followers<input value={followers} onChange={(e) => setFollowers(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className="h-11 rounded-xl border bg-card px-3 font-normal" /></label>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">{['12400', '842', '1000'].map((n) => <button key={n} type="button" className="rounded-full border bg-card px-3 py-1 font-semibold" onClick={() => setFollowers(n)}>{Number(n).toLocaleString('en-IN')}</button>)}</div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" size="lg" disabled={pending}>{pending ? 'Connecting…' : 'Connect (simulated)'}</Button>
    </form>
  )
}
