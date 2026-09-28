import { Camera } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CopyButton } from '@/components/creator/copy-button'
import { TripGrid } from '@/components/trip/trip-card'
import { creatorByHandle } from '@/lib/public/queries'
import { siteUrl } from '@/lib/site'

// Served at /@handle via proxy.ts rewrite. ISR 10 min (ARCHITECTURE §12).
export const revalidate = 600
export async function generateStaticParams() {
  return []
}

const compact = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)}K` : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}K` : String(n))

export async function generateMetadata({ params }: PageProps<'/c/[handle]'>): Promise<Metadata> {
  const res = await creatorByHandle((await params).handle)
  if (!res) return { title: 'Creator not found' }
  const { creator } = res
  return {
    title: `${creator.display_name} (@${creator.handle}) trips`,
    description: creator.bio ?? `Group trips picked by ${creator.display_name} on TripLink.`,
    alternates: { canonical: `/@${creator.handle}` },
  }
}

export default async function Storefront({ params }: PageProps<'/c/[handle]'>) {
  const res = await creatorByHandle((await params).handle)
  if (!res) notFound()
  const { creator, trips } = res
  return (
    <main>
      <section className="border-b bg-card">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-start gap-4 px-4 py-6 md:px-6">
          <span className="inline-grid shrink-0 rounded-full bg-[conic-gradient(#F58529,#DD2A7B,#8134AF,#F58529)] p-[3px]">
            <span aria-hidden className="grid size-21 place-items-center rounded-full border-[3px] border-white bg-brand text-3xl font-bold text-white">{creator.display_name[0]!.toUpperCase()}</span>
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h1 className="text-[26px] font-extrabold">{creator.display_name}</h1>
            <span className="text-ink-2">
              @{creator.handle}{creator.home_city && ` · ${creator.home_city}`}
              {creator.instagram_followers ? ` · ${compact(creator.instagram_followers)} on Instagram` : ''}
            </span>
            {creator.bio && <p className="max-w-[56ch]">{creator.bio}</p>}
            {creator.instagram_handle && (
              <a href={`https://instagram.com/${creator.instagram_handle}`} rel="noopener nofollow" target="_blank" className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-brand-700 hover:underline"><Camera className="size-4" aria-hidden />Instagram</a>
            )}
          </div>
          <span className="rounded-xl border bg-card"><CopyButton text={`${siteUrl()}/@${creator.handle}`} label="Copy storefront link" /></span>
        </div>
        <nav className="mx-auto flex max-w-[1180px] gap-0.5 px-4 md:px-6" aria-label="Storefront sections">
          <span aria-current="page" className="-mb-px inline-flex min-h-11 items-center border-b-[2.5px] border-brand px-3.5 font-semibold text-brand-700">Trips</span>
        </nav>
      </section>
      <section className="mx-auto max-w-[1180px] px-4 pt-5 pb-14 md:px-6">
        {trips.length ? (
          <TripGrid trips={trips} priorityCount={2} />
        ) : (
          <div className="rounded-2xl border bg-card px-6 py-12 text-center">
            <b>No trips listed yet</b>
            <p className="mt-1 text-sm text-ink-2">{creator.display_name} hasn&apos;t shared any trips yet. <Link href="/trips" className="font-semibold text-brand-700 hover:underline">Explore trips</Link></p>
          </div>
        )}
      </section>
    </main>
  )
}
