-- ============================================================================
-- Local-only demo data. Runs automatically at the end of `supabase db reset`
-- (this file, applied via psql as the `postgres` superuser -- same role that
-- owns every table/function from the migrations, so it bypasses RLS and can
-- call the internal, PUBLIC-revoked RPCs directly with no auth.uid()
-- context needed). Never runs against a hosted project; nothing here is
-- reachable outside this machine's Docker stack.
--
-- All 9 demo accounts share the password: demo1234
-- See the full list in the NOTICE block at the end of this file.
-- ============================================================================

-- Session-local helper (auto-dropped when this psql connection closes, so it
-- never lingers in the real schema): creates a real auth.users + matching
-- auth.identities row with a genuinely working bcrypt password, so these
-- demo accounts can log in through the actual /login/* forms -- not just
-- tests.create_test_profile's empty-password rows from
-- supabase/migrations/20260724100001_test_helpers.sql, which only work via
-- tests.authenticate_as()'s JWT-claim faking, never through a real password
-- grant.
create or replace function pg_temp.seed_create_user(p_email text, p_password text, p_name text)
returns uuid
language plpgsql
as $$
declare
  v_user_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    p_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p_name),
    now(), now(),
    '', '', '', ''
  );

  -- GoTrue's own signUp() always writes a matching identities row alongside
  -- users; email is a generated column here (derived from identity_data),
  -- so it's set via identity_data->>'email', never assigned directly.
  insert into auth.identities (
    user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) values (
    v_user_id, v_user_id::text, 'email',
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    now(), now(), now()
  );

  return v_user_id;
end;
$$;

do $$
declare
  v_studio_id uuid;
  v_owner_id uuid;
  v_instructor1_id uuid; -- 박서연
  v_instructor2_id uuid; -- 이하늘
  v_instructor3_id uuid; -- 최지민
  v_member1_id uuid; -- 김민지
  v_member2_id uuid; -- 이준호
  v_member3_id uuid; -- 정다은
  v_member4_id uuid; -- 강태양
  v_member5_id uuid; -- 윤소라

  v_tpl_vinyasa uuid;
  v_tpl_hatha uuid;
  v_tpl_ashtanga uuid;
  v_tpl_stretch uuid;
  v_tpl_power uuid;

  v_session_id uuid;
  v_session_date date;
  v_past_session_id uuid;
  v_past_date date;
begin
  -- ---- Studio + people ------------------------------------------------
  insert into public.studios (name) values ('마음요가원') returning id into v_studio_id;

  v_owner_id      := pg_temp.seed_create_user('owner@yogaone.demo',       'demo1234', '김원장');
  v_instructor1_id := pg_temp.seed_create_user('instructor1@yogaone.demo', 'demo1234', '박서연');
  v_instructor2_id := pg_temp.seed_create_user('instructor2@yogaone.demo', 'demo1234', '이하늘');
  v_instructor3_id := pg_temp.seed_create_user('instructor3@yogaone.demo', 'demo1234', '최지민');
  v_member1_id    := pg_temp.seed_create_user('member1@yogaone.demo',     'demo1234', '김민지');
  v_member2_id    := pg_temp.seed_create_user('member2@yogaone.demo',     'demo1234', '이준호');
  v_member3_id    := pg_temp.seed_create_user('member3@yogaone.demo',     'demo1234', '정다은');
  v_member4_id    := pg_temp.seed_create_user('member4@yogaone.demo',     'demo1234', '강태양');
  v_member5_id    := pg_temp.seed_create_user('member5@yogaone.demo',     'demo1234', '윤소라');

  -- phone is populated for all nine so 이메일 찾기 (find_email_by_name_phone,
  -- 20260805000000) has real matches to test against, not just the one demo
  -- account someone happens to remember to update by hand.
  insert into public.profiles (id, studio_id, role, full_name, contract_status, phone) values
    (v_owner_id,       v_studio_id, 'owner',      '김원장', 'not_required', '010-1000-0001'),
    (v_instructor1_id, v_studio_id, 'instructor', '박서연', 'not_required', '010-1000-0002'),
    (v_instructor2_id, v_studio_id, 'instructor', '이하늘', 'not_required', '010-1000-0003'),
    (v_instructor3_id, v_studio_id, 'instructor', '최지민', 'not_required', '010-1000-0004'),
    (v_member1_id,     v_studio_id, 'member',     '김민지', 'signed',       '010-1000-0005'),
    (v_member2_id,     v_studio_id, 'member',     '이준호', 'signed',       '010-1000-0006'),
    (v_member3_id,     v_studio_id, 'member',     '정다은', 'signed',       '010-1000-0007'),
    (v_member4_id,     v_studio_id, 'member',     '강태양', 'signed',       '010-1000-0008'),
    (v_member5_id,     v_studio_id, 'member',     '윤소라', 'pending',      '010-1000-0009');

  -- ---- Unused invites (admin/invites screen shouldn't start empty) ----
  insert into public.invites (studio_id, role, code, expires_at, created_by) values
    (v_studio_id, 'instructor', 'demo-instr',  now() + interval '7 days', v_owner_id),
    (v_studio_id, 'member',     'demo-member', now() + interval '7 days', v_owner_id);

  -- ---- Class templates --------------------------------------------------
  -- day_of_week matches extract(dow from date): 0=Sun ... 6=Sat. Template 3
  -- is taught by the owner directly -- exercises the "owner assigned as
  -- instructor" path proxy.ts's allowedPathPrefixes() carves out.
  insert into public.class_templates (studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity) values
    (v_studio_id, '빈야사 플로우',   v_instructor1_id, 1, '09:00', 60, 2)  returning id into v_tpl_vinyasa;
  insert into public.class_templates (studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity) values
    (v_studio_id, '하타 요가',       v_instructor2_id, 2, '10:00', 60, 10) returning id into v_tpl_hatha;
  insert into public.class_templates (studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity) values
    (v_studio_id, '아쉬탕가',       v_owner_id,       3, '19:00', 75, 8)  returning id into v_tpl_ashtanga;
  insert into public.class_templates (studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity) values
    (v_studio_id, '저녁 스트레칭',   v_instructor3_id, 4, '20:00', 45, 15) returning id into v_tpl_stretch;
  insert into public.class_templates (studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity) values
    (v_studio_id, '주말 파워 요가', v_instructor2_id, 6, '10:00', 60, 10) returning id into v_tpl_power;

  -- ---- Upcoming sessions --------------------------------------------------
  -- Reuses the real generation routine (not a hand-rolled reimplementation)
  -- so the KST day-of-week alignment this codebase already got right in
  -- supabase/migrations/20260724100003_class_schedule.sql /
  -- 20260724100006_final_review_fixes.sql stays the single source of truth.
  -- Calling the *_internal variant directly (bypassing
  -- generate_sessions_for_template's owner/auth.uid() check) is safe and
  -- intentional here: this DO block runs as `postgres`, the function's own
  -- owner, who always retains EXECUTE on functions they own regardless of
  -- the `revoke ... from public` in that migration -- there is no
  -- authenticated session/JWT to fake in a seed script.
  perform public._generate_sessions_internal(v_tpl_vinyasa, 3);
  perform public._generate_sessions_internal(v_tpl_hatha, 3);
  perform public._generate_sessions_internal(v_tpl_ashtanga, 3);
  perform public._generate_sessions_internal(v_tpl_stretch, 3);
  perform public._generate_sessions_internal(v_tpl_power, 3);

  -- ---- Bookings on the nearest upcoming session per template -------------
  -- Vinyasa's capacity (2) is deliberately tight: member1 + member2 fill it
  -- ('booked'), member3 demonstrates the waitlist path ('waitlisted').
  select id, date into v_session_id, v_session_date
    from public.class_sessions where template_id = v_tpl_vinyasa order by date asc limit 1;
  insert into public.bookings (session_id, member_id, status) values
    (v_session_id, v_member1_id, 'booked'),
    (v_session_id, v_member2_id, 'booked'),
    (v_session_id, v_member3_id, 'waitlisted');

  select id into v_session_id
    from public.class_sessions where template_id = v_tpl_hatha order by date asc limit 1;
  insert into public.bookings (session_id, member_id, status) values
    (v_session_id, v_member4_id, 'booked'),
    (v_session_id, v_member5_id, 'booked');

  select id into v_session_id
    from public.class_sessions where template_id = v_tpl_power order by date asc limit 1;
  insert into public.bookings (session_id, member_id, status) values
    (v_session_id, v_member1_id, 'booked');

  -- ---- One past vinyasa session, for attendance history -------------------
  -- _generate_sessions_internal only ever emits today-or-later dates, so
  -- there's nothing to mark attended/no_show against without inserting a
  -- past occurrence directly. Exactly 7 days before the nearest upcoming
  -- vinyasa session lands on the same weekday and is always strictly in the
  -- past, so it doesn't collide with class_sessions' unique(template_id, date).
  v_past_date := v_session_date; -- reuse: last select above was hatha/power, refetch vinyasa's
  select date into v_past_date from public.class_sessions where template_id = v_tpl_vinyasa order by date asc limit 1;
  v_past_date := v_past_date - 7;

  insert into public.class_sessions (template_id, studio_id, date, instructor_id, capacity) values
    (v_tpl_vinyasa, v_studio_id, v_past_date, v_instructor1_id, 2)
    returning id into v_past_session_id;

  insert into public.bookings (session_id, member_id, status) values
    (v_past_session_id, v_member1_id, 'attended'),
    (v_past_session_id, v_member2_id, 'no_show'),
    (v_past_session_id, v_member3_id, 'cancelled');

  raise notice '';
  raise notice '=== Demo accounts (all passwords: demo1234) ===';
  raise notice '원장:  owner@yogaone.demo';
  raise notice '강사:  instructor1@yogaone.demo / instructor2@yogaone.demo / instructor3@yogaone.demo';
  raise notice '회원:  member1@yogaone.demo ... member5@yogaone.demo';
  raise notice '================================================';
end $$;
