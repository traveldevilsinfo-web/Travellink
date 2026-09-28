import Image from 'next/image'
import Link from 'next/link'
import { formatINR } from '@/lib/domain/money'
import type { TripCard as Trip } from '@/lib/public/queries'
import { publicMediaUrl } from '@/lib/storage'

export function TripCard({ trip, priority = false }: { trip: Trip; priority?: boolean }) {
  return (
    <Link href={`/trips/${trip.slug}`} className="group flex flex-col overflow-hidden rounded-[18px] border bg-card transition-shadow hover:border-transparent hover:shadow-[0_10px_30px_-12px_rgba(16,26,24,.2)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-teal-50 to-teal">
        {trip.cover_image_path && (
          <Image
            src={publicMediaUrl(trip.cover_image_path)}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
        )}
      </div>
      <div className="flex flex-col gap-1 px-4 pt-3.5 pb-4">
        <h3 className="line-clamp-2 font-bold leading-snug">{trip.title}</h3>
        <p className="text-sm text-ink-2">
          {trip.destination} · {trip.duration_days}D/{trip.duration_nights}N
          {trip.organizations.rating_count > 0 && ` · ★ ${Number(trip.organizations.rating_avg).toFixed(1)}`}
        </p>
        <p className="text-sm"><span className="num font-bold">{formatINR(trip.from_price_paise)}</span> <span className="text-ink-2">onwards + GST</span></p>
      </div>
    </Link>
  )
}

export function TripGrid({ trips, priorityCount = 0 }: { trips: Trip[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {trips.map((t, i) => <li key={t.id}><TripCard trip={t} priority={i < priorityCount} /></li>)}
    </ul>
  )
}
