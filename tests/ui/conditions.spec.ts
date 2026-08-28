import { expect, test } from './fixtures';

/**
 * The conditions half of the instrument band (ADR 0021, audit ux-04 H-01,
 * M-01, M-02, M-03, M-08, M-09, L-03).
 *
 * What is worth a real viewport here is everything Vitest cannot see: that a
 * value is a control rather than a label, that a drag on a rose lands on a
 * degree, that the whole band is above the fold on a phone, and that a drill
 * shows its condition without offering it.
 */
const PHONE = { width: 390, height: 844 };
const COCKPIT = { width: 1440, height: 900 };

/** The tier the layout promises are made in, and no motion to wait out. */
async function raceTier(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('sailflow.mode', 'race');
      localStorage.setItem('sailflow.motion', 'off');
    } catch {
      // ignore: storage disabled, the default tier is already 'race'
    }
  });
}

/**
 * H-01. The one input that changes every number on the screen used to be a
 * 28 px chip rail at the far edge of the header, four of its five values inert
 * `<span>`s behind a button labelled `Edit`. Every value is a control now, and
 * it is drawn with the same cell contract as the boat's numbers beside it.
 */
test('every conditions value is a control, in the band, with the boat half beside it', async ({
  page,
}) => {
  await raceTier(page);
  await page.setViewportSize(COCKPIT);
  await page.goto('/#/race');

  const band = page.locator('.cockpit > .bar');
  const conditions = band.getByRole('group', { name: 'Conditions' });
  await expect(conditions).toBeVisible();
  // The `Edit` button and its sheet are gone with `ConditionsStrip`.
  await expect(band.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);

  for (const label of ['TWS', 'TWA', 'SEA', 'CREW', 'SAIL']) {
    await expect(conditions.getByRole('button', { name: label, exact: true })).toBeVisible();
  }

  // Same cell contract both halves: every cell's label is the `?` explainer.
  const boat = band.getByRole('group', { name: 'Boat' });
  expect(await boat.locator('.explain').count()).toBeGreaterThan(2);
  expect(await conditions.locator('.explain').count()).toBe(5);

  // …and the explainers open the same sheet.
  await conditions.getByRole('button', { name: 'SEA', exact: true }).click();
  const sheet = page.locator('dialog[open]');
  await expect(sheet.getByRole('heading', { name: 'Sea state' })).toBeVisible();
  await expect(sheet.getByText(/added resistance/i)).toBeVisible();
});

/** The steppers write straight to the condition the whole screen solves for. */
test('the wind speed and crew steppers move the condition and the boat answers', async ({
  page,
}) => {
  await raceTier(page);
  await page.setViewportSize(COCKPIT);
  await page.goto('/#/race');

  const tws = page.locator('.cond.tws .value');
  await expect(tws).toHaveText(/^10/);
  await page.getByRole('button', { name: 'Wind speed up one knot' }).click();
  await expect(tws).toHaveText(/^11/);

  const crew = page.locator('.conditions').getByLabel('CREW:');
  await page.getByRole('button', { name: /Crew weight up one/ }).click();
  await expect(crew).toHaveCount(0); // crew is a plain readout, not a trigger
  await expect(page.getByRole('group', { name: 'Conditions' }).getByText('305')).toBeVisible();
});

/** M-08. Sailors think in arrows: the TWA cell is a rose you drag. */
test('the wind rose is a slider you can drag and drive from the keyboard', async ({ page }) => {
  await raceTier(page);
  await page.setViewportSize(COCKPIT);
  await page.goto('/#/race');

  const rose = page.getByRole('slider', { name: 'True wind angle' });
  await expect(rose).toHaveAttribute('aria-valuenow', '42');

  await rose.focus();
  await page.keyboard.press('ArrowRight');
  await expect(rose).toHaveAttribute('aria-valuenow', '43');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(rose).toHaveAttribute('aria-valuenow', '48');
  await page.keyboard.press('ArrowLeft');
  await expect(rose).toHaveAttribute('aria-valuenow', '47');

  // Drag to dead astern: the box is a protractor, so straight down is 180°.
  const box = (await rose.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 3, { steps: 5 });
  await page.mouse.up();
  // Dead astern, give or take the sub-pixel offset of the box's own centre.
  await expect(rose).toHaveAttribute('aria-valuenow', /^(178|179|180)$/);
  await expect(page.locator('.cond.twa .value')).toHaveText(/^1(78|79|80)/);
});

/**
 * M-02. The chips are presets for the angle: one is pressed while the angle is
 * in its band, and none is once the rose has been dragged out of every band.
 */
test('the point-of-sail chips deselect when the angle leaves their band', async ({ page }) => {
  await raceTier(page);
  await page.setViewportSize(COCKPIT);
  await page.goto('/#/race');

  const chips = page.getByRole('group', { name: 'Point of sail' });
  const beam = chips.getByRole('button', { name: 'Beam reach' });
  await beam.click();
  await expect(beam).toHaveAttribute('aria-pressed', 'true');

  const rose = page.getByRole('slider', { name: 'True wind angle' });
  await rose.focus();
  // 90° → 120°: out of the beam-reach band, into the broad reach's.
  for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowRight');
  await expect(rose).toHaveAttribute('aria-valuenow', '120');
  await expect(beam).toHaveAttribute('aria-pressed', 'false');
  await expect(chips.getByRole('button', { name: 'Broad reach' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // Inside the luffing angle nothing is a point of sail, so nothing is pressed.
  await page.keyboard.press('Home');
  await expect(rose).toHaveAttribute('aria-valuenow', '20');
  expect(await chips.locator('button[aria-pressed="true"]').count()).toBe(0);
});

/** The sea state popover: five options, light-dismissed, no sheet. */
test('sea state opens a segmented popover on the value itself', async ({ page }) => {
  await raceTier(page);
  await page.setViewportSize(COCKPIT);
  await page.goto('/#/race');

  const trigger = page.getByRole('button', { name: 'SEA: Ripple' });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();

  const pop = page.getByRole('radiogroup', { name: 'Sea state' });
  await expect(pop).toBeVisible();
  await pop.getByRole('radio', { name: 'Chop' }).click();

  await expect(page.getByRole('button', { name: 'SEA: Chop' })).toBeVisible();
  await expect(pop).toHaveCount(0);
});

/**
 * M-03. The presets set the wind *and* rewrite all eleven trim controls, so
 * they left the conditions surface for the actions bar, and every item says so.
 */
test('the presets live in the actions bar and say they move the trim too', async ({ page }) => {
  await raceTier(page);
  await page.setViewportSize(COCKPIT);
  await page.goto('/#/race');

  const menu = page.getByRole('button', { name: /Start from/ });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();

  const items = page.getByRole('group', { name: 'Start from' });
  for (const label of ['Light day', 'Medium day', 'Heavy day', 'Downwind']) {
    await expect(items.getByRole('button', { name: `${label} — wind + trim` })).toBeVisible();
  }

  await items.getByRole('button', { name: /Heavy day/ }).click();
  await expect(page.locator('.cond.tws .value')).toHaveText(/^18/);
  // …and the way back to the trim it overwrote is one press, as it was.
  await expect(page.getByRole('button', { name: 'Back to my trim' })).toBeVisible();
});

/**
 * The phone's whole point: the band — both halves — is above the fold on a
 * cold load with the tour skipped, and every control in it is a 44 px target.
 */
test('at 390 the whole band is above the fold and every control is thumb-sized', async ({
  page,
}) => {
  await raceTier(page);
  await page.setViewportSize(PHONE);
  await page.goto('/#/race');
  await expect(page.getByRole('group', { name: 'Conditions' })).toBeVisible();

  const bar = await page.locator('.cockpit > .bar').boundingBox();
  expect(bar!.y + bar!.height, 'the band must fit a 390x844 screen').toBeLessThan(PHONE.height);

  const small = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(
      '.conditions button, .conditions [role="slider"]',
    )) {
      const r = el.getBoundingClientRect();
      // `.hit-44` paints small and grows the hit area with a pseudo-element,
      // so the painted box of a chip is allowed to be shorter than 44. The
      // rose is the one control whose whole face is the target, so it is
      // measured both ways.
      const hit = el.classList.contains('hit-44')
        ? 44
        : Math.round(el.getAttribute('role') === 'slider' ? Math.min(r.width, r.height) : r.height);
      if (hit < 44) out.push(`${el.textContent?.trim() || el.getAttribute('aria-label')}: ${hit}`);
    }
    return out;
  });
  expect(small, 'every conditions control is a 44 px target on a phone').toEqual([]);
});

/**
 * A drill sets its own condition: the right half shows it, locked, and says so
 * rather than offering five controls that would change the question.
 */
test('a drill shows the conditions read-only, with the reason', async ({ page }) => {
  await raceTier(page);
  await page.setViewportSize(COCKPIT);
  await page.goto('/#/drills');
  await page.locator('button.drill').first().click();

  const conditions = page.locator('section.bar').getByRole('group', { name: 'Conditions' });
  await expect(conditions).toBeVisible();
  await expect(conditions.getByText('The drill sets the wind.')).toBeVisible();

  expect(await conditions.getByRole('button').count(), 'only the five `?` labels').toBe(5);
  await expect(conditions.getByRole('slider')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Point of sail' })).toHaveCount(0);
});
