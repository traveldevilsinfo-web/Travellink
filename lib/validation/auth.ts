import { z } from 'zod'

/** Indian mobiles only in Phase 1 (ARCHITECTURE §8.1). Accepts "98765 43210", "+91-98765-43210", "09876543210". Returns E.164. */
export const PhoneSchema = z
  .string()
  .trim()
  .max(20)
  .transform((v) => v.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, ''))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'))
  .transform((v) => `+91${v}`)

const OtpCode = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code')

/** Only same-origin relative paths; blocks //evil.com and /\evil.com open redirects. */
export function safeNext(next: unknown, fallback = '/account/profile'): string {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  return next.slice(0, 512)
}

export const SendOtpSchema = z.object({ phone: PhoneSchema, turnstileToken: z.string().max(2048).optional() })
export const VerifyOtpSchema = z.object({ phone: PhoneSchema, token: OtpCode, next: z.string().max(512).optional() })
export const MagicLinkSchema = z.object({
  email: z.email().max(254),
  next: z.string().max(512).optional(),
  turnstileToken: z.string().max(2048).optional(),
})
export const VerifyTotpSchema = z.object({ factorId: z.string().min(1).max(64), code: OtpCode, next: z.string().max(512).optional() })
export const ProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'Required').max(100),
  city: z.string().trim().max(80),
  marketingOptIn: z.boolean(),
})

// Client-side form shapes (pre-transform input) for react-hook-form.
export type SendOtpInput = z.input<typeof SendOtpSchema>
export type VerifyOtpInput = z.input<typeof VerifyOtpSchema>
export type MagicLinkInput = z.input<typeof MagicLinkSchema>
export type ProfileInput = z.input<typeof ProfileSchema>
