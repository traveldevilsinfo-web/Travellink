/**
 * Public origin for shareable links, auth redirects and metadata. Never derived from the request Host header.
 * Order: explicit NEXT_PUBLIC_SITE_URL → Vercel production domain → this branch's preview URL → localhost.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const vercelHost =
    process.env.VERCEL_ENV === 'production'
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL
  return vercelHost ? `https://${vercelHost}` : 'http://localhost:3000'
}
