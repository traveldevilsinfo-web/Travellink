import { timingSafeEqual } from 'node:crypto'
import { dailyInstagramSync } from '@/lib/creator/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Vercel Cron (vercel.json) sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const got = req.headers.get('authorization') ?? ''
  const want = `Bearer ${secret}`
  if (!secret || got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    return new Response('Unauthorized', { status: 401 })
  }
  return Response.json(await dailyInstagramSync())
}
