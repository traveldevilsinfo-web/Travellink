import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

// Served at /@handle via proxy.ts rewrite. Full storefront (curated trips, ISR) lands in M3/M4.
async function getCreator(handle: string) {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('creators')
    .select('handle, display_name, bio, instagram_handle')
    .eq('handle', handle.toLowerCase())
    .eq('status', 'active')
    .maybeSingle()
  return data as { handle: string; display_name: string; bio: string | null; instagram_handle: string | null } | null
}

export async function generateMetadata({ params }: PageProps<'/c/[handle]'>): Promise<Metadata> {
  const creator = await getCreator((await params).handle)
  return creator ? { title: `${creator.display_name} (@${creator.handle}) · TripLink`, alternates: { canonical: `/@${creator.handle}` } } : {}
}

export default async function Storefront({ params }: PageProps<'/c/[handle]'>) {
  const creator = await getCreator((await params).handle)
  if (!creator) notFound()
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{creator.display_name}</h1>
      <p className="text-sm text-muted-foreground">@{creator.handle}</p>
      {creator.bio && <p className="mt-4">{creator.bio}</p>}
    </main>
  )
}
