'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ActionStatus, useAction } from '@/components/form/use-action'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { type OrgCreateInput, OrgCreateSchema, type OrgDetailsInput, OrgDetailsSchema } from '@/lib/validation/operator'
import { acceptAgreement, createOrg, updateOrgDetails, uploadKycDoc } from './actions'

export function OrgCreateForm() {
  const form = useForm<OrgCreateInput>({ resolver: zodResolver(OrgCreateSchema), defaultValues: { name: '', city: '' } })
  const { pending, status, run } = useAction()
  const { errors } = form.formState
  return (
    <form onSubmit={form.handleSubmit((v) => run(() => createOrg(v)))} className="flex flex-col gap-4" noValidate>
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="name">Company / brand name</FieldLabel>
        <Input id="name" autoComplete="organization" {...form.register('name')} />
        <FieldError errors={[errors.name]} />
      </Field>
      <Field>
        <FieldLabel htmlFor="city">City</FieldLabel>
        <Input id="city" autoComplete="address-level2" {...form.register('city')} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create company'}</Button>
      <ActionStatus status={status} />
    </form>
  )
}

export function OrgDetailsForm({ defaults }: { defaults: OrgDetailsInput }) {
  const form = useForm<OrgDetailsInput>({ resolver: zodResolver(OrgDetailsSchema), defaultValues: defaults })
  const { pending, status, run } = useAction()
  const { errors } = form.formState
  const text = (name: keyof OrgDetailsInput, label: string, props: React.ComponentProps<'input'> = {}) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} {...props} {...form.register(name)} />
      <FieldError errors={[errors[name]]} />
    </Field>
  )
  return (
    <form onSubmit={form.handleSubmit((v) => run(() => updateOrgDetails(v), 'Saved'))} className="flex flex-col gap-4" noValidate>
      {text('legalName', 'Legal name (as on GST certificate)')}
      {text('gstin', 'GSTIN', { autoCapitalize: 'characters', maxLength: 15 })}
      <Field data-invalid={!!errors.gstScheme}>
        <FieldLabel htmlFor="gstScheme">GST scheme for tour packages</FieldLabel>
        <NativeSelect id="gstScheme" {...form.register('gstScheme')}>
          <NativeSelectOption value="gst5_no_itc">5% (no input tax credit)</NativeSelectOption>
          <NativeSelectOption value="gst18_with_itc">18% (with input tax credit)</NativeSelectOption>
        </NativeSelect>
        <FieldDescription>Your accountant can confirm which one you use.</FieldDescription>
      </Field>
      {text('city', 'City')}
      {text('supportPhone', 'Support phone (shared with travelers only after booking)', { type: 'tel', inputMode: 'tel' })}
      {text('supportEmail', 'Support email', { type: 'email' })}
      <Field>
        <FieldLabel htmlFor="description">About your company</FieldLabel>
        <Textarea id="description" rows={4} {...form.register('description')} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save details'}</Button>
      <ActionStatus status={status} />
    </form>
  )
}

export function KycUploadForm({ orgId, docType, label }: { orgId: string; docType: string; label: string }) {
  const { pending, status, run } = useAction()
  const ref = useRef<HTMLFormElement>(null)
  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        run(() => uploadKycDoc(fd), 'Uploaded', () => ref.current?.reset())
      }}
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="docType" value={docType} />
      <Field className="flex-1">
        <FieldLabel htmlFor={`kyc-${docType}`}>{label}</FieldLabel>
        <Input id={`kyc-${docType}`} name="file" type="file" accept="image/jpeg,image/png,application/pdf" required />
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>{pending ? 'Uploading…' : 'Upload'}</Button>
      <ActionStatus status={status} />
    </form>
  )
}

export function AgreementForm({ orgId }: { orgId: string }) {
  const [accepted, setAccepted] = useState(false)
  const { pending, status, run } = useAction()
  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" />
        <span>
          I accept the <a href="/legal/operator-agreement" className="underline">Operator Agreement</a> on behalf of my company,
          including merchant-of-record duties, cancellation obligations and non-circumvention.
        </span>
      </label>
      <Button disabled={!accepted || pending} onClick={() => run(() => acceptAgreement({ orgId, accept: true }))}>
        {pending ? 'Saving…' : 'Accept agreement'}
      </Button>
      <ActionStatus status={status} />
    </div>
  )
}
