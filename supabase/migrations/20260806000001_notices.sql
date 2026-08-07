-- ---------------------------------------------------------------------------
-- 공지사항 (studio-wide announcements). Owner writes, everyone in the studio
-- reads -- scoped by `target` so a member never sees an instructor-only
-- notice and vice versa; 'all' is visible to both. The owner always sees
-- every notice in their own studio regardless of target (their own "관리"
-- list has to show everything they've posted, not just what they'd see as a
-- reader).
-- ---------------------------------------------------------------------------

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text not null,
  body text not null,
  target text not null check (target in ('all', 'member', 'instructor')),
  pin boolean not null default false,
  views integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.notices enable row level security;

-- Mirrors invites' "owner manages own studio X" pattern (20260724100002): one
-- `for all` policy covers the owner's own select/insert/update/delete,
-- scoped to their own studio. There's no edit/delete UI today (create + read
-- only), but leaving update/delete open at the RLS layer here -- same as
-- invites does -- means an edit/delete screen can be added later without
-- revisiting this policy.
create policy "notices: owner manages own studio notices"
  on public.notices for all
  using (studio_id = public.current_studio_id() and public.current_role() = 'owner')
  with check (studio_id = public.current_studio_id() and public.current_role() = 'owner');

-- Additive, not exclusive -- Postgres RLS policies for the same command OR
-- together, so this grants instructor/member read access to notices
-- actually targeted at them on top of (not instead of) the owner policy
-- above.
create policy "notices: instructor/member reads targeted notices"
  on public.notices for select
  using (
    studio_id = public.current_studio_id()
    and (target = 'all' or target = public.current_role()::text)
  );

-- No explicit grant statements: created by `postgres`, and
-- 20260724100000's `alter default privileges for role postgres in schema
-- public` already covers select/insert/update/delete for
-- authenticated/anon/service_role. RLS above is the actual access gate.

-- views is the one column a non-owner reader needs to mutate (bump on each
-- detail open), and non-owners have no update grant/policy on this table at
-- all -- same shape as withdraw_my_account needing a SECURITY DEFINER
-- escape hatch for a write an ordinary RLS policy can't express. Re-checks
-- visibility itself (mirroring get_invite_preview/accept_invite's own
-- re-validation) rather than trusting that the caller only ever arrives here
-- via a list call, since this is reachable directly by id.
create or replace function public.get_notice(p_id uuid)
returns public.notices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notice public.notices;
begin
  select * into v_notice from public.notices where id = p_id;
  if v_notice.id is null then
    raise exception 'notice_not_found';
  end if;
  if v_notice.studio_id is distinct from public.current_studio_id() then
    raise exception 'not_permitted';
  end if;
  if public.current_role() is distinct from 'owner'
     and v_notice.target is distinct from 'all'
     and v_notice.target is distinct from public.current_role()::text then
    raise exception 'not_permitted';
  end if;

  update public.notices set views = views + 1 where id = p_id;

  select * into v_notice from public.notices where id = p_id;
  return v_notice;
end;
$$;

-- CLAUDE.md: revoke before grant (Postgres grants EXECUTE to PUBLIC on
-- creation). anon/authenticated revoke is belt-and-suspenders on top of
-- 20260802010000's default-privileges change, matching every RPC since.
revoke execute on function public.get_notice(uuid) from public;
revoke execute on function public.get_notice(uuid) from anon, authenticated;
grant execute on function public.get_notice(uuid) to authenticated;
