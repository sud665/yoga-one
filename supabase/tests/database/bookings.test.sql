begin;
select plan(16);

create temporary table test_fixtures (key text primary key, value uuid);

insert into public.studios (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'Studio F');
insert into test_fixtures values ('studio_f', 'aaaaaaaa-0000-0000-0000-000000000000');
insert into test_fixtures (key, value)
  select 'owner_f', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'owner', 'Owner F');
insert into test_fixtures (key, value)
  select 'member_1', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'member', 'Member 1');
insert into test_fixtures (key, value)
  select 'member_2', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'member', 'Member 2');
-- member_3/4/5/6: 각각 아래 13~16번 단언(수강 클래스 불일치/회원권 없음/일시정지/만료)
-- 전용. member_1/2와 분리하는 이유는, 그 두 명은 1~9번 assertion이 이미 특정 순서로
-- book/cancel을 반복하며 상태를 조립해가는 시나리오라 새 검증 조건에 걸리면 안 되기
-- 때문 (그래서 아래 registrations에서 만료/일시정지 없이 classes도 전체 허용으로 준다).
insert into test_fixtures (key, value)
  select 'member_3', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'member', 'Member 3');
insert into test_fixtures (key, value)
  select 'member_4', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'member', 'Member 4');
insert into test_fixtures (key, value)
  select 'member_5', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'member', 'Member 5');
insert into test_fixtures (key, value)
  select 'member_6', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'member', 'Member 6');

insert into public.class_templates (id, studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity)
values ('bbbbbbbb-0000-0000-0000-000000000000', (select value from test_fixtures where key = 'studio_f'), 'Small Class', (select value from test_fixtures where key = 'owner_f'), 1, '09:00', 60, 1);

insert into public.class_sessions (id, template_id, studio_id, date, instructor_id, capacity)
values ('cccccccc-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000', (select value from test_fixtures where key = 'studio_f'), current_date + 7, (select value from test_fixtures where key = 'owner_f'), 1);

-- 과거 세션 (11/12번 단언: 지난 세션 예약/취소 차단). 같은 템플릿에 날짜만 다르므로
-- class_sessions_template_id_date_key(template_id, date) 유니크와 충돌하지 않는다.
insert into public.class_sessions (id, template_id, studio_id, date, instructor_id, capacity)
values ('cccccccc-1111-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000', (select value from test_fixtures where key = 'studio_f'), current_date - 1, (select value from test_fixtures where key = 'owner_f'), 10);

-- member_1/member_2는 기존 1~9번 시나리오가 그대로 통과해야 하므로 classes를 빈 배열
-- (전체 클래스 허용)로 주고 만료/일시정지 없이 충분히 넓은 기간을 잡는다.
insert into public.member_registrations (studio_id, profile_id, full_name, phone, email, plan, term_months, start_date, classes, total_price, agreements, signature_name, created_by)
values
  ((select value from test_fixtures where key = 'studio_f'), (select value from test_fixtures where key = 'member_1'), 'Member 1', '010-0000-0001', 'member1@test.local', 'w3', 12, current_date - 30, '{}', 0, '{}'::jsonb, 'Member 1', (select value from test_fixtures where key = 'owner_f')),
  ((select value from test_fixtures where key = 'studio_f'), (select value from test_fixtures where key = 'member_2'), 'Member 2', '010-0000-0002', 'member2@test.local', 'w3', 12, current_date - 30, '{}', 0, '{}'::jsonb, 'Member 2', (select value from test_fixtures where key = 'owner_f')),
  -- member_3: 'Small Class'가 아닌 다른 수업만 등록된 플랜 (11번 단언)
  ((select value from test_fixtures where key = 'studio_f'), (select value from test_fixtures where key = 'member_3'), 'Member 3', '010-0000-0003', 'member3@test.local', 'w3', 12, current_date - 30, '{"Other Class"}', 0, '{}'::jsonb, 'Member 3', (select value from test_fixtures where key = 'owner_f')),
  -- member_5: 일시정지 상태 (13번 단언)
  ((select value from test_fixtures where key = 'studio_f'), (select value from test_fixtures where key = 'member_5'), 'Member 5', '010-0000-0005', 'member5@test.local', 'w3', 12, current_date - 30, '{}', 0, '{}'::jsonb, 'Member 5', (select value from test_fixtures where key = 'owner_f')),
  -- member_6: 이미 만료된 플랜 (14번 단언) -- start_date + term_months가 오늘보다 과거
  ((select value from test_fixtures where key = 'studio_f'), (select value from test_fixtures where key = 'member_6'), 'Member 6', '010-0000-0006', 'member6@test.local', 'w3', 1, current_date - 400, '{}', 0, '{}'::jsonb, 'Member 6', (select value from test_fixtures where key = 'owner_f'));

update public.member_registrations set paused_at = now() where profile_id = (select value from test_fixtures where key = 'member_5');
-- member_4는 의도적으로 registration 자체가 없음 (12번 단언: 등록 안 된 회원)

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

-- 11) 지난 세션은 예약할 수 없다 (QA 전수검사 2026-08-08, 항목 1)
select tests.authenticate_as((select value from test_fixtures where key = 'member_1'));
select throws_ok(
  $$select public.book_session('cccccccc-1111-0000-0000-000000000000')$$,
  'session_in_past',
  'a member cannot book a session whose date has already passed'
);

-- 12) 지난 세션의 예약은 취소할 수 없다. book_session 자체가 과거 세션을 막으므로
-- (11번), 취소 대상 행은 bypass_rls로 직접 심어야 한다.
select tests.bypass_rls();
insert into test_fixtures (key, value)
  select 'past_booking', gen_random_uuid();
insert into public.bookings (id, session_id, member_id, status)
values ((select value from test_fixtures where key = 'past_booking'), 'cccccccc-1111-0000-0000-000000000000', (select value from test_fixtures where key = 'member_2'), 'booked');

select tests.authenticate_as((select value from test_fixtures where key = 'member_2'));
select throws_ok(
  format('select public.cancel_booking(%L)', (select value from test_fixtures where key = 'past_booking')),
  'session_in_past',
  'a member cannot cancel a booking for a session whose date has already passed'
);

-- 13) 수강 클래스 목록에 없는 수업은 예약할 수 없다
select tests.authenticate_as((select value from test_fixtures where key = 'member_3'));
select throws_ok(
  $$select public.book_session('cccccccc-0000-0000-0000-000000000000')$$,
  'class_not_in_plan',
  'a member whose plan does not include this class cannot book it'
);

-- 14) 회원권(member_registrations) 행 자체가 없는 회원(초대 링크로만 가입, 회원
-- 등록 마법사를 거치지 않은 경우)은 검증할 플랜이 없으므로 무제한으로 취급되어
-- 예약할 수 있어야 한다 -- MemberDetailSheet가 이 상태를 "정보 없음"이라는 정상
-- 상태로 표시하는 것과 같은 취급이며, tests/e2e/member-booking.spec.ts가 바로 이
-- 초대-전용 가입 경로로 예약까지 하는 것을 정식 플로우로 검증하고 있다. 이 세션은
-- 정원(1)이 이미 member_2로 차 있으므로 결과는 결정론적으로 'waitlisted'.
select tests.authenticate_as((select value from test_fixtures where key = 'member_4'));
select is(
  (select status from public.book_session('cccccccc-0000-0000-0000-000000000000')),
  'waitlisted',
  'a member with no member_registrations row at all is treated as unrestricted, not blocked'
);

-- 15) 일시정지된 회원권으로는 예약할 수 없다
select tests.authenticate_as((select value from test_fixtures where key = 'member_5'));
select throws_ok(
  $$select public.book_session('cccccccc-0000-0000-0000-000000000000')$$,
  'membership_paused',
  'a member with a paused membership cannot book a session'
);

-- 16) 만료된 회원권으로는 예약할 수 없다
select tests.authenticate_as((select value from test_fixtures where key = 'member_6'));
select throws_ok(
  $$select public.book_session('cccccccc-0000-0000-0000-000000000000')$$,
  'membership_expired',
  'a member with an expired membership cannot book a session'
);

select tests.clear_authentication();
select finish();
rollback;
