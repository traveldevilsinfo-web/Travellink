import { Search, Users } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState } from '@/components/dash/kpi'
import { PageHeader } from '@/components/shell/app-shell'
import { requireCurrentOrg } from '@/lib/auth/guards'
import { compactNumber } from '@/lib/format'
import { inviteOptions } from '@/lib/operator/performance'
import { InviteDialog } from './invite-dialog'

export const metadata: Metadata = { title: 'Find creators', robots: { index: false } }

const MIN = [['0', 'Any size'], ['5000', '5K+'], ['10000', '10K+'], ['50000', '50K+'], ['100000', '100K+']] as const
const NICHES = ['Treks', 'Road trips', 'Budget', 'Beaches', 'Solo', 'Weekend'] as const

type Creator = { id: string; handle: string; display_name: string; bio: string | null; home_city: string | null; instagram_followers: number | null; languages: string[] }

export default async function FindCreators({ searchParams }: PageProps<'/operator/creators'>) {
  const sp = await searchParams
  const str = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string).trim().slice(0, 60) : '')
  const q = str('q'), city = str('city'), niche = NICHES.find((n) => n === sp.niche) ?? ''
  const min = MIN.find(([k]) => k === sp.min)?.[0] ?? '0'
  const { supabase, org } = await requireCurrentOrg()
  const [{ data }, invite] = await Promise.all([
    (min === '0' ? supabase.from('creators').select('id, handle, display_name, bio, home_city, instagram_followers, languages')
      : supabase.from('creators').select('id, handle, display_name, bio, home_city, instagram_followers, languages').gte('instagram_followers', Number(min)))
      .eq('status', 'active').order('instagram_followers', { ascending: false, nullsFirst: false }).limit(300),
    inviteOptions(supabase, org.id),
  ])
  // ponytail: text filters in memory over the top 300; move to SQL search when creators pass a few thousand
  const has = (c: Creator, s: string) => `${c.handle} ${c.display_name} ${c.bio ?? ''}`.toLowerCase().includes(s.toLowerCase())
  const creators = ((data ?? []) as Creator[]).filter((c) =>
    (!q || has(c, q)) && (!niche || has(c, niche.replace(/s$/, ''))) && (!city || (c.home_city ?? '').toLowerCase() === city.toLowerCase()))
  const cities = [...new Set(((data ?? []) as Creator[]).map((c) => c.home_city).filter(Boolean))].sort() as string[]
  const link = (o: Record<string, string>) => {
    const p = new URLSearchParams(Object.entries({ q, city, niche, min, ...o }).filter(([, v]) => v && v !== '0'))
    return `/operator/creators${p.size ? `?${p}` : ''}`
  }
  const chip = 'inline-flex h-9 shrink-0 items-center rounded-full border bg-card px-3.5 text-sm font-semibold hover:border-ink-3 aria-[current=true]:border-ink aria-[current=true]:bg-ink aria-[current=true]:text-white'

  return (
    <>
      <PageHeader title="Find creators" description="Every creator here is Instagram-verified with 1,000+ followers. Invite them to a trip, with a custom commission if you like." />
      <form className="mb-3 flex flex-wrap gap-2" role="search">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border-[1.5px] bg-card px-3.5 focus-within:border-brand sm:max-w-[420px]">
          <Search className="size-5 text-ink-3" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Search handle, name or bio" aria-label="Search creators" className="h-11 min-w-0 flex-1 bg-transparent outline-none" />
        </div>
        <select name="city" defaultValue={city} aria-label="City" className="h-11 rounded-xl border-[1.5px] bg-card px-3">
          <option value="">All cities</option>{cities.map((c) => <option key={c}>{c}</option>)}
        </select>
        {niche && <input type="hidden" name="niche" value={niche} />}{min !== '0' && <input type="hidden" name="min" value={min} />}
        <button className="h-11 rounded-xl bg-ink px-4 font-semibold text-white">Search</button>
      </form>
      <nav className="mb-2 flex gap-2 overflow-x-auto overflow-y-hidden" aria-label="Niche">
        <Link href={link({ niche: '' })} aria-current={!niche ? 'true' : undefined} className={chip}>All niches</Link>
        {NICHES.map((n) => <Link key={n} href={link({ niche: n })} aria-current={niche === n ? 'true' : undefined} className={chip}>{n}</Link>)}
      </nav>
      <nav className="mb-5 flex gap-2 overflow-x-auto overflow-y-hidden" aria-label="Followers">
        {MIN.map(([k, l]) => <Link key={k} href={link({ min: k })} aria-current={min === k ? 'true' : undefined} className={chip}>{l}</Link>)}
      </nav>
      {!invite.trips.length && <p className="mb-4 rounded-xl bg-warning-50 px-4 py-3 text-sm">Invites open once you have a published trip.</p>}
      {creators.length === 0 ? (
        <EmptyState icon={<Users />} title="No creators match"><Link href="/operator/creators" className="text-sm font-semibold text-brand-700 hover:underline">Clear filters</Link></EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {creators.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-[conic-gradient(#F58529,#DD2A7B,#8134AF,#F58529)] p-[2px]"><span className="grid size-full place-items-center rounded-full border-2 border-white bg-brand font-bold text-white">{c.display_name[0]?.toUpperCase()}</span></span>
                <div className="min-w-0 flex-1"><Link href={`/operator/creators/${c.id}`} className="block truncate font-bold hover:text-brand-700">@{c.handle}</Link><span className="text-sm text-ink-2">{c.display_name}{c.home_city && ` · ${c.home_city}`}</span></div>
                <div className="text-right"><b className="num">{c.instagram_followers ? compactNumber(c.instagram_followers) : '—'}</b><div className="text-xs text-ink-3">followers</div></div>
              </div>
              {c.bio && <p className="line-clamp-2 text-sm text-ink-2">{c.bio}</p>}
              <div className="mt-auto flex gap-2">
                <Link href={`/operator/creators/${c.id}`} className="inline-flex h-9 flex-1 items-center justify-center rounded-[10px] border text-sm font-semibold hover:border-ink-3">View</Link>
                <InviteDialog creatorId={c.id} handle={c.handle} trips={invite.trips} floor={invite.floor} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
