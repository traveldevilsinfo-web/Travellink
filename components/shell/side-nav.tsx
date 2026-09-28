'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/brand/logo'
import { NAV, type ShellKind } from './nav-config'

export type ShellUser = { name: string; sub: string; initials: string; color: string; ring?: boolean }

export function SideNav({ kind, user, onNavigate }: { kind: ShellKind; user: ShellUser; onNavigate?: () => void }) {
  const pathname = usePathname()
  const nav = NAV[kind]
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`))

  return (
    <div className="flex h-full flex-col gap-0.5 px-3.5 py-5">
      <div className="px-2.5 pb-5">
        <Logo href={nav.home} tag={nav.tag} />
      </div>
      <nav aria-label={`${nav.tag} navigation`} className="flex flex-col gap-0.5">
        {nav.items.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className="flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] font-semibold text-ink-2 transition-colors hover:bg-subtle hover:text-ink aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-700"
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto flex items-center gap-2.5 rounded-xl border bg-card p-3">
        <Avatar initials={user.initials} color={user.color} ring={user.ring} />
        <div className="min-w-0">
          <b className="block truncate text-sm">{user.name}</b>
          <span className="block truncate text-xs text-ink-2">{user.sub}</span>
        </div>
      </div>
    </div>
  )
}

export function Avatar({ initials, color, ring, size = 36 }: { initials: string; color: string; ring?: boolean; size?: number }) {
  const inner = (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.38), border: ring ? '2.5px solid #fff' : undefined }}
    >
      {initials}
    </span>
  )
  return ring ? <span className="inline-grid shrink-0 rounded-full bg-[conic-gradient(#F58529,#DD2A7B,#8134AF,#F58529)] p-[2.5px]">{inner}</span> : inner
}
