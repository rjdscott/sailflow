/**
 * One screenshot of the running app, for the README images.
 *
 * Not a test: `tests/ui/` is the suite, and its `toHaveScreenshot` baselines
 * are 3D-hero pixels compared inside a pinned docker image. This is the
 * marketing shot — a whole page at a stated width, against a `vite preview` of
 * the current build, deterministic enough to be reshot on any machine (motion
 * off, tour dismissed, the 3D hero forced on so the plan-view fallback does
 * not stand in for it on a slow box).
 *
 * See `docs/runbooks/reshoot-readme-screenshots.md`.
 *
 *   node scripts/screenshot.mjs --out docs/img/sim-desktop.png --width 1440
 *   node scripts/screenshot.mjs --out docs/img/sim-phone.png --width 390 \
 *     --height 1180 --scale 2 --viewport
 */
import { chromium } from '@playwright/test';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1] ?? '');
}

const out = args.get('out');
if (!out) {
  console.error('usage: node scripts/screenshot.mjs --out FILE [--width 1440] …');
  process.exit(2);
}
const width = Number(args.get('width') ?? 1440);
const height = Number(args.get('height') ?? 900);
const scale = Number(args.get('scale') ?? 1);
const url = args.get('url') ?? 'http://127.0.0.1:4318/#/sim';
const tier = args.get('tier') ?? 'race';
// Default: the cockpit element, which is the whole Simulator without the
// nav rail — a `fullPage` shot paints a fixed rail only over the first
// viewport, and the rest of the column comes out empty.
const selector = args.has('viewport') ? null : (args.get('selector') ?? '.cockpit');

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
const page = await context.newPage();
await page.addInitScript((t) => {
  try {
    localStorage.setItem('sailflow.tourSeen', '1');
    localStorage.setItem('sailflow.mode', t);
    localStorage.setItem('sailflow.motion', 'off');
    localStorage.setItem('sailflow.hero.v1', '3d');
  } catch {
    // No storage: the defaults still render, the tour will be in the shot.
  }
}, tier);

await page.goto(url);
// The 3D hero's second frame, then the band's first solve, then a beat for the
// optimum search — the same three things the UI suite waits for.
await page
  .waitForFunction(() => window.__sailViewReady === true, undefined, { timeout: 60_000 })
  .catch(() => console.warn('hero did not report ready; shooting anyway'));
await page.locator('.bar .cells').first().waitFor({ timeout: 30_000 });
await page.waitForTimeout(3000);

await (selector ? page.locator(selector).first() : page).screenshot({ path: out });
console.log(`wrote ${out} (${width}x${height} @${scale}x, ${tier} tier)`);
await browser.close();
