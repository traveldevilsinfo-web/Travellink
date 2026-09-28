'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { acceptCreatorRules } from '../actions'

const RULES = [
  ['disclose', 'Add #ad or "Paid partnership"', 'Indian advertising rules (ASCI) require it. Our caption templates include it.'],
  ['honest', 'Only promote trips as they are', 'No fake discounts, reviews or promises. The operator runs the trip.'],
  ['earnings', 'You earn when they travel', 'Booking commission confirms once the booking can no longer be refunded. Lead fees confirm after a 7-day check.'],
] as const

export function RulesForm() {
  const [ticked, setTicked] = useState({ disclose: false, honest: false, earnings: false })
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const all = Object.values(ticked).every(Boolean)
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await acceptCreatorRules(ticked); if (r && !r.ok) setError(r.error) }) }}>
      {RULES.map(([k, t, d]) => (
        <label key={k} className="flex cursor-pointer gap-3 rounded-2xl border-[1.5px] bg-card px-4 py-3.5 has-checked:border-brand has-checked:bg-brand-50">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-brand" checked={ticked[k]} onChange={(e) => setTicked({ ...ticked, [k]: e.target.checked })} />
          <span><b>{t}</b><span className="mt-0.5 block text-sm text-ink-2">{d}</span></span>
        </label>
      ))}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" size="lg" disabled={!all || pending} className="mt-1">{pending ? 'Saving…' : 'Start earning'}</Button>
    </form>
  )
}
