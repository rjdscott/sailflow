import { expect, test as base, type Page } from '@playwright/test';

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

/** The whole instrument band's text: BSP, % polar, VMG, TWA and the deltas. */
export async function instruments(page: Page): Promise<string> {
  return (await page.locator('.bar .cells').first().innerText()).replace(/\s+/g, ' ').trim();
}

/**
 * Wait until the Simulator has stopped changing on its own.
 *
 * Three things move after a load or an input, and a measurement taken between
 * any two of them is a measurement of a screen mid-flight:
 *
 * 1. the first solve mounts the instrument band at all;
 * 2. the optimum search lands, which puts the "to optimum" line under the
 *    cells and settles the band's height (CI's SwiftShader takes well over
 *    Playwright's 5 s default to get there);
 * 3. the band's three primary numbers tween over 260 ms (phase 01).
 *
 * Two identical reads a frame budget apart is the honest gate for (3): the
 * share spec's sender read 6.0 kt where the receiver read 6.1 because it
 * measured during the tween. Lives here, and not in one spec, because the same
 * three races made `boat.spec`, `phone-perf.spec` and `race.spec` fail only
 * under a full parallel run on a fast machine (phase 04 progress log).
 */
export async function settled(page: Page): Promise<void> {
  await expect(page.locator('.bar .cells').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: /Apply optimum/ })).toBeEnabled({
    timeout: 30_000,
  });
  let last = '';
  await expect
    .poll(
      async () => {
        const now = await instruments(page);
        const same = now === last && now !== '';
        last = now;
        return same;
      },
      { intervals: [300, 300, 300, 300, 300] },
    )
    .toBe(true);
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await asReturningVisitor(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
