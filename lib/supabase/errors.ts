import { AppError } from '@/lib/errors'

type PgError = { code?: string; message: string } | null

/** Turns a Supabase/PostgREST error into an AppError without leaking DB text to users. */
export function throwIfError(error: PgError, context: string): void {
  if (!error) return
  if (error.code === '42501' || error.code === 'PGRST301') throw new AppError('forbidden', `${context}: ${error.message}`)
  // guard triggers raise P0001 with a human message meant for the operator
  if (error.code === '23503') throw new AppError('invalid_input', "This is used by existing bookings, so it can't be removed.")
  if (error.code === 'P0001') throw new AppError('invalid_input', error.message)
  throw new AppError('upstream', `${context}: ${error.message}`)
}

export const isUniqueViolation = (error: PgError) => error?.code === '23505'
