/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

const pkg: { version: string } = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/sailflow/' : '/',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      // Workbox precaches everything Vite emits (js/css/html/svg/...),
      // including the solver worker chunk once solver.worker.ts lands.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png,webmanifest}'],
        navigateFallback: 'index.html',
      },
      includeAssets: ['icons/icon.svg', 'icons/icon-maskable.svg'],
      manifest: {
        name: 'Sailflow',
        short_name: 'Sailflow',
        description: 'J/70 rig-tune and sail-trim trainer',
        theme_color: '#0057d9',
        background_color: '#ffffff',
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
    include: ['src/**/*.test.ts', 'validation/**/*.test.ts'],
  },
});
