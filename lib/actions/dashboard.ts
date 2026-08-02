'use server'

import { createClient } from '@/lib/supabase/server'
import { kstToday } from '@/lib/date'

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
      '*, template:class_templates(title), instructor:profiles!class_sessions_instructor_id_fkey(full_name), bookings(id, status, member:profiles!bookings_member_id_fkey(full_name))'
    )
    .gte('date', kstToday())
    .order('date')

  return (data ?? []).map((s) => ({
    id: s.id,
    date: s.date,
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
