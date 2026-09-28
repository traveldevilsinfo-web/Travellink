import { ImageResponse } from 'next/og'
import { formatINR } from '@/lib/domain/money'
import { tripBySlug } from '@/lib/public/queries'
import { publicMediaUrl } from '@/lib/storage'

export const alt = 'Trip on TripLink'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 3600

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const trip = await tripBySlug((await params).slug)
  const cover = trip?.cover_image_path ? publicMediaUrl(trip.cover_image_path) : null
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#111', color: 'white' }}>
        {cover && (
          <img src={cover} alt="" width={1200} height={630} style={{ position: 'absolute', inset: 0, objectFit: 'cover', opacity: 0.55 }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 60, gap: 12, width: '100%' }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{trip?.title ?? 'TripLink'}</div>
          {trip && (
            <div style={{ fontSize: 34 }}>
              {trip.destination} · {trip.duration_days}D/{trip.duration_nights}N · from {formatINR(trip.from_price_paise)}
            </div>
          )}
          <div style={{ fontSize: 28, opacity: 0.8 }}>TripLink</div>
        </div>
      </div>
    ),
    size,
  )
}
