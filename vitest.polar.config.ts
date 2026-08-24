import { defineConfig } from 'vitest/config';

/** The polar hold-out gate (ADR 0007/0012). Local only: `pnpm validate`. */
export default defineConfig({
  test: { include: ['validation/polar.test.ts'] },
});
