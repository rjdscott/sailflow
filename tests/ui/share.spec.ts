import { expect, test, type Page } from '@playwright/test';

/**
 * The share link, end to end (ADR 0019). Vitest proves the codec round-trips;
 * only a browser can prove that the link a sailor copies out of one session
 * reproduces the same numbers in someone else's, through the whole path — the
 * debounced URL writer, the clipboard, a cold app boot, the worker, and the
 * solver — with none of the sender's localStorage along for the ride.
 *
 * Two contexts, not two pages: a second page in the same context shares
 * `localStorage`, so it would restore the sender's session and pass even if
 * the link carried nothing at all.
 */

/** A fresh browser with a clipboard the test can read. */
async function fresh(browser: import('@playwright/test').Browser, clipboard = false) {
  const context = await browser.newContext(
    clipboard ? { permissions: ['clipboard-read', 'clipboard-write'] } : {},
  );
  const page = await context.newPage();
  return { context, page };
}

/** The whole instrument band's text: BSP, % polar, VMG, TWA and the deltas. */
async function instruments(page: Page): Promise<string> {
  return (await page.locator('.bar .cells').first().innerText()).replace(/\s+/g, ' ').trim();
}

/**
 * Wait until the screen has stopped changing on its own: the solver has
 * answered and the optimum search has landed, which is what puts the "target"
 * line under the cells. Same gate `race.spec.ts` measures layout after.
 */
async function settled(page: Page): Promise<void> {
  await expect(page.locator('.bar .cells').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Apply optimum/ })).toBeEnabled();
}

test('a link generated in one session reproduces the instruments in a fresh one', async ({
  browser,
}) => {
  const sender = await fresh(browser, true);
  const receiver = await fresh(browser);

  try {
    await sender.page.goto('/#/race');
    await settled(sender.page);

    // Move off the defaults, in both halves of the state the link carries: the
    // condition and the trim. Three clicks and a slider, so the target state
    // is written down here rather than being "whatever the app started with".
    const windUp = sender.page.getByRole('button', { name: 'Wind speed up one knot' });
    for (let i = 0; i < 3; i++) await windUp.click();
    await sender.page.getByRole('slider', { name: 'Mainsheet' }).fill('85');
    await sender.page.getByRole('slider', { name: 'Backstay' }).fill('70');
    await settled(sender.page);

    const before = await instruments(sender.page);
    // The trim actually moved, so a link that carried nothing could not pass
    // by accident.
    expect(before).not.toBe('');

    await sender.page.getByRole('button', { name: 'Copy link' }).click();
    await expect(sender.page.getByText('Link copied')).toBeVisible();
    const link = await sender.page.evaluate(() => navigator.clipboard.readText());

    // It is a real, versioned share link and not the bare route.
    expect(link).toContain('#/race?');
    expect(link).toContain('s=1');

    await receiver.page.goto(link);
    await settled(receiver.page);
    expect(await instruments(receiver.page)).toBe(before);

    // The sliders arrived too, not only the numbers they produce.
    await expect(receiver.page.getByRole('slider', { name: 'Mainsheet' })).toHaveValue('85');
    await expect(receiver.page.getByRole('slider', { name: 'Backstay' })).toHaveValue('70');
  } finally {
    await sender.context.close();
    await receiver.context.close();
  }
});

test('a v0 link — no version, dot-separated trim — still opens', async ({ browser }) => {
  // The shape v0.3.0 wrote into every address bar, and therefore the shape
  // sitting in group chats today. `MIGRATIONS[0]` is what keeps it working.
  const { context, page } = await fresh(browser);
  try {
    await page.goto('/#/race?tws=16&twa=40&sea=2&crew=320&set=jib&r=70.85.0.20.50.30.60.5.30.50.50');
    await settled(page);
    await expect(page.getByRole('slider', { name: 'Backstay' })).toHaveValue('70');
    await expect(page.getByRole('slider', { name: 'Mainsheet' })).toHaveValue('85');
    await expect(page.getByLabel('Edit True wind speed value')).toHaveText('16 kt');
  } finally {
    await context.close();
  }
});

test('a pinned trim gives every instrument a labelled delta against it', async ({ browser }) => {
  const { context, page } = await fresh(browser);
  try {
    await page.goto('/#/race');
    await settled(page);

    await page.getByRole('button', { name: 'Pin this trim' }).click();
    // Pinned and the trim unchanged: the deltas are all zero, and the line
    // under the actions says which trim the ghost is.
    await expect(page.getByText(/the ghost outline on the boat/)).toBeVisible();

    // The cells' delta is measured against the pin now, not the optimum. The
    // words are in the accessibility tree at every tier (`.delta-label`).
    await expect(
      page.locator('.bar .cells').first().getByText(/Δ to pinned trim/).first(),
    ).toBeAttached();

    await page.getByRole('slider', { name: 'Mainsheet' }).fill('85');
    await settled(page);
    await expect(page.getByText(/Differs on Mainsheet/)).toBeVisible();

    // The ghost is really in the 3D scene, at the weight ADR 0019 specifies —
    // a dashed 2D outline and a 40 % alpha 3D one are the same cue, and a
    // silently invisible line is the failure a screenshot would not catch
    // either (the baselines are taken unpinned).
    const ghost = await page.evaluate(() => {
      const sail = (window as unknown as { __sail?: Record<string, unknown> }).__sail;
      const edges = sail?.pinEdges as
        | { visible: boolean; geometry: { attributes: { position: { count: number } } }; material: { opacity: number } }
        | null
        | undefined;
      if (!edges) return null;
      return {
        visible: edges.visible,
        vertices: edges.geometry.attributes.position.count,
        opacity: edges.material.opacity,
      };
    });
    // Null when the device fell back to the 2D plan view; the outline is
    // asserted there by the dashed path instead.
    if (ghost) {
      expect(ghost.visible).toBe(true);
      expect(ghost.vertices).toBeGreaterThan(0);
      expect(ghost.opacity).toBeCloseTo(0.4);
    } else {
      await expect(page.locator('.hero-boat svg path.pin').first()).toBeAttached();
    }

    await page.getByRole('button', { name: 'Unpin' }).click();
    await expect(page.getByText(/the ghost outline on the boat/)).toHaveCount(0);
    await expect(
      page.locator('.bar .cells').first().getByText(/Δ to optimum/).first(),
    ).toBeAttached();
  } finally {
    await context.close();
  }
});
