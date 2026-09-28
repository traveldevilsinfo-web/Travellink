'use client'

import { Check, Store } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { addToStorefront } from '@/app/creator/(app)/actions'

export function AddToStorefront({ tripId, added: initial }: { tripId: string; added: boolean }) {
  const [added, setAdded] = useState(initial)
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const cls = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-card font-semibold hover:border-ink-3'
  if (added) return <Link href="/creator/storefront" className={cls}><Check className="size-5 text-success" />On your storefront</Link>
  return (
    <>
      <button type="button" disabled={pending} className={cls} onClick={() => start(async () => { const r = await addToStorefront({ tripId }); if (r.ok) setAdded(true); else setError(r.error) })}>
        <Store className="size-5" />{pending ? 'Adding…' : 'Add to storefront'}
      </button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </>
  )
}
