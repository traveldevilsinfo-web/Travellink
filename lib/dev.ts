import 'server-only'

/** Local-development shortcuts. Never available on Vercel production or `next start`. */
export function devLoginAllowed(): boolean {
  return process.env.ALLOW_DEV_LOGIN === 'true' && process.env.VERCEL_ENV !== 'production' && process.env.NODE_ENV !== 'production'
}

/** Accounts from supabase/seed.sql (dev database only). */
export const DEV_ACCOUNTS = {
  creator: 'creator@triplink.test',
  operator: 'operator@triplink.test',
  traveler: 'traveler@triplink.test',
  admin: 'admin@triplink.test',
} as const

/** Dev stand-in for WhatsApp/SMS OTP delivery: the code is shown on screen. Same gate as dev login. */
export const otpSimulationAllowed = devLoginAllowed
