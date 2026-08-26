import { expect, test } from './fixtures';

/**
 * Layout smoke for the component gallery. Kit puts every primitive on one
 * page, so it is where a control that cannot shrink shows up first — as a
 * horizontal scrollbar on the document.
 *
 * `?kit=1` opts the route into a production build (see KIT_ENABLED in
 * src/ui/router.svelte.ts); it is dev-only without it.
 *
 * Only horizontal overflow is asserted. Kit is a long gallery, so vertical
 * scroll is the point, not a bug.
 */
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
];

for (const viewport of VIEWPORTS) {
  test(`kit fits ${viewport.width}x${viewport.height} with no horizontal scroll`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/?kit=1#/kit');

    await expect(page.getByRole('heading', { name: 'Kit', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Layout primitives' })).toBeVisible();

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);
  });
}
