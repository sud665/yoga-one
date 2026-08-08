-- ============================================================================
-- Local-only demo data. Runs automatically at the end of `supabase db reset`
-- (this file, applied via psql as the `postgres` superuser -- same role that
-- owns every table/function from the migrations, so it bypasses RLS and can
-- call the internal, PUBLIC-revoked RPCs directly with no auth.uid()
-- context needed).
--
-- Also pushed on demand to the hosted project via
-- `supabase db push --include-seed` when a live demo needs real data. The
-- cleanup block right below makes that safe to re-run: it deletes any
-- previous run's studio and accounts by name/email before inserting fresh
-- ones, so this file is idempotent whether it's applied by a clean local
-- `db reset` or repeated against an already-seeded hosted project.
--
-- All 18 demo accounts share the password: demo1234
-- See the full list in the NOTICE block at the end of this file.
-- ============================================================================

-- Explicit, deepest-first cleanup rather than relying on cascade alone:
-- bookings.member_id, invites.created_by, notices.created_by and
-- member_registrations.created_by all reference profiles(id) with NO
-- cascade, and profiles itself cascades from studios.studio_id. Postgres
-- does not guarantee those two cascade paths (studio -> profiles directly,
-- vs. studio -> class_sessions -> bookings) resolve in an order that clears
-- bookings before the profiles.id restrict check fires, so deleting the
-- studio alone can fail with "still referenced from table bookings". Clear
-- every profiles(id)-referencing row first, then the studio (which cascades
-- the now-unreferenced profiles), then the login accounts by email
-- (auth.users cascades to profiles and auth.identities, but by then
-- there's nothing left for it to cascade).
do $$
declare
  v_old_studio_id uuid;
begin
  select id into v_old_studio_id from public.studios where name = '마음요가원';
  if v_old_studio_id is not null then
    delete from public.bookings where session_id in (select id from public.class_sessions where studio_id = v_old_studio_id);
    delete from public.class_sessions where studio_id = v_old_studio_id;
    delete from public.class_templates where studio_id = v_old_studio_id;
    delete from public.messages where conversation_id in (select id from public.conversations where studio_id = v_old_studio_id);
    delete from public.conversation_participants where conversation_id in (select id from public.conversations where studio_id = v_old_studio_id);
    delete from public.conversations where studio_id = v_old_studio_id;
    delete from public.notices where studio_id = v_old_studio_id;
    delete from public.invites where studio_id = v_old_studio_id;
    delete from public.member_registrations where studio_id = v_old_studio_id;
    delete from public.studios where id = v_old_studio_id;
  end if;
  delete from auth.users where email like '%@yogaone.demo';
end $$;

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
  v_instructor1_id uuid; -- 김서연
  v_instructor2_id uuid; -- 이하늘
  v_instructor3_id uuid; -- 박지호
  v_member1_id uuid;  -- 정민아
  v_member2_id uuid;  -- 오세라
  v_member3_id uuid;  -- 한지우
  v_member4_id uuid;  -- 최윤
  v_member5_id uuid;  -- 윤아름
  v_member6_id uuid;  -- 강다인
  v_member7_id uuid;  -- 서준혁
  v_member8_id uuid;  -- 노은지
  v_member9_id uuid;  -- 장하민
  v_member10_id uuid; -- 백지원
  v_member11_id uuid; -- 배수현
  v_member12_id uuid; -- 임가을
  v_member13_id uuid; -- 문세진
  v_member14_id uuid; -- 조현우

  v_tpl_vinyasa uuid;
  v_tpl_hatha uuid;
  v_tpl_ashtanga uuid;
  v_tpl_stretch uuid;
  v_tpl_power uuid;

  v_session_id uuid;
  v_past_session_id uuid;
  v_past_date date;
begin
  -- ---- Studio + people ------------------------------------------------
  insert into public.studios (name) values ('마음요가원') returning id into v_studio_id;

  v_owner_id       := pg_temp.seed_create_user('owner@yogaone.demo',       'demo1234', '김원장');
  v_instructor1_id := pg_temp.seed_create_user('instructor1@yogaone.demo', 'demo1234', '김서연');
  v_instructor2_id := pg_temp.seed_create_user('instructor2@yogaone.demo', 'demo1234', '이하늘');
  v_instructor3_id := pg_temp.seed_create_user('instructor3@yogaone.demo', 'demo1234', '박지호');
  v_member1_id     := pg_temp.seed_create_user('member1@yogaone.demo',     'demo1234', '정민아');
  v_member2_id     := pg_temp.seed_create_user('member2@yogaone.demo',     'demo1234', '오세라');
  v_member3_id     := pg_temp.seed_create_user('member3@yogaone.demo',     'demo1234', '한지우');
  v_member4_id     := pg_temp.seed_create_user('member4@yogaone.demo',     'demo1234', '최윤');
  v_member5_id     := pg_temp.seed_create_user('member5@yogaone.demo',     'demo1234', '윤아름');
  v_member6_id     := pg_temp.seed_create_user('member6@yogaone.demo',     'demo1234', '강다인');
  v_member7_id     := pg_temp.seed_create_user('member7@yogaone.demo',     'demo1234', '서준혁');
  v_member8_id     := pg_temp.seed_create_user('member8@yogaone.demo',     'demo1234', '노은지');
  v_member9_id     := pg_temp.seed_create_user('member9@yogaone.demo',     'demo1234', '장하민');
  v_member10_id    := pg_temp.seed_create_user('member10@yogaone.demo',    'demo1234', '백지원');
  v_member11_id    := pg_temp.seed_create_user('member11@yogaone.demo',    'demo1234', '배수현');
  v_member12_id    := pg_temp.seed_create_user('member12@yogaone.demo',    'demo1234', '임가을');
  v_member13_id    := pg_temp.seed_create_user('member13@yogaone.demo',    'demo1234', '문세진');
  v_member14_id    := pg_temp.seed_create_user('member14@yogaone.demo',    'demo1234', '조현우');

  -- phone is populated for all so 이메일 찾기 (find_email_by_name_phone,
  -- 20260805000000) has real matches to test against, not just the one demo
  -- account someone happens to remember to update by hand.
  insert into public.profiles (id, studio_id, role, full_name, contract_status, phone) values
    (v_owner_id,       v_studio_id, 'owner',      '김원장', 'not_required', '010-1000-0001'),
    (v_instructor1_id, v_studio_id, 'instructor', '김서연', 'not_required', '010-1000-0002'),
    (v_instructor2_id, v_studio_id, 'instructor', '이하늘', 'not_required', '010-1000-0003'),
    (v_instructor3_id, v_studio_id, 'instructor', '박지호', 'not_required', '010-1000-0004'),
    (v_member1_id,     v_studio_id, 'member',     '정민아', 'signed',       '010-1000-0005'),
    (v_member2_id,     v_studio_id, 'member',     '오세라', 'signed',       '010-1000-0006'),
    (v_member3_id,     v_studio_id, 'member',     '한지우', 'signed',       '010-1000-0007'),
    (v_member4_id,     v_studio_id, 'member',     '최윤',   'signed',       '010-1000-0008'),
    (v_member5_id,     v_studio_id, 'member',     '윤아름', 'signed',       '010-1000-0009'),
    (v_member6_id,     v_studio_id, 'member',     '강다인', 'signed',       '010-1000-0010'),
    (v_member7_id,     v_studio_id, 'member',     '서준혁', 'signed',       '010-1000-0011'),
    (v_member8_id,     v_studio_id, 'member',     '노은지', 'signed',       '010-1000-0012'),
    (v_member9_id,     v_studio_id, 'member',     '장하민', 'signed',       '010-1000-0013'),
    (v_member10_id,    v_studio_id, 'member',     '백지원', 'signed',       '010-1000-0014'),
    (v_member11_id,    v_studio_id, 'member',     '배수현', 'signed',       '010-1000-0015'),
    (v_member12_id,    v_studio_id, 'member',     '임가을', 'signed',       '010-1000-0016'),
    (v_member13_id,    v_studio_id, 'member',     '문세진', 'signed',       '010-1000-0017'),
    (v_member14_id,    v_studio_id, 'member',     '조현우', 'pending',      '010-1000-0018');

  -- ---- Unused invites (admin/invites screen shouldn't start empty) ----
  insert into public.invites (studio_id, role, code, expires_at, created_by) values
    (v_studio_id, 'instructor', 'demo-instr',  now() + interval '7 days', v_owner_id),
    (v_studio_id, 'member',     'demo-member', now() + interval '7 days', v_owner_id);

  -- ---- Class templates --------------------------------------------------
  -- day_of_week matches extract(dow from date): 0=Sun ... 6=Sat. Template 3
  -- is taught by the owner directly -- exercises the "owner assigned as
  -- instructor" path proxy.ts's allowedPathPrefixes() carves out. Titles
  -- stay ours (not the design mockup's '새벽'/'하타 베이직'/'오전(인텐시브)'/etc.)
  -- -- see the comment at the top of lib/membership-plans.ts for why: those
  -- names are keyed to the mockup's own FEES string-matching, which this
  -- schema has no equivalent for.
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
  select id into v_session_id
    from public.class_sessions where template_id = v_tpl_vinyasa order by date asc limit 1;
  insert into public.bookings (session_id, member_id, status) values
    (v_session_id, v_member1_id, 'booked'),
    (v_session_id, v_member2_id, 'booked'),
    (v_session_id, v_member3_id, 'waitlisted');

  -- Hatha (capacity 10): 6 booked, room to spare.
  select id into v_session_id
    from public.class_sessions where template_id = v_tpl_hatha order by date asc limit 1;
  insert into public.bookings (session_id, member_id, status) values
    (v_session_id, v_member4_id, 'booked'),
    (v_session_id, v_member5_id, 'booked'),
    (v_session_id, v_member6_id, 'booked'),
    (v_session_id, v_member7_id, 'booked'),
    (v_session_id, v_member8_id, 'booked'),
    (v_session_id, v_member9_id, 'booked');

  -- Ashtanga (capacity 8, owner-taught): 5 booked.
  select id into v_session_id
    from public.class_sessions where template_id = v_tpl_ashtanga order by date asc limit 1;
  insert into public.bookings (session_id, member_id, status) values
    (v_session_id, v_member10_id, 'booked'),
    (v_session_id, v_member11_id, 'booked'),
    (v_session_id, v_member12_id, 'booked'),
    (v_session_id, v_member13_id, 'booked'),
    (v_session_id, v_member14_id, 'booked');

  -- Evening stretch (capacity 15, the roomiest class): 9 booked.
  select id into v_session_id
    from public.class_sessions where template_id = v_tpl_stretch order by date asc limit 1;
  insert into public.bookings (session_id, member_id, status) values
    (v_session_id, v_member6_id, 'booked'),
    (v_session_id, v_member7_id, 'booked'),
    (v_session_id, v_member8_id, 'booked'),
    (v_session_id, v_member9_id, 'booked'),
    (v_session_id, v_member10_id, 'booked'),
    (v_session_id, v_member11_id, 'booked'),
    (v_session_id, v_member12_id, 'booked'),
    (v_session_id, v_member13_id, 'booked'),
    (v_session_id, v_member14_id, 'booked');

  -- Weekend power (capacity 10): 3 booked.
  select id into v_session_id
    from public.class_sessions where template_id = v_tpl_power order by date asc limit 1;
  insert into public.bookings (session_id, member_id, status) values
    (v_session_id, v_member1_id, 'booked'),
    (v_session_id, v_member4_id, 'booked'),
    (v_session_id, v_member6_id, 'booked');

  -- ---- One past vinyasa session, for attendance history -------------------
  -- _generate_sessions_internal only ever emits today-or-later dates, so
  -- there's nothing to mark attended/no_show against without inserting a
  -- past occurrence directly. Exactly 7 days before the nearest upcoming
  -- vinyasa session lands on the same weekday and is always strictly in the
  -- past, so it doesn't collide with class_sessions' unique(template_id, date).
  select date into v_past_date
    from public.class_sessions where template_id = v_tpl_vinyasa order by date asc limit 1;
  v_past_date := v_past_date - 7;

  insert into public.class_sessions (template_id, studio_id, date, instructor_id, capacity) values
    (v_tpl_vinyasa, v_studio_id, v_past_date, v_instructor1_id, 2)
    returning id into v_past_session_id;

  insert into public.bookings (session_id, member_id, status) values
    (v_past_session_id, v_member1_id, 'attended'),
    (v_past_session_id, v_member2_id, 'no_show'),
    (v_past_session_id, v_member3_id, 'cancelled');

  -- ---- Membership registrations for the 회원 관리 roster ------------------
  -- member11-14 stay 'unregistered' (no member_registrations row)
  -- deliberately, so the roster/detail-sheet's graceful no-registration-data
  -- path has something real to render against, not just the happy path.
  -- invite_id is left null throughout: all 14 already existed as accepted
  -- profiles before this registration data was added (created directly by
  -- seed_create_user, not through register_member's invite flow), so
  -- there's no real invite row to backfill against -- the column exists for
  -- register_member's own atomic insert, not because every registration
  -- must have one. Prices follow lib/membership-plans.ts's
  -- computeMembershipPrice() formula (gross * (1 - term discount), rounded
  -- to the nearest 1000).
  insert into public.member_registrations
    (studio_id, profile_id, full_name, phone, email, plan, term_months, start_date, classes, total_price, agreements, signature_name, signed_at, created_by) values
    -- 정민아: 주 3회, 3개월, 60일 전 개시 -> 여유 있음 ('active')
    (v_studio_id, v_member1_id, '정민아', '010-1000-0005', 'member1@yogaone.demo', 'w3', 3, current_date - 60,
     array['빈야사 플로우', '하타 요가'], 445000,
     '{"terms":true,"privacy":true,"refund":true,"safety":true,"marketing":true,"photo":true}'::jsonb,
     '정민아', now() - interval '60 days', v_owner_id),
    -- 오세라: 주 2회, 1개월, 20일 전 개시 -> 10일 안에 만료 ('soon')
    (v_studio_id, v_member2_id, '오세라', '010-1000-0006', 'member2@yogaone.demo', 'w2', 1, current_date - 20,
     array['빈야사 플로우'], 130000,
     '{"terms":true,"privacy":true,"refund":true,"safety":true,"marketing":false,"photo":false}'::jsonb,
     '오세라', now() - interval '20 days', v_owner_id),
    -- 한지우: 주 5회, 6개월, 200일 전 개시 -> 이미 만료 ('expired')
    (v_studio_id, v_member3_id, '한지우', '010-1000-0007', 'member3@yogaone.demo', 'w5', 6, current_date - 200,
     '{}'::text[], 1071000,
     '{"terms":true,"privacy":true,"refund":true,"safety":true,"marketing":true,"photo":false}'::jsonb,
     '한지우', now() - interval '200 days', v_owner_id),
    -- 최윤: 주 4회, 3개월, 15일 전 개시 -> 여유 있음
    (v_studio_id, v_member4_id, '최윤', '010-1000-0008', 'member4@yogaone.demo', 'w4', 3, current_date - 15,
     array['하타 요가', '주말 파워 요가'], 513000,
     '{"terms":true,"privacy":true,"refund":true,"safety":true,"marketing":true,"photo":true}'::jsonb,
     '최윤', now() - interval '15 days', v_owner_id),
    -- 윤아름: 주 2회, 1개월, 18일 전 개시 -> 만료 임박
    (v_studio_id, v_member5_id, '윤아름', '010-1000-0009', 'member5@yogaone.demo', 'w2', 1, current_date - 18,
     array['하타 요가'], 130000,
     '{"terms":true,"privacy":true,"refund":true,"safety":true,"marketing":false,"photo":true}'::jsonb,
     '윤아름', now() - interval '18 days', v_owner_id),
    -- 강다인: 주 3회, 6개월, 160일 전 개시 -> 여유 있음
    (v_studio_id, v_member6_id, '강다인', '010-1000-0010', 'member6@yogaone.demo', 'w3', 6, current_date - 160,
     array['하타 요가', '저녁 스트레칭', '주말 파워 요가'], 841000,
     '{"terms":true,"privacy":true,"refund":true,"safety":true,"marketing":true,"photo":false}'::jsonb,
     '강다인', now() - interval '160 days', v_owner_id),
    -- 서준혁: 주 4회, 1개월, 27일 전 개시 -> 만료 임박
    (v_studio_id, v_member7_id, '서준혁', '010-1000-0011', 'member7@yogaone.demo', 'w4', 1, current_date - 27,
     array['하타 요가', '저녁 스트레칭'], 190000,
     '{"terms":true,"privacy":true,"refund":true,"safety":true,"marketing":false,"photo":false}'::jsonb,
     '서준혁', now() - interval '27 days', v_owner_id),
    -- 노은지: 주 5회, 3개월, 5일 전 개시 -> 여유 있음
    (v_studio_id, v_member8_id, '노은지', '010-1000-0012', 'member8@yogaone.demo', 'w5', 3, current_date - 5,
     array['하타 요가', '저녁 스트레칭'], 567000,
     '{"terms":true,"privacy":true,"refund":true,"safety":true,"marketing":true,"photo":true}'::jsonb,
     '노은지', now() - interval '5 days', v_owner_id),
    -- 장하민: 주 4회, 6개월, 185일 전 개시 -> 이미 만료
    (v_studio_id, v_member9_id, '장하민', '010-1000-0013', 'member9@yogaone.demo', 'w4', 6, current_date - 185,
     array['하타 요가', '저녁 스트레칭'], 969000,
     '{"terms":true,"privacy":true,"refund":true,"safety":true,"marketing":false,"photo":true}'::jsonb,
     '장하민', now() - interval '185 days', v_owner_id),
    -- 백지원: 주 2회, 3개월, 80일 전 개시 -> 만료 임박
    (v_studio_id, v_member10_id, '백지원', '010-1000-0014', 'member10@yogaone.demo', 'w2', 3, current_date - 80,
     array['아쉬탕가', '저녁 스트레칭'], 351000,
     '{"terms":true,"privacy":true,"refund":true,"safety":true,"marketing":true,"photo":false}'::jsonb,
     '백지원', now() - interval '80 days', v_owner_id);

  -- ---- Notices (공지사항 관리 screen shouldn't start empty either) --------
  insert into public.notices (studio_id, title, body, target, pin, views, created_by, created_at) values
    (v_studio_id, '8월 15일(토) 광복절 휴무 안내',
     '8월 15일 토요일은 광복절로 전 수업이 휴강입니다.' || chr(10) ||
     '해당 주 회차는 다음 주로 이월되며, 정기권 만료일은 하루 연장됩니다.' || chr(10) || chr(10) ||
     '예약해두신 수업은 자동으로 취소되고 횟수는 차감되지 않습니다. 문의는 채팅으로 남겨주세요.',
     'all', true, 132, v_owner_id, now() - interval '3 days'),
    (v_studio_id, '9월 정기권 결제 안내',
     '9월 정기권 결제는 8월 25일(화)부터 받습니다.' || chr(10) || chr(10) ||
     '· 주 2회 · 주 3회 · 주 4회 · 주 5회' || chr(10) ||
     '· 결제는 데스크 또는 계좌이체' || chr(10) || chr(10) ||
     '8월 말일까지 결제하신 분은 9월 1일부터 바로 예약할 수 있습니다.',
     'member', true, 98, v_owner_id, now() - interval '5 days'),
    (v_studio_id, '9월 시간표 배정 회의 — 8월 20일 21:00',
     '9월 시간표를 확정하는 회의를 8월 20일 목요일 21시, 2층 라운지에서 진행합니다.' || chr(10) || chr(10) ||
     '희망 요일과 시간대를 8월 18일까지 채팅으로 보내주세요. 대체 강사 가능 시간도 함께 적어주시면 배정이 수월합니다.',
     'instructor', false, 12, v_owner_id, now() - interval '8 days'),
    (v_studio_id, '샤워실 온수 배관 공사 (8/10~8/11)',
     '8월 10일(월)~11일(화) 이틀간 샤워실 온수 배관 공사를 합니다.' || chr(10) || chr(10) ||
     '해당 기간에는 탈의실만 이용할 수 있습니다. 수업은 정상 진행됩니다.',
     'all', false, 167, v_owner_id, now() - interval '12 days'),
    (v_studio_id, '매트 소독 방식 변경 안내',
     '7월 20일부터 수업 종료 후 매트 소독을 전담 인력이 일괄 진행합니다.' || chr(10) || chr(10) ||
     '수업이 끝나면 매트를 말아서 벽면 거치대에 세워두시면 됩니다. 개인 매트를 쓰시는 분은 그대로 이용하셔도 좋습니다.',
     'all', false, 143, v_owner_id, now() - interval '21 days');

  raise notice '';
  raise notice '=== Demo accounts (all passwords: demo1234) ===';
  raise notice '원장:  owner@yogaone.demo (김원장)';
  raise notice '강사:  instructor1@yogaone.demo(김서연) / instructor2@yogaone.demo(이하늘) / instructor3@yogaone.demo(박지호)';
  raise notice '회원:  member1@yogaone.demo ... member14@yogaone.demo';
  raise notice '================================================';
end $$;
