import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatINR } from '@/lib/domain/money'
import { type CatalogTrip, commissionPct, earnPerTravelerPaise } from '@/lib/creator/queries'
import { publicMediaUrl } from '@/lib/storage'

export const MODE_LABEL = { platform: ['Book on TripLink', 'teal'], redirect: ["Operator's site", 'info'], enquiry: ['Enquiry', 'warning'] } as const

export function ModeBadge({ mode }: { mode: CatalogTrip['booking_mode'] }) {
  const [label, tone] = MODE_LABEL[mode]
  return <Badge variant={tone}>{label}</Badge>
}

export function CatalogCard({ trip, priority }: { trip: CatalogTrip; priority?: boolean }) {
  return (
    <Link href={`/creator/trips/${trip.slug}`} className="flex flex-col overflow-hidden rounded-[18px] border bg-card text-left transition-shadow hover:border-transparent hover:shadow-[0_10px_30px_-12px_rgba(16,26,24,.2)]">
      <div className="relative aspect-[4/3] bg-gradient-to-br from-teal-50 to-teal">
        {trip.cover_image_path && <Image src={publicMediaUrl(trip.cover_image_path)} alt="" fill priority={priority} sizes="(max-width:600px) 100vw, (max-width:1100px) 50vw, 33vw" className="object-cover" />}
        <span className="absolute top-2.5 left-2.5"><ModeBadge mode={trip.booking_mode} /></span>
      </div>
      <div className="flex flex-col gap-1.5 px-4 pt-3.5 pb-4">
        <h3 className="text-base leading-snug font-bold">{trip.title}</h3>
        <span className="text-sm text-ink-2">{trip.destination} · {trip.duration_days}D/{trip.duration_nights}N · from {formatINR(trip.from_price_paise)}</span>
        <div className="mt-1 flex items-center justify-between gap-2 rounded-xl bg-brand-50 px-3 py-2.5">
          <div>
            <div className="text-xs font-bold text-ink-3">YOU EARN</div>
            <b className="num">{formatINR(earnPerTravelerPaise(trip))}<span className="text-xs font-semibold text-ink-2"> / traveler</span></b>
          </div>
          {trip.lead_fee_paise > 0 ? (
            <div className="text-right"><div className="text-xs font-bold text-ink-3">PER LEAD</div><b className="num">{formatINR(trip.lead_fee_paise)}</b></div>
          ) : (
            <Badge>{commissionPct(trip)}%</Badge>
          )}
        </div>
      </div>
    </Link>
  )
}
