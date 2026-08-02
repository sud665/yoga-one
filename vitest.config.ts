import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // `.worktrees/**` matters as much as the others now: since the PWA branch
    // was merged, that directory holds a second checkout of this same project,
    // Playwright specs and all. Without it excluded, Vitest collects those
    // specs and every one fails with "Playwright Test did not expect test() to
    // be called here" -- a real 18-file failure with nothing wrong in the code.
    // The root patterns below don't cover it because they're root-anchored.
    exclude: ['**/node_modules/**', 'tests/e2e/**', 'tests/integration/**', '.worktrees/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
