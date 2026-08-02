-- ---------------------------------------------------------------------------
-- Close a privilege gap that only exists on hosted Supabase.
--
-- Every earlier migration followed the convention in CLAUDE.md -- `revoke
-- execute ... from public` before the intended `grant` -- and locally that
-- produces exactly the right ACLs (verified: book_session ends up
-- `postgres=X, authenticated=X`, no anon).
--
-- A hosted project is different. It ships with `alter default privileges`
-- granting EXECUTE on new functions in `public` to anon and authenticated.
-- That is an explicit per-role grant, and `revoke ... from public` does not
-- remove per-role grants -- only the grant to the PUBLIC pseudo-role. So on
-- hosted, every SECURITY DEFINER function in this schema stayed callable by
-- anon. Confirmed by probing the deployed project directly: an unauthenticated
-- caller reached the body of book_session, accept_invite, mark_attendance,
-- create_studio_and_owner_profile, list_upcoming_sessions_for_member, and
-- generate_sessions_for_all_templates, getting each function's own error
-- rather than `42501 permission denied` (which is what the same call returns
-- locally).
--
-- No data was reachable through that gap: each function's own authorization
-- check held, helped by current_role()/current_studio_id() returning NULL for
-- a caller with no profile and by every function being a single transaction
-- that rolls back. That is the `is distinct from` rule in CLAUDE.md doing its
-- job. But it was the *only* layer holding, the grant layer having silently
-- done nothing, and one function was genuinely abusable:
-- generate_sessions_for_all_templates is the weekly pg_cron batch that walks
-- every studio, and an anonymous caller could trigger it at will.
--
-- Two fixes, because either alone is incomplete:
--   1. Revoke the grants that already leaked onto existing functions.
--   2. Stop new functions from inheriting the same grant, so a future
--      migration written to the documented convention is actually safe.
--
-- Both are no-ops locally (nothing to revoke, default privileges already
-- don't grant EXECUTE to anon there), so this file leaves local and hosted
-- agreeing instead of quietly diverging.
-- ---------------------------------------------------------------------------

-- 1a. Authenticated-only RPCs: strip anon.
--
-- Deliberately not `revoke execute on all functions in schema public from
-- anon`: current_role() and current_studio_id() are called from inside RLS
-- policy expressions, which evaluate as the querying role. Revoking those from
-- anon turns an anonymous read that should return zero rows into a permission
-- error instead. The trigger functions (prevent_privilege_escalation,
-- validate_instructor_ref) are left alone for the same reason.
revoke execute on function public.accept_invite(p_code text, p_full_name text) from anon;
revoke execute on function public.book_session(p_session_id uuid) from anon;
revoke execute on function public.cancel_booking(p_booking_id uuid) from anon;
revoke execute on function public.create_studio_and_owner_profile(p_studio_name text, p_full_name text) from anon;
revoke execute on function public.generate_sessions_for_template(p_template_id uuid, p_weeks_ahead integer) from anon;
revoke execute on function public.list_upcoming_sessions_for_member() from anon;
revoke execute on function public.mark_attendance(p_booking_id uuid, p_status text) from anon;

-- 1b. Internal/scheduled functions: strip authenticated as well. Neither is
-- ever called from the app -- generate_sessions_for_all_templates is invoked
-- by pg_cron, _generate_sessions_internal only by the two wrappers -- so
-- postgres is the only role that should reach them.
revoke execute on function public._generate_sessions_internal(p_template_id uuid, p_weeks_ahead integer) from anon, authenticated;
revoke execute on function public.generate_sessions_for_all_templates() from anon, authenticated;

-- get_invite_preview keeps its anon grant on purpose: an invite link has to
-- render the studio name and role before the recipient has an account. It
-- returns only studio name / role / validity, never the code itself.

-- 2. Future functions. Without this, the next SECURITY DEFINER function added
-- to this schema is anon-callable on hosted the moment it is created, no
-- matter how carefully its migration follows the revoke-from-public rule.
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
