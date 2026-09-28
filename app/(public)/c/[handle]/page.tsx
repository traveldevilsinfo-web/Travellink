import { Camera } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CopyButton } from '@/components/creator/copy-button'
import { ReelThumb } from '@/components/creator/reel-picker'
import { TripGrid } from '@/components/trip/trip-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { creatorByHandle } from '@/lib/public/queries'
import { siteUrl } from '@/lib/site'
import { compactNumber } from '@/lib/format'

// Served at /@handle via proxy.ts rewrite. ISR 10 min (ARCHITECTURE §12).
export const revalidate = 600
export async function generateStaticParams() {
  return []
}


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
  const { creator, trips, collections, reels } = res
  const empty = !trips.length && !collections.length && !reels.length
  const firstTab = trips.length ? 'trips' : collections.length ? 'collections' : 'reels'
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
              {creator.instagram_followers ? ` · ${compactNumber(creator.instagram_followers)} on Instagram` : ''}
            </span>
            {creator.bio && <p className="max-w-[56ch]">{creator.bio}</p>}
            {creator.instagram_handle && (
              <a href={`https://instagram.com/${creator.instagram_handle}`} rel="noopener nofollow" target="_blank" className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-brand-700 hover:underline"><Camera className="size-4" aria-hidden />Instagram</a>
            )}
          </div>
          <span className="rounded-xl border bg-card"><CopyButton text={`${siteUrl()}/@${creator.handle}`} label="Copy storefront link" /></span>
        </div>
      </section>
      <section className="mx-auto max-w-[1180px] px-4 pt-3 pb-14 md:px-6">
        {empty ? (
          <div className="mt-2 rounded-2xl border bg-card px-6 py-12 text-center">
            <b>No trips listed yet</b>
            <p className="mt-1 text-sm text-ink-2">{creator.display_name} hasn&apos;t shared any trips yet. <Link href="/trips" className="font-semibold text-brand-700 hover:underline">Explore trips</Link></p>
          </div>
        ) : (
          <Tabs defaultValue={firstTab} className="gap-4">
            <TabsList variant="line" aria-label="Storefront sections" className="h-auto! w-full justify-start border-b">
              {([['trips', 'Trips', trips.length], ['collections', 'Collections', collections.length], ['reels', 'Reels', reels.length]] as const).filter(([, , n]) => n).map(([v, label, n]) => (
                <TabsTrigger key={v} value={v} className="min-h-11 flex-none px-3.5 text-[15px] font-semibold after:bg-brand aria-selected:text-brand-700">{label} <span className="num text-ink-3">{n}</span></TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="trips"><TripGrid trips={trips} priorityCount={2} /></TabsContent>
            <TabsContent value="collections" className="flex flex-col gap-8">
              {collections.map((c) => <section key={c.id} className="flex flex-col gap-3"><h2 className="text-xl font-bold">{c.title}</h2><TripGrid trips={c.trips} /></section>)}
            </TabsContent>
            <TabsContent value="reels">
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {reels.map((r) => (
                  <li key={r.reel_id} className="flex flex-col gap-1.5">
                    <Link href={`/trips/${r.trip!.slug}`} className="relative block" aria-label={`Trip from this reel: ${r.trip!.title}`}>
                      <ReelThumb src={r.thumbnail_url} className="rounded-xl" />
                      <span className="absolute inset-x-1.5 bottom-1.5 truncate rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-white">{r.trip!.title}</span>
                    </Link>
                    {r.permalink && <a href={r.permalink} target="_blank" rel="noopener nofollow" className="text-xs font-semibold text-ink-2 hover:text-brand-700">Watch on Instagram</a>}
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        )}
      </section>
    </main>
  )
}
