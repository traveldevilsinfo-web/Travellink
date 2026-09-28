'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Turnstile, turnstileToken } from '@/components/turnstile'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel, FieldSeparator } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { MagicLinkSchema, SendOtpSchema, VerifyOtpSchema } from '@/lib/validation/auth'
import { sendMagicLink, sendPhoneOtp, signInWithGoogle, verifyPhoneOtp } from './actions'

type Step = { kind: 'phone' } | { kind: 'code'; phone: string } | { kind: 'email' } | { kind: 'email-sent' }

export function LoginForm({ next, turnstileSiteKey }: { next: string; turnstileSiteKey?: string }) {
  const [step, setStep] = useState<Step>({ kind: 'phone' })
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()

  const run = (fn: () => Promise<{ ok: boolean; error?: string } | void>, onOk?: () => void) => {
    setError(undefined)
    start(async () => {
      const res = await fn()
      if (res && !res.ok) setError(res.error)
      else onOk?.()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {step.kind === 'phone' && (
        <PhoneStep
          pending={pending}
          onSubmit={(phone) => run(() => sendPhoneOtp({ phone, turnstileToken: turnstileToken() }), () => setStep({ kind: 'code', phone }))}
        />
      )}
      {step.kind === 'code' && (
        <CodeStep
          phone={step.phone}
          pending={pending}
          onBack={() => setStep({ kind: 'phone' })}
          onSubmit={(token) => run(() => verifyPhoneOtp({ phone: step.phone, token, next }))}
        />
      )}
      {step.kind === 'email' && (
        <EmailStep
          pending={pending}
          onSubmit={(email) => run(() => sendMagicLink({ email, next, turnstileToken: turnstileToken() }), () => setStep({ kind: 'email-sent' }))}
        />
      )}
      {step.kind === 'email-sent' && <p className="text-sm">Check your inbox for a sign-in link. It expires in 1 hour.</p>}

      {(step.kind === 'phone' || step.kind === 'email') && <Turnstile siteKey={turnstileSiteKey} />}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <FieldSeparator>or</FieldSeparator>
      <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => signInWithGoogle(next))}>
        Continue with Google
      </Button>
      {step.kind === 'phone' ? (
        <Button type="button" variant="ghost" onClick={() => setStep({ kind: 'email' })}>Use email instead</Button>
      ) : step.kind === 'email' ? (
        <Button type="button" variant="ghost" onClick={() => setStep({ kind: 'phone' })}>Use mobile number instead</Button>
      ) : null}
    </div>
  )
}

function PhoneStep({ pending, onSubmit }: { pending: boolean; onSubmit: (phone: string) => void }) {
  const form = useForm({ resolver: zodResolver(SendOtpSchema.pick({ phone: true })), defaultValues: { phone: '' } })
  return (
    <form onSubmit={form.handleSubmit(({ phone }) => onSubmit(phone))} className="flex flex-col gap-3" noValidate>
      <Field data-invalid={!!form.formState.errors.phone}>
        <FieldLabel htmlFor="phone">Mobile number</FieldLabel>
        <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" {...form.register('phone')} />
        <FieldError errors={[form.formState.errors.phone]} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send code'}</Button>
    </form>
  )
}

function CodeStep({ phone, pending, onBack, onSubmit }: { phone: string; pending: boolean; onBack: () => void; onSubmit: (token: string) => void }) {
  const form = useForm({ resolver: zodResolver(VerifyOtpSchema.pick({ token: true })), defaultValues: { token: '' } })
  return (
    <form onSubmit={form.handleSubmit(({ token }) => onSubmit(token))} className="flex flex-col gap-3" noValidate>
      <Field data-invalid={!!form.formState.errors.token}>
        <FieldLabel htmlFor="otp">Code sent to {phone}</FieldLabel>
        <Controller
          control={form.control}
          name="token"
          render={({ field }) => (
            <InputOTP id="otp" maxLength={6} autoComplete="one-time-code" inputMode="numeric" value={field.value} onChange={field.onChange}>
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, i) => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
          )}
        />
        <FieldError errors={[form.formState.errors.token]} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? 'Verifying…' : 'Verify'}</Button>
      <Button type="button" variant="ghost" onClick={onBack}>Change number</Button>
    </form>
  )
}

function EmailStep({ pending, onSubmit }: { pending: boolean; onSubmit: (email: string) => void }) {
  const form = useForm({ resolver: zodResolver(MagicLinkSchema.pick({ email: true })), defaultValues: { email: '' } })
  return (
    <form onSubmit={form.handleSubmit(({ email }) => onSubmit(email))} className="flex flex-col gap-3" noValidate>
      <Field data-invalid={!!form.formState.errors.email}>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
        <FieldError errors={[form.formState.errors.email]} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? 'Sending…' : 'Email me a sign-in link'}</Button>
    </form>
  )
}
