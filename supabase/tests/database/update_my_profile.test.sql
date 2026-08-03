begin;
select plan(9);

create temporary table test_fixtures (key text primary key, value uuid);
-- postgres(테이블 소유자) 상태에서 미리 권한을 준다 -- authenticate_as로 역할을
-- 바꾼 뒤의 fixture 조회가 permission denied로 죽지 않도록 (CLAUDE.md).
grant select on test_fixtures to authenticated, anon;

insert into public.studios (id, name) values ('44444444-0000-0000-0000-000000000000', 'Studio I');
insert into test_fixtures values ('studio_i', '44444444-0000-0000-0000-000000000000');
insert into test_fixtures (key, value)
  select 'member_i', tests.create_test_profile((select value from test_fixtures where key = 'studio_i'), 'member', 'Member I');
-- 같은 스튜디오의 두 번째 회원. 7번 단언(다른 사람 행은 안 건드린다)의 대조군이며,
-- 같은 스튜디오여야 "profiles: view same studio" 정책 아래에서 조회가 가능해
-- 변화 없음을 실제로 확인할 수 있다.
insert into test_fixtures (key, value)
  select 'member_j', tests.create_test_profile((select value from test_fixtures where key = 'studio_i'), 'member', 'Member J');

select tests.authenticate_as((select value from test_fixtures where key = 'member_i'));

select lives_ok(
  $$select public.update_my_profile('이름 바뀜', '010-1234-5678')$$,
  'a member can edit their own profile through the RPC'
);

select is(
  (select full_name from public.profiles where id = (select value from test_fixtures where key = 'member_i')),
  '이름 바뀜',
  'update_my_profile writes full_name'
);

select is(
  (select phone from public.profiles where id = (select value from test_fixtures where key = 'member_i')),
  '010-1234-5678',
  'update_my_profile writes phone'
);

-- 폼이 비워진 전화번호 입력을 ''로 보내므로, NULL로 접히는지 확인한다. 안 그러면
-- 컬럼에 "비었지만 NULL은 아닌" 행이 쌓이고 `phone is null` 조회가 어긋난다.
select public.update_my_profile('이름 바뀜', '   ');
select is(
  (select phone from public.profiles where id = (select value from test_fixtures where key = 'member_i')),
  null,
  'a blank phone collapses to NULL rather than an empty string'
);

-- 이 RPC의 존재 이유: 20260724100006이 profiles의 UPDATE 표면을 통째로 닫은 건
-- 회원이 스스로 role/studio_id를 바꿔 escalate하는 경로를 막기 위해서였다. 컬럼
-- 목록을 함수 본문에 못박았으므로 이름을 고쳐도 그 두 컬럼은 그대로여야 한다.
select is(
  (select role::text from public.profiles where id = (select value from test_fixtures where key = 'member_i')),
  'member',
  'update_my_profile leaves role untouched (the reason the table-level UPDATE grant stays revoked)'
);

select is(
  (select studio_id from public.profiles where id = (select value from test_fixtures where key = 'member_i')),
  (select value from test_fixtures where key = 'studio_i'),
  'update_my_profile leaves studio_id untouched'
);

select throws_ok(
  $$select public.update_my_profile('   ', null)$$,
  'full_name_required',
  'a blank full_name is rejected rather than blanking the column'
);

-- 다른 회원 행은 손대지 않는다. 이 함수는 대상 id를 인자로 받지 않고 auth.uid()로만
-- 정하므로 애초에 남의 행을 지정할 방법이 없지만, 그 설계가 실제로 유지되는지를
-- 단언으로 고정해 둔다.
select is(
  (select full_name from public.profiles where id = (select value from test_fixtures where key = 'member_j')),
  'Member J',
  'another member in the same studio is unaffected'
);

-- 20260802010000이 남긴 규칙을 새 함수에도 고정한다: 호스티드 Supabase는
-- alter default privileges로 anon에게 EXECUTE를 주기 때문에, grant 단계가
-- 실제로 잠겨 있는지는 단언으로 확인하지 않으면 로컬에서만 안전해 보인다.
-- clear_authentication()은 anon 전환이다(bypass_rls()와 다름 -- CLAUDE.md).
select tests.clear_authentication();
select throws_ok(
  $$select public.update_my_profile('anon', null)$$,
  'permission denied for function update_my_profile',
  'anon cannot execute update_my_profile at all (blocked at the grant level, before the function body)'
);

select * from finish();
rollback;
