import { expect, test, type Page } from '@playwright/test';

/**
 * Layout smoke for the cockpit. The desktop cockpit is meant to be one screen
 * (ADR 0015, research §3 principle 4), and the four panels each carry a
 * control column, a picture and an instrument rail — which is exactly the
 * arrangement that pushes a card past its column, or the page past its fold.
 * Vitest cannot see either; a real viewport can.
 */
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
];

const PHONE = { width: 390, height: 844 };

/** The tier the one-screen promise is made in. Learn and Analyse may scroll. */
async function raceTier(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('sailflow.mode', 'race');
      localStorage.setItem('sailflow.motion', 'off');
    } catch {
      // ignore: storage disabled, the default tier is already 'race'
    }
  });
}

/** The hero has drawn something — the 3D canvas, or the plan view it falls
 *  back to. Either way the cell it sits in now has its real height. */
async function heroDrawn(page: Page): Promise<void> {
  await expect(page.locator('.hero-boat canvas, .hero-boat svg[role="img"]').first()).toBeVisible();
}

/**
 * Every band the grid sizes off has stopped growing: the hero has drawn, and
 * the optimum has landed, which is what puts the "to optimum" line under three
 * instrument cells and settles the bar's height. Measure after this, or you
 * measure a layout that is one solve out of date.
 */
async function settled(page: Page): Promise<void> {
  await heroDrawn(page);
  await expect(page.getByRole('button', { name: /Apply optimum/ })).toBeEnabled();
}

for (const viewport of VIEWPORTS) {
  test(`race fits ${viewport.width}x${viewport.height} with no scroll in either axis`, async ({
    page,
  }) => {
    await raceTier(page);
    await page.setViewportSize(viewport);
    await page.goto('/#/race');

    await expect(page.getByRole('heading', { name: 'Mainsail' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Headsail' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Helm & conditions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rig', exact: true })).toBeVisible();
    await heroDrawn(page);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);
    // One screen from 800 px tall: the panels scroll inside themselves, the
    // document does not. Shorter windows scroll the page and keep the hero a
    // fixed 360 px instead (Race.svelte, the max-height rule).
    if (overflow.innerHeight >= 800) {
      expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.innerHeight + 1);
    } else {
      const hero = await page.locator('canvas, .hero-boat svg').first().boundingBox();
      expect(hero?.height ?? 0).toBeGreaterThanOrEqual(250);
    }
  });
}

test('the cockpit panels are labelled sections a screen reader can jump between', async ({
  page,
}) => {
  await page.setViewportSize(VIEWPORTS[0]);
  await page.goto('/#/race');

  await expect(page.getByRole('region', { name: 'Mainsail' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Headsail' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Helm & conditions' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Rig', exact: true })).toBeVisible();
});

/** `h` and `r` joined `m` and `j` with the Helm and Rig panels (phase 06). */
test('the keyboard reaches every panel', async ({ page }) => {
  await raceTier(page);
  await page.setViewportSize(VIEWPORTS[0]);
  await page.goto('/#/race');
  await expect(page.getByRole('heading', { name: 'Rig', exact: true })).toBeVisible();

  for (const [key, id] of [
    ['m', 'mainsail-controls'],
    ['j', 'headsail-controls'],
    ['h', 'helm-controls'],
    ['r', 'rig-controls'],
  ]) {
    await page.keyboard.press(key);
    const landed = await page.evaluate(
      (controls) => !!document.activeElement?.closest(`#${controls}`),
      id,
    );
    expect(landed, `${key} should focus a control inside #${id}`).toBe(true);
  }
});

/**
 * A/B is disabled until there is a second trim to compare with, and it says
 * so rather than doing nothing when pressed (phase 05).
 */
test('A/B compare is disabled, with a reason, until a whole-trim action has run', async ({
  page,
}) => {
  await page.setViewportSize(VIEWPORTS[1]);
  await page.goto('/#/race');

  const ab = page.getByRole('button', { name: /Nothing to compare with yet/ });
  await expect(ab).toBeDisabled();

  // Base trim rewrites the whole trim, so it parks one to compare against.
  await page.getByRole('button', { name: 'Base trim', exact: true }).click();
  await expect(page.getByRole('button', { name: /Swap to the other trim/ })).toBeEnabled();
});

test('the puff replay restores the wind it borrowed when it is stopped', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS[1]);
  await page.goto('/#/race');

  const wind = page.locator('.tws');
  const before = await wind.textContent();

  await page.getByRole('button', { name: 'Replay a gust ▶' }).click();
  await expect(wind).not.toHaveText(before ?? '');

  await page.getByRole('button', { name: 'Stop replay' }).click();
  await expect(wind).toHaveText(before ?? '');
});

/**
 * Phone: hero first, then the same four panels stacked, with a sticky strip
 * that is the only way back up the stack that does not cost a flick (phase 06).
 */
test('the phone stacks the cockpit with no horizontal scroll and a sticky panel strip', async ({
  page,
}) => {
  await raceTier(page);
  await page.setViewportSize(PHONE);
  await page.goto('/#/race');
  await heroDrawn(page);

  const strip = page.getByRole('navigation', { name: 'Cockpit panels' });
  await expect(strip).toBeVisible();

  // Hero first (plan README, audit ux-03 H-11): on the first screen before any
  // scroll, and above the instrument band rather than 1045 px under it.
  const hero = page.locator('.hero-boat');
  const heroTop = await hero.evaluate((el) => el.getBoundingClientRect().top);
  expect(heroTop).toBeGreaterThanOrEqual(0);
  expect(heroTop).toBeLessThan(PHONE.height);
  await expect(hero).toBeInViewport();

  // …and the tab strip comes right after it, still above the band.
  const stripTop = await strip.evaluate((el) => el.getBoundingClientRect().top);
  const barTop = await page
    .locator('.cockpit > .bar')
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(stripTop).toBeGreaterThan(heroTop);
  expect(barTop).toBeGreaterThan(stripTop);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);

  // Sticky: 600 px down the stack it is still on screen, and once the stack
  // has scrolled past it, it is pinned to the top rather than gone.
  await page.mouse.wheel(0, 600);
  await expect(strip).toBeInViewport();
  await page.mouse.wheel(0, 1200);
  await expect(strip).toBeInViewport();
  const top = await strip.evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeLessThan(8);

  // And it takes you to a panel: tap Rig, and the Rig heading is on screen.
  await strip.getByRole('button', { name: 'Rig' }).click();
  await expect(page.getByRole('heading', { name: 'Rig', exact: true })).toBeInViewport();
});

/** The band is four readings wide on a phone until you ask for the rest. */
test('the phone instrument band keeps four readings and hides the rest behind More', async ({
  page,
}) => {
  await raceTier(page);
  await page.setViewportSize(PHONE);
  await page.goto('/#/race');

  // The readings, not the whole band: the verdict sentence names the metric it
  // is about, so a bare text match on the band is two elements whenever the
  // coach happens to say "VMG".
  const bar = page.locator('.bar');
  const readings = bar.locator('.cells, .gauges');
  await expect(readings.getByText('BSP')).toBeVisible();
  await expect(readings.getByText('%POLAR')).toBeVisible();
  await expect(readings.getByText('VMG')).toBeVisible();
  await expect(readings.getByText('HEEL')).toBeVisible();
  await expect(readings.getByText('TWA')).toBeHidden();

  await bar.getByRole('button', { name: 'More' }).click();
  await expect(readings.getByText('TWA')).toBeVisible();
});

/**
 * ux-03 H-01. `.panel > .grid` scrolls itself in the cockpit, and an auto row
 * track inside an overflow container resolved the visual's row to zero: every
 * sail-shape drawing rendered in a 0 px box while its SVG children measured
 * full size, so every test that queried the SVG passed. Measure the box.
 */
for (const viewport of VIEWPORTS) {
  test(`every cockpit panel draws its sail shape at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await raceTier(page);
    await page.setViewportSize(viewport);
    await page.goto('/#/race');
    await heroDrawn(page);

    for (const panel of ['.p-main', '.p-jib', '.p-rig']) {
      const box = await page.locator(`${panel} .visual`).boundingBox();
      expect(box?.height ?? 0, `${panel} .visual should be a real box`).toBeGreaterThan(100);
    }
  });
}

/**
 * ux-03 H-02. The band switched to its one-line desktop layout on a viewport
 * query, but on Drills it is mounted in the ~500 px secondary column, where
 * that layout threw the verdict and two gauges outside its own
 * `overflow: hidden`. It sizes off its own container now.
 */
test('the instrument band stays inside its column on Drills at desktop widths', async ({
  page,
}) => {
  await raceTier(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/drills');
  await page.locator('button.drill').first().click();

  const bar = page.locator('section.bar');
  await expect(bar).toBeVisible();
  await expect(bar.locator('.verdict')).toBeVisible();

  const clipped = await bar.evaluate((el) => {
    const right = el.getBoundingClientRect().right;
    return [...el.querySelectorAll<HTMLElement>('.cells, .gauges, .verdict')]
      .filter((child) => child.getBoundingClientRect().right > right + 1)
      .map((child) => child.className);
  });
  expect(clipped, 'no band child may spill past the band').toEqual([]);
  expect(await bar.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
});

/**
 * ux-03 H-03. The full comparison is ~1250 px tall and the cockpit's bottom
 * band is ~160: 87 % of it was clipped away with no scrollbar, so the app
 * asserted a disagreement and withheld every number and delta. The summary is
 * inline, the table is in the sheet, and both are reachable.
 */
test('the cockpit shows the model-vs-guides summary inline and the table in a sheet', async ({
  page,
}) => {
  await raceTier(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/race');
  await settled(page);

  const strip = page.locator('.disagree');
  await expect(strip.locator('.panel.compact')).toBeVisible();
  // The summary row itself, not just the sentence about it.
  await expect(strip.getByText('Uppers')).toBeVisible();
  const hidden = await strip.evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(hidden, 'the strip must not clip its own summary').toBeLessThanOrEqual(1);

  await strip.getByRole('button', { name: 'Full table' }).click();
  const sheet = page.locator('dialog[open]');
  await expect(sheet.getByText('Target BSP')).toBeVisible();
  await expect(sheet.getByText('Target heel')).toBeVisible();
});

/**
 * The day's tune, committed. Seeded rather than driven through the Dock: this
 * test is about what the Rig panel does with a lock, not how one is made.
 */
async function committedRig(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'sailflow.rigLock.v1',
        JSON.stringify({
          setup: { upperTurns: 0, lowerTurns: 0, forestayMm: 0 },
          committedAt: new Date().toISOString(),
          forecast: { minKt: 8, likelyKt: 10, maxKt: 12, seaState: 'moderate', crewKg: 300 },
        }),
      );
    } catch {
      // ignore: storage disabled — the panel stays uncommitted and this fails loudly
    }
  });
}

/**
 * ux-03 H-04. Committed, the Rig panel is the gear chart with your row lit —
 * and it rendered the header row and none of the seven data rows, 546 px of
 * them hidden in an overlay scroller with no scrollbar. Show the lit band and
 * its neighbours; the whole chart is one click away.
 */
test('the committed Rig panel shows the lit gear-chart row, not a header over nothing', async ({
  page,
}) => {
  await raceTier(page);
  await committedRig(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/race');
  await settled(page);

  // The sheet's copy of the chart also lives inside `.p-rig`; this is the one
  // in the panel body.
  const panel = page.locator('.p-rig');
  const lit = panel.locator('.gear.windowed tr.here');
  await expect(lit).toBeVisible();

  // In view means inside the panel's own scroll box, not merely in the DOM.
  const inside = await lit.evaluate((row) => {
    const box = row.getBoundingClientRect();
    const scroller = row.closest('.grid')!.getBoundingClientRect();
    return box.top >= scroller.top - 1 && box.bottom <= scroller.bottom + 1;
  });
  expect(inside, 'the lit row must be in view without scrolling the panel').toBe(true);

  const rows = await panel.locator('.gear.windowed tbody tr:visible').count();
  expect(rows).toBeGreaterThanOrEqual(2);

  await panel.getByRole('button', { name: /Full chart/ }).click();
  const sheet = page.locator('dialog[open]');
  expect(await sheet.locator('.gear tbody tr:visible').count()).toBeGreaterThan(rows);
});

/**
 * ux-03 H-07, WCAG 2.4.3. The actions card was emitted before the hero and all
 * four panels, so a keyboard met the three whole-trim buttons — and then the
 * hero's camera chips — before the first slider, at tab stop 41.
 */
test('a keyboard reaches a trim control before the whole-trim actions', async ({ page }) => {
  await raceTier(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/race');
  await heroDrawn(page);

  // The audit measured the first trim control at stop 41, behind Apply optimum,
  // Base trim, Log this trim and the hero's camera chips. It is stop 31 now, so
  // 40 is a walk that must reach it — and must not pass an action on the way.
  const STOPS = 40;
  let firstTrim = -1;
  const actionsBefore: number[] = [];
  for (let i = 0; i < STOPS && firstTrim < 0; i++) {
    await page.keyboard.press('Tab');
    const where = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return '';
      if (el.closest('.p-main, .p-jib, .p-helm, .p-rig') && el.matches('input[type="range"]'))
        return 'trim';
      return el.closest('.insight') ? 'action' : '';
    });
    if (where === 'action') actionsBefore.push(i);
    if (where === 'trim') firstTrim = i;
  }

  expect(firstTrim, `a trim slider must be reachable within ${STOPS} tabs`).toBeGreaterThanOrEqual(
    0,
  );
  expect(actionsBefore, 'no whole-trim action may come before the first trim control').toEqual([]);
});
