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

/** Long-lived tokens refresh for another 60 days (only once they are at least 24 h old). */
export async function refreshToken(token: string) {
  const r = await json<{ access_token: string; expires_in: number }>(
    await fetch(`https://graph.instagram.com/refresh_access_token?${new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: token })}`, { cache: 'no-store' }),
    'refresh token',
  )
  return { token: r.access_token, expiresAt: new Date(Date.now() + r.expires_in * 1000) }
}

export type IgReel = {
  id: string; media_type: string; permalink: string | null; thumbnail_url: string | null; caption: string | null
  posted_at: string | null; likes: number | null; comments: number | null; views: number | null
}

type IgMedia = {
  id: string; media_type?: string; media_product_type?: string; permalink?: string; thumbnail_url?: string; media_url?: string
  caption?: string; timestamp?: string; like_count?: number; comments_count?: number
}

/** Latest reels with view counts. ⚠️ VERIFY: `views` insight metric name against the Graph API version in use. */
export async function fetchReels(token: string, limit = 12): Promise<IgReel[]> {
  const fields = 'id,media_type,media_product_type,permalink,thumbnail_url,media_url,caption,timestamp,like_count,comments_count'
  const { data } = await json<{ data: IgMedia[] }>(await fetch(`${GRAPH}/me/media?${new URLSearchParams({ fields, limit: '30', access_token: token })}`, { cache: 'no-store' }), 'media')
  const reels = data.filter((m) => m.media_product_type === 'REELS' || m.media_type === 'VIDEO').slice(0, limit)
  const views = await Promise.all(reels.map(async (m) => {
    try {
      const r = await json<{ data: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] }>(
        await fetch(`${GRAPH}/${m.id}/insights?${new URLSearchParams({ metric: 'views', access_token: token })}`, { cache: 'no-store' }), 'insights')
      const v = r.data[0]
      return v ? Number(v.total_value?.value ?? v.values?.[0]?.value ?? 0) : null
    } catch {
      return null // insights can be missing for very new or old reels; keep the reel
    }
  }))
  return reels.map((m, i) => ({
    id: m.id, media_type: m.media_type ?? 'VIDEO', permalink: m.permalink ?? null,
    thumbnail_url: m.thumbnail_url ?? m.media_url ?? null, caption: m.caption?.slice(0, 500) ?? null,
    posted_at: m.timestamp ?? null, likes: m.like_count ?? null, comments: m.comments_count ?? null, views: views[i] ?? null,
  }))
}
