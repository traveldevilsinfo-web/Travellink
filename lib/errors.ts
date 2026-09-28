export type AppErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'mfa_required'
  | 'rate_limited'
  | 'bot_check_failed'
  | 'invalid_input'
  | 'invalid_amount'
  | 'invalid_pct'
  | 'config'
  | 'upstream'

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

const SAFE_MESSAGES: Partial<Record<AppErrorCode, string>> = {
  unauthenticated: 'Please sign in to continue.',
  forbidden: "You don't have access to this.",
  mfa_required: 'Please complete two-factor verification.',
  rate_limited: 'Too many attempts. Please wait a few minutes and try again.',
  bot_check_failed: 'Verification failed. Please refresh and try again.',
}

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

/** Maps any thrown error to a message safe to show users. Never leaks DB/upstream details. */
export function toSafeError(e: unknown): { ok: false; error: string } {
  if (e instanceof AppError) return { ok: false, error: SAFE_MESSAGES[e.code] ?? e.message }
  console.error(e) // ponytail: console until Sentry lands (M12)
  return { ok: false, error: 'Something went wrong. Please try again.' }
}
