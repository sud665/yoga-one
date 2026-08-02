'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cx } from '@/components/ui/utils'

// Exact visible text of every link is unchanged from the previous top-nav
// (app/admin/layout.tsx's old NAV_ITEMS) -- many existing Playwright specs
// depend on these exact strings via getByRole('link', {name: ...}) or rely
// on them NOT colliding with other queries (see e.g. schedule-management.spec.ts,
// invite-issue.spec.ts). Only the layout moves; the label set, hrefs, and
// the "내 수업" owner-as-instructor entry are all preserved verbatim.
const NAV_ITEMS = [
  { href: '/admin', label: '대시보드', icon: DashboardIcon },
  { href: '/admin/schedule', label: '시간표관리', icon: ScheduleIcon },
  { href: '/admin/roster/instructors', label: '강사관리', icon: InstructorIcon },
  { href: '/admin/roster/members', label: '회원관리', icon: MembersIcon },
  { href: '/admin/invites', label: '초대관리', icon: InviteIcon },
  { href: '/admin/bookings', label: '예약현황', icon: BookingsIcon },
  { href: '/instructor', label: '내 수업', icon: MyClassIcon },
] as const

function isActiveHref(pathname: string, href: string) {
  // '/admin' needs an exact match -- every other /admin/* route also
  // starts with '/admin', so a prefix check would keep "대시보드"
  // permanently highlighted. Every other entry (including '/instructor',
  // which sits outside /admin) uses a prefix check so nested routes still
  // highlight their section.
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

// Shared link styling logic for both the sidebar and bottom-tab renderings
// below -- Adjustment #2: active state uses the info accent (not ink),
// adapted from DESIGN.md's top-nav "2px ink underline" spec into a
// left-border for the sidebar and a top-border for the bottom-tab bar
// (positioned adjacent to where each nav surface actually sits). A
// transparent border of the same width is kept on inactive items so
// nothing shifts by a pixel when the active item changes.
export function AdminNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop/tablet (DESIGN.md: 768px+): persistent left sidebar, never
          collapsed/toggled per this phase's brief. */}
      <nav
        aria-label="관리자 메뉴"
        className="hidden shrink-0 flex-col gap-1 border-r border-hairline bg-canvas p-4 md:flex md:w-60"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActiveHref(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cx(
                // rounded-r-card (not rounded-card): the left edge stays
                // square so the 4px accent border reads as a flush vertical
                // bar. Rounding all four corners made the border trace the
                // top-left/bottom-left curve too, which looked like a
                // bracket "(" instead of a clean left-rail indicator.
                'flex items-center gap-3 rounded-r-card border-l-4 py-2.5 pl-3 pr-3 text-body-strong transition-colors',
                active
                  ? 'border-info bg-info/[0.06] text-info'
                  : 'border-transparent text-ink hover:bg-soft-cloud'
              )}
            >
              <Icon />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Mobile (<768px): fixed bottom tab bar. DESIGN.md's Responsive
          Behavior table specifies bottom tab navigation as this app's
          mobile nav pattern (no role currently implements a responsive
          collapse at all -- member/instructor's top nav is static at
          every width) -- this is that pattern, not a third one, applied to
          admin first. Horizontally scrollable: 7 items can't fit a 375px
          screen without shrinking under the 44px WCAG AAA touch-target
          floor, so the strip scrolls (scrollbar hidden, still fully
          reachable by touch/trackpad/keyboard) instead of cramming. */}
      <nav
        aria-label="관리자 메뉴"
        className="scrollbar-hide fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch gap-1 overflow-x-auto border-t border-hairline bg-canvas px-2 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActiveHref(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'flex min-w-[4.5rem] shrink-0 flex-col items-center justify-center gap-1 border-t-2 px-2 text-utility-xs',
                active ? 'border-info text-info' : 'border-transparent text-mute'
              )}
            >
              <Icon />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

// ---- Icons -------------------------------------------------------------
// Hand-rolled inline SVGs (no icon-library dependency added for this pass):
// minimal line style, 20px, stroke=currentColor so active/inactive color
// state (info/ink/mute) flows through automatically. aria-hidden on every
// icon -- the Link's own text label carries the accessible name, exactly
// once, so getByRole('link', {name}) queries keep matching the same
// strings they always have.
// Exported for app/admin/page.tsx's quick-action cards, which intentionally
// reuse this exact icon language (not a redrawn/approximate set) so the
// sidebar and dashboard read as the same system rather than two admins
// that happen to share a color palette.
export type IconProps = { className?: string }

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
// glyph in this set (the other six are conventional admin-app icons),
// standing in for the owner's own "내 수업" (my class) entry.
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
