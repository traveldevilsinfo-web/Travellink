import { Camera, ChartLine, ChevronRight, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'
import { TripGrid } from '@/components/trip/trip-card'
import { Badge } from '@/components/ui/badge'
import { latestTrips } from '@/lib/public/queries'

export const revalidate = 3600

const SIDES = [
  { href: '/creator/join', title: "I'm a creator", body: 'Connect Instagram, pick trips, get affiliate links for your reels and earn on leads and bookings.', cta: 'Start as creator', icon: Camera, bg: 'bg-brand' },
  { href: '/operator', title: "I'm an operator", body: 'List trips, set commissions, and see which creators and reels bring you enquiries and bookings.', cta: 'Open operator dashboard', icon: ChartLine, bg: 'bg-ink' },
  { href: '/trips', title: "I'm travelling", body: 'Browse verified group trips across India with live seats and clear refund policies.', cta: 'Explore trips', icon: LinkIcon, bg: 'bg-teal' },
]
const STEPS = [
  ['Operator lists a trip', "Sets commission %, an optional fee per lead, and how it's booked."],
  ['Creator picks it', 'Instagram-verified, 1,000+ followers. Gets a link for each reel.'],
  ['Followers click', 'Land on the TripLink trip page. Every click, lead and booking is tracked.'],
  ['Everyone sees it', 'Operators see results per creator; creators see earnings with dates.'],
]

export default async function Home() {
  const trips = await latestTrips(4)
  return (
    <main className="mx-auto max-w-[1180px] px-4 pt-10 pb-16 md:px-6 md:pt-16">
      <section className="mb-8 flex max-w-[780px] flex-col gap-3">
        <Badge variant="brand">The travel affiliate platform</Badge>
        <h1 className="text-[clamp(32px,5vw,54px)] leading-[1.05] font-extrabold tracking-[-0.035em]">Creators share trips. Operators get bookings. Every click is tracked.</h1>
        <p className="text-lg text-ink-2">Like Wishlink, built for group travel in India.</p>
      </section>
      <section className="grid gap-3.5 md:grid-cols-3" aria-label="Choose how you use TripLink">
        {SIDES.map(({ href, title, body, cta, icon: Icon, bg }) => (
          <Link key={href} href={href} className="flex flex-col gap-3 rounded-[20px] border bg-card p-5.5 transition-shadow hover:border-transparent hover:shadow-[0_10px_30px_-12px_rgba(16,26,24,.2)]">
            <span className={`grid size-12 place-items-center rounded-[14px] text-white ${bg}`}><Icon className="size-6" aria-hidden /></span>
            <h2 className="text-[21px] font-bold">{title}</h2>
            <p className="flex-1 text-sm text-ink-2">{body}</p>
            <span className="inline-flex items-center gap-1 font-semibold text-brand-700">{cta}<ChevronRight className="size-4" aria-hidden /></span>
          </Link>
        ))}
      </section>
      <section className="mt-7 rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-lg font-bold">How the loop works</h2>
        <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="flex flex-col gap-1.5"><Badge variant="brand">Step {i + 1}</Badge><b>{t}</b><span className="text-sm text-ink-2">{d}</span></li>
          ))}
        </ol>
      </section>
      {trips.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-baseline justify-between"><h2 className="text-2xl font-extrabold">Trips creators are sharing</h2><Link href="/trips" className="text-sm font-semibold text-brand-700 hover:underline">See all</Link></div>
          <TripGrid trips={trips} priorityCount={2} />
        </section>
      )}
    </main>
  )
}
