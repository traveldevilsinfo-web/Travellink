import type { Metadata } from 'next'
import { JoinProgress } from '@/components/creator/join-progress'
import { requireUser } from '@/lib/auth/guards'
import { RulesForm } from './rules-form'

export const metadata: Metadata = { title: 'Posting rules', robots: { index: false } }

export default async function Rules() {
  await requireUser('/creator/join/rules')
  return (
    <>
      <JoinProgress step={4} />
      <h1 className="text-[28px] leading-tight font-extrabold">Three rules for every post</h1>
      <p className="text-ink-2">Tick each one. These protect you and your followers.</p>
      <RulesForm />
      <p className="text-xs text-ink-3">Add PAN and UPI any time before your first payout on the 5th.</p>
    </>
  )
}
