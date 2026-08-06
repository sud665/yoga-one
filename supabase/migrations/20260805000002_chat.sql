-- ---------------------------------------------------------------------------
-- 채팅. One conversations/conversation_participants/messages shape covers
-- both 1:1 DMs and the studio-wide staff group -- a DM is just a
-- conversation with exactly 2 participants, not a parallel data model to
-- keep in sync with a separate "groups" table.
--
-- Scope, decided when this feature was originally sized: DMs between
-- owner<->instructor, instructor<->instructor, and instructor<->member --
-- deliberately not owner<->member or member<->member. Plus one auto-managed
-- "스태프" group per studio (owner + every instructor), created lazily on
-- first use rather than wired into create_studio_and_owner_profile/
-- accept_invite -- self-healing (works for every existing account with zero
-- backfill) and avoids touching two already-tested, security-sensitive
-- functions just to add a side effect.
--
-- Text messages only in this pass. messages.image_path exists (the design
-- mockup shows photo messages as a real message type, not a hypothetical
-- one) but nothing here ever sets it yet -- no Storage bucket, no upload UI.
-- Left in now rather than added later as a breaking column change; every
-- message this schema can actually produce today has image_path null.
-- ---------------------------------------------------------------------------

create type public.conversation_kind as enum ('dm', 'group');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  kind public.conversation_kind not null,
  -- Set for a group ("스태프"); left null for a dm, whose display title is
  -- always "whoever the other participant is" -- computed by
  -- list_my_conversations below, never stored.
  title text,
  created_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  -- Cascades on profile deletion (unlike bookings.member_id/
  -- class_sessions.instructor_id, which deliberately don't): this is a pure
  -- membership row, not a history record worth preserving on its own, and
  -- withdraw_my_account (20260805000001) never actually deletes profiles
  -- anyway -- it anonymizes them -- so this cascade is dead code today and
  -- only matters if some future path does hard-delete a profile.
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  -- Read-state for the unread badge in list_my_conversations. Defaults to
  -- now() (not epoch/-infinity) so joining an existing group with history
  -- doesn't instantly show hundreds of "unread" messages predating you.
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  -- No cascade, matching bookings/class_sessions: message history is a
  -- record worth keeping even if the sender's row were ever gone, same
  -- "history persists" reasoning as those tables' FKs.
  sender_id uuid not null references public.profiles(id),
  body text,
  image_path text,
  created_at timestamptz not null default now(),
  check (body is not null or image_path is not null)
);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- "Am I a participant of this conversation" looks like the standard shape
-- for group-membership visibility (a self-referential IN-subquery on
-- conversation_participants), but conversation_participants' own SELECT
-- policy needs that same check on itself -- Postgres detects that as
-- infinite recursion in the policy (confirmed: `npx supabase test db` fails
-- outright with "infinite recursion detected in policy for relation
-- conversation_participants" using the naive subquery form). A SECURITY
-- DEFINER function breaks the cycle: its internal lookup runs as the
-- function's owner (postgres) and bypasses RLS entirely, so the *policy*
-- calls a function instead of re-triggering the same RLS-protected query on
-- itself. Left PUBLIC-executable (no revoke/grant), matching
-- current_studio_id()/current_role() in 20260724100000 -- RLS policies are
-- evaluated for anon too, and a function an anon querier can't EXECUTE would
-- turn "this table is just empty for you" into a hard permission error.
create or replace function public._is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id and profile_id = auth.uid()
  )
$$;

create policy "conversations: participants can view"
  on public.conversations for select
  using (public._is_conversation_participant(id));

create policy "conversation_participants: participants can view roommates"
  on public.conversation_participants for select
  using (public._is_conversation_participant(conversation_id));

create policy "messages: participants can view"
  on public.messages for select
  using (public._is_conversation_participant(conversation_id));

-- No insert/update/delete policies for `authenticated` on any of the three,
-- matching bookings' "쓰기는 RPC로만" convention (20260724100004): RLS
-- enabled + no policy for a command denies that command outright regardless
-- of the table-level grant every table gets from
-- 20260724100000's default-privileges statement. All writes below go
-- through SECURITY DEFINER RPCs, which run as the table-owning `postgres`
-- and bypass RLS entirely.

-- No explicit table grants here, same reasoning as every RLS-protected table
-- since 20260724100002: created by `postgres`, and 20260724100000's `alter
-- default privileges for role postgres in schema public grant select,
-- insert, update, delete on tables to authenticated, anon, service_role`
-- already covers it.

-- Realtime delivery for new messages. Respects the SELECT policy above --
-- Supabase Realtime evaluates RLS per subscriber, so this broadcasts a new
-- row only to clients whose session can actually see it (i.e. the other
-- participant(s)), not every connected client.
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------------
-- Internal-only, mirroring _generate_sessions_internal's shape: revoked from
-- PUBLIC/anon/authenticated, reachable only from list_my_conversations
-- below, which runs as this function's own owner (postgres) and so retains
-- EXECUTE on it regardless of the revoke. Idempotent (on conflict do
-- nothing, `limit 1` existing-group lookup) so calling it on every chat-list
-- load is safe and self-healing -- no backfill migration needed for
-- pre-existing owners/instructors.
-- ---------------------------------------------------------------------------
create or replace function public._ensure_staff_group_membership()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.profile_role;
  v_studio_id uuid;
  v_group_id uuid;
begin
  select role, studio_id into v_role, v_studio_id from public.profiles where id = auth.uid();
  if v_role is distinct from 'owner' and v_role is distinct from 'instructor' then
    return;
  end if;

  select id into v_group_id from public.conversations where studio_id = v_studio_id and kind = 'group' limit 1;
  if v_group_id is null then
    insert into public.conversations (studio_id, kind, title) values (v_studio_id, 'group', '스태프') returning id into v_group_id;
  end if;

  insert into public.conversation_participants (conversation_id, profile_id)
    values (v_group_id, auth.uid())
    on conflict (conversation_id, profile_id) do nothing;
end;
$$;

revoke execute on function public._ensure_staff_group_membership() from public;

create or replace function public.get_or_create_dm(p_other_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_role public.profile_role;
  v_my_studio uuid;
  v_other_role public.profile_role;
  v_other_studio uuid;
  v_conversation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if p_other_profile_id = auth.uid() then
    raise exception 'cannot_message_self';
  end if;

  select role, studio_id into v_my_role, v_my_studio from public.profiles where id = auth.uid();
  if v_my_role is null then
    raise exception 'profile_not_found';
  end if;

  select role, studio_id into v_other_role, v_other_studio from public.profiles where id = p_other_profile_id;
  -- Same exception for "no such profile" and "different studio": telling a
  -- caller which one it was would confirm a specific profile id exists (in
  -- some other studio) purely from a permission probe.
  if v_other_role is null or v_other_studio is distinct from v_my_studio then
    raise exception 'other_profile_not_found';
  end if;

  -- Allowed pairs: owner<->instructor, instructor<->instructor,
  -- instructor<->member. Not owner<->member, not member<->member. Every
  -- allowed pair has 'instructor' on at least one side, and no disallowed
  -- pair does, so that's the one condition that actually separates them.
  if v_my_role is distinct from 'instructor' and v_other_role is distinct from 'instructor' then
    raise exception 'pair_not_allowed';
  end if;

  select cp1.conversation_id into v_conversation_id
    from public.conversation_participants cp1
    join public.conversation_participants cp2 on cp2.conversation_id = cp1.conversation_id
    join public.conversations c on c.id = cp1.conversation_id
    where c.kind = 'dm' and cp1.profile_id = auth.uid() and cp2.profile_id = p_other_profile_id
    limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (studio_id, kind) values (v_my_studio, 'dm') returning id into v_conversation_id;
  insert into public.conversation_participants (conversation_id, profile_id) values
    (v_conversation_id, auth.uid()),
    (v_conversation_id, p_other_profile_id);

  return v_conversation_id;
end;
$$;

revoke execute on function public.get_or_create_dm(uuid) from public;
revoke execute on function public.get_or_create_dm(uuid) from anon, authenticated;
grant execute on function public.get_or_create_dm(uuid) to authenticated;

create or replace function public.send_message(p_conversation_id uuid, p_body text default null, p_image_path text default null)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.messages;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id and profile_id = auth.uid()
  ) then
    raise exception 'not_a_participant';
  end if;

  if (p_body is null or btrim(p_body) = '') and p_image_path is null then
    raise exception 'empty_message';
  end if;

  insert into public.messages (conversation_id, sender_id, body, image_path)
  values (p_conversation_id, auth.uid(), nullif(btrim(p_body), ''), p_image_path)
  returning * into v_message;

  return v_message;
end;
$$;

revoke execute on function public.send_message(uuid, text, text) from public;
revoke execute on function public.send_message(uuid, text, text) from anon, authenticated;
grant execute on function public.send_message(uuid, text, text) to authenticated;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.conversation_participants
    set last_read_at = now()
    where conversation_id = p_conversation_id and profile_id = auth.uid();
end;
$$;

revoke execute on function public.mark_conversation_read(uuid) from public;
revoke execute on function public.mark_conversation_read(uuid) from anon, authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Room-list aggregate (title/last-message/unread), the same "compute a
-- cross-participant summary as SECURITY DEFINER" shape
-- list_upcoming_sessions_for_member uses for booked_count: a caller's own
-- RLS-scoped view of conversation_participants/messages can't cheaply
-- express "count of *other people's* messages I haven't read yet" or "one
-- other participant's name" without either leaking rows RLS wouldn't
-- otherwise show them or a query shaped exactly like this anyway.
create or replace function public.list_my_conversations()
returns table (
  conversation_id uuid,
  kind public.conversation_kind,
  title text,
  other_name text,
  other_role public.profile_role,
  last_message text,
  last_message_at timestamptz,
  unread_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  perform public._ensure_staff_group_membership();

  return query
    select
      c.id,
      c.kind,
      c.title,
      (
        select p.full_name from public.conversation_participants cp2
        join public.profiles p on p.id = cp2.profile_id
        where cp2.conversation_id = c.id and cp2.profile_id <> auth.uid()
        limit 1
      ),
      (
        select p.role from public.conversation_participants cp2
        join public.profiles p on p.id = cp2.profile_id
        where cp2.conversation_id = c.id and cp2.profile_id <> auth.uid()
        limit 1
      ),
      (select coalesce(m.body, '사진') from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1),
      (select m.created_at from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1),
      (
        select count(*)::int from public.messages m
        where m.conversation_id = c.id and m.created_at > cp.last_read_at and m.sender_id <> auth.uid()
      )
    from public.conversations c
    join public.conversation_participants cp on cp.conversation_id = c.id and cp.profile_id = auth.uid()
    order by coalesce(
      (select max(m2.created_at) from public.messages m2 where m2.conversation_id = c.id),
      c.created_at
    ) desc;
end;
$$;

revoke execute on function public.list_my_conversations() from public;
revoke execute on function public.list_my_conversations() from anon, authenticated;
grant execute on function public.list_my_conversations() to authenticated;

-- ---------------------------------------------------------------------------
-- Who a given caller is allowed to start a DM with -- the reverse of
-- get_or_create_dm's pair check, used to populate a "누구에게 메시지 보낼까"
-- picker. Deliberately excludes anyone the caller already has a dm with
-- (that conversation belongs in the room list, not a "start a new chat"
-- picker) and excludes the caller themselves.
-- ---------------------------------------------------------------------------
create or replace function public.list_dm_candidates()
returns table (profile_id uuid, full_name text, role public.profile_role)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_my_role public.profile_role;
  v_my_studio uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  -- `role` and `studio_id` bare would be ambiguous here: this function's own
  -- `returns table (..., role public.profile_role)` makes `role` a second,
  -- implicit in-scope name alongside public.profiles.role. Qualifying with
  -- the `p` alias (and giving profiles.studio_id no bare-name competitor to
  -- collide with, but qualifying it too for symmetry) resolves it.
  select p.role, p.studio_id into v_my_role, v_my_studio from public.profiles p where p.id = auth.uid();
  if v_my_role is null then
    raise exception 'profile_not_found';
  end if;

  return query
    select p.id, p.full_name, p.role
    from public.profiles p
    where p.studio_id = v_my_studio
      and p.id <> auth.uid()
      and (v_my_role = 'instructor' or p.role = 'instructor')
      and not exists (
        select 1
        from public.conversation_participants cp1
        join public.conversation_participants cp2 on cp2.conversation_id = cp1.conversation_id
        join public.conversations c on c.id = cp1.conversation_id
        where c.kind = 'dm' and cp1.profile_id = auth.uid() and cp2.profile_id = p.id
      )
    order by p.role, p.full_name;
end;
$$;

revoke execute on function public.list_dm_candidates() from public;
revoke execute on function public.list_dm_candidates() from anon, authenticated;
grant execute on function public.list_dm_candidates() to authenticated;
