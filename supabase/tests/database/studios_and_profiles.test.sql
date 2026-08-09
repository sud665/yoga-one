begin;
select plan(14);

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

-- Fixture for assertions 7-9 below: a fresh auth.users row with NO profile
-- yet, so public.create_studio_and_owner_profile can be tested actually
-- creating the profile itself. Inserted directly (not via
-- tests.create_test_profile, which would pre-create the profile we're
-- testing the RPC creates), and up front alongside the other fixtures while
-- the session is still `postgres` -- test_fixtures only gets `select`
-- granted to authenticated/anon below, so inserting after any
-- authenticate_as/clear_authentication role switch would fail with
-- permission denied.
insert into test_fixtures (key, value) values ('new_owner', gen_random_uuid());
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values (
  (select value from test_fixtures where key = 'new_owner'),
  (select value from test_fixtures where key = 'new_owner') || '@test.local',
  '', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated'
);

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

-- 4) member가 본인 role을 owner로 바꾸려 하면 거부된다. 최종 리뷰(Task 19)에서
--    profiles의 UPDATE grant/정책을 authenticated에서 완전히 제거했으므로, 이제는
--    profiles_prevent_privilege_escalation 트리거가 실행되기도 전에 grant 단계에서
--    42501 permission denied로 막힌다 -- 원래 이 자리에서 검증하던 'not_permitted_role_change'
--    (트리거가 던지는 커스텀 예외)보다 한 단계 앞서 차단되는 셈이라, 기대 에러 문구를
--    Postgres의 grant-check 메시지로 바꾼다.
--
-- throws_ok(sql, arg2, arg3)의 실제 디스패치(pgTAP 소스로 직접 확인): arg2가
-- 정확히 5바이트면 SQLSTATE 코드로 취급해 arg3를 "설명"이 아니라 기대 에러
-- *메시지*로 소비한다(throws_ok(sql, arg2::char(5), arg3, NULL) 호출로 위임 --
-- 4번째 desctext 자리가 없다). 그래서 '42501'(정확히 5바이트)을 2번째 인자로 쓰면
-- 3번째 인자가 사람이 읽는 설명이 아니라 매칭 대상 메시지로 소비되어 항상 실패한다
-- (직접 재현해 확인함). 이 코드베이스의 기존 관용구대로(예: 'not_permitted',
-- 'already_booked') 전체 에러 메시지 문자열을 매칭 대상으로 쓴다 -- 5바이트가 아니므로
-- throws_ok(sql, NULL, arg2, arg3)로 위임되어 arg3가 정상적으로 설명 자리에 들어간다.
select throws_ok(
  format('update public.profiles set role = %L where id = %L', 'owner', (select value from test_fixtures where key = 'member_b')),
  'permission denied for table profiles',
  'member cannot escalate their own role (blocked at the grant level -- no UPDATE grant on profiles at all now)'
);

-- 5) member는 이제 본인의 비특권 필드(full_name)조차 수정할 수 없다 -- UPDATE grant
--    자체를 제거했으므로 "자기 자신의 안전한 필드"라는 예외 없이 전체 UPDATE 표면이
--    막힌다 (Task 19 최종 리뷰: 아무 코드도 profiles를 update하지 않으므로 이 표면은
--    쓰이지 않는 리스크였다). 그 주석이 예고한 "전용 RPC"는 20260803000000의
--    update_my_profile로 실제로 열렸지만(프로필 화면), 이 단언은 그대로 유효하다 --
--    새로 열린 건 full_name/phone만 건드리는 함수 하나지 테이블 UPDATE 표면이
--    아니고, client SDK로 role/studio_id/contract_status를 직접 조작할 수 있는
--    통로는 여전히 없어야 한다. RPC 쪽 검증은 update_my_profile.test.sql에 있다.
select throws_ok(
  format('update public.profiles set full_name = %L where id = %L', 'Member B Updated', (select value from test_fixtures where key = 'member_b')),
  'permission denied for table profiles',
  'a member can no longer update even their own non-privileged fields directly (UPDATE grant removed entirely)'
);

-- 6) 인증 없이는 studios가 하나도 안 보인다
select tests.clear_authentication();
select is(
  (select count(*)::int from public.studios),
  0,
  'unauthenticated session sees no studios'
);

-- 7) 아직 프로필이 없는 새 유저(new_owner fixture)는
--    public.create_studio_and_owner_profile로 스튜디오를 부트스트랩할 수
--    있다 (owner role, non-null studio_id 반환)
select tests.authenticate_as((select value from test_fixtures where key = 'new_owner'));

create temporary table bootstrap_result as
select * from public.create_studio_and_owner_profile('New Studio Name', 'New Owner');

select is(
  (select role::text from bootstrap_result),
  'owner',
  'create_studio_and_owner_profile returns a profile with role=owner for a fresh user'
);

select ok(
  (select studio_id from bootstrap_result) is not null,
  'create_studio_and_owner_profile returns a non-null studio_id'
);

-- 8) 생성된 studios row의 name이 전달한 인자와 일치한다
select is(
  (select name from public.studios where id = (select studio_id from bootstrap_result)),
  'New Studio Name',
  'create_studio_and_owner_profile creates a studio with the given name'
);

-- 9) 이미 프로필이 있는 유저가 다시 호출하면 profile_already_exists로 거부된다
select throws_ok(
  $$select public.create_studio_and_owner_profile('Second Studio', 'Second Owner')$$,
  'profile_already_exists',
  'create_studio_and_owner_profile refuses a user who already has a profile'
);

-- 10) service_role/postgres 컨텍스트에서는 profiles_prevent_privilege_escalation
--    트리거 자체가 여전히 살아있다. 최종 리뷰(Task 19)가 profiles의 UPDATE
--    grant를 authenticated에서 완전히 제거한 뒤로(assertion 4/5 참고),
--    assertion 4가 원래 검증하던 not_permitted_role_change 예외는 grant
--    단계의 42501 permission denied에 가려져 더 이상 어떤 assertion도 이
--    트리거에 도달하지 못하고 있었다 -- 이제 이 트리거는 오직 service_role
--    (자기 UPDATE grant를 그대로 유지하고, RLS를 우회하더라도 트리거 실행
--    대상에서 예외가 되는 건 아니다)을 통해서만 도달 가능한데, 그 경로를
--    검증하는 assertion이 하나도 없었다. 아래는 그 경로를 직접 재현한다.
--
-- class_schedule.test.sql의 크론 격리 회귀 테스트(7-8번, instructor_g 강등)와
-- 동일한 패턴을 그대로 따른다: tests.bypass_rls()가 아니라
-- tests.authenticate_as로 request.jwt.claim.sub을 원하는 행위자(member_b,
-- non-owner)로 고정해 둔 채 `set local role postgres`만 호출해 실행 role만
-- postgres로 올린다. tests.bypass_rls()는 claim도 함께 지워버려
-- current_role()이 NULL이 되므로 -- NULL도 'owner'와는 distinct라 트리거는
-- 여전히 막겠지만, 그러면 "특정 non-owner 프로필이 행위자인 경우"라는 이
-- assertion의 조건 자체가 흐려진다. 이 상태에서 UPDATE 자체는 grant/RLS를
-- 모두 통과하므로, 트리거가 여전히 살아서 not_permitted_role_change를
-- 던지는지만 순수하게 검증한다.
select tests.authenticate_as((select value from test_fixtures where key = 'member_b'));
set local role postgres;
select throws_ok(
  format('update public.profiles set role = %L where id = %L', 'owner', (select value from test_fixtures where key = 'member_b')),
  'not_permitted_role_change',
  'profiles_prevent_privilege_escalation still rejects a non-owner role change when the UPDATE reaches the table (service_role/postgres context, past the grant-level block)'
);

-- 12) 원장은 자기 스튜디오 이름을 고칠 수 있다
-- (20260809000000_studio_update_policy.sql -- 프로필 화면의 요가원 정보
-- 카드가 쓰는 update 정책).
select tests.authenticate_as((select value from test_fixtures where key = 'owner_a'));
update public.studios set name = 'Studio A 새이름' where id = (select value from test_fixtures where key = 'studio_a');
select is(
  (select name from public.studios where id = (select value from test_fixtures where key = 'studio_a')),
  'Studio A 새이름',
  'an owner can rename their own studio'
);

-- 13) 다른 스튜디오는 owner라도 못 고친다 -- USING이 0행을 매칭해 조용히
-- no-op (에러가 아니라 무시). bypass로 원래 이름 그대로인지 확인.
update public.studios set name = '탈취 시도' where id = (select value from test_fixtures where key = 'studio_b');
select tests.bypass_rls();
select is(
  (select name from public.studios where id = (select value from test_fixtures where key = 'studio_b')),
  'Studio B',
  'an owner cannot rename another studio (RLS matches zero rows)'
);

-- 14) 비owner(회원)는 자기 스튜디오 이름도 못 고친다
select tests.authenticate_as((select value from test_fixtures where key = 'member_b'));
update public.studios set name = '회원이 바꾼 이름' where id = (select value from test_fixtures where key = 'studio_b');
select tests.bypass_rls();
select is(
  (select name from public.studios where id = (select value from test_fixtures where key = 'studio_b')),
  'Studio B',
  'a member cannot rename their studio (owner-only policy)'
);

select tests.clear_authentication();
select finish();
rollback;
