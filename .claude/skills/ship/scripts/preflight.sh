#!/usr/bin/env bash
# Deterministic gate for the `ship` skill. Safe to run from anywhere inside
# the repo (it cd's to the repo root itself). Exits 0 only if every gate
# that needed to run, passed.
#
# Prints MIGRATIONS_PENDING=true|false so the calling agent knows whether
# Step 4 in SKILL.md (deploying to the hosted Supabase project) applies.
# Ends with PREFLIGHT_PASSED on full success. Any failure prints the
# underlying command's own output (nothing is swallowed) and exits nonzero
# — the caller should stop and report, not touch git or the hosted DB.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Node 20 is required (.nvmrc pins it) -- Node 16 fails Vitest startup.
# Best-effort: don't hard-fail the whole script if nvm itself isn't set up
# the usual way, since a misconfigured shell shouldn't mask real failures
# below with a confusing "command not found: nvm".
source ~/.nvm/nvm.sh >/dev/null 2>&1 || true
nvm use >/dev/null 2>&1 || true

echo "==> Checking whether the hosted Supabase project is missing any local migration"
# The authoritative check -- not `git status` on supabase/migrations/,
# because a migration can already be committed to git from an earlier turn
# but never actually pushed to the hosted project yet.
if ! DRY_RUN_OUTPUT=$(npx supabase db push --dry-run 2>&1); then
  echo "$DRY_RUN_OUTPUT"
  echo "FAIL: could not reach the linked Supabase project (check \`supabase login\` / network)."
  exit 1
fi
echo "$DRY_RUN_OUTPUT"

if echo "$DRY_RUN_OUTPUT" | grep -q "Remote database is up to date"; then
  MIGRATIONS_PENDING=false
else
  MIGRATIONS_PENDING=true
fi
echo "MIGRATIONS_PENDING=$MIGRATIONS_PENDING"

if [ "$MIGRATIONS_PENDING" = true ]; then
  echo "==> Validating migrations locally (reset + pgTAP + type regen)"
  echo "    (needs Docker Desktop running -- if this hangs or errors on"
  echo "    reaching the daemon, start Docker, wait for it, and re-run.)"
  npx supabase db reset
  npx supabase test db
  npx supabase gen types typescript --local > lib/database.types.ts
  echo "==> Local migration validation passed"
fi

echo "==> Running code verification gate (tsc, lint, unit tests)"
npx tsc --noEmit
npm run lint
npm test

echo "PREFLIGHT_PASSED"
