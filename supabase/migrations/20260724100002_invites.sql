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

-- No explicit grant on public.invites here: this table is created by
-- `postgres`, and the `alter default privileges for role postgres in schema
-- public` statement from the studios/profiles migration already extends
-- select/insert/update/delete on it to authenticated/anon/service_role
-- automatically (verified via information_schema.role_table_grants and a
-- direct owner-role RLS check, not just by the pgTAP suite passing -- the
-- pgTAP assertions below only exercise the security-definer RPCs, which run
-- as table-owning `postgres` and bypass RLS/grants entirely, so they would
-- pass even if direct-table access were broken). RLS remains the actual
-- access gate: owners can manage their own studio's invites directly, and
-- non-owners/anon are filtered to zero rows by the policy above.

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

-- Intentionally left PUBLIC-executable (anon included): this RPC is the
-- unauthenticated invite-preview lookup ("is this code valid, and for what
-- studio/role?") and must be callable before signup/login. It only ever
-- returns studio_name/role/valid -- never the invites row itself (so never
-- the `code`, `id`, `created_by`, etc.) -- so open execute access does not
-- leak anything beyond what the invite link itself already encodes.
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

-- Explicit-grant-only, matching create_studio_and_owner_profile in the
-- studios/profiles migration: Postgres grants EXECUTE on newly created
-- functions to PUBLIC by default, so without this revoke `accept_invite`
-- would remain callable by anon/PUBLIC despite only being granted to
-- `authenticated` below. The profiles.id NOT NULL/PK constraint currently
-- makes an anon call abort atomically on the insert (auth.uid() is null for
-- anon, so profile_already_exists never fires but the insert then violates
-- the primary key not-null constraint and the whole call rolls back) -- not
-- exploitable today, but this keeps the posture consistent with
-- "authenticated-only" as the real, enforced boundary rather than an
-- accident of a NULL check.
revoke execute on function public.accept_invite(text, text) from public;
grant execute on function public.accept_invite(text, text) to authenticated;
