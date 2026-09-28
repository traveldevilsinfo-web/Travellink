import { Link2 } from 'lucide-react'
import Link from 'next/link'

export function Logo({ href = '/', tag, inverted = false }: { href?: string; tag?: string; inverted?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-[19px] font-extrabold tracking-[-0.03em]" aria-label="TripLink home">
      <span className={`grid size-[30px] place-items-center rounded-[9px] text-white ${inverted ? 'bg-white/20' : 'bg-brand'}`}>
        <Link2 className="size-[18px]" aria-hidden />
      </span>
      TripLink
      {tag && <span className={`ml-0.5 text-[11px] font-bold uppercase tracking-[0.04em] ${inverted ? 'text-white/80' : 'text-ink-3'}`}>{tag}</span>}
    </Link>
  )
}
