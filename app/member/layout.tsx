'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/member', label: '시간표' },
  { href: '/member/bookings', label: '내 예약' },
] as const

// DESIGN.md `app-nav`: canvas + hairline bottom border, 56px height,
// body-strong typography, active item in brand-deep text. Kept as a top nav (not
// converted to a sidebar) per this phase's brief -- /member and /instructor
// stay on their existing nav pattern, styling only.
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div data-role="member">
      <nav className="flex h-14 items-center gap-6 border-b border-hairline bg-canvas px-6">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex h-full items-center border-b-2 text-body-strong transition-colors ${
                isActive ? 'border-brand-deep text-brand-deep' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      {children}
    </div>
  )
}
