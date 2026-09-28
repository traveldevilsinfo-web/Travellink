'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { type ProfileInput, ProfileSchema } from '@/lib/validation/auth'
import { updateProfile } from './actions'

export function ProfileForm({ defaults }: { defaults: ProfileInput }) {
  const form = useForm({ resolver: zodResolver(ProfileSchema), defaultValues: defaults })
  const [status, setStatus] = useState<{ ok: boolean; msg: string }>()
  const [pending, start] = useTransition()
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    start(async () => {
      const res = await updateProfile(values)
      setStatus(res.ok ? { ok: true, msg: 'Saved' } : { ok: false, msg: res.error })
    }),
  )

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field data-invalid={!!errors.fullName}>
        <FieldLabel htmlFor="fullName">Full name</FieldLabel>
        <Input id="fullName" autoComplete="name" {...form.register('fullName')} />
        <FieldError errors={[errors.fullName]} />
      </Field>
      <Field data-invalid={!!errors.city}>
        <FieldLabel htmlFor="city">City</FieldLabel>
        <Input id="city" autoComplete="address-level2" {...form.register('city')} />
        <FieldError errors={[errors.city]} />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" {...form.register('marketingOptIn')} />
        Send me trip offers on WhatsApp. You can turn this off any time.
      </label>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
      {status && (
        <p role={status.ok ? 'status' : 'alert'} className={status.ok ? 'text-sm' : 'text-sm text-destructive'}>{status.msg}</p>
      )}
    </form>
  )
}
