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
  if (error || !data) return { error: error ? mapBookingError(error.message) : '예약에 실패했습니다.' }
  // 'layout', not the default 'page' scope: a booking changes the schedule
  // (/member/schedule) *and* the dashboard's next-class card and counts
  // (/member), and the dashboard is a server component with nothing else to
  // refetch it. Same reason in cancelBooking below.
  revalidatePath('/member', 'layout')
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
  if (error) return { error: mapBookingError(error.message) }
  revalidatePath('/member', 'layout')
  return { success: true }
}

// book_session/cancel_booking raise a bare exception code (e.g.
// 'already_booked') as their SQLERRM -- supabase-js surfaces that verbatim as
// error.message, and until this mapping existed both call sites above just
// forwarded it straight into the page's role="alert" banner. Same pattern as
// mapAddParticipantError below, extended to cover the past-session and
// membership checks added in QA sweep 2026-08-08, item 1.
function mapBookingError(message: string): string {
  if (message.includes('already_booked')) return '이미 예약했거나 대기 중인 수업입니다.'
  if (message.includes('session_in_past')) return '이미 지난 수업입니다.'
  if (message.includes('session_cancelled')) return '취소된 수업입니다.'
  if (message.includes('session_not_found')) return '수업을 찾을 수 없습니다.'
  if (message.includes('membership_paused')) return '회원권이 일시정지 상태입니다. 원장님께 문의해주세요.'
  if (message.includes('membership_expired')) return '회원권이 만료되었습니다. 원장님께 문의해주세요.'
  if (message.includes('class_not_in_plan')) return '등록된 수강권에 포함되지 않은 클래스입니다.'
  if (message.includes('cannot_cancel')) return '취소할 수 없는 예약입니다.'
  if (message.includes('booking_not_found')) return '예약을 찾을 수 없습니다.'
  if (message.includes('not_permitted')) return '권한이 없습니다.'
  return message
}

// Owner or the session's own instructor adding someone to its roster
// directly -- exactly one of memberId/guestName, matching
// admin_add_participant's own invalid_participant guard. No `.single()`,
// same reasoning as bookSession above (admin_add_participant `returns
// public.bookings`, a single composite row -- postgrest-js already returns
// it unwrapped).
export async function adminAddParticipant(
  sessionId: string,
  participant: { memberId: string } | { guestName: string; guestPhone?: string }
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_add_participant', {
    p_session_id: sessionId,
    p_member_id: 'memberId' in participant ? participant.memberId : undefined,
    p_guest_name: 'guestName' in participant ? participant.guestName : undefined,
    p_guest_phone: 'guestName' in participant ? participant.guestPhone || undefined : undefined,
  })
  if (error) return { error: mapAddParticipantError(error.message) }
  // 'layout': this can be called from either /admin/bookings or /instructor,
  // and either way it changes what that session's roster looks like on both
  // screens (an instructor-added guest should show up if the owner is
  // looking at the same session, and vice versa) -- same broad-revalidate
  // reasoning as bookSession/cancelBooking above, just for both surfaces.
  revalidatePath('/admin/bookings', 'layout')
  revalidatePath('/instructor', 'layout')
  return { success: true }
}

function mapAddParticipantError(message: string): string {
  if (message.includes('already_booked')) return '이미 이 수업에 등록된 회원입니다.'
  if (message.includes('invalid_member')) return '이 요가원의 회원이 아닙니다.'
  if (message.includes('session_cancelled')) return '취소된 수업입니다.'
  if (message.includes('not_permitted')) return '이 수업에 참가자를 추가할 권한이 없습니다.'
  return message
}
