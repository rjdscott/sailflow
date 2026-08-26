import { test as base } from '@playwright/test';

/**
 * The app as a *returning* visitor sees it.
 *
 * A fresh Playwright context has an empty localStorage, which is a first run,
 * and a first run opens the tour — a modal `<dialog>`, so every click in every
 * other spec would land on its backdrop. Every spec except
 * `onboarding.spec.ts` imports `test` from here rather than from
 * `@playwright/test`, which is also the honest statement of what those specs
 * are about.
 *
 * `addInitScript` runs before the page's own scripts, so the flag is in place
 * by the time `tour.svelte.ts` reads it.
 */
/**
 * Same seeding for a context a spec built itself — `share.spec.ts` opens two,
 * on purpose, to keep the sender's `localStorage` out of the receiver's.
 */
export async function asReturningVisitor(target: {
  addInitScript: (s: () => void) => Promise<void>;
}): Promise<void> {
  await target.addInitScript(() => {
    try {
      localStorage.setItem('sailflow.tourSeen', '1');
    } catch {
      // No persistence available; the tour will open and the spec will say so.
    }
  });
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await asReturningVisitor(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
