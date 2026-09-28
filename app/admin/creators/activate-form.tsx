'use client'

import { useState } from 'react'
import { ActionStatus, useAction } from '@/components/form/use-action'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { activateCreator } from './actions'

export function ActivateForm({ id }: { id: string }) {
  const [reason, setReason] = useState('')
  const { pending, status, run } = useAction()
  return (
    <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); run(() => activateCreator({ id, reason }), 'Activated') }}>
      <div className="flex gap-2">
        <Input aria-label="Reason" placeholder="Reason, e.g. 1,240 followers per screenshot" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        <Button size="sm" type="submit" disabled={pending || reason.trim().length < 5}>Activate</Button>
      </div>
      <ActionStatus status={status} />
    </form>
  )
}
