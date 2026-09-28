import { Check } from 'lucide-react'
import { Logo } from '@/components/brand/logo'

const POINTS = [
  ['Earn 8–15% on every booking', 'and a fixed fee for every qualified enquiry'],
  ['One link per reel', 'see exactly which post earns'],
  ['Paid on the 5th', 'every month, straight to your UPI'],
]

/** Split onboarding layout from the prototype: orange story panel ≥1024px, form column always. */
export default function JoinLayout({ children }: LayoutProps<'/creator/join'>) {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between gap-7 overflow-hidden bg-[linear-gradient(155deg,#FF5A1F,#C7340A_60%,#7A1E05)] p-10 text-white lg:flex">
        <Logo href="/" tag="Creator" inverted />
        <div className="flex flex-col gap-4">
          <h2 className="text-[38px] leading-[1.05] font-extrabold tracking-[-0.03em]">Your travel reels already sell trips. Get paid for it.</h2>
          <ul className="flex flex-col gap-2.5">
            {POINTS.map(([a, b]) => (
              <li key={a} className="flex items-start gap-3">
                <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-white/20"><Check className="size-4" aria-hidden /></span>
                <div><b>{a}</b><div className="text-sm text-white/85">{b}</div></div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/85">Instagram Creator or Business accounts with 1,000+ followers.</p>
      </aside>
      <main className="flex flex-col px-4 pt-5 pb-10 lg:justify-center lg:p-10">
        <div className="lg:hidden"><Logo href="/" tag="Creator" /></div>
        <div className="mx-auto mt-6 flex w-full max-w-[460px] flex-col gap-5 lg:mt-0">{children}</div>
      </main>
    </div>
  )
}
