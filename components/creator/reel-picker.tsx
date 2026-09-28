'use client'

import { Check, Clock, Play, RefreshCw } from 'lucide-react'
import type { ReelOption } from '@/app/creator/(app)/actions'
import { compactNumber } from '@/lib/format'
import { cn } from 'cn'

/** Reel thumbnail, or a gradient tile when Instagram gave none (simulated reels, expired CDN urls). */
export function ReelThumb({ src, className }: { src: string | null; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- Instagram CDN urls rotate; next/image would cache stale ones
    <img src={src} alt="" loading="lazy" className={cn('aspect-[9/16] w-full rounded-lg bg-subtle object-cover', className)} />
  ) : (
    <span aria-hidden className={cn('grid aspect-[9/16] w-full place-items-center rounded-lg bg-[linear-gradient(160deg,#FF9A5C,#DD2A7B_60%,#8134AF)] text-white', className)}><Play className="size-5 fill-current" /></span>
  )
}

export function ReelPicker({ reels, loading, selected, onSelect, onRefresh }: {
  reels?: ReelOption[]; loading: boolean; selected: string | null
  onSelect: (r: ReelOption | null) => void; onRefresh: () => void
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <legend className="text-sm font-semibold">Which reel is this for?</legend>
        <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 disabled:opacity-50">
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} aria-hidden />Refresh
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-busy={loading}>
        <button type="button" role="radio" aria-checked={selected === null} onClick={() => onSelect(null)}
          className={cn('flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed p-1 text-center text-xs font-semibold text-ink-2', selected === null && 'border-brand bg-brand-50 text-brand-700')}>
          <Clock className="size-4" aria-hidden />Not posted yet
        </button>
        {reels === undefined && Array.from({ length: 3 }, (_, i) => <span key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-subtle" />)}
        {reels?.slice(0, 7).map((r) => (
          <button key={r.id} type="button" role="radio" aria-checked={selected === r.id} aria-label={r.caption ?? 'Reel'} onClick={() => onSelect(r)}
            className={cn('relative rounded-lg ring-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-brand', selected === r.id && 'ring-[2.5px] ring-brand')}>
            <ReelThumb src={r.thumbnail_url} className="aspect-[3/4]" />
            {r.views != null && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[11px] font-semibold text-white num">{compactNumber(r.views)}</span>}
            {selected === r.id && <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-brand text-white"><Check className="size-3.5" aria-hidden /></span>}
          </button>
        ))}
      </div>
      {reels?.length === 0 && <p className="text-sm text-ink-3">No reels found yet. Post your reel, then tap Refresh, or make the link now without one.</p>}
    </fieldset>
  )
}
