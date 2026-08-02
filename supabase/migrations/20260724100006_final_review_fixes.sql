-- Final whole-branch review fixes. Bundles four independent findings that
-- each touch an existing SECURITY DEFINER function or grant, none large
-- enough to deserve its own migration:
--
--   1. cancel_booking's lock order deadlocks against book_session under
--      concurrency (reproduced live).
--   2. Two SQL call sites compute "오늘" from current_date (server/session
--      timezone, effectively UTC) instead of KST (Asia/Seoul, UTC+9) --
--      wrong for a 9-hour window every day.
--   3. profiles has an unused, unrestricted UPDATE surface: no code in this
--      branch ever updates profiles, but the grant+policy would let an
--      authenticated caller change their own role/studio_id/contract_status
--      directly via the client SDK.
--   4. One remaining bare `<>` comparison against current_role() predates
--      the `is distinct from` convention documented in CLAUDE.md.
--   5. mark_attendance's NULL p_status bypasses its own invalid_status guard
--      via the same NULL-propagation-through-IN class of bug.

-- ---------------------------------------------------------------------------
-- 1. cancel_booking: fix lock-cycle deadlock against book_session.
--
-- The old body locked the *booking* row first (`select ... for update`),
-- then the parent class_sessions row, then (when promoting a waitlisted
-- booking) the waitlist head. book_session locks class_sessions first. Two
-- concurrent cancel_booking calls on the same session -- one cancelling a
-- 'booked' row (which then reaches for the waitlist head), another
-- cancelling that exact waitlisted row -- could each end up holding the lock
-- the other needed next: a genuine Postgres deadlock, reproduced live.
--
-- Fix: read the booking's session_id WITHOUT locking the booking row first,
-- lock class_sessions first (matching book_session's order), then lock and
-- re-validate the booking row.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_booking public.bookings;
  v_promoted public.bookings;
begin
  -- Unlocked read, deliberately: locking class_sessions before the booking
  -- row (below) is what breaks the deadlock cycle described above.
  select session_id into v_session_id from public.bookings where id = p_booking_id;
  if v_session_id is null then
    raise exception 'booking_not_found';
  end if;

  -- Row lock on the parent class_sessions row first, same order as
  -- book_session, so a concurrent book_session/cancel_booking call for this
  -- session serializes behind this one instead of racing or deadlocking.
  perform 1 from public.class_sessions where id = v_session_id for update;

  -- Now lock and re-validate the booking row itself -- re-fetch rather than
  -- trust the unlocked read above, in case it changed while this call
  -- waited for the class_sessions lock.
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
-- CREATE OR REPLACE FUNCTION preserves the function's OID (unlike DROP +
-- CREATE), so the existing revoke/grant from supabase/migrations/20260724100004_bookings.sql
-- (authenticated-only, PUBLIC revoked) carries over unchanged -- no need to
-- repeat it here. Re-verified by the pgTAP suite still passing after this
-- migration (a lost grant would surface as "permission denied" instead of
-- the expected custom exceptions).

-- ---------------------------------------------------------------------------
-- 2. KST (Asia/Seoul, UTC+9) date boundary, not current_date (server/session
-- timezone, effectively UTC in every environment this app runs in).
-- `now()` is an absolute instant (timestamptz), unaffected by session
-- timezone -- `at time zone 'Asia/Seoul'` converts that instant to a
-- Seoul-local timestamp before taking the date part, without touching the
-- database's global timezone setting (which would silently affect every
-- other timestamptz rendering in the schema, a much bigger blast radius for
-- no extra benefit). Asia/Seoul has no daylight-saving transitions, so this
-- conversion is safe year-round.
-- ---------------------------------------------------------------------------

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
    -- was `s.date >= current_date` -- wrong for the 9-hour KST-early-morning
    -- window (00:00-09:00 KST = previous-day 15:00-24:00 UTC), where
    -- current_date is still "yesterday" and a member's already-started
    -- "today" session would be silently excluded from their own schedule.
    and s.date >= (now() at time zone 'Asia/Seoul')::date
  order by s.date
$$;
-- Grant carries over from supabase/migrations/20260724100004_bookings.sql (same reasoning as
-- cancel_booking above).

create or replace function public._generate_sessions_internal(p_template_id uuid, p_weeks_ahead integer)
returns setof public.class_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template public.class_templates;
  v_date date;
  v_today date;
begin
  select * into v_template from public.class_templates where id = p_template_id;
  if v_template.id is null then
    raise exception 'template_not_found';
  end if;

  -- was `v_date := current_date` -- during the KST-early-morning window
  -- (see comment above list_upcoming_sessions_for_member) this anchored
  -- generation on UTC-"yesterday", which could emit a session dated one day
  -- in the past from a Seoul-local perspective.
  v_today := (now() at time zone 'Asia/Seoul')::date;
  v_date := v_today;
  while extract(dow from v_date)::smallint <> v_template.day_of_week loop
    v_date := v_date + 1;
  end loop;

  -- Counted loop (unchanged from the original off-by-one fix -- see
  -- supabase/migrations/20260724100003_class_schedule.sql's own comment):
  -- always produces exactly p_weeks_ahead sessions regardless of the
  -- starting offset.
  for i in 0..(p_weeks_ahead - 1) loop
    insert into public.class_sessions (template_id, studio_id, date, instructor_id, capacity)
    values (v_template.id, v_template.studio_id, v_date, v_template.instructor_id, v_template.capacity)
    on conflict (template_id, date) do nothing;
    v_date := v_date + 7;
  end loop;

  -- was `date >= current_date` -- same KST reasoning as v_date's anchor
  -- above; reuse v_today rather than re-deriving the expression twice.
  return query select * from public.class_sessions where template_id = p_template_id and date >= v_today order by date;
end;
$$;
-- PUBLIC already revoked in supabase/migrations/20260724100003_class_schedule.sql (internal-only,
-- reached solely via generate_sessions_for_template/generate_sessions_for_all_templates,
-- both SECURITY DEFINER owned by postgres); CREATE OR REPLACE preserves that.

-- ---------------------------------------------------------------------------
-- 3. Drop the unused, unrestricted profiles UPDATE surface.
--
-- No code anywhere in this branch updates profiles (re-confirmed with a
-- fresh grep across lib/ and app/ immediately before writing this migration:
-- zero `.update(` calls against the profiles table). Left as-is, the
-- "self or owner" UPDATE policy plus the `update` grant to `authenticated`
-- let an owner run `update profiles set role='member' where id=<self>`
-- directly via the client SDK and permanently lock themselves out of
-- administering their own studio (no service-role rescue path exists in the
-- product), and let any member set their own contract_status (a column
-- reserved for a future 전자계약 spec) to an arbitrary value.
--
-- Cleanest fix per the review: drop the policy and the grant entirely.
-- Profile editing can be reintroduced later behind a proper RPC when
-- actually needed. service_role keeps its own explicit update grant (from
-- supabase/migrations/20260724100000_studios_and_profiles.sql) untouched --
-- this only removes the `authenticated` surface.
-- ---------------------------------------------------------------------------
drop policy "profiles: self or owner update" on public.profiles;
revoke update on public.profiles from authenticated;

-- ---------------------------------------------------------------------------
-- 4. Last remaining bare `<>` against current_role() -- CLAUDE.md: "Never
-- compare current_role(), current_studio_id(), or auth.uid() with <>. Use
-- is distinct from." current_role() returns NULL for an authenticated caller
-- with no profiles row yet; `if <NULL> then` is treated as false in
-- PL/pgSQL, so the old `<>` silently skipped this exception instead of
-- raising it. (With the profiles UPDATE grant now revoked for
-- `authenticated` above, this trigger is unreachable via that role either
-- way -- it still applies to service_role, which retains its own update
-- grant and is not exempt from this table's triggers just because it
-- bypasses RLS.)
-- ---------------------------------------------------------------------------
create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role or new.studio_id is distinct from old.studio_id then
    if public.current_role() is distinct from 'owner' then
      raise exception 'not_permitted_role_change';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. mark_attendance: reject a NULL p_status explicitly.
--
-- `p_status not in ('attended', 'no_show')` evaluates to NULL (not true)
-- when p_status itself is NULL, and PL/pgSQL's `if <NULL> then` is treated
-- as false -- the same NULL-propagation bug class CLAUDE.md documents for
-- `<>` comparisons, but here on input validation rather than an identity
-- comparison. A NULL p_status silently bypassed this guard entirely instead
-- of being rejected as invalid_status.
-- ---------------------------------------------------------------------------
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
  if p_status is null or p_status not in ('attended', 'no_show') then
    raise exception 'invalid_status';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking.id is null then
    raise exception 'booking_not_found';
  end if;

  select * into v_session from public.class_sessions where id = v_booking.session_id;
  if v_session.studio_id is distinct from public.current_studio_id() then
    raise exception 'not_permitted';
  end if;
  if v_session.instructor_id is distinct from auth.uid() and public.current_role() is distinct from 'owner' then
    raise exception 'not_permitted';
  end if;
  if v_booking.status <> 'booked' then
    raise exception 'booking_not_confirmed';
  end if;

  update public.bookings set status = p_status where id = p_booking_id returning * into v_booking;
  return v_booking;
end;
$$;
-- Grant carries over from supabase/migrations/20260724100005_attendance.sql (same reasoning as
-- cancel_booking above).
