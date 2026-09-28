import { NextResponse, type NextRequest } from 'next/server'
import { redirectWithCookies, updateSession } from '@/lib/supabase/proxy'

const HANDLE = /^\/@([a-z0-9_.]{3,30})\/?$/i
const GATED = ['/account', '/creator', '/operator', '/admin', '/checkout']

// Layer 1 of ARCHITECTURE §8.2: UX-only gates. Roles are enforced by lib/auth/guards.ts and RLS.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // Next treats @folders as parallel routes, so /@handle is served from /c/[handle].
  const handle = HANDLE.exec(pathname)?.[1]
  if (handle) {
    const url = request.nextUrl.clone()
    url.pathname = `/c/${handle.toLowerCase()}`
    return NextResponse.rewrite(url)
  }

  const { response, claims } = await updateSession(request)
  const gated = GATED.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (!gated) return response

  const next = encodeURIComponent(pathname + search)
  if (!claims) return redirectWithCookies(new URL(`/login?next=${next}`, request.url), response)
  if (pathname.startsWith('/admin') && claims.aal !== 'aal2') {
    return redirectWithCookies(new URL(`/mfa?next=${next}`, request.url), response)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)'],
}
