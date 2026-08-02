'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type MemberScheduleSession = {
  id: string
  date: string
  /** 'HH:MM'. Trimmed here so no consumer has to re-derive it. */
  startTime: string
  title: string
  instructorName: string
  capacity: number
  bookedCount: number
  isFull: boolean
  myStatus: string | null
}

// class_sessions에 bookings를 직접 임베드(select('*, bookings(*)'))하지 않는다 --
// "bookings: member views own" RLS 정책(Task 5)이 select 조건 자체를 member_id =
// auth.uid()로 제한하기 때문에, 그런 임베드 쿼리로 다른 회원의 예약 행을 세려 하면
// 항상 0~1건으로 틀리게 나온다 (본인 행만 보이므로). list_upcoming_sessions_for_member는
// SECURITY DEFINER로 신원은 감춘 채 집계값(booked_count)만 계산해 반환하도록 Task 5에서
// 만들어졌고, Task 5 자체 리뷰가 바로 이 라이브 버그를 잡아냈다 (CLAUDE.md 참고). 반드시
// 이 RPC를 통해서만 시간표+정원 현황을 조회한다.
export async function listUpcomingSessionsWithBookingState(): Promise<MemberScheduleSession[]> {
  const supabase = await createClient()
  const { data: sessions, error } = await supabase.rpc('list_upcoming_sessions_for_member')
  if (error || !sessions) return []

  return sessions.map((s) => ({
    id: s.id,
    date: s.date,
    // start_time lives on class_templates, not class_sessions, so it reaches
    // this screen only because migration 20260802000000 added it to the RPC's
    // return table -- and this RPC is the only permitted read path here (see
    // the comment above). Postgres `time` serializes as 'HH:MM:SS'; sliced
    // once at the data layer, same as listTemplatesWithUpcomingSessions does.
    startTime: s.start_time.slice(0, 5),
    title: s.title,
    instructorName: s.instructor_name,
    capacity: s.capacity,
    bookedCount: s.booked_count,
    isFull: s.booked_count >= s.capacity,
    myStatus: s.my_status,
  }))
}

// Explicit return-type annotation (established convention: lib/actions/invites.ts's
// createInvite/acceptInviteWithPassword, lib/actions/schedule.ts's createClassTemplate) --
// without it, `'error' in result` narrowing in the page component doesn't reliably
// type-check under `next build`'s stricter pass.
//
// No `.single()` here, deliberately deviating from the brief's literal
// `.rpc('book_session', {...}).single()` -- book_session's generated SetofOptions
// (lib/database.types.ts) is `{ isOneToOne: true, isSetofReturn: false }`, meaning
// postgrest-js already types (and PostgREST already returns) a single row object,
// not an array. `.single()`'s type signature unwraps an array type
// (`Result extends (infer R)[] ? R : never`) -- applied to an already-unwrapped
// object it resolves to `never`, and `next build`'s TypeScript pass fails with
// "Property 'status' does not exist on type 'never'" (confirmed by building with
// the literal brief code first). Runtime behavior is identical either way --
// verified directly against the local stack with and without `.single()`, same
// response body both times -- so this is a type-level-only fix. Matches
// tests/integration/booking-concurrency.test.ts's proven pattern (calls the same
// RPC, reads `.data.status` with no `.single()`) and this file's own
// `cancelBooking` below, which never chained `.single()` onto `cancel_booking`
// despite it having the identical SetofOptions shape.
export async function bookSession(sessionId: string): Promise<{ error: string } | { status: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('book_session', { p_session_id: sessionId })
  if (error || !data) return { error: error?.message ?? '예약에 실패했습니다.' }
  revalidatePath('/member')
  return { status: data.status }
}

export async function listMyBookings() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bookings')
    .select('*, session:class_sessions(date, template:class_templates(title))')
    .in('status', ['booked', 'waitlisted'])
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function cancelBooking(bookingId: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId })
  if (error) return { error: error.message }
  revalidatePath('/member/bookings')
  return { success: true }
}
