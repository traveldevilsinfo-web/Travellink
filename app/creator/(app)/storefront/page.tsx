import { ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CopyButton } from '@/components/creator/copy-button'
import { StorefrontEditor } from '@/components/creator/storefront-editor'
import { PageHeader } from '@/components/shell/app-shell'
import { buttonVariants } from '@/components/ui/button'
import { catalog, requireActiveCreator } from '@/lib/creator/queries'
import { siteUrl } from '@/lib/site'

export const metadata: Metadata = { title: 'My storefront', robots: { index: false } }

export default async function Storefront() {
  const { supabase, creator } = await requireActiveCreator('/creator/storefront')
  const [trips, { data: items }, { data: collections }] = await Promise.all([
    catalog(supabase),
    supabase.from('storefront_items').select('collection_id, trip_id').eq('creator_id', creator.id).order('position'),
    supabase.from('storefront_collections').select('id, title').eq('creator_id', creator.id).order('position'),
  ])
  const listOf = (cid: string | null) => (items ?? []).filter((i) => i.collection_id === cid).map((i) => i.trip_id)
  const url = `${siteUrl()}/@${creator.handle}`

  return (
    <>
      <PageHeader
        title="My storefront"
        description={<>Put <b>{url.replace(/^https?:\/\//, '')}</b> in your Instagram bio. Visits count as your clicks.</>}
        actions={<><span className="rounded-xl border bg-card"><CopyButton text={url} label="Copy storefront link" /></span><Link href={`/@${creator.handle}`} className={buttonVariants()}><ExternalLink />View live</Link></>}
      />
      <StorefrontEditor
        trips={trips.map((t) => ({ id: t.id, title: t.title, destination: t.destination }))}
        main={listOf(null)}
        collections={(collections ?? []).map((c) => ({ ...c, tripIds: listOf(c.id) }))}
      />
    </>
  )
}
