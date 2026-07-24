begin;
select plan(5);

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

-- test_fixtures is owned by whichever role created it (postgres, the role
-- this script connects as). All assertions below look up fixture UUIDs
-- (studio_d/owner_d/instructor_d/instructor_e) via SELECT after
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

select tests.clear_authentication();
select finish();
rollback;
