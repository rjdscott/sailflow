import { expect, test, type Page } from '@playwright/test';

/**
 * One software-rendered smoke shot of the 3D hero (ADR 0014, research 03 §7
 * tier 3). Tier 1 — the loft invariants in `src/ui/three/*.test.ts` — carries
 * the correctness; this only answers "it rendered something with the right
 * silhouette", which is the part no unit test can see.
 *
 * The shot is scoped to the hero card, not the viewport. The instrument and
 * coach panels beside it churn on every solve and are being rebuilt in
 * parallel phases; clipping to the card the 3D view owns keeps this baseline
 * about the 3D view, and there are no numbers inside the clip to churn. The
 * metrics dock is masked as well, so the intent survives if the clip ever
 * widens.
 */

const HERO = '.hero-boat';

/**
 * `motion: 'default'` deliberately leaves `sailflow.motion` unset, which is
 * the `'system'` default every real visitor lands on. Pinning it to `'off'` is
 * what hid ux-03 H-09 for a whole phase, so the reduced-motion test below must
 * not do it.
 */
async function openHero(
  page: Page,
  query: string,
  motion: 'off' | 'default' = 'off',
): Promise<void> {
  await page.addInitScript((m) => {
    try {
      // Force the 3D branch: the toggle is persisted, and a fresh profile
      // would otherwise take the default.
      localStorage.setItem('sailflow.hero.v1', '3d');
      // Frozen telltales need frozen everything else too.
      if (m === 'off') localStorage.setItem('sailflow.motion', 'off');
    } catch {
      // ignore: storage disabled, the URL params still drive the view
    }
  }, motion);
  await page.goto(`/#/race?${query}`);
  await page.waitForFunction(
    () => (window as unknown as { __sailViewReady?: boolean }).__sailViewReady === true,
    undefined,
    { timeout: 60_000 },
  );
}

/** Counts hero renders: `WebGLRenderer.render` clears before it draws. */
async function countRenders(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __glClears?: number };
    w.__glClears = 0;
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      const clear = proto.clear;
      proto.clear = function (this: WebGLRenderingContext, mask: number): void {
        w.__glClears = (w.__glClears ?? 0) + 1;
        clear.call(this, mask);
      };
    }
  });
}

const clears = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as { __glClears?: number }).__glClears ?? 0);

test('renders the 3D hero from the leeward quarter', async ({ page }) => {
  await openHero(page, 'view=leeward&freeze=1');

  const hero = page.locator(HERO);
  await expect(hero.locator('canvas')).toBeVisible();

  // The 2D fallback must be gone, or the shot is of the wrong picture.
  await expect(hero.locator('svg[role="img"]')).toHaveCount(0);

  await expect(hero).toHaveScreenshot('race-3d-leeward.png', {
    // The committed baseline is generated inside
    // `mcr.microsoft.com/playwright:v1.62.1-noble`, the tag CI pins, where
    // this is same-image against same-image and the diff is zero. On a
    // developer's own machine SwiftShader lands antialiased sail edges a
    // shade either side, and the cockpit's hero cell is wider than the card
    // it replaced, so there is more edge to disagree about: 0.02 measured
    // 2026-08-25, hence 0.03. The silhouette is what this guards, and a
    // silhouette that moved is worth far more than 3 % of the pixels.
    // Regenerate in the docker image on a Playwright upgrade.
    maxDiffPixelRatio: 0.03,
    // Per-pixel colour tolerance, up from Playwright's 0.2. Almost every
    // differing pixel between two SwiftShader builds is an antialiased sail
    // edge landing a shade either side; this folds those in without letting a
    // genuinely different silhouette through, which the pixel ratio catches.
    threshold: 0.35,
  });
});

test('honours the ?view= preset and the hero toggle', async ({ page }) => {
  await openHero(page, 'view=top&freeze=1');
  const hero = page.locator(HERO);
  await expect(hero.getByRole('radio', { name: 'Top-down' })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  // Switching to Plan drops the canvas and puts the 2D view back, with no
  // reload: that is the fallback path every gate below it also takes.
  await hero.getByRole('radio', { name: 'Plan' }).click();
  await expect(hero.locator('canvas')).toHaveCount(0);
  await expect(hero.locator('svg[role="img"]').first()).toBeVisible();
});

test('mounts the 3D view once on a phone, in the one hero card there is', async ({ page }) => {
  // The cockpit grid reflows one hero rather than rendering a desktop copy
  // and a phone copy and hiding one (phase 06). Browsers hand out about
  // sixteen WebGL contexts, so "exactly one canvas, and it is the hero's" is
  // the invariant that used to need a visibility gate.
  await page.setViewportSize({ width: 390, height: 844 });
  await openHero(page, 'view=leeward&freeze=1');
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator(`${HERO} canvas`)).toHaveCount(1);
});

test('an OS reduced-motion preference freezes the hero and parks the render loop', async ({
  page,
}) => {
  // ux-03 H-09. `sailflow.motion` stays unset — `'system'`, the default every
  // real visitor lands on — so the only thing that can freeze the hero is the
  // media query. Pinning the setting to `'off'`, which the tests above do, is
  // exactly what hid this for a phase. No `freeze=1` either, for the same
  // reason: it would freeze the view by fiat and assert nothing.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await countRenders(page);
  await openHero(page, 'view=leeward', 'default');

  const canvas = page.locator(`${HERO} canvas`);
  await expect(canvas).toBeVisible();

  // Past the resize, the geometry build, and the 600 ms camera tween a moving
  // hero would still be running.
  await page.waitForTimeout(800);
  const before = await clears(page);
  const a = await canvas.screenshot();
  await page.waitForTimeout(400);
  const b = await canvas.screenshot();

  // Two frames a few hundred ms apart, byte for byte: the audit's method.
  expect(b.equals(a)).toBe(true);
  // And the loop is parked, not merely redrawing the same thing 60 times a second.
  expect(await clears(page)).toBe(before);
});

test('the first-frame gate falls back to 2D when the hero is too slow to mount', async ({
  page,
}) => {
  // ux-03 H-12. A 20x CPU throttle stands in for a low-end Android: mount to
  // first frame measures ~605 ms in the pinned image, against a 350 ms budget.
  // The old gate timed a warm *second* render — GPU command submission, ~1 ms
  // — and passed at every throttle rate, so nothing could ever reach the 2D
  // fallback it guards.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 });
  await page.addInitScript(() => {
    try {
      localStorage.setItem('sailflow.hero.v1', '3d');
      localStorage.setItem('sailflow.motion', 'off');
    } catch {
      // ignore: storage disabled, the URL params still drive the view
    }
  });
  // No `freeze=1`: that exempts the gate, so the screenshot baseline is stable.
  await page.goto('/#/race?view=leeward');

  const hero = page.locator(HERO);
  await expect(hero.getByText('3D ran slow on this device')).toBeVisible({ timeout: 60_000 });
  await expect(hero.locator('canvas')).toHaveCount(0);
  await expect(hero.locator('svg[role="img"]').first()).toBeVisible();
});
