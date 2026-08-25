import { defineConfig, devices } from '@playwright/test';

/**
 * Layout smoke only (cockpit phase 01). Vitest owns the logic; this exists to
 * catch the one class of bug a jsdom test cannot see — a real viewport, real
 * CSS, and something wider than it.
 *
 * Chromium alone: the failures worth catching here are box-model, not engine
 * quirks, and a second browser doubles CI for a class of bug we do not have.
 *
 * The server is `vite preview`, so the smoke runs against the same bundle
 * that ships. It needs `dist/` — run `pnpm build` first (CI does; locally
 * `pnpm build && pnpm test:ui`).
 */
// Overridable so a second checkout (or a preview you left running) does not
// collide: PREVIEW_PORT=4174 pnpm test:ui
const PORT = Number(process.env.PREVIEW_PORT ?? 4173);

export default defineConfig({
  testDir: './tests/ui',
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
