'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// class_sessions에 bookings를 직접 임베드하는 이 쿼리는 Task 12(lib/actions/bookings.ts)가
// list_upcoming_sessions_for_member RPC로 우회한 패턴과 겉보기엔 같은 모양(class_sessions +
// bookings 조인)이지만 정반대 이유로 여기서는 안전하다. Task 12는 "bookings: member views own"
// RLS(회원 본인 행만 select 허용, supabase/migrations/20260724100004_bookings.sql)가 select 자체를
// member_id = auth.uid()로 제한해서, 임베드 조회로 다른 회원의 예약 행을 세려 하면 항상 0~1건으로
// 틀리게 나왔다. 반면 여기서 적용되는 정책은 "bookings: instructor views own session bookings"
// (같은 마이그레이션, `exists (select 1 from class_sessions s where s.id = session_id and
// s.instructor_id = auth.uid())`)이고, 이 정책은 신원 제한이 아니라 "이 세션의 담당 강사"라는
// 세션 단위 권한이라서 자기 세션에 대해서는 그 세션의 예약자 전원이 그대로 보인다. 즉 담당 강사가
// 자기 세션의 모든 예약자를 직접 임베드 쿼리로 보는 것 자체가 이 RLS 정책이 의도한 정상 경로다.
// (RLS가 이미 "이 강사가 담당하는 세션"으로 결과를 좁혀주므로 아래 .eq('instructor_id', user.id)는
// 엄밀히는 중복이지만, 쿼리 의도를 명시적으로 드러내고 이중으로 방어하기 위해 그대로 유지한다.)
//
// 반환 타입은 명시적으로 선언하지 않는다 — lib/actions/bookings.ts의 listMyBookings()와 동일한
// 이유: 이 함수도 매핑 없이 Supabase 임베드 조회 결과를 그대로 반환하므로, 손으로 쓴 타입이
// postgrest-js의 실제 추론 타입과 미묘하게 어긋날 위험만 있고 얻는 게 없다. 호출부
// (app/instructor/page.tsx)는 listMyBookings의 소비자(app/member/bookings/page.tsx)와 동일하게
// `Awaited<ReturnType<typeof listMySessionsWithBookings>>`로 any 없이 타입을 그대로 재사용한다.
export async function listMySessionsWithBookings() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('class_sessions')
    .select(
      '*, template:class_templates(title, start_time), bookings(id, status, member_id, guest_name, member:profiles!bookings_member_id_fkey(full_name))'
    )
    .eq('instructor_id', user.id)
    .order('date')

  return data ?? []
}

// Explicit return-type annotation (established convention: lib/actions/invites.ts's
// createInvite/acceptInviteWithPassword, lib/actions/schedule.ts's createClassTemplate,
// lib/actions/bookings.ts's bookSession/cancelBooking) -- without it, `'error' in result`
// narrowing at any future call site doesn't reliably type-check under `next build`'s stricter
// pass. Applied here even though the current UI (matching the brief, and cancelBooking's own
// accepted precedent per Task 12's review) doesn't narrow on the result itself.
//
// No `.single()` chained onto the rpc() call: mark_attendance's generated SetofOptions
// (lib/database.types.ts) is `{ isOneToOne: true, isSetofReturn: false }` -- the identical shape
// to book_session/cancel_booking (Task 12), where chaining `.single()` onto an
// already-unwrapped single-object RPC result resolves the type to `never` under `next build`.
// Not re-proven here since the generated shape is identical and the brief's own code already
// omits `.single()`.
export async function markAttendance(
  bookingId: string,
  status: 'attended' | 'no_show'
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_attendance', { p_booking_id: bookingId, p_status: status })
  if (error) return { error: error.message }
  revalidatePath('/instructor')
  return { success: true }
}
