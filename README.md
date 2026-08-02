# 요가원 관리 (Yoga Studio Management PWA)

Multi-tenant SaaS for yoga studios, built with Next.js and Supabase. Three roles --
`owner` / `instructor` / `member` -- authenticate through Supabase Auth and share
one app. See `CLAUDE.md` for the full architecture and conventions, and
`DESIGN.md` for the visual design system.

## Prerequisites

- **Node 20** -- `.nvmrc` pins `20.19.2`. Run `nvm use` before anything else;
  Node 16 fails at Vitest startup with `does not provide an export named 'styleText'`.
- **Docker Desktop**, running, before any `supabase` command. If `npx supabase status`
  reports it cannot reach the Docker daemon, start Docker Desktop and wait for it,
  then re-check -- containers take a while to become healthy after a cold start.

## Setup

```bash
nvm use
npm install
cp .env.example .env.local   # fill in the values described below

npx supabase start           # bring up the local Supabase stack (Docker)
npx supabase db reset        # apply every migration + seed data

npm run dev                  # http://localhost:3000
```

`npx supabase start` prints a local API URL and `anon`/`service_role` keys --
paste those into `.env.local`. Re-run `npx supabase status` any time to see them
again.

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values there. `.env.local`
is gitignored; never commit real secrets.

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (local: `http://127.0.0.1:54321`; hosted: `https://<project-ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable API key (`sb_publishable_...`) -- safe for the browser, RLS enforces access control. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` still works as a fallback (see `lib/supabase/env.ts`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key -- bypasses RLS. Server-only; never expose to the browser. |
| `KAKAO_CLIENT_ID` | Kakao OAuth app client ID (Kakao Developers console), used for Kakao login/signup. |
| `KAKAO_CLIENT_SECRET` | Kakao OAuth app client secret. |
| `NEXT_PUBLIC_SITE_URL` | This app's own base URL (local: `http://localhost:3000`), used to build absolute links -- invite URLs, OAuth/email-confirmation redirect targets. Must match `supabase/config.toml`'s `[auth] site_url` / `additional_redirect_urls`, or redirects silently break. |

## Pointing at a hosted Supabase project

The schema lives entirely in `supabase/migrations/`, so a fresh hosted project
needs those applied before the app can talk to it -- otherwise every query fails
with `Could not find the table 'public.studios' in the schema cache`.

```bash
npx supabase login                                    # opens a browser
npx supabase link --project-ref <project-ref>         # prompts for the DB password
npx supabase db push                                  # applies every migration
```

Then swap `.env.local` to the hosted URL and publishable key (Project Settings ->
API in the dashboard), and set `NEXT_PUBLIC_SITE_URL` to the deployed origin.

Two hosted-only differences to expect:

- **Email confirmation is on by default** (local disables it in
  `supabase/config.toml`). `signUp()` returns no session until the user clicks
  the emailed link. The signup and invite flows already handle this -- they show
  a "check your email" state and resume the pending `create_studio_and_owner_profile`
  / `accept_invite` call on the next sign-in, using the values stashed in
  `user_metadata`. Turn it off under Authentication -> Sign In / Providers if you
  want local's behaviour.
- **Redirect URLs are configured in the dashboard**, not `config.toml`. Set Site
  URL and the allowed redirect list under Authentication -> URL Configuration to
  match `NEXT_PUBLIC_SITE_URL`, or confirmation and OAuth redirects land on the
  wrong origin and fail silently.

## Commands

```bash
npm run dev                  # Next dev server
npm run build                # production build
npm run lint

npm test                     # Vitest unit tests (jsdom). Excludes tests/integration/** by design.
npm test -- tests/smoke.test.ts        # single unit test file
npm run test:integration     # Vitest integration tests (node env) -- REQUIRES local Supabase running
npm run test:e2e             # Playwright; auto-starts the dev server via its webServer config
npm run test:e2e -- owner-signup.spec.ts   # single e2e spec

npx supabase start           # bring up the local stack
npx supabase db reset        # re-apply every migration from scratch + seed
npx supabase test db         # run the pgTAP suite (supabase/tests/database/*.test.sql)
```

**After any migration change, always run all three in order:**

```bash
npx supabase db reset && npx supabase test db && npx supabase gen types typescript --local > lib/database.types.ts
```

**Port 3000 is often occupied by an unrelated project's dev server on shared machines.**
If `npm run dev`/`test:e2e` can't bind it, that's environment noise, not this app's
bug -- point Playwright at another port with a temporary, never-committed config
(see `CLAUDE.md`'s Prerequisites section for the exact caveat around
`NEXT_PUBLIC_SITE_URL` when doing this).

## Learn more

- `CLAUDE.md` -- architecture, data-access conventions, and lessons learned (read
  this first).
- `DESIGN.md` -- visual design system.
- `docs/superpowers/specs/` -- the approved design spec.
- `docs/superpowers/plans/` -- the task-by-task implementation plan.
