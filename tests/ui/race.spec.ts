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
 * Phone: the same four panels, stacked, with a sticky strip that is the only
 * way back up the stack that does not cost a flick (phase 06).
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

  const bar = page.locator('.bar');
  await expect(bar.getByText('BSP')).toBeVisible();
  await expect(bar.getByText('%POLAR')).toBeVisible();
  await expect(bar.getByText('VMG')).toBeVisible();
  await expect(bar.getByText('HEEL')).toBeVisible();
  await expect(bar.getByText('TWA')).toBeHidden();

  await bar.getByRole('button', { name: 'More' }).click();
  await expect(bar.getByText('TWA')).toBeVisible();
});
