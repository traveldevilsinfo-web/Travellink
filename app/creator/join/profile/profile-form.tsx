'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { saveCreatorProfile, type ProfileInput } from '../actions'

const input = 'h-12 w-full rounded-xl border-[1.5px] bg-card px-3.5 text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand-50'

export function ProfileForm({ defaults, host }: { defaults: ProfileInput; host: string }) {
  const [v, setV] = useState(defaults)
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const set = (k: keyof ProfileInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value })
  const handleOk = /^[a-z0-9_.]{3,30}$/.test(v.handle)
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveCreatorProfile(v); if (r && !r.ok) setError(r.error) }) }} noValidate>
      <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor="dn">Display name<input id="dn" className={input} value={v.displayName} onChange={set('displayName')} autoComplete="name" /></label>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold" htmlFor="hd">Storefront address</label>
        <div className="flex items-center rounded-xl border-[1.5px] bg-card pl-3.5 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-50">
          <span className="text-sm font-semibold whitespace-nowrap text-ink-2">{host}/@</span>
          <input id="hd" className="h-12 min-w-0 flex-1 bg-transparent pr-3 text-base outline-none" value={v.handle} onChange={(e) => setV({ ...v, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') })} autoCapitalize="none" spellCheck={false} aria-describedby="hdh" />
        </div>
        <span id="hdh" className={`text-sm ${handleOk ? 'text-ink-3' : 'text-danger'}`}>{handleOk ? '3–30 letters, numbers, dots or underscores.' : 'Use 3–30 letters, numbers, dots or underscores.'}</span>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor="hc">Home city<input id="hc" className={input} value={v.homeCity} onChange={set('homeCity')} /><span className="font-normal text-ink-3">We show you trips that start near you first.</span></label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor="bio">Bio<textarea id="bio" rows={2} maxLength={200} className="rounded-xl border-[1.5px] bg-card px-3.5 py-3 text-base font-normal outline-none focus:border-brand focus:ring-4 focus:ring-brand-50" value={v.bio} onChange={set('bio')} /></label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" size="lg" disabled={pending || !handleOk}>{pending ? 'Saving…' : 'Continue'}</Button>
    </form>
  )
}
