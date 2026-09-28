import { BarChart3, Camera, Play, User } from 'lucide-react'
import type { Metadata } from 'next'
import { JoinProgress } from '@/components/creator/join-progress'
import { requireUser } from '@/lib/auth/guards'
import { simulationAllowed } from '@/lib/creator/connect'
import { instagramConfigured } from '@/lib/integrations/instagram'
import { SimulateForm } from './simulate-form'

export const metadata: Metadata = { title: 'Connect Instagram', robots: { index: false } }

const ERRORS: Record<string, string> = {
  denied: 'You cancelled on Instagram. Connect again when you are ready.',
  state: 'That sign-in link expired. Please try again.',
  failed: "We couldn't reach Instagram. Please try again in a minute.",
  taken: 'That Instagram account is already connected to another TripLink creator.',
  rate: 'Too many attempts. Please wait a few minutes.',
  unconfigured: 'Instagram connect is not set up on this server yet.',
}

export default async function Connect({ searchParams }: PageProps<'/creator/join/connect'>) {
  await requireUser('/creator/join/connect')
  const e = (await searchParams).e
  const error = typeof e === 'string' ? ERRORS[e] : undefined
  const live = instagramConfigured()
  return (
    <>
      <JoinProgress step={1} />
      <h1 className="text-[28px] leading-tight font-extrabold">Connect your Instagram</h1>
      <p className="text-ink-2">You&apos;ll go to Instagram to approve access, then come straight back.</p>
      {error && <p role="alert" className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-medium text-danger">{error}</p>}
      <div className="rounded-2xl border bg-card p-5">
        <b className="text-sm">TripLink will be able to read</b>
        <ul className="mt-1.5">
          {[[User, 'Your profile', 'Username, name, photo, follower and post counts'], [Play, 'Your reels and posts', 'So you can attach a reel to each link and see views next to clicks'], [BarChart3, 'Insights', 'Reach and plays, to show operators your real performance']].map(([Icon, t, d]) => {
            const I = Icon as typeof User
            return (
              <li key={t as string} className="flex items-start gap-3 border-t py-3 first:border-t-0">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><I className="size-5" aria-hidden /></span>
                <div><b className="text-sm">{t as string}</b><div className="text-sm text-ink-2">{d as string}</div></div>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="rounded-2xl border border-dashed bg-card p-5 text-sm"><b>Personal account?</b><p className="mt-1 text-ink-2">Switch to a free Creator account first: Instagram → Settings → Account type and tools → Switch to professional account. You keep your followers.</p></div>
      {live ? (
        <a href="/api/instagram/start" className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand text-base font-semibold text-white hover:bg-brand-700"><Camera className="size-5" aria-hidden />Open Instagram and approve</a>
      ) : simulationAllowed() ? (
        <SimulateForm />
      ) : (
        <p className="rounded-xl bg-warning-50 px-4 py-3 text-sm text-warning">Instagram connect isn&apos;t available yet. Our team will verify your account manually. Message us on WhatsApp.</p>
      )}
    </>
  )
}
