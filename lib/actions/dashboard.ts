'use server'

import { createClient } from '@/lib/supabase/server'
import { kstToday } from '@/lib/date'
import { isWithin, periodRange } from '@/lib/period'

// No `: any` annotations on the map callback (deviating from the brief's literal
// `(s: any) => ...` / `(b: any) => ...`): supabase-js infers the select()'s row shape
// from lib/database.types.ts's generated Relationships metadata (the FK names below
// are validated against it), the same way lib/actions/schedule.ts's
// listTemplatesWithUpcomingSessions maps over `templates` and
// lib/actions/attendance.ts's listMySessionsWithBookings embeds bookings+member,
// both without any explicit `any`. This codebase has no explicit `any` anywhere else
// (grepped clean across lib/ and app/), so this keeps that established convention.
//
// RLS coverage for an owner caller: "class_sessions: view same studio" (studio-scoped)
// covers the outer select, "bookings: owner views studio bookings" (Task 5,
// supabase/migrations/20260724100004_bookings.sql) covers the embedded bookings --
// scoped by the session's studio_id, not by booking identity, so every booking for
// every member in the owner's studio is visible here, not just the owner's own rows.
// "profiles: view same studio" (Task 2, studio-scoped only, no role restriction)
// covers both the instructor and member embeds.
export async function listSessionsWithRoster() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('class_sessions')
    .select(
      '*, template:class_templates(title, start_time), instructor:profiles!class_sessions_instructor_id_fkey(full_name), bookings(id, status, member_id, guest_name, member:profiles!bookings_member_id_fkey(full_name))'
    )
    .gte('date', kstToday())
    .order('date')

  return (data ?? []).map((s) => ({
    id: s.id,
    date: s.date,
    // start_time lives on the template, not class_sessions. 'HH:MM:SS' -> 'HH:MM'
    // once here, same as every other action that returns a time.
    startTime: s.template?.start_time?.slice(0, 5) ?? null,
    title: s.template?.title,
    instructorName: s.instructor?.full_name,
    capacity: s.capacity,
    booked: s.bookings.filter((b) => b.status === 'booked'),
    waitlisted: s.bookings.filter((b) => b.status === 'waitlisted'),
  }))
}

export interface OwnerDashboardSession {
  id: string
  date: string
  /** 'HH:MM' */
  startTime: string | null
  title: string | null
  instructorName: string | null
  capacity: number
  bookedCount: number
  waitlistedCount: number
}

// getDashboardSummary의 후속. 숫자 두 개만 돌려주던 시절엔 대시보드가
// "오늘 수업 3건"이라고 말할 뿐 그 세 건이 무엇인지 보여줄 수 없었다 --
// 목록까지 돌려줘 대시보드가 예약 현황으로 가는 관리 진입점이 되게 한다.
// RLS 스코프는 listSessionsWithRoster와 동일("class_sessions: view same
// studio" + "bookings: owner views studio bookings")이라 명시적
// studio_id 필터는 여기서도 불필요하다. bookings 임베드는 status만 뽑아
// 명단(회원 이름)은 끌고 오지 않는다 -- 대시보드는 세지, 읽지 않는다.
export async function getOwnerDashboard() {
  const supabase = await createClient()
  const today = kstToday()

  const { data } = await supabase
    .from('class_sessions')
    .select(
      'id, date, capacity, template:class_templates(title, start_time), instructor:profiles!class_sessions_instructor_id_fkey(full_name), bookings(status)'
    )
    .gte('date', today)
    .order('date')

  const upcoming: OwnerDashboardSession[] = (data ?? [])
    .map((s) => ({
      id: s.id,
      date: s.date,
      startTime: s.template?.start_time?.slice(0, 5) ?? null,
      title: s.template?.title ?? null,
      instructorName: s.instructor?.full_name ?? null,
      capacity: s.capacity,
      bookedCount: s.bookings.filter((b) => b.status === 'booked').length,
      waitlistedCount: s.bookings.filter((b) => b.status === 'waitlisted').length,
    }))
    // 쿼리는 date만 정렬하므로 같은 날 세션은 시간순 타이브레이크가 필요
    // 하다 -- getMemberDashboard의 "다음 수업" 정렬과 같은 이유.
    .sort((a, b) =>
      a.date === b.date ? (a.startTime ?? '').localeCompare(b.startTime ?? '') : a.date.localeCompare(b.date)
    )

  const todaySessions = upcoming.filter((s) => s.date === today)
  const waitlistedSessions = upcoming.filter((s) => s.waitlistedCount > 0)

  return {
    todaySessions,
    /** 다가오는(오늘 포함) 세션 중 대기자가 있는 것만. */
    waitlistedSessions,
    todaySessionCount: todaySessions.length,
    // 다가오는 세션의 대기 합계. 이전 버전은 bookings 테이블 전체를 세서
    // 이미 지나간 세션의 대기 잔재까지 포함했다 -- 원장이 조치할 수 있는
    // 숫자만 세는 쪽으로 좁힌다.
    waitlistedCount: waitlistedSessions.reduce((n, s) => n + s.waitlistedCount, 0),
  }
}

export interface MemberDashboard {
  nextSession: {
    date: string
    /** 'HH:MM' */
    startTime: string
    title: string
    instructorName: string
    status: 'booked' | 'waitlisted'
  } | null
  /** Confirmed bookings falling inside the current Sunday-start week. */
  weekBookedCount: number
  /** Upcoming sessions where this member is on the waitlist, not yet promoted. */
  waitlistedCount: number
}

// Everything here comes out of the one RPC the member schedule already reads
// through, rather than a second set of queries against bookings. Two reasons:
// list_upcoming_sessions_for_member is the *only* permitted path to a
// member's session view (the "bookings: member views own" RLS policy makes a
// direct embed silently undercount -- see listUpcomingSessionsWithBookingState),
// and it already carries date, start_time, title, instructor and my_status,
// so the dashboard's three numbers are a reduce over data the app is
// entitled to rather than new surface area.
export async function getMemberDashboard(): Promise<MemberDashboard> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('list_upcoming_sessions_for_member')
  if (error || !data) {
    return { nextSession: null, weekBookedCount: 0, waitlistedCount: 0 }
  }

  const mine = data.filter((s) => s.my_status === 'booked' || s.my_status === 'waitlisted')

  // The RPC orders by date alone, so same-day sessions arrive in arbitrary
  // time order -- "다음 수업" has to break that tie on start_time or a 07:00
  // class can be announced as coming after the 19:00 one.
  const soonest = [...mine].sort((a, b) =>
    a.date === b.date ? a.start_time.localeCompare(b.start_time) : a.date.localeCompare(b.date)
  )[0]

  const thisWeek = periodRange(kstToday(), 'week')

  return {
    nextSession: soonest
      ? {
          date: soonest.date,
          startTime: soonest.start_time.slice(0, 5),
          title: soonest.title,
          instructorName: soonest.instructor_name,
          status: soonest.my_status === 'booked' ? 'booked' : 'waitlisted',
        }
      : null,
    weekBookedCount: mine.filter((s) => s.my_status === 'booked' && isWithin(s.date, thisWeek)).length,
    waitlistedCount: mine.filter((s) => s.my_status === 'waitlisted').length,
  }
}
