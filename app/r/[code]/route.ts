import { createHash, randomUUID } from 'node:crypto'
import { after, NextResponse, type NextRequest } from 'next/server'
import { isBot } from '@/lib/domain/bot'
import { ratelimit } from '@/lib/security/ratelimit'
import { REF_COOKIE, REF_MAX_AGE_DAYS, signRef } from '@/lib/security/ref-cookie'
import { ipHash } from '@/lib/security/request'
import { logClick, resolveLink } from '@/lib/tracking/click'
import { LINK_CODE_RE, newClickId, UUID_RE } from '@/lib/tracking/ids'

export const dynamic = 'force-dynamic'

const YEAR = 365 * 86_400

/**
 * Tracked affiliate redirect (ARCHITECTURE §6.1, §20.5): log the click, set the visitor + signed
 * attribution cookies, 302 to an internal path built from DB rows (never from the request → no open redirect).
 */
export async function GET(req: NextRequest, ctx: RouteContext<'/r/[code]'>) {
  const code = (await ctx.params).code.toLowerCase()
  const home = () => noStore(NextResponse.redirect(new URL('/', req.url), 302))
  if (!LINK_CODE_RE.test(code)) return home()

  const link = await resolveLink(code)
  if (!link) return home()
  const dest = link.tripSlug
    ? `/trips/${link.tripSlug}?utm_source=triplink&utm_medium=creator&utm_campaign=${encodeURIComponent(link.handle)}`
    : `/@${link.handle}`
  const res = noStore(NextResponse.redirect(new URL(dest, req.url), 302))
  if (!link.live) return res // paused link or inactive creator: still send them somewhere useful, don't attribute

  const ua = req.headers.get('user-agent')
  const bot = isBot(ua)
  const ip = await ipHash()
  let track = true
  try { await ratelimit('r:ip', ip, 60, '1 m') } catch { track = false } // over the limit: redirect, don't count

  const secure = req.nextUrl.protocol === 'https:'
  const existing = req.cookies.get('tl_vid')?.value
  const visitorId = existing && UUID_RE.test(existing) ? existing : randomUUID()
  if (visitorId !== existing) res.cookies.set('tl_vid', visitorId, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: YEAR })

  const clickId = newClickId()
  const secret = process.env.REF_COOKIE_SECRET
  if (!bot && secret && secret.length >= 32) {
    const maxAge = REF_MAX_AGE_DAYS * 86_400
    res.cookies.set(REF_COOKIE, signRef({ c: link.creatorId, l: link.linkId, k: clickId, t: Math.floor(Date.now() / 1000) }, secret), { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge })
    // Display-only hint for the "Recommended by @creator" ribbon on cached pages. Attribution never reads it.
    res.cookies.set('tl_by', link.handle, { httpOnly: false, secure, sameSite: 'lax', path: '/', maxAge })
  } else if (!secret) {
    console.warn('REF_COOKIE_SECRET missing: click logged without attribution cookie')
  }

  if (track) {
    const referrer = req.headers.get('referer')
    after(() => logClick({
      linkId: link.linkId, creatorId: link.creatorId, tripId: link.tripId, visitorId, ipHash: ip, isBot: bot, clickId,
      uaHash: createHash('sha256').update(ua ?? '').digest('hex').slice(0, 32),
      referrer: referrer ? referrer.slice(0, 200) : null,
    }))
  }
  return res
}

function noStore(res: NextResponse) {
  res.headers.set('Cache-Control', 'no-store')
  res.headers.set('X-Robots-Tag', 'noindex')
  return res
}
