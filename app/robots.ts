import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/account', '/creator', '/operator', '/admin', '/checkout', '/r/', '/api/', '/login', '/mfa', '/callback'] },
    sitemap: `${base}/sitemap.xml`,
  }
}
