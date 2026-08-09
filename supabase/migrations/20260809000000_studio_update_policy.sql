-- ---------------------------------------------------------------------------
-- 요가원 정보(스튜디오명) 수정 -- 프로필 화면의 새 "요가원 정보" 카드가
-- 쓰는 권한. studios에는 지금까지 select 정책("studios: view own studio")
-- 하나뿐이라 이름을 지을 수는 있어도(가입 시 RPC가 생성) 고칠 방법이
-- 없었다. invites/notices의 "owner manages own studio X" 패턴 그대로,
-- update만 연다 -- insert는 create_studio_and_owner_profile RPC 전용
-- 경로로 남고, delete(폐업)는 소유권 이전/정산이 필요한 별개 설계라 열지
-- 않는다.
-- ---------------------------------------------------------------------------
create policy "studios: owner updates own studio"
  on public.studios for update
  using (id = public.current_studio_id() and public.current_role() = 'owner')
  with check (id = public.current_studio_id() and public.current_role() = 'owner');

-- 정책만으론 부족하다: studios는 첫 마이그레이션(20260724100000)에서
-- `alter default privileges` 설정 **이전에** 만들어진 테이블이라 그 자동
-- DML grant를 받지 못했고, 지금까지의 명시 grant는 select뿐이다 -- 정책이
-- 있어도 grant가 없으면 `permission denied for table studios`로 먼저
-- 막힌다 (pgTAP에서 실제로 그렇게 실패해 발견). name 컬럼만 연다:
-- id/created_at까지 열 이유가 없고, 컬럼 단위 grant가 profiles의
-- "블랭킷 update grant가 role 탈취 통로가 됐던" 전례(20260724100006)를
-- 같은 종류의 실수로 반복하지 않는 가장 좁은 형태다.
grant update (name) on public.studios to authenticated;
