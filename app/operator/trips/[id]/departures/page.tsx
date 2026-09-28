import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireTripAccess } from '@/lib/auth/guards'
import { addDays, formatDateIST, todayIST } from '@/lib/domain/dates'
import { formatINR } from '@/lib/domain/money'
import { CloseDepartureButton, DepartureForm } from './departure-form'

export const metadata: Metadata = { title: 'Departures', robots: { index: false } }

type Dep = {
  id: string; start_date: string; end_date: string; capacity: number; seats_booked: number; seats_held: number
  deposit_per_person_paise: number; balance_due_days_before: number; booking_cutoff_days: number; status: string
  departure_price_options: { id: string; label: string; price_paise: number; is_default: boolean; sort_order: number }[]
}

export default async function DeparturesPage({ params }: PageProps<'/operator/trips/[id]/departures'>) {
  const id = z.guid().safeParse((await params).id)
  if (!id.success) notFound()
  const { supabase, orgRole } = await requireTripAccess(id.data)
  const [{ data: trip }, { data }] = await Promise.all([
    supabase.from('trips').select('title, duration_days').eq('id', id.data).single(),
    supabase
      .from('departures')
      .select('id, start_date, end_date, capacity, seats_booked, seats_held, deposit_per_person_paise, balance_due_days_before, booking_cutoff_days, status, departure_price_options(id, label, price_paise, is_default, sort_order)')
      .eq('trip_id', id.data)
      .gte('end_date', addDays(todayIST(), -30))
      .order('start_date'),
  ])
  const t = trip as { title: string; duration_days: number }
  const deps = (data ?? []) as Dep[]
  const firstStart = addDays(todayIST(), 14)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <Link href={`/operator/trips/${id.data}`} className="text-sm text-muted-foreground">← {t.title}</Link>
        <h1 className="mt-2 text-xl font-semibold">Departures & prices</h1>
        <p className="text-sm text-muted-foreground">{t.duration_days}-day trip. Travelers see seats left, never your bookings.</p>
      </header>

      {deps.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No departures yet. Add your first date below.</p>
      )}

      {deps.map((d) => (
        <Card key={d.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {formatDateIST(d.start_date)} → {formatDateIST(d.end_date)}
              <Badge variant={d.status === 'open' ? 'secondary' : 'outline'}>{d.status.replace('_', ' ')}</Badge>
              <span className="text-sm font-normal text-muted-foreground">
                {d.seats_booked} booked · {d.seats_held} held · {d.capacity - d.seats_booked - d.seats_held} left
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm">
              {[...d.departure_price_options].sort((a, b) => a.sort_order - b.sort_order).map((o) => `${o.label} ${formatINR(o.price_paise)}`).join(' · ')}
            </p>
            {d.status === 'open' && (
              <details>
                <summary className="cursor-pointer text-sm underline">Edit</summary>
                <div className="pt-4">
                  <DepartureForm
                    tripId={id.data}
                    departureId={d.id}
                    defaults={{
                      startDate: d.start_date, endDate: d.end_date, capacity: String(d.capacity),
                      depositPerPersonRupees: String(d.deposit_per_person_paise / 100),
                      balanceDueDaysBefore: String(d.balance_due_days_before), bookingCutoffDays: String(d.booking_cutoff_days),
                      options: [...d.departure_price_options].sort((a, b) => a.sort_order - b.sort_order)
                        .map((o) => ({ id: o.id, label: o.label, priceRupees: String(o.price_paise / 100), isDefault: o.is_default })),
                    }}
                  />
                  {orgRole !== 'staff' && <div className="pt-2"><CloseDepartureButton tripId={id.data} departureId={d.id} /></div>}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader><CardTitle className="text-base">Add a departure</CardTitle></CardHeader>
        <CardContent>
          <DepartureForm
            tripId={id.data}
            defaults={{
              startDate: firstStart, endDate: addDays(firstStart, t.duration_days - 1), capacity: '20', depositPerPersonRupees: '0',
              balanceDueDaysBefore: '15', bookingCutoffDays: '2',
              options: [{ label: 'Triple sharing', priceRupees: '', isDefault: true }, { label: 'Double sharing', priceRupees: '', isDefault: false }],
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
