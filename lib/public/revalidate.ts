import 'server-only'
import { revalidatePath } from 'next/cache'
import { slugify } from '@/lib/domain/trips'
import type { createServerClient } from '@/lib/supabase/server'

/** Refresh the cached public pages a trip appears on (ARCHITECTURE §12 on-demand ISR). */
export async function revalidatePublicTrip(supabase: Awaited<ReturnType<typeof createServerClient>>, tripId: string) {
  const { data } = await supabase.from('trips').select('slug, destination').eq('id', tripId).maybeSingle()
  const t = data as { slug: string; destination: string } | null
  if (!t) return
  revalidatePath(`/trips/${t.slug}`)
  revalidatePath(`/destinations/${slugify(t.destination)}`)
  revalidatePath('/')
  revalidatePath('/sitemap.xml')
}
