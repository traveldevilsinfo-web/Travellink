'use client'

import { useState, useTransition } from 'react'
import type { ActionResult } from '@/lib/errors'

/** Runs a server action in a transition and tracks pending / error / success message. */
export function useAction() {
  const [pending, start] = useTransition()
  const [status, setStatus] = useState<{ ok: boolean; msg: string }>()
  const run = <T,>(fn: () => Promise<ActionResult<T> | void>, okMsg?: string, onOk?: (data?: T) => void) => {
    setStatus(undefined)
    start(async () => {
      const res = await fn()
      if (res && !res.ok) return setStatus({ ok: false, msg: res.error })
      if (okMsg) setStatus({ ok: true, msg: okMsg })
      onOk?.(res ? res.data : undefined)
    })
  }
  return { pending, status, run }
}

export function ActionStatus({ status }: { status?: { ok: boolean; msg: string } }) {
  if (!status) return null
  return (
    <p role={status.ok ? 'status' : 'alert'} className={status.ok ? 'text-sm text-muted-foreground' : 'text-sm text-destructive'}>
      {status.msg}
    </p>
  )
}
