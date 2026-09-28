'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

export function CopyButton({ text, label = 'Copy link' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-11 place-items-center rounded-xl text-ink-2 hover:bg-subtle"
      onClick={() => {
        const ok = () => { setDone(true); setTimeout(() => setDone(false), 1500) }
        navigator.clipboard?.writeText(text).then(ok, ok)
      }}
    >
      {done ? <Check className="size-5 text-success" aria-hidden /> : <Copy className="size-5" aria-hidden />}
    </button>
  )
}
