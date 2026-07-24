begin;
select plan(6);

create temporary table test_fixtures (key text primary key, value uuid);

insert into test_fixtures values
  ('studio_a', '11111111-1111-1111-1111-111111111111'),
  ('studio_b', '22222222-2222-2222-2222-222222222222');

insert into public.studios (id, name)
  values ((select value from test_fixtures where key = 'studio_a'), 'Studio A');
insert into public.studios (id, name)
  values ((select value from test_fixtures where key = 'studio_b'), 'Studio B');

insert into test_fixtures (key, value)
  select 'owner_a', tests.create_test_profile((select value from test_fixtures where key = 'studio_a'), 'owner', 'Owner A');
insert into test_fixtures (key, value)
  select 'member_b', tests.create_test_profile((select value from test_fixtures where key = 'studio_b'), 'member', 'Member B');

-- test_fixtures is owned by whichever role created it (postgres, the role
-- this script connects as). Later assertions look up fixture UUIDs while
-- impersonating authenticated/anon via tests.authenticate_as/
-- clear_authentication, so those roles need select on this session-local
-- temp table too, or the lookups themselves fail with permission denied.
grant select on test_fixtures to authenticated, anon;

-- 1) owner A는 studio A만 본다
select tests.authenticate_as((select value from test_fixtures where key = 'owner_a'));
select is(
  (select count(*)::int from public.studios),
  1,
  'owner A sees exactly one studio (their own)'
);

-- 2) member B는 studio B만 본다
select tests.authenticate_as((select value from test_fixtures where key = 'member_b'));
select is(
  (select name from public.studios limit 1),
  'Studio B',
  'member B sees studio B, not studio A'
);

-- 3) member는 자기 studio의 다른 프로필도 조회 가능
select is(
  (select count(*)::int from public.profiles),
  1,
  'member B sees profiles scoped to their own studio'
);

-- 4) member가 본인 role을 owner로 바꾸려 하면 거부된다
select throws_ok(
  format('update public.profiles set role = %L where id = %L', 'owner', (select value from test_fixtures where key = 'member_b')),
  'not_permitted_role_change',
  'member cannot escalate their own role'
);

-- 5) member가 본인 이름은 바꿀 수 있다
update public.profiles set full_name = 'Member B Updated' where id = (select value from test_fixtures where key = 'member_b');
select is(
  (select full_name from public.profiles where id = (select value from test_fixtures where key = 'member_b')),
  'Member B Updated',
  'member can update their own non-privileged fields'
);

-- 6) 인증 없이는 studios가 하나도 안 보인다
select tests.clear_authentication();
select is(
  (select count(*)::int from public.studios),
  0,
  'unauthenticated session sees no studios'
);

select tests.clear_authentication();
select finish();
rollback;
