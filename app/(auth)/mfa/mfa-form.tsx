'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { enrollTotp, verifyTotp } from './actions'

export function MfaForm({ next, factorId: verifiedFactorId }: { next: string; factorId?: string }) {
  const [enrolment, setEnrolment] = useState<{ factorId: string; qrCode: string; secret: string }>()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const factorId = verifiedFactorId ?? enrolment?.factorId

  const enroll = () =>
    start(async () => {
      setError(undefined)
      const res = await enrollTotp()
      if (res.ok && res.data) setEnrolment(res.data)
      else if (!res.ok) setError(res.error)
    })

  const verify = (e: React.FormEvent) => {
    e.preventDefault()
    if (!factorId || code.length !== 6) return setError('Enter the 6-digit code')
    start(async () => {
      setError(undefined)
      const res = await verifyTotp({ factorId, code, next })
      if (res && !res.ok) setError(res.error)
    })
  }

  if (!factorId) {
    return (
      <div className="flex flex-col gap-3">
        <Button onClick={enroll} disabled={pending}>{pending ? 'Preparing…' : 'Set up authenticator app'}</Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={verify} className="flex flex-col gap-4">
      {enrolment && (
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL SVG from Supabase */}
          <img src={enrolment.qrCode} alt="QR code for your authenticator app" width={180} height={180} />
          <p className="text-center text-xs text-muted-foreground break-all">
            Can&apos;t scan? Enter this key: <code>{enrolment.secret}</code>
          </p>
        </div>
      )}
      <Field>
        <FieldLabel htmlFor="totp">6-digit code</FieldLabel>
        <InputOTP id="totp" maxLength={6} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={setCode}>
          <InputOTPGroup>
            {Array.from({ length: 6 }, (_, i) => <InputOTPSlot key={i} index={i} />)}
          </InputOTPGroup>
        </InputOTP>
        {!verifiedFactorId && <FieldDescription>Scan the QR code, then enter the code shown.</FieldDescription>}
      </Field>
      <Button type="submit" disabled={pending}>{pending ? 'Verifying…' : 'Verify'}</Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
