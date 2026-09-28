import 'server-only'
import { Ratelimit, type Duration } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null

const limiters = new Map<string, Ratelimit>()

/** Sliding-window limit. Throws AppError('rate_limited'). Without Upstash env it is a no-op outside production. */
export async function ratelimit(bucket: string, id: string, limit: number, window: Duration): Promise<void> {
  if (!redis) {
    if (process.env.VERCEL_ENV === 'production') throw new AppError('config', 'Upstash not configured')
    return
  }
  const key = `${bucket}:${limit}:${window}`
  let rl = limiters.get(key)
  if (!rl) {
    rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, window), prefix: `rl:${bucket}` })
    limiters.set(key, rl)
  }
  const { success } = await rl.limit(id)
  if (!success) throw new AppError('rate_limited', `Rate limit hit: ${bucket}`)
}
