-- ---------------------------------------------------------------------------
-- 탈퇴 (member/instructor self-service account withdrawal).
--
-- Anonymizes public.profiles rather than deleting it. bookings.member_id,
-- class_templates.instructor_id, class_sessions.instructor_id, and
-- invites.created_by all `references public.profiles(id)` with no ON DELETE
-- clause (plain RESTRICT), so a studio with even one booking or one
-- generated session for this person makes a real DELETE fail outright --
-- which is every realistic member and instructor. Keeping the row (with its
-- role/studio_id intact) preserves that history for the studio's own
-- records; only full_name/phone, the two personally-identifying columns,
-- are scrubbed.
--
-- profiles.id -> auth.users.id is itself `on delete cascade`, so a real
-- DELETE FROM auth.users would cascade into the exact same FK wall from the
-- other direction. Ban + mangle the email instead: banned_until stops
-- GoTrue from ever authenticating this row again, and rewriting the email
-- frees the *original* address immediately, which is what the design copy's
-- "같은 이메일로 다시 초대받으면 언제든 돌아올 수 있습니다" actually depends
-- on -- a fresh invite+signup creates a brand-new auth.users row, it does
-- not (and structurally cannot) resurrect this one.
-- ---------------------------------------------------------------------------

-- Anonymous-by-design: no FK to profiles (that row survives, but storing the
-- reason *on* it would tie feedback to a row this same function just scrubbed
-- the name off of, for no benefit -- studio_id + role is the granularity the
-- 탈퇴 사유 dropdown actually needs to be useful for). Owner-readable via RLS
-- like every other studio-scoped table; nothing in this pass adds a screen
-- that displays it, only the capture.
create table public.withdrawal_feedback (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  role public.profile_role not null check (role in ('instructor', 'member')),
  reason text,
  created_at timestamptz not null default now()
);

alter table public.withdrawal_feedback enable row level security;

create policy "withdrawal_feedback: owner views own studio"
  on public.withdrawal_feedback for select
  using (studio_id = public.current_studio_id() and public.current_role() = 'owner');

-- No grant statements here: created by `postgres`, and
-- 20260724100000's `alter default privileges for role postgres in schema
-- public grant select, insert, update, delete on tables to authenticated,
-- anon, service_role` already covers it. RLS (above) and the fact that only
-- withdraw_my_account below ever inserts into it are the actual access gates.

create or replace function public.withdraw_my_account(p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.profile_role;
  v_studio_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role, studio_id into v_role, v_studio_id from public.profiles where id = auth.uid();
  if v_role is null then
    raise exception 'profile_not_found';
  end if;
  -- No owner path: an owner "withdrawing" would orphan the whole studio (no
  -- one left to manage instructors/invites/schedule). Transferring or
  -- closing a studio is a different, unbuilt feature -- out of scope here.
  if v_role = 'owner' then
    raise exception 'owner_cannot_withdraw';
  end if;

  update public.profiles
    set full_name = case when v_role = 'instructor' then '탈퇴한 강사' else '탈퇴한 회원' end,
        phone = null
    where id = auth.uid();

  update auth.users
    set banned_until = 'infinity',
        email = 'withdrawn+' || replace(auth.uid()::text, '-', '') || '@deleted.invalid'
    where id = auth.uid();

  if p_reason is not null and btrim(p_reason) <> '' then
    insert into public.withdrawal_feedback (studio_id, role, reason) values (v_studio_id, v_role, btrim(p_reason));
  end if;
end;
$$;

-- CLAUDE.md: revoke before grant (Postgres grants EXECUTE to PUBLIC on
-- creation). The anon/authenticated revoke is belt-and-suspenders on top of
-- 20260802010000's default-privileges change, matching update_my_profile's
-- own reasoning for restating it.
revoke execute on function public.withdraw_my_account(text) from public;
revoke execute on function public.withdraw_my_account(text) from anon, authenticated;
grant execute on function public.withdraw_my_account(text) to authenticated;
