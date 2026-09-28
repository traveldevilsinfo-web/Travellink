import { ExternalLink, Plus, Store } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CopyButton } from '@/components/creator/copy-button'
import { EmptyState } from '@/components/dash/kpi'
import { PageHeader } from '@/components/shell/app-shell'
import { buttonVariants } from '@/components/ui/button'
import { linksWithStats, requireActiveCreator } from '@/lib/creator/queries'
import { siteUrl } from '@/lib/site'

export const metadata: Metadata = { title: 'My storefront', robots: { index: false } }

export default async function Storefront() {
  const { supabase, creator } = await requireActiveCreator('/creator/storefront')
  const { links } = await linksWithStats(supabase, creator.id)
  const trips = [...new Map(links.filter((l) => l.trips).map((l) => [l.trips!.slug, l.trips!])).values()]
  const url = `${siteUrl()}/@${creator.handle}`

  return (
    <>
      <PageHeader
        title="My storefront"
        description={<>Put <b>{url.replace(/^https?:\/\//, '')}</b> in your Instagram bio. Visits count as your clicks.</>}
        actions={<><span className="rounded-xl border bg-card"><CopyButton text={url} label="Copy storefront link" /></span><Link href={`/@${creator.handle}`} className={buttonVariants()}><ExternalLink />View live</Link></>}
      />
      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
        <b>Trips on your storefront</b>
        <span className="text-sm text-ink-2">Trips you&apos;ve made links for show here. Reordering and collections arrive with the storefront editor.</span>
        {trips.length === 0 ? (
          <EmptyState icon={<Store />} title="Your storefront is empty">
            <Link href="/creator/trips" className={buttonVariants({ className: 'mt-1' })}><Plus />Add trips</Link>
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">{trips.map((t) => <li key={t.slug} className="rounded-xl border px-3.5 py-3"><Link href={`/creator/trips/${t.slug}`} className="font-semibold hover:text-brand-700">{t.title}</Link></li>)}</ul>
        )}
      </section>
    </>
  )
}
