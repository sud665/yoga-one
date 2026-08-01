'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 브리핑의 문구/href 순서(대시보드-시간표관리-강사관리-회원관리-초대관리-예약현황)를
// 그대로 유지한다. 스타일은 브리핑의 무장식 <nav>/<Link> 대신 app/member/layout.tsx가
// 이미 확립한 관용구(NAV_ITEMS 배열 + usePathname 활성 상태 밑줄)를 그대로 따른다 --
// 두 레이아웃 다 같은 크롬(DESIGN.md의 app-nav: canvas 배경, 활성 항목 ink 2px 하단 밑줄)을
// 공유해야 하고, member 쪽이 이미 검증된 선례이기 때문.
const NAV_ITEMS = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/schedule', label: '시간표관리' },
  { href: '/admin/roster/instructors', label: '강사관리' },
  { href: '/admin/roster/members', label: '회원관리' },
  { href: '/admin/invites', label: '초대관리' },
  { href: '/admin/bookings', label: '예약현황' },
  // 원장이 직접 수업을 진행하는 소규모 요가원 지원 (DESIGN.md, middleware.ts의
  // allowedPathPrefixes) -- 원장이 세션의 instructor_id로 자신을 배정했다면
  // 이 링크로 출석 체크 화면(/instructor)에 도달할 수 있다. 강사/회원 nav에는
  // 해당 사항 없음 -- 이 레이아웃은 owner 전용이므로 항목을 role로 분기하지 않는다.
  { href: '/instructor', label: '내 수업' },
] as const

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div data-role="admin">
      <nav className="flex flex-wrap items-center gap-6 border-b border-zinc-200 bg-white px-6 py-4">
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
