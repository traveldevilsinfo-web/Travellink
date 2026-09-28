'use client'

import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { ShellKind } from './nav-config'
import { SideNav, type ShellUser } from './side-nav'

/** Below 1024px the sidebar becomes a slide-in drawer. */
export function MobileNav({ kind, user }: { kind: ShellKind; user: ShellUser }) {
  const pathname = usePathname()
  // Remember which page the drawer was opened on; navigating elsewhere closes it without an effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null)
  const open = openedOn === pathname
  const setOpen = (v: boolean) => setOpenedOn(v ? pathname : null)
  const btn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const trigger = btn.current
    const close = () => setOpenedOn(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onResize = () => window.matchMedia('(min-width:1024px)').matches && close()
    addEventListener('keydown', onKey)
    addEventListener('resize', onResize)
    return () => { removeEventListener('keydown', onKey); removeEventListener('resize', onResize); trigger?.focus() }
  }, [open])

  return (
    <>
      <button ref={btn} className="grid size-11 place-items-center rounded-xl text-ink-2 hover:bg-subtle lg:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <Menu className="size-5" aria-hidden />
      </button>
      <div
        className={`fixed inset-0 z-40 bg-[rgba(10,20,18,.45)] transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(320px,86vw)] overflow-y-auto bg-card shadow-2xl transition-transform duration-250 lg:hidden ${open ? 'translate-x-0' : '-translate-x-[102%]'}`}
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="flex justify-end px-2.5 pt-2.5">
          <button className="grid size-11 place-items-center rounded-xl text-ink-2 hover:bg-subtle" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <SideNav kind={kind} user={user} onNavigate={() => setOpen(false)} />
      </aside>
    </>
  )
}
