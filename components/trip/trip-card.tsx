import Image from 'next/image'
import Link from 'next/link'
import { formatINR } from '@/lib/domain/money'
import type { TripCard as Trip } from '@/lib/public/queries'
import { publicMediaUrl } from '@/lib/storage'

export function TripCard({ trip, priority = false }: { trip: Trip; priority?: boolean }) {
  return (
    <Link href={`/trips/${trip.slug}`} className="group flex flex-col gap-2 rounded-xl focus-visible:outline-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        {trip.cover_image_path && (
          <Image
            src={publicMediaUrl(trip.cover_image_path)}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform group-hover:scale-[1.02]"
          />
        )}
      </div>
      <div>
        <h3 className="line-clamp-2 font-medium leading-snug">{trip.title}</h3>
        <p className="text-sm text-muted-foreground">
          {trip.destination} · {trip.duration_days}D/{trip.duration_nights}N
          {trip.organizations.rating_count > 0 && ` · ★ ${Number(trip.organizations.rating_avg).toFixed(1)}`}
        </p>
        <p className="mt-0.5 text-sm"><span className="font-semibold">{formatINR(trip.from_price_paise)}</span> <span className="text-muted-foreground">onwards + GST</span></p>
      </div>
    </Link>
  )
}

export function TripGrid({ trips, priorityCount = 0 }: { trips: Trip[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {trips.map((t, i) => <li key={t.id}><TripCard trip={t} priority={i < priorityCount} /></li>)}
    </ul>
  )
}
