import { Check, Clock } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { JoinProgress } from '@/components/creator/join-progress'
import { Avatar } from '@/components/shell/side-nav'
import { buttonVariants } from '@/components/ui/button'
import { requireUser } from '@/lib/auth/guards'
import { followersToGo } from '@/lib/domain/creator-gate'

export const metadata: Metadata = { title: 'Eligibility', robots: { index: false } }

export default async function EligibilityCheck({ searchParams }: PageProps<'/creator/join/check'>) {
  const user = await requireUser('/creator/join/check')
  if ((await searchParams).e === 'personal') {
    return (
      <>
        <JoinProgress step={2} />
        <h1 className="text-[28px] leading-tight font-extrabold">This is a personal account</h1>
        <p className="text-ink-2">Instagram only shares follower data for Creator and Business accounts, so we can&apos;t check eligibility yet.</p>
        <ol className="flex list-decimal flex-col gap-1.5 rounded-2xl border bg-card py-5 pr-5 pl-10 text-sm"><li>Open Instagram → your profile → menu</li><li>Settings → Account type and tools</li><li>Switch to professional account → Creator</li></ol>
        <Link href="/creator/join/connect" className={buttonVariants({ size: 'lg', className: 'w-full' })}>I&apos;ve switched, try again</Link>
      </>
    )
  }
  const { data: creator } = await user.supabase.from('creators').select('id, handle, display_name, status').eq('user_id', user.id).maybeSingle()
  if (!creator) redirect('/creator/join/connect')
  const [{ data: social }, { data: setting }] = await Promise.all([
    user.supabase.from('creator_social_accounts').select('username, followers_count, media_count').eq('creator_id', creator.id).maybeSingle(),
    user.supabase.rpc('get_public_setting', { p_key: 'creator' }),
  ])
  const min = Number((setting as { min_followers?: number } | null)?.min_followers ?? 1000)
  const followers = social?.followers_count ?? 0
  const eligible = creator.status === 'active'
  const suspended = creator.status === 'suspended'

  return (
    <>
      <JoinProgress step={2} />
      <div className="flex items-center gap-3.5">
        <Avatar initials={creator.display_name.slice(0, 1).toUpperCase()} color={eligible ? 'var(--brand)' : '#DB2777'} ring size={48} />
        <div><b className="text-lg">@{social?.username ?? creator.handle}</b><div className="text-sm text-ink-2">Instagram connected</div></div>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between"><span className="text-sm text-ink-2">Followers</span><b className="num text-2xl">{followers.toLocaleString('en-IN')}</b></div>
        <div className="relative h-2.5 rounded-full bg-subtle-2" aria-label={`${followers.toLocaleString('en-IN')} followers against a ${min.toLocaleString('en-IN')} minimum`}>
          <i className="block h-full rounded-full bg-[linear-gradient(90deg,#FF5A1F,#FF9A5C)]" style={{ width: `${Math.min(100, (followers / (min * 2)) * 100)}%` }} />
          <span className="absolute -top-1 -bottom-1 left-1/2 w-0.5 bg-ink" aria-hidden />
        </div>
        <div className="flex justify-between text-xs text-ink-3"><span>0</span><span>Minimum {min.toLocaleString('en-IN')}</span><span>{(min * 2).toLocaleString('en-IN')}+</span></div>
        {suspended ? (
          <p className="font-semibold text-danger">This creator account is paused. Contact support.</p>
        ) : eligible ? (
          <p className="flex items-center gap-2 font-bold text-success"><Check className="size-5" aria-hidden />You&apos;re eligible</p>
        ) : (
          <p className="flex items-center gap-2 font-bold text-warning"><Clock className="size-5" aria-hidden />{followersToGo(followers, min).toLocaleString('en-IN')} followers to go</p>
        )}
      </div>
      {eligible ? (
        <Link href="/creator/join/profile" className={buttonVariants({ size: 'lg', className: 'w-full' })}>Continue</Link>
      ) : !suspended && (
        <>
          <div className="rounded-2xl bg-warning-50 p-5 text-sm"><b>You&apos;re on the waitlist</b><p className="mt-1 text-ink-2">We re-check your followers every day and will WhatsApp you the moment you cross {min.toLocaleString('en-IN')}. Meanwhile you can browse trips and see what you&apos;d earn.</p></div>
          <Link href="/trips" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}>Browse trips</Link>
        </>
      )}
    </>
  )
}
