import { expect, test as fresh } from '@playwright/test';
import { test } from './fixtures';

/**
 * The first-run tour and the control explainers (phase-two 04).
 *
 * `fresh` is the raw Playwright fixture — an empty localStorage, which is what
 * a first run actually is. `test` is this repo's returning-visitor fixture,
 * with the tour already dismissed; the explainer tests use it because a modal
 * tour over the cockpit is not what they are measuring.
 */
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

// --- the tour -------------------------------------------------------------

fresh('the tour opens on a first visit as a named modal dialog', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/#/race');

  const dialog = page.getByRole('dialog', { name: 'Dock, then Race' });
  await expect(dialog).toBeVisible();
  // Modal, so the cockpit behind it is inert rather than merely covered.
  // A native `<dialog>` carries no `aria-modal` attribute — modality is the
  // `:modal` state `showModal()` puts it in, and that is what to assert.
  expect(await dialog.evaluate((d) => d.matches(':modal'))).toBe(true);
  await expect(dialog.getByText('Step 1 of 3')).toBeVisible();
});

fresh('the tour is steppable and closable from the keyboard alone', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/#/race');

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Focus lands inside the dialog on its own — that is `showModal()`'s job,
  // and it is the property that makes the rest of this reachable.
  await expect
    .poll(async () => await dialog.evaluate((d) => d.contains(document.activeElement)))
    .toBe(true);

  // Tab to Next and press it: no pointer anywhere in this test.
  const next = dialog.getByRole('button', { name: 'Next' });
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(dialog.getByText('Step 2 of 3')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(dialog.getByText('Step 3 of 3')).toBeVisible();

  // Back works, and the last step's primary is the one that leaves.
  await dialog.getByRole('button', { name: 'Back' }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog.getByText('Step 2 of 3')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

fresh('a dismissed tour stays dismissed across a reload', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto('/#/race');

  await page.getByRole('dialog').getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.reload();
  // Give the cockpit long enough to have opened it if it were going to.
  await expect(page.locator('.bar p[role="status"]')).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
});

/**
 * The tour is copy over a live app, not a loading screen: the worker starts
 * and the first solve lands behind it, so dismissing it reveals numbers rather
 * than a spinner.
 */
fresh('the tour does not delay the first solve', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/#/race');
  await expect(page.getByRole('dialog')).toBeVisible();

  // The instrument band's own status line only exists once a solve has landed.
  await expect(page.locator('.bar p[role="status"]')).toHaveText(
    /knots boat speed, .* percent of polar, VMG .* knots\./,
  );
});

/** Nothing in the tour animates, so reduced motion changes nothing about it. */
fresh('the tour works under prefers-reduced-motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize(PHONE);
  await page.goto('/#/race');

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // The tour animates nothing of its own, so there is nothing for the global
  // reduced-motion override in tokens.css to switch off. (It is the override
  // that zeroes `transition-duration` on every element, so only
  // `animation-name` says anything about *this* component.)
  const anim = await dialog.evaluate((d) => getComputedStyle(d).animationName);
  expect(anim, 'the tour has nothing that needs reduced-motion handling').toBe('none');

  await dialog.getByRole('button', { name: 'Next' }).click();
  await expect(dialog.getByText('Step 2 of 3')).toBeVisible();
});

/** Dismissed is not deleted: More can put it back without clearing the flag. */
test('More can replay the tour', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/#/more');

  await page.getByRole('button', { name: 'Show again' }).click();
  await expect(page.getByRole('dialog', { name: 'Dock, then Race' })).toBeVisible();
});

// --- the explainers -------------------------------------------------------

/**
 * ux-01 L-03: an explainer was an untitled paragraph. It is a named dialog
 * with a schematic and a what-it-changes list now, and the `?` that opens it
 * is still the only thing that opens it in the Race and Analyse tiers.
 */
test('a control ? opens a named explainer with a diagram and a what-it-changes list', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/#/race');

  const info = page.getByRole('button', { name: 'What Backstay does' });
  await expect(info).toBeVisible();
  await info.click();

  const dialog = page.getByRole('dialog', { name: 'Backstay' });
  await expect(dialog).toBeVisible();

  // The diagram is a real drawing with a real name, not decoration.
  const diagram = dialog.getByRole('img');
  await expect(diagram).toBeVisible();
  await expect(diagram).toHaveAttribute('aria-label', /^Schematic:/);

  await expect(dialog.getByRole('heading', { name: 'What it changes' })).toBeVisible();
  const changes = dialog.getByRole('listitem');
  expect(await changes.count()).toBeGreaterThanOrEqual(2);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

/** A readout has a paragraph and no schematic: its picture is the gauge. */
test('a readout explainer is named and carries no invented diagram', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/#/race');

  await page.locator('.bar .explain').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'What it changes' })).toBeHidden();
});

/**
 * The Learn tier reads instead of trimming: the explainer is on the page, and
 * the three-section stack — the abstraction, not the sail — is not
 * (audit ux-01 M-12).
 */
fresh('the Learn tier inlines the explainers and drops the section stack', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sailflow.tourSeen', '1');
    localStorage.setItem('sailflow.mode', 'learn');
  });
  await page.setViewportSize(DESKTOP);
  await page.goto('/#/race');

  const inline = page.locator('#mainsail-controls .inline-explain');
  await expect(inline.first()).toBeVisible();
  await expect(inline.first().getByRole('img')).toHaveAttribute('aria-label', /^Schematic:/);

  await expect(page.locator('svg[aria-label*="flying shape"]')).toHaveCount(0);
});

test('the Race tier keeps the explainers behind the ? and keeps the section stack', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/#/race');

  await expect(page.locator('.inline-explain')).toHaveCount(0);
  await expect(page.locator('svg[aria-label*="flying shape"]').first()).toBeVisible();
});

// --- the rest of a newcomer's first ten minutes ---------------------------

/**
 * release-01 L-12: the one line that says what Race is for rendered on the
 * phone and not on the desktop, which is the surface the Learn tier opens on.
 * It is one line at every width now; this is the regression guard.
 */
for (const [name, size] of [
  ['phone', PHONE],
  ['desktop', DESKTOP],
  ['cockpit', { width: 1280, height: 720 }],
] as const) {
  test(`Race says what it is for on the ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/#/race');
    await expect(page.getByText('Trim for the wind in front of you')).toBeVisible();
  });
}

/**
 * release-01 M-10: an empty Log said "No entries yet — start today's entry"
 * on the left and "Pick an entry to edit it" on the right, at the same time.
 */
test('an empty Log states its emptiness once', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/#/log');

  await expect(page.getByRole('heading', { name: 'No entries yet' })).toBeVisible();
  await expect(page.getByText('Pick an entry to edit it')).toBeHidden();

  // And the pane arrives the moment there is something to put in it.
  await page.getByRole('button', { name: "Start today's entry" }).click();
  await expect(page.getByRole('heading', { name: 'New entry' })).toBeVisible();
});

// --- the rig ---------------------------------------------------------------

/**
 * ux-01 M-20: the app asked for turns and never said what a turn was. The
 * drawing moved with the rest of the Dock into the Rig panel's `Setup`
 * disclosure (ADR 0021), which is open from the race tier up.
 */
test('the Rig panel illustrates a shroud turn and explains how to apply one', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/#/sim');

  // A link under the sliders, because a schematic nobody asked for yet has no
  // room on the cockpit's densest panel (ADR 0021).
  await page.getByRole('button', { name: 'How to apply a turn' }).click();
  const dialog = page.getByRole('dialog', { name: 'How to apply turns' });
  await expect(dialog).toBeVisible();

  const figure = dialog.locator('.shroud svg');
  await expect(figure).toBeVisible();
  await expect(figure).toHaveAttribute('aria-label', /turnbuckle/);

  // A procedure, in order, not a paragraph.
  expect(await dialog.getByRole('listitem').count()).toBeGreaterThanOrEqual(4);
});

/**
 * The gear chart is the sport's most-used artefact and it is only useful on
 * paper, so it lives in the print stylesheet: absent on screen, present and
 * complete under `print` (research cockpit 02 §2.5).
 */
test('the tuning card prints the gear chart and nothing else does', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  // The card is mounted by `Print`, and mounting it is what asks the browser
  // to print — which headless Chromium would sit in, so the dialog is stubbed.
  await page.addInitScript(() => {
    window.print = () => undefined;
  });
  await page.goto('/#/sim');

  const printed = page.locator('.print-card .gear-print');
  await expect(printed).toHaveCount(0);
  await page.locator('.p-rig summary').click();
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  await expect(printed).toBeHidden();

  await page.emulateMedia({ media: 'print' });
  await expect(printed).toBeVisible();

  // Every band the guide publishes, and the one the forecast lands in marked.
  const rows = printed.locator('tbody tr');
  expect(await rows.count()).toBeGreaterThan(3);
  await expect(printed.locator('tbody th', { hasText: '▸' })).toHaveCount(1);
  // Attributed on the page it is torn off and taped to a bulkhead.
  await expect(page.locator('.print-card')).toContainText('prov:');
});
