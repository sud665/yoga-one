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

-- RLS policies only filter which rows are visible for an operation that is
-- already permitted at the grant level; since these tables are owned by the
-- `postgres` role (not `supabase_admin`), the default ACL does not extend
-- select/insert/update/delete to `authenticated`/`anon`/`service_role` the
-- way it would for tables created by `supabase_admin` on hosted Supabase.
-- Grant exactly the operations covered by the policies above to
-- authenticated/anon; `anon` additionally needs `select` on studios so an
-- unauthenticated request is RLS-filtered to zero rows instead of erroring
-- with permission denied. `service_role` is Supabase's trusted
-- RLS-bypassing role and gets full DML, matching hosted-Supabase defaults.
grant select on public.studios to authenticated, anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.studios, public.profiles to service_role;

-- Local-CLI parity fix: on hosted Supabase, tables are created by
-- `supabase_admin`, whose default ACL already grants full DML to
-- anon/authenticated/service_role. The local CLI applies migrations as
-- `postgres`, whose default ACL only grants Dxtm (truncate/references/
-- trigger/maintain) to those roles. Every later task's migrations create
-- new RLS-protected tables the same way this one does, so fix it once at
-- the root: future tables created by `postgres` in `public` automatically
-- get the same DML grants, and RLS policies remain the actual access gate.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated, anon, service_role;

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

-- Explicit-grant-only: revoke the default PUBLIC execute grant so anon/
-- PUBLIC have no path to this function at all, even though the NOT NULL
-- auth.uid() constraint on profiles.id currently makes an anon call abort
-- atomically (not exploitable today, but this keeps the posture consistent
-- with the multi-tenant "no exceptions" constraint).
revoke execute on function public.create_studio_and_owner_profile(text, text) from public;
grant execute on function public.create_studio_and_owner_profile(text, text) to authenticated;
