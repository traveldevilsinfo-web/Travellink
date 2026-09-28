import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { requireTripAccess } from '@/lib/auth/guards'
import { formatINR } from '@/lib/domain/money'
import { operatorNextStatuses, readinessIssues, type TripStatus } from '@/lib/domain/trips'
import { tripReadiness } from '@/lib/operator/readiness'
import { STATUS_LABEL } from '@/lib/operator/status'
import { publicMediaUrl } from '@/lib/storage'
import { CommissionForm, ItineraryForm, MediaManager, PickupsManager, StatusActions, TripDetailsForm } from '../trip-forms'

export const metadata: Metadata = { title: 'Edit trip · TripLink operator', robots: { index: false } }

type Trip = {
  id: string; org_id: string; title: string; summary: string | null; description_md: string | null; trip_type: 'group' | 'experiential' | 'package' | 'creator_hosted'
  destination: string; state: string | null; start_city: string | null; duration_days: number; duration_nights: number
  difficulty: 'easy' | 'moderate' | 'hard' | null; min_age: number | null; max_group_size: number | null; from_price_paise: number
  inclusions: string[]; exclusions: string[]; highlights: string[]; things_to_carry: string[]
  cancellation_policy_id: string; cover_image_path: string | null; status: TripStatus; review_notes: string | null; published_at: string | null
}

export default async function EditTripPage({ params }: PageProps<'/operator/trips/[id]'>) {
  const id = z.uuid().safeParse((await params).id)
  if (!id.success) notFound()
  const { supabase, orgRole, orgId } = await requireTripAccess(id.data)

  const [trip, days, media, pickups, comm, policies, setting, readiness] = await Promise.all([
    supabase.from('trips').select('*').eq('id', id.data).single(),
    supabase.from('trip_itinerary_days').select('title, description, meals, stay').eq('trip_id', id.data).order('day_number'),
    supabase.from('trip_media').select('id, storage_path').eq('trip_id', id.data).order('sort_order'),
    supabase.from('trip_pickup_points').select('id, city, point, time_note, extra_price_paise').eq('trip_id', id.data).order('city'),
    supabase.from('trip_commercials').select('creator_commission_pct').eq('trip_id', id.data).maybeSingle(),
    supabase.from('cancellation_policies').select('id, name').or(`is_system.eq.true,org_id.eq.${orgId}`).order('name'),
    supabase.rpc('get_public_setting', { p_key: 'commission' }),
    tripReadiness(supabase, id.data),
  ])
  const t = trip.data as Trip
  const s = STATUS_LABEL[t.status] ?? { label: t.status, variant: 'outline' as const }
  const floor = Number((setting.data as { min_creator_pct?: number } | null)?.min_creator_pct ?? 8)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3">
        <Link href="/operator/trips" className="text-sm text-muted-foreground">← All trips</Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold">{t.title}</h1>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
        {t.status === 'rejected' && t.review_notes && (
          <p className="rounded-md border border-destructive/40 p-3 text-sm"><strong>Reviewer notes:</strong> {t.review_notes}</p>
        )}
        <StatusActions tripId={t.id} next={operatorNextStatuses(t.status, !!t.published_at)} issues={readinessIssues(readiness)} />
        <Link href={`/operator/trips/${t.id}/departures`} className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' self-start'}>
          Departures & prices ({readiness.upcomingDepartures} upcoming) →
        </Link>
      </header>

      <Tabs defaultValue="details">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="pickups">Pickups</TabsTrigger>
          <TabsTrigger value="commission">Commission</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="pt-4">
          <TripDetailsForm
            tripId={t.id}
            policies={(policies.data ?? []) as { id: string; name: string }[]}
            defaults={{
              title: t.title, summary: t.summary ?? '', descriptionMd: t.description_md ?? '', tripType: t.trip_type,
              destination: t.destination, state: t.state ?? '', startCity: t.start_city ?? '',
              durationDays: String(t.duration_days), durationNights: String(t.duration_nights), difficulty: t.difficulty ?? '',
              minAge: String(t.min_age ?? 0), maxGroupSize: String(t.max_group_size ?? 0), fromPriceRupees: String(t.from_price_paise / 100),
              inclusions: t.inclusions.join('\n'), exclusions: t.exclusions.join('\n'), highlights: t.highlights.join('\n'),
              thingsToCarry: t.things_to_carry.join('\n'), cancellationPolicyId: t.cancellation_policy_id,
            }}
          />
        </TabsContent>
        <TabsContent value="itinerary" className="pt-4">
          <ItineraryForm
            tripId={t.id}
            durationDays={t.duration_days}
            defaults={{
              days: ((days.data ?? []) as { title: string; description: string | null; meals: ('breakfast' | 'lunch' | 'dinner')[]; stay: string | null }[])
                .map((d) => ({ title: d.title, description: d.description ?? '', meals: d.meals, stay: d.stay ?? '' })),
            }}
          />
        </TabsContent>
        <TabsContent value="photos" className="pt-4">
          <MediaManager
            tripId={t.id}
            media={((media.data ?? []) as { id: string; storage_path: string }[]).map((m) => ({
              id: m.id, url: publicMediaUrl(m.storage_path), isCover: m.storage_path === t.cover_image_path,
            }))}
          />
        </TabsContent>
        <TabsContent value="pickups" className="pt-4">
          <PickupsManager
            tripId={t.id}
            pickups={((pickups.data ?? []) as { id: string; city: string; point: string; time_note: string | null; extra_price_paise: number }[]).map((p) => ({
              ...p, extra: p.extra_price_paise ? formatINR(p.extra_price_paise) : '',
            }))}
          />
        </TabsContent>
        <TabsContent value="commission" className="pt-4">
          <CommissionForm
            tripId={t.id}
            floor={floor}
            current={(comm.data as { creator_commission_pct: number } | null)?.creator_commission_pct}
            canEdit={orgRole !== 'staff'}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}
