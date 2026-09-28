import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/guards'
import { authorizeUrl, instagramConfigured } from '@/lib/integrations/instagram'
import { ratelimit } from '@/lib/security/ratelimit'
import { siteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'
const IG_STATE_COOKIE = 'tl_ig_state'

export async function GET() {
  const base = siteUrl()
  const user = await getSessionUser()
  if (!user) return NextResponse.redirect(`${base}/login?next=${encodeURIComponent('/creator/join/connect')}`)
  if (!instagramConfigured()) return NextResponse.redirect(`${base}/creator/join/connect?e=unconfigured`)
  try { await ratelimit('ig:start', user.id, 10, '10 m') } catch { return NextResponse.redirect(`${base}/creator/join/connect?e=rate`) }

  const state = randomBytes(24).toString('base64url')
  const res = NextResponse.redirect(authorizeUrl(state, `${base}/api/instagram/callback`))
  res.cookies.set(IG_STATE_COOKIE, state, { httpOnly: true, secure: base.startsWith('https'), sameSite: 'lax', path: '/api/instagram', maxAge: 600 })
  return res
}
