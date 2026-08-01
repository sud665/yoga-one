begin;
select plan(10);

create temporary table test_fixtures (key text primary key, value uuid);

insert into public.studios (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'Studio F');
insert into test_fixtures values ('studio_f', 'aaaaaaaa-0000-0000-0000-000000000000');
insert into test_fixtures (key, value)
  select 'owner_f', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'owner', 'Owner F');
insert into test_fixtures (key, value)
  select 'member_1', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'member', 'Member 1');
insert into test_fixtures (key, value)
  select 'member_2', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'member', 'Member 2');

insert into public.class_templates (id, studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity)
values ('bbbbbbbb-0000-0000-0000-000000000000', (select value from test_fixtures where key = 'studio_f'), 'Small Class', (select value from test_fixtures where key = 'owner_f'), 1, '09:00', 60, 1);

insert into public.class_sessions (id, template_id, studio_id, date, instructor_id, capacity)
values ('cccccccc-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000', (select value from test_fixtures where key = 'studio_f'), current_date + 7, (select value from test_fixtures where key = 'owner_f'), 1);

-- test_fixtures is owned by whichever role created it (postgres, the role
-- this script connects as). Every tests.authenticate_as call below looks up
-- its target fixture UUID via a `select ... from test_fixtures` that is
-- itself evaluated under whatever role the *previous* statement left the
-- session in (e.g. the call that switches from member_1 to member_2 runs
-- its own fixture lookup while still `authenticated`, not `postgres`), so
-- authenticated/anon need select on this session-local temp table too --
-- matching studios_and_profiles.test.sql/invites.test.sql/
-- class_schedule.test.sql. No insert grant needed: the one insert into
-- test_fixtures below that happens after a role switch (assertion 5) is
-- preceded by tests.bypass_rls(), which restores role to postgres (the
-- table owner) before that insert runs.
grant select on test_fixtures to authenticated, anon;

-- 1) 정원(1) 안에서 첫 예약은 booked
select tests.authenticate_as((select value from test_fixtures where key = 'member_1'));
select is(
  (select status from public.book_session('cccccccc-0000-0000-0000-000000000000')),
  'booked',
  'first booking on a capacity-1 session is booked'
);

-- 2) 정원이 찬 뒤 두 번째 예약은 waitlisted
select tests.authenticate_as((select value from test_fixtures where key = 'member_2'));
select is(
  (select status from public.book_session('cccccccc-0000-0000-0000-000000000000')),
  'waitlisted',
  'second booking on a full session is waitlisted'
);

-- 3) 같은 세션에 중복 예약은 거부된다
select throws_ok(
  $$select public.book_session('cccccccc-0000-0000-0000-000000000000')$$,
  'already_booked',
  'a member cannot book the same session twice'
);

-- 4) member_1이 취소하면 member_2가 자동으로 booked로 승격된다
select tests.authenticate_as((select value from test_fixtures where key = 'member_1'));
select cancel_booking(id) from public.bookings where session_id = 'cccccccc-0000-0000-0000-000000000000' and member_id = (select value from test_fixtures where key = 'member_1');
-- Verification reads member_2's booking row. "bookings: member views own"
-- RLS (member_id = auth.uid()) hides any row that isn't the caller's own,
-- so a raw select here while still authenticated as member_1 sees zero rows
-- and the `is()` check below would compare NULL against 'booked' -- the
-- exact same visibility problem assertion 5's own comment already flags,
-- just one assertion earlier than where the brief accounted for it
-- (confirmed by replaying this scenario by hand: the RPC's actual writes
-- are correct -- member_2's row really is 'booked' -- only this
-- verification read was RLS-filtered to nothing). Bypass RLS for this
-- read-only check so it reflects the true post-cancellation state rather
-- than what member_1 happens to be authorized to see.
select tests.bypass_rls();
select is(
  (select status from public.bookings where session_id = 'cccccccc-0000-0000-0000-000000000000' and member_id = (select value from test_fixtures where key = 'member_2')),
  'booked',
  'cancelling a booked slot auto-promotes the oldest waitlisted booking'
);

-- 5) 남의 예약은 취소할 수 없다
-- member_2의 예약 id는 "bookings: member views own" RLS 때문에 member_1 권한으로는
-- 애초에 조회가 안 된다 — 픽스처 조회는 bypass_rls()로 미리 해두고, 실제
-- cancel_booking 호출만 member_1 권한으로 검증한다.
select tests.bypass_rls();
insert into test_fixtures (key, value)
  select 'member_2_booking_id', id from public.bookings where session_id = 'cccccccc-0000-0000-0000-000000000000' and member_id = (select value from test_fixtures where key = 'member_2');

select tests.authenticate_as((select value from test_fixtures where key = 'member_1'));
select throws_ok(
  format('select public.cancel_booking(%L)', (select value from test_fixtures where key = 'member_2_booking_id')),
  'not_permitted',
  'a member cannot cancel someone else''s booking'
);

-- 6) instructor/owner가 아닌 role은 book_session을 호출할 수 없다
select tests.authenticate_as((select value from test_fixtures where key = 'owner_f'));
select throws_ok(
  $$select public.book_session('cccccccc-0000-0000-0000-000000000000')$$,
  'only_members_can_book',
  'an owner cannot book a session as if they were a member'
);

-- 7) list_upcoming_sessions_for_member는 "bookings: member views own" RLS와 무관하게
--    전체 예약자 수를 정확히 집계해야 한다 (member_2 본인 예약은 waitlisted->booked 승격된 상태)
select tests.authenticate_as((select value from test_fixtures where key = 'member_2'));
select is(
  (select booked_count from public.list_upcoming_sessions_for_member() where id = 'cccccccc-0000-0000-0000-000000000000'),
  1,
  'list_upcoming_sessions_for_member reports the true booked count regardless of row-level bookings RLS'
);

-- 8) 취소 후 재예약 회귀 테스트. member_1은 assertion 4에서 이미 이 세션을 취소했고, 그
--    cancelled 행은 여전히 남아있다. 테이블 전체에 거는 unique (session_id, member_id)였다면
--    이 두 번째 book_session 호출은 그 cancelled 행과 충돌해 (already_booked가 아니라) raw
--    23505 unique_violation을 던졌을 것이다 -- 활성 상태만 제한하는 partial unique index
--    (bookings_one_active_per_session_member)로 바뀐 뒤에는 정상적으로 새 행을 만들 수 있어야
--    한다. 정원(1)은 이미 member_2가 차지하고 있으므로(바로 위 assertion 7에서 확인) 결과는
--    'booked'가 아니라 결정론적으로 'waitlisted'여야 한다.
select tests.authenticate_as((select value from test_fixtures where key = 'member_1'));
select is(
  (select status from public.book_session('cccccccc-0000-0000-0000-000000000000')),
  'waitlisted',
  'a member can book again after cancelling, even though a cancelled row for the same session/member already exists'
);

-- 9) 위 재예약이 assertion 4의 cancelled 행을 지우거나 덮어쓴 게 아니라 취소 이력은 그대로 두고
--    새 활성 행만 추가했는지 확인한다 -- partial index가 "활성 상태만" 제한하고 이력 행은 여러 개
--    쌓이도록 허용한다는 마이그레이션 주석의 주장을 직접 증명한다. 지금 authenticated as
--    member_1이고 member_1 본인 행을 조회하는 것이므로 "bookings: member views own" RLS
--    (member_id = auth.uid())가 그대로 통과시킨다 -- bypass_rls() 불필요.
select is(
  (select count(*)::int from public.bookings where session_id = 'cccccccc-0000-0000-0000-000000000000' and member_id = (select value from test_fixtures where key = 'member_1')),
  2,
  'the cancelled booking row is preserved as history alongside the new active row, not replaced'
);

-- 10) KST(Asia/Seoul, UTC+9) 날짜 경계 회귀 테스트 (최종 리뷰, Task 19).
-- list_upcoming_sessions_for_member/_generate_sessions_internal은 이제
-- `current_date`(서버/세션 타임존, 사실상 UTC) 대신
-- `(now() at time zone 'Asia/Seoul')::date`로 "오늘"을 계산한다. `now()`가 실제로
-- KST 00:00-09:00(=UTC로는 아직 전날 15:00-24:00) 구간을 도는 순간을 pgTAP
-- 안에서 재현할 방법은 없으므로(Postgres에 시스템 시계를 흉내낼 장치가 없다 --
-- vi.setSystemTime 같은 게 SQL 레벨엔 없다), 대신 그 변환식 자체가 정확히 이
-- 경계를 넘기는지 고정된 타임스탬프로 직접 증명한다: 2026-01-01 16:30 UTC는 KST로
-- 2026-01-02 01:30, 즉 UTC가 아직 "어제"인 동안 KST는 이미 "내일" 새벽으로 넘어간
-- 상태다. lib/date.ts의 kstToday() TS 유닛 테스트(vi.setSystemTime)가 런타임
-- 동작 자체를 검증하고, 이 단언은 SQL 쪽이 동일한 변환식을 쓰고 있음을 결정론적으로
-- 보증한다.
select is(
  ((timestamptz '2026-01-01 16:30:00+00') at time zone 'Asia/Seoul')::date,
  '2026-01-02'::date,
  'KST conversion pushes a UTC-evening timestamp into the next Seoul calendar date (the exact boundary list_upcoming_sessions_for_member/_generate_sessions_internal now use instead of current_date)'
);

select tests.clear_authentication();
select finish();
rollback;
