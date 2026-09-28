import { ChevronRight, ShieldCheck, Store } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ModeBadge } from '@/components/creator/catalog-card'
import { GetLinkDialog } from '@/components/creator/get-link-dialog'
import { Badge } from '@/components/ui/badge'
import { catalog, commissionPct, earnPerTravelerPaise, nextDeparture, requireActiveCreator } from '@/lib/creator/queries'
import { formatDateIST } from '@/lib/domain/dates'
import { formatINR } from '@/lib/domain/money'
import { siteUrl } from '@/lib/site'
import { publicMediaUrl } from '@/lib/storage'

export const metadata: Metadata = { title: 'Trip', robots: { index: false } }

const HOW = {
  platform: 'Followers book and pay on TripLink. Tracking is automatic, and your commission is guaranteed once the booking is confirmed.',
  redirect: "Followers go from TripLink to the operator's own website with your click ID attached. The operator reports the booking; you're paid once they pay their monthly invoice.",
  enquiry: 'Followers send an enquiry through TripLink. The operator follows up on WhatsApp and marks the booking in their dashboard.',
} as const

export default async function CreatorTrip({ params }: PageProps<'/creator/trips/[slug]'>) {
  const { slug } = await params
  const { supabase } = await requireActiveCreator(`/creator/trips/${slug}`)
  const [trip] = await catalog(supabase, { slug })
  if (!trip) notFound()
  const { data: media } = await supabase.from('trip_media').select('storage_path').eq('trip_id', trip.id).order('sort_order').limit(3)
  const photos = (media ?? []).map((m) => publicMediaUrl(m.storage_path))
  const next = nextDeparture(trip)
  const earn = earnPerTravelerPaise(trip)

  return (
    <>
      <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-ink-3" aria-label="Breadcrumb">
        <Link href="/creator/trips" className="font-semibold text-ink-2 hover:text-brand-700">Find trips</Link><ChevronRight className="size-4" aria-hidden /><span>{trip.title}</span>
      </nav>
      <div className="grid gap-2 overflow-hidden rounded-[18px] md:aspect-[2.5/1] md:grid-cols-[2fr_1fr] md:grid-rows-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`relative bg-gradient-to-br from-teal-50 to-teal ${i === 0 ? 'aspect-[16/10] md:row-span-2 md:aspect-auto' : 'hidden md:block'}`}>
            {photos[i] && <Image src={photos[i]} alt="" fill priority={i === 0} sizes={i === 0 ? '(max-width:768px) 100vw, 66vw' : '33vw'} className="object-cover" />}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5"><Badge>{trip.duration_days}D/{trip.duration_nights}N</Badge><ModeBadge mode={trip.booking_mode} /><Badge variant="success"><ShieldCheck />Verified operator</Badge></div>
            <h1 className="text-[clamp(26px,3vw,34px)] font-extrabold">{trip.title}</h1>
            <span className="text-ink-2">{trip.destination} · by {trip.organizations?.name} · from {formatINR(trip.from_price_paise)} + GST</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4 rounded-2xl border bg-card p-5">
            {([['Per booking', formatINR(earn), `${commissionPct(trip)}% per traveler`], ['Per qualified lead', trip.lead_fee_paise ? formatINR(trip.lead_fee_paise) : '—', trip.lead_fee_paise ? 'OTP-verified enquiry' : 'Not offered'], ['Next departure', next ? formatDateIST(next) : 'None yet', next ? 'Seats update live' : 'Operator adding dates']] as const).map(([a, b, c]) => (
              <div key={a}><div className="text-xs font-bold tracking-wide text-ink-3 uppercase">{a}</div><div className="num text-[22px] font-extrabold">{b}</div><div className="text-xs text-ink-2">{c}</div></div>
            ))}
          </div>
          <section><h2 className="mb-2.5 text-lg font-bold">How this trip is booked</h2><p className="rounded-2xl border bg-card p-5 text-sm text-ink-2">{HOW[trip.booking_mode]}</p></section>
          <section><h2 className="mb-2.5 text-lg font-bold">How you get paid</h2>
            <ol className="flex list-decimal flex-col gap-1.5 rounded-2xl border bg-card py-5 pr-5 pl-10 text-sm">
              <li><b>Pending</b> as soon as a follower books with your link.</li>
              <li><b>Confirmed</b> once the booking can no longer be refunded.</li>
              <li><b>Payable</b> 3 days after the trip ends. Paid to your UPI on the 5th.</li>
            </ol>
          </section>
        </div>
        <aside className="hidden flex-col gap-3.5 self-start rounded-[18px] border bg-card p-5.5 shadow-[0_10px_30px_-12px_rgba(16,26,24,.16)] lg:sticky lg:top-20 lg:flex">
          <div className="text-sm text-ink-2">You earn per traveler</div>
          <div className="num text-[32px] font-extrabold tracking-[-0.02em]">{formatINR(earn)}</div>
          {trip.lead_fee_paise > 0 && <div className="text-sm">+ <b>{formatINR(trip.lead_fee_paise)}</b> per qualified enquiry</div>}
          <GetLinkDialog tripId={trip.id} tripTitle={trip.title} siteHost={siteUrl()} />
          <Link href="/creator/storefront" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-card font-semibold hover:border-ink-3"><Store className="size-5" />Add to storefront</Link>
          <p className="text-xs text-ink-3">Travelers never see your commission.</p>
        </aside>
      </div>
      <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex items-center gap-2.5 border-t bg-white/95 px-4 py-3 md:-mx-7 md:px-7 lg:hidden">
        <div className="min-w-0 flex-1"><b className="num">{formatINR(earn)}</b><div className="text-xs text-ink-2">per traveler{trip.lead_fee_paise ? ` + ${formatINR(trip.lead_fee_paise)}/lead` : ''}</div></div>
        <div className="w-40"><GetLinkDialog tripId={trip.id} tripTitle={trip.title} siteHost={siteUrl()} /></div>
      </div>
    </>
  )
}
