begin;
select plan(14);

create temporary table test_fixtures (key text primary key, value uuid);

insert into public.studios (id, name) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Studio F');
insert into test_fixtures values ('studio_f', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
insert into test_fixtures (key, value) select 'owner_f', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'owner', 'Owner F');
insert into test_fixtures (key, value) select 'instr1_f', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'instructor', 'Instructor One');
insert into test_fixtures (key, value) select 'instr2_f', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'instructor', 'Instructor Two');
insert into test_fixtures (key, value) select 'member1_f', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'member', 'Member One');
insert into test_fixtures (key, value) select 'member2_f', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'member', 'Member Two');

-- Unrelated second studio -- assertion 12 (RLS isolation) needs someone who
-- is nobody's participant in Studio F's conversations at all, not just a
-- different role within the same studio.
insert into public.studios (id, name) values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Studio G');
insert into test_fixtures values ('studio_g', 'dddddddd-dddd-dddd-dddd-dddddddddddd');
insert into test_fixtures (key, value) select 'outsider_g', tests.create_test_profile((select value from test_fixtures where key = 'studio_g'), 'member', 'Outsider');

-- insert too (not just select): assertion 8's follow-up records the dm's
-- conversation id into this fixture table *after* switching to an
-- authenticated role via tests.authenticate_as below.
grant select, insert on test_fixtures to authenticated, anon;

-- throws_ok's query argument is executed dynamic SQL, not a literal -- these
-- helpers build it with format(%L) so a fixture UUID can be spliced in
-- safely instead of trying to interpolate one into a $$...$$ body.
create or replace function pg_temp.dm_call(p_other_key text) returns text as $f$
  select format('select public.get_or_create_dm(%L)', (select value from test_fixtures where key = p_other_key))
$f$ language sql;

select tests.authenticate_as((select value from test_fixtures where key = 'owner_f'));

-- 1) owner -> member is blocked
select throws_ok(pg_temp.dm_call('member1_f'), 'pair_not_allowed', 'owner cannot DM a member');

-- 2) member -> member is blocked
select tests.authenticate_as((select value from test_fixtures where key = 'member1_f'));
select throws_ok(pg_temp.dm_call('member2_f'), 'pair_not_allowed', 'a member cannot DM another member');

-- 3) owner <-> instructor is allowed
select tests.authenticate_as((select value from test_fixtures where key = 'owner_f'));
select isnt(
  public.get_or_create_dm((select value from test_fixtures where key = 'instr1_f')),
  null,
  'owner can DM an instructor'
);

-- 4) instructor <-> instructor is allowed
select tests.authenticate_as((select value from test_fixtures where key = 'instr1_f'));
select isnt(
  public.get_or_create_dm((select value from test_fixtures where key = 'instr2_f')),
  null,
  'an instructor can DM another instructor'
);

-- 5) instructor <-> member is allowed
select isnt(
  public.get_or_create_dm((select value from test_fixtures where key = 'member1_f')),
  null,
  'an instructor can DM a member'
);

-- 6) messaging yourself is rejected before the pair check even runs
select throws_ok(
  format('select public.get_or_create_dm(%L)', (select value from test_fixtures where key = 'instr1_f')),
  'cannot_message_self',
  'an instructor cannot DM themselves'
);

-- 7) a profile in a different studio is treated the same as no such profile
select throws_ok(pg_temp.dm_call('outsider_g'), 'other_profile_not_found', 'a cross-studio target is rejected');

-- 8) get_or_create_dm is idempotent: the same pair always resolves to the
-- same conversation, never a duplicate
select is(
  public.get_or_create_dm((select value from test_fixtures where key = 'member1_f')),
  public.get_or_create_dm((select value from test_fixtures where key = 'member1_f')),
  'calling get_or_create_dm twice for the same pair returns the same conversation'
);

insert into test_fixtures (key, value)
  select 'dm_instr1_member1', public.get_or_create_dm((select value from test_fixtures where key = 'member1_f'));

-- 9) a non-participant cannot send into a conversation they're not in
select tests.authenticate_as((select value from test_fixtures where key = 'instr2_f'));
select throws_ok(
  format('select public.send_message(%L, %L)', (select value from test_fixtures where key = 'dm_instr1_member1'), 'sneaky'),
  'not_a_participant',
  'a non-participant cannot send into someone else''s dm'
);

-- 10) an empty message (no body, no image) is rejected
select tests.authenticate_as((select value from test_fixtures where key = 'instr1_f'));
select throws_ok(
  format('select public.send_message(%L, null, null)', (select value from test_fixtures where key = 'dm_instr1_member1')),
  'empty_message',
  'a message with neither body nor image is rejected'
);

-- 11) a real message from a participant succeeds and shows up as unread for
-- the other participant, via the same aggregate list_my_conversations the
-- room list actually calls
-- now() is frozen for this whole test's transaction (it's transaction-start
-- time, not wall-clock-at-statement-time), so the participant row's
-- default-now() last_read_at and the message's default-now() created_at
-- would otherwise land on the exact same instant and the `>` comparison in
-- list_my_conversations would never see it as unread. Push last_read_at
-- explicitly into the past so the ordering holds regardless -- this isn't a
-- real-world scenario (separate requests get separate transactions), just
-- an artifact of everything here sharing one.
select tests.bypass_rls();
update public.conversation_participants set last_read_at = now() - interval '1 hour'
  where conversation_id = (select value from test_fixtures where key = 'dm_instr1_member1')
    and profile_id = (select value from test_fixtures where key = 'member1_f');

select tests.authenticate_as((select value from test_fixtures where key = 'instr1_f'));
select public.send_message((select value from test_fixtures where key = 'dm_instr1_member1'), '안녕하세요');
select tests.authenticate_as((select value from test_fixtures where key = 'member1_f'));
select is(
  (
    select unread_count from public.list_my_conversations()
    where conversation_id = (select value from test_fixtures where key = 'dm_instr1_member1')
  ),
  1,
  'the recipient sees exactly one unread message'
);

-- 12) RLS isolation: someone who is nobody's participant anywhere sees zero
-- of this conversation's rows via a direct select, not just via the RPCs
select tests.authenticate_as((select value from test_fixtures where key = 'outsider_g'));
select is(
  (select count(*)::int from public.messages where conversation_id = (select value from test_fixtures where key = 'dm_instr1_member1')),
  0,
  'a non-participant sees zero messages in a conversation they are not in'
);

-- 13) the studio-wide staff group is auto-created and includes the owner and
-- every instructor, lazily on first list_my_conversations call -- not a
-- member, and not before anyone has ever opened chat
select tests.authenticate_as((select value from test_fixtures where key = 'owner_f'));
select * from public.list_my_conversations();
select tests.authenticate_as((select value from test_fixtures where key = 'instr2_f'));
select * from public.list_my_conversations();
select is(
  (
    select count(*)::int from public.conversation_participants cp
    join public.conversations c on c.id = cp.conversation_id
    where c.studio_id = (select value from test_fixtures where key = 'studio_f') and c.kind = 'group'
  ),
  2,
  'the staff group has exactly the owner and instr2 (instr1 never opened chat)'
);

-- 14) list_dm_candidates for a member only ever offers instructors -- never
-- the owner, never other members, matching get_or_create_dm's own pair rule
select tests.authenticate_as((select value from test_fixtures where key = 'member2_f'));
select is(
  (select array_agg(distinct role::text) from public.list_dm_candidates()),
  array['instructor'],
  'a member''s dm candidates are instructors only'
);

select finish();
rollback;
