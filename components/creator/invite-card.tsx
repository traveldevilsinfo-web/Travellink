'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { respondInvite } from '@/app/creator/(app)/actions'
import { Button } from '@/components/ui/button'

export function InviteCard({ id, org, trip, slug, pct, message }: { id: string; org: string; trip: string; slug: string; pct: number | null; message: string | null }) {
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const act = (accept: boolean) => start(async () => { const r = await respondInvite({ inviteId: id, accept }); if (!r.ok) setError(r.error) })
  return (
    <li className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-brand bg-brand-50 p-4">
      <div><b>{org}</b> invited you to promote <Link href={`/creator/trips/${slug}`} className="font-semibold text-brand-700 hover:underline">{trip}</Link>{pct != null && <> at <b className="num">{pct}%</b> commission</>}</div>
      {message && <p className="text-sm text-ink-2">“{message}”</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => act(true)}>Accept</Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(false)}>Decline</Button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </li>
  )
}
