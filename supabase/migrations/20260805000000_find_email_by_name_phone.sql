-- ---------------------------------------------------------------------------
-- "이메일 찾기": let a signed-out visitor recover which email they registered
-- with, by matching full_name + phone against public.profiles. This is
-- necessarily anon-callable (there is no session yet), so two things this
-- migration deliberately does *not* try to be:
--
--   - Rate limiting / brute-force protection: out of scope for a single RPC.
--     full_name + phone together already raise the guessing cost far above
--     either alone (an attacker needs both, for the same real person), and
--     this only ever reveals a *masked* email, never the full address.
--   - Uniqueness across studios: full_name/phone are not unique columns,
--     `limit 1` just picks whichever matching profile the query finds first.
--     Two different people can legitimately share a name; a false-negative
--     match here just falls through to the same generic
--     "일치하는 계정을 찾을 수 없습니다" the UI already shows for no-match.
--
-- Masking happens inside the function, not in application code: this RPC is
-- reachable directly over Supabase's public REST API with nothing but the
-- anon key (same as any anon-granted RPC), so a caller that bypasses this
-- app's own server action entirely still only ever gets the masked form.
--
-- phone is stored as whatever the update_my_profile caller typed (see
-- 20260803000000 -- it trims but does not reformat), so both sides of the
-- comparison strip non-digits before matching rather than assuming either
-- is already normalized.
-- ---------------------------------------------------------------------------
create or replace function public.find_email_by_name_phone(p_full_name text, p_phone text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select
    left(split_part(u.email, '@', 1), 2) || '***@' || split_part(u.email, '@', 2)
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.full_name = btrim(p_full_name)
    and regexp_replace(p.phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
    and p.phone is not null
    and p_phone is not null
  limit 1
$$;

-- Belt-and-suspenders, matching 20260803000000's own reasoning: the
-- `alter default privileges ... revoke execute on functions from anon,
-- authenticated` in 20260802010000 already covers newly created functions,
-- but stating the revokes here keeps this file self-correct if it's ever
-- replayed against a database where that default has drifted.
revoke execute on function public.find_email_by_name_phone(text, text) from public;
revoke execute on function public.find_email_by_name_phone(text, text) from authenticated;
grant execute on function public.find_email_by_name_phone(text, text) to anon;
