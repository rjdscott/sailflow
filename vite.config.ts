/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/sailflow/' : '/',
  plugins: [svelte()],
  test: {
    include: ['src/**/*.test.ts', 'validation/**/*.test.ts', 'calibration/**/*.test.ts'],
    // The polar hold-out gate runs locally via `pnpm validate` (ADR 0007/0012); CI runs invariants + golden.
    exclude: ['**/node_modules/**', 'validation/polar.test.ts'],
  },
});
