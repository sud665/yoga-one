'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  ChevronRight,
  CircleUser,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Mail,
  MessageCircle,
  UserCog,
  UserRound,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'

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
type IconComponent = LucideIcon

type NavLeaf = { href: string; label: string; icon: IconComponent }
/** `id` is the ASCII handle for aria-controls -- the label is Korean. */
type NavParent = { id: string; label: string; icon: IconComponent; children: NavLeaf[] }
type NavItem = NavLeaf | NavParent

function isParent(item: NavItem): item is NavParent {
  return 'children' in item
}

// Neither parent has a route of its own (both are pure grouping/toggle
// controls, not screens) -- the first child is the sensible landing spot if
// anything ever needs to link to a section as a whole, but nothing does today.
const ROSTER_CHILDREN: NavLeaf[] = [
  { href: '/admin/roster/instructors', label: '강사관리', icon: UserRound },
  { href: '/admin/roster/members', label: '회원관리', icon: UsersRound },
  { href: '/admin/invites', label: '초대관리', icon: Mail },
]

// 프로필 could not simply become a sixth flat tab. The mobile bar splits its
// width evenly, and at six tabs a 375px screen gives each 62.5px -- less than
// "시간표관리" needs at text-utility-xs once px-2 is taken off, and worse on a
// 360px Android. Grouping instead of shrinking keeps every tab above the 44px
// touch-target floor.
//
// 내 정보 rather than a "더보기" junk drawer: both children are things about
// the signed-in person -- the classes they personally teach, and their own
// account -- which is a real category, not leftovers. 내 수업 sits one level
// deeper than before as a result; it auto-expands whenever it is the active
// route, and an owner who teaches is the minority case the route exists for
// at all (middleware.ts's owner-only second prefix).
const MY_ACCOUNT_CHILDREN: NavLeaf[] = [
  { href: '/instructor', label: '내 수업', icon: ClipboardCheck },
  { href: '/admin/chat', label: '채팅', icon: MessageCircle },
  { href: '/admin/profile', label: '프로필', icon: CircleUser },
]

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/schedule', label: '시간표관리', icon: CalendarDays },
  { id: 'roster', label: '인력관리', icon: Users, children: ROSTER_CHILDREN },
  { href: '/admin/bookings', label: '예약현황', icon: ClipboardList },
  { id: 'my-account', label: '내 정보', icon: UserCog, children: MY_ACCOUNT_CHILDREN },
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
// (only the 인력관리 / 내 정보 parents expand/collapse). DESIGN.md
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
          <SidebarParent key={item.id} item={item} pathname={pathname} />
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
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.75} />
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
  const panelId = `admin-nav-${item.id}-panel`

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
        <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronRight aria-hidden="true" strokeWidth={1.75} className={cx('h-4 w-4 shrink-0 motion-safe:transition-transform motion-safe:duration-150', isOpen && 'rotate-90')} />
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
// 인력관리 and 내 정보 each open a sub-sheet listing their children rather
// than trying to cram a second nav level into the tab bar itself.
function MobileTabBar({ pathname }: { pathname: string }) {
  // The open parent's id, not a boolean: there are two sheet-backed tabs now,
  // and only one sheet may be up at a time.
  const [openSheetId, setOpenSheetId] = useState<string | null>(null)
  const [prevPathname, setPrevPathname] = useState(pathname)

  // Auto-close on any route change -- covers both "tapped a child link
  // inside the sheet" (which also closes explicitly via onClick, belt and
  // suspenders) and any other navigation (browser back, deep link) that
  // should never leave a stale sheet rendered open over the new page.
  // Adjust-during-render (see SidebarParent above for why, not a useEffect).
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setOpenSheetId(null)
  }

  const openSheetItem = NAV_ITEMS.find((item) => isParent(item) && item.id === openSheetId)

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
            const isChildActive = item.children.some((child) => isActiveHref(pathname, child.href))
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpenSheetId(item.id)}
                aria-haspopup="dialog"
                aria-expanded={openSheetId === item.id}
                className={cx(
                  'flex flex-1 flex-col items-center justify-center gap-1 border-t-2 px-2 text-utility-xs',
                  isChildActive ? 'border-brand-deep text-brand-deep' : 'border-transparent text-muted'
                )}
              >
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                <span className="inline-flex items-center gap-0.5">
                  {item.label}
                  {/* Self-critique fix: without this, 인력관리 looked
                      identical to the other 4 tabs before the first tap --
                      nothing signaled it opens a sheet instead of
                      navigating directly. A static up-chevron (the sheet
                      rises from the bottom) reuses the same glyph the
                      desktop accordion already uses for "expandable",
                      instead of inventing a second affordance language. */}
                  <ChevronRight aria-hidden="true" strokeWidth={2} className="h-2.5 w-2.5 -rotate-90" />
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
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {openSheetItem && isParent(openSheetItem) && (
        <NavSheet item={openSheetItem} pathname={pathname} onClose={() => setOpenSheetId(null)} />
      )}
    </>
  )
}

// Named RosterSheet while 인력관리 was the only parent; it renders whichever
// parent is open now. The `roster-sheet-in` keyframe it animates with keeps
// its original name in app/globals.css -- renaming a keyframe would touch the
// stylesheet for nothing.
function NavSheet({ item, pathname, onClose }: { item: NavParent; pathname: string; onClose: () => void }) {
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
            <X aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
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
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.75} />
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
// lucide-react, re-exported under this file's own names. The previous set
// was hand-rolled inline SVG -- fine at four icons, but it had grown to ten,
// each one a small drawing to review and keep visually consistent with the
// others. A library gives one hand for free, and lucide's thin geometric
// stroke is already what those hand-rolled glyphs were imitating.
//
// The aliases exist so call sites keep naming what an icon *means* here
// (BookingsIcon) rather than what it depicts (ClipboardList): swapping the
// underlying glyph later is then a one-line change in this block instead of
// a rename across every consumer.
//
// ScheduleIcon/InstructorIcon/MembersIcon/InviteIcon stay exported because
// app/admin/page.tsx's quick-action cards reuse them, so the sidebar and the
// dashboard keep reading as one system.
export {
  CalendarDays as ScheduleIcon,
  UserRound as InstructorIcon,
  UsersRound as MembersIcon,
  Mail as InviteIcon,
} from 'lucide-react'
