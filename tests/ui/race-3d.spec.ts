import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

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

test('sets the gennaker and furls the jib under sailset=asym', async ({ page }) => {
  // ADR 0017. `?set=asym` is the scenario link's own encoding (`ui/scenario.ts`),
  // so this is the URL a downwind session actually lands on, and `twa=150`
  // puts the boat where a kite belongs.
  await openHero(page, 'view=leeward&freeze=1&set=asym&twa=150');

  const hero = page.locator(HERO);
  await expect(hero.locator('canvas')).toBeVisible();

  // The DEV handle reports a sail that is not set as null, so this asks the
  // question directly rather than reading `.visible` off a hidden mesh.
  const sails = await page.evaluate(() => {
    const s = (window as unknown as { __sail?: Record<string, unknown> }).__sail ?? {};
    return { kite: s.kiteSail !== null && s.kiteSail !== undefined, jib: s.jibSail === null };
  });
  expect(sails).toEqual({ kite: true, jib: true });

  await expect(hero).toHaveScreenshot('race-3d-kite-leeward.png', {
    // Same tolerances, and for the same reason, as the jib baseline above.
    maxDiffPixelRatio: 0.03,
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
  // ux-03 H-12. The old gate timed a warm *second* render — GPU command
  // submission, ~1 ms — and passed at every throttle rate, so nothing could
  // ever reach the 2D fallback it guards. Mount → first frame is 60–600 ms
  // depending on the machine, so the budget is pinned to 1 ms through the
  // test seam rather than trusting a CPU throttle to beat the budget everywhere.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('sailflow.hero.v1', '3d');
      localStorage.setItem('sailflow.motion', 'off');
      localStorage.setItem('sailflow.hero.budget', '1');
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

/**
 * Plan risk 2: the hero and the plan view are two pictures of one trim and
 * must not contradict each other. Both now read `race/telltales.ts` — the 3D
 * hero per ribbon on its DEV handle, the plan view as the CSS class on each
 * `.ribbon` — so one spec can put the same question to both.
 *
 * The stations differ by a hair: the plan view draws ¼ ½ ¾ and the head,
 * the loft samples its own rows (row 17 of 24 is 0.739 of the height), so the
 * 3D assertion is on the nearest station rather than on an equal `at`.
 */
async function jibLuffStates(page: Page): Promise<{ at: number; state: string }[]> {
  return page.evaluate(() => {
    const s = (window as unknown as { __sail?: { telltaleStates?: unknown } }).__sail;
    const all = (s?.telltaleStates ?? []) as { sail: string; at: number; state: string }[];
    return all.filter((t) => t.sail === 'jibLuff').map((t) => ({ at: t.at, state: t.state }));
  });
}

/** The published station nearest ¾ height, which is the one the plan view draws. */
const upperOf = (s: { at: number; state: string }[]): { at: number; state: string } | null =>
  s.length === 0 ? null : s.reduce((a, b) => (Math.abs(b.at - 0.75) < Math.abs(a.at - 0.75) ? b : a));

test('over-sheeting the jib stalls its ¾ ribbon in both pictures', async ({ page }) => {
  await openHero(page, 'view=leeward&freeze=1');
  const hero = page.locator(HERO);
  await expect(hero.locator('canvas')).toBeVisible();

  const sheet = page
    .locator('#headsail-controls')
    .getByRole('slider', { name: 'Jib sheet', exact: true });

  // Sheet fully home: the sheeting angle collapses toward the centreline, the
  // same apparent wind meets the luff at a much larger angle, and the entry
  // chokes. Every jib luff station reads stalled, the ¾ one included.
  await sheet.fill('100');
  await expect.poll(async () => (await jibLuffStates(page)).map((t) => t.state)).toEqual([
    'stalled',
    'stalled',
    'stalled',
  ]);
  const upper = upperOf(await jibLuffStates(page));
  expect(upper?.at).toBeGreaterThan(0.6);
  expect(upper?.state).toBe('stalled');

  // Same trim, other picture: the toggle swaps the hero without a reload.
  await hero.getByRole('radio', { name: 'Plan' }).click();
  await expect(hero.locator('canvas')).toHaveCount(0);
  const plan = hero.locator('[data-sail="jibLuff"][data-at="0.75"] .ribbon');
  await expect(plan).toHaveClass(/stalled/);

  // And the agreement is not vacuous: eased right off, the same station leaves
  // the stalled band in both pictures.
  await sheet.fill('20');
  await expect(plan).not.toHaveClass(/stalled/);
  await hero.getByRole('radio', { name: '3D' }).click();
  await expect(hero.locator('canvas')).toBeVisible();
  await expect.poll(async () => upperOf(await jibLuffStates(page))?.state ?? null).not.toBe(
    'stalled',
  );
});

/**
 * Legibility, not correctness: the states can be right and still be invisible.
 * The first cut drew 0.39 m hairlines and stalled could not be told from
 * lifting at the default zoom without a crop (PR #115 review). This measures
 * the thing the eye actually does — how far the ¾ jib luff ribbon's tip moves
 * on screen between eased and over-sheeted — through the live camera, the way
 * the masthead framing gate in `race.spec.ts` does.
 */
const TIP_PX = 18;

async function upperTipPx(page: Page): Promise<{ x: number; y: number; state: string } | null> {
  return page.evaluate(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const sail = (window as any).__sail;
    const all = (sail?.telltaleStates ?? []).filter((t: any) => t.sail === 'jibLuff');
    if (!all.length || !sail.camera) return null;
    const t = all.reduce((a: any, b: any) =>
      Math.abs(b.at - 0.75) < Math.abs(a.at - 0.75) ? b : a,
    );
    // A `Vector3` without importing three into the spec: clone one the scene
    // already holds, then reuse it as scratch.
    const v = sail.camera.position.clone();
    v.set(t.tip[0], t.tip[1], t.tip[2]);
    const ndc = sail.telltales.localToWorld(v).project(sail.camera);
    const r = document.querySelector('.hero-boat canvas')!.getBoundingClientRect();
    return { x: ((ndc.x + 1) / 2) * r.width, y: ((1 - ndc.y) / 2) * r.height, state: t.state };
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });
}

test('the ¾ jib ribbon moves far enough on screen to read at the default zoom', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHero(page, 'view=leeward&freeze=1');
  await expect(page.locator(`${HERO} canvas`)).toBeVisible();

  const sheet = page
    .locator('#headsail-controls')
    .getByRole('slider', { name: 'Jib sheet', exact: true });

  await sheet.fill('20');
  await expect.poll(async () => (await upperTipPx(page))?.state).toBe('lifting');
  const eased = await upperTipPx(page);

  await sheet.fill('100');
  await expect.poll(async () => (await upperTipPx(page))?.state).toBe('stalled');
  const sheeted = await upperTipPx(page);

  const moved = Math.hypot(sheeted!.x - eased!.x, sheeted!.y - eased!.y);
  expect(
    moved,
    `the ribbon tip only moved ${moved.toFixed(1)} px between the two trims`,
  ).toBeGreaterThanOrEqual(TIP_PX);
});
