import { z } from 'zod'

export const CreateLinkSchema = z.object({
  tripId: z.guid().nullable(),
  label: z.string().trim().min(2, 'Name the post this link is for').max(80),
  reelId: z.guid().nullable().optional(),
})

export const StorefrontListSchema = z.object({
  collectionId: z.guid().nullable(),
  tripIds: z.array(z.guid()).max(60, 'A list holds at most 60 trips').refine((a) => new Set(a).size === a.length, 'A trip is listed twice'),
})

export const CollectionSchema = z.object({ title: z.string().trim().min(2, 'Name the collection').max(40) })
export type CreateLinkInput = z.input<typeof CreateLinkSchema>

/** Caption template with the ASCI disclosure always present (ARCHITECTURE §8.7). */
export function captionFor(tripTitle: string, url: string): string {
  const place = tripTitle.split(' ')[0]
  return `${place} with me? Dates, prices and booking at ${url} #ad #TripLink`
}
