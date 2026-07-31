# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Prerequisites

- **Node 20** (`.nvmrc` pins 20.19.2). Node 16 fails at Vitest startup with `does not provide an export named 'styleText'`. Run `nvm use` first.
- **Docker Desktop must be running** before any `supabase` command. If `supabase status` reports it cannot reach the Docker daemon, start Docker and wait for it, then re-check — containers take a while to become healthy after a cold start.
- **Port 3000 is often occupied by an unrelated project's dev server on this shared machine.** If `npm run dev`/`test:e2e` can't bind it, that's environment noise, not this app's bug. Point Playwright at another port with a temporary, never-committed config (confirm `git diff playwright.config.ts` is empty before committing) — but also override `NEXT_PUBLIC_SITE_URL` in that temp config's `webServer.env` when you do. `.env.local` hardcodes it to `http://localhost:3000`, and any flow that builds a URL from it (`createInvite`'s returned link, Kakao's OAuth `redirectTo`) will silently point at whatever else is running on port 3000 if you don't. This has broken specs in at least five separate tasks before being diagnosed each time.

## Commands

```bash
npm run dev                  # Next dev server
npm run build                # production build
npm run lint

npm test                     # Vitest unit tests (jsdom). Excludes tests/integration/** by design.
npm test -- tests/smoke.test.ts        # single unit test file
npm run test:integration     # Vitest integration tests (node env) — REQUIRES local Supabase running
npm run test:e2e             # Playwright; auto-starts the dev server via its webServer config
npm run test:e2e -- owner-signup.spec.ts   # single e2e spec

npx supabase start           # bring up the local stack
npx supabase db reset        # re-apply every migration from scratch + seed
npx supabase test db         # run the pgTAP suite (supabase/tests/database/*.test.sql)
```

`test:integration` needs its own config (`vitest.integration.config.ts`) rather than a CLI path filter, because `vitest.config.ts` excludes `tests/integration/**` and Vitest resolves excludes *before* narrowing by CLI path — a path filter against the main config always resolves to zero files.

**After any migration change, always run all three in order:**
```bash
npx supabase db reset && npx supabase test db && npx supabase gen types typescript --local > lib/database.types.ts
```

## Architecture

Multi-tenant SaaS for yoga studios. Three roles — `owner` / `instructor` / `member` — all authenticate through Supabase Auth and share one app.

**Data access is a deliberate hybrid, not an accident:**
- **Reads and realtime** go through the Supabase client SDK directly, with RLS doing tenant and role isolation.
- **Concurrency-sensitive writes** go through `SECURITY DEFINER` Postgres RPCs that hold a row lock for the whole transaction. `book_session` and `cancel_booking` both `select ... for update` the parent `class_sessions` row *before* counting capacity or picking a waitlist promotion, which is what makes simultaneous bookings serialize instead of racing. Don't move capacity logic into client-side code.

**Tenant isolation** is a shared schema: every table carries `studio_id`, and RLS policies compare it against the `public.current_studio_id()` / `public.current_role()` helpers (both `SECURITY DEFINER`, both reading the caller's `profiles` row). The first migration also issues `alter default privileges for role postgres in schema public ...`, which is why later migrations' tables need no explicit grants — locally-created tables would otherwise have reachable RLS policies but no DML grant, and queries would silently return nothing.

**Signup is invite-gated.** Owners self-serve via `create_studio_and_owner_profile` (creates the studio + owner profile in one call). Instructors and members can only join through `accept_invite`, which consumes a single-use, expiring code. There is no open signup path.

**Schedules are generated, not hand-entered.** `class_templates` holds the weekly recurrence; `class_sessions` rows are materialized from it by `generate_sessions_for_template` (8 weeks ahead on create/edit) and topped up weekly by a `pg_cron` job calling `generate_sessions_for_all_templates`.

Migrations are numbered and cumulative in `supabase/migrations/`; each has a matching pgTAP file in `supabase/tests/database/`.

## Conventions this codebase learned the hard way

Each of these caused a real bug that shipped and had to be fixed. They are not style preferences.

- **Never compare `current_role()`, `current_studio_id()`, or `auth.uid()` with `<>`. Use `is distinct from`.** All three return NULL for an authenticated caller who has no `profiles` row yet (a reachable state — mid-onboarding). PL/pgSQL treats `if <NULL> then` as false, so a bare `<>` silently *skips* the authorization exception instead of raising it.
- **Every new `SECURITY DEFINER` function needs `revoke execute ... from public`** before its intended `grant`. Postgres grants EXECUTE to PUBLIC by default on creation. The only deliberate exception is `get_invite_preview`, which must stay anon-callable so an invite link can render before signup — and it returns only studio name / role / validity, never the code itself.
- **`tests.clear_authentication()` switches to `anon` (simulates logged-out); `tests.bypass_rls()` switches to `postgres` (actually bypasses RLS).** They are not interchangeable. Using `clear_authentication` where you meant `bypass_rls` makes "unauthenticated sees nothing" assertions pass for the wrong reason.
- **In pgTAP files, `grant select[, insert] on test_fixtures to authenticated, anon;` immediately after creating the temp table**, while still `postgres`. Any fixture read or write that happens after a `tests.authenticate_as(...)` role switch fails with `permission denied` otherwise.
- **Prefer counted loops over date-range loops** when generating recurring dates. A `while d <= end_date` loop over an exact N-week span produces N+1 rows when the start date already lands on the target weekday.
- **Batch jobs iterating tenants need a per-iteration `begin ... exception when others ... end` block.** Without it one studio's bad row aborts the whole transaction and silently stalls every other studio's generation.
- **Uniqueness on `bookings` is a partial index over active statuses only** (`booked`/`waitlisted`), not a table-wide constraint. A blanket `unique (session_id, member_id)` also matches `cancelled` history rows, which permanently locks a member out of rebooking a session they once cancelled.
- **`createMiddlewareClient()` (`lib/supabase/middleware.ts`) returns `getResponse: () => response`, a getter — not a `response` value.** `@supabase/ssr`'s `setAll` reassigns the underlying response lazily, only if a Supabase call actually refreshes a token, and only *after* `createMiddlewareClient` has already returned. Destructuring `response` once at the top of `middleware.ts` (instead of calling `getResponse()` fresh at every return point) silently drops refreshed session cookies on every redirect — risking involuntary logouts in production even though it passes every test (token refresh essentially never happens inside a fast test run). Any redirect must also copy `getResponse().cookies.getAll()` onto the new `NextResponse.redirect(...)` object — a getter alone doesn't help, since `redirect()` always builds a brand-new response.
- **Playwright tests with two or more signed-in actors need one `browser.newContext()` per actor, never a shared `context.newPage()`.** `@supabase/ssr` sessions are cookie-based and shared per-`BrowserContext` — a second actor signing in on a page from the same context silently takes over the first actor's session for anything the first actor does afterward. This exact bug has been found and fixed in the plan's own literal E2E code in at least three separate tasks (member booking, instructor attendance, roster management).

## Working documents

`docs/superpowers/specs/` holds the approved design spec; `docs/superpowers/plans/` holds the task-by-task implementation plan being executed. `DESIGN.md` is the visual design system (Nike-derived structure adapted for this app — black/white/single-gray, pill CTAs, flat cards, 8px grid, Bebas Neue + Inter). Read `DESIGN.md` before building UI.
