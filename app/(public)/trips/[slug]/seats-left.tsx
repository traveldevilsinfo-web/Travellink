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
    <ul className="divide-y rounded-lg border">
      {rows.map((r) => {
        const l = live?.[r.id]
        const soldOut = l && (l.status === 'sold_out' || l.seatsLeft === 0)
        return (
          <li key={r.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{r.dates}</p>
              <p className="text-sm text-muted-foreground">{r.prices}{r.deposit && ` · book with ${r.deposit} deposit`}</p>
            </div>
            <span className={`text-sm ${soldOut ? 'font-medium text-destructive' : l && l.seatsLeft <= 5 ? 'font-medium text-amber-700' : 'text-muted-foreground'}`}>
              {!l ? 'Checking seats…' : soldOut ? 'Sold out' : l.seatsLeft <= 5 ? `Only ${l.seatsLeft} seats left` : `${l.seatsLeft} seats left`}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
