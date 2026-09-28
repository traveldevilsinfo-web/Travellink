import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { getSessionUser } from '@/lib/auth/guards'
import { upsertCreatorFromInstagram } from '@/lib/creator/connect'
import { refreshReels } from '@/lib/creator/sync'
import { isProfessional } from '@/lib/domain/creator-gate'
import { exchangeCode, fetchProfile } from '@/lib/integrations/instagram'
import { siteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'

const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

// Instagram redirects here after the creator approves. Every failure lands back in the join flow with a reason.
export async function GET(req: NextRequest) {
  const base = siteUrl()
  const back = (path: string) => {
    const res = NextResponse.redirect(`${base}${path}`)
    res.cookies.delete({ name: 'tl_ig_state', path: '/api/instagram' })
    return res
  }
  const user = await getSessionUser()
  if (!user) return back('/login?next=%2Fcreator%2Fjoin%2Fconnect')

  const sp = req.nextUrl.searchParams
  if (sp.get('error')) return back('/creator/join/connect?e=denied')
  const state = sp.get('state') ?? '', expected = req.cookies.get('tl_ig_state')?.value ?? ''
  const code = sp.get('code')
  if (!code || !expected || !safeEqual(state, expected)) return back('/creator/join/connect?e=state')

  try {
    const token = await exchangeCode(code, `${base}/api/instagram/callback`)
    const profile = await fetchProfile(token.token)
    if (!isProfessional(profile.account_type)) return back('/creator/join/check?e=personal')
    const res = await upsertCreatorFromInstagram(user.id, profile, { value: token.token, expiresAt: token.expiresAt })
    if (res.status === 'taken') return back('/creator/join/connect?e=taken')
    await refreshReels(res.creatorId).catch(() => 0) // reels are a nice-to-have at connect; the daily cron retries
    return back('/creator/join/check')
  } catch (e) {
    console.error('instagram callback', e instanceof Error ? e.message : e) // no tokens or PII in logs
    return back('/creator/join/connect?e=failed')
  }
}
