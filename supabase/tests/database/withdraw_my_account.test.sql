begin;
select plan(11);

create temporary table test_fixtures (key text primary key, value uuid);

insert into public.studios (id, name) values ('88888888-8888-8888-8888-888888888888', 'Studio E');
insert into test_fixtures values ('studio_e', '88888888-8888-8888-8888-888888888888');
insert into test_fixtures (key, value)
  select 'owner_e', tests.create_test_profile((select value from test_fixtures where key = 'studio_e'), 'owner', 'Owner E');
insert into test_fixtures (key, value)
  select 'member_e', tests.create_test_profile((select value from test_fixtures where key = 'studio_e'), 'member', '박탈퇴');
insert into test_fixtures (key, value)
  select 'member_f', tests.create_test_profile((select value from test_fixtures where key = 'studio_e'), 'member', '김대기');
insert into test_fixtures (key, value)
  select 'instructor_e', tests.create_test_profile((select value from test_fixtures where key = 'studio_e'), 'instructor', '탈퇴할강사');

-- A real booking against member_e, so withdrawal has to survive the exact FK
-- (bookings.member_id references profiles(id), no cascade) this migration's
-- anonymize-don't-delete design exists for.
insert into public.class_templates (id, studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity) values
  ('99999999-9999-9999-9999-999999999999', (select value from test_fixtures where key = 'studio_e'), 'Test Class', (select value from test_fixtures where key = 'instructor_e'), 1, '09:00', 60, 10);
insert into public.class_sessions (id, template_id, studio_id, date, instructor_id, capacity) values
  ('aaaaaaaa-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999999', (select value from test_fixtures where key = 'studio_e'), current_date + 7, (select value from test_fixtures where key = 'instructor_e'), 10);
insert into public.bookings (id, session_id, member_id, status) values
  ('bbbbbbbb-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-111111111111', (select value from test_fixtures where key = 'member_e'), 'attended');

-- A second, capacity-1 session where member_e holds the one 'booked' slot
-- and member_f is 'waitlisted' behind them -- this is what exercises the
-- 20260806000000 extension: member_e's withdrawal must cancel their own
-- 'booked' row here (not just leave it dangling forever) and promote
-- member_f into it, same as cancel_booking would.
insert into public.class_sessions (id, template_id, studio_id, date, instructor_id, capacity) values
  ('aaaaaaaa-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999999', (select value from test_fixtures where key = 'studio_e'), current_date + 8, (select value from test_fixtures where key = 'instructor_e'), 1);
insert into public.bookings (id, session_id, member_id, status) values
  ('bbbbbbbb-2222-2222-2222-222222222222', 'aaaaaaaa-2222-2222-2222-222222222222', (select value from test_fixtures where key = 'member_e'), 'booked');
insert into public.bookings (id, session_id, member_id, status) values
  ('bbbbbbbb-3333-3333-3333-333333333333', 'aaaaaaaa-2222-2222-2222-222222222222', (select value from test_fixtures where key = 'member_f'), 'waitlisted');

-- A group conversation member_e belongs to -- withdrawal must remove this
-- participant row so RLS stops granting them (or their renamed profile)
-- any further read access to the room.
insert into public.conversations (id, studio_id, kind, title) values
  ('cccccccc-1111-1111-1111-111111111111', (select value from test_fixtures where key = 'studio_e'), 'group', '스태프');
insert into public.conversation_participants (conversation_id, profile_id) values
  ('cccccccc-1111-1111-1111-111111111111', (select value from test_fixtures where key = 'member_e'));

grant select on test_fixtures to authenticated, anon;

select tests.clear_authentication();

-- 1) anon cannot call this at all -- there is no "whose account" without a session
select throws_ok(
  $$select public.withdraw_my_account('test')$$,
  'permission denied for function withdraw_my_account',
  'anon is rejected with permission denied'
);

-- 2) an owner is explicitly blocked
select tests.authenticate_as((select value from test_fixtures where key = 'owner_e'));
select throws_ok(
  $$select public.withdraw_my_account(null)$$,
  'owner_cannot_withdraw',
  'an owner cannot self-withdraw'
);

-- 3) a member can withdraw; their profile is anonymized, not deleted
select tests.authenticate_as((select value from test_fixtures where key = 'member_e'));
select public.withdraw_my_account('이사 · 거리');
select is(
  (select full_name from public.profiles where id = (select value from test_fixtures where key = 'member_e')),
  '탈퇴한 회원',
  'full_name is anonymized to the generic member label'
);
select is(
  (select phone from public.profiles where id = (select value from test_fixtures where key = 'member_e')),
  null,
  'phone is cleared'
);

-- 4) the booking survives -- the whole point: withdrawal must not violate
-- bookings.member_id's FK to the now-scrubbed-but-still-present profile row
select is(
  (select status::text from public.bookings where id = 'bbbbbbbb-1111-1111-1111-111111111111'),
  'attended',
  'the booking history row is untouched'
);

-- 5) auth.users is banned and the email is freed up for reuse -- run as
-- postgres (tests.clear_authentication switches to *anon*, which has no
-- select grant on auth.users either; tests.bypass_rls is the one that
-- actually becomes postgres) since this checks GoTrue's own table directly
select tests.bypass_rls();
select ok(
  (select banned_until > now() from auth.users where id = (select value from test_fixtures where key = 'member_e')),
  'banned_until is set far in the future'
);
select ok(
  (select email like 'withdrawn+%@deleted.invalid' from auth.users where id = (select value from test_fixtures where key = 'member_e')),
  'the original email is freed up (mangled, not retained)'
);

-- 6) the optional reason is logged, scoped to studio+role, no PII
select is(
  (select reason from public.withdrawal_feedback where studio_id = (select value from test_fixtures where key = 'studio_e')),
  '이사 · 거리',
  'the withdrawal reason is recorded'
);

-- 7) member_e's own active 'booked' row on the second session is cancelled
select is(
  (select status::text from public.bookings where id = 'bbbbbbbb-2222-2222-2222-222222222222'),
  'cancelled',
  'the withdrawing member''s own booked row is cancelled, not left dangling'
);

-- 8) member_f, waitlisted behind them, is promoted into the freed slot
select is(
  (select status::text from public.bookings where id = 'bbbbbbbb-3333-3333-3333-333333333333'),
  'booked',
  'the next waitlisted member is promoted, same as cancel_booking'
);

-- 9) member_e no longer participates in the group conversation
select ok(
  not exists (
    select 1 from public.conversation_participants
    where conversation_id = 'cccccccc-1111-1111-1111-111111111111'
      and profile_id = (select value from test_fixtures where key = 'member_e')
  ),
  'the withdrawing member is removed from every conversation they were in'
);

select finish();
rollback;
