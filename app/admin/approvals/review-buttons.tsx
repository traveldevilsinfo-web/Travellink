'use client'

import { useState } from 'react'
import { ActionStatus, useAction } from '@/components/form/use-action'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { reviewOrg, reviewTrip } from './actions'

export function ReviewButtons({ kind, id }: { kind: 'org' | 'trip'; id: string }) {
  const [rejecting, setRejecting] = useState(false)
  const [notes, setNotes] = useState('')
  const { pending, status, run } = useAction()
  const act = kind === 'org' ? reviewOrg : reviewTrip

  return (
    <div className="flex flex-col gap-2">
      {rejecting ? (
        <>
          <Textarea aria-label="What needs fixing" placeholder="What needs fixing? The operator will see this." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => act({ id, decision: 'reject', notes }), 'Rejected')}>Send back</Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" disabled={pending} onClick={() => run(() => act({ id, decision: 'approve' }), 'Approved')}>Approve</Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejecting(true)}>Reject…</Button>
        </div>
      )}
      <ActionStatus status={status} />
    </div>
  )
}
