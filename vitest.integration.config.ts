import { defineConfig } from 'vitest/config'

// Separate from vitest.config.ts (not merely a CLI path filter against it):
// Vitest resolves each project's `include`/`exclude` into a file list first,
// and only *then* narrows that already-resolved list by any CLI path
// argument -- an excluded file can never be re-included by a path filter
// (confirmed against vitest's own project.ts: `filterFiles` runs on the
// output of `globAllTestFiles(include, exclude, ...)`). Since
// vitest.config.ts's `test.exclude` lists `tests/integration/**` precisely
// so bare `vitest run`/`npm test` never picks up this suite (it needs local
// Supabase running and real network calls, unlike the jsdom unit tests),
// `vitest run tests/integration` against that same config would always
// resolve to zero files -- this dedicated config is what actually makes
// `npm run test:integration` runnable.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['./tests/integration/setup.ts'],
    // Vitest's default hookTimeout (10s) is tuned for in-process unit tests.
    // This suite's beforeAll makes ~6 sequential real HTTP round trips to
    // local GoTrue/PostgREST (createUser/signIn x3, plus table inserts) --
    // observed to occasionally exceed 10s on this machine under background
    // load from the local stack's analytics/log-ingestion container
    // (observed pegged around 150-160% CPU via `docker stats`, independent
    // of anything this suite does), even though each individual request
    // normally completes in well under 200ms. This is fixture-setup wall
    // clock time, not the concurrency assertion itself -- raising it here
    // does not loosen what the actual race test proves.
    hookTimeout: 30000,
  },
})
