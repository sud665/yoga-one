import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // The two worktree paths matter as much as the others. `.worktrees/**`
    // holds the second checkout left from the PWA merge; `.claude/worktrees/**`
    // is where Claude Code puts an isolated worktree, and one can appear at
    // any time without anyone editing this repo. Either way the directory is a
    // full copy of this project, Playwright specs and all, and without the
    // exclusion Vitest collects those specs and every one fails with
    // "Playwright Test did not expect test() to be called here" -- 15-18 file
    // failures with nothing wrong in the code. The root patterns below don't
    // cover them because they're root-anchored.
    exclude: [
      '**/node_modules/**',
      'tests/e2e/**',
      'tests/integration/**',
      '.worktrees/**',
      '.claude/worktrees/**',
    ],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
