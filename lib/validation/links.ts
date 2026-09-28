import { z } from 'zod'

export const CreateLinkSchema = z.object({
  tripId: z.guid().nullable(),
  label: z.string().trim().min(2, 'Name the post this link is for').max(80),
})
export type CreateLinkInput = z.input<typeof CreateLinkSchema>

/** Caption template with the ASCI disclosure always present (ARCHITECTURE §8.7). */
export function captionFor(tripTitle: string, url: string): string {
  const place = tripTitle.split(' ')[0]
  return `${place} with me? Dates, prices and booking at ${url} #ad #TripLink`
}
