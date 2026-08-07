-- ---------------------------------------------------------------------------
-- 회원 등록 (원장이 직접, 3단계 마법사: 기본정보 -> 약관동의 -> 확인/서명).
-- This is NOT an alternative signup path -- it still ends in the exact same
-- invites/accept_invite flow every other member goes through (the new
-- member sets their own password by following the generated invite link).
-- What it adds is capturing the membership plan/pricing/agreement/signature
-- *before* that invite is ever sent, so by the time the member actually
-- accepts it their contract is already signed -- accept_invite (redefined
-- below) checks for a matching registration and skips the 'pending'
-- contract_status entirely when one exists.
--
-- register_member creates the invite row itself (not a separate
-- createInvite() call from the client) so the two inserts are one atomic
-- unit -- an invite with no matching registration, or a registration with no
-- invite to redeem, are both broken half-states this must never leave
-- behind. The invite code itself is generated in TypeScript (nanoid(10),
-- the same call lib/actions/invites.ts's createInvite already uses) and
-- passed in, rather than generated here with SQL's non-cryptographic
-- random() -- an invite code grants account creation, so it keeps the same
-- CSPRNG the rest of the app already uses for that instead of a second,
-- weaker generator.
-- ---------------------------------------------------------------------------

create table public.member_registrations (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  invite_id uuid references public.invites(id) on delete set null,
  -- Filled in by accept_invite once the member actually redeems the invite
  -- this registration created -- null until then.
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  phone text not null,
  email text not null,
  plan text not null,
  term_months integer not null,
  start_date date not null,
  classes text[] not null default '{}',
  total_price integer not null,
  -- { terms: bool, privacy: bool, refund: bool, safety: bool, marketing: bool, photo: bool }
  -- -- the agreement catalog itself (titles/body text/required flag) lives in
  -- lib/membership-plans.ts, not the database; this only records which ones
  -- were checked at signing time.
  agreements jsonb not null,
  signature_name text not null,
  signed_at timestamptz not null default now(),
  -- Set by the member detail sheet's "일시정지" action; null means active.
  -- No corresponding "how long" input in the design (a single click, not a
  -- dialog) -- this only records that a pause happened and when.
  paused_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.member_registrations enable row level security;

-- Mirrors invites/notices' "owner manages own studio X" pattern: one `for
-- all` policy covers the owner's own select/insert/update (연장/일시정지),
-- scoped to their own studio. No non-owner ever reads this table directly --
-- a member's own membership summary is a possible future screen, not
-- something this pass builds.
create policy "member_registrations: owner manages own studio registrations"
  on public.member_registrations for all
  using (studio_id = public.current_studio_id() and public.current_role() = 'owner')
  with check (studio_id = public.current_studio_id() and public.current_role() = 'owner');

-- No explicit grant statements: created by `postgres`, and
-- 20260724100000's `alter default privileges for role postgres in schema
-- public` already covers select/insert/update/delete for
-- authenticated/anon/service_role. RLS above is the actual access gate.

create or replace function public.register_member(
  p_code text,
  p_full_name text,
  p_phone text,
  p_email text,
  p_plan text,
  p_term_months integer,
  p_start_date date,
  p_classes text[],
  p_total_price integer,
  p_agreements jsonb,
  p_signature_name text
)
returns table (invite_id uuid, registration_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_studio_id uuid;
  v_invite_id uuid;
  v_registration_id uuid;
begin
  if public.current_role() is distinct from 'owner' then
    raise exception 'not_permitted';
  end if;
  v_studio_id := public.current_studio_id();

  if btrim(coalesce(p_full_name, '')) = '' or btrim(coalesce(p_phone, '')) = '' or btrim(coalesce(p_email, '')) = '' then
    raise exception 'missing_required_field';
  end if;
  -- Structural (non-blank) check only -- consent gating (which agreements
  -- must be checked before the button even enables) is trusted from the
  -- client, matching withdraw_my_account's own precedent: that RPC has no
  -- "agreed" parameter at all, trusting the UI already gated the submit
  -- button on it. The signature itself is data (what name was typed), not
  -- consent, so it does get validated here the same as full_name/phone/email.
  if btrim(coalesce(p_signature_name, '')) = '' then
    raise exception 'missing_signature';
  end if;

  insert into public.invites (studio_id, role, code, expires_at, created_by)
  values (v_studio_id, 'member', p_code, now() + interval '7 days', auth.uid())
  returning id into v_invite_id;

  insert into public.member_registrations (
    studio_id, invite_id, full_name, phone, email, plan, term_months, start_date,
    classes, total_price, agreements, signature_name, created_by
  )
  values (
    v_studio_id, v_invite_id, btrim(p_full_name), btrim(p_phone), btrim(p_email), p_plan, p_term_months, p_start_date,
    p_classes, p_total_price, p_agreements, btrim(p_signature_name), auth.uid()
  )
  returning id into v_registration_id;

  return query select v_invite_id, v_registration_id;
end;
$$;

revoke execute on function public.register_member(text, text, text, text, text, integer, date, text[], integer, jsonb, text) from public;
revoke execute on function public.register_member(text, text, text, text, text, integer, date, text[], integer, jsonb, text) from anon, authenticated;
grant execute on function public.register_member(text, text, text, text, text, integer, date, text[], integer, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- accept_invite (20260724100002): a member invite created by register_member
-- means the agreement was already signed before the invite was sent --
-- contract_status goes straight to 'signed' instead of 'pending', and the
-- registration row gets linked to the profile this acceptance just created.
-- ---------------------------------------------------------------------------
create or replace function public.accept_invite(p_code text, p_full_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites;
  v_profile public.profiles;
  v_has_registration boolean;
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

  select exists (
    select 1 from public.member_registrations where invite_id = v_invite.id
  ) into v_has_registration;

  insert into public.profiles (id, studio_id, role, full_name, contract_status)
  values (
    auth.uid(),
    v_invite.studio_id,
    v_invite.role,
    p_full_name,
    case
      when v_invite.role <> 'member' then 'not_required'
      when v_has_registration then 'signed'
      else 'pending'
    end
  )
  returning * into v_profile;

  if v_has_registration then
    update public.member_registrations set profile_id = auth.uid() where invite_id = v_invite.id;
  end if;

  update public.invites set used_at = now() where id = v_invite.id;

  return v_profile;
end;
$$;
-- CREATE OR REPLACE FUNCTION preserves the function's OID, so the existing
-- revoke/grant from 20260724100002_invites.sql (authenticated-only, PUBLIC
-- revoked) carries over unchanged.
