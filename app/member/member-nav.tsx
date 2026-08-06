'use client'

import { CalendarDays, CircleUser, ClipboardList, LayoutDashboard, MessageCircle } from 'lucide-react'

import { RoleNav, type RoleNavItem } from '@/components/ui/RoleNav'

// A client module of its own, mirroring app/admin/admin-nav.tsx, rather than
// this array living in the layout. The items carry lucide components, and a
// component is a function -- a server layout handing them to the client
// RoleNav crosses the RSC boundary with an unserializable prop and the whole
// route dies at runtime with "Functions cannot be passed directly to Client
// Components". Defining them inside the client boundary sidesteps it.
//
// 대시보드 / 일정 / 내 예약 / 프로필. The first and last are new; 일정 is the
// screen that used to be /member itself, moved down a level so the root could
// become the dashboard.
//
// Icons are the admin sidebar's, reused by meaning rather than by role:
// LayoutDashboard is 대시보드 there too, CalendarDays is the schedule, and
// ClipboardList is bookings (예약현황 for an owner, 내 예약 here) -- the same
// glyph means the same kind of screen no matter who is signed in. CircleUser
// is new, and deliberately not UserRound, which the admin nav already spends
// on 강사관리: "a person" and "my account" are different ideas.
const MEMBER_NAV_ITEMS: RoleNavItem[] = [
  { href: '/member', label: '대시보드', icon: LayoutDashboard },
  { href: '/member/schedule', label: '일정', icon: CalendarDays },
  { href: '/member/bookings', label: '내 예약', icon: ClipboardList },
  { href: '/member/chat', label: '채팅', icon: MessageCircle },
  { href: '/member/profile', label: '프로필', icon: CircleUser },
]

export function MemberNav() {
  return <RoleNav label="회원 메뉴" items={MEMBER_NAV_ITEMS} />
}
