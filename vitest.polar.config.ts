import { defineConfig } from 'vitest/config';

/**
 * The polar hold-out gate (ADR 0007/0012). Its own config because `pnpm test`
 * excludes it. Run by `pnpm validate` locally and by CI's `validate` job,
 * which is `continue-on-error: true` — non-blocking, not absent.
 */
export default defineConfig({
  test: { include: ['validation/polar.test.ts'] },
});
