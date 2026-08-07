begin;
select plan(9);

create temporary table test_fixtures (key text primary key, value uuid);
grant select, insert on test_fixtures to authenticated, anon;

insert into public.studios (id, name) values ('99999999-0001-0000-0000-000000000001', 'Studio I');
insert into test_fixtures values ('studio_i', '99999999-0001-0000-0000-000000000001');
insert into test_fixtures (key, value)
  select 'owner_i', tests.create_test_profile((select value from test_fixtures where key = 'studio_i'), 'owner', 'Owner I');
insert into test_fixtures (key, value)
  select 'instructor_i', tests.create_test_profile((select value from test_fixtures where key = 'studio_i'), 'instructor', 'Instructor I');
insert into test_fixtures (key, value)
  select 'other_instructor_i', tests.create_test_profile((select value from test_fixtures where key = 'studio_i'), 'instructor', 'Other Instructor I');
insert into test_fixtures (key, value)
  select 'member_i', tests.create_test_profile((select value from test_fixtures where key = 'studio_i'), 'member', 'Member I');

insert into public.class_templates (id, studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity)
values ('99999999-0001-0000-0000-000000000002', (select value from test_fixtures where key = 'studio_i'), 'Class I', (select value from test_fixtures where key = 'instructor_i'), 1, '09:00', 60, 10);
insert into public.class_sessions (id, template_id, studio_id, date, instructor_id, capacity)
values ('99999999-0001-0000-0000-000000000003', '99999999-0001-0000-0000-000000000002', (select value from test_fixtures where key = 'studio_i'), current_date + 7, (select value from test_fixtures where key = 'instructor_i'), 10);

-- Studio J: a second, unrelated studio -- proves cross-tenant isolation and
-- that a member from the wrong studio can't be added even by their own
-- studio's own valid-looking id.
insert into public.studios (id, name) values ('99999999-0001-0000-0000-000000000004', 'Studio J');
insert into test_fixtures values ('studio_j', '99999999-0001-0000-0000-000000000004');
insert into test_fixtures (key, value)
  select 'instructor_j', tests.create_test_profile((select value from test_fixtures where key = 'studio_j'), 'instructor', 'Instructor J');
insert into test_fixtures (key, value)
  select 'member_j', tests.create_test_profile((select value from test_fixtures where key = 'studio_j'), 'member', 'Member J');
insert into public.class_templates (id, studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity)
values ('99999999-0001-0000-0000-000000000005', (select value from test_fixtures where key = 'studio_j'), 'Class J', (select value from test_fixtures where key = 'instructor_j'), 2, '10:00', 60, 10);
insert into public.class_sessions (id, template_id, studio_id, date, instructor_id, capacity)
values ('99999999-0001-0000-0000-000000000006', '99999999-0001-0000-0000-000000000005', (select value from test_fixtures where key = 'studio_j'), current_date + 7, (select value from test_fixtures where key = 'instructor_j'), 10);

-- 1) owner can add an existing registered member to the roster directly
select tests.authenticate_as((select value from test_fixtures where key = 'owner_i'));
select is(
  (select status from public.admin_add_participant('99999999-0001-0000-0000-000000000003', (select value from test_fixtures where key = 'member_i'), null)),
  'booked',
  'owner can add an existing member directly'
);

-- 2) the session's own instructor can add a one-day walk-in guest
select tests.authenticate_as((select value from test_fixtures where key = 'instructor_i'));
select is(
  (select guest_name from public.admin_add_participant('99999999-0001-0000-0000-000000000003', null, '워크인 손님')),
  '워크인 손님',
  'assigned instructor can add a one-day guest by name'
);

-- 3) a different instructor (not assigned to this session) cannot add anyone
select tests.authenticate_as((select value from test_fixtures where key = 'other_instructor_i'));
select throws_ok(
  $$select public.admin_add_participant('99999999-0001-0000-0000-000000000003', null, '거절될 손님')$$,
  'not_permitted',
  'a different instructor cannot add a participant to someone else''s class'
);

-- 4) an ordinary member (non-staff) cannot call this at all
select tests.authenticate_as((select value from test_fixtures where key = 'member_i'));
select throws_ok(
  $$select public.admin_add_participant('99999999-0001-0000-0000-000000000003', null, '거절될 손님')$$,
  'not_permitted',
  'an ordinary member cannot add participants'
);

-- 5) supplying both a member and a guest name is rejected
select tests.authenticate_as((select value from test_fixtures where key = 'owner_i'));
select throws_ok(
  format('select public.admin_add_participant(%L, %L, %L)', '99999999-0001-0000-0000-000000000003', (select value from test_fixtures where key = 'member_i'), '둘다'),
  'invalid_participant',
  'supplying both a member and a guest name is rejected'
);

-- 6) supplying neither is rejected
select throws_ok(
  $$select public.admin_add_participant('99999999-0001-0000-0000-000000000003', null, null)$$,
  'invalid_participant',
  'supplying neither a member nor a guest name is rejected'
);

-- 7) re-adding the same member (already added in assertion 1) is rejected
select throws_ok(
  format('select public.admin_add_participant(%L, %L, %L)', '99999999-0001-0000-0000-000000000003', (select value from test_fixtures where key = 'member_i'), null),
  'already_booked',
  'adding the same member twice is rejected'
);

-- 8) a member from a different studio cannot be added, even by a valid owner
select throws_ok(
  format('select public.admin_add_participant(%L, %L, %L)', '99999999-0001-0000-0000-000000000003', (select value from test_fixtures where key = 'member_j'), null),
  'invalid_member',
  'a member from a different studio cannot be added to this session'
);

-- 9) cross-studio isolation: studio I's owner cannot touch studio J's session
select throws_ok(
  format('select public.admin_add_participant(%L, %L, %L)', '99999999-0001-0000-0000-000000000006', (select value from test_fixtures where key = 'member_j'), null),
  'not_permitted',
  'an owner cannot add participants to another studio''s session'
);

select tests.clear_authentication();
select finish();
rollback;
