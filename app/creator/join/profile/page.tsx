import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { JoinProgress } from '@/components/creator/join-progress'
import { requireUser } from '@/lib/auth/guards'
import { siteUrl } from '@/lib/site'
import { ProfileForm } from './profile-form'

export const metadata: Metadata = { title: 'Your storefront', robots: { index: false } }

export default async function Profile() {
  const user = await requireUser('/creator/join/profile')
  const { data: c } = await user.supabase.from('creators').select('display_name, handle, home_city, bio, status').eq('user_id', user.id).maybeSingle()
  if (!c) redirect('/creator/join/connect')
  if (c.status !== 'active') redirect('/creator/join/check')
  return (
    <>
      <JoinProgress step={3} />
      <h1 className="text-[28px] leading-tight font-extrabold">Set up your storefront</h1>
      <p className="text-ink-2">We filled this in from Instagram. Followers see it at {siteUrl().replace(/^https?:\/\//, '')}/@{c.handle}.</p>
      <ProfileForm defaults={{ displayName: c.display_name, handle: c.handle, homeCity: c.home_city ?? '', bio: c.bio ?? '' }} host={siteUrl().replace(/^https?:\/\//, '')} />
    </>
  )
}
