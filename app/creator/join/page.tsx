import { Camera } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { requireUser } from '@/lib/auth/guards'

export const metadata: Metadata = { title: 'Join as a creator', robots: { index: false } }

export default async function JoinWelcome() {
  const user = await requireUser('/creator/join')
  const { data: creator } = await user.supabase.from('creators').select('status').eq('user_id', user.id).maybeSingle()
  if (creator) redirect(creator.status === 'active' ? '/creator' : '/creator/join/check')
  return (
    <>
      <h1 className="text-[28px] leading-tight font-extrabold">Earn on the trips you already post about</h1>
      <p className="text-ink-2">Connect your Instagram to check eligibility. You need a Creator or Business account with at least 1,000 followers.</p>
      <Link href="/creator/join/connect" className={buttonVariants({ size: 'lg', className: 'w-full' })}><Camera />Continue with Instagram</Link>
      <div className="rounded-2xl bg-subtle p-5 text-sm"><b>What you get</b><p className="mt-1 text-ink-2">Affiliate links for verified trips · a storefront at triplink.in/@you · earnings from bookings and enquiries · monthly UPI payouts</p></div>
      <p className="text-xs text-ink-3">We never post for you or read your DMs. You can disconnect any time.</p>
    </>
  )
}
