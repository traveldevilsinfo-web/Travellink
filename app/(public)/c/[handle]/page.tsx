import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TripGrid } from '@/components/trip/trip-card'
import { creatorByHandle } from '@/lib/public/queries'

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
    description: creator.bio ?? `Trips picked by ${creator.display_name} on TripLink.`,
    alternates: { canonical: `/@${creator.handle}` },
  }
}

export default async function Storefront({ params }: PageProps<'/c/[handle]'>) {
  const res = await creatorByHandle((await params).handle)
  if (!res) notFound()
  const { creator, trips } = res
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{creator.display_name}</h1>
        <p className="text-sm text-muted-foreground">
          @{creator.handle}{creator.home_city && ` · ${creator.home_city}`}
          {creator.instagram_handle && <> · <a href={`https://instagram.com/${creator.instagram_handle}`} rel="noopener nofollow" className="underline">Instagram</a></>}
        </p>
        {creator.bio && <p className="max-w-2xl">{creator.bio}</p>}
      </header>
      <section>
        <h2 className="mb-4 text-lg font-semibold">Trips with {creator.display_name}</h2>
        {trips.length ? <TripGrid trips={trips} priorityCount={2} /> : <p className="text-muted-foreground">No trips listed yet.</p>}
      </section>
    </main>
  )
}
