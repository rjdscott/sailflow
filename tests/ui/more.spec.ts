import { expect, test } from './fixtures';

/**
 * ux-03 M-23. PROVENANCE.md, ASSUMPTIONS.md and validation/report.md left the
 * first-load chunk for a per-document `await import('...?raw')`, and More
 * itself left it for a dynamic import. Both are invisible to Vitest — they are
 * about what a real build fetches when a real click happens — and both fail
 * silently in the same way: the sheet opens and never fills.
 */
test('each honesty document loads into the sheet when it is asked for', async ({ page }) => {
  // The screen is a chunk now, so reaching it at all is half the assertion.
  await page.goto('/#/more');
  await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();

  for (const [title, opening] of [
    ['Provenance', '# Provenance'],
    ['Assumptions', '# Assumptions'],
    ['Validation report', '# Validation report'],
  ] as const) {
    await page.getByRole('button', { name: `${title} — read here` }).click();

    const sheet = page.locator('dialog[open]');
    await expect(sheet.locator('h2')).toHaveText(title);
    // The chunk is in flight: a loading line, never an empty sheet.
    await expect(sheet.locator('.doc, .doc-loading')).toBeVisible();

    const doc = sheet.locator('pre.doc');
    await expect(doc).toBeVisible();
    await expect(doc).toContainText(opening);

    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
  }
});
