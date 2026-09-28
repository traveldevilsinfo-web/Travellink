import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'teal'

export function Kpi({ label, value, note, tone = 'neutral', badgeLabel }: { label: string; value: ReactNode; note?: string; tone?: Tone; badgeLabel?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border bg-card p-4">
      {badgeLabel ? <Badge variant={tone}>{label}</Badge> : <div className="text-sm text-ink-2">{label}</div>}
      <div className="num mt-1 text-[23px] font-extrabold tracking-[-0.02em]">{value}</div>
      {note && !badgeLabel && <Badge variant={tone} className="mt-1.5">{note}</Badge>}
    </div>
  )
}

/** Clicks → visitors → leads → bookings → money, as one strip (ARCHITECTURE §20.5). */
export function FunnelStrip({ items }: { items: [string, ReactNode][] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0 bg-card px-4 py-3.5">
          <span className="text-xs text-ink-3">{label}</span>
          <b className="num block text-[22px] font-extrabold tracking-[-0.02em]">{value}</b>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-2xl border bg-card px-6 py-12 text-center">
      <span className="grid size-15 place-items-center rounded-2xl bg-brand-50 text-brand-700 [&_svg]:size-7">{icon}</span>
      <b className="text-[17px]">{title}</b>
      {children}
    </div>
  )
}
