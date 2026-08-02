'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cx } from '@/components/ui/utils'
import { SignOutButton } from '@/components/ui/SignOutButton'

// DESIGN.md "2단 구조(신규)": 7 flat items -> 5 top-level items, with
// 강사관리/회원관리/초대관리 folded under a single "인력관리" parent. Every
// leaf's href/label stays byte-identical to the flat version this replaces
// (app/admin/admin-nav.tsx pre-restructure) -- grepped every one of
// 대시보드/시간표관리/강사관리/회원관리/초대관리/예약현황/내 수업 across
// tests/e2e/*.spec.ts before writing this file (see commit message): none of
// the 21 e2e tests click a nav link by name at all, every admin sub-page is
// reached via page.goto(), so the only real constraint from the existing
// suite is that these routes keep resolving and no page's own text/ul/li
// structure changes -- not click-path compatibility through the new
// accordion/sheet.
export type IconProps = { className?: string }
type IconComponent = (props: IconProps) => React.ReactElement

type NavLeaf = { href: string; label: string; icon: IconComponent }
type NavParent = { label: string; icon: IconComponent; children: NavLeaf[] }
type NavItem = NavLeaf | NavParent

function isParent(item: NavItem): item is NavParent {
  return 'children' in item
}

// 인력관리 has no route of its own (a pure grouping/toggle control, not a
// screen) -- its first child is the sensible landing spot if anything ever
// needs to link to the section as a whole, but nothing does today.
const ROSTER_CHILDREN: NavLeaf[] = [
  { href: '/admin/roster/instructors', label: '강사관리', icon: InstructorIcon },
  { href: '/admin/roster/members', label: '회원관리', icon: MembersIcon },
  { href: '/admin/invites', label: '초대관리', icon: InviteIcon },
]

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: '대시보드', icon: DashboardIcon },
  { href: '/admin/schedule', label: '시간표관리', icon: ScheduleIcon },
  { label: '인력관리', icon: RosterIcon, children: ROSTER_CHILDREN },
  { href: '/admin/bookings', label: '예약현황', icon: BookingsIcon },
  { href: '/instructor', label: '내 수업', icon: MyClassIcon },
]

function isActiveHref(pathname: string, href: string) {
  // '/admin' needs an exact match -- every other /admin/* route also
  // starts with '/admin', so a prefix check would keep "대시보드"
  // permanently highlighted. Every other entry uses a prefix check so
  // nested routes still highlight their section.
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminNav() {
  const pathname = usePathname()

  return (
    <>
      <DesktopSidebar pathname={pathname} />
      <MobileTabBar pathname={pathname} />
    </>
  )
}

// ---- Desktop/tablet (DESIGN.md: 768px+) --------------------------------
// Persistent 240px left sidebar, never collapsed/toggled at the top level
// (only the 인력관리 parent itself expands/collapses). DESIGN.md
// `admin-sidebar-item-active`: brand-tint background + 4px brand-deep left
// border + brand-deep text -- adapted here as border-l-4 + rounded-r-card (rounding only
// the right corners keeps the left accent reading as a flush vertical bar
// instead of tracing the card curve on both ends).
function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="관리자 메뉴"
      className="hidden shrink-0 flex-col gap-1 border-r border-hairline bg-canvas p-4 md:flex md:w-60"
    >
      {NAV_ITEMS.map((item) =>
        isParent(item) ? (
          <SidebarParent key={item.label} item={item} pathname={pathname} />
        ) : (
          <SidebarLeaf key={item.href} item={item} active={isActiveHref(pathname, item.href)} />
        )
      )}
      {/* Pushed to the bottom of the sidebar, away from the navigation items:
          signing out is an exit, not a destination. */}
      <SignOutButton className="mt-auto px-3 pt-4" />
    </nav>
  )
}

function SidebarLeaf({ item, active, indent = false }: { item: NavLeaf; active: boolean; indent?: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'flex items-center gap-3 rounded-r-card border-l-4 py-2.5 pr-3 transition-colors',
        // DESIGN.md: 하위메뉴 항목은 부모보다 한 단계 들여쓰기, body-md로
        // (부모/최상위 항목은 body-strong으로) 위계 차이를 표현.
        indent ? 'pl-8 text-body-md' : 'pl-3 text-body-strong',
        active ? 'border-brand-deep bg-brand-tint text-brand-deep' : 'border-transparent text-ink hover:bg-surface-soft'
      )}
    >
      <Icon />
      {item.label}
    </Link>
  )
}

// 인력관리: a toggle button, not a link (no route of its own). Auto-expands
// whenever the current route is one of its children -- computed as initial
// useState so a direct link / browser-back landing on e.g.
// /admin/roster/instructors renders already-expanded on first paint, no
// collapsed-then-springs-open flash. The "adjust state during render" block
// below additionally re-expands on every subsequent client-side navigation
// into a child route (e.g. clicking a dashboard quick-action card into
// /admin/invites while the sidebar was still collapsed) without ever
// auto-collapsing on its own -- collapsing is only ever a deliberate click.
// Deliberately not a useEffect: react-hooks' set-state-in-effect rule flags
// setState-in-effect as an extra, avoidable render pass -- this is exactly
// the case react.dev's "adjusting state when a prop changes" guide
// documents, calling setState directly in the render body (React discards
// and re-renders synchronously before commit, no flash) instead.
function SidebarParent({ item, pathname }: { item: NavParent; pathname: string }) {
  const isChildActive = item.children.some((child) => isActiveHref(pathname, child.href))
  const [isOpen, setIsOpen] = useState(isChildActive)
  const [prevChildActive, setPrevChildActive] = useState(isChildActive)

  if (isChildActive !== prevChildActive) {
    setPrevChildActive(isChildActive)
    if (isChildActive) setIsOpen(true)
  }

  const Icon = item.icon
  const panelId = 'admin-nav-roster-panel'

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={cx(
          'flex w-full items-center gap-3 rounded-r-card border-l-4 py-2.5 pl-3 pr-3 text-body-strong transition-colors',
          // Kept lit even while collapsed whenever a child route is active,
          // so collapsing the section manually while standing on e.g.
          // /admin/invites never leaves the sidebar with zero location cue.
          isChildActive ? 'border-brand-deep bg-brand-tint text-brand-deep' : 'border-transparent text-ink hover:bg-surface-soft'
        )}
      >
        <Icon />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronIcon className={cx('motion-safe:transition-transform motion-safe:duration-150', isOpen && 'rotate-90')} />
      </button>
      {isOpen && (
        <div id={panelId} className="mt-1 flex flex-col gap-1">
          {item.children.map((child) => (
            <SidebarLeaf key={child.href} item={child} active={isActiveHref(pathname, child.href)} indent />
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Mobile (<768px) ----------------------------------------------------
// Fixed bottom tab bar. Previously scrolled horizontally to fit 7 items
// under the 44px WCAG AAA touch-target floor -- 5 top-level items now fit a
// 375px screen at 75px/tab without shrinking under that floor, so the
// scroll-strip workaround (scrollbar-hide, overflow-x-auto, min-w-[4.5rem]
// shrink-0) is gone; every tab is an equal flex-1 share of the bar instead.
// 인력관리 opens a sub-sheet listing its 3 children rather than trying to
// cram a second nav level into the tab bar itself.
function MobileTabBar({ pathname }: { pathname: string }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [prevPathname, setPrevPathname] = useState(pathname)
  const rosterItem = NAV_ITEMS.find(isParent)

  // Auto-close on any route change -- covers both "tapped a child link
  // inside the sheet" (which also closes explicitly via onClick, belt and
  // suspenders) and any other navigation (browser back, deep link) that
  // should never leave a stale sheet rendered open over the new page.
  // Adjust-during-render (see SidebarParent above for why, not a useEffect).
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setSheetOpen(false)
  }

  if (!rosterItem) return null
  const isRosterActive = rosterItem.children.some((child) => isActiveHref(pathname, child.href))

  return (
    <>
      <nav
        aria-label="관리자 메뉴"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-hairline bg-canvas px-1 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map((item) => {
          if (isParent(item)) {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={sheetOpen}
                className={cx(
                  'flex flex-1 flex-col items-center justify-center gap-1 border-t-2 px-2 text-utility-xs',
                  isRosterActive ? 'border-brand-deep text-brand-deep' : 'border-transparent text-muted'
                )}
              >
                <Icon />
                <span className="inline-flex items-center gap-0.5">
                  {item.label}
                  {/* Self-critique fix: without this, 인력관리 looked
                      identical to the other 4 tabs before the first tap --
                      nothing signaled it opens a sheet instead of
                      navigating directly. A static up-chevron (the sheet
                      rises from the bottom) reuses the same glyph the
                      desktop accordion already uses for "expandable",
                      instead of inventing a second affordance language. */}
                  <ChevronIcon className="h-2.5 w-2.5 -rotate-90" />
                </span>
              </button>
            )
          }
          const active = isActiveHref(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'flex flex-1 flex-col items-center justify-center gap-1 border-t-2 px-2 text-utility-xs',
                active ? 'border-brand-deep text-brand-deep' : 'border-transparent text-muted'
              )}
            >
              <Icon />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {sheetOpen && (
        <RosterSheet item={rosterItem} pathname={pathname} onClose={() => setSheetOpen(false)} />
      )}
    </>
  )
}

function RosterSheet({ item, pathname, onClose }: { item: NavParent; pathname: string; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
      <button type="button" aria-label="메뉴 닫기" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.label}
        className="relative flex flex-col gap-3 rounded-t-card border-t border-hairline bg-canvas p-4 motion-safe:animate-[roster-sheet-in_180ms_ease-out]"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between px-1">
          <p className="text-label text-muted">{item.label}</p>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-muted hover:bg-surface-soft hover:text-ink">
            <span className="sr-only">닫기</span>
            <CloseIcon />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {item.children.map((child) => {
            const active = isActiveHref(pathname, child.href)
            const Icon = child.icon
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex items-center gap-3 rounded-input px-3 py-3 text-body-strong transition-colors',
                  active ? 'bg-brand-tint text-brand-deep' : 'text-ink hover:bg-surface-soft'
                )}
              >
                <Icon />
                {child.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---- Icons -------------------------------------------------------------
// Hand-rolled inline SVGs: minimal line style, 20px, stroke=currentColor so
// active/inactive color state flows through automatically. aria-hidden on
// every icon -- the Link/button's own text label carries the accessible
// name, exactly once.
// ScheduleIcon/InstructorIcon/MembersIcon/InviteIcon stay exported: reused
// verbatim by app/admin/page.tsx's quick-action cards so the sidebar and
// dashboard keep reading as one system.

function iconProps(className?: string) {
  return {
    'aria-hidden': true as const,
    focusable: false as const,
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  }
}

function DashboardIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function ScheduleIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="3" y="5" width="18" height="15.5" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  )
}

// 인력관리's own parent icon -- a briefcase, distinct from its children's
// people-silhouette glyphs (InstructorIcon/MembersIcon below) so the parent
// row doesn't read as a redundant copy of one of its own children.
function RosterIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="3" y="8" width="18" height="11.5" rx="2" />
      <path d="M8.5 8V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" />
      <path d="M3 13.5h18" />
      <path d="M10.5 13.5v1.5h3v-1.5" />
    </svg>
  )
}

export function InstructorIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
    </svg>
  )
}

export function MembersIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="8.5" cy="7.5" r="3" />
      <path d="M2.5 20c0-3.31 2.69-6 6-6s6 2.69 6 6" />
      <circle cx="17" cy="8" r="2.3" />
      <path d="M13.8 20c.35-2.9 2.15-5 4.8-5 .6 0 1.16.09 1.7.26" />
    </svg>
  )
}

export function InviteIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </svg>
  )
}

function BookingsIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 3.25h6a1 1 0 011 1V6H8V4.25a1 1 0 011-1z" />
      <path d="M8.5 11h7" />
      <path d="M8.5 14.5h7" />
      <path d="M8.5 18h4.5" />
    </svg>
  )
}

// A simple seated/cross-legged figure -- the one deliberately yoga-specific
// glyph in this set, standing in for the owner's own "내 수업" entry.
function MyClassIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M12 6.5v3.5" />
      <path d="M6.5 18c0-2.7 1.3-4.9 3.3-6" />
      <path d="M17.5 18c0-2.7-1.3-4.9-3.3-6" />
      <path d="M6.5 18h11" />
      <path d="M9.3 10l-2.3 2.7" />
      <path d="M14.7 10l2.3 2.7" />
    </svg>
  )
}

function ChevronIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

function CloseIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
