begin;
select plan(5);

create temporary table test_fixtures (key text primary key, value uuid);

insert into public.studios (id, name) values ('33333333-3333-3333-3333-333333333333', 'Studio C');
insert into test_fixtures values ('studio_c', '33333333-3333-3333-3333-333333333333');
insert into test_fixtures (key, value)
  select 'owner_c', tests.create_test_profile((select value from test_fixtures where key = 'studio_c'), 'owner', 'Owner C');

insert into public.invites (id, studio_id, role, code, expires_at, created_by) values
  ('44444444-4444-4444-4444-444444444444', (select value from test_fixtures where key = 'studio_c'), 'member', 'VALIDCODE', now() + interval '7 days', (select value from test_fixtures where key = 'owner_c')),
  ('55555555-5555-5555-5555-555555555555', (select value from test_fixtures where key = 'studio_c'), 'member', 'EXPIREDCODE', now() - interval '1 day', (select value from test_fixtures where key = 'owner_c')),
  ('66666666-6666-6666-6666-666666666666', (select value from test_fixtures where key = 'studio_c'), 'instructor', 'USEDCODE', now() + interval '7 days', (select value from test_fixtures where key = 'owner_c'));
update public.invites set used_at = now() where code = 'USEDCODE';

-- Fixtures for assertions 3-4 below: brand-new auth.users rows with NO
-- profile yet, so accept_invite can be tested actually creating the
-- profile. Created up front (matching the studios_and_profiles.test.sql
-- `new_owner` fixture pattern) while the session is still `postgres` --
-- test_fixtures only gets `select` granted to authenticated/anon below, and
-- auth.users isn't grant-accessible to those roles at all, so creating
-- these rows after any authenticate_as/clear_authentication role switch
-- fails with "permission denied" (verified: the brief's original
-- interleaved ordering does fail this way under `npx supabase test db`).
insert into test_fixtures (key, value) values ('new_user', gen_random_uuid());
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values ((select value from test_fixtures where key = 'new_user'), 'newuser@test.local', '', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');

insert into test_fixtures (key, value) values ('second_user', gen_random_uuid());
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values ((select value from test_fixtures where key = 'second_user'), 'seconduser@test.local', '', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');

-- test_fixtures is owned by whichever role created it (postgres). Later
-- assertions look up fixture UUIDs while impersonating authenticated/anon
-- via tests.authenticate_as/clear_authentication, so those roles need
-- select on this session-local temp table too.
grant select on test_fixtures to authenticated, anon;

select tests.clear_authentication();

-- 1) 유효한 코드는 valid=true를 반환한다 (인증 없이도 미리보기 가능)
select is(
  (select valid from public.get_invite_preview('VALIDCODE')),
  true,
  'valid invite previews as valid'
);

-- 2) 만료된 코드는 valid=false
select is(
  (select valid from public.get_invite_preview('EXPIREDCODE')),
  false,
  'expired invite previews as invalid'
);

-- 3) 신규 유저가 유효한 코드로 수락하면 member 프로필이 studio_id/role과 함께 생성된다
select tests.authenticate_as((select value from test_fixtures where key = 'new_user'));
select public.accept_invite('VALIDCODE', 'New Member');
select is(
  (select role::text from public.profiles where id = (select value from test_fixtures where key = 'new_user')),
  'member',
  'accept_invite creates a profile with the invite role'
);

-- 4) 같은 코드를 다시 쓰면 거부된다
select tests.authenticate_as((select value from test_fixtures where key = 'second_user'));
select throws_ok(
  $$select public.accept_invite('VALIDCODE', 'Second User')$$,
  'invite_already_used',
  'reusing a consumed invite code is rejected'
);

-- 5) 만료된 코드로 수락 시도하면 거부된다
select throws_ok(
  $$select public.accept_invite('EXPIREDCODE', 'Second User')$$,
  'invite_expired',
  'accepting an expired invite is rejected'
);

select tests.clear_authentication();
select finish();
rollback;
