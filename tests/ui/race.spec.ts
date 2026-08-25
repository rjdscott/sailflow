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
    await expect(page.getByRole('heading', { name: 'Helm & conditions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rig', exact: true })).toBeVisible();

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);
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
