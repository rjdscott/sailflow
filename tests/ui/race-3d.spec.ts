import { expect, test, type Page } from '@playwright/test';

/**
 * One software-rendered smoke shot of the 3D hero (ADR 0014, research 03 §7
 * tier 3). Tier 1 — the loft invariants in `src/ui/three/*.test.ts` — carries
 * the correctness; this only answers "it rendered something with the right
 * silhouette", which is the part no unit test can see.
 *
 * The shot is scoped to the hero card, not the viewport. The instrument and
 * coach panels beside it churn on every solve and are being rebuilt in
 * parallel phases; clipping to the card the 3D view owns keeps this baseline
 * about the 3D view, and there are no numbers inside the clip to churn. The
 * metrics dock is masked as well, so the intent survives if the clip ever
 * widens.
 */

const HERO = '.hero-boat';

async function openHero(page: Page, query: string): Promise<void> {
  await page.addInitScript(() => {
    try {
      // Force the 3D branch: the toggle is persisted, and a fresh profile
      // would otherwise take the default.
      localStorage.setItem('sailflow.hero.v1', '3d');
      // Frozen telltales need frozen everything else too.
      localStorage.setItem('sailflow.motion', 'off');
    } catch {
      // ignore: storage disabled, the URL params still drive the view
    }
  });
  await page.goto(`/#/race?${query}`);
  await page.waitForFunction(
    () => (window as unknown as { __sailViewReady?: boolean }).__sailViewReady === true,
    undefined,
    { timeout: 60_000 },
  );
}

test('renders the 3D hero from the leeward quarter', async ({ page }) => {
  await openHero(page, 'view=leeward&freeze=1');

  const hero = page.locator(HERO);
  await expect(hero.locator('canvas')).toBeVisible();

  // The 2D fallback must be gone, or the shot is of the wrong picture.
  await expect(hero.locator('svg[role="img"]')).toHaveCount(0);

  await expect(hero).toHaveScreenshot('race-3d-leeward.png', {
    // The committed baseline was generated inside
    // `mcr.microsoft.com/playwright:v1.62.1-noble`, the tag CI pins, so this
    // is same-image against same-image: 0.01 absorbs residual SwiftShader
    // float wobble and nothing more. Expect to regenerate on a Playwright
    // upgrade, in the docker image, with `pnpm test:ui:update`.
    maxDiffPixelRatio: 0.01,
    // Per-pixel colour tolerance, up from Playwright's 0.2. Almost every
    // differing pixel between two SwiftShader builds is an antialiased sail
    // edge landing a shade either side; this folds those in without letting a
    // genuinely different silhouette through, which the pixel ratio catches.
    threshold: 0.35,
    mask: [page.locator('.metrics-dock')],
  });
});

test('honours the ?view= preset and the hero toggle', async ({ page }) => {
  await openHero(page, 'view=top&freeze=1');
  const hero = page.locator(HERO);
  await expect(hero.getByRole('radio', { name: 'Top-down' })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  // Switching to Plan drops the canvas and puts the 2D view back, with no
  // reload: that is the fallback path every gate below it also takes.
  await hero.getByRole('radio', { name: 'Plan' }).click();
  await expect(hero.locator('canvas')).toHaveCount(0);
  await expect(hero.locator('svg[role="img"]').first()).toBeVisible();
});

test('mounts the 3D view in the phone layout, and only once', async ({ page }) => {
  // Race renders both responsive layouts and lets CSS hide one, so the hero
  // component exists twice on every screen. Exactly one of them may take a
  // WebGL context, and it has to be the visible one.
  await page.setViewportSize({ width: 390, height: 844 });
  await openHero(page, 'view=leeward&freeze=1');
  await expect(page.locator('canvas')).toHaveCount(1);
  // The desktop hero card is still in the DOM, just `display: none` — and it
  // is the copy that must not have taken the context.
  await expect(page.locator(`${HERO} canvas`)).toHaveCount(0);
});
