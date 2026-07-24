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

-- No explicit grant statements for class_templates/class_sessions here: both
-- tables are created by `postgres`, and the studios/profiles migration's
-- `alter default privileges for role postgres in schema public` already
-- extends select/insert/update/delete on them to
-- authenticated/anon/service_role automatically -- verified (not assumed)
-- via information_schema.role_table_grants after `db reset`, same as Task
-- 3's invites table. RLS remains the actual access gate: assertion 1 below
-- exercises this directly (a raw `insert into public.class_templates` as an
-- authenticated owner, not via any security-definer RPC), so a missing
-- grant here would surface as an immediate "permission denied for table"
-- error rather than a silently-empty result.

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

-- Explicit-grant-only, `internal`-by-name and by design: this is the shared
-- generation routine that both generate_sessions_for_template (owner-gated)
-- and generate_sessions_for_all_templates (cron-only) delegate to; it
-- performs no authorization check of its own -- it trusts its two callers to
-- have already checked. Revoking PUBLIC execute does not break either
-- caller: both are themselves `security definer` functions owned by
-- `postgres`, and a security-definer function's *subsequent* permission
-- checks (including nested function-call EXECUTE checks) run as its owner,
-- who -- as the owning role -- always implicitly has EXECUTE on its own
-- functions regardless of GRANT/REVOKE. Without this revoke, any
-- authenticated/anon caller could invoke this directly and generate
-- sessions for an arbitrary template_id with zero studio/role checks,
-- entirely bypassing generate_sessions_for_template's ownership gate.
revoke execute on function public._generate_sessions_internal(uuid, integer) from public;

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
  -- `is distinct from` (not `<>`) on both sides: current_role()/
  -- current_studio_id() resolve to NULL for an authenticated caller who has
  -- signed up but has no public.profiles row yet (a real, reachable state --
  -- e.g. before calling create_studio_and_owner_profile or accept_invite).
  -- With plain `<>`, `NULL <> 'owner' OR v_studio_id <> NULL` evaluates to
  -- NULL, and a bare `if NULL then ... end if;` in PL/pgSQL is treated as
  -- false -- silently skipping the exception and letting a profile-less
  -- caller trigger session generation for an arbitrary studio's template.
  -- `is distinct from` treats NULL as a real, non-matching value on both
  -- comparisons, closing that gap while leaving every non-NULL case
  -- (the only cases the brief's own test assertions exercise) unchanged.
  if public.current_role() is distinct from 'owner' or v_studio_id is distinct from public.current_studio_id() then
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

-- Explicit-grant-only: Postgres grants EXECUTE on new functions to PUBLIC by
-- default. generate_sessions_for_template does its own owner+studio check
-- inside, so it's meant for authenticated studio owners only (anon can never
-- pass the check, but it should not even be callable) -- revoke PUBLIC
-- first, then grant exactly what's intended.
revoke execute on function public.generate_sessions_for_template(uuid, integer) from public;
grant execute on function public.generate_sessions_for_template(uuid, integer) to authenticated;

-- generate_sessions_for_all_templates is the cron-only weekly rollover: it
-- iterates every template across every studio with no per-call
-- authorization at all (by design -- it isn't meant to take a
-- caller-supplied scope). It is invoked by pg_cron as the job owner
-- (`postgres`, the role that registers the schedule below), never by
-- application code, so it gets no grant to authenticated/anon -- only the
-- PUBLIC revoke, so no other role can reach it directly either.
revoke execute on function public.generate_sessions_for_all_templates() from public;

create extension if not exists pg_cron;

select cron.schedule('weekly-session-rollover', '0 3 * * 0', $$select public.generate_sessions_for_all_templates()$$);
