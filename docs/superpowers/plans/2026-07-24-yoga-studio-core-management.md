# 요가원 관리 PWA — 코어(회원·강사·클래스) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 요가원(요가 스튜디오) 멀티테넌트 SaaS의 코어 — 원장/강사/회원 3역할 로그인, 강사·회원 관리, 반복 시간표·예약·정원/대기명단·출석 — 을 Next.js + Supabase 기반 PWA로 구현한다.

**Architecture:** Next.js(App Router)에서 조회·실시간은 Supabase 클라이언트 SDK + RLS로 직접 처리하고, 정원 체크·대기명단 승격처럼 동시성에 민감한 쓰기는 Postgres SECURITY DEFINER RPC(단일 트랜잭션, row lock)로 원자적으로 처리한다. 멀티테넌시는 공유 스키마 + `studio_id` 컬럼 + RLS로 격리한다.

**Tech Stack:** Next.js 15(App Router, TypeScript) · Supabase(Postgres, Auth, Realtime) · `@supabase/ssr` · Tailwind CSS · Serwist(PWA) · Vitest(단위/통합) · pgTAP(DB) · Playwright(E2E) · Vercel 배포

## Global Constraints

- 이번 스펙 범위는 회원관리·강사관리·클래스관리뿐이다. 수강료관리·채팅·전자계약은 구현하지 않는다 (`profiles.contract_status` 필드만 존재).
- 멀티테넌트: 모든 테이블에 `studio_id`가 있고 RLS로 테넌트 격리한다. 예외 없음.
- 역할은 `owner`(원장) · `instructor`(강사) · `member`(회원) 3종. 전부 Supabase Auth로 로그인한다.
- 강사/회원 가입은 반드시 원장이 발급한 초대 코드를 경유한다. 초대 없는 임의 가입 경로는 없다.
- 예약은 v1에서 수강권(횟수권/기간권) 유효성 검사를 하지 않는다 — 회원이면 누구나 자유 예약.
- 예약 취소는 마감 시간(cutoff) 제한이 없다.
- 대기명단 자동 승격 시 별도 알림(푸시/문자)이 없다.
- 인증 방식은 이메일/비밀번호 + 카카오 OAuth 둘 다 지원한다.
- PWA는 설치가능성 + 반응형만 목표. 오프라인 데이터 캐싱/동기화는 구현하지 않는다.
- 배포 대상은 Vercel.
- `class_templates`/`class_sessions`의 `instructor_id`는 role이 `instructor`뿐 아니라 `owner`인 프로필도 참조 가능해야 한다.
- 모든 파일 경로는 저장소 루트(`/Users/max/Desktop/max/yoga-one`) 기준 상대경로다. 각 태스크 시작 전 저장소 루트로 이동한다: `cd /Users/max/Desktop/max/yoga-one`.
- DB 마이그레이션 적용 후에는 항상 `npx supabase db reset`으로 전체 재적용하고, `npx supabase test db`로 pgTAP 테스트를 돌린 뒤, `npx supabase gen types typescript --local > lib/database.types.ts`로 타입을 재생성한다.

---

## Task 1: 프로젝트 스캐폴드 (Next.js + Supabase CLI + 테스트 도구)

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.eslintrc.json` (또는 `eslint.config.mjs`) — create-next-app이 생성
- Create: `supabase/config.toml` (`supabase/migrations/`은 Task 2에서 첫 마이그레이션과 함께 생성됨)
- Create: `vitest.config.ts`, `tests/setup.ts`
- Create: `playwright.config.ts`
- Modify: `.gitignore` (create-next-app 버전으로 교체)
- Modify: `package.json` (test/db 스크립트 추가)

**Interfaces:**
- Produces: `npm run dev`, `npm test`(vitest), `npm run test:e2e`(playwright), `npx supabase start`/`db reset`/`test db` 명령이 전부 동작하는 베이스라인.

- [ ] **Step 1: Next.js를 임시 폴더에 스캐폴드하고 저장소로 병합**

```bash
cd /Users/max/Desktop/max/yoga-one
SCAFFOLD_DIR=$(mktemp -d)
npx -y create-next-app@latest "$SCAFFOLD_DIR/app" \
  --typescript --tailwind --eslint --app --no-src-dir \
  --import-alias "@/*" --use-npm
rsync -a --exclude='.git' "$SCAFFOLD_DIR/app/" ./
rm -rf "$SCAFFOLD_DIR"
```

CLI가 대화형으로 물어보면: TypeScript 예, ESLint 예, Tailwind 예, `src/` 디렉터리 아니오, App Router 예, import alias `@/*`.

- [ ] **Step 2: 스캐폴드 확인**

Run: `cat package.json | grep '"next"'`
Expected: `"next"` 의존성 버전 라인이 출력됨 (예: `"next": "^15.x.x"`)

Run: `ls app/ DESIGN.md docs/superpowers/specs/`
Expected: `app/layout.tsx`, `app/page.tsx`, `DESIGN.md`, 스펙 md 파일이 모두 보임 (기존 파일이 지워지지 않았는지 확인)

- [ ] **Step 3: Supabase CLI를 devDependency로 추가하고 초기화**

```bash
npm install --save-dev supabase
npx supabase init
```

Expected: `supabase/config.toml`, `supabase/migrations/`, `supabase/seed.sql` 생성됨.

- [ ] **Step 4: Kakao OAuth provider를 config.toml에 추가**

`supabase/config.toml`의 `[auth]` 섹션 뒤에 추가:

```toml
[auth.external.kakao]
enabled = true
client_id = "env(KAKAO_CLIENT_ID)"
secret = "env(KAKAO_CLIENT_SECRET)"
```

- [ ] **Step 5: 로컬 Supabase 스택 기동 (Docker Desktop 실행 중이어야 함)**

```bash
npx supabase start
```

Expected: 출력 마지막에 `API URL`, `anon key`, `service_role key` 등이 표시됨. 이 값들을 아래 Step 6에서 사용한다. (최초 실행은 Docker 이미지를 받아오느라 몇 분 걸릴 수 있다.)

`KAKAO_CLIENT_ID`/`KAKAO_CLIENT_SECRET`가 아직 셸 환경에 없는 상태로 실행하는 것이라, Step 4의 `env(KAKAO_CLIENT_ID)` 참조 때문에 에러가 나면: `supabase/config.toml`의 `[auth.external.kakao]` 블록을 임시로 주석처리하고 `supabase start`를 먼저 성공시킨 뒤, Step 6에서 `.env.local`을 만들고 나서 블록 주석을 해제하고 `npx supabase stop && npx supabase start`로 재기동한다.

- [ ] **Step 6: 환경변수 파일 작성**

`.env.local` 생성 (Step 5 출력값 중 `API URL`→`NEXT_PUBLIC_SUPABASE_URL`, `anon key`→`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `service_role key`→`SUPABASE_SERVICE_ROLE_KEY`로 매핑):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Step 5의 anon key 값>
SUPABASE_SERVICE_ROLE_KEY=<Step 5의 service_role key 값>
KAKAO_CLIENT_ID=<카카오 개발자 콘솔에서 발급, 우선 임시값 가능>
KAKAO_CLIENT_SECRET=<카카오 개발자 콘솔에서 발급, 우선 임시값 가능>
```

- [ ] **Step 7: Vitest 설치 및 설정**

```bash
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @supabase/supabase-js
```

`vitest.config.ts` 생성:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

`tests/setup.ts` 생성:

```typescript
import '@testing-library/jest-dom/vitest'
```

`package.json`의 `scripts`에 추가:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 8: 스모크 테스트 작성 및 실행**

`tests/smoke.test.ts` 생성:

```typescript
import { describe, it, expect } from 'vitest'

describe('toolchain smoke test', () => {
  it('runs basic assertions', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `npm test`
Expected: `tests/smoke.test.ts` 1개 테스트 PASS

- [ ] **Step 9: Playwright 설치 및 설정**

```bash
npm install --save-dev @playwright/test
npx playwright install --with-deps chromium
```

`playwright.config.ts` 생성:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

`package.json`의 `scripts`에 추가: `"test:e2e": "playwright test"`

`tests/e2e/smoke.spec.ts` 생성:

```typescript
import { test, expect } from '@playwright/test'

test('home page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/./)
})
```

Run: `npm run test:e2e`
Expected: `smoke.spec.ts` 1개 테스트 PASS (Next dev 서버가 자동 기동됨)

pgTAP 확장과 테스트 헬퍼 스키마는 `public.profiles`/`public.profile_role`을 참조하므로 Task 2에서 스키마와 함께 만든다 (Task 2 Step 2).

- [ ] **Step 10: 여기까지 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Scaffold Next.js app with Supabase CLI, Vitest, and Playwright

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: DB — studios, profiles, RLS, 원장 부트스트랩 RPC

**Files:**
- Create: `supabase/migrations/20260724100000_studios_and_profiles.sql`
- Create: `supabase/migrations/20260724100001_test_helpers.sql` (Task 1 Step 10에서 미룬 내용)
- Create: `supabase/tests/database/studios_and_profiles.test.sql`
- Create: `lib/types.ts`
- Modify: `lib/database.types.ts` (재생성, Step 4에서 최초 생성)

**Interfaces:**
- Produces: `public.profile_role` enum, `public.studios`, `public.profiles` 테이블. `public.current_studio_id()`, `public.current_role()` SQL 함수. `public.create_studio_and_owner_profile(p_studio_name text, p_full_name text) returns public.profiles` RPC.

- [ ] **Step 1: 스키마 + RLS + 부트스트랩 RPC 마이그레이션 작성**

`supabase/migrations/20260724100000_studios_and_profiles.sql`:

```sql
create table public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create type public.profile_role as enum ('owner', 'instructor', 'member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  role public.profile_role not null,
  full_name text not null,
  phone text,
  contract_status text not null default 'not_required' check (contract_status in ('not_required', 'pending', 'signed')),
  created_at timestamptz not null default now()
);

alter table public.studios enable row level security;
alter table public.profiles enable row level security;

create or replace function public.current_studio_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select studio_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_role()
returns public.profile_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create policy "studios: view own studio"
  on public.studios for select
  using (id = public.current_studio_id());

create policy "profiles: view same studio"
  on public.profiles for select
  using (studio_id = public.current_studio_id());

create policy "profiles: self or owner update"
  on public.profiles for update
  using (id = auth.uid() or (studio_id = public.current_studio_id() and public.current_role() = 'owner'));

create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role or new.studio_id is distinct from old.studio_id then
    if public.current_role() <> 'owner' then
      raise exception 'not_permitted_role_change';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_privilege_escalation();

create or replace function public.create_studio_and_owner_profile(p_studio_name text, p_full_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_studio_id uuid;
  v_profile public.profiles;
begin
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile_already_exists';
  end if;

  insert into public.studios (name) values (p_studio_name) returning id into v_studio_id;

  insert into public.profiles (id, studio_id, role, full_name, contract_status)
  values (auth.uid(), v_studio_id, 'owner', p_full_name, 'not_required')
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.create_studio_and_owner_profile(text, text) to authenticated;
```

- [ ] **Step 2: 테스트 헬퍼 마이그레이션 작성 (Task 1에서 미룬 것)**

`supabase/migrations/20260724100001_test_helpers.sql`:

```sql
create extension if not exists pgtap with schema extensions;

create schema if not exists tests;

create or replace function tests.create_test_profile(p_studio_id uuid, p_role public.profile_role, p_name text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  values (v_user_id, v_user_id || '@test.local', '', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');

  insert into public.profiles (id, studio_id, role, full_name, contract_status)
  values (v_user_id, p_studio_id, p_role, p_name, 'not_required');

  return v_user_id;
end;
$$;

create or replace function tests.authenticate_as(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  set local role authenticated;
end;
$$;

create or replace function tests.clear_authentication()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  set local role postgres;
end;
$$;
```

`auth.users`에 직접 INSERT하는 이 컬럼 목록은 로컬 Supabase CLI가 부트스트랩하는 표준 GoTrue 스키마 기준이다 (나머지 컬럼은 nullable이거나 기본값이 있다). Step 3에서 `npx supabase db reset` 실행 시 "column ... does not exist" 나 not-null 제약 위반 에러가 나면, `npx supabase db diff` 또는 로컬 스튜디오(`http://127.0.0.1:54323`)에서 `auth.users` 스키마를 직접 확인해 누락된 컬럼을 채워 넣는다.

- [ ] **Step 3: 마이그레이션 적용**

```bash
npx supabase db reset
```

Expected: 두 마이그레이션 모두 에러 없이 적용됨.

- [ ] **Step 4: pgTAP 테스트 작성**

`supabase/tests/database/studios_and_profiles.test.sql`:

```sql
begin;
select plan(6);

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

-- 4) member가 본인 role을 owner로 바꾸려 하면 거부된다
select throws_ok(
  format('update public.profiles set role = %L where id = %L', 'owner', (select value from test_fixtures where key = 'member_b')),
  'not_permitted_role_change',
  'member cannot escalate their own role'
);

-- 5) member가 본인 이름은 바꿀 수 있다
update public.profiles set full_name = 'Member B Updated' where id = (select value from test_fixtures where key = 'member_b');
select is(
  (select full_name from public.profiles where id = (select value from test_fixtures where key = 'member_b')),
  'Member B Updated',
  'member can update their own non-privileged fields'
);

-- 6) 인증 없이는 studios가 하나도 안 보인다
select tests.clear_authentication();
select is(
  (select count(*)::int from public.studios),
  0,
  'unauthenticated session sees no studios'
);

select tests.clear_authentication();
select finish();
rollback;
```

- [ ] **Step 5: pgTAP 테스트 실행**

```bash
npx supabase test db
```

Expected: `studios_and_profiles.test.sql`의 6개 assertion 모두 PASS.

- [ ] **Step 6: TypeScript 타입 생성**

```bash
npx supabase gen types typescript --local > lib/database.types.ts
```

`lib/types.ts` 생성:

```typescript
import type { Database } from './database.types'

export type Studio = Database['public']['Tables']['studios']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileRole = Database['public']['Enums']['profile_role']
```

- [ ] **Step 7: 커밋**

```bash
git add supabase lib/types.ts lib/database.types.ts
git commit -m "$(cat <<'EOF'
Add studios/profiles schema, tenant RLS, and owner bootstrap RPC

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: DB — invites, 초대 미리보기/수락 RPC

**Files:**
- Create: `supabase/migrations/20260724100002_invites.sql`
- Create: `supabase/tests/database/invites.test.sql`
- Modify: `lib/types.ts`

**Interfaces:**
- Consumes: `public.profiles`, `public.profile_role` (Task 2)
- Produces: `public.invites` 테이블. `public.get_invite_preview(p_code text) returns table(studio_name text, role public.profile_role, valid boolean)`. `public.accept_invite(p_code text, p_full_name text) returns public.profiles`.

- [ ] **Step 1: 마이그레이션 작성**

`supabase/migrations/20260724100002_invites.sql`:

```sql
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  role public.profile_role not null check (role in ('instructor', 'member')),
  code text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;

create policy "invites: owner manages own studio invites"
  on public.invites for all
  using (studio_id = public.current_studio_id() and public.current_role() = 'owner')
  with check (studio_id = public.current_studio_id() and public.current_role() = 'owner');

create or replace function public.get_invite_preview(p_code text)
returns table(studio_name text, role public.profile_role, valid boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.name,
    i.role,
    (i.used_at is null and i.expires_at > now())
  from public.invites i
  join public.studios s on s.id = i.studio_id
  where i.code = p_code
$$;

grant execute on function public.get_invite_preview(text) to anon, authenticated;

create or replace function public.accept_invite(p_code text, p_full_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites;
  v_profile public.profiles;
begin
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile_already_exists';
  end if;

  select * into v_invite from public.invites where code = p_code for update;

  if v_invite.id is null then
    raise exception 'invite_invalid';
  end if;
  if v_invite.used_at is not null then
    raise exception 'invite_already_used';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'invite_expired';
  end if;

  insert into public.profiles (id, studio_id, role, full_name, contract_status)
  values (
    auth.uid(),
    v_invite.studio_id,
    v_invite.role,
    p_full_name,
    case when v_invite.role = 'member' then 'pending' else 'not_required' end
  )
  returning * into v_profile;

  update public.invites set used_at = now() where id = v_invite.id;

  return v_profile;
end;
$$;

grant execute on function public.accept_invite(text, text) to authenticated;
```

- [ ] **Step 2: 마이그레이션 적용**

```bash
npx supabase db reset
```

- [ ] **Step 3: pgTAP 테스트 작성**

`supabase/tests/database/invites.test.sql`:

```sql
begin;
select plan(5);

create temporary table test_fixtures (key text primary key, value uuid);

insert into public.studios (id, name) values ('33333333-3333-3333-3333-333333333333', 'Studio C');
insert into test_fixtures values ('studio_c', '33333333-3333-3333-3333-333333333333');
insert into test_fixtures (key, value)
  select 'owner_c', tests.create_test_profile((select value from test_fixtures where key = 'studio_c'), 'owner', 'Owner C');

insert into public.invites (id, studio_id, role, code, expires_at, created_by) values
  ('44444444-4444-4444-4444-444444444444', (select value from test_fixtures where key = 'studio_c'), 'member', 'VALIDCODE', now() + interval '7 days', (select value from test_fixtures where key = 'owner_c')),
  ('55555555-5555-5555-5555-555555555555', (select value from test_fixtures where key = 'studio_c'), 'member', 'EXPIREDCODE', now() - interval '1 day', (select value from test_fixtures where key = 'owner_c')),
  ('66666666-6666-6666-6666-666666666666', (select value from test_fixtures where key = 'studio_c'), 'instructor', 'USEDCODE', now() + interval '7 days', (select value from test_fixtures where key = 'owner_c'));
update public.invites set used_at = now() where code = 'USEDCODE';

select tests.clear_authentication();

-- 1) 유효한 코드는 valid=true를 반환한다 (인증 없이도 미리보기 가능)
select is(
  (select valid from public.get_invite_preview('VALIDCODE')),
  true,
  'valid invite previews as valid'
);

-- 2) 만료된 코드는 valid=false
select is(
  (select valid from public.get_invite_preview('EXPIREDCODE')),
  false,
  'expired invite previews as invalid'
);

-- 3) 신규 유저가 유효한 코드로 수락하면 member 프로필이 studio_id/role과 함께 생성된다
insert into test_fixtures (key, value) values ('new_user', gen_random_uuid());
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values ((select value from test_fixtures where key = 'new_user'), 'newuser@test.local', '', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');
select tests.authenticate_as((select value from test_fixtures where key = 'new_user'));
select public.accept_invite('VALIDCODE', 'New Member');
select is(
  (select role::text from public.profiles where id = (select value from test_fixtures where key = 'new_user')),
  'member',
  'accept_invite creates a profile with the invite role'
);

-- 4) 같은 코드를 다시 쓰면 거부된다
insert into test_fixtures (key, value) values ('second_user', gen_random_uuid());
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values ((select value from test_fixtures where key = 'second_user'), 'seconduser@test.local', '', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated');
select tests.authenticate_as((select value from test_fixtures where key = 'second_user'));
select throws_ok(
  $$select public.accept_invite('VALIDCODE', 'Second User')$$,
  'invite_already_used',
  'reusing a consumed invite code is rejected'
);

-- 5) 만료된 코드로 수락 시도하면 거부된다
select throws_ok(
  $$select public.accept_invite('EXPIREDCODE', 'Second User')$$,
  'invite_expired',
  'accepting an expired invite is rejected'
);

select tests.clear_authentication();
select finish();
rollback;
```

- [ ] **Step 4: 테스트 실행**

```bash
npx supabase test db
```

Expected: `invites.test.sql`의 5개 assertion 모두 PASS.

- [ ] **Step 5: 타입 재생성**

```bash
npx supabase gen types typescript --local > lib/database.types.ts
```

`lib/types.ts`에 추가:

```typescript
export type Invite = Database['public']['Tables']['invites']['Row']
```

- [ ] **Step 6: 커밋**

```bash
git add supabase lib/types.ts lib/database.types.ts
git commit -m "$(cat <<'EOF'
Add invites table with preview and accept RPCs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: DB — class_templates, class_sessions, 세션 자동생성 RPC + 주간 배치

**Files:**
- Create: `supabase/migrations/20260724100003_class_schedule.sql`
- Create: `supabase/tests/database/class_schedule.test.sql`
- Modify: `lib/types.ts`

**Interfaces:**
- Consumes: `public.profiles`, `public.current_studio_id()`, `public.current_role()` (Task 2)
- Produces: `public.class_templates`, `public.class_sessions` 테이블. `public.generate_sessions_for_template(p_template_id uuid, p_weeks_ahead integer default 8) returns setof public.class_sessions`. `pg_cron`으로 매주 실행되는 `public.generate_sessions_for_all_templates()`.

- [ ] **Step 1: 마이그레이션 작성**

`supabase/migrations/20260724100003_class_schedule.sql`:

```sql
create table public.class_templates (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text not null,
  instructor_id uuid not null references public.profiles(id),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  duration_min integer not null check (duration_min > 0),
  capacity integer not null check (capacity > 0),
  created_at timestamptz not null default now()
);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.class_templates(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  date date not null,
  instructor_id uuid not null references public.profiles(id),
  capacity integer not null check (capacity > 0),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (template_id, date)
);

alter table public.class_templates enable row level security;
alter table public.class_sessions enable row level security;

create policy "class_templates: view same studio"
  on public.class_templates for select
  using (studio_id = public.current_studio_id());
create policy "class_templates: owner inserts"
  on public.class_templates for insert
  with check (studio_id = public.current_studio_id() and public.current_role() = 'owner');
create policy "class_templates: owner updates"
  on public.class_templates for update
  using (studio_id = public.current_studio_id() and public.current_role() = 'owner');
create policy "class_templates: owner deletes"
  on public.class_templates for delete
  using (studio_id = public.current_studio_id() and public.current_role() = 'owner');

create policy "class_sessions: view same studio"
  on public.class_sessions for select
  using (studio_id = public.current_studio_id());
create policy "class_sessions: owner updates"
  on public.class_sessions for update
  using (studio_id = public.current_studio_id() and public.current_role() = 'owner');

create or replace function public.validate_instructor_ref()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.profile_role;
  v_studio uuid;
begin
  select role, studio_id into v_role, v_studio from public.profiles where id = new.instructor_id;
  if v_studio is null or v_studio <> new.studio_id then
    raise exception 'instructor_must_belong_to_same_studio';
  end if;
  if v_role not in ('owner', 'instructor') then
    raise exception 'instructor_id_must_be_owner_or_instructor';
  end if;
  return new;
end;
$$;

create trigger class_templates_validate_instructor
  before insert or update on public.class_templates
  for each row execute function public.validate_instructor_ref();

create trigger class_sessions_validate_instructor
  before insert or update on public.class_sessions
  for each row execute function public.validate_instructor_ref();

create or replace function public._generate_sessions_internal(p_template_id uuid, p_weeks_ahead integer)
returns setof public.class_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template public.class_templates;
  v_date date;
  v_end_date date;
begin
  select * into v_template from public.class_templates where id = p_template_id;
  if v_template.id is null then
    raise exception 'template_not_found';
  end if;

  v_end_date := current_date + (p_weeks_ahead * 7);
  v_date := current_date;
  while extract(dow from v_date)::smallint <> v_template.day_of_week loop
    v_date := v_date + 1;
  end loop;

  while v_date <= v_end_date loop
    insert into public.class_sessions (template_id, studio_id, date, instructor_id, capacity)
    values (v_template.id, v_template.studio_id, v_date, v_template.instructor_id, v_template.capacity)
    on conflict (template_id, date) do nothing;
    v_date := v_date + 7;
  end loop;

  return query select * from public.class_sessions where template_id = p_template_id and date >= current_date order by date;
end;
$$;

create or replace function public.generate_sessions_for_template(p_template_id uuid, p_weeks_ahead integer default 8)
returns setof public.class_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_studio_id uuid;
begin
  select studio_id into v_studio_id from public.class_templates where id = p_template_id;
  if v_studio_id is null then
    raise exception 'template_not_found';
  end if;
  if public.current_role() <> 'owner' or v_studio_id <> public.current_studio_id() then
    raise exception 'not_permitted';
  end if;

  return query select * from public._generate_sessions_internal(p_template_id, p_weeks_ahead);
end;
$$;

create or replace function public.generate_sessions_for_all_templates()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template record;
begin
  for v_template in select id from public.class_templates loop
    perform public._generate_sessions_internal(v_template.id, 1);
  end loop;
end;
$$;

grant execute on function public.generate_sessions_for_template(uuid, integer) to authenticated;

create extension if not exists pg_cron;

select cron.schedule('weekly-session-rollover', '0 3 * * 0', $$select public.generate_sessions_for_all_templates()$$);
```

- [ ] **Step 2: 마이그레이션 적용**

```bash
npx supabase db reset
```

- [ ] **Step 3: pgTAP 테스트 작성**

`supabase/tests/database/class_schedule.test.sql`:

```sql
begin;
select plan(5);

create temporary table test_fixtures (key text primary key, value uuid);

insert into public.studios (id, name) values ('77777777-7777-7777-7777-777777777777', 'Studio D');
insert into test_fixtures values ('studio_d', '77777777-7777-7777-7777-777777777777');
insert into test_fixtures (key, value)
  select 'owner_d', tests.create_test_profile((select value from test_fixtures where key = 'studio_d'), 'owner', 'Owner D');
insert into test_fixtures (key, value)
  select 'instructor_d', tests.create_test_profile((select value from test_fixtures where key = 'studio_d'), 'instructor', 'Instructor D');
insert into public.studios (id, name) values ('88888888-8888-8888-8888-888888888888', 'Studio E');
insert into test_fixtures values ('studio_e', '88888888-8888-8888-8888-888888888888');
insert into test_fixtures (key, value)
  select 'instructor_e', tests.create_test_profile((select value from test_fixtures where key = 'studio_e'), 'instructor', 'Instructor E');

select tests.authenticate_as((select value from test_fixtures where key = 'owner_d'));

-- 1) owner가 자기 스튜디오 강사로 템플릿을 만들 수 있다 (월요일 09:00)
insert into public.class_templates (id, studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity)
values ('99999999-9999-9999-9999-999999999999', (select value from test_fixtures where key = 'studio_d'), 'Hatha Yoga', (select value from test_fixtures where key = 'instructor_d'), 1, '09:00', 60, 10);
select pass('owner can create a class template with an in-studio instructor');

-- 2) 다른 스튜디오 강사를 지정하면 거부된다
select throws_ok(
  format(
    'insert into public.class_templates (studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity) values (%L, %L, %L, %L, %L, %L, %L)',
    (select value from test_fixtures where key = 'studio_d'), 'Bad Template', (select value from test_fixtures where key = 'instructor_e'), 2, '09:00', 60, 10
  ),
  'instructor_must_belong_to_same_studio',
  'cannot assign an instructor from another studio'
);

-- 3) 세션 생성 RPC가 8주치를 만든다
select is(
  (select count(*)::int from public.generate_sessions_for_template('99999999-9999-9999-9999-999999999999', 8)),
  8,
  'generate_sessions_for_template creates 8 upcoming sessions'
);

-- 4) 다시 호출해도 중복 생성되지 않는다
perform public.generate_sessions_for_template('99999999-9999-9999-9999-999999999999', 8);
select is(
  (select count(*)::int from public.class_sessions where template_id = '99999999-9999-9999-9999-999999999999'),
  8,
  'calling generate_sessions_for_template again does not duplicate sessions'
);

-- 5) owner가 아니면 세션 생성 RPC를 호출할 수 없다
select tests.authenticate_as((select value from test_fixtures where key = 'instructor_d'));
select throws_ok(
  $$select public.generate_sessions_for_template('99999999-9999-9999-9999-999999999999', 8)$$,
  'not_permitted',
  'non-owner cannot trigger session generation'
);

select tests.clear_authentication();
select finish();
rollback;
```

- [ ] **Step 4: 테스트 실행**

```bash
npx supabase test db
```

Expected: `class_schedule.test.sql`의 5개 assertion 모두 PASS.

- [ ] **Step 5: 타입 재생성 및 `lib/types.ts` 갱신**

```bash
npx supabase gen types typescript --local > lib/database.types.ts
```

`lib/types.ts`에 추가:

```typescript
export type ClassTemplate = Database['public']['Tables']['class_templates']['Row']
export type ClassSession = Database['public']['Tables']['class_sessions']['Row']
```

- [ ] **Step 6: 커밋**

```bash
git add supabase lib/types.ts lib/database.types.ts
git commit -m "$(cat <<'EOF'
Add recurring class schedule with rolling session generation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: DB — bookings, 예약/취소 RPC (정원 + 대기명단, 동시성 보장)

**Files:**
- Create: `supabase/migrations/20260724100004_bookings.sql`
- Create: `supabase/tests/database/bookings.test.sql`
- Create: `tests/integration/booking-concurrency.test.ts`
- Modify: `lib/types.ts`, `package.json`(테스트 스크립트)

**Interfaces:**
- Consumes: `public.class_sessions` (Task 4)
- Produces: `public.bookings` 테이블. `public.book_session(p_session_id uuid) returns public.bookings`. `public.cancel_booking(p_booking_id uuid) returns public.bookings`. `public.list_upcoming_sessions_for_member() returns table(id uuid, date date, title text, instructor_name text, capacity integer, booked_count integer, my_status text)` — Task 12이 이 RPC로 회원용 시간표를 조회한다 (일반 `class_sessions`+`bookings` 임베드 조회는 "member views own" RLS 때문에 다른 회원의 예약이 필터링되어 정원 집계가 틀리므로 사용하지 않는다).

- [ ] **Step 1: 마이그레이션 작성**

`supabase/migrations/20260724100004_bookings.sql`:

```sql
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  member_id uuid not null references public.profiles(id),
  status text not null check (status in ('booked', 'waitlisted', 'cancelled', 'attended', 'no_show')),
  created_at timestamptz not null default now(),
  unique (session_id, member_id)
);

alter table public.bookings enable row level security;

create policy "bookings: member views own"
  on public.bookings for select
  using (member_id = auth.uid());

create policy "bookings: instructor views own session bookings"
  on public.bookings for select
  using (
    exists (
      select 1 from public.class_sessions s
      where s.id = session_id and s.instructor_id = auth.uid()
    )
  );

create policy "bookings: owner views studio bookings"
  on public.bookings for select
  using (
    public.current_role() = 'owner'
    and exists (
      select 1 from public.class_sessions s
      where s.id = session_id and s.studio_id = public.current_studio_id()
    )
  );

-- 쓰기(insert/update)는 아래 RPC로만 이뤄진다. 일반 authenticated에는 insert/update 정책을 부여하지 않는다.

create or replace function public.book_session(p_session_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.class_sessions;
  v_booked_count integer;
  v_status text;
  v_booking public.bookings;
begin
  if public.current_role() <> 'member' then
    raise exception 'only_members_can_book';
  end if;

  select * into v_session from public.class_sessions where id = p_session_id for update;
  if v_session.id is null then
    raise exception 'session_not_found';
  end if;
  if v_session.studio_id <> public.current_studio_id() then
    raise exception 'not_permitted';
  end if;
  if v_session.status <> 'scheduled' then
    raise exception 'session_cancelled';
  end if;

  if exists (
    select 1 from public.bookings
    where session_id = p_session_id and member_id = auth.uid() and status in ('booked', 'waitlisted')
  ) then
    raise exception 'already_booked';
  end if;

  select count(*) into v_booked_count from public.bookings where session_id = p_session_id and status = 'booked';

  if v_booked_count < v_session.capacity then
    v_status := 'booked';
  else
    v_status := 'waitlisted';
  end if;

  insert into public.bookings (session_id, member_id, status)
  values (p_session_id, auth.uid(), v_status)
  returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.book_session(uuid) to authenticated;

create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_promoted public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then
    raise exception 'booking_not_found';
  end if;
  if v_booking.member_id <> auth.uid() then
    raise exception 'not_permitted';
  end if;
  if v_booking.status not in ('booked', 'waitlisted') then
    raise exception 'cannot_cancel';
  end if;

  perform 1 from public.class_sessions where id = v_booking.session_id for update;

  update public.bookings set status = 'cancelled' where id = v_booking.id;

  if v_booking.status = 'booked' then
    select * into v_promoted from public.bookings
      where session_id = v_booking.session_id and status = 'waitlisted'
      order by created_at asc
      limit 1
      for update;

    if v_promoted.id is not null then
      update public.bookings set status = 'booked' where id = v_promoted.id;
    end if;
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  return v_booking;
end;
$$;

grant execute on function public.cancel_booking(uuid) to authenticated;

-- 회원용 시간표 조회 전용 RPC. "bookings: member views own" RLS 정책 때문에
-- class_sessions에 bookings를 그냥 조인/임베드하면 다른 회원의 예약 행이 전부 필터링되어
-- 정원 현황(booked_count)을 정확히 셀 수 없다 — 신원은 감추고 집계값만 SECURITY DEFINER로
-- 계산해 반환한다.
create or replace function public.list_upcoming_sessions_for_member()
returns table (
  id uuid,
  date date,
  title text,
  instructor_name text,
  capacity integer,
  booked_count integer,
  my_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.date,
    ct.title,
    p.full_name,
    s.capacity,
    (select count(*)::int from public.bookings b where b.session_id = s.id and b.status = 'booked'),
    (select b2.status from public.bookings b2 where b2.session_id = s.id and b2.member_id = auth.uid() and b2.status in ('booked', 'waitlisted') limit 1)
  from public.class_sessions s
  join public.class_templates ct on ct.id = s.template_id
  join public.profiles p on p.id = s.instructor_id
  where s.studio_id = public.current_studio_id()
    and s.status = 'scheduled'
    and s.date >= current_date
  order by s.date
$$;

grant execute on function public.list_upcoming_sessions_for_member() to authenticated;
```

- [ ] **Step 2: 마이그레이션 적용**

```bash
npx supabase db reset
```

- [ ] **Step 3: pgTAP 테스트 작성 (결정론적 로직)**

`supabase/tests/database/bookings.test.sql`:

```sql
begin;
select plan(7);

create temporary table test_fixtures (key text primary key, value uuid);

insert into public.studios (id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'Studio F');
insert into test_fixtures values ('studio_f', 'aaaaaaaa-0000-0000-0000-000000000000');
insert into test_fixtures (key, value)
  select 'owner_f', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'owner', 'Owner F');
insert into test_fixtures (key, value)
  select 'member_1', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'member', 'Member 1');
insert into test_fixtures (key, value)
  select 'member_2', tests.create_test_profile((select value from test_fixtures where key = 'studio_f'), 'member', 'Member 2');

insert into public.class_templates (id, studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity)
values ('bbbbbbbb-0000-0000-0000-000000000000', (select value from test_fixtures where key = 'studio_f'), 'Small Class', (select value from test_fixtures where key = 'owner_f'), 1, '09:00', 60, 1);

insert into public.class_sessions (id, template_id, studio_id, date, instructor_id, capacity)
values ('cccccccc-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000', (select value from test_fixtures where key = 'studio_f'), current_date + 7, (select value from test_fixtures where key = 'owner_f'), 1);

-- 1) 정원(1) 안에서 첫 예약은 booked
select tests.authenticate_as((select value from test_fixtures where key = 'member_1'));
select is(
  (select status from public.book_session('cccccccc-0000-0000-0000-000000000000')),
  'booked',
  'first booking on a capacity-1 session is booked'
);

-- 2) 정원이 찬 뒤 두 번째 예약은 waitlisted
select tests.authenticate_as((select value from test_fixtures where key = 'member_2'));
select is(
  (select status from public.book_session('cccccccc-0000-0000-0000-000000000000')),
  'waitlisted',
  'second booking on a full session is waitlisted'
);

-- 3) 같은 세션에 중복 예약은 거부된다
select throws_ok(
  $$select public.book_session('cccccccc-0000-0000-0000-000000000000')$$,
  'already_booked',
  'a member cannot book the same session twice'
);

-- 4) member_1이 취소하면 member_2가 자동으로 booked로 승격된다
select tests.authenticate_as((select value from test_fixtures where key = 'member_1'));
select cancel_booking(id) from public.bookings where session_id = 'cccccccc-0000-0000-0000-000000000000' and member_id = (select value from test_fixtures where key = 'member_1');
select is(
  (select status from public.bookings where session_id = 'cccccccc-0000-0000-0000-000000000000' and member_id = (select value from test_fixtures where key = 'member_2')),
  'booked',
  'cancelling a booked slot auto-promotes the oldest waitlisted booking'
);

-- 5) 남의 예약은 취소할 수 없다
select tests.authenticate_as((select value from test_fixtures where key = 'member_1'));
select throws_ok(
  format('select public.cancel_booking(%L)', (select id from public.bookings where session_id = 'cccccccc-0000-0000-0000-000000000000' and member_id = (select value from test_fixtures where key = 'member_2'))),
  'not_permitted',
  'a member cannot cancel someone else''s booking'
);

-- 6) instructor/owner가 아닌 role은 book_session을 호출할 수 없다
select tests.authenticate_as((select value from test_fixtures where key = 'owner_f'));
select throws_ok(
  $$select public.book_session('cccccccc-0000-0000-0000-000000000000')$$,
  'only_members_can_book',
  'an owner cannot book a session as if they were a member'
);

-- 7) list_upcoming_sessions_for_member는 "bookings: member views own" RLS와 무관하게
--    전체 예약자 수를 정확히 집계해야 한다 (member_2 본인 예약은 waitlisted->booked 승격된 상태)
select tests.authenticate_as((select value from test_fixtures where key = 'member_2'));
select is(
  (select booked_count from public.list_upcoming_sessions_for_member() where id = 'cccccccc-0000-0000-0000-000000000000'),
  1,
  'list_upcoming_sessions_for_member reports the true booked count regardless of row-level bookings RLS'
);

select tests.clear_authentication();
select finish();
rollback;
```

- [ ] **Step 4: pgTAP 테스트 실행**

```bash
npx supabase test db
```

Expected: `bookings.test.sql`의 7개 assertion 모두 PASS.

- [ ] **Step 5: 동시성 통합 테스트 작성 (실제 두 클라이언트가 동시에 예약하는 시나리오)**

이 테스트는 pgTAP(단일 커넥션·순차 실행)로는 검증할 수 없는 "진짜 동시 요청" 시나리오를 확인한다 — 두 개의 별도 Supabase 클라이언트로 같은 정원-1 세션에 동시에 `book_session`을 호출해, 정확히 하나만 `booked`가 되는지 검증한다.

Vitest는 `.env.local`을 자동으로 읽지 않으므로 `dotenv`로 명시적으로 로드한다:

```bash
npm install --save-dev dotenv
```

`tests/integration/booking-concurrency.test.ts`:

```typescript
import { config } from 'dotenv'
config({ path: '.env.local' })

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// admin: 서비스 롤 키로 RLS를 우회해 테스트 픽스처(스튜디오/프로필)를 만드는 전용 클라이언트.
// 실제 예약 호출은 각 회원의 anon-key + 로그인 세션 클라이언트로 해야 RLS/RPC 권한 검사가
// 실제 프로덕션과 동일한 경로를 타는지 검증할 수 있다.
async function createAuthedClient(admin: SupabaseClient, email: string): Promise<{ client: SupabaseClient; userId: string }> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true,
  })
  if (error || !data.user) throw error ?? new Error('user creation failed')

  const client = createClient(SUPABASE_URL, ANON_KEY)
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: 'test-password-123' })
  if (signInError) throw signInError

  return { client, userId: data.user.id }
}

describe('book_session concurrency', () => {
  let admin: SupabaseClient
  let studioId: string
  let sessionId: string
  let member1: { client: SupabaseClient; userId: string }
  let member2: { client: SupabaseClient; userId: string }

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: studio } = await admin.from('studios').insert({ name: 'Concurrency Studio' }).select().single()
    studioId = studio!.id

    const { data: owner } = await admin.auth.admin.createUser({
      email: 'owner-concurrency@test.local',
      password: 'test-password-123',
      email_confirm: true,
    })
    await admin.from('profiles').insert({ id: owner!.user!.id, studio_id: studioId, role: 'owner', full_name: 'Owner' })

    member1 = await createAuthedClient(admin, 'member1-concurrency@test.local')
    member2 = await createAuthedClient(admin, 'member2-concurrency@test.local')
    await admin.from('profiles').insert({ id: member1.userId, studio_id: studioId, role: 'member', full_name: 'Member 1' })
    await admin.from('profiles').insert({ id: member2.userId, studio_id: studioId, role: 'member', full_name: 'Member 2' })

    const { data: template } = await admin
      .from('class_templates')
      .insert({
        studio_id: studioId,
        title: 'Race Class',
        instructor_id: owner!.user!.id,
        day_of_week: 1,
        start_time: '09:00',
        duration_min: 60,
        capacity: 1,
      })
      .select()
      .single()

    const { data: session } = await admin
      .from('class_sessions')
      .insert({
        template_id: template!.id,
        studio_id: studioId,
        date: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
        instructor_id: owner!.user!.id,
        capacity: 1,
      })
      .select()
      .single()

    sessionId = session!.id
  })

  it('allows exactly one of two simultaneous bookers into a capacity-1 session', async () => {
    const [result1, result2] = await Promise.all([
      member1.client.rpc('book_session', { p_session_id: sessionId }),
      member2.client.rpc('book_session', { p_session_id: sessionId }),
    ])

    const statuses = [result1.data?.status, result2.data?.status].sort()
    expect(statuses).toEqual(['booked', 'waitlisted'])
  })
})
```

`package.json`의 `scripts`에 통합 테스트를 분리해 추가 (로컬 Supabase가 떠 있어야 하므로 기본 `test`와 분리):

```json
"test:integration": "vitest run tests/integration"
```

`vitest.config.ts`의 `test.exclude`에 `tests/integration/**`을 추가해 기본 `npm test`에서는 제외되게 한다 (통합 테스트는 로컬 Supabase 기동이 전제 조건이라 별도 실행).

- [ ] **Step 6: 동시성 테스트 실행 (로컬 Supabase가 떠 있어야 함)**

```bash
npm run test:integration
```

Expected: `booking-concurrency.test.ts` PASS — 두 결과의 상태 집합이 정확히 `['booked', 'waitlisted']`.

- [ ] **Step 7: 타입 재생성 및 `lib/types.ts` 갱신**

```bash
npx supabase gen types typescript --local > lib/database.types.ts
```

`lib/types.ts`에 추가:

```typescript
export type Booking = Database['public']['Tables']['bookings']['Row']
export type BookingStatus = Booking['status']
```

- [ ] **Step 8: 커밋**

```bash
git add supabase lib/types.ts lib/database.types.ts tests/integration package.json package-lock.json vitest.config.ts
git commit -m "$(cat <<'EOF'
Add bookings with atomic capacity/waitlist RPCs and a concurrency test

book_session and cancel_booking lock the session row for update so
capacity checks and waitlist promotion are race-free. Proven with a
real two-client concurrent-request integration test, not just
sequential pgTAP assertions.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: DB — 출석 체크 RPC

**Files:**
- Create: `supabase/migrations/20260724100005_attendance.sql`
- Create: `supabase/tests/database/attendance.test.sql`

**Interfaces:**
- Consumes: `public.bookings`, `public.class_sessions` (Task 4, 5)
- Produces: `public.mark_attendance(p_booking_id uuid, p_status text) returns public.bookings`

- [ ] **Step 1: 마이그레이션 작성**

`supabase/migrations/20260724100005_attendance.sql`:

```sql
create or replace function public.mark_attendance(p_booking_id uuid, p_status text)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_session public.class_sessions;
begin
  if p_status not in ('attended', 'no_show') then
    raise exception 'invalid_status';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking.id is null then
    raise exception 'booking_not_found';
  end if;

  select * into v_session from public.class_sessions where id = v_booking.session_id;
  if v_session.studio_id <> public.current_studio_id() then
    raise exception 'not_permitted';
  end if;
  if v_session.instructor_id <> auth.uid() and public.current_role() <> 'owner' then
    raise exception 'not_permitted';
  end if;
  if v_booking.status <> 'booked' then
    raise exception 'booking_not_confirmed';
  end if;

  update public.bookings set status = p_status where id = p_booking_id returning * into v_booking;
  return v_booking;
end;
$$;

grant execute on function public.mark_attendance(uuid, text) to authenticated;
```

- [ ] **Step 2: 마이그레이션 적용**

```bash
npx supabase db reset
```

- [ ] **Step 3: pgTAP 테스트 작성**

`supabase/tests/database/attendance.test.sql`:

```sql
begin;
select plan(4);

create temporary table test_fixtures (key text primary key, value uuid);

insert into public.studios (id, name) values ('dddddddd-0000-0000-0000-000000000000', 'Studio G');
insert into test_fixtures values ('studio_g', 'dddddddd-0000-0000-0000-000000000000');
insert into test_fixtures (key, value)
  select 'instructor_g', tests.create_test_profile((select value from test_fixtures where key = 'studio_g'), 'instructor', 'Instructor G');
insert into test_fixtures (key, value)
  select 'other_instructor', tests.create_test_profile((select value from test_fixtures where key = 'studio_g'), 'instructor', 'Other Instructor');
insert into test_fixtures (key, value)
  select 'member_g', tests.create_test_profile((select value from test_fixtures where key = 'studio_g'), 'member', 'Member G');

insert into public.class_templates (id, studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity)
values ('eeeeeeee-0000-0000-0000-000000000000', (select value from test_fixtures where key = 'studio_g'), 'Class', (select value from test_fixtures where key = 'instructor_g'), 1, '09:00', 60, 10);

insert into public.class_sessions (id, template_id, studio_id, date, instructor_id, capacity)
values ('ffffffff-0000-0000-0000-000000000000', 'eeeeeeee-0000-0000-0000-000000000000', (select value from test_fixtures where key = 'studio_g'), current_date + 7, (select value from test_fixtures where key = 'instructor_g'), 10);

select tests.authenticate_as((select value from test_fixtures where key = 'member_g'));
insert into test_fixtures (key, value)
  select 'booking_g', id from public.book_session('ffffffff-0000-0000-0000-000000000000');

-- 1) 담당 강사는 출석을 attended로 표시할 수 있다
select tests.authenticate_as((select value from test_fixtures where key = 'instructor_g'));
select is(
  (select status from public.mark_attendance((select value from test_fixtures where key = 'booking_g'), 'attended')),
  'attended',
  'assigned instructor can mark a booking as attended'
);

-- 2) 다른 강사는 이 세션의 출석을 표시할 수 없다 (booking_g를 booked로 되돌려 재사용)
-- bookings에는 authenticated용 update 정책이 없으므로(전부 RPC 전용), 픽스처를 직접
-- 되돌릴 때는 postgres로 돌아가 RLS를 우회한다.
select tests.clear_authentication();
update public.bookings set status = 'booked' where id = (select value from test_fixtures where key = 'booking_g');
select tests.authenticate_as((select value from test_fixtures where key = 'other_instructor'));
select throws_ok(
  format('select public.mark_attendance(%L, %L)', (select value from test_fixtures where key = 'booking_g'), 'attended'),
  'not_permitted',
  'a different instructor cannot mark attendance for someone else''s class'
);

-- 3) 잘못된 상태값은 거부된다
select tests.authenticate_as((select value from test_fixtures where key = 'instructor_g'));
select throws_ok(
  format('select public.mark_attendance(%L, %L)', (select value from test_fixtures where key = 'booking_g'), 'late'),
  'invalid_status',
  'an invalid attendance status is rejected'
);

-- 4) waitlisted 상태인 예약은 출석 처리할 수 없다
select tests.clear_authentication();
update public.bookings set status = 'waitlisted' where id = (select value from test_fixtures where key = 'booking_g');
select tests.authenticate_as((select value from test_fixtures where key = 'instructor_g'));
select throws_ok(
  format('select public.mark_attendance(%L, %L)', (select value from test_fixtures where key = 'booking_g'), 'attended'),
  'booking_not_confirmed',
  'a waitlisted (not booked) booking cannot be marked as attended'
);

select tests.clear_authentication();
select finish();
rollback;
```

- [ ] **Step 4: 테스트 실행**

```bash
npx supabase test db
```

Expected: `attendance.test.sql`의 4개 assertion 모두 PASS.

- [ ] **Step 5: 타입 재생성**

```bash
npx supabase gen types typescript --local > lib/database.types.ts
```

- [ ] **Step 6: 커밋**

```bash
git add supabase lib/database.types.ts
git commit -m "$(cat <<'EOF'
Add attendance-marking RPC restricted to the assigned instructor/owner

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Auth 설정 + 원장 셀프가입 (이메일/카카오)

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`
- Create: `lib/actions/auth.ts`
- Create: `app/(auth)/signup/page.tsx`, `app/(auth)/login/page.tsx`
- Create: `app/(auth)/onboarding/studio-name/page.tsx`
- Create: `app/auth/callback/route.ts`
- Create: `tests/e2e/owner-signup.spec.ts`

**Interfaces:**
- Consumes: `public.create_studio_and_owner_profile` RPC (Task 2)
- Produces: `createClient()`(browser), `createClient()`(server, async) — 이후 모든 태스크가 이 두 헬퍼로 Supabase에 접근한다. `signUpOwnerWithPassword(formData)`, `signInWithPassword(formData)`, `signInWithKakao(pendingStudioName?: string)` 서버 액션.

- [ ] **Step 1: Supabase 클라이언트 헬퍼 작성**

```bash
npm install @supabase/ssr
```

`lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Component에서 호출된 경우 — 세션 갱신은 미들웨어가 담당
          }
        },
      },
    }
  )
}
```

`lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'

export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  return { supabase, response }
}
```

- [ ] **Step 2: 원장 가입/로그인 서버 액션 작성**

`lib/actions/auth.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function signUpOwnerWithPassword(formData: FormData) {
  const studioName = String(formData.get('studioName') ?? '').trim()
  const fullName = String(formData.get('fullName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!studioName || !fullName || !email || !password) {
    return { error: '모든 항목을 입력해주세요.' }
  }

  const supabase = await createClient()
  const { error: signUpError } = await supabase.auth.signUp({ email, password })
  if (signUpError) {
    return { error: signUpError.message }
  }

  const { error: rpcError } = await supabase.rpc('create_studio_and_owner_profile', {
    p_studio_name: studioName,
    p_full_name: fullName,
  })
  if (rpcError) {
    return { error: rpcError.message }
  }

  redirect('/admin')
}

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }

  redirect('/')
}

export async function signInWithKakao(pendingStudioName?: string) {
  const supabase = await createClient()
  const cookieStore = await cookies()

  if (pendingStudioName) {
    cookieStore.set('pending_studio_name', pendingStudioName, { maxAge: 600, httpOnly: true })
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  })

  if (error || !data.url) {
    redirect('/login?kakaoError=1')
  }

  redirect(data.url)
}
```

`.env.local`에 추가: `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

- [ ] **Step 3: OAuth 콜백 라우트 작성 (카카오 신규 원장 가입 완료 포함)**

`app/auth/callback/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?kakaoError=1`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?kakaoError=1`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?kakaoError=1`)
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile) {
    return NextResponse.redirect(`${origin}/`)
  }

  const cookieStore = await cookies()
  const pendingStudioName = cookieStore.get('pending_studio_name')?.value
  const pendingInviteCode = cookieStore.get('pending_invite_code')?.value

  if (pendingStudioName) {
    cookieStore.delete('pending_studio_name')
    await supabase.rpc('create_studio_and_owner_profile', {
      p_studio_name: pendingStudioName,
      p_full_name: user.user_metadata?.name ?? '원장',
    })
    return NextResponse.redirect(`${origin}/admin`)
  }

  if (pendingInviteCode) {
    return NextResponse.redirect(`${origin}/invite/${pendingInviteCode}?completeSignup=1`)
  }

  return NextResponse.redirect(`${origin}/onboarding/studio-name`)
}
```

- [ ] **Step 4: 카카오로 왔지만 대기중인 스튜디오명이 없는 경우를 위한 완성 페이지**

`app/(auth)/onboarding/studio-name/page.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function StudioNameOnboardingPage() {
  const [studioName, setStudioName] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error: rpcError } = await supabase.rpc('create_studio_and_owner_profile', {
        p_studio_name: studioName,
        p_full_name: fullName,
      })
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      router.push('/admin')
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>요가원 정보를 입력해주세요</h1>
      <input value={studioName} onChange={(e) => setStudioName(e.target.value)} placeholder="요가원 이름" required />
      <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="이름" required />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isPending}>시작하기</button>
    </form>
  )
}
```

- [ ] **Step 5: 가입/로그인 페이지 작성 (카카오 실패 폴백 메시지 포함)**

`app/(auth)/signup/page.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { signUpOwnerWithPassword, signInWithKakao } from '@/lib/actions/auth'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [studioName, setStudioName] = useState('')

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await signUpOwnerWithPassword(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div>
      <form action={handleSubmit}>
        <h1>요가원 시작하기</h1>
        <input name="studioName" value={studioName} onChange={(e) => setStudioName(e.target.value)} placeholder="요가원 이름" required />
        <input name="fullName" placeholder="이름" required />
        <input name="email" type="email" placeholder="이메일" required />
        <input name="password" type="password" placeholder="비밀번호" required minLength={8} />
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={isPending}>가입하기</button>
      </form>
      <button onClick={() => signInWithKakao(studioName)}>카카오로 가입</button>
    </div>
  )
}
```

`app/(auth)/login/page.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { signInWithPassword, signInWithKakao } from '@/lib/actions/auth'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()
  const kakaoError = searchParams.get('kakaoError')

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await signInWithPassword(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div>
      <form action={handleSubmit}>
        <h1>로그인</h1>
        <input name="email" type="email" placeholder="이메일" required />
        <input name="password" type="password" placeholder="비밀번호" required />
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={isPending}>로그인</button>
      </form>
      <button onClick={() => signInWithKakao()}>카카오로 로그인</button>
      {kakaoError && <p role="alert">카카오 로그인에 실패했습니다. 이메일로 로그인해주세요.</p>}
    </div>
  )
}
```

- [ ] **Step 6: E2E 테스트 작성**

`tests/e2e/owner-signup.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('owner can sign up with a studio name and lands on the admin dashboard', async ({ page }) => {
  const uniqueEmail = `owner-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('테스트 요가원')
  await page.getByPlaceholder('이름').fill('테스트 원장')
  await page.getByPlaceholder('이메일').fill(uniqueEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()

  await expect(page).toHaveURL(/\/admin/)
})
```

- [ ] **Step 7: E2E 테스트 실행**

```bash
npm run test:e2e -- owner-signup.spec.ts
```

Expected: PASS — 가입 후 `/admin`으로 리다이렉트됨.

- [ ] **Step 8: 커밋**

```bash
git add lib/supabase lib/actions/auth.ts "app/(auth)" app/auth tests/e2e/owner-signup.spec.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add Supabase Auth wiring and owner self-signup (email + Kakao)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 역할 기반 라우팅 미들웨어

**Files:**
- Create: `middleware.ts`
- Create: `tests/e2e/role-routing.spec.ts`

**Interfaces:**
- Consumes: `lib/supabase/middleware.ts`(Task 7), `profiles.role`
- Produces: 미인증 사용자는 `/login`으로, 프로필 없는 인증 사용자는 `/onboarding/studio-name`으로, 각 role은 자기 라우트 프리픽스(`/admin`, `/instructor`, `/member`)로 강제 리다이렉트.

- [ ] **Step 1: 각 role의 최소 랜딩 페이지 작성 (아직 실제 내용은 없음, 다음 태스크들이 채운다)**

`app/admin/layout.tsx`:

```typescript
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div data-role="admin">{children}</div>
}
```

`app/admin/page.tsx`:

```typescript
export default function AdminDashboardPage() {
  return <h1>원장 대시보드</h1>
}
```

`app/instructor/layout.tsx`:

```typescript
export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return <div data-role="instructor">{children}</div>
}
```

`app/instructor/page.tsx`:

```typescript
export default function InstructorHomePage() {
  return <h1>내 수업</h1>
}
```

`app/member/layout.tsx`:

```typescript
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <div data-role="member">{children}</div>
}
```

`app/member/page.tsx`:

```typescript
export default function MemberHomePage() {
  return <h1>시간표</h1>
}
```

- [ ] **Step 2: 미들웨어 작성**

`middleware.ts`:

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

const PUBLIC_PREFIXES = ['/login', '/signup', '/invite', '/auth/callback', '/onboarding']

function roleHomePath(role: 'owner' | 'instructor' | 'member') {
  return role === 'owner' ? '/admin' : `/${role}`
}

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))

  if (!user) {
    if (isPublic) return response
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()

  if (!profile) {
    if (path.startsWith('/onboarding')) return response
    return NextResponse.redirect(new URL('/onboarding/studio-name', request.url))
  }

  const homePath = roleHomePath(profile.role)
  if (path === '/' ) {
    return NextResponse.redirect(new URL(homePath, request.url))
  }
  if (!isPublic && !path.startsWith(homePath)) {
    return NextResponse.redirect(new URL(homePath, request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)'],
}
```

- [ ] **Step 3: E2E 테스트 작성 — 원장으로 가입 후 `/instructor`나 `/member`에 직접 접근하면 `/admin`으로 튕겨나오는지 확인**

`tests/e2e/role-routing.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('an owner cannot access the instructor or member route prefixes', async ({ page }) => {
  const uniqueEmail = `owner-routing-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('라우팅 테스트 요가원')
  await page.getByPlaceholder('이름').fill('라우팅 원장')
  await page.getByPlaceholder('이메일').fill(uniqueEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/instructor')
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/member')
  await expect(page).toHaveURL(/\/admin/)
})
```

- [ ] **Step 4: 테스트 실행**

```bash
npm run test:e2e -- role-routing.spec.ts
```

Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add middleware.ts app/admin app/instructor app/member tests/e2e/role-routing.spec.ts
git commit -m "$(cat <<'EOF'
Add role-based routing middleware with per-role landing pages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: 초대 발급 (원장 UI)

**Files:**
- Create: `lib/actions/invites.ts`
- Create: `app/admin/invites/page.tsx`
- Create: `tests/e2e/invite-issue.spec.ts`

**Interfaces:**
- Consumes: `public.invites` RLS(owner `for all`, Task 3), 미들웨어(Task 8)
- Produces: `createInvite(role: 'instructor' | 'member'): Promise<{ url: string } | { error: string }>` 서버 액션. 이후 Task 10이 이 링크를 소비한다 (`/invite/[code]`).

- [ ] **Step 1: 초대 발급 서버 액션 작성**

```bash
npm install nanoid
```

`lib/actions/invites.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'

export async function createInvite(role: 'instructor' | 'member') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: profile } = await supabase.from('profiles').select('studio_id, role').eq('id', user.id).single()
  if (!profile || profile.role !== 'owner') return { error: '원장만 초대를 발급할 수 있습니다.' }

  const code = nanoid(10)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('invites').insert({
    studio_id: profile.studio_id,
    role,
    code,
    expires_at: expiresAt,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  return { url: `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${code}` }
}

export async function listInvites() {
  const supabase = await createClient()
  const { data } = await supabase.from('invites').select('*').order('created_at', { ascending: false })
  return data ?? []
}
```

- [ ] **Step 2: 초대 관리 화면 작성**

`app/admin/invites/page.tsx`:

```typescript
'use client'

import { useState, useTransition, useEffect } from 'react'
import { createInvite, listInvites } from '@/lib/actions/invites'
import type { Invite } from '@/lib/types'

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    listInvites().then(setInvites)
  }, [])

  function handleCreate(role: 'instructor' | 'member') {
    setError(null)
    setGeneratedUrl(null)
    startTransition(async () => {
      const result = await createInvite(role)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setGeneratedUrl(result.url)
      setInvites(await listInvites())
    })
  }

  return (
    <div>
      <h1>초대 관리</h1>
      <button onClick={() => handleCreate('instructor')} disabled={isPending}>강사 초대 링크 발급</button>
      <button onClick={() => handleCreate('member')} disabled={isPending}>회원 초대 링크 발급</button>
      {error && <p role="alert">{error}</p>}
      {generatedUrl && (
        <p>
          발급된 링크: <a href={generatedUrl}>{generatedUrl}</a>
        </p>
      )}
      <ul>
        {invites.map((invite) => (
          <li key={invite.id}>
            {invite.role} · {invite.code} · {invite.used_at ? '사용됨' : '미사용'} · 만료 {invite.expires_at}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: E2E 테스트 작성**

`tests/e2e/invite-issue.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('owner can issue an instructor invite link', async ({ page }) => {
  const uniqueEmail = `owner-invite-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('초대 테스트 요가원')
  await page.getByPlaceholder('이름').fill('초대 원장')
  await page.getByPlaceholder('이메일').fill(uniqueEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/admin/invites')
  await page.getByRole('button', { name: '강사 초대 링크 발급' }).click()

  await expect(page.getByText(/발급된 링크/)).toBeVisible()
  await expect(page.getByRole('listitem').first()).toContainText('instructor')
})
```

- [ ] **Step 4: 테스트 실행**

```bash
npm run test:e2e -- invite-issue.spec.ts
```

Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add lib/actions/invites.ts app/admin/invites tests/e2e/invite-issue.spec.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add owner invite issuance for instructors and members

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: 초대 수락 (가입 플로우, 오류 메시징 포함)

**Files:**
- Create: `app/(auth)/invite/[code]/page.tsx`
- Modify: `lib/actions/auth.ts` (카카오 로그인에 초대 코드 전달), `app/auth/callback/route.ts` (이미 Task 7에서 `pendingInviteCode` 분기 작성됨 — 이번 태스크에서 실제로 값이 채워지도록 연결)
- Create: `lib/actions/invites.ts`에 `acceptInviteWithPassword` 추가
- Create: `tests/e2e/invite-accept.spec.ts`

**Interfaces:**
- Consumes: `public.get_invite_preview`, `public.accept_invite` (Task 3)
- Produces: `/invite/[code]` 페이지 — 유효하지 않은 초대는 명확한 에러 메시지를 보여주고, 유효한 초대는 이메일/카카오 가입 후 role에 맞는 라우트로 이동시킨다.

- [ ] **Step 1: 초대 수락 서버 액션 추가**

`lib/actions/invites.ts`에 추가:

```typescript
export async function acceptInviteWithPassword(code: string, formData: FormData) {
  const fullName = String(formData.get('fullName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!fullName || !email || !password) {
    return { error: '모든 항목을 입력해주세요.' }
  }

  const supabase = await createClient()
  const { error: signUpError } = await supabase.auth.signUp({ email, password })
  if (signUpError) return { error: signUpError.message }

  const { error: acceptError } = await supabase.rpc('accept_invite', { p_code: code, p_full_name: fullName })
  if (acceptError) return { error: mapAcceptInviteError(acceptError.message) }

  return { success: true }
}

function mapAcceptInviteError(message: string) {
  if (message.includes('invite_expired')) return '초대 링크가 만료되었습니다. 원장님께 재발급을 요청해주세요.'
  if (message.includes('invite_already_used')) return '이미 사용된 초대 링크입니다. 원장님께 재발급을 요청해주세요.'
  if (message.includes('invite_invalid')) return '유효하지 않은 초대 링크입니다.'
  if (message.includes('profile_already_exists')) return '이미 다른 계정으로 가입되어 있습니다. 로그아웃 후 다시 시도해주세요.'
  return message
}
```

`import { createClient } from '@/lib/supabase/server'`를 파일 상단에 추가 (Task 9에서 이미 import했다면 중복 추가하지 않는다).

`lib/actions/auth.ts`의 `signInWithKakao`를 아래로 교체해 초대 코드도 쿠키로 전달할 수 있게 한다:

```typescript
export async function signInWithKakao(options?: { pendingStudioName?: string; pendingInviteCode?: string }) {
  const supabase = await createClient()
  const cookieStore = await cookies()

  if (options?.pendingStudioName) {
    cookieStore.set('pending_studio_name', options.pendingStudioName, { maxAge: 600, httpOnly: true })
  }
  if (options?.pendingInviteCode) {
    cookieStore.set('pending_invite_code', options.pendingInviteCode, { maxAge: 600, httpOnly: true })
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  })

  if (error || !data.url) {
    redirect('/login?kakaoError=1')
  }

  redirect(data.url)
}
```

`app/(auth)/signup/page.tsx`의 `signInWithKakao(studioName)` 호출을 `signInWithKakao({ pendingStudioName: studioName })`로, `app/(auth)/login/page.tsx`의 `signInWithKakao()` 호출은 그대로 둔다 (Task 7에서 작성한 두 페이지를 수정).

- [ ] **Step 2: 카카오로 초대를 수락하고 돌아왔을 때 처리 — 콜백 라우트 보강**

`app/auth/callback/route.ts`의 `pendingInviteCode` 분기를 아래로 교체 (Task 7에서 리다이렉트만 하던 부분을 실제 `accept_invite` 호출로 완성):

```typescript
  if (pendingInviteCode) {
    cookieStore.delete('pending_invite_code')
    const { error } = await supabase.rpc('accept_invite', {
      p_code: pendingInviteCode,
      p_full_name: user.user_metadata?.name ?? '신규 사용자',
    })
    if (error) {
      return NextResponse.redirect(`${origin}/invite/${pendingInviteCode}?error=${encodeURIComponent(error.message)}`)
    }
    return NextResponse.redirect(`${origin}/`)
  }
```

- [ ] **Step 3: 초대 수락 페이지 작성**

`app/(auth)/invite/[code]/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { InviteAcceptForm } from './invite-accept-form'

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createClient()
  const { data: preview } = await supabase.rpc('get_invite_preview', { p_code: code }).maybeSingle()

  if (!preview || !preview.valid) {
    return (
      <div>
        <h1>유효하지 않은 초대 링크</h1>
        <p>이 링크는 만료되었거나 이미 사용되었습니다. 원장님께 재발급을 요청해주세요.</p>
      </div>
    )
  }

  return (
    <div>
      <h1>{preview.studio_name} — {preview.role === 'instructor' ? '강사' : '회원'} 초대</h1>
      <InviteAcceptForm code={code} role={preview.role} />
    </div>
  )
}
```

`app/(auth)/invite/[code]/invite-accept-form.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptInviteWithPassword } from '@/lib/actions/invites'
import { signInWithKakao } from '@/lib/actions/auth'

export function InviteAcceptForm({ code, role }: { code: string; role: 'instructor' | 'member' }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await acceptInviteWithPassword(code, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.push('/')
    })
  }

  return (
    <div>
      <form action={handleSubmit}>
        <input name="fullName" placeholder="이름" required />
        <input name="email" type="email" placeholder="이메일" required />
        <input name="password" type="password" placeholder="비밀번호" required minLength={8} />
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={isPending}>
          {role === 'instructor' ? '강사로 가입하기' : '회원으로 가입하기'}
        </button>
      </form>
      <button onClick={() => signInWithKakao({ pendingInviteCode: code })}>카카오로 가입</button>
    </div>
  )
}
```

- [ ] **Step 4: E2E 테스트 작성 — 원장이 초대 발급 → 발급된 링크로 강사가 가입 → `/instructor`로 이동**

`tests/e2e/invite-accept.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('an instructor can sign up via an owner-issued invite link', async ({ page, context }) => {
  const ownerEmail = `owner-inviteflow-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('초대 플로우 요가원')
  await page.getByPlaceholder('이름').fill('플로우 원장')
  await page.getByPlaceholder('이메일').fill(ownerEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/admin/invites')
  await page.getByRole('button', { name: '강사 초대 링크 발급' }).click()
  const link = await page.getByRole('link').first()
  const inviteUrl = await link.getAttribute('href')
  expect(inviteUrl).toBeTruthy()

  const instructorPage = await context.newPage()
  await instructorPage.goto(inviteUrl!)
  await expect(instructorPage.getByRole('heading')).toContainText('강사 초대')

  await instructorPage.getByPlaceholder('이름').fill('신규 강사')
  await instructorPage.getByPlaceholder('이메일').fill(`instructor-${Date.now()}@test.local`)
  await instructorPage.getByPlaceholder('비밀번호').fill('test-password-123')
  await instructorPage.getByRole('button', { name: '강사로 가입하기' }).click()

  await expect(instructorPage).toHaveURL(/\/instructor/)
})

test('an expired or invalid invite code shows a clear error', async ({ page }) => {
  await page.goto('/invite/does-not-exist-code')
  await expect(page.getByText(/유효하지 않은 초대 링크/)).toBeVisible()
})
```

- [ ] **Step 5: 테스트 실행**

```bash
npm run test:e2e -- invite-accept.spec.ts
```

Expected: PASS — 두 테스트 모두 성공.

- [ ] **Step 6: 커밋**

```bash
git add "app/(auth)/invite" app/auth lib/actions
git commit -m "$(cat <<'EOF'
Add invite acceptance flow with expired/used-code error messaging

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: 원장 시간표 관리 화면 (템플릿 CRUD + 세션 자동생성)

**Files:**
- Create: `lib/actions/schedule.ts`
- Create: `app/admin/schedule/page.tsx`, `app/admin/schedule/template-form.tsx`
- Create: `tests/e2e/schedule-management.spec.ts`

**Interfaces:**
- Consumes: `class_templates`/`class_sessions` RLS(Task 4), `generate_sessions_for_template` RPC(Task 4), `listInstructors`(이 태스크에서 정의, Task 14에서 재사용)
- Produces: 원장이 반복 시간표를 만들면 즉시 8주치 세션이 생성되어 화면에 보인다.

- [ ] **Step 1: 시간표 관련 서버 액션 작성**

`lib/actions/schedule.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export async function listInstructors() {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('id, full_name, role').in('role', ['owner', 'instructor']).order('full_name')
  return data ?? []
}

export async function createClassTemplate(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: profile } = await supabase.from('profiles').select('studio_id').eq('id', user.id).single()
  if (!profile) return { error: '프로필을 찾을 수 없습니다.' }

  const { data: template, error } = await supabase
    .from('class_templates')
    .insert({
      studio_id: profile.studio_id,
      title: String(formData.get('title')),
      instructor_id: String(formData.get('instructorId')),
      day_of_week: Number(formData.get('dayOfWeek')),
      start_time: String(formData.get('startTime')),
      duration_min: Number(formData.get('durationMin')),
      capacity: Number(formData.get('capacity')),
    })
    .select()
    .single()

  if (error || !template) return { error: error?.message ?? '템플릿 생성에 실패했습니다.' }

  const { error: genError } = await supabase.rpc('generate_sessions_for_template', {
    p_template_id: template.id,
    p_weeks_ahead: 8,
  })
  if (genError) return { error: genError.message }

  revalidatePath('/admin/schedule')
  return { success: true }
}

export async function listTemplatesWithUpcomingSessions() {
  const supabase = await createClient()
  const { data: templates } = await supabase
    .from('class_templates')
    .select('*, instructor:profiles!class_templates_instructor_id_fkey(full_name)')
    .order('day_of_week')

  const { data: sessions } = await supabase
    .from('class_sessions')
    .select('*')
    .gte('date', new Date().toISOString().slice(0, 10))
    .order('date')

  return {
    templates: (templates ?? []).map((t) => ({ ...t, dayLabel: DAY_LABELS[t.day_of_week] })),
    sessions: sessions ?? [],
  }
}
```

- [ ] **Step 2: 시간표 관리 화면 작성**

`app/admin/schedule/template-form.tsx`:

```typescript
'use client'

import { useState, useTransition, useEffect } from 'react'
import { createClassTemplate, listInstructors } from '@/lib/actions/schedule'

export function TemplateForm({ onCreated }: { onCreated: () => void }) {
  const [instructors, setInstructors] = useState<{ id: string; full_name: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    listInstructors().then(setInstructors)
  }, [])

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createClassTemplate(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      onCreated()
    })
  }

  return (
    <form action={handleSubmit}>
      <input name="title" placeholder="클래스명" required />
      <select name="instructorId" required>
        <option value="">강사 선택</option>
        {instructors.map((i) => (
          <option key={i.id} value={i.id}>{i.full_name}</option>
        ))}
      </select>
      <select name="dayOfWeek" required>
        <option value="0">일</option>
        <option value="1">월</option>
        <option value="2">화</option>
        <option value="3">수</option>
        <option value="4">목</option>
        <option value="5">금</option>
        <option value="6">토</option>
      </select>
      <input name="startTime" type="time" required />
      <input name="durationMin" type="number" placeholder="시간(분)" defaultValue={60} required />
      <input name="capacity" type="number" placeholder="정원" required />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isPending}>시간표 추가</button>
    </form>
  )
}
```

`app/admin/schedule/page.tsx`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { listTemplatesWithUpcomingSessions } from '@/lib/actions/schedule'
import { TemplateForm } from './template-form'

export default function SchedulePage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listTemplatesWithUpcomingSessions>>>({ templates: [], sessions: [] })

  const refresh = useCallback(() => {
    listTemplatesWithUpcomingSessions().then(setData)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div>
      <h1>시간표 관리</h1>
      <TemplateForm onCreated={refresh} />
      <h2>등록된 반복 시간표</h2>
      <ul>
        {data.templates.map((t: any) => (
          <li key={t.id}>
            {t.dayLabel}요일 {t.start_time} · {t.title} · {t.instructor?.full_name} · 정원 {t.capacity}
          </li>
        ))}
      </ul>
      <h2>다가오는 세션</h2>
      <ul>
        {data.sessions.map((s) => (
          <li key={s.id}>{s.date} · 정원 {s.capacity}</li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: E2E 테스트 작성**

`tests/e2e/schedule-management.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('owner can create a recurring class template and see generated sessions', async ({ page }) => {
  const uniqueEmail = `owner-schedule-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('시간표 테스트 요가원')
  await page.getByPlaceholder('이름').fill('시간표 원장')
  await page.getByPlaceholder('이메일').fill(uniqueEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/admin/schedule')
  await page.getByPlaceholder('클래스명').fill('Hatha Yoga')
  await page.locator('select[name="instructorId"]').selectOption({ index: 1 })
  await page.locator('select[name="dayOfWeek"]').selectOption('1')
  await page.locator('input[name="startTime"]').fill('09:00')
  await page.getByPlaceholder('정원').fill('10')
  await page.getByRole('button', { name: '시간표 추가' }).click()

  await expect(page.getByText('월요일 09:00 · Hatha Yoga')).toBeVisible()
  const sessionItems = page.locator('ul').last().locator('li')
  await expect(sessionItems).toHaveCount(8)
})
```

- [ ] **Step 4: 테스트 실행**

```bash
npm run test:e2e -- schedule-management.spec.ts
```

Expected: PASS — 템플릿이 생성되고 8개 세션이 목록에 보임.

- [ ] **Step 5: 커밋**

```bash
git add lib/actions/schedule.ts app/admin/schedule tests/e2e/schedule-management.spec.ts
git commit -m "$(cat <<'EOF'
Add owner schedule management with automatic session generation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: 회원 예약 화면

**Files:**
- Create: `lib/actions/bookings.ts`
- Create: `app/member/page.tsx`, `app/member/bookings/page.tsx`
- Modify: `app/member/layout.tsx` (시간표/내예약 내비게이션 추가)
- Create: `tests/e2e/member-booking.spec.ts`

**Interfaces:**
- Consumes: `book_session`/`cancel_booking`/`list_upcoming_sessions_for_member` RPC(Task 5), `bookings` RLS(Task 5)
- Produces: 회원이 세션을 조회·예약·취소할 수 있는 화면.

- [ ] **Step 1: 예약 서버 액션 작성**

`lib/actions/bookings.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function listUpcomingSessionsWithBookingState() {
  const supabase = await createClient()

  // class_sessions에 bookings를 직접 임베드하지 않는다 — "bookings: member views own" RLS 때문에
  // 다른 회원의 예약 행이 필터링되어 정원 집계(booked_count)가 항상 0~1로 틀리게 나온다.
  // list_upcoming_sessions_for_member RPC가 신원 노출 없이 집계값만 계산해 반환한다.
  const { data: sessions, error } = await supabase.rpc('list_upcoming_sessions_for_member')
  if (error || !sessions) return []

  return sessions.map((s) => ({
    id: s.id,
    date: s.date,
    title: s.title,
    instructorName: s.instructor_name,
    capacity: s.capacity,
    bookedCount: s.booked_count,
    isFull: s.booked_count >= s.capacity,
    myStatus: s.my_status,
  }))
}

export async function bookSession(sessionId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('book_session', { p_session_id: sessionId }).single()
  if (error) return { error: error.message }
  revalidatePath('/member')
  return { status: data.status }
}

export async function listMyBookings() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bookings')
    .select('*, session:class_sessions(date, template:class_templates(title))')
    .in('status', ['booked', 'waitlisted'])
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function cancelBooking(bookingId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId })
  if (error) return { error: error.message }
  revalidatePath('/member/bookings')
  return { success: true }
}
```

- [ ] **Step 2: 시간표+예약 화면 작성**

`app/member/page.tsx`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { listUpcomingSessionsWithBookingState, bookSession } from '@/lib/actions/bookings'

export default function MemberSchedulePage() {
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof listUpcomingSessionsWithBookingState>>>([])
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(() => {
    listUpcomingSessionsWithBookingState().then(setSessions)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleBook(sessionId: string) {
    setMessage(null)
    const result = await bookSession(sessionId)
    if ('error' in result) {
      setMessage(result.error)
      return
    }
    setMessage(result.status === 'booked' ? '예약이 확정되었습니다.' : '정원이 마감되어 대기명단에 등록되었습니다.')
    refresh()
  }

  return (
    <div>
      <h1>시간표</h1>
      {message && <p role="status">{message}</p>}
      <ul>
        {sessions.map((s) => (
          <li key={s.id}>
            {s.date} · {s.title} · {s.instructorName} · {s.bookedCount}/{s.capacity}
            {s.myStatus === 'booked' && <span> · 예약완료</span>}
            {s.myStatus === 'waitlisted' && <span> · 대기중</span>}
            {!s.myStatus && (
              <button onClick={() => handleBook(s.id)}>{s.isFull ? '대기 등록' : '예약하기'}</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

`app/member/bookings/page.tsx`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { listMyBookings, cancelBooking } from '@/lib/actions/bookings'

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])

  const refresh = useCallback(() => {
    listMyBookings().then(setBookings)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleCancel(bookingId: string) {
    await cancelBooking(bookingId)
    refresh()
  }

  return (
    <div>
      <h1>내 예약</h1>
      <ul>
        {bookings.map((b) => (
          <li key={b.id}>
            {b.session?.date} · {b.session?.template?.title} · {b.status === 'booked' ? '예약완료' : '대기중'}
            <button onClick={() => handleCancel(b.id)}>취소</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: E2E 테스트 작성 — 예약 → 취소 흐름 및 정원마감 → 대기명단 메시지**

`tests/e2e/member-booking.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

async function signUpOwnerAndCreateFullSchedule(page: import('@playwright/test').Page, studioName: string) {
  const email = `owner-booking-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`
  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill(studioName)
  await page.getByPlaceholder('이름').fill('예약테스트 원장')
  await page.getByPlaceholder('이메일').fill(email)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/admin/schedule')
  await page.getByPlaceholder('클래스명').fill('Small Class')
  await page.locator('select[name="instructorId"]').selectOption({ index: 1 })
  await page.locator('select[name="dayOfWeek"]').selectOption('1')
  await page.locator('input[name="startTime"]').fill('09:00')
  await page.getByPlaceholder('정원').fill('1')
  await page.getByRole('button', { name: '시간표 추가' }).click()
  await expect(page.getByText('월요일 09:00 · Small Class')).toBeVisible()

  await page.goto('/admin/invites')
  await page.getByRole('button', { name: '회원 초대 링크 발급' }).click()
  const link = page.getByRole('link').first()
  return await link.getAttribute('href')
}

async function acceptMemberInvite(context: import('@playwright/test').BrowserContext, inviteUrl: string, name: string) {
  const p = await context.newPage()
  await p.goto(inviteUrl)
  await p.getByPlaceholder('이름').fill(name)
  await p.getByPlaceholder('이메일').fill(`${name.replace(/\s/g, '')}-${Date.now()}@test.local`)
  await p.getByPlaceholder('비밀번호').fill('test-password-123')
  await p.getByRole('button', { name: '회원으로 가입하기' }).click()
  await expect(p).toHaveURL(/\/member/)
  return p
}

test('member booking fills capacity, next member is waitlisted, and cancel promotes them', async ({ page, context }) => {
  const inviteUrl = await signUpOwnerAndCreateFullSchedule(page, `예약 요가원 ${Date.now()}`)
  expect(inviteUrl).toBeTruthy()

  const member1 = await acceptMemberInvite(context, inviteUrl!, 'Member One')
  await member1.getByRole('button', { name: '예약하기' }).click()
  await expect(member1.getByText('예약이 확정되었습니다.')).toBeVisible()

  const member2 = await acceptMemberInvite(context, inviteUrl!, 'Member Two')
  await member2.getByRole('button', { name: '대기 등록' }).click()
  await expect(member2.getByText('정원이 마감되어 대기명단에 등록되었습니다.')).toBeVisible()

  await member1.goto('/member/bookings')
  await member1.getByRole('button', { name: '취소' }).click()
  await expect(member1.getByText('대기중')).toHaveCount(0)

  await member2.goto('/member');
  await expect(member2.getByText('예약완료')).toBeVisible()
})
```

- [ ] **Step 4: 회원 내비게이션 추가**

지금까지는 URL을 직접 입력해야 시간표/내예약을 오갈 수 있었다. `app/member/layout.tsx`를 아래로 교체해 두 화면 사이를 이동할 수 있게 한다 (Task 8에서 만든 `data-role="member"` div를 유지):

```typescript
import Link from 'next/link'

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-role="member">
      <nav>
        <Link href="/member">시간표</Link>
        <Link href="/member/bookings">내 예약</Link>
      </nav>
      {children}
    </div>
  )
}
```

- [ ] **Step 5: 테스트 실행**

```bash
npm run test:e2e -- member-booking.spec.ts
```

Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add lib/actions/bookings.ts app/member tests/e2e/member-booking.spec.ts
git commit -m "$(cat <<'EOF'
Add member schedule view with booking, waitlist, and cancellation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: 강사 내수업 · 출석체크 화면

**Files:**
- Create: `lib/actions/attendance.ts`
- Create: `app/instructor/page.tsx`
- Create: `tests/e2e/instructor-attendance.spec.ts`

**Interfaces:**
- Consumes: `mark_attendance` RPC(Task 6), `bookings`/`class_sessions` RLS(instructor용, Task 4/5)
- Produces: 강사가 자기 담당 세션과 예약자 목록을 보고 출석을 표시.

- [ ] **Step 1: 출석 서버 액션 작성**

`lib/actions/attendance.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function listMySessionsWithBookings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('class_sessions')
    .select('*, template:class_templates(title), bookings(id, status, member:profiles!bookings_member_id_fkey(full_name))')
    .eq('instructor_id', user.id)
    .order('date')

  return data ?? []
}

export async function markAttendance(bookingId: string, status: 'attended' | 'no_show') {
  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_attendance', { p_booking_id: bookingId, p_status: status })
  if (error) return { error: error.message }
  revalidatePath('/instructor')
  return { success: true }
}
```

- [ ] **Step 2: 강사 화면 작성**

`app/instructor/page.tsx`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { listMySessionsWithBookings, markAttendance } from '@/lib/actions/attendance'

export default function InstructorHomePage() {
  const [sessions, setSessions] = useState<any[]>([])

  const refresh = useCallback(() => {
    listMySessionsWithBookings().then(setSessions)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleMark(bookingId: string, status: 'attended' | 'no_show') {
    await markAttendance(bookingId, status)
    refresh()
  }

  return (
    <div>
      <h1>내 수업</h1>
      {sessions.map((s) => (
        <section key={s.id}>
          <h2>{s.date} · {s.template?.title}</h2>
          <ul>
            {s.bookings
              .filter((b: any) => b.status === 'booked' || b.status === 'attended' || b.status === 'no_show')
              .map((b: any) => (
                <li key={b.id}>
                  {b.member?.full_name} · {b.status}
                  {b.status === 'booked' && (
                    <>
                      <button onClick={() => handleMark(b.id, 'attended')}>출석</button>
                      <button onClick={() => handleMark(b.id, 'no_show')}>결석</button>
                    </>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: E2E 테스트 작성**

`tests/e2e/instructor-attendance.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('instructor can mark a booked member as attended', async ({ page, context }) => {
  const ownerEmail = `owner-attendance-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('출석 테스트 요가원')
  await page.getByPlaceholder('이름').fill('출석 원장')
  await page.getByPlaceholder('이메일').fill(ownerEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/admin/schedule')
  await page.getByPlaceholder('클래스명').fill('Attendance Class')
  await page.locator('select[name="instructorId"]').selectOption({ index: 1 }) // owner가 강사로 배정됨
  await page.locator('select[name="dayOfWeek"]').selectOption('1')
  await page.locator('input[name="startTime"]').fill('09:00')
  await page.getByPlaceholder('정원').fill('10')
  await page.getByRole('button', { name: '시간표 추가' }).click()

  await page.goto('/admin/invites')
  await page.getByRole('button', { name: '회원 초대 링크 발급' }).click()
  const inviteUrl = await page.getByRole('link').first().getAttribute('href')

  const memberPage = await context.newPage()
  await memberPage.goto(inviteUrl!)
  await memberPage.getByPlaceholder('이름').fill('출석 회원')
  await memberPage.getByPlaceholder('이메일').fill(`attendance-member-${Date.now()}@test.local`)
  await memberPage.getByPlaceholder('비밀번호').fill('test-password-123')
  await memberPage.getByRole('button', { name: '회원으로 가입하기' }).click()
  await expect(memberPage).toHaveURL(/\/member/)
  await memberPage.getByRole('button', { name: '예약하기' }).click()

  await page.goto('/instructor')
  await expect(page.getByText('출석 회원')).toBeVisible()
  await page.getByRole('button', { name: '출석' }).click()
  await expect(page.getByText('출석 회원 · attended')).toBeVisible()
})
```

- [ ] **Step 4: 테스트 실행**

```bash
npm run test:e2e -- instructor-attendance.spec.ts
```

Expected: PASS. (원장이 owner 역할이면서 강사로도 배정될 수 있음을 활용해 별도 강사 초대 없이 테스트를 단순화했다 — 스펙의 "원장이 직접 수업을 진행하는 소규모 요가원" 지원 요구사항과 일치.)

- [ ] **Step 5: 커밋**

```bash
git add lib/actions/attendance.ts app/instructor tests/e2e/instructor-attendance.spec.ts
git commit -m "$(cat <<'EOF'
Add instructor view for assigned sessions with attendance marking

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: 원장 인력관리 화면 (강사 · 회원 로스터)

**Files:**
- Create: `lib/actions/roster.ts`
- Create: `app/admin/roster/roster-table.tsx`
- Create: `app/admin/roster/instructors/page.tsx`, `app/admin/roster/members/page.tsx`
- Create: `tests/e2e/roster-management.spec.ts`

**Interfaces:**
- Consumes: `profiles` RLS(Task 2), `listInvites`(Task 9)
- Produces: 강사 목록/회원 목록 화면 — 동일한 `RosterTable` 컴포넌트를 `role` prop으로 재사용.

- [ ] **Step 1: 로스터 서버 액션 작성**

`lib/actions/roster.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function listProfilesByRole(role: 'instructor' | 'member') {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').eq('role', role).order('full_name')
  return data ?? []
}
```

- [ ] **Step 2: 공유 로스터 테이블 컴포넌트 작성**

`app/admin/roster/roster-table.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { listProfilesByRole } from '@/lib/actions/roster'
import { createInvite } from '@/lib/actions/invites'
import type { Profile } from '@/lib/types'

export function RosterTable({ role, label }: { role: 'instructor' | 'member'; label: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)

  useEffect(() => {
    listProfilesByRole(role).then(setProfiles)
  }, [role])

  async function handleInvite() {
    const result = await createInvite(role)
    if ('url' in result) setGeneratedUrl(result.url)
  }

  return (
    <div>
      <h1>{label} 관리</h1>
      <button onClick={handleInvite}>{label} 초대 링크 발급</button>
      {generatedUrl && (
        <p>
          발급된 링크: <a href={generatedUrl}>{generatedUrl}</a>
        </p>
      )}
      <ul>
        {profiles.map((p) => (
          <li key={p.id}>{p.full_name} · {p.phone ?? '연락처 미등록'}</li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: 강사/회원 라우트 페이지 작성**

`app/admin/roster/instructors/page.tsx`:

```typescript
import { RosterTable } from '../roster-table'

export default function InstructorRosterPage() {
  return <RosterTable role="instructor" label="강사" />
}
```

`app/admin/roster/members/page.tsx`:

```typescript
import { RosterTable } from '../roster-table'

export default function MemberRosterPage() {
  return <RosterTable role="member" label="회원" />
}
```

- [ ] **Step 4: E2E 테스트 작성**

`tests/e2e/roster-management.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('owner can view the member roster after a member joins via invite', async ({ page, context }) => {
  const ownerEmail = `owner-roster-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('로스터 테스트 요가원')
  await page.getByPlaceholder('이름').fill('로스터 원장')
  await page.getByPlaceholder('이메일').fill(ownerEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/admin/roster/members')
  await page.getByRole('button', { name: '회원 초대 링크 발급' }).click()
  const inviteUrl = await page.getByRole('link').first().getAttribute('href')

  const memberPage = await context.newPage()
  await memberPage.goto(inviteUrl!)
  await memberPage.getByPlaceholder('이름').fill('로스터 회원')
  await memberPage.getByPlaceholder('이메일').fill(`roster-member-${Date.now()}@test.local`)
  await memberPage.getByPlaceholder('비밀번호').fill('test-password-123')
  await memberPage.getByRole('button', { name: '회원으로 가입하기' }).click()
  await expect(memberPage).toHaveURL(/\/member/)

  await page.reload()
  await expect(page.getByText('로스터 회원')).toBeVisible()
})
```

- [ ] **Step 5: 테스트 실행**

```bash
npm run test:e2e -- roster-management.spec.ts
```

Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add lib/actions/roster.ts app/admin/roster tests/e2e/roster-management.spec.ts
git commit -m "$(cat <<'EOF'
Add owner roster management for instructors and members

Shared RosterTable component parameterized by role, since both
screens are the same list+invite pattern over different profile
roles.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: 원장 예약현황 대시보드

**Files:**
- Create: `lib/actions/dashboard.ts`
- Create: `app/admin/bookings/page.tsx`
- Modify: `app/admin/page.tsx` (요약 카드 추가)
- Modify: `app/admin/layout.tsx` (대시보드/시간표/강사/회원/초대/예약현황 내비게이션 추가 — Task 9, 11, 14에서 만든 화면들을 이제 전부 연결한다)
- Create: `tests/e2e/booking-dashboard.spec.ts`

**Interfaces:**
- Consumes: `bookings`/`class_sessions` RLS(owner용, Task 4/5)
- Produces: 세션별 예약자·대기자 명단을 보여주는 화면 + 대시보드 요약.

- [ ] **Step 1: 대시보드 서버 액션 작성**

`lib/actions/dashboard.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function listSessionsWithRoster() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('class_sessions')
    .select('*, template:class_templates(title), instructor:profiles!class_sessions_instructor_id_fkey(full_name), bookings(id, status, member:profiles!bookings_member_id_fkey(full_name))')
    .gte('date', new Date().toISOString().slice(0, 10))
    .order('date')

  return (data ?? []).map((s: any) => ({
    id: s.id,
    date: s.date,
    title: s.template?.title,
    instructorName: s.instructor?.full_name,
    capacity: s.capacity,
    booked: s.bookings.filter((b: any) => b.status === 'booked'),
    waitlisted: s.bookings.filter((b: any) => b.status === 'waitlisted'),
  }))
}

export async function getDashboardSummary() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { count: todaySessionCount } = await supabase
    .from('class_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('date', today)

  const { count: waitlistedCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'waitlisted')

  return {
    todaySessionCount: todaySessionCount ?? 0,
    waitlistedCount: waitlistedCount ?? 0,
  }
}
```

- [ ] **Step 2: 예약현황 화면 작성**

`app/admin/bookings/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { listSessionsWithRoster } from '@/lib/actions/dashboard'

export default function BookingsDashboardPage() {
  const [sessions, setSessions] = useState<any[]>([])

  useEffect(() => {
    listSessionsWithRoster().then(setSessions)
  }, [])

  return (
    <div>
      <h1>예약 현황</h1>
      {sessions.map((s) => (
        <section key={s.id}>
          <h2>{s.date} · {s.title} · {s.instructorName} · {s.booked.length}/{s.capacity}</h2>
          <p>예약: {s.booked.map((b: any) => b.member?.full_name).join(', ') || '없음'}</p>
          <p>대기: {s.waitlisted.map((b: any) => b.member?.full_name).join(', ') || '없음'}</p>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: 대시보드 요약 카드 추가**

`app/admin/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { getDashboardSummary } from '@/lib/actions/dashboard'

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState({ todaySessionCount: 0, waitlistedCount: 0 })

  useEffect(() => {
    getDashboardSummary().then(setSummary)
  }, [])

  return (
    <div>
      <h1>원장 대시보드</h1>
      <p>오늘 수업 {summary.todaySessionCount}건</p>
      <p>대기중인 예약 {summary.waitlistedCount}건</p>
    </div>
  )
}
```

- [ ] **Step 4: E2E 테스트 작성**

`tests/e2e/booking-dashboard.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('owner sees booked and waitlisted members grouped per session', async ({ page, context }) => {
  const ownerEmail = `owner-dashboard-${Date.now()}@test.local`

  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill('대시보드 테스트 요가원')
  await page.getByPlaceholder('이름').fill('대시보드 원장')
  await page.getByPlaceholder('이메일').fill(ownerEmail)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()

  await page.goto('/admin/schedule')
  await page.getByPlaceholder('클래스명').fill('Dashboard Class')
  await page.locator('select[name="instructorId"]').selectOption({ index: 1 })
  await page.locator('select[name="dayOfWeek"]').selectOption('1')
  await page.locator('input[name="startTime"]').fill('09:00')
  await page.getByPlaceholder('정원').fill('1')
  await page.getByRole('button', { name: '시간표 추가' }).click()

  await page.goto('/admin/invites')
  await page.getByRole('button', { name: '회원 초대 링크 발급' }).click()
  const inviteUrl = await page.getByRole('link').first().getAttribute('href')

  const member = await context.newPage()
  await member.goto(inviteUrl!)
  await member.getByPlaceholder('이름').fill('대시보드 회원')
  await member.getByPlaceholder('이메일').fill(`dashboard-member-${Date.now()}@test.local`)
  await member.getByPlaceholder('비밀번호').fill('test-password-123')
  await member.getByRole('button', { name: '회원으로 가입하기' }).click()
  await member.getByRole('button', { name: '예약하기' }).click()

  await page.goto('/admin/bookings')
  await expect(page.getByText(/예약: 대시보드 회원/)).toBeVisible()
})
```

- [ ] **Step 5: 원장 내비게이션 완성**

지금까지 원장 화면들(`/admin/schedule`, `/admin/invites`, `/admin/roster/instructors`, `/admin/roster/members`, `/admin/bookings`)은 URL을 직접 입력해야 오갈 수 있었다. `app/admin/layout.tsx`를 아래로 교체해 전부 연결한다 (Task 8에서 만든 `data-role="admin"` div를 유지):

```typescript
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-role="admin">
      <nav>
        <Link href="/admin">대시보드</Link>
        <Link href="/admin/schedule">시간표관리</Link>
        <Link href="/admin/roster/instructors">강사관리</Link>
        <Link href="/admin/roster/members">회원관리</Link>
        <Link href="/admin/invites">초대관리</Link>
        <Link href="/admin/bookings">예약현황</Link>
      </nav>
      {children}
    </div>
  )
}
```

- [ ] **Step 6: 테스트 실행**

```bash
npm run test:e2e -- booking-dashboard.spec.ts
```

Expected: PASS.

- [ ] **Step 7: 커밋**

```bash
git add lib/actions/dashboard.ts app/admin tests/e2e/booking-dashboard.spec.ts
git commit -m "$(cat <<'EOF'
Add owner booking/waitlist roster dashboard and connect admin nav

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: 전역 에러 처리 (403 페이지 + 오프라인 배너)

**Files:**
- Create: `lib/errors.ts`
- Create: `app/error/forbidden/page.tsx`
- Create: `app/offline-banner.tsx`
- Modify: `app/layout.tsx` (오프라인 배너 삽입)
- Create: `tests/e2e/error-handling.spec.ts`

**Interfaces:**
- Produces: `isForbiddenError(error): boolean` 헬퍼. `<OfflineBanner />` 클라이언트 컴포넌트.

- [ ] **Step 1: 403/RLS 오류 판별 헬퍼 작성**

`lib/errors.ts`:

```typescript
export function isForbiddenError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return error.code === '42501' || error.message?.toLowerCase().includes('permission denied') === true
}
```

- [ ] **Step 2: 403 페이지 작성**

`app/error/forbidden/page.tsx`:

```typescript
export default function ForbiddenPage() {
  return (
    <div>
      <h1>접근할 수 없습니다</h1>
      <p>이 화면에 접근할 권한이 없습니다. 소속된 요가원의 데이터만 볼 수 있습니다.</p>
      <a href="/">홈으로 돌아가기</a>
    </div>
  )
}
```

- [ ] **Step 3: 오프라인 배너 컴포넌트 작성**

`app/offline-banner.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)
    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => setIsOffline(false)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div role="alert" data-testid="offline-banner">
      인터넷 연결이 끊겼습니다. 예약 등 일부 기능이 동작하지 않을 수 있습니다.
    </div>
  )
}
```

- [ ] **Step 4: 루트 레이아웃에 배너 삽입**

`app/layout.tsx`을 열어 `<body>` 최상단에 `<OfflineBanner />`를 추가한다 (create-next-app이 생성한 기존 `app/layout.tsx`의 `import`와 `<body>{children}</body>` 구조를 유지하면서 아래처럼 수정):

```typescript
import { OfflineBanner } from './offline-banner'
// ...기존 import 유지

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <OfflineBanner />
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 5: E2E 테스트 작성**

`tests/e2e/error-handling.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('offline banner appears when the browser goes offline', async ({ page, context }) => {
  await page.goto('/login')
  await context.setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await expect(page.getByTestId('offline-banner')).toBeVisible()
  await context.setOffline(false)
})

test('forbidden page renders with guidance to go home', async ({ page }) => {
  await page.goto('/error/forbidden')
  await expect(page.getByRole('heading')).toContainText('접근할 수 없습니다')
  await expect(page.getByRole('link', { name: '홈으로 돌아가기' })).toBeVisible()
})
```

- [ ] **Step 6: 테스트 실행**

```bash
npm run test:e2e -- error-handling.spec.ts
```

Expected: PASS.

- [ ] **Step 7: 커밋**

```bash
git add lib/errors.ts app/error app/offline-banner.tsx app/layout.tsx tests/e2e/error-handling.spec.ts
git commit -m "$(cat <<'EOF'
Add forbidden-access page and offline-state banner

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: PWA (manifest + Serwist + 아이콘)

**Files:**
- Create: `public/manifest.json`, `scripts/generate-placeholder-icons.mjs`, `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Create: `app/sw.ts`
- Modify: `next.config.ts`, `app/layout.tsx`
- Create: `tests/e2e/pwa-installability.spec.ts`

**Interfaces:**
- Produces: `/manifest.json`, `/sw.js`가 서빙되고 루트 레이아웃이 이를 링크한다.

- [ ] **Step 1: Serwist 설치**

```bash
npm install serwist @serwist/next
npm install --save-dev sharp
```

- [ ] **Step 2: 플레이스홀더 아이콘 생성 스크립트 작성 및 실행**

`scripts/generate-placeholder-icons.mjs`:

```javascript
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('public/icons', { recursive: true })

for (const size of [192, 512]) {
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 17, g: 17, b: 17, alpha: 1 },
    },
  })
    .png()
    .toFile(`public/icons/icon-${size}.png`)
}

console.log('placeholder icons generated — replace with real branding before launch')
```

```bash
node scripts/generate-placeholder-icons.mjs
```

Expected: `public/icons/icon-192.png`, `public/icons/icon-512.png` 생성됨.

- [ ] **Step 3: manifest 작성**

`public/manifest.json`:

```json
{
  "name": "요가원 관리",
  "short_name": "요가원",
  "description": "요가원 강사·클래스·회원 관리 PWA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#111111",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 4: 서비스워커 엔트리 작성**

`app/sw.ts`:

```typescript
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()
```

- [ ] **Step 5: next.config.ts에 Serwist 연결**

`next.config.ts`:

```typescript
import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
})

const nextConfig: NextConfig = {}

export default withSerwist(nextConfig)
```

- [ ] **Step 6: 루트 레이아웃에 manifest/theme-color 연결**

`app/layout.tsx`의 `metadata` export를 추가/수정:

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '요가원 관리',
  description: '요가원 강사·클래스·회원 관리 PWA',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#111111',
}
```

- [ ] **Step 7: 빌드 후 설치 가능성 확인 E2E 작성**

Serwist는 프로덕션 빌드에서만 서비스워커를 생성하므로 이 테스트는 `next build && next start` 위에서 돈다.

`tests/e2e/pwa-installability.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('manifest and service worker are served', async ({ page, request }) => {
  await page.goto('/login')

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBe('/manifest.json')

  const manifestResponse = await request.get('/manifest.json')
  expect(manifestResponse.ok()).toBe(true)

  const swResponse = await request.get('/sw.js')
  expect(swResponse.ok()).toBe(true)
})
```

- [ ] **Step 8: 프로덕션 빌드로 테스트 실행**

Serwist는 프로덕션 빌드에서만 서비스워커 파일을 만들어내므로, `npm run dev`를 띄우는 기본 Playwright 설정 대신 빌드된 서버로 직접 확인한다. 고정 `sleep` 대신 `wait-on`으로 서버가 뜬 시점을 정확히 기다린다.

```bash
npm install --save-dev wait-on
```

```bash
npm run build
npm run start &
SERVER_PID=$!
npx wait-on http://localhost:3000 --timeout 30000
npx playwright test tests/e2e/pwa-installability.spec.ts
kill $SERVER_PID
```

Expected: manifest link, `/manifest.json`, `/sw.js` 모두 200 응답.

- [ ] **Step 9: 커밋**

```bash
git add public app/sw.ts next.config.ts app/layout.tsx scripts tests/e2e/pwa-installability.spec.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add PWA manifest and Serwist service worker for installability

Icons are solid-color placeholders — swap for real branding before
launch.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: 전체 E2E — 스펙 8절 시나리오 종단 검증

**Files:**
- Create: `tests/e2e/full-flow.spec.ts`

**Interfaces:**
- Consumes: Task 7–15에서 만든 모든 페이지/액션.

- [ ] **Step 1: 스펙 8절의 전체 시나리오를 하나의 테스트로 작성**

원장 온보딩 → 초대 발급 → 강사/회원 가입 → 시간표 등록 → 회원 예약 → 정원 마감 → 대기명단 등록 → 취소 → 자동 승격 → 출석 체크까지 전체 흐름.

`tests/e2e/full-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('full journey: onboarding through attendance', async ({ page, context }) => {
  const stamp = Date.now()

  // 1. 원장 온보딩
  await page.goto('/signup')
  await page.getByPlaceholder('요가원 이름').fill(`풀플로우 요가원 ${stamp}`)
  await page.getByPlaceholder('이름').fill('풀플로우 원장')
  await page.getByPlaceholder('이메일').fill(`owner-fullflow-${stamp}@test.local`)
  await page.getByPlaceholder('비밀번호').fill('test-password-123')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page).toHaveURL(/\/admin/)

  // 2. 시간표 등록 (정원 1 — 대기명단 시나리오를 위해)
  await page.goto('/admin/schedule')
  await page.getByPlaceholder('클래스명').fill('Full Flow Class')
  await page.locator('select[name="instructorId"]').selectOption({ index: 1 })
  await page.locator('select[name="dayOfWeek"]').selectOption('1')
  await page.locator('input[name="startTime"]').fill('09:00')
  await page.getByPlaceholder('정원').fill('1')
  await page.getByRole('button', { name: '시간표 추가' }).click()
  await expect(page.getByText('월요일 09:00 · Full Flow Class')).toBeVisible()

  // 3. 회원 초대 발급 (두 번 — member1, member2)
  await page.goto('/admin/invites')
  await page.getByRole('button', { name: '회원 초대 링크 발급' }).click()
  const invite1 = await page.getByRole('link').first().getAttribute('href')
  await page.getByRole('button', { name: '회원 초대 링크 발급' }).click()
  const invite2 = await page.getByRole('link').first().getAttribute('href')

  // 4. 강사/회원 가입 (member1)
  const member1 = await context.newPage()
  await member1.goto(invite1!)
  await member1.getByPlaceholder('이름').fill('풀플로우 회원1')
  await member1.getByPlaceholder('이메일').fill(`fullflow-member1-${stamp}@test.local`)
  await member1.getByPlaceholder('비밀번호').fill('test-password-123')
  await member1.getByRole('button', { name: '회원으로 가입하기' }).click()
  await expect(member1).toHaveURL(/\/member/)

  const member2 = await context.newPage()
  await member2.goto(invite2!)
  await member2.getByPlaceholder('이름').fill('풀플로우 회원2')
  await member2.getByPlaceholder('이메일').fill(`fullflow-member2-${stamp}@test.local`)
  await member2.getByPlaceholder('비밀번호').fill('test-password-123')
  await member2.getByRole('button', { name: '회원으로 가입하기' }).click()
  await expect(member2).toHaveURL(/\/member/)

  // 5. member1 예약 → 확정, member2 예약 → 대기명단
  await member1.getByRole('button', { name: '예약하기' }).click()
  await expect(member1.getByText('예약이 확정되었습니다.')).toBeVisible()

  await member2.getByRole('button', { name: '대기 등록' }).click()
  await expect(member2.getByText('정원이 마감되어 대기명단에 등록되었습니다.')).toBeVisible()

  // 6. 원장 대시보드에서 예약/대기 확인
  await page.goto('/admin/bookings')
  await expect(page.getByText(/예약: 풀플로우 회원1/)).toBeVisible()
  await expect(page.getByText(/대기: 풀플로우 회원2/)).toBeVisible()

  // 7. member1 취소 → member2 자동 승격
  await member1.goto('/member/bookings')
  await member1.getByRole('button', { name: '취소' }).click()

  await member2.goto('/member')
  await expect(member2.getByText('예약완료')).toBeVisible()

  // 8. 강사(원장) 출석 체크
  await page.goto('/instructor')
  await expect(page.getByText('풀플로우 회원2')).toBeVisible()
  await page.getByRole('button', { name: '출석' }).click()
  await expect(page.getByText('풀플로우 회원2 · attended')).toBeVisible()
})
```

- [ ] **Step 2: 전체 플로우 테스트 실행**

```bash
npm run test:e2e -- full-flow.spec.ts
```

Expected: PASS — 8단계 전부 통과.

- [ ] **Step 3: 전체 테스트 스위트 한 번에 실행 (회귀 확인)**

```bash
npm test
npx supabase test db
npm run test:integration
npm run test:e2e
```

Expected: 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add tests/e2e/full-flow.spec.ts
git commit -m "$(cat <<'EOF'
Add end-to-end test covering the full spec section 8 journey

Onboarding through invite, scheduling, booking, capacity/waitlist,
cancellation with auto-promotion, and attendance — matches the
design spec's E2E scenario verbatim.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Spec Coverage Map

| 스펙 섹션 | 구현 태스크 |
|---|---|
| 1. 배경 및 스코프 (코어 범위, contract_status 확장 지점) | Task 2 |
| 2. 서비스 형태 (멀티테넌트, 3역할, 온보딩, 초대) | Task 2, 3, 7, 9, 10 |
| 3. 전체 아키텍처 (Next.js+Supabase, RLS+RPC 하이브리드, PWA) | Task 1, 2, 7, 17 |
| 4. 테넌트·인증·초대 모델 | Task 2, 3, 7, 8, 9, 10 |
| 5. 데이터 모델 (class_templates/sessions/bookings, 예약·취소·출석 RPC) | Task 4, 5, 6 |
| 6. 핵심 플로우·역할별 화면 | Task 7–15 |
| 7. 에러 처리 (동시예약, 초대오류, RLS 403, 오프라인, 카카오폴백) | Task 5(RPC), 7, 10, 16 |
| 8. 테스트 전략 (RPC/RLS/역할/E2E) | Task 2–6(pgTAP), 5(동시성 통합), 18(E2E) |
| 9. 후속 스펙 메모 | 이번 계획 범위 아님 — `contract_status`, 예약 플로우 훅 지점만 존재 확인(Task 2, 5) |

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-24-yoga-studio-core-management.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
