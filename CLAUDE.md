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

**Each role gets its own route tree, and `proxy.ts` confines them to it** (owners get `/instructor` as a second allowed prefix, because a small studio's owner teaches their own classes):

| Role | Routes |
|---|---|
| owner | `/admin` · `/admin/schedule` · `/admin/roster/{instructors,members}` · `/admin/invites` · `/admin/bookings` · `/admin/profile` · `/instructor` |
| member | `/member` (dashboard) · `/member/schedule` · `/member/bookings` · `/member/profile` |
| instructor | `/instructor` · `/instructor/profile` |

`/member` is the dashboard, *not* the bookable session list — that moved to `/member/schedule` when 회원 grew to four tabs. Any spec that signs a member up and immediately books has to navigate there first; several already did break on this. `DESIGN.md`'s Navigation section has the tab structure these routes hang off.

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
- **`revoke ... from public` is not enough on hosted Supabase — a hosted project also grants EXECUTE to `anon` and `authenticated` explicitly, via `alter default privileges`, and revoking from PUBLIC does not touch a per-role grant.** Local and hosted therefore disagree: the identical migration produces `postgres=X, authenticated=X` locally and an additional anon grant on hosted, so every RPC in this schema was anon-callable in production while looking correctly locked down in every local check. `20260802010000` revokes the leaked grants and flips the default privileges so new functions don't inherit them. When adding a function, verify against the *deployed* project, not just locally — an anonymous call should come back `42501 permission denied`, not the function's own error message. Note also what saved this from being a breach: the per-function authorization checks and the `is distinct from` rule below were the only layer actually holding.
- **`tests.clear_authentication()` switches to `anon` (simulates logged-out); `tests.bypass_rls()` switches to `postgres` (actually bypasses RLS).** They are not interchangeable. Using `clear_authentication` where you meant `bypass_rls` makes "unauthenticated sees nothing" assertions pass for the wrong reason.
- **In pgTAP files, `grant select[, insert] on test_fixtures to authenticated, anon;` immediately after creating the temp table**, while still `postgres`. Any fixture read or write that happens after a `tests.authenticate_as(...)` role switch fails with `permission denied` otherwise.
- **Prefer counted loops over date-range loops** when generating recurring dates. A `while d <= end_date` loop over an exact N-week span produces N+1 rows when the start date already lands on the target weekday.
- **Batch jobs iterating tenants need a per-iteration `begin ... exception when others ... end` block.** Without it one studio's bad row aborts the whole transaction and silently stalls every other studio's generation.
- **Uniqueness on `bookings` is a partial index over active statuses only** (`booked`/`waitlisted`), not a table-wide constraint. A blanket `unique (session_id, member_id)` also matches `cancelled` history rows, which permanently locks a member out of rebooking a session they once cancelled.
- **`createMiddlewareClient()` (`lib/supabase/middleware.ts`) returns `getResponse: () => response`, a getter — not a `response` value.** `@supabase/ssr`'s `setAll` reassigns the underlying response lazily, only if a Supabase call actually refreshes a token, and only *after* `createMiddlewareClient` has already returned. Destructuring `response` once at the top of `middleware.ts` (instead of calling `getResponse()` fresh at every return point) silently drops refreshed session cookies on every redirect — risking involuntary logouts in production even though it passes every test (token refresh essentially never happens inside a fast test run). Any redirect must also copy `getResponse().cookies.getAll()` onto the new `NextResponse.redirect(...)` object — a getter alone doesn't help, since `redirect()` always builds a brand-new response.
- **Playwright tests with two or more signed-in actors need one `browser.newContext()` per actor, never a shared `context.newPage()`.** `@supabase/ssr` sessions are cookie-based and shared per-`BrowserContext` — a second actor signing in on a page from the same context silently takes over the first actor's session for anything the first actor does afterward. This exact bug has been found and fixed in the plan's own literal E2E code in at least three separate tasks (member booking, instructor attendance, roster management).
- **`dev`/`build` must keep the `--webpack` flag in `package.json`.** `@serwist/next` (PWA service worker) works only by injecting a webpack plugin into `next.config.ts`'s `webpack` hook. Next 16 defaults to Turbopack and `process.exit(1)`s the moment it sees a `webpack` config with no matching `turbopack` config — the failure is an opaque `Error: Call retries were exceeded { type: 'WorkerError' }` that mentions neither Serwist nor webpack. `turbopack: {}` / `--turbopack` silence the crash but skip service-worker generation entirely (`/sw.js` 404s, `tests/e2e/pwa-installability.spec.ts` fails). Serwist's `disable` option doesn't help either — the `webpack` key is attached to the Next config unconditionally, before `disable` is ever checked.
- **A lucide icon cannot cross the RSC boundary as a prop.** An icon is a component, a component is a function, and React refuses to serialize one from a server component into a client component — the route 500s with `Functions cannot be passed directly to Client Components`, naming the icon rather than the boundary. `Button`'s `icon={CalendarDays}` prop is therefore client-only; from a server component, render `<CalendarDays />` as a child instead (an *element* serializes fine, and `Button`'s `gap-2` spaces it identically). The same rule killed the first cut of the member/instructor layouts, which tried to pass a `{href, label, icon}[]` array from a server layout into the client `RoleNav` — hence `app/member/member-nav.tsx` and `app/instructor/instructor-nav.tsx`, thin client modules that hold their own item arrays, exactly as `app/admin/admin-nav.tsx` always did.
- **`profiles` has no table-level UPDATE grant for `authenticated`, and it must stay that way.** `20260724100006` revoked it because a blanket update surface let an owner run `update profiles set role='member' where id=<self>` from the client SDK and lock themselves out permanently. Profile editing goes through `update_my_profile` (`20260803000000`), whose column list — `full_name`, `phone` — is fixed in the function body, so `role`/`studio_id`/`contract_status` stay unreachable no matter what the client sends. Never reopen the grant to add a field; add it to the RPC.
- **`/` is a router, not a screen.** It shipped as the untouched create-next-app template, invisible because no path rendered it — until `signInWithPassword`'s `redirect('/')` did. A server-action redirect is resolved inside the Next server, so `proxy.ts` never sees the hop and cannot bounce it. Two fixes, both needed: `app/page.tsx` now redirects by role, and `signInWithPassword` goes straight to the role home (a *second* redirect renders the right page but leaves the address bar on `/`, because the browser never performs the navigation that would update it).
- **Worktrees need excluding from every tool config, and there are two paths now.** `.worktrees/**` is the checkout left from the PWA merge; `.claude/worktrees/**` is where Claude Code puts an isolated worktree and can appear at any time with nobody editing this repo. Either one makes Vitest collect a second copy of the Playwright specs (15-18 files failing with "Playwright Test did not expect test() to be called here"). Both are in `vitest.config.ts`; ESLint's flat config ignores dot-directories on its own.
- **Serwist's `defaultCache` (`app/sw.ts`) is safe only because every read currently goes through POST Server Actions.** Its routes are GET-only `NetworkFirst`/cross-origin caching into Cache Storage, which survives sign-out. Fine today (no `/api/*` routes, no client-side Supabase GET reads, dashboards are static shells). The moment a future task adds a GET `/api/*` route or a client-side Supabase read, tenant-scoped data can land in that shared cache — re-check `app/sw.ts`'s caching rules at that point.

## Design system

`DESIGN.md` is the source of truth and `app/globals.css`'s `@theme` block is its 1:1 implementation — change the doc first, then the tokens. Read it before building UI.

Current state (third pass, "sage"): warm canvas `#fbfaf7`, moss-undertoned ink `#1e221c`, and sage green as the single brand accent. `brand-deep` (`#4f6d55`) is the one to reach for — it carries the primary CTA fill, links, active nav, and focus rings, and it is the only sage value with enough contrast for text. Plain `brand` (`#6b8f71`) is decorative fills and icons only.

Two traps in that palette:

- **`success` and `success-tint` resolve to the brand values on purpose.** A confirmed booking *is* the brand moment, and a second, differently-hued green beside sage only reads as a mistake. Keep using the `success` names where the meaning is "this worked" — don't collapse them into `brand`.
- **`info` is legacy.** It lost the accent job to brand and survives only for genuinely informational messaging (`Toast`'s `info` tone). Never reach for it when styling a new screen.

Structural rules that predate the palette and still hold: hairline borders instead of shadows (there are zero shadows in the system), no font weight above 500, `rounded-full` reserved for badges/chips/avatars rather than CTAs, and at most one or two "voltage" surfaces (`Card variant="brand"`, primary buttons) per screen.

## Environment

`lib/supabase/env.ts` is the only place that reads the public Supabase variables. It prefers `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase's current `sb_publishable_...` format) and falls back to the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and it throws a message naming the missing variable rather than passing `undefined` into supabase-js. Add new reads there, not inline `process.env.X!`.

## Working documents

`docs/superpowers/specs/` holds the approved design spec; `docs/superpowers/plans/` holds the task-by-task implementation plan that was executed.

`.worktrees/` holds a second checkout of this same project, left from the implementation phase and now fully merged into `main`. It is excluded from `vitest.config.ts` and `eslint.config.mjs` explicitly: both configs' other ignore patterns are root-anchored, so without those entries Vitest collects its Playwright specs (18 failures reading "Playwright Test did not expect test() to be called here") and ESLint lints its build output (thousands of errors in files nobody wrote). Add the same exclusion to any new tool config.

An alternative Expo/React Native client lives on the `expo-native-app` branch, verified end-to-end against this same backend. It exists in case store distribution is ever needed; nothing on `main` depends on it.
