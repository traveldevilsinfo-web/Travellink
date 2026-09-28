import { z } from 'zod'

const line = z.string().trim().min(1).max(160)
/** Textarea "one per line" → string[] (blank lines dropped). */
const lines = (max: number) =>
  z.union([z.array(line), z.string()]).transform((v, ctx) => {
    const arr = (typeof v === 'string' ? v.split('\n') : v).map((s) => s.trim()).filter(Boolean)
    if (arr.length > max) ctx.addIssue({ code: 'custom', message: `At most ${max} items` })
    if (arr.some((s) => s.length > 160)) ctx.addIssue({ code: 'custom', message: 'Each line must be under 160 characters' })
    return arr
  })

/** Whole rupees in forms; converted to paise on the server with rupeesToPaise. */
const rupees = (min: number) => z.coerce.number<string | number>().int('Whole rupees only').min(min).max(10_000_000)
const isoDate = z.iso.date('Pick a date')

export const TripDetailsSchema = z
  .object({
    title: z.string().trim().min(5, 'At least 5 characters').max(120),
    summary: z.string().trim().max(300),
    descriptionMd: z.string().max(10_000),
    tripType: z.enum(['group', 'experiential', 'package', 'creator_hosted']),
    destination: z.string().trim().min(2).max(80),
    state: z.string().trim().max(60),
    startCity: z.string().trim().max(60),
    durationDays: z.coerce.number<string | number>().int().min(1).max(60),
    durationNights: z.coerce.number<string | number>().int().min(0).max(60),
    difficulty: z.enum(['', 'easy', 'moderate', 'hard']),
    minAge: z.coerce.number<string | number>().int().min(0).max(99),
    maxGroupSize: z.coerce.number<string | number>().int().min(0).max(500),
    fromPriceRupees: rupees(1),
    inclusions: lines(30),
    exclusions: lines(30),
    highlights: lines(15),
    thingsToCarry: lines(40),
    cancellationPolicyId: z.uuid('Pick a cancellation policy'),
  })
  .refine((t) => t.durationNights === t.durationDays || t.durationNights === t.durationDays - 1, {
    path: ['durationNights'],
    message: 'Nights must equal days or days − 1',
  })

export const ItinerarySchema = z.object({
  days: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(120),
        description: z.string().trim().max(3000),
        meals: z.array(z.enum(['breakfast', 'lunch', 'dinner'])),
        stay: z.string().trim().max(120),
      }),
    )
    .min(1)
    .max(60),
})

export const PickupSchema = z.object({
  city: z.string().trim().min(2).max(60),
  point: z.string().trim().min(2).max(160),
  timeNote: z.string().trim().max(80),
  extraPriceRupees: rupees(0),
})

export const CommissionSchema = z.object({
  creatorCommissionPct: z.coerce.number<string | number>().min(5).max(40).multipleOf(0.01),
})

export const DepartureSchema = z
  .object({
    startDate: isoDate,
    endDate: isoDate,
    capacity: z.coerce.number<string | number>().int().min(1).max(500),
    depositPerPersonRupees: rupees(0),
    balanceDueDaysBefore: z.coerce.number<string | number>().int().min(0).max(90),
    bookingCutoffDays: z.coerce.number<string | number>().int().min(0).max(30),
    options: z
      .array(z.object({ id: z.uuid().optional(), label: z.string().trim().min(2).max(60), priceRupees: rupees(1), isDefault: z.boolean() }))
      .min(1, 'Add at least one price option')
      .max(5),
  })
  .refine((d) => d.endDate >= d.startDate, { path: ['endDate'], message: 'End date must be on/after start date' })
  .refine((d) => d.options.filter((o) => o.isDefault).length === 1, { path: ['options'], message: 'Mark exactly one option as default' })
  .refine((d) => d.depositPerPersonRupees < Math.min(...d.options.map((o) => o.priceRupees)), {
    path: ['depositPerPersonRupees'],
    message: 'Deposit must be less than the lowest price',
  })

export const MEDIA_MAX_BYTES = 10 * 1024 * 1024
export const MEDIA_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const

export type TripDetailsInput = z.input<typeof TripDetailsSchema>
export type ItineraryInput = z.input<typeof ItinerarySchema>
export type PickupInput = z.input<typeof PickupSchema>
export type DepartureInput = z.input<typeof DepartureSchema>
