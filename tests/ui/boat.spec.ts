import type { Page } from '@playwright/test';
import { asReturningVisitor, expect, settled, test } from './fixtures';

/**
 * The second class, end to end (ADR 0020).
 *
 * Vitest proves the registry validates every committed boat and that the share
 * codec snaps a link's values to the stops of the class the link names. Only a
 * browser can prove the part that actually blocked registration: that the
 * *cockpit* takes the active boat. Every one of these assertions failed before
 * the thirteen UI files stopped importing `data/boats/j70.json` by path — the
 * physics and the share links were already right, and the sliders lied.
 *
 * Two contexts, never two pages in one: `localStorage` carries the chosen
 * class, so a second page in the same context would inherit the switch and a
 * link that carried no class at all would pass.
 */

async function fresh(browser: import('@playwright/test').Browser) {
  const context = await browser.newContext();
  await asReturningVisitor(context);
  const page = await context.newPage();
  return { context, page };
}

/**
 * Crew-weight bounds, which are class limits and differ between the two. Crew
 * weight is a stepper on the instrument band now rather than a slider (ADR
 * 0021), so the limits are read off the name its `role="group"` carries —
 * which is also the only place a screen reader can hear them.
 */
async function crewRange(page: Page): Promise<{ min: string | null; max: string | null }> {
  // The band mounts on the first solve, and under a full parallel run on this
  // machine that took longer than the 5 s default this used to wait (phase 04
  // progress log). `settled` is the suite's one definition of "the Simulator
  // has stopped changing on its own", and it waits 30 s for the solver.
  await settled(page);
  const crew = page.getByRole('group', { name: /^Crew weight,/ });
  await expect(crew).toBeVisible();
  const label = (await crew.getAttribute('aria-label')) ?? '';
  const [min, max] = label.match(/\d+/g) ?? [];
  return { min: min ?? null, max: max ?? null };
}

test('the picker offers the second class, and switching reloads into its own numbers', async ({
  page,
}) => {
  // Before the switch: the default class's crew limits, off its own boat file.
  await page.goto('/#/race');
  const j70Crew = await crewRange(page);
  expect(j70Crew).toEqual({ min: '255', max: '340' });

  await page.goto('/#/more');
  const picker = page.getByRole('radiogroup', { name: 'Boat class' });
  await expect(picker).toBeVisible();
  await expect(picker.getByRole('radio', { name: 'J/70' })).toBeVisible();
  await expect(picker.getByRole('radio', { name: 'Melges 24' })).toBeVisible();

  await picker.getByRole('radio', { name: 'Melges 24' }).click();
  // The switch reloads (`More.svelte`, marked `ponytail:`), so wait for the
  // picker to come back on the new class rather than for a transition.
  await expect(page.getByRole('radio', { name: 'Melges 24' })).toBeChecked();

  // After the switch: the Melges 24's crew limits, from `data/boats/m24.json`.
  // 350 kg is the ORC certificate's crew weight; 262 is 0.75 of it, the
  // documented assumption for a class that publishes no crew weight limit.
  await page.goto('/#/race');
  const m24Crew = await crewRange(page);
  expect(m24Crew).toEqual({ min: '262', max: '350' });
});

test('a share link naming the second class opens on it in a cold context', async ({ browser }) => {
  const sender = await fresh(browser);
  const receiver = await fresh(browser);

  try {
    await sender.page.goto('/#/more');
    await sender.page
      .getByRole('radiogroup', { name: 'Boat class' })
      .getByRole('radio', { name: 'Melges 24' })
      .click();
    await expect(sender.page.getByRole('radio', { name: 'Melges 24' })).toBeChecked();

    await sender.page.goto('/#/race');
    await settled(sender.page);

    // The router writes the trim into the URL as it changes; the link is
    // whatever is in the address bar (ADR 0019, phase 02).
    await sender.page.getByRole('button', { name: 'Wind speed up one knot' }).click();
    await expect.poll(() => sender.page.url()).toContain('boat=m24');
    const link = sender.page.url();

    // A cold browser: no localStorage, so the class can only come off the link.
    await receiver.page.goto(link);
    const crew = await crewRange(receiver.page);
    expect(crew).toEqual({ min: '262', max: '350' });

    // And the receiver's own settings now say so, so a reload keeps the class.
    await receiver.page.goto('/#/more');
    await expect(receiver.page.getByRole('radio', { name: 'Melges 24' })).toBeChecked();
  } finally {
    await sender.context.close();
    await receiver.context.close();
  }
});

test('a class with no committed tuning guide says so instead of quoting another one', async ({
  page,
}) => {
  await page.goto('/#/more');
  await page
    .getByRole('radiogroup', { name: 'Boat class' })
    .getByRole('radio', { name: 'Melges 24' })
    .click();
  await expect(page.getByRole('radio', { name: 'Melges 24' })).toBeChecked();

  await page.goto('/#/sim');
  // Phase 03's third state. The failure this guards is the opposite of a
  // blank: the panel quietly comparing a Melges 24 against North's J/70
  // shroud turns, which is the "resolve the disagreement silently" failure
  // CLAUDE.md forbids.
  // Three places say it, which is the point: the disagreement panel's verdict
  // and the hint under each shroud slider on the Rig panel, whose guide tick
  // would otherwise be an invented number.
  const said = page.getByText(/No tuning guide is committed for this boat/);
  await expect(said).toHaveCount(3);
  await expect(said.first()).toBeVisible();
  await expect(page.getByText('data/tuning/*-m24.json')).toBeVisible();
});

test('a class with no drill templates says so rather than showing an empty page', async ({
  page,
}) => {
  await page.goto('/#/more');
  await page
    .getByRole('radiogroup', { name: 'Boat class' })
    .getByRole('radio', { name: 'Melges 24' })
    .click();
  await expect(page.getByRole('radio', { name: 'Melges 24' })).toBeChecked();

  await page.goto('/#/drills');
  await expect(page.getByText(/No drills are committed for the Melges 24/)).toBeVisible();
});
