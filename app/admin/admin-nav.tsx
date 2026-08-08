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
  Megaphone,
  MessageCircle,
  UserCog,
  UserRound,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'

import { cx } from '@/components/ui/utils'

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
  { href: '/admin/notices', label: '공지사항', icon: Megaphone },
]

// 프로필 could not simply become a sixth flat tab. The bar splits its width
// evenly, and at six tabs a 375px screen gives each 62.5px -- less than
// "시간표관리" needs at text-utility-xs once px-2 is taken off, and worse on
// a 360px Android. Grouping instead of shrinking keeps every tab above the
// 44px touch-target floor. Now the app's *only* nav (app screen, not a
// responsive website -- there is no wider desktop surface with room to just
// spread back out to six flat items), so this ceiling always applies.
//
// 내 정보 rather than a "더보기" junk drawer: both children are things about
// the signed-in person -- the classes they personally teach, and their own
// account -- which is a real category, not leftovers. 내 수업 sits one level
// deeper than before as a result; it auto-expands whenever it is the active
// route, and an owner who teaches is the minority case the route exists for
// at all (proxy.ts's owner-only second prefix).
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

// Bottom tab bar, always -- app screen, not a responsive website, so there
// is no separate wider-viewport sidebar variant anymore (that was this
// file's entire previous shape: DesktopSidebar + MobileTabBar, swapped via
// `hidden md:flex` / `md:hidden`). Its old sign-out button doesn't need a
// replacement here: 프로필 (a tab away, under 내 정보) already renders
// SignOutButton and always has -- ProfileScreen.tsx's own comment already
// calls that its one permanent home.
export function AdminNav() {
  const pathname = usePathname()
  // The open parent's id, not a boolean: there are two sheet-backed tabs,
  // and only one sheet may be up at a time.
  const [openSheetId, setOpenSheetId] = useState<string | null>(null)
  const [prevPathname, setPrevPathname] = useState(pathname)

  // Auto-close on any route change -- covers both "tapped a child link
  // inside the sheet" (which also closes explicitly via onClick, belt and
  // suspenders) and any other navigation (browser back, deep link) that
  // should never leave a stale sheet rendered open over the new page.
  // Adjust-during-render, not a useEffect: react-hooks' set-state-in-effect
  // rule flags setState-in-effect as an extra, avoidable render pass -- this
  // is exactly the case react.dev's "adjusting state when a prop changes"
  // guide documents, calling setState directly in the render body (React
  // discards and re-renders synchronously before commit, no flash) instead.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setOpenSheetId(null)
  }

  const openSheetItem = NAV_ITEMS.find((item) => isParent(item) && item.id === openSheetId)

  return (
    <>
      {/* shrink-0, not `fixed`: an ordinary flex-col sibling in the role
          layout (see app/admin/layout.tsx), the same "nav sits outside the
          scrolling region" arrangement app/member/layout.tsx and
          app/instructor/layout.tsx use, instead of overlaying content that
          then needs bottom padding to clear it. */}
      <nav aria-label="관리자 메뉴" className="flex h-16 shrink-0 items-stretch border-t border-hairline bg-surface px-1 shadow-elev-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
                  'mx-0.5 my-1.5 flex flex-1 flex-col items-center justify-center gap-1 rounded-button px-2 text-utility-xs transition-colors',
                  isChildActive ? 'bg-brand-tint text-brand-deep' : 'text-muted'
                )}
              >
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                <span className="inline-flex items-center gap-0.5">
                  {item.label}
                  {/* Self-critique fix: without this, 인력관리 looked
                      identical to the other 4 tabs before the first tap --
                      nothing signaled it opens a sheet instead of
                      navigating directly. A static up-chevron (the sheet
                      rises from the bottom) doubles as "expandable". */}
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
                'mx-0.5 my-1.5 flex flex-1 flex-col items-center justify-center gap-1 rounded-button px-2 text-utility-xs transition-colors',
                active ? 'bg-brand-tint text-brand-deep' : 'text-muted'
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
    // absolute, not fixed: covers the app-shell frame (app/layout.tsx,
    // position: relative) including this nav bar itself, not the true
    // browser viewport -- fixed would escape the frame on a wide desktop
    // window instead of staying within it.
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <button type="button" aria-label="메뉴 닫기" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.label}
        className="relative flex flex-col gap-3 rounded-t-card border-t border-hairline bg-surface shadow-elev-2 p-4 motion-safe:animate-[roster-sheet-in_180ms_ease-out]"
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
// lucide-react, re-exported under this file's own names. ScheduleIcon/
// InstructorIcon/MembersIcon/InviteIcon stay exported because
// app/admin/page.tsx's quick-action cards reuse them, so the nav and the
// dashboard keep reading as one system.
export {
  CalendarDays as ScheduleIcon,
  UserRound as InstructorIcon,
  UsersRound as MembersIcon,
  Mail as InviteIcon,
} from 'lucide-react'
