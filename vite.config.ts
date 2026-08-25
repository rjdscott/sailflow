/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

const pkg: { version: string } = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/sailflow/' : '/',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [
    svelte(),
    // `ANALYZE=1 pnpm build` writes dist/stats.html. Kept, not deleted: ADR
    // 0014 commits to a measured chunk size, and re-measuring it after a
    // `three` upgrade should not need this wiring rebuilt from memory.
    ...(process.env.ANALYZE ? [visualizer({ filename: 'dist/stats.html', gzipSize: true })] : []),
    VitePWA({
      registerType: 'autoUpdate',
      // Workbox precaches everything Vite emits (js/css/html/svg/...),
      // including the solver worker chunk once solver.worker.ts lands.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png,webmanifest}'],
        // The three.js hero chunk is ~570 kB and lazily imported (ADR 0014).
        // Precaching it would hand every phone that download on first visit,
        // which is exactly the cost the lazy import exists to avoid. It is
        // fetched on demand; offline, the Race screen keeps the 2D plan view,
        // which is already the designed fallback.
        globIgnores: ['**/SailView3D-*.js', '**/SailView3D-*.css'],
        navigateFallback: 'index.html',
      },
      includeAssets: ['icons/icon.svg', 'icons/icon-maskable.svg'],
      manifest: {
        name: 'Sailflow',
        short_name: 'Sailflow',
        description: 'J/70 rig-tune and sail-trim trainer',
        theme_color: '#0057d9',
        background_color: '#121212',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          {
            src: 'icons/icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'validation/**/*.test.ts', 'calibration/**/*.test.ts'],
    // The polar hold-out gate is excluded here (ADR 0007/0012) so `pnpm test`
    // stays fast; it runs via `pnpm validate`, both locally and in CI's own
    // `validate` job — which is `continue-on-error: true`, so it reports
    // rather than blocks. `pnpm test` in CI is invariants + golden.
    exclude: ['**/node_modules/**', 'validation/polar.test.ts'],
  },
});
