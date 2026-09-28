import { formatDateIST } from '@/lib/domain/dates'

export type CommissionStatus = 'pending' | 'confirmed' | 'payable' | 'in_payout' | 'paid' | 'reversed' | 'on_hold'

/** Status label, badge tone, and the "what happens next" line (ARCHITECTURE §6.5, §20.4). Pure. */
export function describeCommission(c: { status: CommissionStatus; confirmable_at: string; payable_at: string; reversed_reason: string | null }) {
  const d = (iso: string) => formatDateIST(iso.slice(0, 10))
  switch (c.status) {
    case 'pending': return { label: 'Pending', tone: 'warning', next: `Confirms on ${d(c.confirmable_at)}` } as const
    case 'confirmed': return { label: 'Confirmed', tone: 'teal', next: `Payable after ${d(c.payable_at)}` } as const
    case 'payable': return { label: 'Payable', tone: 'success', next: 'In your next payout on the 5th' } as const
    case 'in_payout': return { label: 'In payout', tone: 'info', next: 'Being paid this cycle' } as const
    case 'paid': return { label: 'Paid', tone: 'neutral', next: 'Paid to your UPI' } as const
    case 'reversed': return { label: 'Reversed', tone: 'danger', next: c.reversed_reason ?? 'Traveler cancelled before confirmation' } as const
    case 'on_hold': return { label: 'Under review', tone: 'warning', next: "We're checking this booking. Usually 2 working days." } as const
  }
}

/** Next 5th of the month (payout day), as YYYY-MM-DD, given today in IST. */
export function nextPayoutDate(today: string): string {
  const [y, m, d] = today.split('-').map(Number)
  const date = d! < 5 ? new Date(Date.UTC(y!, m! - 1, 5)) : new Date(Date.UTC(y!, m!, 5))
  return date.toISOString().slice(0, 10)
}
