'use client'

import { CircleUser, ClipboardCheck, LayoutDashboard, MessageCircle } from 'lucide-react'

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
  { href: '/instructor/chat', label: '채팅', icon: MessageCircle },
  { href: '/instructor/profile', label: '프로필', icon: CircleUser },
]

// An owner who also teaches (proxy.ts's owner-only second allowed prefix)
// reaches this same instructor shell -- but with only the three tabs above,
// they had no route back to /admin short of editing the URL by hand (QA
// sweep 2026-08-08, item 13). RoleNav's own width comment (admin-nav.tsx)
// puts the ceiling at six flat tabs before it needs grouping; four is well
// under that, so this is a plain fourth tab rather than another accordion.
const OWNER_INSTRUCTOR_NAV_ITEMS: RoleNavItem[] = [
  ...INSTRUCTOR_NAV_ITEMS,
  { href: '/admin', label: '관리자', icon: LayoutDashboard },
]

export function InstructorNav({ isOwner = false }: { isOwner?: boolean }) {
  return <RoleNav label="강사 메뉴" items={isOwner ? OWNER_INSTRUCTOR_NAV_ITEMS : INSTRUCTOR_NAV_ITEMS} />
}
