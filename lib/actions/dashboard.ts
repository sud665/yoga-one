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
      '*, template:class_templates(title, start_time), instructor:profiles!class_sessions_instructor_id_fkey(full_name), bookings(id, status, member:profiles!bookings_member_id_fkey(full_name))'
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

// Both counts rely entirely on RLS to scope to the caller's own studio, same pattern
// as listInstructors()/listProfilesByRole() elsewhere: "class_sessions: view same
// studio" for todaySessionCount, "bookings: owner views studio bookings" for
// waitlistedCount (studio-scoped via the session's studio_id, not member identity) --
// so no explicit `.eq('studio_id', ...)` filter is needed or added.
export async function getDashboardSummary() {
  const supabase = await createClient()
  const today = kstToday()

  const { count: todaySessionCount } = await supabase
    .from('class_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('date', today)

  const { count: waitlistedCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'waitlisted')

  return {
    todaySessionCount: todaySessionCount ?? 0,
    waitlistedCount: waitlistedCount ?? 0,
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
