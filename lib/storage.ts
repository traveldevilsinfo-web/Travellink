import { env } from '@/lib/env'

/** Public URL for an object in the public-media bucket. */
export function publicMediaUrl(path: string): string {
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/public-media/${path}`
}
