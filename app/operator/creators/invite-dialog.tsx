'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Send } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { type InviteInput, InviteSchema } from '@/lib/validation/invites'
import { inviteCreator } from './actions'

export function InviteDialog({ creatorId, handle, trips, floor, size = 'sm' }: {
  creatorId: string; handle: string; trips: { id: string; title: string; pct: number | null }[]; floor: number; size?: 'sm' | 'default'
}) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const form = useForm<InviteInput>({ resolver: zodResolver(InviteSchema), defaultValues: { creatorId, tripId: trips[0]?.id ?? '', commissionPct: '', message: '' } })
  const e = form.formState.errors
  const tripId = useWatch({ control: form.control, name: 'tripId' })
  const trip = trips.find((t) => t.id === tripId)

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setDone(false); setError(undefined) } }}>
      <DialogTrigger render={<Button size={size} disabled={!trips.length} />}><Send />Invite</DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Invite @{handle}</DialogTitle>
          <DialogDescription>They get the invite in their TripLink dashboard. A custom commission applies once they accept.</DialogDescription>
        </DialogHeader>
        {done ? (
          <p className="rounded-xl bg-success-50 px-4 py-3 text-sm">Invite sent. You&apos;ll see their links and results here once they share the trip.</p>
        ) : (
          <form className="flex flex-col gap-3.5" noValidate onSubmit={form.handleSubmit((v) => { setError(undefined); start(async () => { const r = await inviteCreator(v); if (r.ok) setDone(true); else setError(r.error) }) })}>
            <Field data-invalid={!!e.tripId}>
              <FieldLabel htmlFor={`inv-trip-${creatorId}`}>Trip</FieldLabel>
              <select id={`inv-trip-${creatorId}`} className="h-11 rounded-xl border-[1.5px] bg-card px-3" {...form.register('tripId')}>
                {trips.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              <FieldError errors={[e.tripId]} />
            </Field>
            <Field data-invalid={!!e.commissionPct}>
              <FieldLabel htmlFor={`inv-pct-${creatorId}`}>Custom commission (%)</FieldLabel>
              <Input id={`inv-pct-${creatorId}`} type="number" inputMode="decimal" step={0.5} min={floor} max={50} placeholder={trip?.pct != null ? `Standard ${trip.pct}%` : 'Standard rate'} {...form.register('commissionPct')} />
              <FieldDescription>Leave blank for your standard rate. Minimum {floor}%.</FieldDescription>
              <FieldError errors={[e.commissionPct]} />
            </Field>
            <Field data-invalid={!!e.message}>
              <FieldLabel htmlFor={`inv-msg-${creatorId}`}>Message (optional)</FieldLabel>
              <Textarea id={`inv-msg-${creatorId}`} rows={3} maxLength={500} placeholder="Loved your Spiti reel. We run weekend treks from Delhi…" {...form.register('message')} />
              <FieldError errors={[e.message]} />
            </Field>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send invite'}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
