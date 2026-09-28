'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { DEV_ACCOUNTS, devLoginAllowed } from '@/lib/dev'
import { type ActionResult, AppError, toSafeError } from '@/lib/errors'
import { createServerClient } from '@/lib/supabase/server'

const HOME = { creator: '/creator', operator: '/operator', traveler: '/trips', admin: '/admin' } as const

export async function devSignIn(role: unknown): Promise<ActionResult> {
  let to: string
  try {
    if (!devLoginAllowed()) throw new AppError('forbidden', 'Dev login is disabled')
    const r = z.enum(['creator', 'operator', 'traveler', 'admin']).parse(role)
    const supabase = await createServerClient()
    const { error } = await supabase.auth.signInWithPassword({ email: DEV_ACCOUNTS[r], password: process.env.DEV_LOGIN_PASSWORD ?? '' })
    if (error) throw new AppError('upstream', error.message)
    to = HOME[r]
  } catch (e) {
    return toSafeError(e)
  }
  redirect(to)
}
