import Link from 'next/link'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4" aria-label="Main">
        <Link href="/" className="text-lg font-semibold tracking-tight">TripLink</Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/trips" className="hover:underline">Explore trips</Link>
          <Link href="/account/profile" className="hover:underline">Sign in</Link>
        </div>
      </nav>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} TripLink. Trips are sold and operated by the listed operator; TripLink is a marketplace.</p>
        <nav className="flex gap-4" aria-label="Footer">
          <Link href="/trips">Trips</Link>
          <Link href="/operator/onboarding">List your trips</Link>
        </nav>
      </div>
    </footer>
  )
}
