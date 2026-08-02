-- ---------------------------------------------------------------------------
-- 모바일 앱의 회원 시간표 화면은 세션의 시작 시간을 함께 표시해야 한다.
-- class_sessions에는 start_time이 없고 (템플릿에만 존재), 이 화면의 유일한
-- 데이터 경로는 list_upcoming_sessions_for_member RPC이므로 (임베드 집계는
-- "bookings: member views own" RLS 때문에 금지 — 20260724100004 참고)
-- RPC 반환 테이블에 템플릿의 start_time을 추가한다.
--
-- 반환 타입 변경은 create or replace로 불가능해 drop 후 재생성한다.
-- drop 시 기존 grant가 함께 사라지므로 revoke/grant를 반드시 다시 건다
-- (SECURITY DEFINER는 생성 시 PUBLIC에 EXECUTE가 기본 부여됨 — CLAUDE.md 규칙).
-- ---------------------------------------------------------------------------

drop function public.list_upcoming_sessions_for_member();

create function public.list_upcoming_sessions_for_member()
returns table (
  id uuid,
  date date,
  start_time time,
  title text,
  instructor_name text,
  capacity integer,
  booked_count integer,
  my_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.date,
    ct.start_time,
    ct.title,
    p.full_name,
    s.capacity,
    (select count(*)::int from public.bookings b where b.session_id = s.id and b.status = 'booked'),
    (select b2.status from public.bookings b2 where b2.session_id = s.id and b2.member_id = auth.uid() and b2.status in ('booked', 'waitlisted') limit 1)
  from public.class_sessions s
  join public.class_templates ct on ct.id = s.template_id
  join public.profiles p on p.id = s.instructor_id
  where s.studio_id = public.current_studio_id()
    and s.status = 'scheduled'
    -- KST 경계 유지 (20260724100006과 동일한 이유 — UTC current_date는
    -- KST 새벽 9시간 동안 하루 어긋난다).
    and s.date >= (now() at time zone 'Asia/Seoul')::date
  order by s.date
$$;

revoke execute on function public.list_upcoming_sessions_for_member() from public;
grant execute on function public.list_upcoming_sessions_for_member() to authenticated;
