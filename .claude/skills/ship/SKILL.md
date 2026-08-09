---
name: ship
description: >-
  Runs this repo's full "ship" pipeline end-to-end: validate and deploy any
  pending Supabase migration (local reset + pgTAP + type regen, then push
  to the hosted project), run the tsc/lint/unit-test gate, then git commit
  and push to origin. Use this whenever the user asks to land a finished
  change in one go — phrases like "커밋하고 푸쉬해줘", "마이그레이션하고 커밋하고
  푸시해줘", "DB 마이그레이션 해주고 커밋 푸쉬해줘", "ship this", "migrate the DB and
  push", or any request combining commit+push with deploying a database
  migration (hosted or local). Always reach for this instead of running
  the individual git/supabase commands by hand for that combined request —
  it encodes this repo's exact required command order (CLAUDE.md's
  migration three-step, plus git-before-hosted-deploy ordering) and known
  gotchas so a step doesn't get skipped or run out of order.
---

# Ship: migrate, verify, commit, push

The migrate → verify → commit → push sequence this repo's `CLAUDE.md`
documents, wired together as one flow. It picks up wherever the feature
work already left off — it doesn't implement anything or decide what to
build, only lands what's already there.

## Before running anything

Skim `git status` and `git diff` to see what's actually about to ship.
Docker Desktop must be running before the migration steps below (`npx
supabase db reset` needs it) — start it and wait for it to come up if it
isn't, containers take a bit after a cold start.

## Step 1 — Run the preflight script

```bash
bash .claude/skills/ship/scripts/preflight.sh
```

One script instead of six separate command calls with the same nvm
boilerplate each time — kept in sync with `CLAUDE.md`'s "Prerequisites"
and "After any migration change" sections. In order, it:

1. Runs `npx supabase db push --dry-run` to check whether the *hosted*
   project is missing a local migration. This is the authoritative check
   — not `git status` on `supabase/migrations/` — because a migration can
   already be committed to git from an earlier turn but never actually
   deployed to hosted yet (this has happened in this repo before).
2. **Only if a migration is pending:** `npx supabase db reset && npx
   supabase test db && npx supabase gen types typescript --local >
   lib/database.types.ts`. If the pgTAP suite fails, the script stops
   right there with a nonzero exit — do not proceed to commit or push
   anything; report the failing assertion(s) and stop.
3. **Always:** `npx tsc --noEmit`, `npm run lint`, `npm test` — the fast
   deterministic code gate. This isn't a substitute for whatever
   browser/e2e verification the feature itself already got during
   implementation; it's the mechanical check that has to pass before any
   commit, migration or not.

Read the script's output. It prints `MIGRATIONS_PENDING=true` or `=false`
— that decides whether Step 4 below applies. It prints `PREFLIGHT_PASSED`
only on full success; any failure shows the underlying command's own
output and exits nonzero. If it fails, stop, report the failure plainly,
and don't touch git or the hosted database.

If the tree was already clean and the script reports
`MIGRATIONS_PENDING=false`, there's nothing to ship — say so and stop
rather than inventing an empty commit.

## Step 2 — Commit

`git status` again to see exactly what preflight changed (possibly
`lib/database.types.ts`, if a migration touched the schema) alongside
whatever the feature work already modified. Stage the specific files by
name — never `git add -A`/`.`. Skim the staged diff once for anything
that looks like it could be a secret before committing.

Follow this session's standard commit conventions (HEREDOC message,
why-not-what, ends with the usual `Co-Authored-By:` line) and this repo's
own house style — check `git log` if it's been a while. Never `--amend` an
existing commit here, never `--no-verify`.

## Step 3 — Push the code

```bash
git rev-parse --abbrev-ref @{upstream}
```

confirms the tracked branch (normally `main` in this repo). Then:

```bash
git push origin <that branch>
```

Never force-push. If a force-push looks like it'd be needed (diverged
history), stop and tell the user instead of doing it.

## Step 4 — Deploy the migration to hosted (only if `MIGRATIONS_PENDING=true`)

Only *after* the git push above succeeds — git is this repo's source of
truth, so the migration file should be safely committed and pushed before
it goes live on the hosted database, not after. Confirm what's about to
apply, then apply it:

```bash
npx supabase db push --dry-run
npx supabase db push
```

If `db push` hangs on an interactive confirmation instead of applying,
that's a known quirk in this repo — retry with:

```bash
yes | npx supabase db push
```

Then confirm local and remote actually agree:

```bash
npx supabase migration list --linked
```

Every row's `local` and `remote` columns should match. If `db push` fails
here, the code is already safely committed and pushed to git — this is a
recoverable, retry-safe failure, not a lost/broken state. Report it
clearly and note that `supabase db push` can just be re-run once the
underlying issue (network, auth, drift) is sorted.

## Reporting back

Close with a short, concrete summary: which commit(s) landed (short hash
+ one-line subject), whether a migration was deployed to hosted and
which one, and that local/remote migration state now matches. Skip the
branches that didn't apply (no pending migration this time, etc.) rather
than narrating every possible path.
