import type { ReactNode } from 'react'
import type { ShellKind } from './nav-config'
import { MobileNav } from './mobile-nav'
import { SideNav, type ShellUser } from './side-nav'

/** Dashboard layout from the prototype: sidebar ≥1024px, top bar + drawer below. */
export function AppShell({ kind, user, actions, children }: { kind: ShellKind; user: ShellUser; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r bg-card lg:block">
        <SideNav kind={kind} user={user} />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2.5 border-b bg-white/90 px-2 backdrop-blur-md lg:px-7">
          <MobileNav kind={kind} user={user} />
          <span className="ml-auto flex items-center gap-2">{actions}</span>
        </header>
        <main className="mx-auto max-w-[1180px] px-4 pt-6 pb-20 md:px-7 md:pt-8">{children}</main>
      </div>
    </div>
  )
}

export function PageHeader({ title, description, eyebrow, actions }: { title: string; description?: ReactNode; eyebrow?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-1 text-sm font-semibold text-ink-3">{eyebrow}</p>}
        <h1 className="text-[26px] leading-tight font-extrabold md:text-[30px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[65ch] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
