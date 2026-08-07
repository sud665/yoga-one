-- ---------------------------------------------------------------------------
-- withdraw_my_account (20260805000001) only ever anonymized full_name/phone
-- and banned the auth.users row -- it left every active booking and chat
-- membership untouched. That's a real gap, not just stale copy: a withdrawn
-- member's booking stayed 'booked' forever, permanently occupying a capacity
-- slot the next waitlisted member could never be promoted into, and their
-- (now-renamed) profile stayed a conversation_participants row indefinitely.
--
-- This extends the same function to also cancel the withdrawing member's own
-- active bookings (promoting the next waitlisted member on each session
-- where a 'booked' slot frees up, same as cancel_booking) and to remove
-- their conversation_participants rows so RLS stops granting them (or their
-- renamed profile) any further read access to chat history.
-- ---------------------------------------------------------------------------

create or replace function public.withdraw_my_account(p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.profile_role;
  v_studio_id uuid;
  v_booking record;
  v_promoted public.bookings;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role, studio_id into v_role, v_studio_id from public.profiles where id = auth.uid();
  if v_role is null then
    raise exception 'profile_not_found';
  end if;
  -- No owner path: an owner "withdrawing" would orphan the whole studio (no
  -- one left to manage instructors/invites/schedule). Transferring or
  -- closing a studio is a different, unbuilt feature -- out of scope here.
  if v_role = 'owner' then
    raise exception 'owner_cannot_withdraw';
  end if;

  -- Cancel every active booking this member holds, promoting the next
  -- waitlisted member per session -- same logic as cancel_booking. `order by
  -- session_id` gives every concurrent caller (this function, book_session,
  -- cancel_booking) the same global lock-acquisition order across sessions,
  -- which is what actually prevents a deadlock when two members withdraw at
  -- the same time with overlapping sessions in different orders.
  for v_booking in
    select id, session_id, status from public.bookings
    where member_id = auth.uid() and status in ('booked', 'waitlisted')
    order by session_id
  loop
    perform 1 from public.class_sessions where id = v_booking.session_id for update;
    update public.bookings set status = 'cancelled' where id = v_booking.id;

    if v_booking.status = 'booked' then
      select * into v_promoted from public.bookings
        where session_id = v_booking.session_id and status = 'waitlisted'
        order by created_at asc
        limit 1
        for update;

      if v_promoted.id is not null then
        update public.bookings set status = 'booked' where id = v_promoted.id;
      end if;
    end if;
  end loop;

  -- Leave every conversation. RLS gates message/participant visibility on
  -- conversation_participants (_is_conversation_participant), so removing
  -- this row is what actually revokes further access -- deleting the
  -- messages themselves would erase studio-side history for everyone else
  -- still in the room, which nothing here intends.
  delete from public.conversation_participants where profile_id = auth.uid();

  update public.profiles
    set full_name = case when v_role = 'instructor' then '탈퇴한 강사' else '탈퇴한 회원' end,
        phone = null
    where id = auth.uid();

  update auth.users
    set banned_until = 'infinity',
        email = 'withdrawn+' || replace(auth.uid()::text, '-', '') || '@deleted.invalid'
    where id = auth.uid();

  if p_reason is not null and btrim(p_reason) <> '' then
    insert into public.withdrawal_feedback (studio_id, role, reason) values (v_studio_id, v_role, btrim(p_reason));
  end if;
end;
$$;
-- CREATE OR REPLACE FUNCTION preserves the function's OID, so the existing
-- revoke/grant from 20260805000001_withdraw_my_account.sql (authenticated-only,
-- PUBLIC + anon revoked) carries over unchanged.
