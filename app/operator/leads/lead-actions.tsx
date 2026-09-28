'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { type MarkBookedInput, MarkBookedSchema } from '@/lib/validation/leads'
import { markLeadBooked, setLeadStatus } from './actions'

type Dep = { id: string; label: string }

export function LeadActions({ leadId, status, travelers, departureId, departures, creator }: {
  leadId: string; status: string; travelers: number; departureId: string | null; departures: Dep[]; creator: string | null
}) {
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  if (status === 'converted') return null
  const set = (s: 'new' | 'contacted' | 'lost') => start(async () => { const r = await setLeadStatus({ leadId, status: s }); if (!r.ok) setError(r.error) })
  return (
    <div className="flex flex-wrap items-center gap-2">
      <MarkBooked leadId={leadId} travelers={travelers} departureId={departureId} departures={departures} creator={creator} />
      {status === 'new' && <Button size="sm" variant="outline" disabled={pending} onClick={() => set('contacted')}>Mark contacted</Button>}
      {status !== 'lost' ? <Button size="sm" variant="ghost" disabled={pending} onClick={() => set('lost')}>Lost</Button>
        : <Button size="sm" variant="ghost" disabled={pending} onClick={() => set('contacted')}>Reopen</Button>}
      {error && <p role="alert" className="w-full text-sm text-danger">{error}</p>}
    </div>
  )
}

function MarkBooked({ leadId, travelers, departureId, departures, creator }: { leadId: string; travelers: number; departureId: string | null; departures: Dep[]; creator: string | null }) {
  const [open, setOpen] = useState(false)
  const form = useForm<MarkBookedInput>({
    resolver: zodResolver(MarkBookedSchema),
    defaultValues: { leadId, bookingRef: '', travelers: String(travelers), amountRupees: '', departureId: departureId ?? departures[0]?.id ?? '' },
  })
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const e = form.formState.errors
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Mark booked</DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Mark as booked</DialogTitle>
          <DialogDescription>{creator ? <>@{creator} gets the booking commission instead of the lead fee. You&apos;re invoiced monthly.</> : 'No creator on this lead, so no commission is due.'}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3.5" noValidate onSubmit={form.handleSubmit((v) => { setError(undefined); start(async () => { const r = await markLeadBooked(v); if (r.ok) setOpen(false); else setError(r.error) }) })}>
          <Field data-invalid={!!e.bookingRef}><FieldLabel htmlFor={`ref-${leadId}`}>Your booking reference</FieldLabel><Input id={`ref-${leadId}`} placeholder="TD-2041" {...form.register('bookingRef')} /><FieldError errors={[e.bookingRef]} /></Field>
          <Field data-invalid={!!e.departureId}>
            <FieldLabel htmlFor={`dep-${leadId}`}>Departure</FieldLabel>
            <select id={`dep-${leadId}`} className="h-11 rounded-xl border-[1.5px] bg-card px-3" {...form.register('departureId')}>
              {departures.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
            <FieldError errors={[e.departureId]} />
          </Field>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Field data-invalid={!!e.travelers}><FieldLabel htmlFor={`tr-${leadId}`}>Travelers</FieldLabel><Input id={`tr-${leadId}`} type="number" inputMode="numeric" min={1} {...form.register('travelers')} /><FieldError errors={[e.travelers]} /></Field>
            <Field data-invalid={!!e.amountRupees}>
              <FieldLabel htmlFor={`amt-${leadId}`}>Total amount (₹)</FieldLabel>
              <Input id={`amt-${leadId}`} type="number" inputMode="numeric" min={1} {...form.register('amountRupees')} />
              <FieldDescription>Before GST, all travelers.</FieldDescription>
              <FieldError errors={[e.amountRupees]} />
            </Field>
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Confirm booking'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
