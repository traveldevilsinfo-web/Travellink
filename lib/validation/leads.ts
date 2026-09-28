import { z } from 'zod'
import { PhoneSchema } from '@/lib/validation/auth'

export const EnquirySchema = z.object({
  tripId: z.guid(),
  name: z.string().trim().min(2, 'Enter your name').max(80),
  phone: PhoneSchema,
  travelers: z.coerce.number<string | number>().int().min(1, 'At least 1 traveler').max(20, 'For groups over 20, message the operator'),
  departureId: z.guid().nullable(),
  message: z.string().trim().max(500),
  turnstileToken: z.string().max(2048).optional(),
})
export type EnquiryInput = z.input<typeof EnquirySchema>

export const VerifyEnquirySchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') })

export const MarkBookedSchema = z.object({
  leadId: z.guid(),
  bookingRef: z.string().trim().min(1, 'Enter your booking reference').max(60),
  travelers: z.coerce.number<string | number>().int().min(1).max(100),
  amountRupees: z.coerce.number<string | number>().int('Whole rupees only').min(1, 'Enter the booking amount').max(10_000_000),
  departureId: z.guid('Pick the departure they booked'),
})
export type MarkBookedInput = z.input<typeof MarkBookedSchema>

export const LeadStatusSchema = z.object({ leadId: z.guid(), status: z.enum(['new', 'contacted', 'lost']) })
