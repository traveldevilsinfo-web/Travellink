'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { ActionStatus, useAction } from '@/components/form/use-action'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { type DepartureInput, DepartureSchema } from '@/lib/validation/trips'
import { closeDeparture, saveDeparture } from './actions'

export function DepartureForm({ tripId, departureId, defaults, onDone }: { tripId: string; departureId?: string; defaults: DepartureInput; onDone?: () => void }) {
  const form = useForm({ resolver: zodResolver(DepartureSchema), defaultValues: defaults })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'options' })
  const options = useWatch({ control: form.control, name: 'options' })
  const { pending, status, run } = useAction()
  const { errors } = form.formState

  const num = (name: 'capacity' | 'depositPerPersonRupees' | 'balanceDueDaysBefore' | 'bookingCutoffDays', label: string, hint?: string) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={`${departureId ?? 'new'}-${name}`}>{label}</FieldLabel>
      <Input id={`${departureId ?? 'new'}-${name}`} type="number" inputMode="numeric" min={0} {...form.register(name)} />
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <FieldError errors={[errors[name]]} />
    </Field>
  )

  return (
    <form
      onSubmit={form.handleSubmit((v) => run(() => saveDeparture({ ...v, tripId, departureId }), 'Saved', () => { if (!departureId) form.reset(defaults); onDone?.() }))}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.startDate}>
          <FieldLabel htmlFor={`${departureId ?? 'new'}-start`}>Start date</FieldLabel>
          <Input id={`${departureId ?? 'new'}-start`} type="date" {...form.register('startDate')} />
          <FieldError errors={[errors.startDate]} />
        </Field>
        <Field data-invalid={!!errors.endDate}>
          <FieldLabel htmlFor={`${departureId ?? 'new'}-end`}>End date</FieldLabel>
          <Input id={`${departureId ?? 'new'}-end`} type="date" {...form.register('endDate')} />
          <FieldError errors={[errors.endDate]} />
        </Field>
        {num('capacity', 'Seats')}
        {num('depositPerPersonRupees', 'Deposit per person (₹)', '0 = full payment only')}
        {num('balanceDueDaysBefore', 'Balance due (days before start)')}
        {num('bookingCutoffDays', 'Booking closes (days before start)')}
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Price options (per person, excl. GST)</legend>
        {fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1fr_7rem] items-end gap-2 sm:grid-cols-[1fr_8rem_auto_auto]">
            <Field data-invalid={!!errors.options?.[i]?.label}>
              <FieldLabel htmlFor={`${f.id}-l`} className="sr-only">Label</FieldLabel>
              <Input id={`${f.id}-l`} placeholder="Triple sharing" {...form.register(`options.${i}.label`)} />
            </Field>
            <Field data-invalid={!!errors.options?.[i]?.priceRupees}>
              <FieldLabel htmlFor={`${f.id}-p`} className="sr-only">Price (₹)</FieldLabel>
              <Input id={`${f.id}-p`} type="number" inputMode="numeric" min={1} placeholder="₹" {...form.register(`options.${i}.priceRupees`)} />
            </Field>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name={`${departureId ?? 'new'}-default`}
                checked={!!options?.[i]?.isDefault}
                onChange={() => fields.forEach((_, j) => form.setValue(`options.${j}.isDefault`, j === i, { shouldDirty: true }))}
              />
              Default
            </label>
            {fields.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>Remove</Button>}
          </div>
        ))}
        <FieldError errors={[errors.options?.root, errors.options as { message?: string } | undefined]} />
        {fields.length < 5 && (
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => append({ label: '', priceRupees: '', isDefault: false })}>
            Add price option
          </Button>
        )}
      </fieldset>

      <FieldError errors={[errors.depositPerPersonRupees]} />
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : departureId ? 'Save departure' : 'Add departure'}</Button>
      <ActionStatus status={status} />
    </form>
  )
}

export function CloseDepartureButton({ tripId, departureId }: { tripId: string; departureId: string }) {
  const { pending, status, run } = useAction()
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => confirm('Stop taking bookings for this departure?') && run(() => closeDeparture({ tripId, departureId }))}
      >
        Close bookings
      </Button>
      <ActionStatus status={status} />
    </>
  )
}
