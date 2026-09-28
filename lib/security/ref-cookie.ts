import { createHmac, timingSafeEqual } from 'node:crypto'

// tl_ref: HMAC-signed attribution cookie (ARCHITECTURE §6.1, §20.5). Last click wins: each click overwrites it.
export type RefPayload = { c: string; l: string; k: string; t: number } // creator id, link id, click id, epoch seconds

export const REF_COOKIE = 'tl_ref'
export const REF_MAX_AGE_DAYS = 90

const b64 = (s: string) => Buffer.from(s).toString('base64url')
const sig = (data: string, secret: string) => createHmac('sha256', secret).update(data).digest('base64url')

export function signRef(p: RefPayload, secret: string): string {
  const data = b64(JSON.stringify(p))
  return `${data}.${sig(data, secret)}`
}

/** Returns the payload only if the signature matches and it is within the attribution window. */
export function verifyRef(value: string | undefined, secret: string, nowSec = Math.floor(Date.now() / 1000), maxAgeDays = REF_MAX_AGE_DAYS): RefPayload | null {
  if (!value || !secret) return null
  const [data, mac] = value.split('.')
  if (!data || !mac) return null
  const expected = sig(data, secret)
  if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null
  try {
    const p = JSON.parse(Buffer.from(data, 'base64url').toString()) as RefPayload
    if (typeof p.c !== 'string' || typeof p.l !== 'string' || typeof p.k !== 'string' || typeof p.t !== 'number') return null
    if (p.t > nowSec + 300 || nowSec - p.t > maxAgeDays * 86_400) return null
    return p
  } catch {
    return null
  }
}
