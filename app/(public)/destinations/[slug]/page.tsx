import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TripGrid } from '@/components/trip/trip-card'
import { tripsForDestination } from '@/lib/public/queries'

export const revalidate = 3600
export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps<'/destinations/[slug]'>): Promise<Metadata> {
  const res = await tripsForDestination((await params).slug)
  if (!res) return { title: 'Destination not found' }
  const name = res.destination.name
  return {
    title: `${name} trips & group tours`,
    description: `${res.trips.length} verified group trips to ${name}${res.destination.state ? `, ${res.destination.state}` : ''}. Compare dates, prices and refund policies.`,
    alternates: { canonical: `/destinations/${res.destination.slug}` },
  }
}

export default async function DestinationPage({ params }: PageProps<'/destinations/[slug]'>) {
  const res = await tripsForDestination((await params).slug)
  if (!res) notFound()
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">{res.destination.name} trips</h1>
        {res.destination.state && <p className="text-muted-foreground">{res.destination.state}</p>}
      </header>
      <TripGrid trips={res.trips} priorityCount={2} />
    </main>
  )
}
