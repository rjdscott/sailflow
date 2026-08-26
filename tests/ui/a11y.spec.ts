import { expect, test } from './fixtures';

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

const PHONE = { width: 390, height: 844 };

/**
 * M-13: the `?` on every instrument label was the bare text line-box — 17.4 px
 * tall against the repo's own 44 px token. `.hit-44` grows the hit area with a
 * pseudo-element and paints nothing, so the band still reads as numbers.
 */
test('every instrument label question mark is a 44 px target on the phone', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto('/#/race');

  // Visible only: the phone band keeps three of its readings behind the
  // disclosure, and a `display: none` label has no hit area to measure.
  const explains = page.locator('.bar .explain:visible');
  // `count()` does not auto-wait, and the band is not in the DOM until the
  // first solve lands.
  await expect(explains.first()).toBeVisible();
  const count = await explains.count();
  expect(count, 'the band explains its readings').toBeGreaterThan(3);

  for (let i = 0; i < count; i++) {
    const el = explains.nth(i);
    const label = ((await el.textContent()) ?? '').trim();
    const box = (await el.boundingBox())!;
    const hit = await el.evaluate((n) => getComputedStyle(n, '::after').height);
    expect(hit, `${label} has no expanded hit area`).toBe('44px');
    // And it did not grow the paint: the text line-box is still a text line-box.
    expect(box.height, `${label} grew instead of being overlaid`).toBeLessThan(44);
  }

  // The expanded area is what actually takes the press, not just a rect in the
  // computed styles: press 8 px below the bottom of the label's own box —
  // outside it, inside the overlay — and the explainer sheet opens.
  const first = explains.first();
  const b = (await first.boundingBox())!;
  await first.click({ position: { x: b.width / 2, y: b.height + 8 } });
  await expect(page.getByRole('dialog')).toBeVisible();
});

/**
 * The other half of M-13's carve-out: phase 06 puts the cockpit's instrument
 * rows 37 px apart, where two 44 px overlays would overlap and steal each
 * other's presses, so the overlay is off there.
 */
test('the 1280 px cockpit keeps its instrument rows tight', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/#/race');

  const hit = await page
    .locator('.bar .explain')
    .first()
    .evaluate((n) => getComputedStyle(n, '::after').display);
  expect(hit).toBe('none');
});

/**
 * M-14: `aria-label` on the implicit `generic` role is dropped by browsers, so
 * the five point-of-sail chips were announced with nothing saying what they
 * select between.
 */
test('the point-of-sail and conditions chip rows are named groups', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/#/race');

  const points = page.getByRole('group', { name: 'Point of sail' });
  await expect(points).toBeVisible();
  await expect(page.getByRole('group', { name: 'Conditions' })).toBeVisible();
  // The name is on the group, so the chips inside it are still plain toggles.
  await expect(points.getByRole('button', { name: 'Close-hauled' })).toBeVisible();
});

/** M-18: Dock's regret card said its own title twice, in two type styles. */
test('the Dock regret card names itself once and keeps its landmark name', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto('/#/dock');

  const card = page.locator('.regret');
  await expect(card).toBeVisible();
  const said = ((await card.textContent()) ?? '').match(/expected regret/gi) ?? [];
  expect(said.length, 'the card title and the cell label are the same words').toBe(1);

  // Dropping the heading must not cost the section its accessible name.
  await expect(page.getByRole('region', { name: 'Expected regret' })).toBeVisible();
});

/**
 * M-15: `height: 56px` under the global `border-box` let the safe-area inset
 * eat the tab bar's content box instead of extending it, so on a notched phone
 * all five labels sat in the gesture-reserved strip and Dock's commit bar
 * floated 34 px clear of the nav.
 */
test('the tab bar grows by the safe-area inset instead of being eaten by it', async ({
  page,
  context,
}) => {
  await page.setViewportSize(PHONE);
  await page.goto('/#/dock');

  const nav = page.getByRole('navigation', { name: 'Primary' });
  await expect(nav).toBeVisible();
  const flat = (await nav.boundingBox())!.height;

  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom: 34 } });

  await expect
    .poll(async () => (await nav.boundingBox())!.height, { message: 'the bar grows by the inset' })
    .toBe(flat + 34);

  // The labels are clear of the strip iOS reserves for the home-indicator swipe.
  const label = nav.locator('a span').first();
  const l = (await label.boundingBox())!;
  expect(l.y + l.height).toBeLessThanOrEqual(PHONE.height - 34);
});
