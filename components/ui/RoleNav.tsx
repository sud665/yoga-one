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
// their section. Derived from the items rather than passed in: one fewer
// prop is one fewer thing to get wrong at a call site.
//
// Picked by prefix relationship, not raw string length: instructor-nav.tsx's
// owner variant appends a `/admin` tab (QA sweep 2026-08-08, item 13), and
// '/admin' (6 chars) is shorter than '/instructor' (11 chars) -- a
// shortest-wins reduce would crown '/admin' root even though it shares no
// path with any other item here, which would flip '/instructor' from
// exact-only to prefix-matching and light up both "내 수업" and "프로필"
// simultaneously on /instructor/profile. Falls back to shortest-href when no
// item is a prefix of a sibling (no current nav is fully flat with no
// hierarchy, but this keeps the function total rather than possibly
// returning undefined).
function rootHrefOf(items: RoleNavItem[]): string {
  const hub = items.find((item) => items.some((sibling) => sibling !== item && sibling.href.startsWith(`${item.href}/`)))
  return hub?.href ?? items.reduce((shortest, item) => (item.href.length < shortest.length ? item.href : shortest), items[0].href)
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
      className="flex h-16 shrink-0 items-stretch border-t border-hairline bg-surface px-1 shadow-elev-2"
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
              'mx-0.5 my-1.5 flex flex-1 flex-col items-center justify-center gap-1 rounded-button px-2 text-utility-xs transition-colors',
              active(item.href) ? 'bg-brand-tint text-brand-deep' : 'text-muted'
            )}
          >
            <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.75} />
            {/* break-keep: see app/admin/admin-nav.tsx's identical comment --
                a narrow viewport could wrap a label mid-word since Korean
                line-breaking defaults to breaking anywhere (QA sweep
                2026-08-08, item 21). */}
            <span className="break-keep">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
