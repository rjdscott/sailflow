import { expect, test, type Page } from '@playwright/test';

/**
 * The phone-performance gates from phase-two phase 06 — the four ux-03 P2
 * findings that a unit test cannot see, because each of them is about what the
 * *browser* does: how many GL contexts it is holding, which chunks it fetched,
 * how many buffers a drag churned, and what is above the fold at 390 px.
 *
 * Every one of these fails against the code as it was before the phase: the
 * measured baselines are in the phase's progress log.
 */

const PHONE = { width: 390, height: 844 };

/** The tier the phone first-screen promise is made in. */
async function raceTier(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('sailflow.mode', 'race');
      localStorage.setItem('sailflow.motion', 'off');
    } catch {
      // storage disabled: the defaults are already what this wants
    }
  });
}

/** Forces the 3D branch: the hero toggle is persisted and phones default to plan. */
async function force3d(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('sailflow.hero.v1', '3d');
    } catch {
      // storage disabled: the toggle in the hero head still reaches it
    }
  });
}

async function heroReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as unknown as { __sailViewReady?: boolean }).__sailViewReady === true,
    undefined,
    { timeout: 60_000 },
  );
}

/**
 * Counts WebGL contexts created and lost. `made - lost` is what the browser is
 * still holding, against a ceiling of about sixteen — which is the number
 * ux-03 M-21 is about, not the count of contexts ever made.
 */
type GlCount = { made: number; lost: number };

async function countContexts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __gl?: GlCount };
    w.__gl = { made: 0, lost: 0 };
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      id: string,
      ...rest: unknown[]
    ) {
      const ctx = (get as never as (...a: unknown[]) => unknown).call(this, id, ...rest);
      if (ctx && id.startsWith('webgl')) {
        w.__gl!.made++;
        this.addEventListener('webglcontextlost', () => w.__gl!.lost++);
      }
      return ctx as never;
    } as never;
  });
}

const readGl = (page: Page): Promise<GlCount> =>
  page.evaluate(() => ({ ...(window as never as { __gl: GlCount }).__gl }));

test('five Race visits leave no WebGL context behind', async ({ page }) => {
  await raceTier(page);
  await force3d(page);
  await countContexts(page);
  await page.goto('/#/race');
  await heroReady(page);

  const first = await readGl(page);
  // One renderer plus the one-shot `hasWebGL()` probe — the probe is memoised
  // at module level, so it is not paid again on any later mount.
  expect(first.made - first.lost).toBeLessThanOrEqual(2);

  for (let i = 0; i < 5; i++) {
    await page.getByRole('link', { name: 'Dock', exact: true }).click();
    await expect(page.locator('.hero-boat')).toHaveCount(0);
    await page.getByRole('link', { name: 'Race', exact: true }).click();
    await heroReady(page);
  }

  const after = await readGl(page);
  // Every visit takes one context and hands it back on unmount, so what the
  // browser holds is flat. Before the fix this was +2 a visit and 0 released:
  // 12 live contexts by here, and `webglcontextlost` firing from visit 17.
  expect(after.made).toBeGreaterThan(first.made); // the loop really did remount
  expect(after.made - after.lost).toBeLessThanOrEqual(first.made - first.lost);
});

test('a phone does not fetch the three.js chunk until it is asked for', async ({ page }) => {
  await raceTier(page);
  await page.setViewportSize(PHONE);
  const chunks: string[] = [];
  page.on('request', (r) => {
    if (/SailView3D/.test(r.url())) chunks.push(r.url());
  });

  await page.goto('/#/race');
  // The plan view is the picture, and it is drawn.
  await expect(page.locator('.hero-boat svg').first()).toBeVisible();
  await page.waitForTimeout(1500);
  expect(chunks).toHaveLength(0);

  // Asking for it fetches it: the saving is a default, not a restriction.
  await page.getByRole('radio', { name: '3D', exact: true }).click();
  await heroReady(page);
  expect(chunks.length).toBeGreaterThan(0);
});

test('the desktop hero is unchanged: 3D on first load', async ({ page }) => {
  await raceTier(page);
  const chunks: string[] = [];
  page.on('request', (r) => {
    if (/SailView3D/.test(r.url())) chunks.push(r.url());
  });
  await page.goto('/#/race');
  await heroReady(page);
  expect(chunks.length).toBeGreaterThan(0);
  await expect(page.locator('.hero-boat canvas')).toBeVisible();
});

test('a slider drag reuses the hero geometry instead of rebuilding it', async ({ page }) => {
  await raceTier(page);
  await force3d(page);
  await page.addInitScript(() => {
    const w = window as unknown as { __buf?: { create: number; del: number } };
    w.__buf = { create: 0, del: 0 };
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      const create = proto.createBuffer;
      const del = proto.deleteBuffer;
      proto.createBuffer = function (this: WebGLRenderingContext) {
        w.__buf!.create++;
        return create.call(this);
      };
      proto.deleteBuffer = function (this: WebGLRenderingContext, b: WebGLBuffer | null) {
        w.__buf!.del++;
        return del.call(this, b);
      };
    }
  });
  await page.goto('/#/race');
  await heroReady(page);
  await page.waitForTimeout(500);

  const read = (): Promise<{ create: number; del: number }> =>
    page.evaluate(() => ({ ...(window as never as { __buf: { create: number; del: number } }).__buf }));
  const before = await read();

  const slider = page.locator('input[type="range"]').first();
  const start = await slider.inputValue();
  for (let i = 0; i < 20; i++) {
    await slider.evaluate((el: HTMLInputElement) => {
      el.value = String(Number(el.value) + Number(el.step || 1));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(500);
  expect(await slider.inputValue()).not.toBe(start); // the drag really moved

  const after = await read();
  // The whole scene is written in place: sails, lines, telltales, and the two
  // spars are skipped entirely when their points did not move. Before the fix
  // the same drag created and destroyed 300 buffers.
  expect(after.create - before.create).toBe(0);
  expect(after.del - before.del).toBe(0);
});

test('the phone first screen is the hero and the panel strip, not the chrome', async ({ page }) => {
  await raceTier(page);
  await page.setViewportSize(PHONE);
  await page.goto('/#/race');
  await expect(page.locator('.hero-boat svg').first()).toBeVisible();
  await page.waitForTimeout(500);

  const m = await page.evaluate(() => {
    const rect = (s: string): { top: number; bottom: number } | null => {
      const r = document.querySelector(s)?.getBoundingClientRect();
      return r ? { top: r.top, bottom: r.bottom } : null;
    };
    return {
      viewport: window.innerHeight,
      scrollY: window.scrollY,
      head: rect('.head'),
      hero: rect('.hero-boat'),
      tabs: rect('.tabs'),
    };
  });

  expect(m.scrollY).toBe(0);
  // The chrome above the picture: title, point-of-sail chips, wind stepper and
  // Edit. It was 302 px of an 844 px screen before the collapse (ux-03 M-20).
  expect(m.head!.bottom).toBeLessThan(220);
  // The whole picture is on the first screen, above the panel strip — which
  // is sticky, so it is at the fold by construction and the assertion worth
  // making about it is that the hero clears it rather than scrolls under it.
  expect(m.hero!.bottom).toBeLessThan(m.tabs!.top);
  // And the strip itself is clear of the 56 px shell tab bar below it.
  expect(m.tabs!.bottom).toBeLessThan(m.viewport - 56);
});
