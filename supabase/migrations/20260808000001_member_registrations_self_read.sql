-- ---------------------------------------------------------------------------
-- QA sweep 2026-08-08, item 17: a member had no screen showing their own
-- plan/expiry/remaining days -- only the owner could see it, via
-- MemberDetailSheet. 20260806000003's own comment on the owner-only policy
-- called this out already ("a member's own membership summary is a possible
-- future screen, not something this pass builds") -- this is that screen's
-- missing RLS piece.
--
-- Additive, not exclusive, same as notices' targeted-read policy
-- (20260806000001): Postgres RLS policies for the same command OR together,
-- so this grants a member read access to their own row on top of (not
-- instead of) the owner's existing `for all` policy. lib/actions/roster.ts's
-- getMemberDetail(profileId) already does exactly the query shape this
-- needs (profiles + member_registrations + recent bookings, all scoped to
-- one profileId) -- it works unmodified for a member calling it with their
-- own id once this policy exists, since the profiles and bookings selects it
-- also does are already covered by policies with no owner restriction
-- ("profiles: view same studio", "bookings: member views own").
-- ---------------------------------------------------------------------------
create policy "member_registrations: member reads own registration"
  on public.member_registrations for select
  using (profile_id = auth.uid());
