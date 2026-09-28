import 'server-only'
import { AppError } from '@/lib/errors'

// Instagram API with Instagram Login (ARCHITECTURE §20.2). Professional accounts only; no Facebook Page needed.
// ⚠️ VERIFY: Graph API version and field names against Meta docs when the app is created.
const GRAPH = 'https://graph.instagram.com/v23.0'
export const IG_SCOPES = ['instagram_business_basic', 'instagram_business_manage_insights']

export function instagramConfigured(): boolean {
  return !!(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET)
}

export function authorizeUrl(state: string, redirectUri: string): string {
  const u = new URL('https://www.instagram.com/oauth/authorize')
  u.search = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: IG_SCOPES.join(','),
    state,
  }).toString()
  return u.toString()
}

async function json<T>(res: Response, what: string): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error_message?: string; error?: { message?: string } }
  if (!res.ok) throw new AppError('upstream', `instagram ${what}: ${res.status} ${body.error_message ?? body.error?.message ?? ''}`)
  return body
}

/** code → short-lived token (1 h) → long-lived token (60 days). */
export async function exchangeCode(code: string, redirectUri: string) {
  const short = await json<{ access_token: string; user_id: number | string }>(
    await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID!,
        client_secret: process.env.INSTAGRAM_APP_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
      cache: 'no-store',
    }),
    'token',
  )
  const long = await json<{ access_token: string; expires_in: number }>(
    await fetch(`https://graph.instagram.com/access_token?${new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: process.env.INSTAGRAM_APP_SECRET!, access_token: short.access_token })}`, { cache: 'no-store' }),
    'long-lived token',
  )
  return { token: long.access_token, expiresAt: new Date(Date.now() + long.expires_in * 1000) }
}

export type IgProfile = {
  user_id: string; username: string; name?: string; account_type?: string
  profile_picture_url?: string; followers_count: number; media_count?: number
}

export async function fetchProfile(token: string): Promise<IgProfile> {
  const fields = 'user_id,username,name,account_type,profile_picture_url,followers_count,media_count'
  const p = await json<IgProfile>(await fetch(`${GRAPH}/me?${new URLSearchParams({ fields, access_token: token })}`, { cache: 'no-store' }), 'profile')
  return { ...p, user_id: String(p.user_id), followers_count: Number(p.followers_count ?? 0) }
}
