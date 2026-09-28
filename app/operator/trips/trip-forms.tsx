'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { ActionStatus, useAction } from '@/components/form/use-action'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import type { TripStatus } from '@/lib/domain/trips'
import {
  type ItineraryInput,
  ItinerarySchema,
  MEDIA_MAX_BYTES,
  type PickupInput,
  PickupSchema,
  type TripDetailsInput,
  TripDetailsSchema,
} from '@/lib/validation/trips'
import {
  addPickup,
  changeTripStatus,
  createTrip,
  deletePickup,
  deleteTripMedia,
  saveItinerary,
  setCover,
  updateTripDetails,
  uploadTripMedia,
} from './actions'

type Policy = { id: string; name: string }

export function TripDetailsForm({ tripId, defaults, policies }: { tripId?: string; defaults: TripDetailsInput; policies: Policy[] }) {
  const form = useForm({ resolver: zodResolver(TripDetailsSchema), defaultValues: defaults })
  const { pending, status, run } = useAction()
  const { errors } = form.formState
  const text = (name: keyof TripDetailsInput, label: string, props: React.ComponentProps<'input'> = {}, hint?: string) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} {...props} {...form.register(name)} />
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <FieldError errors={[errors[name]]} />
    </Field>
  )
  const area = (name: keyof TripDetailsInput, label: string, hint?: string, rows = 4) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Textarea id={name} rows={rows} {...form.register(name)} />
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <FieldError errors={[errors[name]]} />
    </Field>
  )
  const onSubmit = form.handleSubmit((v) =>
    run(() => (tripId ? updateTripDetails({ ...v, tripId }) : createTrip(v)), tripId ? 'Saved' : undefined),
  )

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {text('title', 'Trip title', {}, 'e.g. "Chakrata Weekend Escape"')}
      {area('summary', 'Short summary', 'One or two lines shown on trip cards (max 300 characters).', 2)}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {text('destination', 'Destination')}
        {text('state', 'State')}
        {text('startCity', 'Starts from (city)')}
        <Field>
          <FieldLabel htmlFor="tripType">Trip type</FieldLabel>
          <NativeSelect id="tripType" {...form.register('tripType')}>
            <NativeSelectOption value="group">Group trip</NativeSelectOption>
            <NativeSelectOption value="experiential">Experiential</NativeSelectOption>
            <NativeSelectOption value="package">Package</NativeSelectOption>
            <NativeSelectOption value="creator_hosted">Creator-hosted</NativeSelectOption>
          </NativeSelect>
        </Field>
        {text('durationDays', 'Days', { type: 'number', inputMode: 'numeric', min: 1 })}
        {text('durationNights', 'Nights', { type: 'number', inputMode: 'numeric', min: 0 })}
        <Field>
          <FieldLabel htmlFor="difficulty">Difficulty</FieldLabel>
          <NativeSelect id="difficulty" {...form.register('difficulty')}>
            <NativeSelectOption value="">Not specified</NativeSelectOption>
            <NativeSelectOption value="easy">Easy</NativeSelectOption>
            <NativeSelectOption value="moderate">Moderate</NativeSelectOption>
            <NativeSelectOption value="hard">Hard</NativeSelectOption>
          </NativeSelect>
        </Field>
        {text('fromPriceRupees', 'Starting price (₹, excl. GST)', { type: 'number', inputMode: 'numeric', min: 1 }, 'Auto-updates from your departure prices.')}
        {text('minAge', 'Minimum age (0 = any)', { type: 'number', inputMode: 'numeric', min: 0 })}
        {text('maxGroupSize', 'Max group size (0 = not set)', { type: 'number', inputMode: 'numeric', min: 0 })}
      </div>
      {area('descriptionMd', 'Full description', 'Plain text or Markdown. No HTML.', 8)}
      {area('highlights', 'Highlights', 'One per line.')}
      {area('inclusions', 'Inclusions', 'One per line, e.g. "2 nights camp stay".')}
      {area('exclusions', 'Exclusions', 'One per line.')}
      {area('thingsToCarry', 'Things to carry', 'One per line.')}
      <Field data-invalid={!!errors.cancellationPolicyId}>
        <FieldLabel htmlFor="cancellationPolicyId">Cancellation policy</FieldLabel>
        <NativeSelect id="cancellationPolicyId" {...form.register('cancellationPolicyId')}>
          <NativeSelectOption value="">Choose…</NativeSelectOption>
          {policies.map((p) => <NativeSelectOption key={p.id} value={p.id}>{p.name}</NativeSelectOption>)}
        </NativeSelect>
        <FieldError errors={[errors.cancellationPolicyId]} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : tripId ? 'Save details' : 'Create trip'}</Button>
      <ActionStatus status={status} />
    </form>
  )
}

export function ItineraryForm({ tripId, durationDays, defaults }: { tripId: string; durationDays: number; defaults: ItineraryInput }) {
  const initial = defaults.days.length ? defaults : { days: [{ title: '', description: '', meals: [], stay: '' }] }
  const form = useForm({ resolver: zodResolver(ItinerarySchema), defaultValues: initial })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'days' })
  const { pending, status, run } = useAction()
  const errs = form.formState.errors.days

  return (
    <form onSubmit={form.handleSubmit((v) => run(() => saveItinerary({ ...v, tripId }), 'Itinerary saved'))} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-muted-foreground">This trip is {durationDays} day(s), so add {durationDays} day(s) here.</p>
      {fields.map((f, i) => (
        <fieldset key={f.id} className="flex flex-col gap-3 rounded-lg border p-3">
          <legend className="px-1 text-sm font-medium">Day {i + 1}</legend>
          <Field data-invalid={!!errs?.[i]?.title}>
            <FieldLabel htmlFor={`d${i}t`}>Title</FieldLabel>
            <Input id={`d${i}t`} {...form.register(`days.${i}.title`)} />
            <FieldError errors={[errs?.[i]?.title]} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`d${i}d`}>What happens</FieldLabel>
            <Textarea id={`d${i}d`} rows={3} {...form.register(`days.${i}.description`)} />
          </Field>
          <div className="flex flex-wrap gap-4 text-sm">
            {(['breakfast', 'lunch', 'dinner'] as const).map((m) => (
              <label key={m} className="flex items-center gap-1.5 capitalize">
                <input type="checkbox" value={m} {...form.register(`days.${i}.meals`)} /> {m}
              </label>
            ))}
          </div>
          <Field>
            <FieldLabel htmlFor={`d${i}s`}>Stay</FieldLabel>
            <Input id={`d${i}s`} placeholder="e.g. Riverside camp" {...form.register(`days.${i}.stay`)} />
          </Field>
          {fields.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>Remove day {i + 1}</Button>}
        </fieldset>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => append({ title: '', description: '', meals: [], stay: '' })}>Add day</Button>
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save itinerary'}</Button>
      </div>
      <ActionStatus status={status} />
    </form>
  )
}

type Media = { id: string; url: string; isCover: boolean }

export function MediaManager({ tripId, media }: { tripId: string; media: Media[] }) {
  const { pending, status, run } = useAction()
  const [progress, setProgress] = useState<string>()
  const input = useRef<HTMLInputElement>(null)

  const upload = () => {
    const files = Array.from(input.current?.files ?? [])
    const tooBig = files.find((f) => f.size > MEDIA_MAX_BYTES)
    if (tooBig) return setProgress(`${tooBig.name} is over 10 MB`)
    run(async () => {
      // one file per request keeps each action under the body limit
      for (const [i, f] of files.entries()) {
        setProgress(`Uploading ${i + 1} of ${files.length}…`)
        const fd = new FormData()
        fd.set('tripId', tripId)
        fd.set('file', f)
        const res = await uploadTripMedia(fd)
        if (!res.ok) return res
      }
      setProgress(undefined)
      if (input.current) input.current.value = ''
      return { ok: true as const }
    }, 'Uploaded')
  }

  return (
    <div className="flex flex-col gap-4">
      {media.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No photos yet. Add at least 3 good landscape photos.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((m) => (
            <li key={m.id} className="flex flex-col gap-1">
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                <Image src={m.url} alt="" fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover" />
              </div>
              <div className="flex gap-1">
                {m.isCover ? <span className="px-2 text-xs text-muted-foreground">Cover</span> : (
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setCover({ tripId, mediaId: m.id }))}>Make cover</Button>
                )}
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteTripMedia({ tripId, mediaId: m.id }))}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field className="flex-1">
          <FieldLabel htmlFor="photos">Add photos</FieldLabel>
          <Input id="photos" ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" />
          <FieldDescription>JPG, PNG, WebP or AVIF, up to 10 MB each. Location data is removed automatically.</FieldDescription>
        </Field>
        <Button type="button" onClick={upload} disabled={pending}>{pending ? 'Uploading…' : 'Upload'}</Button>
      </div>
      {progress && <p className="text-sm text-muted-foreground">{progress}</p>}
      <ActionStatus status={status} />
    </div>
  )
}

type Pickup = { id: string; city: string; point: string; time_note: string | null; extra: string }

export function PickupsManager({ tripId, pickups }: { tripId: string; pickups: Pickup[] }) {
  const empty: PickupInput = { city: '', point: '', timeNote: '', extraPriceRupees: '0' }
  const form = useForm({ resolver: zodResolver(PickupSchema), defaultValues: empty })
  const { pending, status, run } = useAction()
  const { errors } = form.formState
  return (
    <div className="flex flex-col gap-4">
      {pickups.length === 0 ? <p className="text-sm text-muted-foreground">No pickup points yet.</p> : (
        <ul className="divide-y rounded-lg border text-sm">
          {pickups.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 p-3">
              <span>{p.city} · {p.point}{p.time_note ? ` · ${p.time_note}` : ''}{p.extra ? ` · +${p.extra}` : ''}</span>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deletePickup({ tripId, pickupId: p.id }))}>Remove</Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={form.handleSubmit((v) => run(() => addPickup({ ...v, tripId }), 'Added', () => form.reset(empty)))} className="grid grid-cols-1 gap-3 sm:grid-cols-2" noValidate>
        <Field data-invalid={!!errors.city}><FieldLabel htmlFor="pc">City</FieldLabel><Input id="pc" {...form.register('city')} /><FieldError errors={[errors.city]} /></Field>
        <Field data-invalid={!!errors.point}><FieldLabel htmlFor="pp">Pickup point</FieldLabel><Input id="pp" {...form.register('point')} /><FieldError errors={[errors.point]} /></Field>
        <Field><FieldLabel htmlFor="pt">Time</FieldLabel><Input id="pt" placeholder="e.g. Fri 10 PM" {...form.register('timeNote')} /></Field>
        <Field data-invalid={!!errors.extraPriceRupees}><FieldLabel htmlFor="pe">Extra charge (₹)</FieldLabel><Input id="pe" type="number" inputMode="numeric" min={0} {...form.register('extraPriceRupees')} /><FieldError errors={[errors.extraPriceRupees]} /></Field>
        <Button type="submit" disabled={pending} className="sm:col-span-2">Add pickup point</Button>
      </form>
      <ActionStatus status={status} />
    </div>
  )
}

const ACTION_LABEL: Partial<Record<TripStatus, string>> = {
  pending_review: 'Submit for review',
  draft: 'Withdraw from review',
  paused: 'Pause bookings',
  published: 'Resume bookings',
  archived: 'Archive',
}

export function StatusActions({ tripId, next, issues }: { tripId: string; next: TripStatus[]; issues: string[] }) {
  const { pending, status, run } = useAction()
  return (
    <div className="flex flex-col gap-2">
      {next.includes('pending_review') && issues.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-muted-foreground">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
      )}
      <div className="flex flex-wrap gap-2">
        {next.map((to) => (
          <Button
            key={to}
            size="sm"
            variant={to === 'archived' ? 'ghost' : to === 'pending_review' ? 'default' : 'outline'}
            disabled={pending || (to === 'pending_review' && issues.length > 0)}
            onClick={() => {
              if (to === 'archived' && !confirm('Archive this trip? It will be hidden from travelers.')) return
              run(() => changeTripStatus({ tripId, to }), 'Updated')
            }}
          >
            {ACTION_LABEL[to]}
          </Button>
        ))}
      </div>
      <ActionStatus status={status} />
    </div>
  )
}
