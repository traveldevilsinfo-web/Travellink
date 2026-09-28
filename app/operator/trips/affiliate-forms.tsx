'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { ActionStatus, useAction } from '@/components/form/use-action'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatINR, pct } from '@/lib/domain/money'
import { AffiliateSettingsSchema, ContentKitSchema } from '@/lib/validation/trips'
import { saveAffiliateSettings, saveContentKit } from './actions'

type Mode = 'platform' | 'redirect' | 'enquiry'
const MODES: [Mode, string, string][] = [
  ['platform', 'Book on TripLink', 'Travelers pay on TripLink. Commission is deducted automatically.'],
  ['redirect', 'Your website', 'Travelers continue to your booking page with a click ID. You report bookings; we invoice monthly.'],
  ['enquiry', 'Enquiry', 'Travelers send an enquiry. You follow up on WhatsApp and mark bookings in Leads.'],
]

export type AffiliateDefaults = {
  creatorCommissionPct: string; bookingMode: Mode; redirectUrl: string
  leadFeeOn: boolean; leadFeeRupees: string; leadFeeMonthlyCap: string
}

export function AffiliateSettingsForm({ tripId, floor, fromPricePaise, defaults, canEdit }: {
  tripId: string; floor: number; fromPricePaise: number; defaults: AffiliateDefaults; canEdit: boolean
}) {
  const form = useForm({ resolver: zodResolver(AffiliateSettingsSchema), defaultValues: defaults })
  const { pending, status, run } = useAction()
  const [commission, mode, leadOn, leadFee, leadCap] = useWatch({ control: form.control, name: ['creatorCommissionPct', 'bookingMode', 'leadFeeOn', 'leadFeeRupees', 'leadFeeMonthlyCap'] })
  const e = form.formState.errors
  const pctNum = Number(commission) || 0

  return (
    <form onSubmit={form.handleSubmit((v) => run(() => saveAffiliateSettings({ ...v, tripId }), 'Saved'))} className="flex flex-col gap-6" noValidate>
      <fieldset disabled={!canEdit} className="flex flex-col gap-6 disabled:opacity-70">
        <Field data-invalid={!!e.creatorCommissionPct}>
          <div className="flex items-baseline justify-between gap-3">
            <FieldLabel htmlFor="pct">Creator commission</FieldLabel>
            <b className="num text-2xl">{pctNum}%</b>
          </div>
          <input id="pct" type="range" min={floor} max={40} step={0.5} className="w-full accent-brand" {...form.register('creatorCommissionPct')} />
          <div className="rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm">
            Creators earn <b className="num">{formatINR(pct(fromPricePaise, pctNum))}</b> per traveler at your {formatINR(fromPricePaise)} price (before GST).
          </div>
          <FieldDescription>Minimum {floor}%. Higher commissions get more creators posting. Changes apply to new bookings only; travelers never see it.</FieldDescription>
          <FieldError errors={[e.creatorCommissionPct]} />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">How travelers book</legend>
          {MODES.map(([value, label, hint]) => (
            <label key={value} className="flex cursor-pointer gap-3 rounded-xl border-[1.5px] p-3.5 has-checked:border-brand has-checked:bg-brand-50">
              <input type="radio" value={value} className="mt-1 accent-brand" {...form.register('bookingMode')} />
              <span><b>{label}</b><span className="block text-sm text-ink-2">{hint}</span></span>
            </label>
          ))}
        </fieldset>
        {mode === 'redirect' && (
          <Field data-invalid={!!e.redirectUrl}>
            <FieldLabel htmlFor="redirect">Your booking page</FieldLabel>
            <Input id="redirect" type="url" inputMode="url" placeholder="https://yoursite.com/trips/chakrata" {...form.register('redirectUrl')} />
            <FieldDescription>We add <code>?tl_click=…</code> and UTM tags so you can match bookings to creators.</FieldDescription>
            <FieldError errors={[e.redirectUrl]} />
          </Field>
        )}

        <div className="flex flex-col gap-3 rounded-xl border p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 size-4 accent-brand" {...form.register('leadFeeOn')} />
            <span><b>Pay creators per qualified lead</b><span className="block text-sm text-ink-2">A fixed fee for each OTP-verified enquiry that isn&apos;t a duplicate. Leads that book earn the booking commission instead.</span></span>
          </label>
          {leadOn && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={!!e.leadFeeRupees}>
                <FieldLabel htmlFor="leadfee">Fee per lead (₹)</FieldLabel>
                <Input id="leadfee" type="number" inputMode="numeric" min={50} max={1000} {...form.register('leadFeeRupees')} />
                <FieldError errors={[e.leadFeeRupees]} />
              </Field>
              <Field data-invalid={!!e.leadFeeMonthlyCap}>
                <FieldLabel htmlFor="leadcap">Monthly lead cap</FieldLabel>
                <Input id="leadcap" type="number" inputMode="numeric" min={0} max={10000} {...form.register('leadFeeMonthlyCap')} />
                <FieldDescription>0 = no cap.{Number(leadCap) > 0 && <> You pay at most <b>{formatINR(Math.round(Number(leadFee) || 0) * 100 * Number(leadCap))}</b> a month.</>}</FieldDescription>
                <FieldError errors={[e.leadFeeMonthlyCap]} />
              </Field>
            </div>
          )}
        </div>
      </fieldset>
      {canEdit ? <Button type="submit" disabled={pending}>Save creator settings</Button> : <p className="text-sm text-ink-2">Only owners and managers can change these.</p>}
      <ActionStatus status={status} />
    </form>
  )
}

export function ContentKitForm({ tripId, defaults }: { tripId: string; defaults: { hooks: string; brief: string } }) {
  const form = useForm({ resolver: zodResolver(ContentKitSchema), defaultValues: defaults })
  const { pending, status, run } = useAction()
  const e = form.formState.errors
  return (
    <form onSubmit={form.handleSubmit((v) => run(() => saveContentKit({ ...v, tripId }), 'Saved'))} className="flex flex-col gap-4" noValidate>
      <div><h2 className="text-lg font-bold">Content kit</h2><p className="text-sm text-ink-2">Creators see this on the trip page with your photos, ready to download.</p></div>
      <Field data-invalid={!!e.hooks}>
        <FieldLabel htmlFor="hooks">Reel hooks, one per line</FieldLabel>
        <Textarea id="hooks" rows={4} placeholder={'3 days in the mountains for less than a phone bill\nThe waterfall nobody in Delhi knows about'} {...form.register('hooks')} />
        <FieldError errors={[e.hooks]} />
      </Field>
      <Field data-invalid={!!e.brief}>
        <FieldLabel htmlFor="brief">Brief for creators</FieldLabel>
        <Textarea id="brief" rows={4} placeholder="What to highlight, what not to promise, dates to mention…" {...form.register('brief')} />
        <FieldError errors={[e.brief]} />
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>Save content kit</Button>
      <ActionStatus status={status} />
    </form>
  )
}
