import 'server-only'
import { createHash } from 'node:crypto'
import { headers } from 'next/headers'

/** Salted, daily-rotating hash of the caller IP. Raw IPs are never stored (AGENTS.md rule 12). */
export async function ipHash(): Promise<string> {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  const day = new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${process.env.IP_HASH_SALT ?? 'dev'}:${day}:${ip}`).digest('hex').slice(0, 32)
}

export async function clientIp(): Promise<string | undefined> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
}
