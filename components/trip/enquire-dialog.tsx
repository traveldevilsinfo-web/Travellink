'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { startEnquiry, verifyEnquiry } from '@/app/(public)/trips/[slug]/actions'
import { Turnstile } from '@/components/turnstile'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { type EnquiryInput, EnquirySchema } from '@/lib/validation/leads'

type Step = { s: 'form' } | { s: 'code'; phoneEnd: string; devCode?: string } | { s: 'done'; duplicate: boolean }

export function EnquireDialog({ tripId, tripTitle, operator, departures, label, variant = 'default', className }: {
  tripId: string; tripTitle: string; operator: string; departures: { id: string; label: string }[]
  label: string; variant?: 'default' | 'outline'; className?: string
}) {
  const form = useForm<EnquiryInput>({
    resolver: zodResolver(EnquirySchema),
    defaultValues: { tripId, name: '', phone: '', travelers: '2', departureId: null, message: '' },
  })
  const [step, setStep] = useState<Step>({ s: 'form' })
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const e = form.formState.errors

  const send = form.handleSubmit((v) => {
    setError(undefined)
    start(async () => {
      const r = await startEnquiry({ ...v, turnstileToken: window.turnstile?.getResponse() })
      if (r.ok && r.data) { setCode(''); setStep({ s: 'code', ...r.data }) } else if (!r.ok) { setError(r.error); window.turnstile?.reset() }
    })
  })
  const verify = () => {
    setError(undefined)
    start(async () => {
      const r = await verifyEnquiry({ code })
      if (r.ok) setStep({ s: 'done', duplicate: !!r.data?.duplicate }); else setError(r.error)
    })
  }

  return (
    <Dialog onOpenChange={(o) => { if (!o && step.s === 'done') { form.reset(); setStep({ s: 'form' }) } }}>
      <DialogTrigger render={<button type="button" className={buttonVariants({ size: variant === 'default' ? 'lg' : 'default', variant, className })} />}>
        {variant === 'outline' && <MessageCircle />}{label}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        {step.s === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle>Enquire about {tripTitle.split(' ').slice(0, 3).join(' ')}</DialogTitle>
              <DialogDescription>{operator} will reply on WhatsApp. Your number is shared only with them.</DialogDescription>
            </DialogHeader>
            <form onSubmit={send} className="flex flex-col gap-3.5" noValidate>
              <Field data-invalid={!!e.name}><FieldLabel htmlFor="enq-name">Your name</FieldLabel><Input id="enq-name" autoComplete="name" {...form.register('name')} /><FieldError errors={[e.name]} /></Field>
              <Field data-invalid={!!e.phone}>
                <FieldLabel htmlFor="enq-phone">WhatsApp number</FieldLabel>
                <Input id="enq-phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="98765 43210" {...form.register('phone')} />
                <FieldError errors={[e.phone]} />
              </Field>
              <div className="grid grid-cols-[110px_1fr] gap-3">
                <Field data-invalid={!!e.travelers}><FieldLabel htmlFor="enq-trav">Travelers</FieldLabel><Input id="enq-trav" type="number" inputMode="numeric" min={1} max={20} {...form.register('travelers')} /><FieldError errors={[e.travelers]} /></Field>
                <Field>
                  <FieldLabel htmlFor="enq-dep">Preferred date</FieldLabel>
                  <select id="enq-dep" className="h-11 rounded-xl border-[1.5px] bg-card px-3" {...form.register('departureId', { setValueAs: (v) => v || null })}>
                    <option value="">I&apos;m flexible</option>
                    {departures.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                </Field>
              </div>
              <Field data-invalid={!!e.message}><FieldLabel htmlFor="enq-msg">Question (optional)</FieldLabel><Textarea id="enq-msg" rows={2} maxLength={500} placeholder="Pickup from Delhi? Solo female travelers?" {...form.register('message')} /><FieldError errors={[e.message]} /></Field>
              <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              <Button type="submit" size="lg" disabled={pending}>{pending ? 'Sending code…' : 'Send code on WhatsApp'}</Button>
            </form>
          </>
        )}
        {step.s === 'code' && (
          <>
            <DialogHeader>
              <DialogTitle>Enter the 6-digit code</DialogTitle>
              <DialogDescription>We sent it to the number ending {step.phoneEnd}. It expires in 10 minutes.</DialogDescription>
            </DialogHeader>
            {step.devCode && <p className="rounded-xl border-[1.5px] border-dashed border-brand bg-brand-50 px-3.5 py-2.5 text-sm">Development mode, no message sent. Your code is <b className="num tracking-widest">{step.devCode}</b></p>}
            <form className="flex flex-col gap-3" onSubmit={(ev) => { ev.preventDefault(); verify() }}>
              <label htmlFor="enq-code" className="sr-only">Code</label>
              <Input id="enq-code" value={code} onChange={(ev) => setCode(ev.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus className="h-13 text-center text-2xl tracking-[0.5em]" />
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              <Button type="submit" size="lg" disabled={pending || code.length !== 6}>{pending ? 'Checking…' : 'Verify and send enquiry'}</Button>
              <Button type="button" variant="ghost" onClick={() => { setError(undefined); setStep({ s: 'form' }) }}>Change number</Button>
            </form>
          </>
        )}
        {step.s === 'done' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-12 text-success" aria-hidden />
            <DialogTitle>{step.duplicate ? 'You already enquired' : 'Enquiry sent'}</DialogTitle>
            <DialogDescription>{step.duplicate ? `${operator} has your earlier enquiry for this trip and will reply on WhatsApp.` : `${operator} will message you on WhatsApp, usually within a few hours.`}</DialogDescription>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
