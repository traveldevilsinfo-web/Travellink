import { createServerClient as createSsrClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'
import type { Database } from './types'

// User-session client: RLS applies. Use for reads and user-scoped writes.
export async function createServerClient() {
  const cookieStore = await cookies()
  return createSsrClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component: proxy.ts refreshes the session instead.
        }
      },
    },
  })
}
