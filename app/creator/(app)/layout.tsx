import { Plus } from 'lucide-react'
import Link from 'next/link'
import { AppShell } from '@/components/shell/app-shell'
import { buttonVariants } from '@/components/ui/button'
import { requireActiveCreator } from '@/lib/creator/queries'

const compact = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)}K` : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}K` : String(n))

export default async function CreatorLayout({ children }: LayoutProps<'/creator'>) {
  const { creator, social } = await requireActiveCreator()
  return (
    <AppShell
      kind="creator"
      user={{
        name: creator.display_name,
        sub: `@${creator.handle}${social ? ` · ${compact(social.followers_count)}` : ''}`,
        initials: creator.display_name.slice(0, 1).toUpperCase(),
        color: 'var(--brand)',
        ring: true,
      }}
      actions={<Link href="/creator/trips" className={buttonVariants({ size: 'sm' })}><Plus />New link</Link>}
    >
      {children}
    </AppShell>
  )
}
