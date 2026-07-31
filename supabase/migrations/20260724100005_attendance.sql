create or replace function public.mark_attendance(p_booking_id uuid, p_status text)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_session public.class_sessions;
begin
  if p_status not in ('attended', 'no_show') then
    raise exception 'invalid_status';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking.id is null then
    raise exception 'booking_not_found';
  end if;

  select * into v_session from public.class_sessions where id = v_booking.session_id;
  -- `is distinct from`, not `<>`, for all three checks below:
  -- current_studio_id()/current_role()/auth.uid() all resolve to NULL for an
  -- authenticated caller with no public.profiles row yet (a reachable
  -- mid-onboarding state). A plain `<>` against NULL evaluates the whole
  -- condition to NULL, and PL/pgSQL's `if <NULL> then` is treated as false --
  -- silently skipping the exception instead of raising it. Same bug class
  -- already found and fixed in book_session/generate_sessions_for_template.
  if v_session.studio_id is distinct from public.current_studio_id() then
    raise exception 'not_permitted';
  end if;
  if v_session.instructor_id is distinct from auth.uid() and public.current_role() is distinct from 'owner' then
    raise exception 'not_permitted';
  end if;
  -- Plain `<>` is fine here: v_booking.status is `not null` on the table and
  -- v_booking was already confirmed to exist above, so this is a real fetched
  -- value, never NULL -- unlike the three identity/tenant checks above.
  if v_booking.status <> 'booked' then
    raise exception 'booking_not_confirmed';
  end if;

  update public.bookings set status = p_status where id = p_booking_id returning * into v_booking;
  return v_booking;
end;
$$;

-- Explicit-grant-only: Postgres grants EXECUTE on newly created functions to
-- PUBLIC by default. mark_attendance does its own studio/instructor-or-owner
-- checks inside, so anon should never even reach it -- revoke PUBLIC first,
-- then grant exactly what's intended (authenticated only), matching
-- book_session/cancel_booking/list_upcoming_sessions_for_member in Task 5's
-- migration.
revoke execute on function public.mark_attendance(uuid, text) from public;
grant execute on function public.mark_attendance(uuid, text) to authenticated;
