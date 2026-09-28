'use client'

import { useEffect, useState } from 'react'

type Live = Record<string, { seatsLeft: number; status: string }>

/** The trip page is cached for up to an hour; seat counts are fetched fresh on load. */
export function useLiveSeats(slug: string) {
  const [live, setLive] = useState<Live>()
  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`/api/v1/trips/${slug}/departures`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { departures: { id: string; seatsLeft: number; status: string }[] } | null) => {
        if (j) setLive(Object.fromEntries(j.departures.map((d) => [d.id, d])))
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [slug])
  return live
}

export type DepartureRow = { id: string; dates: string; prices: string; deposit: string | null }

/** Departure list with one fresh seats request for all rows. */
export function DepartureList({ slug, rows }: { slug: string; rows: DepartureRow[] }) {
  const live = useLiveSeats(slug)
  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
      {rows.map((r) => {
        const l = live?.[r.id]
        const soldOut = l && (l.status === 'sold_out' || l.seatsLeft === 0)
        return (
          <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div>
              <p className="font-bold">{r.dates}</p>
              <p className="text-sm text-ink-2">{r.prices}{r.deposit && ` · reserve with ${r.deposit}`}</p>
            </div>
            <span className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-bold whitespace-nowrap ${soldOut ? 'bg-danger-50 text-danger' : l && l.seatsLeft <= 5 ? 'bg-warning-50 text-warning' : 'bg-subtle text-ink-2'}`}>
              {!l ? 'Checking seats…' : soldOut ? 'Sold out' : l.seatsLeft <= 5 ? `Only ${l.seatsLeft} seats left` : `${l.seatsLeft} seats left`}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
