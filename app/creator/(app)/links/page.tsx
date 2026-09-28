import { Link as LinkIcon, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CopyButton } from '@/components/creator/copy-button'
import { ReelThumb } from '@/components/creator/reel-picker'
import { EmptyState, FunnelStrip } from '@/components/dash/kpi'
import { PageHeader } from '@/components/shell/app-shell'
import { buttonVariants } from '@/components/ui/button'
import { linksWithStats, requireActiveCreator } from '@/lib/creator/queries'
import { formatINR } from '@/lib/domain/money'
import { compactNumber } from '@/lib/format'
import { siteUrl } from '@/lib/site'

export const metadata: Metadata = { title: 'My links', robots: { index: false } }

export default async function MyLinks() {
  const { supabase, creator } = await requireActiveCreator('/creator/links')
  const { links, total } = await linksWithStats(supabase, creator.id)
  const host = siteUrl().replace(/^https?:\/\//, '')

  return (
    <>
      <PageHeader title="My links" description="One link per reel or story. Clicks update every 15 minutes." actions={<Link href="/creator/trips" className={buttonVariants()}><Plus />New link</Link>} />
      <div className="mb-5">
        <FunnelStrip items={[['Clicks', total.clicks.toLocaleString('en-IN')], ['Visitors', total.unique_visitors.toLocaleString('en-IN')], ['Leads', total.leads], ['Bookings', total.bookings], ['Earned', formatINR(total.commission_paise)]]} />
      </div>
      {links.length === 0 ? (
        <EmptyState icon={<LinkIcon />} title="No links yet">
          <p className="max-w-[36ch] text-sm text-ink-2">Pick a trip and tap Get my link. Use one link per reel so you can see which post earns.</p>
          <Link href="/creator/trips" className={buttonVariants({ className: 'mt-1' })}>Find trips</Link>
        </EmptyState>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border bg-card md:block">
            <table className="w-full text-[15px]">
              <thead><tr className="bg-subtle text-left text-xs tracking-wider text-ink-3 uppercase">{['Link', 'Reel views', 'Clicks', 'Leads', 'Bookings', 'Earned', ''].map((h, i) => <th key={i} className={`px-4 py-3 font-bold ${i && i < 6 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
              <tbody>
                {links.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><LinkReel reel={l.creator_reels} /><div><b>{l.label ?? 'Untitled link'}</b><div className="text-sm text-ink-2">{l.trips?.title ?? 'Storefront'} · {host}/r/{l.code}</div></div></div></td>
                    <td className="num px-4 text-right text-ink-2">{l.creator_reels?.views != null ? compactNumber(l.creator_reels.views) : '—'}</td>
                    <td className="num px-4 text-right">{l.stats.clicks}</td><td className="num px-4 text-right">{l.stats.leads}</td><td className="num px-4 text-right">{l.stats.bookings}</td>
                    <td className="num px-4 text-right font-bold">{formatINR(l.stats.commission_paise)}</td>
                    <td className="px-2 text-right"><CopyButton text={`${siteUrl()}/r/${l.code}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-3 md:hidden">
            {links.map((l) => (
              <li key={l.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start gap-3"><LinkReel reel={l.creator_reels} /><div className="min-w-0 flex-1"><b>{l.label ?? 'Untitled link'}</b><div className="truncate text-sm text-ink-2">{host}/r/{l.code}</div>{l.creator_reels?.views != null && <div className="text-sm text-ink-3">{compactNumber(l.creator_reels.views)} reel views</div>}</div><CopyButton text={`${siteUrl()}/r/${l.code}`} /></div>
                <div className="mt-3 grid grid-cols-4 gap-1.5">{([['Clicks', l.stats.clicks], ['Leads', l.stats.leads], ['Bookings', l.stats.bookings], ['Earned', formatINR(l.stats.commission_paise)]] as const).map(([a, b]) => <div key={a}><div className="text-xs text-ink-3">{a}</div><b className="num">{b}</b></div>)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

function LinkReel({ reel }: { reel: { permalink: string | null; thumbnail_url: string | null } | null }) {
  if (!reel) return null
  const thumb = <ReelThumb src={reel.thumbnail_url} />
  return reel.permalink
    ? <a href={reel.permalink} target="_blank" rel="noopener noreferrer" className="w-10 shrink-0" aria-label="Open reel on Instagram">{thumb}</a>
    : <span className="w-10 shrink-0">{thumb}</span>
}
