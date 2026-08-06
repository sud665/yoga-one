begin;
select plan(6);

create temporary table test_fixtures (key text primary key, value uuid);

insert into public.studios (id, name) values ('77777777-7777-7777-7777-777777777777', 'Studio D');
insert into test_fixtures values ('studio_d', '77777777-7777-7777-7777-777777777777');

-- Direct auth.users insert (matching invites.test.sql's fixture style), not
-- tests.create_test_profile: that helper generates a random-UUID email
-- (20260724100001_test_helpers.sql), which would make the masked prefix
-- unpredictable and unassertable below.
insert into test_fixtures (key, value) values ('member_d', gen_random_uuid());
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values ((select value from test_fixtures where key = 'member_d'), 'kimminji@test.local', '', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');
insert into public.profiles (id, studio_id, role, full_name, contract_status, phone) values
  ((select value from test_fixtures where key = 'member_d'), (select value from test_fixtures where key = 'studio_d'), 'member', '김민지', 'signed', '010-1234-5678');

grant select on test_fixtures to authenticated, anon;

select tests.clear_authentication();

-- 1) exact name+phone match returns a masked (not raw) email
select is(
  public.find_email_by_name_phone('김민지', '010-1234-5678'),
  'ki***@test.local',
  'exact match returns the masked email'
);

-- 2) phone format is normalized before comparing -- dashes stripped on both
-- sides, so a caller typing digits-only still matches the dashed stored value
select is(
  public.find_email_by_name_phone('김민지', '01012345678'),
  'ki***@test.local',
  'a differently-formatted (no-dash) phone still matches'
);

-- 3) wrong phone, right name: no match
select is(
  public.find_email_by_name_phone('김민지', '010-0000-0000'),
  null,
  'a non-matching phone returns null, not an error'
);

-- 4) right phone, wrong name: no match -- confirms this isn't a phone-only lookup
select is(
  public.find_email_by_name_phone('없는사람', '010-1234-5678'),
  null,
  'a non-matching name returns null even with the right phone'
);

-- 5) anon can call this directly -- it's the whole point, there is no session
-- yet for a signed-out visitor trying to recover their email
select lives_ok(
  $$select public.find_email_by_name_phone('김민지', '010-1234-5678')$$,
  'anon can call find_email_by_name_phone'
);

-- 6) authenticated is explicitly NOT granted -- there is no legitimate case
-- for a signed-in user to look up someone else's email this way, unlike
-- get_invite_preview which stays anon *and* authenticated on purpose
select tests.authenticate_as((select value from test_fixtures where key = 'member_d'));
select throws_ok(
  $$select public.find_email_by_name_phone('김민지', '010-1234-5678')$$,
  'permission denied for function find_email_by_name_phone',
  'authenticated is rejected with permission denied, not a data answer'
);

select tests.clear_authentication();
select finish();
rollback;
