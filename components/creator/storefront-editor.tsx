'use client'

import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { createCollection, deleteCollection, saveStorefrontList } from '@/app/creator/(app)/actions'
import { Button } from '@/components/ui/button'

type Trip = { id: string; title: string; destination: string }

export function StorefrontEditor({ trips, main, collections }: { trips: Trip[]; main: string[]; collections: { id: string; title: string; tripIds: string[] }[] }) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  return (
    <div className="flex flex-col gap-4">
      <ListEditor key={`main:${main.join()}`} heading="Trips" hint="The first tab of your storefront, in this order." collectionId={null} initial={main} trips={trips} />
      {collections.map((c) => (
        <ListEditor key={`${c.id}:${c.tripIds.join()}`} heading={c.title} hint="Collection" collectionId={c.id} initial={c.tripIds} trips={trips}
          onDelete={() => { if (confirm(`Delete the collection “${c.title}”? The trips stay on your storefront.`)) start(async () => { const r = await deleteCollection({ id: c.id }); if (!r.ok) setError(r.error) }) }} />
      ))}
      <form
        className="flex flex-col gap-2 rounded-2xl border border-dashed bg-card p-5"
        onSubmit={(e) => { e.preventDefault(); setError(undefined); start(async () => { const r = await createCollection({ title }); if (r.ok) setTitle(''); else setError(r.error) }) }}
      >
        <label htmlFor="new-collection" className="font-semibold">New collection</label>
        <span className="text-sm text-ink-2">Group trips by theme, like &ldquo;Monsoon treks&rdquo; or &ldquo;Under ₹10k&rdquo;.</span>
        <div className="flex gap-2">
          <input id="new-collection" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} placeholder="Collection name" className="h-11 min-w-0 flex-1 rounded-xl border-[1.5px] px-3.5 outline-none focus:border-brand focus:ring-4 focus:ring-brand-50" />
          <Button type="submit" disabled={pending || title.trim().length < 2}><Plus />Add</Button>
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </form>
    </div>
  )
}

function ListEditor({ heading, hint, collectionId, initial, trips, onDelete }: {
  heading: string; hint: string; collectionId: string | null; initial: string[]; trips: Trip[]; onDelete?: () => void
}) {
  const [ids, setIds] = useState(initial)
  const [error, setError] = useState<string>()
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()
  const byId = new Map(trips.map((t) => [t.id, t]))
  const shown = ids.filter((id) => byId.has(id)) // trips that stopped being public drop out on the next save
  const dirty = shown.join() !== initial.filter((id) => byId.has(id)).join()
  const addable = trips.filter((t) => !ids.includes(t.id))
  const change = (next: string[]) => { setIds(next); setSaved(false) }
  const move = (i: number, d: -1 | 1) => { const n = [...shown]; [n[i], n[i + d]] = [n[i + d]!, n[i]!]; change(n) }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1"><b>{heading}</b><div className="text-sm text-ink-2">{hint} · {shown.length} {shown.length === 1 ? 'trip' : 'trips'}</div></div>
        {onDelete && <Button variant="ghost" size="sm" onClick={onDelete} aria-label={`Delete collection ${heading}`}><Trash2 /></Button>}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-xl bg-subtle px-4 py-3 text-sm text-ink-2">No trips here yet. Add one below{collectionId === null && <>, or <Link href="/creator/trips" className="font-semibold text-brand-700 hover:underline">get a link</Link> for a trip</>}.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {shown.map((id, i) => (
            <li key={id} className="flex items-center gap-2 rounded-xl border py-2 pr-2 pl-3.5">
              <span className="num w-5 text-sm text-ink-3">{i + 1}</span>
              <div className="min-w-0 flex-1"><b className="block truncate">{byId.get(id)!.title}</b><span className="text-sm text-ink-2">{byId.get(id)!.destination}</span></div>
              <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp /></Button>
              <Button variant="ghost" size="icon" disabled={i === shown.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown /></Button>
              <Button variant="ghost" size="icon" onClick={() => change(shown.filter((x) => x !== id))} aria-label={`Remove ${byId.get(id)!.title}`}><X /></Button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {addable.length > 0 && (
          <select aria-label={`Add a trip to ${heading}`} value="" onChange={(e) => e.target.value && change([...shown, e.target.value])} className="h-11 min-w-0 flex-1 rounded-xl border-[1.5px] bg-card px-3">
            <option value="">+ Add a trip…</option>
            {addable.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        )}
        <Button disabled={!dirty || pending} onClick={() => { setError(undefined); start(async () => { const r = await saveStorefrontList({ collectionId, tripIds: shown }); if (r.ok) setSaved(true); else setError(r.error) }) }}>
          {pending ? 'Saving…' : saved && !dirty ? 'Saved' : 'Save order'}
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </section>
  )
}
