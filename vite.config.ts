/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/sailflow/' : '/',
  plugins: [svelte()],
  test: {
    include: ['src/**/*.test.ts', 'validation/**/*.test.ts'],
  },
});
