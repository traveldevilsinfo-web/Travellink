import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/account', '/creator', '/operator', '/admin', '/checkout', '/r/', '/api/', '/login', '/mfa', '/callback'] },
    sitemap: `${base}/sitemap.xml`,
  }
}
