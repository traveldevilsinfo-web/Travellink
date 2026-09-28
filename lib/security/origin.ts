import 'server-only'
import { siteUrl } from '@/lib/site'

/** Absolute site origin for auth redirect URLs. Configured, never from a spoofable Host header. */
export async function siteOrigin(): Promise<string> {
  return siteUrl()
}
