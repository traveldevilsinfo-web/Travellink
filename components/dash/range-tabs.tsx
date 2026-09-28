import Link from 'next/link'
import { RANGES, type RangeKey } from '@/lib/domain/performance'

export function RangeTabs({ path, current }: { path: string; current: RangeKey }) {
  return (
    <nav className="flex gap-1 rounded-xl border bg-card p-1" aria-label="Date range">
      {RANGES.map(([k, label]) => (
        <Link key={k} href={k === '30' ? path : `${path}?range=${k}`} aria-current={current === k ? 'true' : undefined}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-ink-2 hover:text-ink aria-[current=true]:bg-ink aria-[current=true]:text-white">{label}</Link>
      ))}
    </nav>
  )
}
