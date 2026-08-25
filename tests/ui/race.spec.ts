import { expect, test } from '@playwright/test';

/**
 * Layout smoke for the cockpit. The desktop cockpit is meant to be one screen
 * (ADR 0015), and the two sail panels each carry a control column, a picture
 * and an instrument rail — which is exactly the arrangement that pushes a
 * card wider than its column. Vitest cannot see that; a real viewport can.
 *
 * Vertical scroll is not asserted: phases 04–06 still have panels to add, and
 * the one-screen check lands with them.
 */
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
];

for (const viewport of VIEWPORTS) {
  test(`race fits ${viewport.width}x${viewport.height} with no horizontal scroll`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/#/race');

    await expect(page.getByRole('heading', { name: 'Mainsail' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Headsail' })).toBeVisible();

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);
  });
}

test('the sail panels are labelled sections a screen reader can jump between', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS[0]);
  await page.goto('/#/race');

  await expect(page.getByRole('region', { name: 'Mainsail' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Headsail' })).toBeVisible();
});
