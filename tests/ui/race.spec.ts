import { expect, test, type Page } from '@playwright/test';

/**
 * Layout smoke for the cockpit. From ADR 0016 the cockpit sizes to its content
 * and the *page* scrolls: no panel scrolls inside itself, and every control and
 * gauge is on the page at full size. The four panels each carry a control
 * column, a picture and an instrument rail — exactly the arrangement that
 * pushes a card past its column, or hides a slider behind an ancestor's
 * `overflow`. Vitest cannot see either; a real viewport can.
 */
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
];

/** The sizes ADR 0016 makes first-class, plus the floor of the desktop grid. */
const DESKTOP = [
  { width: 1280, height: 720 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
];

const PHONE = { width: 390, height: 844 };

/** The tier the one-screen promise is made in. Learn and Analyse may scroll. */
async function raceTier(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('sailflow.mode', 'race');
      localStorage.setItem('sailflow.motion', 'off');
    } catch {
      // ignore: storage disabled, the default tier is already 'race'
    }
  });
}

/** The hero has drawn something — the 3D canvas, or the plan view it falls
 *  back to. Either way the cell it sits in now has its real height. */
async function heroDrawn(page: Page): Promise<void> {
  await expect(page.locator('.hero-boat canvas, .hero-boat svg[role="img"]').first()).toBeVisible();
}

/**
 * Every band the grid sizes off has stopped growing: the hero has drawn, and
 * the optimum has landed, which is what puts the "to optimum" line under three
 * instrument cells and settles the bar's height. Measure after this, or you
 * measure a layout that is one solve out of date.
 */
async function settled(page: Page): Promise<void> {
  await heroDrawn(page);
  await expect(page.getByRole('button', { name: /Apply optimum/ })).toBeEnabled();
}

/**
 * (a) The page scrolls down, never sideways. A cockpit column that cannot hold
 * a slider row pushes the whole grid past the window, and the symptom is a
 * horizontal scrollbar rather than anything obviously broken.
 */
for (const viewport of DESKTOP) {
  test(`the cockpit has no horizontal scroll at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await raceTier(page);
    await page.setViewportSize(viewport);
    await page.goto('/#/race');

    await expect(page.getByRole('heading', { name: 'Mainsail' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Headsail' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Helm & conditions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rig', exact: true })).toBeVisible();
    await settled(page);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);
  });
}

/**
 * (b) ADR 0016's strong property, replacing ADR 0015's "no page scroll" proxy:
 * nothing in the cockpit is hidden. Every control, every button and every
 * drawing has a real box, and no ancestor with an `overflow` other than
 * `visible` cuts it off — which is what the four panel scrollers used to do to
 * 54–81 % of each panel with no affordance (audit ux-03 M-01), and what
 * silently rendered every sail drawing in a 0 px box (H-01). The one allowed
 * scroller is the Rig gear chart's `.scroller`, which scrolls a wide table
 * sideways on purpose, plus anything inside an open `dialog` (the sheets).
 */
for (const viewport of DESKTOP) {
  test(`nothing in the cockpit is clipped or collapsed at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await raceTier(page);
    await page.setViewportSize(viewport);
    await page.goto('/#/race');
    await settled(page);

    const hidden = await page.evaluate(() => {
      const out: string[] = [];
      const targets = document.querySelectorAll<HTMLElement>(
        '.cockpit input[type="range"], .cockpit button, .cockpit svg[role="img"], .cockpit canvas',
      );
      for (const el of targets) {
        if (!el.checkVisibility({ visibilityProperty: true })) continue;
        if (el.closest('dialog, .scroller')) continue;
        const name = (el.getAttribute('aria-label') ?? el.className ?? el.tagName).toString();
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) {
          out.push(`${name}: collapsed to ${Math.round(r.width)}x${Math.round(r.height)}`);
          continue;
        }
        for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
          if (p.matches('dialog, .scroller')) break;
          const style = getComputedStyle(p);
          if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
          const box = p.getBoundingClientRect();
          if (
            r.top < box.top - 1 ||
            r.bottom > box.bottom + 1 ||
            r.left < box.left - 1 ||
            r.right > box.right + 1
          ) {
            out.push(`${name}: clipped by .${p.className || p.tagName}`);
            break;
          }
        }
      }
      return out;
    });

    expect(hidden, 'no cockpit control, button or drawing may be clipped away').toEqual([]);

    // …and no panel body is a scroller with content below its own fold.
    const scrollers = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.cockpit .panel *')]
        .filter((el) => {
          const style = getComputedStyle(el);
          const scrolls = style.overflowY === 'auto' || style.overflowY === 'scroll';
          return scrolls && el.scrollHeight > el.clientHeight + 1;
        })
        .map((el) => el.className),
    );
    expect(scrollers, 'no panel may hide its content behind an internal scroll').toEqual([]);
  });
}

/**
 * (c) The 1920×1080 monitor ADR 0016 makes a first-class target. The hero is
 * ≥ 480 px tall and the whole cockpit is within one short scroll.
 *
 * ADR 0016 aimed at "the document fits 1080". It does not: measured 1384 px,
 * against 1959 px for the same content with the panel scrollers removed and
 * nothing else changed, and 1160 px for a variant whose control names measured
 * 0 px wide. What remains is the title rail, the instrument band and the
 * actions band — ~290 px of full-width chrome around a 1048 px block of hero
 * and panels — so closing the gap means moving content, not CSS. See the phase
 * 01 progress log in `docs/plans/2026-08-25-desktop-kite/`. The bound is pinned
 * so a regression that puts the panels back into a tower fails here.
 */
test('at 1920x1080 the cockpit is one short scroll and the hero is worth looking at', async ({
  page,
}) => {
  await raceTier(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/#/race');
  await settled(page);

  const hero = await page.locator('.hero-boat').boundingBox();
  expect(hero?.height ?? 0, 'ADR 0016: the hero is at least 480 px tall').toBeGreaterThanOrEqual(
    480,
  );

  const doc = await page.evaluate(() => document.documentElement.scrollHeight);
  // 1522 measured: instrument bar, actions strip and a 768 × 1112 hero
  // with two-column panels beside it. Apply optimum is above the fold; the
  // Helm/Rig row and the disagreement strip are the short scroll.
  expect(
    doc,
    'the cockpit must stay within one short scroll of a 1080 px window',
  ).toBeLessThanOrEqual(1600);
});

/**
 * (d) The 14" laptop, the other first-class size: the instrument band, the hero
 * and both sail panels' first controls are in the first viewport, and the rest
 * is one scroll away.
 */
test('at 1536x864 the band, the hero and the first sail controls are in the first viewport', async ({
  page,
}) => {
  await raceTier(page);
  await page.setViewportSize({ width: 1536, height: 864 });
  await page.goto('/#/race');
  await settled(page);

  await expect(page.locator('.cockpit > .bar')).toBeInViewport();
  await expect(page.locator('.hero-boat')).toBeInViewport();

  for (const panel of ['.p-main', '.p-jib']) {
    const box = await page.locator(`${panel} input[type="range"]`).first().boundingBox();
    expect(box, `${panel} must have a first slider`).not.toBeNull();
    expect(box!.y, `${panel}'s first control starts on the first screen`).toBeGreaterThanOrEqual(0);
    expect(
      box!.y + box!.height,
      `${panel}'s first control fits the first screen`,
    ).toBeLessThanOrEqual(864);
  }
});

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

/** `h` and `r` joined `m` and `j` with the Helm and Rig panels (phase 06). */
test('the keyboard reaches every panel', async ({ page }) => {
  await raceTier(page);
  await page.setViewportSize(VIEWPORTS[0]);
  await page.goto('/#/race');
  await expect(page.getByRole('heading', { name: 'Rig', exact: true })).toBeVisible();

  for (const [key, id] of [
    ['m', 'mainsail-controls'],
    ['j', 'headsail-controls'],
    ['h', 'helm-controls'],
    ['r', 'rig-controls'],
  ]) {
    await page.keyboard.press(key);
    const landed = await page.evaluate(
      (controls) => !!document.activeElement?.closest(`#${controls}`),
      id,
    );
    expect(landed, `${key} should focus a control inside #${id}`).toBe(true);
  }
});

/**
 * The Headsail slot carries whichever sail is up (desktop-kite phase 03).
 * Under the kite it is the Gennaker panel — four downwind sliders — and it
 * keeps the `headsail` ids, so `j` still lands in it.
 */
test('choosing Run swaps the Headsail panel for the Gennaker, and Close-hauled swaps it back', async ({
  page,
}) => {
  await raceTier(page);
  await page.setViewportSize(VIEWPORTS[1]);
  await page.goto('/#/race');
  await expect(page.getByRole('heading', { name: 'Headsail' })).toBeVisible();

  await page.getByRole('button', { name: 'Run' }).click();

  await expect(page.getByRole('heading', { name: 'Gennaker' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Headsail' })).toHaveCount(0);

  const sliders = page.locator('#headsail-controls input[type="range"]');
  await expect(sliders).toHaveCount(4);
  for (const label of ['Gennaker sheet', 'Tack line', 'Gennaker halyard', 'Bowsprit position']) {
    await expect(
      page.locator('#headsail-controls').getByRole('slider', { name: label, exact: true }),
    ).toBeVisible();
  }

  // The `j` jump does not know which sail is up, and must not have to.
  await page.keyboard.press('j');
  const onFirst = await page.evaluate(
    () => document.activeElement === document.querySelector('#headsail-controls input'),
  );
  expect(onFirst, 'j should focus the first kite slider').toBe(true);

  await page.getByRole('button', { name: 'Close-hauled' }).click();
  await expect(page.getByRole('heading', { name: 'Headsail' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Gennaker' })).toHaveCount(0);
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

/**
 * Phone: hero first, then the same four panels stacked, with a sticky strip
 * that is the only way back up the stack that does not cost a flick (phase 06).
 */
test('the phone stacks the cockpit with no horizontal scroll and a sticky panel strip', async ({
  page,
}) => {
  await raceTier(page);
  await page.setViewportSize(PHONE);
  await page.goto('/#/race');
  await heroDrawn(page);

  const strip = page.getByRole('navigation', { name: 'Cockpit panels' });
  await expect(strip).toBeVisible();

  // Hero first (plan README, audit ux-03 H-11): on the first screen before any
  // scroll, and above the instrument band rather than 1045 px under it.
  const hero = page.locator('.hero-boat');
  const heroTop = await hero.evaluate((el) => el.getBoundingClientRect().top);
  expect(heroTop).toBeGreaterThanOrEqual(0);
  expect(heroTop).toBeLessThan(PHONE.height);
  await expect(hero).toBeInViewport();

  // …and the tab strip comes right after it, still above the band.
  const stripTop = await strip.evaluate((el) => el.getBoundingClientRect().top);
  const barTop = await page
    .locator('.cockpit > .bar')
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(stripTop).toBeGreaterThan(heroTop);
  expect(barTop).toBeGreaterThan(stripTop);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);

  // Sticky: 600 px down the stack it is still on screen, and once the stack
  // has scrolled past it, it is pinned to the top rather than gone.
  await page.mouse.wheel(0, 600);
  await expect(strip).toBeInViewport();
  await page.mouse.wheel(0, 1200);
  await expect(strip).toBeInViewport();
  const top = await strip.evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeLessThan(8);

  // And it takes you to a panel: tap Rig, and the Rig heading is on screen.
  await strip.getByRole('button', { name: 'Rig' }).click();
  await expect(page.getByRole('heading', { name: 'Rig', exact: true })).toBeInViewport();
});

/** The band is four readings wide on a phone until you ask for the rest. */
test('the phone instrument band keeps four readings and hides the rest behind More', async ({
  page,
}) => {
  await raceTier(page);
  await page.setViewportSize(PHONE);
  await page.goto('/#/race');

  // The readings, not the whole band: the verdict sentence names the metric it
  // is about, so a bare text match on the band is two elements whenever the
  // coach happens to say "VMG".
  const bar = page.locator('.bar');
  const readings = bar.locator('.cells, .gauges');
  await expect(readings.getByText('BSP')).toBeVisible();
  await expect(readings.getByText('%POLAR')).toBeVisible();
  await expect(readings.getByText('VMG')).toBeVisible();
  await expect(readings.getByText('HEEL')).toBeVisible();
  await expect(readings.getByText('TWA')).toBeHidden();

  await bar.getByRole('button', { name: 'More' }).click();
  await expect(readings.getByText('TWA')).toBeVisible();
});

/**
 * ux-03 H-01. `.panel > .grid` scrolls itself in the cockpit, and an auto row
 * track inside an overflow container resolved the visual's row to zero: every
 * sail-shape drawing rendered in a 0 px box while its SVG children measured
 * full size, so every test that queried the SVG passed. Measure the box.
 */
for (const viewport of VIEWPORTS) {
  test(`every cockpit panel draws its sail shape at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await raceTier(page);
    await page.setViewportSize(viewport);
    await page.goto('/#/race');
    await heroDrawn(page);

    for (const panel of ['.p-main', '.p-jib', '.p-rig']) {
      const box = await page.locator(`${panel} .visual`).boundingBox();
      expect(box?.height ?? 0, `${panel} .visual should be a real box`).toBeGreaterThan(100);
    }
  });
}

/**
 * ux-03 H-02. The band switched to its one-line desktop layout on a viewport
 * query, but on Drills it is mounted in the ~500 px secondary column, where
 * that layout threw the verdict and two gauges outside its own
 * `overflow: hidden`. It sizes off its own container now.
 */
test('the instrument band stays inside its column on Drills at desktop widths', async ({
  page,
}) => {
  await raceTier(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/drills');
  await page.locator('button.drill').first().click();

  const bar = page.locator('section.bar');
  await expect(bar).toBeVisible();
  await expect(bar.locator('.verdict')).toBeVisible();

  const clipped = await bar.evaluate((el) => {
    const right = el.getBoundingClientRect().right;
    return [...el.querySelectorAll<HTMLElement>('.cells, .gauges, .verdict')]
      .filter((child) => child.getBoundingClientRect().right > right + 1)
      .map((child) => child.className);
  });
  expect(clipped, 'no band child may spill past the band').toEqual([]);
  expect(await bar.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
});

/**
 * ux-03 H-03. The full comparison is ~1250 px tall and the cockpit's bottom
 * band is ~160: 87 % of it was clipped away with no scrollbar, so the app
 * asserted a disagreement and withheld every number and delta. The summary is
 * inline, the table is in the sheet, and both are reachable.
 */
test('the cockpit shows the model-vs-guides summary inline and the table in a sheet', async ({
  page,
}) => {
  await raceTier(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/race');
  await settled(page);

  const strip = page.locator('.disagree');
  await expect(strip.locator('.panel.compact')).toBeVisible();
  // The summary row itself, not just the sentence about it.
  await expect(strip.getByText('Uppers')).toBeVisible();
  const hidden = await strip.evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(hidden, 'the strip must not clip its own summary').toBeLessThanOrEqual(1);

  await strip.getByRole('button', { name: 'Full table' }).click();
  const sheet = page.locator('dialog[open]');
  await expect(sheet.getByText('Target BSP')).toBeVisible();
  await expect(sheet.getByText('Target heel')).toBeVisible();
});

/**
 * The day's tune, committed. Seeded rather than driven through the Dock: this
 * test is about what the Rig panel does with a lock, not how one is made.
 */
async function committedRig(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'sailflow.rigLock.v1',
        JSON.stringify({
          setup: { upperTurns: 0, lowerTurns: 0, forestayMm: 0 },
          committedAt: new Date().toISOString(),
          forecast: { minKt: 8, likelyKt: 10, maxKt: 12, seaState: 'moderate', crewKg: 300 },
        }),
      );
    } catch {
      // ignore: storage disabled — the panel stays uncommitted and this fails loudly
    }
  });
}

/**
 * ux-03 H-04. Committed, the Rig panel is the gear chart with your row lit —
 * and it rendered the header row and none of the seven data rows, 546 px of
 * them hidden in an overlay scroller with no scrollbar. Show the lit band and
 * its neighbours; the whole chart is one click away.
 */
test('the committed Rig panel shows the lit gear-chart row, not a header over nothing', async ({
  page,
}) => {
  await raceTier(page);
  await committedRig(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/race');
  await settled(page);

  // The sheet's copy of the chart also lives inside `.p-rig`; this is the one
  // in the panel body.
  const panel = page.locator('.p-rig');
  const lit = panel.locator('.gear.windowed tr.here');
  await expect(lit).toBeVisible();

  // The panel no longer scrolls inside itself (ADR 0016), so "in view" is just
  // a real box on the page — the clause that checked it against the panel's own
  // scroll box went with the scroller.
  const box = await lit.boundingBox();
  expect(box?.height ?? 0, 'the lit row must be a real box').toBeGreaterThan(0);

  const rows = await panel.locator('.gear.windowed tbody tr:visible').count();
  expect(rows).toBeGreaterThanOrEqual(2);

  await panel.getByRole('button', { name: /Full chart/ }).click();
  const sheet = page.locator('dialog[open]');
  expect(await sheet.locator('.gear tbody tr:visible').count()).toBeGreaterThan(rows);
});

/**
 * ux-03 H-07, WCAG 2.4.3. The actions card was emitted before the hero and all
 * four panels, so a keyboard met the three whole-trim buttons — and then the
 * hero's camera chips — before the first slider, at tab stop 41.
 */
test('a keyboard reaches a trim control before the whole-trim actions', async ({ page }) => {
  await raceTier(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/race');
  await heroDrawn(page);

  // The audit measured the first trim control at stop 41, behind Apply optimum,
  // Base trim, Log this trim and the hero's camera chips. It is stop 31 now, so
  // 40 is a walk that must reach it — and must not pass an action on the way.
  const STOPS = 40;
  let firstTrim = -1;
  const actionsBefore: number[] = [];
  for (let i = 0; i < STOPS && firstTrim < 0; i++) {
    await page.keyboard.press('Tab');
    const where = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return '';
      if (el.closest('.p-main, .p-jib, .p-helm, .p-rig') && el.matches('input[type="range"]'))
        return 'trim';
      return el.closest('.insight') ? 'action' : '';
    });
    if (where === 'action') actionsBefore.push(i);
    if (where === 'trim') firstTrim = i;
  }

  expect(firstTrim, `a trim slider must be reachable within ${STOPS} tabs`).toBeGreaterThanOrEqual(
    0,
  );
  expect(actionsBefore, 'no whole-trim action may come before the first trim control').toEqual([]);
});

/**
 * The plan view and the 3D hero draw the same kite through the same
 * projection, so they must not disagree about the leech. Until #80's
 * `leechAt` was sampled here the plan drew one straight `L` from head to clew
 * — 10 points, a triangle — while the hero showed the bulge (audit
 * docs-consistency-01 M-25b). Both edges are sampled now.
 */
test('the plan view draws the kite leech bulged, not straight', async ({ page }) => {
  await raceTier(page);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('sailflow.hero.v1', 'plan');
    } catch {
      // ignore: storage disabled, the plan view is the fallback anyway
    }
  });
  await page.setViewportSize(VIEWPORTS[1]);
  await page.goto('/#/race?set=asym&twa=150');

  const kite = page.locator('.hero-boat path.sail.kite');
  await expect(kite).toBeVisible();
  const d = (await kite.getAttribute('d')) ?? '';

  // 9 luff samples + 8 leech samples. The straight leech was 9 + the clew.
  const pts = d
    .replace('M ', '')
    .replace(' Z', '')
    .split(' L ')
    .map((p) => p.split(' ').map(Number) as [number, number]);
  expect(pts.length, `plan-view kite path was "${d}"`).toBeGreaterThan(10);
  expect(pts).toHaveLength(17);

  // The bulge is off the head→clew line: a straight leech would put every
  // sampled point on it. Compare a mid-leech sample against the chord.
  const [head, clew, mid] = [pts[8], pts[16], pts[12]];
  const t = (mid[1] - head[1]) / (clew[1] - head[1] || 1);
  const onChord = head[0] + t * (clew[0] - head[0]);
  expect(Math.abs(mid[0] - onChord), 'mid-leech must stand off the head→clew chord').toBeGreaterThan(
    1,
  );
});
