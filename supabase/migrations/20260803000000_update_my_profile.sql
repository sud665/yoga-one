-- ---------------------------------------------------------------------------
-- Reintroduce profile editing, behind an RPC.
--
-- 20260724100006 dropped the "profiles: self or owner update" policy and
-- revoked UPDATE on public.profiles from `authenticated`, because a blanket
-- update surface let an owner run `update profiles set role='member' where
-- id=<self>` from the client SDK and permanently lock themselves out of
-- their own studio (no service-role rescue path exists in this product), and
-- let any member write their own contract_status -- a column reserved for a
-- future 전자계약 spec. That migration's own comment named the way back:
-- "Profile editing can be reintroduced later behind a proper RPC when
-- actually needed." The 프로필 screen is that need.
--
-- The whole point is that the column list is fixed in the function body
-- rather than chosen by the caller: full_name and phone, nothing else. role,
-- studio_id, contract_status, and created_at are unreachable from here no
-- matter what the client sends, so restoring "a user can fix their own name"
-- does not restore the escalation surface along with it. The table-level
-- UPDATE grant stays revoked.
-- ---------------------------------------------------------------------------
create or replace function public.update_my_profile(p_full_name text, p_phone text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text := nullif(btrim(p_full_name), '');
  -- Empty string and NULL are the same thing for an optional field, and the
  -- form posts '' for a cleared input. Collapsing them here keeps the column
  -- from accumulating rows that are blank-but-not-null.
  v_phone text := nullif(btrim(p_phone), '');
  v_profile public.profiles;
begin
  -- `is null`, not a `<>` comparison, but the same hazard CLAUDE.md
  -- documents: auth.uid() is NULL for a caller with no session claim, and
  -- the update below would then match zero rows and fall through to
  -- profile_not_found -- a misleading error for what is really an
  -- authentication failure.
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if v_full_name is null then
    raise exception 'full_name_required';
  end if;

  update public.profiles
    set full_name = v_full_name,
        phone = v_phone
    where id = auth.uid()
    returning * into v_profile;

  if v_profile.id is null then
    raise exception 'profile_not_found';
  end if;

  return v_profile;
end;
$$;

-- CLAUDE.md: every new SECURITY DEFINER function needs the revoke before its
-- grant, because Postgres grants EXECUTE to PUBLIC on creation. The
-- anon/authenticated revoke is belt-and-suspenders on top of
-- 20260802010000's `alter default privileges ... revoke execute on functions
-- from anon, authenticated` -- that default now covers new functions, but
-- stating it here means this file is still correct if it is ever replayed
-- against a database where that default privilege has drifted.
revoke execute on function public.update_my_profile(text, text) from public;
revoke execute on function public.update_my_profile(text, text) from anon, authenticated;
grant execute on function public.update_my_profile(text, text) to authenticated;
