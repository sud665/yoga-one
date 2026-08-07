-- ---------------------------------------------------------------------------
-- Lets an owner or a session's own instructor add someone to that session's
-- roster directly -- either an existing registered member (bypassing the
-- member's own self-service book_session flow entirely, e.g. a member who
-- asked staff to book them in person) or a one-day walk-in guest who has no
-- profile at all. bookings.member_id was `not null references profiles(id)`,
-- which structurally cannot represent a guest -- relaxed to nullable with a
-- guest_name column and a CHECK making the two mutually exclusive.
-- ---------------------------------------------------------------------------

alter table public.bookings alter column member_id drop not null;
alter table public.bookings add column guest_name text;
-- Optional, unlike guest_name -- a walk-in's phone number is nice-to-have
-- contact info, not part of the member/guest identity distinction, so it
-- carries no CHECK of its own and stays null for every ordinary member row.
alter table public.bookings add column guest_phone text;
alter table public.bookings add constraint bookings_member_xor_guest
  check ((member_id is not null) <> (guest_name is not null and btrim(guest_name) <> ''));

-- bookings_one_active_per_session_member (session_id, member_id) where
-- status in ('booked','waitlisted') is unaffected: Postgres unique indexes
-- never consider NULL values equal to each other, so any number of guest
-- rows (member_id null) on the same session coexist under it without
-- collision -- no index change needed for guest support.

create or replace function public.admin_add_participant(
  p_session_id uuid,
  p_member_id uuid default null,
  p_guest_name text default null,
  p_guest_phone text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.class_sessions;
  v_has_member boolean := p_member_id is not null;
  v_has_guest boolean := p_guest_name is not null and btrim(p_guest_name) <> '';
  v_member_role public.profile_role;
  v_member_studio uuid;
  v_booking public.bookings;
begin
  -- Exactly one of the two -- both given or neither given are both invalid.
  if v_has_member = v_has_guest then
    raise exception 'invalid_participant';
  end if;

  select * into v_session from public.class_sessions where id = p_session_id for update;
  if v_session.id is null then
    raise exception 'session_not_found';
  end if;
  if v_session.studio_id is distinct from public.current_studio_id() then
    raise exception 'not_permitted';
  end if;
  -- Same "the session's own instructor, or the studio owner" gate as
  -- mark_attendance (20260724100005) -- this is a staff action (adding
  -- someone to the roster), not a self-service one, so it deliberately does
  -- not check current_role() = 'member' the way book_session does.
  if v_session.instructor_id is distinct from auth.uid() and public.current_role() is distinct from 'owner' then
    raise exception 'not_permitted';
  end if;
  if v_session.status <> 'scheduled' then
    raise exception 'session_cancelled';
  end if;

  if v_has_member then
    select role, studio_id into v_member_role, v_member_studio from public.profiles where id = p_member_id;
    if v_member_role is distinct from 'member' or v_member_studio is distinct from v_session.studio_id then
      raise exception 'invalid_member';
    end if;
  end if;

  -- Deliberately always 'booked', with no capacity/waitlist branching --
  -- unlike book_session's self-service path, this is staff manually
  -- managing the roster (e.g. a walk-in who showed up in person), and the
  -- design spec's 참가자 추가 sheet has no waitlist branch for this action
  -- either. The unique_violation catch is the same defense-in-depth
  -- book_session uses for a same-member double-submit.
  begin
    insert into public.bookings (session_id, member_id, guest_name, guest_phone, status)
    values (
      p_session_id,
      p_member_id,
      case when v_has_guest then btrim(p_guest_name) else null end,
      case when v_has_guest and p_guest_phone is not null and btrim(p_guest_phone) <> '' then btrim(p_guest_phone) else null end,
      'booked'
    )
    returning * into v_booking;
  exception
    when unique_violation then
      raise exception 'already_booked';
  end;

  return v_booking;
end;
$$;

-- CLAUDE.md: revoke before grant (Postgres grants EXECUTE to PUBLIC on
-- creation). anon/authenticated revoke is belt-and-suspenders on top of
-- 20260802010000's default-privileges change, matching every RPC since.
revoke execute on function public.admin_add_participant(uuid, uuid, text, text) from public;
revoke execute on function public.admin_add_participant(uuid, uuid, text, text) from anon, authenticated;
grant execute on function public.admin_add_participant(uuid, uuid, text, text) to authenticated;
