import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Markdown } from '@/components/trip/markdown'
import { formatDateIST } from '@/lib/domain/dates'
import { formatINR } from '@/lib/domain/money'
import { jsonLdScript, tripJsonLd } from '@/lib/domain/seo'
import { publishedReviews, tripBySlug } from '@/lib/public/queries'
import { publicMediaUrl } from '@/lib/storage'
import { DepartureList } from './seats-left'

// ISR: cached per trip for an hour, refreshed on demand when the operator/admin edits it.
export const revalidate = 3600
export async function generateStaticParams() {
  return [] // build nothing up front; render each trip on first request, then cache
}

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

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
  // ponytail: ref = trip slug until tracked links land (M4); M10 parses creator refs from this text.
  const waHref = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`Hi! I'm interested in ${trip.title} (ref: ${trip.slug})`)}` : null

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/trips">Trips</Link> / <span>{trip.destination}</span>
      </nav>

      {images.length > 0 && (
        <section aria-label="Photos" className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:grid-rows-2 sm:overflow-visible sm:px-0">
          {images.slice(0, 5).map((img, i) => (
            <div key={img.url} className={`relative aspect-[4/3] w-[85%] shrink-0 snap-center overflow-hidden rounded-xl bg-muted sm:w-auto ${i === 0 ? 'sm:col-span-2 sm:row-span-2' : ''}`}>
              <Image src={img.url} alt={img.alt} fill priority={i === 0} sizes={i === 0 ? '(max-width: 640px) 85vw, 50vw' : '(max-width: 640px) 85vw, 25vw'} className="object-cover" />
            </div>
          ))}
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <article className="flex min-w-0 flex-col gap-8">
          <header className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{trip.duration_days}D/{trip.duration_nights}N</Badge>
              {trip.difficulty && <Badge variant="outline" className="capitalize">{trip.difficulty}</Badge>}
              {trip.host && <Badge>Hosted by @{trip.host.handle}</Badge>}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{trip.title}</h1>
            <p className="text-muted-foreground">{[trip.destination, trip.state].filter(Boolean).join(', ')}{trip.start_city && ` · from ${trip.start_city}`}</p>
            {trip.summary && <p>{trip.summary}</p>}
          </header>

          {trip.highlights.length > 0 && (
            <section><h2 className="mb-2 text-lg font-semibold">Highlights</h2><ul className="ml-5 list-disc space-y-1">{trip.highlights.map((h) => <li key={h}>{h}</li>)}</ul></section>
          )}

          {trip.description_md && <section><h2 className="mb-2 text-lg font-semibold">About this trip</h2><Markdown>{trip.description_md}</Markdown></section>}

          {trip.trip_itinerary_days.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Itinerary</h2>
              <ol className="flex flex-col gap-3">
                {trip.trip_itinerary_days.map((d) => (
                  <li key={d.day_number} className="rounded-lg border p-4">
                    <p className="font-medium">Day {d.day_number}: {d.title}</p>
                    {d.description && <p className="mt-1 whitespace-pre-line text-sm">{d.description}</p>}
                    {(d.meals.length > 0 || d.stay) && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {d.meals.length > 0 && <span className="capitalize">Meals: {d.meals.join(', ')}</span>}
                        {d.meals.length > 0 && d.stay && ' · '}
                        {d.stay && `Stay: ${d.stay}`}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="grid gap-6 sm:grid-cols-2">
            {trip.inclusions.length > 0 && <div><h2 className="mb-2 text-lg font-semibold">Included</h2><ul className="space-y-1 text-sm">{trip.inclusions.map((i) => <li key={i}>✓ {i}</li>)}</ul></div>}
            {trip.exclusions.length > 0 && <div><h2 className="mb-2 text-lg font-semibold">Not included</h2><ul className="space-y-1 text-sm">{trip.exclusions.map((i) => <li key={i}>✕ {i}</li>)}</ul></div>}
          </section>

          <section id="dates">
            <h2 className="mb-3 text-lg font-semibold">Dates & prices</h2>
            {trip.departures.length ? (
              <DepartureList
                slug={trip.slug}
                rows={trip.departures.map((d) => ({
                  id: d.id,
                  dates: `${formatDateIST(d.start_date)} – ${formatDateIST(d.end_date)}`,
                  prices: d.departure_price_options.map((o) => `${o.label} ${formatINR(o.price_paise)}`).join(' · ') + ' per person + GST',
                  deposit: d.deposit_per_person_paise > 0 ? formatINR(d.deposit_per_person_paise) : null,
                }))}
              />
            ) : <p className="text-sm text-muted-foreground">No upcoming dates right now. Message us on WhatsApp to hear when new dates open.</p>}
          </section>

          {trip.trip_pickup_points.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-semibold">Pickup points</h2>
              <ul className="space-y-1 text-sm">
                {trip.trip_pickup_points.map((p) => (
                  <li key={p.id}>{p.city}: {p.point}{p.time_note && ` (${p.time_note})`}{p.extra_price_paise > 0 && ` · +${formatINR(p.extra_price_paise)}`}</li>
                ))}
              </ul>
            </section>
          )}

          {trip.things_to_carry.length > 0 && (
            <section><h2 className="mb-2 text-lg font-semibold">Things to carry</h2><ul className="ml-5 list-disc space-y-1 text-sm">{trip.things_to_carry.map((t) => <li key={t}>{t}</li>)}</ul></section>
          )}

          <section>
            <h2 className="mb-2 text-lg font-semibold">Cancellation policy: {trip.cancellation_policies.name}</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground"><th className="py-1 font-normal">Cancel</th><th className="py-1 font-normal">Refund</th></tr></thead>
              <tbody>
                {trip.cancellation_policies.rules.map((r) => (
                  <tr key={r.min_days_before} className="border-t">
                    <td className="py-1.5">{r.min_days_before === 0 ? 'Less than that' : `${r.min_days_before}+ days before start`}</td>
                    <td className="py-1.5">{r.refund_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {trip.cancellation_policies.deposit_non_refundable && <p className="mt-2 text-xs text-muted-foreground">The deposit is non-refundable.</p>}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Reviews</h2>
            {reviews.length === 0 ? <p className="text-sm text-muted-foreground">No reviews yet. Reviews come only from travelers who completed this trip.</p> : (
              <ul className="flex flex-col gap-4">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-lg border p-4">
                    <p className="text-sm font-medium">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} {r.title}</p>
                    {r.body && <p className="mt-1 text-sm">{r.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">Verified traveler</p>
                    {r.operator_reply && <p className="mt-2 border-l-2 pl-3 text-sm text-muted-foreground">Operator: {r.operator_reply}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </article>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Starting from</p>
            <p className="text-2xl font-semibold">{formatINR(trip.from_price_paise)}</p>
            <p className="text-xs text-muted-foreground">per person + GST</p>
            <div className="mt-4 flex flex-col gap-2">
              <a href="#dates" className={buttonVariants()}>See dates</a>
              {waHref && <a href={waHref} className={buttonVariants({ variant: 'outline' })} rel="noopener">Chat on WhatsApp</a>}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Online booking opens soon. Pay securely on TripLink for refund protection.</p>
          </div>
          <div className="rounded-xl border p-4 text-sm">
            <p className="font-medium">Operated by {trip.organizations.name}</p>
            {trip.organizations.rating_count > 0 && <p>★ {Number(trip.organizations.rating_avg).toFixed(1)} ({trip.organizations.rating_count} reviews)</p>}
            {/* Seller details for the E-Commerce Rules; contact details are shared only after booking. */}
            <p className="mt-1 text-xs text-muted-foreground">{trip.organizations.legal_name}{trip.organizations.gstin && ` · GSTIN ${trip.organizations.gstin}`}{trip.organizations.city && ` · ${trip.organizations.city}`}</p>
          </div>
          {trip.host && (
            <Link href={`/@${trip.host.handle}`} className="rounded-xl border p-4 text-sm hover:bg-muted/50">
              Hosted by <span className="font-medium">{trip.host.display_name}</span> (@{trip.host.handle}) →
            </Link>
          )}
        </aside>
      </div>
    </main>
  )
}
