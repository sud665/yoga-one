begin;
select plan(8);

create temporary table test_fixtures (key text primary key, value uuid);

insert into public.studios (id, name) values ('77777777-7777-7777-7777-777777777777', 'Studio D');
insert into test_fixtures values ('studio_d', '77777777-7777-7777-7777-777777777777');
insert into test_fixtures (key, value)
  select 'owner_d', tests.create_test_profile((select value from test_fixtures where key = 'studio_d'), 'owner', 'Owner D');
insert into test_fixtures (key, value)
  select 'instructor_d', tests.create_test_profile((select value from test_fixtures where key = 'studio_d'), 'instructor', 'Instructor D');
insert into public.studios (id, name) values ('88888888-8888-8888-8888-888888888888', 'Studio E');
insert into test_fixtures values ('studio_e', '88888888-8888-8888-8888-888888888888');
insert into test_fixtures (key, value)
  select 'instructor_e', tests.create_test_profile((select value from test_fixtures where key = 'studio_e'), 'instructor', 'Instructor E');

-- Fixtures for assertions 7-8 below (cron batch error-isolation regression):
-- two more studios, each with its own owner + instructor, so the two
-- templates used there live in genuinely different tenants. Created up
-- front alongside studio_d/e for the same reason those are:
-- tests.create_test_profile is `security definer` with its PUBLIC execute
-- revoked, so it's only callable while this session is still `postgres` --
-- i.e. before the first tests.authenticate_as call below switches role away
-- from it.
insert into public.studios (id, name) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Studio F');
insert into test_fixtures values ('studio_f', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
insert into test_fixtures (key, value)
  select 'owner_f', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'owner', 'Owner F');
insert into test_fixtures (key, value)
  select 'instructor_f', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'instructor', 'Instructor F');
insert into public.studios (id, name) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Studio G');
insert into test_fixtures values ('studio_g', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
insert into test_fixtures (key, value)
  select 'owner_g', tests.create_test_profile((select value from test_fixtures where key = 'studio_g'), 'owner', 'Owner G');
insert into test_fixtures (key, value)
  select 'instructor_g', tests.create_test_profile((select value from test_fixtures where key = 'studio_g'), 'instructor', 'Instructor G');

-- test_fixtures is owned by whichever role created it (postgres, the role
-- this script connects as). All assertions below look up fixture UUIDs
-- (studio_d/owner_d/instructor_d/instructor_e/studio_f/owner_f/
-- instructor_f/studio_g/owner_g/instructor_g) via SELECT after
-- tests.authenticate_as has switched the session role away from postgres,
-- so authenticated/anon need select on this session-local temp table too --
-- matching the same pattern as studios_and_profiles.test.sql/
-- invites.test.sql (no insert grant needed here: unlike Task 3/6's fixture
-- bug, this file never inserts into test_fixtures after the role switch).
grant select on test_fixtures to authenticated, anon;

select tests.authenticate_as((select value from test_fixtures where key = 'owner_d'));

-- 1) owner가 자기 스튜디오 강사로 템플릿을 만들 수 있다 (월요일 09:00)
insert into public.class_templates (id, studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity)
values ('99999999-9999-9999-9999-999999999999', (select value from test_fixtures where key = 'studio_d'), 'Hatha Yoga', (select value from test_fixtures where key = 'instructor_d'), 1, '09:00', 60, 10);
select pass('owner can create a class template with an in-studio instructor');

-- 2) 다른 스튜디오 강사를 지정하면 거부된다
select throws_ok(
  format(
    'insert into public.class_templates (studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity) values (%L, %L, %L, %L, %L, %L, %L)',
    (select value from test_fixtures where key = 'studio_d'), 'Bad Template', (select value from test_fixtures where key = 'instructor_e'), 2, '09:00', 60, 10
  ),
  'instructor_must_belong_to_same_studio',
  'cannot assign an instructor from another studio'
);

-- 3) 세션 생성 RPC가 8주치를 만든다
select is(
  (select count(*)::int from public.generate_sessions_for_template('99999999-9999-9999-9999-999999999999', 8)),
  8,
  'generate_sessions_for_template creates 8 upcoming sessions'
);

-- 4) 다시 호출해도 중복 생성되지 않는다
-- Note: `perform` is a PL/pgSQL-only statement and is a syntax error as a
-- bare top-level statement in a plain .sql script (psql has no idea what
-- PERFORM means outside a function/DO body) -- wrapped in an anonymous DO
-- block so the call site still discards the return value exactly as the
-- brief intended, just inside a context where PERFORM is legal.
do $$
begin
  perform public.generate_sessions_for_template('99999999-9999-9999-9999-999999999999', 8);
end $$;
select is(
  (select count(*)::int from public.class_sessions where template_id = '99999999-9999-9999-9999-999999999999'),
  8,
  'calling generate_sessions_for_template again does not duplicate sessions'
);

-- 5) owner가 아니면 세션 생성 RPC를 호출할 수 없다
select tests.authenticate_as((select value from test_fixtures where key = 'instructor_d'));
select throws_ok(
  $$select public.generate_sessions_for_template('99999999-9999-9999-9999-999999999999', 8)$$,
  'not_permitted',
  'non-owner cannot trigger session generation'
);

-- 6) 오프바이원 회귀 테스트: 템플릿의 day_of_week가 "오늘" 요일과 정확히
--    일치해도 generate_sessions_for_template(p_weeks_ahead)는 정확히
--    p_weeks_ahead개의 세션만 만든다.
-- Regression for the reviewed off-by-one bug: the old
-- _generate_sessions_internal computed `v_end_date := current_date +
-- (p_weeks_ahead * 7)` and looped `while v_date <= v_end_date`. Whenever
-- today already matched the template's day_of_week, the alignment loop
-- above left v_date at current_date instead of advancing it, so both the
-- first iteration (today) and the last (today + p_weeks_ahead*7, which
-- equals v_end_date and also satisfies `<=`) landed inside the range --
-- producing p_weeks_ahead + 1 sessions instead of p_weeks_ahead. The fixed
-- version replaced the date-range loop with a counted
-- `for i in 0..(p_weeks_ahead - 1)` loop, which always runs exactly
-- p_weeks_ahead times regardless of the starting offset. day_of_week is
-- computed here with extract(dow from current_date) rather than
-- hardcoded, since the bug only reproduces when the template's day matches
-- whatever day the suite happens to run on -- assertion 1's hardcoded
-- Monday (day_of_week = 1) template only reproduces it 1 day in 7, which is
-- exactly why it missed this bug originally.
select tests.authenticate_as((select value from test_fixtures where key = 'owner_d'));
insert into public.class_templates (id, studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  (select value from test_fixtures where key = 'studio_d'),
  'Off-by-one Regression',
  (select value from test_fixtures where key = 'instructor_d'),
  extract(dow from current_date)::smallint,
  '07:00',
  60,
  10
);
select is(
  (select count(*)::int from public.generate_sessions_for_template('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 8)),
  8,
  'generate_sessions_for_template creates exactly p_weeks_ahead sessions when day_of_week matches today (off-by-one regression)'
);

-- 7-8) 크론 배치 격리 회귀 테스트: 서로 다른 스튜디오의 템플릿을 하나씩
--    만들고, 그중 한 스튜디오의 강사만 나중에 'member'로 강등시킨다 (오너가
--    다른 프로필의 role을 바꾸는 것은 자기 자신을 승격시키는 게 아니므로
--    prevent_privilege_escalation을 통과하는 통상적인 조작이다). 이후
--    generate_sessions_for_all_templates()를 호출해도 예외 없이 끝나야 하고,
--    영향받지 않은 다른 스튜디오의 템플릿은 정상적으로 세션이 생성되어야
--    한다 -- 이 두 가지를 함께 확인해야 격리가 "진짜로" 동작함을 증명한다
--    (단순히 함수가 죽지 않는다는 것만으로는 부족하다).
-- Regression for the reviewed cron-isolation bug: the old
-- generate_sessions_for_all_templates looped over every template with no
-- per-template exception handling, so one template's instructor being
-- demoted after the fact made the very next session-insert re-validate
-- against class_sessions_validate_instructor and raise, aborting the whole
-- function call -- silently stalling every other studio's weekly rollover
-- too. The fix wraps each iteration's call to _generate_sessions_internal
-- in its own `begin ... exception when others ... end` block.
-- template_f/template_g are created via owner-authenticated inserts (the
-- normal application path, same as assertion 1), so both the trigger and
-- RLS are genuinely exercised on the way in -- only the later demotion
-- below is a deliberately abnormal, test-only mutation.
select tests.authenticate_as((select value from test_fixtures where key = 'owner_f'));
insert into public.class_templates (id, studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  (select value from test_fixtures where key = 'studio_f'),
  'Studio F Vinyasa',
  (select value from test_fixtures where key = 'instructor_f'),
  3,
  '08:00',
  60,
  10
);

select tests.authenticate_as((select value from test_fixtures where key = 'owner_g'));
insert into public.class_templates (id, studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  (select value from test_fixtures where key = 'studio_g'),
  'Studio G Vinyasa',
  (select value from test_fixtures where key = 'instructor_g'),
  4,
  '08:00',
  60,
  10
);

-- instructor_g가 나중에 'member'로 강등된다: owner_g가 같은 스튜디오의 다른
-- 프로필 row를 바꾸는 것이므로 profiles_prevent_privilege_escalation
-- (current_role() = 'owner'라 통과)과 RLS의
-- "profiles: self or owner update" (studio_id 일치 + current_role() =
-- 'owner') 둘 다 자연스럽게 만족되어, 별도 bypass 없이 일반 authenticated
-- UPDATE로 충분하다.
update public.profiles set role = 'member'
where id = (select value from test_fixtures where key = 'instructor_g');

-- generate_sessions_for_all_templates has no grant to authenticated/anon at
-- all (cron-only, by design -- see the migration's own comment), so it can
-- only be reached by a superuser. This codebase has no tests.bypass_rls()
-- helper (grepped for it -- it doesn't exist), so switch back to `postgres`
-- directly: permission to `set role` is checked against the session user
-- (postgres, a superuser, fixed for the life of this connection), not the
-- currently-lowered role, so this succeeds regardless of the
-- authenticate_as(owner_g) call above.
set local role postgres;
select lives_ok(
  $$select public.generate_sessions_for_all_templates()$$,
  'generate_sessions_for_all_templates does not raise when one template fails validation'
);
select is(
  (select count(*)::int from public.class_sessions where template_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  1,
  'unaffected template in a different studio still gets its session generated'
);

select tests.clear_authentication();
select finish();
rollback;
