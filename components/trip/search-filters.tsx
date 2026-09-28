import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { TripSearch } from '@/lib/validation/search'

function nextMonths(n: number) {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1))
    return { value: d.toISOString().slice(0, 7), label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }) }
  })
}

/** Plain GET form: works without JS (in-app browsers, slow 4G) and gives shareable URLs. */
export function SearchFilters({ s }: { s: TripSearch }) {
  return (
    <form action="/trips" method="get" role="search" className="grid grid-cols-2 gap-2 sm:grid-cols-6">
      <Input name="q" defaultValue={s.q} placeholder="Where to? e.g. Spiti" aria-label="Search trips" className="col-span-2" />
      <NativeSelect name="month" defaultValue={s.month ?? ''} aria-label="Month">
        <NativeSelectOption value="">Any month</NativeSelectOption>
        {nextMonths(12).map((m) => <NativeSelectOption key={m.value} value={m.value}>{m.label}</NativeSelectOption>)}
      </NativeSelect>
      <NativeSelect name="days" defaultValue={s.days ?? ''} aria-label="Duration">
        <NativeSelectOption value="">Any length</NativeSelectOption>
        <NativeSelectOption value="1-2">1–2 days</NativeSelectOption>
        <NativeSelectOption value="3-4">3–4 days</NativeSelectOption>
        <NativeSelectOption value="5-7">5–7 days</NativeSelectOption>
        <NativeSelectOption value="8+">8+ days</NativeSelectOption>
      </NativeSelect>
      <NativeSelect name="max" defaultValue={s.max?.toString() ?? ''} aria-label="Budget">
        <NativeSelectOption value="">Any budget</NativeSelectOption>
        <NativeSelectOption value="5000">Under ₹5,000</NativeSelectOption>
        <NativeSelectOption value="10000">Under ₹10,000</NativeSelectOption>
        <NativeSelectOption value="20000">Under ₹20,000</NativeSelectOption>
        <NativeSelectOption value="40000">Under ₹40,000</NativeSelectOption>
      </NativeSelect>
      <Button type="submit">Search</Button>
    </form>
  )
}
