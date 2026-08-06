'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

import { cx } from './utils'

// The nav for the roles whose screens are all flat siblings -- 회원 and 강사.
// App screen, not a responsive website: one bottom tab bar, always -- no
// separate desktop top-bar variant anymore. shrink-0 in the role layout's
// flex-col (not `fixed`/`position: sticky`), so it's an ordinary layout
// sibling that always sits at the bottom of the app-shell frame
// (app/layout.tsx) rather than an overlay main needs bottom padding to
// clear.
//
// Not merged with app/admin/admin-nav.tsx: that one still carries an
// accordion parent (인력관리/내 정보) and a bottom sheet, neither of which
// any role here has.

export interface RoleNavItem {
  href: string
  label: string
  icon: LucideIcon
}

export interface RoleNavProps {
  /** Accessible name for the nav landmark, e.g. '회원 메뉴'. */
  label: string
  items: RoleNavItem[]
}

// The role's own root ('/member', '/instructor') is a prefix of every other
// item in its list, so a prefix test would leave it permanently lit. Exact
// match for that one, prefix for the rest so nested routes still highlight
// their section. Derived from the items rather than passed in: the root is
// always the shortest href, and one fewer prop is one fewer thing to get
// wrong at a call site.
function rootHrefOf(items: RoleNavItem[]): string {
  return items.reduce((shortest, item) => (item.href.length < shortest.length ? item.href : shortest), items[0].href)
}

function isActiveHref(pathname: string, href: string, rootHref: string): boolean {
  if (href === rootHref) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function RoleNav({ label, items }: RoleNavProps) {
  const pathname = usePathname()
  const rootHref = rootHrefOf(items)
  const active = (href: string) => isActiveHref(pathname, href, rootHref)

  return (
    <nav
      aria-label={label}
      className="flex h-16 shrink-0 items-stretch border-t border-hairline bg-canvas px-1"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active(item.href) ? 'page' : undefined}
            className={cx(
              'flex flex-1 flex-col items-center justify-center gap-1 border-t-2 px-2 text-utility-xs',
              active(item.href) ? 'border-brand-deep text-brand-deep' : 'border-transparent text-muted'
            )}
          >
            <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.75} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
