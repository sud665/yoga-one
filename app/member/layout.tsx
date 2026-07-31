'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/member', label: '시간표' },
  { href: '/member/bookings', label: '내 예약' },
] as const

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div data-role="member">
      <nav className="flex items-center gap-6 border-b border-zinc-200 bg-white px-6 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`pb-1 text-sm font-medium ${
                isActive ? 'border-b-2 border-black text-black' : 'text-zinc-500 hover:text-black'
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
