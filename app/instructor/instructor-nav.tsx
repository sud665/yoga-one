'use client'

import { CircleUser, ClipboardCheck } from 'lucide-react'

import { RoleNav, type RoleNavItem } from '@/components/ui/RoleNav'

// Client module for the same reason app/member/member-nav.tsx is one: the
// items carry lucide components, which cannot cross the RSC boundary as props
// from a server layout.
//
// Two screens now, so there is finally something to navigate between. The
// instructor shell carried no chrome at all while 내 수업 was the only
// screen -- the top bar it had before that existed solely to hold sign-out,
// which now lives inside 프로필.
//
// Same glyphs as the admin nav's 내 수업 (ClipboardCheck) and the member nav's
// 프로필 (CircleUser): an owner who teaches sees the identical attendance
// screen under the identical icon.
const INSTRUCTOR_NAV_ITEMS: RoleNavItem[] = [
  { href: '/instructor', label: '내 수업', icon: ClipboardCheck },
  { href: '/instructor/profile', label: '프로필', icon: CircleUser },
]

export function InstructorNav() {
  return <RoleNav label="강사 메뉴" items={INSTRUCTOR_NAV_ITEMS} />
}
