import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/guards'
import { formatDateIST } from '@/lib/domain/dates'
import { ActivateForm } from './activate-form'

export const metadata: Metadata = { title: 'Creator waitlist', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Row = { id: string; handle: string; display_name: string; created_at: string; creator_social_accounts: { username: string; followers_count: number; account_type: string | null; last_synced_at: string } | null }

export default async function CreatorWaitlist() {
  const { supabase } = await requireAdmin('ops', '/admin/creators')
  const [{ data }, { data: setting }] = await Promise.all([
    supabase.from('creators').select('id, handle, display_name, created_at, creator_social_accounts(username, followers_count, account_type, last_synced_at)').eq('status', 'waitlist').order('created_at').limit(200),
    supabase.rpc('get_public_setting', { p_key: 'creator' }),
  ])
  const rows = (data ?? []) as unknown as Row[]
  const min = Number((setting as { min_followers?: number } | null)?.min_followers ?? 1000)

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8">
      <h1 className="text-xl font-semibold">Creator waitlist ({rows.length})</h1>
      <p className="text-sm text-ink-2">Creators under {min.toLocaleString('en-IN')} followers. The daily sync activates them automatically when they cross it. Activate manually only with evidence; the reason is audited.</p>
      {rows.length === 0 && <p className="text-sm text-ink-2">Nobody is waiting.</p>}
      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const s = r.creator_social_accounts
          return (
            <li key={r.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
              <div>
                <b>{r.display_name}</b> <span className="text-ink-2">@{r.handle}</span>
                <div className="text-sm text-ink-2">
                  {s ? <>IG @{s.username} · <b className="num text-ink">{s.followers_count.toLocaleString('en-IN')}</b> followers · {s.account_type ?? 'type unknown'} · synced {formatDateIST(s.last_synced_at.slice(0, 10))}</> : 'Instagram not connected'}
                  {' '}· joined {formatDateIST(r.created_at.slice(0, 10))}
                </div>
              </div>
              <ActivateForm id={r.id} />
            </li>
          )
        })}
      </ul>
    </main>
  )
}
