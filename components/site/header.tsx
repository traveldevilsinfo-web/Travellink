import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
import { buttonVariants } from '@/components/ui/button'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-white/94 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-[1180px] items-center gap-4 px-4 md:px-6" aria-label="Main">
        <Logo />
        <div className="ml-auto flex items-center gap-1.5">
          <Link href="/trips" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'hidden sm:inline-flex' })}>Explore trips</Link>
          <Link href="/operator" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'hidden sm:inline-flex' })}>For operators</Link>
          <Link href="/creator/join" className={buttonVariants({ size: 'sm' })}>Join as creator</Link>
        </div>
      </nav>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="mx-auto grid max-w-[1180px] gap-6 px-4 py-8 text-sm text-ink-2 md:grid-cols-[2fr_1fr_1fr] md:px-6">
        <div className="flex flex-col gap-2"><Logo /><p className="max-w-[48ch]">Trips are sold and run by the listed operator. TripLink is the marketplace and tracks every creator referral.</p></div>
        <nav className="flex flex-col gap-1.5" aria-label="Product"><b className="text-xs tracking-wider text-ink-3 uppercase">Product</b><Link href="/creator/join">For creators</Link><Link href="/operator">For operators</Link><Link href="/trips">Explore trips</Link></nav>
        <nav className="flex flex-col gap-1.5" aria-label="Company"><b className="text-xs tracking-wider text-ink-3 uppercase">Company</b><span>Terms</span><span>Privacy</span><span>Grievance officer</span></nav>
      </div>
    </footer>
  )
}
