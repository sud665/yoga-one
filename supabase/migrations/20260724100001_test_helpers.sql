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

-- Note: `postgres` has the BYPASSRLS role attribute (and owns every table
-- created via CLI migrations), so `set local role postgres` here would make
-- every subsequent query bypass RLS entirely rather than simulate "no
-- authenticated user." `anon` is Supabase's actual unauthenticated-request
-- role (no BYPASSRLS), so with no `request.jwt.claim.sub` set,
-- `current_studio_id()` resolves to null and RLS policies correctly filter
-- out all rows, which is what "unauthenticated sees nothing" assertions
-- expect.
create or replace function tests.clear_authentication()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
end;
$$;

-- `tests` is a new schema; unlike functions (whose EXECUTE defaults to
-- PUBLIC), new schemas grant no USAGE to PUBLIC. Once authenticate_as/
-- clear_authentication switch the session's current role away from
-- `postgres`, later calls to these same functions (e.g. re-authenticating
-- as a different test user, or clearing auth at the end of a test) need
-- authenticated/anon to be able to reach the `tests` schema at all.
grant usage on schema tests to authenticated, anon;
grant execute on function tests.authenticate_as(uuid) to authenticated, anon;
grant execute on function tests.clear_authentication() to authenticated, anon;
