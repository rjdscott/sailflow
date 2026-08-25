import { expect, test } from '@playwright/test';

/**
 * The accessibility regressions audit ux-03 found on Race, as tests. Vitest
 * cannot see any of these: they are about what the composed DOM does under a
 * real click, not about what a component returns.
 */
const DESKTOP = { width: 1440, height: 900 };

/**
 * H-06: the confidence badge used to be a `<button>` inside `button.apply`,
 * so one click on the tier letter both opened the popover and rewrote five
 * sliders. It is a sibling of the button now, inside the same accent pill.
 */
test('asking what the confidence tier means does not apply the optimum', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/#/race');

  const apply = page.getByRole('button', { name: 'Apply optimum' });
  await expect(apply).toBeEnabled();

  // Nothing interactive nested inside anything interactive, anywhere on Race.
  const nested = await page.locator('button button, button a, a button, button input').count();
  expect(nested, 'no nested interactive elements on Race').toBe(0);

  const mainsheet = page.locator('#mainsail-controls input[type="range"]').first();
  const before = await mainsheet.inputValue();

  const badge = page.locator('.apply-wrap .badge');
  await expect(badge).toBeVisible();
  await badge.click();

  // The popover opened — the badge still explains itself — and the trim is
  // exactly where it was.
  await expect(badge).toHaveAttribute('aria-expanded', 'true');
  await expect(mainsheet).toHaveValue(before);

  // And the button beside it still does its job.
  await apply.click();
  await expect(mainsheet).not.toHaveValue(before);
});

/** H-08: nothing on Race was a live region, so a solve arrived in silence. */
test('the coach verdict and the instrument summary are status live regions', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/#/race');

  await expect(page.locator('.insight .line')).toHaveAttribute('role', 'status');

  // The debounced summary of the three numbers the screen is for.
  const summary = page.locator('.bar p[role="status"]');
  await expect(summary).toHaveText(/knots boat speed, .* percent of polar, VMG .* knots\./);
});
