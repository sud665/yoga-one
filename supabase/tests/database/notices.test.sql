begin;
select plan(15);

create temporary table test_fixtures (key text primary key, value uuid);

insert into public.studios (id, name) values ('99999999-0000-0000-0000-000000000001', 'Studio N');
insert into test_fixtures values ('studio_n', '99999999-0000-0000-0000-000000000001');
insert into test_fixtures (key, value)
  select 'owner_n', tests.create_test_profile((select value from test_fixtures where key = 'studio_n'), 'owner', 'Owner N');
insert into test_fixtures (key, value)
  select 'member_n', tests.create_test_profile((select value from test_fixtures where key = 'studio_n'), 'member', 'Member N');
insert into test_fixtures (key, value)
  select 'instructor_n', tests.create_test_profile((select value from test_fixtures where key = 'studio_n'), 'instructor', 'Instructor N');

-- A second, unrelated studio -- proves target-scoping never leaks across
-- studio_id even when the target matches.
insert into public.studios (id, name) values ('99999999-0000-0000-0000-000000000002', 'Studio O');
insert into test_fixtures values ('studio_o', '99999999-0000-0000-0000-000000000002');
insert into test_fixtures (key, value)
  select 'member_o', tests.create_test_profile((select value from test_fixtures where key = 'studio_o'), 'member', 'Member O');

grant select on test_fixtures to authenticated, anon;

-- Owner creates three notices, one per target -- direct insert, same
-- pattern as createInvite, relying on the owner "for all" RLS policy.
select tests.authenticate_as((select value from test_fixtures where key = 'owner_n'));
insert into public.notices (id, studio_id, title, body, target, created_by) values
  ('99999999-0001-0000-0000-000000000001', (select value from test_fixtures where key = 'studio_n'), '전체 공지', '본문', 'all', (select value from test_fixtures where key = 'owner_n')),
  ('99999999-0001-0000-0000-000000000002', (select value from test_fixtures where key = 'studio_n'), '회원 전용', '본문', 'member', (select value from test_fixtures where key = 'owner_n')),
  ('99999999-0001-0000-0000-000000000003', (select value from test_fixtures where key = 'studio_n'), '강사 전용', '본문', 'instructor', (select value from test_fixtures where key = 'owner_n'));

-- 1) the owner's own management view sees all three regardless of target
select is(
  (select count(*)::int from public.notices where studio_id = (select value from test_fixtures where key = 'studio_n')),
  3,
  'owner sees every notice in their studio regardless of target'
);

-- 2) a member sees 'all' + 'member', not the instructor-only one
select tests.authenticate_as((select value from test_fixtures where key = 'member_n'));
select is(
  (select count(*)::int from public.notices),
  2,
  'member sees all-target and member-target notices only'
);
select ok(
  not exists (select 1 from public.notices where target = 'instructor'),
  'member cannot see the instructor-only notice'
);

-- 3) an instructor sees 'all' + 'instructor', not the member-only one
select tests.authenticate_as((select value from test_fixtures where key = 'instructor_n'));
select is(
  (select count(*)::int from public.notices),
  2,
  'instructor sees all-target and instructor-target notices only'
);
select ok(
  not exists (select 1 from public.notices where target = 'member'),
  'instructor cannot see the member-only notice'
);

-- 4) cross-studio isolation: a member of a different studio sees none of these
select tests.authenticate_as((select value from test_fixtures where key = 'member_o'));
select is(
  (select count(*)::int from public.notices),
  0,
  'a member of a different studio sees none of studio N''s notices'
);

-- 5) a member cannot write a notice directly (RLS blocks non-owner inserts)
select throws_ok(
  $$insert into public.notices (studio_id, title, body, target, created_by)
    values ('99999999-0000-0000-0000-000000000002', 'x', 'x', 'all', (select value from test_fixtures where key = 'member_o'))$$,
  'new row violates row-level security policy for table "notices"',
  'a non-owner cannot insert a notice'
);

-- 6) get_notice increments views and returns the row when visible
select tests.authenticate_as((select value from test_fixtures where key = 'member_n'));
select is(
  (select views from public.get_notice('99999999-0001-0000-0000-000000000001')),
  1,
  'get_notice bumps views from 0 to 1'
);
select is(
  (select views from public.get_notice('99999999-0001-0000-0000-000000000001')),
  2,
  'a second call bumps views again'
);

-- 7) get_notice rejects a notice outside the caller's target
select throws_ok(
  $$select public.get_notice('99999999-0001-0000-0000-000000000003')$$,
  'not_permitted',
  'get_notice rejects a member reading the instructor-only notice by id'
);

-- 8) get_notice rejects a notice from a different studio entirely
select tests.authenticate_as((select value from test_fixtures where key = 'member_o'));
select throws_ok(
  $$select public.get_notice('99999999-0001-0000-0000-000000000001')$$,
  'not_permitted',
  'get_notice rejects cross-studio access even to an all-target notice'
);

-- 9) owner can update a notice in their own studio (QA sweep 2026-08-08,
-- item 5 -- edit/delete UI added; "notices: owner manages own studio
-- notices" is a `for all` policy, so this was already authorized at the RLS
-- layer and only needed the client-side action + screen).
select tests.authenticate_as((select value from test_fixtures where key = 'owner_n'));
update public.notices set title = '전체 공지 (수정)' where id = '99999999-0001-0000-0000-000000000001';
select is(
  (select title from public.notices where id = '99999999-0001-0000-0000-000000000001'),
  '전체 공지 (수정)',
  'owner can update a notice in their own studio'
);

-- 10) a non-owner's update matches zero rows under the "for all" policy's
-- USING clause -- not an error, just silently no-op. member_n can still
-- read the title afterward via the separate targeted-read policy, so no
-- bypass_rls() is needed to verify it didn't change.
select tests.authenticate_as((select value from test_fixtures where key = 'member_n'));
update public.notices set title = '해킹 시도' where id = '99999999-0001-0000-0000-000000000001';
select is(
  (select title from public.notices where id = '99999999-0001-0000-0000-000000000001'),
  '전체 공지 (수정)',
  'a non-owner update does not change the row (RLS matches zero rows, not an error)'
);

-- 11) same for delete: a non-owner's delete matches zero rows
delete from public.notices where id = '99999999-0001-0000-0000-000000000002';
select is(
  (select count(*)::int from public.notices where id = '99999999-0001-0000-0000-000000000002'),
  1,
  'a non-owner delete does not remove the row (RLS matches zero rows, not an error)'
);

-- 12) owner can delete a notice in their own studio
select tests.authenticate_as((select value from test_fixtures where key = 'owner_n'));
delete from public.notices where id = '99999999-0001-0000-0000-000000000002';
select is(
  (select count(*)::int from public.notices where id = '99999999-0001-0000-0000-000000000002'),
  0,
  'owner can delete a notice in their own studio'
);

select tests.clear_authentication();
select finish();
rollback;
