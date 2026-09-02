/**
 * Screenshot matrix of the hero card: every 3D camera preset and the plan
 * view, at nine points of sail, desktop and phone. The evidence set for
 * `docs/audits/2026-09-02-kite-3d-01/`; not a test. Deterministic enough to
 * reshoot on any machine (motion off, telltales frozen, tour dismissed).
 *
 *   pnpm build && node scripts/shoot_matrix.mjs /tmp/shots
 *
 * Files are `<viewport>-<state>-<view>.png`. State codes: ch 40° jib, cr 60°,
 * br 90°, tr 110° kite, brk 135°, run 150° default trim, deep 170°,
 * run-trim 150° sheet+tack 100, run-ease 150° sheet+tack 0. TWS 12 kt,
 * starboard tack. Under the kite the mainsheet is the class downwind base,
 * passed explicitly in `r=` so the boom is where `hoistKite` would put it.
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2];
if (!OUT) {
  console.error('usage: node scripts/shoot_matrix.mjs OUT_DIR');
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:4318/#/sim';

const preview = spawn(
  'npx',
  ['vite', 'preview', '--host', '127.0.0.1', '--port', '4318', '--strictPort'],
  { stdio: 'ignore' },
);
await new Promise((r) => setTimeout(r, 2500));

// twa, sailset, down controls (kiteHalyard_tackLine_kiteSheet_sprit), tag
const STATES = [
  [40, 'jib', null, 'ch'],
  [60, 'jib', null, 'cr'],
  [90, 'jib', null, 'br'],
  [110, 'asym', '100_50_50_100', 'tr'],
  [135, 'asym', '100_50_50_100', 'brk'],
  [150, 'asym', '100_50_50_100', 'run'],
  [170, 'asym', '100_50_50_100', 'deep'],
  [150, 'asym', '100_100_100_100', 'run-trim'],
  [150, 'asym', '100_0_0_100', 'run-ease'],
];
// `baseRace` with the mainsheet at `baseRaceDown` (data/boats/j70.json), in
// share.ts RACE_KEYS order.
const RACE_DOWN = '30_15_0_20_50_30_60_5_30_50_50';
const VIEWS = ['helm', 'astern', 'leeward', 'luff', 'top'];
const VIEWPORTS = {
  desktop: { width: 1440, height: 900, scale: 1 },
  phone: { width: 390, height: 844, scale: 2 },
};

const browser = await chromium.launch();
async function shoot(vp, hero, state, view) {
  const [twa, set, w, tag] = state;
  const { width, height, scale } = VIEWPORTS[vp];
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  await page.addInitScript((h) => {
    localStorage.setItem('sailflow.tourSeen', '1');
    localStorage.setItem('sailflow.mode', 'race');
    localStorage.setItem('sailflow.motion', 'off');
    localStorage.setItem('sailflow.hero.v1', h);
  }, hero);
  const q = new URLSearchParams({ s: '1', tws: '12', twa: String(twa), set, freeze: '1' });
  if (w) {
    q.set('w', w);
    q.set('r', RACE_DOWN);
  }
  if (view) q.set('view', view);
  await page.goto(`${BASE}?${q}`);
  if (hero === '3d') {
    await page
      .waitForFunction(() => window.__sailViewReady === true, undefined, { timeout: 60_000 })
      .catch(() => console.warn('hero not ready', tag, view));
  }
  await page.locator('.bar .cells').first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const name = `${vp}-${tag}-${hero === '3d' ? view : 'plan'}.png`;
  await page.locator('.hero-boat').first().screenshot({ path: `${OUT}/${name}` });
  const pageShot =
    (vp === 'desktop' && view === 'astern') ||
    (vp === 'phone' && (view === 'astern' || hero === 'plan'));
  if (pageShot) {
    await page.screenshot({ path: `${OUT}/${vp}-${tag}-${hero === '3d' ? view : 'plan'}-page.png` });
  }
  console.log(name);
  await ctx.close();
}

for (const st of STATES) {
  for (const v of VIEWS) await shoot('desktop', '3d', st, v);
  await shoot('desktop', 'plan', st, null);
}
for (const st of STATES.filter((s) => ['ch', 'run', 'run-ease', 'brk'].includes(s[3]))) {
  for (const v of ['astern', 'leeward', 'helm']) await shoot('phone', '3d', st, v);
  await shoot('phone', 'plan', st, null);
}
await browser.close();
preview.kill();
