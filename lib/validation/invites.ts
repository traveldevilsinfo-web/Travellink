import { z } from 'zod'

export const InviteSchema = z.object({
  creatorId: z.guid(),
  tripId: z.guid('Pick a trip'),
  // blank = the trip's standard rate
  commissionPct: z.union([z.literal(''), z.coerce.number<string | number>().min(5).max(50).multipleOf(0.5, 'Use steps of 0.5%')]),
  message: z.string().trim().max(500),
})
export type InviteInput = z.input<typeof InviteSchema>

export const RespondInviteSchema = z.object({ inviteId: z.guid(), accept: z.boolean() })
