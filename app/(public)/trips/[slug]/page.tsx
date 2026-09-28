import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Lock, MessageCircle, ShieldCheck } from 'lucide-react'
import { CreatorRibbon } from '@/components/trip/creator-ribbon'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Markdown } from '@/components/trip/markdown'
import { formatDateIST } from '@/lib/domain/dates'
import { formatINR } from '@/lib/domain/money'
import { jsonLdScript, tripJsonLd } from '@/lib/domain/seo'
import { publishedReviews, tripBySlug } from '@/lib/public/queries'
import { publicMediaUrl } from '@/lib/storage'
import { DepartureList } from './seats-left'
import { siteUrl } from '@/lib/site'

// ISR: cached per trip for an hour, refreshed on demand when the operator/admin edits it.
export const revalidate = 3600
export async function generateStaticParams() {
  return [] // build nothing up front; render each trip on first request, then cache
}


export async function generateMetadata({ params }: PageProps<'/trips/[slug]'>): Promise<Metadata> {
  const trip = await tripBySlug((await params).slug)
  if (!trip) return { title: 'Trip not found' }
  const title = `${trip.title} — ${trip.duration_days}D/${trip.duration_nights}N from ${formatINR(trip.from_price_paise)}`
  return {
    title,
    description: trip.summary ?? `${trip.destination} trip by ${trip.organizations.name}.`,
    alternates: { canonical: `/trips/${trip.slug}` }, // canonical without utm params
    openGraph: { title, description: trip.summary ?? undefined, type: 'website' },
  }
}

export default async function TripPage({ params }: PageProps<'/trips/[slug]'>) {
  const trip = await tripBySlug((await params).slug)
  if (!trip) notFound()
  const reviews = await publishedReviews(trip.id)
  const images = trip.trip_media.map((m) => ({ url: publicMediaUrl(m.storage_path), alt: m.alt ?? trip.title }))
  const minPrice = (d: TripDepartures[number]) => Math.min(...d.departure_price_options.map((o) => o.price_paise))
  type TripDepartures = typeof trip.departures

  const jsonLd = tripJsonLd({
    slug: trip.slug, title: trip.title, summary: trip.summary, destination: trip.destination, state: trip.state,
    durationDays: trip.duration_days, operatorName: trip.organizations.name,
    ratingAvg: Number(trip.organizations.rating_avg), ratingCount: trip.organizations.rating_count,
    imageUrls: images.map((i) => i.url),
    departures: trip.departures.filter((d) => d.departure_price_options.length).map((d) => ({ startDate: d.start_date, minPricePaise: minPrice(d), seatsOpen: d.status === 'open' })),
  }, siteUrl())

  const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  const waHref = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`Hi! I'm interested in ${trip.title} (ref: ${trip.slug})`)}` : null
  // Booking-mode CTA (ARCHITECTURE §20.3). Checkout (M8), enquiry form (Phase 4) and redirect (Phase 6) plug in here.
  const cta = {
    platform: { label: 'Check dates', note: 'Reserve with a deposit. Pay the rest before the trip.', trust: 'Paid securely on TripLink with refund protection.' },
    redirect: { label: `Book with ${trip.organizations.name}`, note: `Booked directly with ${trip.organizations.name}.`, trust: 'Your creator is credited when you book.' },
    enquiry: { label: 'Enquire now', note: `${trip.organizations.name} replies on WhatsApp, usually within 2 hours.`, trust: 'Your number is shared only with this operator.' },
  }[trip.booking_mode]
  const h2 = 'mb-2.5 text-[19px] font-bold'

  return (
    <main className="mx-auto max-w-[1180px] px-4 pt-4 md:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink-3"><Link href="/trips" className="font-semibold text-ink-2 hover:text-brand-700">Trips</Link> / <span>{trip.destination}</span></nav>
      <CreatorRibbon />

      <section aria-label="Photos" className={`mt-3.5 grid gap-2 overflow-hidden rounded-[18px] ${images.length >= 3 ? 'md:aspect-[2.5/1] md:grid-cols-[2fr_1fr] md:grid-rows-2' : ''}`}>
        {(images.length ? images.slice(0, 3) : [null]).map((img, i) => (
          <div key={img?.url ?? i} className={`relative bg-gradient-to-br from-teal-50 to-teal ${i === 0 ? (images.length >= 3 ? 'aspect-[16/10] md:row-span-2 md:aspect-auto' : 'aspect-[16/10] md:aspect-[2.5/1]') : 'hidden md:block'}`}>
            {img && <Image src={img.url} alt={img.alt} fill priority={i === 0} sizes={i === 0 ? '(max-width:768px) 100vw, 66vw' : '33vw'} className="object-cover" />}
            {i === 0 && images.length > 1 && <span className="absolute top-2.5 left-2.5 rounded-full bg-white/92 px-2.5 py-0.5 text-xs font-bold">1 / {images.length}</span>}
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="flex min-w-0 flex-col gap-7">
          <header className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              <Badge>{trip.duration_days}D/{trip.duration_nights}N</Badge>
              {trip.difficulty && <Badge className="capitalize">{trip.difficulty}</Badge>}
              <Badge variant="success"><ShieldCheck />Verified operator</Badge>
              {trip.host && <Badge variant="brand">Hosted by @{trip.host.handle}</Badge>}
            </div>
            <h1 className="text-[clamp(28px,3.4vw,38px)] font-extrabold">{trip.title}</h1>
            <p className="text-ink-2">{[trip.destination, trip.state].filter(Boolean).join(', ')}{trip.start_city && ` · from ${trip.start_city}`} · by {trip.organizations.name}</p>
            {trip.summary && <p className="max-w-[65ch]">{trip.summary}</p>}
          </header>

          <section id="dates" className="scroll-mt-20">
            <h2 className={h2}>Dates & seats</h2>
            {trip.departures.length ? (
              <DepartureList slug={trip.slug} rows={trip.departures.map((d) => ({
                id: d.id,
                dates: `${formatDateIST(d.start_date)} – ${formatDateIST(d.end_date)}`,
                prices: d.departure_price_options.map((o) => `${o.label} ${formatINR(o.price_paise)}`).join(' · ') + ' per person + GST',
                deposit: d.deposit_per_person_paise > 0 ? formatINR(d.deposit_per_person_paise) : null,
              }))} />
            ) : <p className="rounded-2xl border bg-card p-5 text-sm text-ink-2">No upcoming dates right now. Ask on WhatsApp to hear when new dates open.</p>}
            <p className="mt-2 text-xs text-ink-3">Seats update live.</p>
          </section>

          {trip.highlights.length > 0 && (
            <section><h2 className={h2}>Highlights</h2><ul className="ml-5 list-disc space-y-1">{trip.highlights.map((h) => <li key={h}>{h}</li>)}</ul></section>
          )}
          {trip.description_md && <section><h2 className={h2}>About this trip</h2><Markdown>{trip.description_md}</Markdown></section>}

          {trip.trip_itinerary_days.length > 0 && (
            <section>
              <h2 className={h2}>Itinerary</h2>
              <ol className="overflow-hidden rounded-2xl border bg-card">
                {trip.trip_itinerary_days.map((d) => (
                  <li key={d.day_number} className="border-t px-5 py-3.5 first:border-t-0">
                    <b>Day {d.day_number}</b> <span className="text-ink-2">· {d.title}</span>
                    {d.description && <p className="mt-1 text-sm whitespace-pre-line">{d.description}</p>}
                    {(d.meals.length > 0 || d.stay) && <p className="mt-1.5 text-xs text-ink-3">{d.meals.length > 0 && <span className="capitalize">Meals: {d.meals.join(', ')}</span>}{d.meals.length > 0 && d.stay && ' · '}{d.stay && `Stay: ${d.stay}`}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {(trip.inclusions.length > 0 || trip.exclusions.length > 0) && (
            <section className="grid gap-6 sm:grid-cols-2">
              {trip.inclusions.length > 0 && <div><h2 className={h2}>Included</h2><ul className="space-y-1 text-sm">{trip.inclusions.map((i) => <li key={i}><span className="text-success">✓</span> {i}</li>)}</ul></div>}
              {trip.exclusions.length > 0 && <div><h2 className={h2}>Not included</h2><ul className="space-y-1 text-sm">{trip.exclusions.map((i) => <li key={i}><span className="text-danger">✕</span> {i}</li>)}</ul></div>}
            </section>
          )}

          {trip.trip_pickup_points.length > 0 && (
            <section><h2 className={h2}>Pickup points</h2><ul className="space-y-1 text-sm">{trip.trip_pickup_points.map((p) => <li key={p.id}>{p.city}: {p.point}{p.time_note && ` (${p.time_note})`}{p.extra_price_paise > 0 && ` · +${formatINR(p.extra_price_paise)}`}</li>)}</ul></section>
          )}
          {trip.things_to_carry.length > 0 && (
            <section><h2 className={h2}>Things to carry</h2><ul className="ml-5 list-disc space-y-1 text-sm">{trip.things_to_carry.map((t) => <li key={t}>{t}</li>)}</ul></section>
          )}

          <section>
            <h2 className={h2}>Cancellation · {trip.cancellation_policies.name}</h2>
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full text-[15px]"><tbody>
                {trip.cancellation_policies.rules.map((r) => (
                  <tr key={r.min_days_before} className="border-t first:border-t-0">
                    <td className="px-4 py-3">{r.min_days_before === 0 ? 'Closer to the trip' : `${r.min_days_before}+ days before start`}</td>
                    <td className="px-4 py-3 text-right font-bold">{r.refund_pct ? `${r.refund_pct}% refund` : 'No refund'}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
            {trip.cancellation_policies.deposit_non_refundable && <p className="mt-2 text-xs text-ink-3">The deposit is non-refundable. Refunds go back to your original payment method in 5–7 working days.</p>}
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <b>{trip.organizations.name}</b>
            {trip.organizations.rating_count > 0 && <span className="text-sm text-ink-2"> · ★ {Number(trip.organizations.rating_avg).toFixed(1)} from {trip.organizations.rating_count} reviews</span>}
            {/* Seller details for the E-Commerce Rules; contact details are shared only after booking. */}
            <p className="mt-1 text-sm text-ink-2">{trip.organizations.legal_name}{trip.organizations.gstin && ` · GSTIN ${trip.organizations.gstin}`}{trip.organizations.city && ` · ${trip.organizations.city}`}</p>
          </section>

          <section>
            <h2 className={h2}>Reviews</h2>
            {reviews.length === 0 ? <p className="text-sm text-ink-2">No reviews yet. Reviews come only from travelers who completed this trip.</p> : (
              <ul className="flex flex-col gap-3">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-2xl border bg-card p-4">
                    <p className="text-sm font-semibold"><span className="text-warning">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span> {r.title}</p>
                    {r.body && <p className="mt-1 text-sm">{r.body}</p>}
                    <p className="mt-1 text-xs text-ink-3">Verified traveler</p>
                    {r.operator_reply && <p className="mt-2 border-l-2 pl-3 text-sm text-ink-2">Operator: {r.operator_reply}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </article>

        <aside className="hidden flex-col gap-3.5 self-start rounded-[18px] border bg-card p-5.5 shadow-[0_10px_30px_-12px_rgba(16,26,24,.16)] lg:sticky lg:top-20 lg:flex">
          <div><span className="text-sm text-ink-2">From</span><div className="flex items-baseline gap-2"><span className="num text-[30px] font-extrabold">{formatINR(trip.from_price_paise)}</span><span className="text-sm text-ink-2">per person + GST</span></div></div>
          <p className="text-sm text-ink-2">{cta.note}</p>
          <a href="#dates" className={buttonVariants({ size: 'lg', className: 'w-full' })}>{cta.label}</a>
          {waHref && <a href={waHref} rel="noopener" className={buttonVariants({ variant: 'outline', className: 'w-full text-success' })}><MessageCircle />Ask on WhatsApp</a>}
          <p className="flex items-center gap-1.5 text-xs text-ink-3"><Lock className="size-3.5" aria-hidden />{cta.trust}</p>
        </aside>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-8 flex items-center gap-2.5 border-t bg-white/97 px-4 py-3 md:-mx-6 md:px-6 lg:hidden">
        <div className="min-w-0 flex-1"><b className="num">{formatINR(trip.from_price_paise)}</b><div className="text-xs text-ink-2">per person + GST</div></div>
        {waHref && <a href={waHref} rel="noopener" aria-label="Ask on WhatsApp" className={buttonVariants({ variant: 'outline', size: 'icon', className: 'text-success' })}><MessageCircle /></a>}
        <a href="#dates" className={buttonVariants()}>{cta.label}</a>
      </div>
    </main>
  )
}
