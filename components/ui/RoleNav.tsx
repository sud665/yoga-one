'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

import { cx } from './utils'

// The nav for the roles whose screens are all flat siblings -- 회원 and 강사.
// Same two surfaces the admin nav uses (a bar at the top on md+, a fixed tab
// bar at the bottom on mobile), minus the sidebar and the expandable parent,
// because neither role has a second level to expand.
//
// It replaces the member's old top-only nav. That was the right call while
// 회원 had two screens; at four, a top nav on a phone puts every destination
// at the far end of the screen from the thumb, and the app already teaches
// bottom tabs on the admin side.
//
// Not merged with app/admin/admin-nav.tsx: that one carries a 240px sidebar,
// an accordion parent, and a bottom sheet, none of which any role here has.
// Sharing would mean a component whose props are mostly "off" at every call
// site.

export interface RoleNavItem {
  href: string
  label: string
  icon: LucideIcon
}

export interface RoleNavProps {
  /** Accessible name for both nav landmarks, e.g. '회원 메뉴'. */
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
    <>
      {/* Desktop/tablet: the same 56px top bar the member nav already had,
          now carrying icons so the two surfaces read as one nav rather than
          two designs. */}
      <nav
        aria-label={label}
        className="hidden h-14 items-center gap-6 border-b border-hairline bg-canvas px-6 md:flex"
      >
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? 'page' : undefined}
              className={cx(
                'flex h-full items-center gap-2 border-b-2 text-body-strong transition-colors',
                active(item.href)
                  ? 'border-brand-deep text-brand-deep'
                  : 'border-transparent text-muted hover:text-ink'
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Mobile: fixed bottom tab bar, matching the admin one exactly --
          h-16, hairline top border, a 2px brand-deep bar over the active
          tab, and env(safe-area-inset-bottom) so the labels clear an iPhone's
          home indicator when this runs as an installed PWA. */}
      <nav
        aria-label={label}
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-hairline bg-canvas px-1 md:hidden"
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
    </>
  )
}
