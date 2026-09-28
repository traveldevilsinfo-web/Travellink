import type { MetadataRoute } from 'next'
import { sitemapEntries } from '@/lib/public/queries'
import { siteUrl } from '@/lib/site'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const { trips, creators, destinations } = await sitemapEntries()
  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/trips`, changeFrequency: 'daily', priority: 0.9 },
    ...trips.map((t) => ({ url: `${base}/trips/${t.slug}`, lastModified: t.updated_at, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...destinations.map((d) => ({ url: `${base}/destinations/${d.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...creators.map((c) => ({ url: `${base}/@${c.handle}`, lastModified: c.updated_at, changeFrequency: 'weekly' as const, priority: 0.6 })),
  ]
}
