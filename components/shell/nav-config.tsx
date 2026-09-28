import { ChartLine, Code, House, Inbox, Link as LinkIcon, Map, Receipt, Search, Store, Users, Wallet, type LucideIcon } from 'lucide-react'

export type ShellKind = 'creator' | 'operator'
export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean }

export const NAV: Record<ShellKind, { tag: string; home: string; items: NavItem[] }> = {
  creator: {
    tag: 'Creator',
    home: '/creator',
    items: [
      { href: '/creator', label: 'Home', icon: House, exact: true },
      { href: '/creator/trips', label: 'Find trips', icon: Search },
      { href: '/creator/links', label: 'My links', icon: LinkIcon },
      { href: '/creator/earnings', label: 'Earnings', icon: Wallet },
      { href: '/creator/storefront', label: 'My storefront', icon: Store },
    ],
  },
  operator: {
    tag: 'Operator',
    home: '/operator',
    items: [
      { href: '/operator', label: 'Performance', icon: ChartLine, exact: true },
      { href: '/operator/creators', label: 'Creators', icon: Users },
      { href: '/operator/leads', label: 'Leads', icon: Inbox },
      { href: '/operator/trips', label: 'Trips & commission', icon: Map },
      { href: '/operator/billing', label: 'Billing', icon: Receipt },
      { href: '/operator/integrations', label: 'Integrations', icon: Code },
    ],
  },
}
