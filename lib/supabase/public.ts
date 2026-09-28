import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import type { Database } from './types'

/**
 * Anonymous, cookie-less client for public pages. No cookies() call means pages stay
 * statically cacheable (ISR). RLS + column grants apply exactly as for a logged-out visitor.
 */
export function createPublicClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
