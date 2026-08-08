-- ---------------------------------------------------------------------------
-- QA 전수검사(docs/qa-sweep-2026-08-08.md) 항목 1, 2에서 발견: book_session/
-- cancel_booking/mark_attendance는 역할·테넌트·정원·중복만 검사하고 실제
-- 회원권 상태(만료/일시정지/수강 클래스)나 세션 시각(과거/미래)은 전혀
-- 검증하지 않았다. 실증된 사례:
--   - 수강 클래스가 "빈야사·하타"뿐인 회원이 아쉬탕가를 예약할 수 있었음
--   - 이미 끝난 수업도 예약/취소 가능했고, 취소 시 대기자가 죽은 수업에
--     승격되는 부작용까지 있었음
--   - 강사가 이틀 뒤 수업의 출석을 즉시 확정할 수 있었음
--
-- book_session: 과거 세션 차단 + 회원권(만료/일시정지/수강 클래스) 검증을
-- capacity 계산 전에 추가한다.
-- cancel_booking: 과거 세션 차단을 추가한다 (perform 1 ... for update를
-- select * into ... for update로 바꿔 date를 읽을 수 있게 함).
-- mark_attendance: 세션 날짜가 오늘보다 미래면 차단한다.
--
-- 날짜 경계는 이 코드베이스 전체가 쓰는 관용구를 그대로 따른다: `current_date`
-- (서버/세션 타임존, 사실상 UTC)가 아니라 `(now() at time zone 'Asia/Seoul')::date`
-- -- 20260724100006_final_review_fixes.sql, 20260802000000_member_sessions_start_time.sql
-- 참고. 시각(time-of-day)까지는 보지 않고 날짜 단위로만 막는다 -- 기존
-- list_upcoming_sessions_for_member 등도 동일하게 date 단위 경계이므로, 같은
-- 세션이 화면에는 "다가오는 수업"으로 보이는데 예약은 막히는 불일치가 생기지
-- 않는다.
-- ---------------------------------------------------------------------------

create or replace function public.book_session(p_session_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.class_sessions;
  v_registration public.member_registrations;
  v_template public.class_templates;
  v_booked_count integer;
  v_status text;
  v_booking public.bookings;
  v_today date;
begin
  if public.current_role() is distinct from 'member' then
    raise exception 'only_members_can_book';
  end if;

  select * into v_session from public.class_sessions where id = p_session_id for update;
  if v_session.id is null then
    raise exception 'session_not_found';
  end if;
  if v_session.studio_id is distinct from public.current_studio_id() then
    raise exception 'not_permitted';
  end if;
  if v_session.status <> 'scheduled' then
    raise exception 'session_cancelled';
  end if;

  v_today := (now() at time zone 'Asia/Seoul')::date;
  if v_session.date < v_today then
    raise exception 'session_in_past';
  end if;

  -- 초대 링크로 직접 가입한 회원(회원 등록 마법사를 거치지 않은 경우)은
  -- member_registrations 행이 아예 없다 -- MemberDetailSheet가 이런 회원을
  -- 이미 "정보 없음"이라는 정상 상태로 표시하고 있고(components/roster/
  -- MemberDetailSheet.tsx), 초대 전용 가입은 이 앱의 정식으로 지원되는 가입
  -- 경로이므로(tests/e2e/member-booking.spec.ts 등) 등록이 없다는 이유만으로
  -- 예약 자체를 막지는 않는다 -- 검증할 플랜이 없으니 제한도 없는, 무제한
  -- 상태로 취급한다. 아래 세 검사는 registration이 실제로 존재할 때만 적용된다.
  select * into v_registration from public.member_registrations where profile_id = auth.uid();
  if v_registration.id is not null then
    if v_registration.paused_at is not null then
      raise exception 'membership_paused';
    end if;
    if (v_registration.start_date + (v_registration.term_months || ' months')::interval)::date < v_today then
      raise exception 'membership_expired';
    end if;

    -- classes가 빈 배열이면 "전체 클래스" 허용 -- 회원 등록 마법사에서 아무
    -- 클래스도 선택하지 않았을 때의 의미와 동일 (MemberDetailSheet의 "전체
    -- 클래스" 표시 참고).
    select * into v_template from public.class_templates where id = v_session.template_id;
    if array_length(v_registration.classes, 1) is not null and not (v_template.title = any(v_registration.classes)) then
      raise exception 'class_not_in_plan';
    end if;
  end if;

  if exists (
    select 1 from public.bookings
    where session_id = p_session_id and member_id = auth.uid() and status in ('booked', 'waitlisted')
  ) then
    raise exception 'already_booked';
  end if;

  select count(*) into v_booked_count from public.bookings where session_id = p_session_id and status = 'booked';

  if v_booked_count < v_session.capacity then
    v_status := 'booked';
  else
    v_status := 'waitlisted';
  end if;

  begin
    insert into public.bookings (session_id, member_id, status)
    values (p_session_id, auth.uid(), v_status)
    returning * into v_booking;
  exception
    when unique_violation then
      raise exception 'already_booked';
  end;

  return v_booking;
end;
$$;

revoke execute on function public.book_session(uuid) from public;
grant execute on function public.book_session(uuid) to authenticated;

create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_session public.class_sessions;
  v_promoted public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then
    raise exception 'booking_not_found';
  end if;
  if v_booking.member_id is distinct from auth.uid() then
    raise exception 'not_permitted';
  end if;
  if v_booking.status not in ('booked', 'waitlisted') then
    raise exception 'cannot_cancel';
  end if;

  -- Same parent-row lock as book_session, so a concurrent book_session call
  -- for this session blocks until this cancellation (and any waitlist
  -- promotion below) has committed. Now select * (not perform 1) so the
  -- session's date is available for the past-session check below.
  select * into v_session from public.class_sessions where id = v_booking.session_id for update;
  if v_session.date < (now() at time zone 'Asia/Seoul')::date then
    raise exception 'session_in_past';
  end if;

  update public.bookings set status = 'cancelled' where id = v_booking.id;

  if v_booking.status = 'booked' then
    select * into v_promoted from public.bookings
      where session_id = v_booking.session_id and status = 'waitlisted'
      order by created_at asc
      limit 1
      for update;

    if v_promoted.id is not null then
      update public.bookings set status = 'booked' where id = v_promoted.id;
    end if;
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  return v_booking;
end;
$$;

revoke execute on function public.cancel_booking(uuid) from public;
grant execute on function public.cancel_booking(uuid) to authenticated;

create or replace function public.mark_attendance(p_booking_id uuid, p_status text)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_session public.class_sessions;
begin
  -- `p_status is null or ...`, not a bare `not in` -- `p_status not in (...)`
  -- evaluates to NULL (not true) when p_status itself is NULL, and PL/pgSQL's
  -- `if <NULL> then` is false, silently bypassing this guard. Fixed once
  -- already in 20260724100006_final_review_fixes.sql; restated explicitly
  -- here (this migration's create-or-replace fully redefines the function
  -- body) so it isn't lost again.
  if p_status is null or p_status not in ('attended', 'no_show') then
    raise exception 'invalid_status';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking.id is null then
    raise exception 'booking_not_found';
  end if;

  select * into v_session from public.class_sessions where id = v_booking.session_id;
  if v_session.studio_id is distinct from public.current_studio_id() then
    raise exception 'not_permitted';
  end if;
  if v_session.instructor_id is distinct from auth.uid() and public.current_role() is distinct from 'owner' then
    raise exception 'not_permitted';
  end if;
  if v_booking.status <> 'booked' then
    raise exception 'booking_not_confirmed';
  end if;
  -- 아직 열리지 않은(미래) 수업의 출석은 확정할 수 없다 -- 실증된 버그: 강사
  -- 화면에서 이틀 뒤 수업도 출석 버튼이 눌려 즉시 attended로 저장됐음.
  if v_session.date > (now() at time zone 'Asia/Seoul')::date then
    raise exception 'session_not_started';
  end if;

  update public.bookings set status = p_status where id = p_booking_id returning * into v_booking;
  return v_booking;
end;
$$;

revoke execute on function public.mark_attendance(uuid, text) from public;
grant execute on function public.mark_attendance(uuid, text) to authenticated;
