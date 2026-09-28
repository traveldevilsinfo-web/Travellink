'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useSyncExternalStore } from 'react'

const HANDLE_RE = /^[a-z0-9_.]{3,30}$/
const read = () => {
  const m = document.cookie.match(/(?:^|;\s*)tl_by=([^;]+)/)
  const h = m ? decodeURIComponent(m[1]!) : ''
  return HANDLE_RE.test(h) ? h : ''
}

/**
 * "Recommended by @creator" on cached (ISR) pages. Reads the display-only tl_by cookie set by /r/[code];
 * attribution itself always comes from the signed, httpOnly tl_ref cookie on the server.
 */
export function CreatorRibbon() {
  // Notify once after subscribing so React re-reads the cookie after hydration (cookies never change mid-page here).
  const handle = useSyncExternalStore((cb) => { queueMicrotask(cb); return () => {} }, read, () => '')
  if (!handle) return null
  return (
    <Link href={`/@${handle}`} className="flex items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3 hover:bg-[#ffe6d8]">
      <span className="inline-grid shrink-0 rounded-full bg-[conic-gradient(#F58529,#DD2A7B,#8134AF,#F58529)] p-[2.5px]">
        <span aria-hidden className="grid size-9 place-items-center rounded-full border-[2.5px] border-white bg-brand text-sm font-bold text-white">{handle[0]!.toUpperCase()}</span>
      </span>
      <span className="min-w-0 flex-1"><b className="text-sm">Recommended by @{handle}</b><span className="block text-xs text-ink-2">See more trips they share</span></span>
      <ChevronRight className="size-4 text-ink-3" aria-hidden />
    </Link>
  )
}
