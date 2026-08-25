import { defineConfig, devices } from '@playwright/test';

/**
 * UI smoke tests. One project, headless Chromium on its **default
 * SwiftShader** — software rendering is what we want, not a workaround:
 * GitHub-hosted runners have no GPU, and SwiftShader renders the same pixels
 * on every machine (research 2026-08-25-cockpit/03, sources 18 and 19).
 *
 * Baselines are keyed `*-chromium-linux`, so regenerate them inside
 * `mcr.microsoft.com/playwright:v1.62.1-noble` — the tag CI pins — or they
 * will not match. See `docs/plans/2026-08-25-cockpit/phase-04-three-d-hero.md`.
 */
export default defineConfig({
  testDir: 'tests/ui',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4318',
    // Fixed, so a retina laptop and a CI runner agree on the pixels.
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
  },
  expect: {
    toHaveScreenshot: { animations: 'disabled' },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
  webServer: {
    // npx, not pnpm: the pinned playwright docker image has node but no pnpm.
    // An odd port, and never reuse whatever already holds it: a `vite preview`
    // left running by another checkout on the usual 4173 will happily serve a
    // different build of this app, and the failure looks like a UI bug rather
    // than a port clash (incident 2026-08-25).
    command: 'npx vite preview --host 127.0.0.1 --port 4318 --strictPort',
    url: 'http://127.0.0.1:4318',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
