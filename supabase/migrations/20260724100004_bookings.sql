create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  member_id uuid not null references public.profiles(id),
  status text not null check (status in ('booked', 'waitlisted', 'cancelled', 'attended', 'no_show')),
  created_at timestamptz not null default now()
);

-- 활성 예약(booked/waitlisted)만 세션당 1건으로 제한한다. 테이블 전체에 거는
-- unique (session_id, member_id)는 취소 이력(cancelled) 행까지 잡아버려서,
-- 한 번 취소한 회원이 같은 세션을 영영 재예약할 수 없게 만든다(23505 raw 에러).
-- 취소 후 재예약은 요가원에서 흔한 흐름이므로 partial unique index로 활성 상태만 막고,
-- cancelled/attended/no_show 이력 행은 여러 개 쌓이도록 허용한다.
create unique index bookings_one_active_per_session_member
  on public.bookings (session_id, member_id)
  where status in ('booked', 'waitlisted');

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

-- No explicit grant statements for public.bookings here: this table is
-- created by `postgres`, and the studios/profiles migration's `alter
-- default privileges for role postgres in schema public` already extends
-- select/insert/update/delete on it to authenticated/anon/service_role
-- automatically -- verified via information_schema.role_table_grants after
-- `db reset`, same as Task 3/4's tables. RLS remains the actual access gate
-- for direct table access, and since no insert/update policy exists for
-- ordinary authenticated users, all writes in practice can only happen
-- through the security-definer RPCs below (which run as the table-owning
-- `postgres` and bypass RLS entirely).

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
  -- `is distinct from`, not `<>`: current_role() returns NULL for an
  -- authenticated-but-profile-less caller, and plain `<>` against NULL
  -- evaluates the whole condition to NULL, which `if <NULL> then` treats as
  -- false -- silently skipping this exception instead of raising it. Same
  -- bug class already found and fixed in Task 4's
  -- generate_sessions_for_template.
  if public.current_role() is distinct from 'member' then
    raise exception 'only_members_can_book';
  end if;

  select * into v_session from public.class_sessions where id = p_session_id for update;
  if v_session.id is null then
    raise exception 'session_not_found';
  end if;
  -- `is distinct from` here too, for the same NULL-current_studio_id()
  -- reason -- even though the current_role() check above already blocks a
  -- profile-less caller first, this comparison must not itself regress to a
  -- silently-skipped guard.
  if v_session.studio_id is distinct from public.current_studio_id() then
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

  -- Row lock on the parent class_sessions row (acquired above via `for
  -- update`) is what makes this capacity check + insert atomic across
  -- concurrent callers: a second simultaneous book_session call for the
  -- same session blocks here until the first transaction commits, then
  -- re-reads the now-committed booked_count before deciding
  -- booked/waitlisted. Without that lock this count-then-insert would race.
  select count(*) into v_booked_count from public.bookings where session_id = p_session_id and status = 'booked';

  -- capacity N means N 'booked' rows fit; the (N+1)th booking waitlists.
  -- v_booked_count < capacity is the correct boundary: e.g. capacity=1,
  -- first booking sees v_booked_count=0 (0 < 1 -> booked), second sees
  -- v_booked_count=1 (1 < 1 is false -> waitlisted). Using `<=` here would
  -- incorrectly let capacity+1 bookings all become 'booked'.
  if v_booked_count < v_session.capacity then
    v_status := 'booked';
  else
    v_status := 'waitlisted';
  end if;

  -- bookings_one_active_per_session_member (the partial unique index) is
  -- the actual correctness backstop for "at most one active booking per
  -- member per session" -- the exists() check above is a plain read and
  -- only prevents a duplicate insofar as the surrounding locking serializes
  -- it with any other writer. Catch unique_violation here as defense in
  -- depth so that if an insert ever does race past the exists() check (e.g.
  -- a same-member double-submit under some future concurrency-control
  -- change), the caller sees the same already_booked error the sequential
  -- case raises, instead of a raw 23505.
  begin
    insert into public.bookings (session_id, member_id, status)
    values (p_session_id, auth.uid(), v_status)
    returning * into v_booking;
  exception
    when unique_violation then
      raise exception 'already_booked';
  end;

  return v_booking;
end;
$$;

-- Explicit-grant-only: Postgres grants EXECUTE on newly created functions to
-- PUBLIC by default. book_session does its own role/studio checks inside,
-- so anon should never even reach it -- revoke PUBLIC first, then grant
-- exactly what's intended (authenticated only), matching
-- accept_invite/generate_sessions_for_template in earlier migrations.
revoke execute on function public.book_session(uuid) from public;
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
  -- `is distinct from`, not `<>`: auth.uid() can be NULL for a caller with
  -- no session claim, and `v_booking.member_id <> NULL` would evaluate to
  -- NULL -- silently skipping the exception and letting such a caller
  -- cancel an arbitrary booking by id. `is distinct from` treats NULL as a
  -- real, non-matching value so the ownership check always fires.
  if v_booking.member_id is distinct from auth.uid() then
    raise exception 'not_permitted';
  end if;
  if v_booking.status not in ('booked', 'waitlisted') then
    raise exception 'cannot_cancel';
  end if;

  -- Same parent-row lock as book_session, so a concurrent book_session call
  -- for this session blocks until this cancellation (and any waitlist
  -- promotion below) has committed.
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

-- Explicit-grant-only, same reasoning as book_session above.
revoke execute on function public.cancel_booking(uuid) from public;
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

-- Explicit-grant-only, same reasoning as book_session above: this returns
-- aggregate booking counts across all members (that's the whole point of
-- the function), so it must never be reachable by anon/PUBLIC -- only an
-- authenticated caller whose own current_studio_id() scopes the result.
revoke execute on function public.list_upcoming_sessions_for_member() from public;
grant execute on function public.list_upcoming_sessions_for_member() to authenticated;

-- Task 2에서 만든 tests.clear_authentication()은 "anon으로 전환"(비인증 상태 시뮬레이션)이지
-- RLS 우회가 아니다 (anon도 일반 role이라 RLS를 그대로 받는다) — postgres만 BYPASSRLS를 가진다.
-- 이 태스크부터 픽스처를 직접 되돌리는 테스트가 필요해, RLS를 우회하는 별도 헬퍼를 추가한다.
--
-- Left PUBLIC-executable (matching tests.authenticate_as/
-- tests.clear_authentication in Task 2's migration, granted but not
-- PUBLIC-revoked): this does NOT itself grant privilege escalation, because
-- `set local role postgres` is enforced by Postgres's own SET ROLE rule --
-- it only succeeds if the connection's session_user is already a member of
-- the target role (every role is trivially a member of itself), or is a
-- superuser. Verified empirically in this local stack: `postgres` here is
-- NOT flagged superuser (rolsuper = false) -- what actually makes this
-- succeed is that a pgTAP suite's session_user stays `postgres` for the
-- whole connection (SET ROLE/SET LOCAL ROLE change only the *current* role,
-- never session_user), so `set local role postgres` is just "become the
-- role you already are," which always succeeds regardless of superuser
-- status. In a real hosted deployment, PostgREST/pooler connections run as
-- `authenticator`/`anon`/`authenticated` at the session_user level --
-- confirmed via pg_auth_members that none of those are members of
-- `postgres` and none are superusers -- so `set local role postgres` inside
-- this function would itself fail with "permission denied to set role" for
-- those callers, independent of whether EXECUTE is granted. The EXECUTE
-- grant makes this reachable; the SET ROLE membership check is the actual
-- enforcement. (Separately, `tests` isn't even in this project's exposed
-- PostgREST `schemas` list -- supabase/config.toml's `[api] schemas =
-- ["public", "graphql_public"]` -- so this is unreachable over the REST API
-- in any environment regardless of the grant.)
create or replace function tests.bypass_rls()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  set local role postgres;
end;
$$;

grant execute on function tests.bypass_rls() to authenticated, anon;
