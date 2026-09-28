'use client'

import { Check, Copy, Link as LinkIcon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { createLink } from '@/app/creator/(app)/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { captionFor } from '@/lib/validation/links'

export function GetLinkDialog({ tripId, tripTitle, siteHost, trigger }: { tripId: string | null; tripTitle: string; siteHost: string; trigger?: React.ReactNode }) {
  const [label, setLabel] = useState(`Reel · ${tripTitle.split(' ')[0]}`)
  const [code, setCode] = useState<string>()
  const [error, setError] = useState<string>()
  const [copied, setCopied] = useState<'link' | 'caption'>()
  const [pending, start] = useTransition()
  const url = code ? `${siteHost}/r/${code}` : ''

  const copy = (what: 'link' | 'caption', text: string) => {
    const done = () => { setCopied(what); setTimeout(() => setCopied(undefined), 1600) }
    navigator.clipboard?.writeText(text).then(done, done)
  }

  return (
    <Dialog onOpenChange={(o) => { if (!o) { setCode(undefined); setError(undefined) } }}>
      <DialogTrigger render={(trigger as React.ReactElement) ?? <Button size="lg" className="w-full"><LinkIcon />Get my link</Button>} />
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Your link for {tripTitle.split(' ')[0]}</DialogTitle>
          <DialogDescription>Make one link per reel or story so you can see which post earns.</DialogDescription>
        </DialogHeader>
        {!code ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              setError(undefined)
              start(async () => {
                const res = await createLink({ tripId, label })
                if (res.ok && res.data) setCode(res.data.code)
                else if (!res.ok) setError(res.error)
              })
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor="link-label">
              Which post is this for?
              <input id="link-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} className="h-12 rounded-xl border-[1.5px] px-3.5 text-base font-normal outline-none focus:border-brand focus:ring-4 focus:ring-brand-50" />
              <span className="font-normal text-ink-3">Only you see this, e.g. &ldquo;Reel · Chakrata vlog 12 Oct&rdquo;.</span>
            </label>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Creating…' : 'Create link'}</Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 rounded-xl border-[1.5px] py-1.5 pr-1.5 pl-3.5">
              <span className="min-w-0 flex-1 truncate font-semibold num">{url.replace(/^https?:\/\//, '')}</span>
              <Button size="sm" onClick={() => copy('link', url)}>{copied === 'link' ? <Check /> : <Copy />}{copied === 'link' ? 'Copied' : 'Copy'}</Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Caption</span>
              <div className="rounded-xl bg-subtle px-3.5 py-3 text-[15px]">{captionFor(tripTitle, url.replace(/^https?:\/\//, ''))}</div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-ink-3">#ad is included, as ASCI rules require.</span>
                <Button variant="ghost" size="sm" onClick={() => copy('caption', captionFor(tripTitle, url.replace(/^https?:\/\//, '')))}>{copied === 'caption' ? 'Copied' : 'Copy caption'}</Button>
              </div>
            </div>
            <a className="inline-flex h-11 items-center justify-center rounded-xl border bg-card font-semibold text-success hover:border-ink-3" href={`https://wa.me/?text=${encodeURIComponent(captionFor(tripTitle, url))}`} target="_blank" rel="noopener noreferrer">
              Share on WhatsApp
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
