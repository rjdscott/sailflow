/**
 * Evidence sweep for audit release-01 — the live site, cold, at two viewports.
 *
 * Run from the repo root, which is where `@playwright/test` resolves from:
 *
 *   node docs/audits/2026-08-26-release-01/sweep.mjs docs/audits/2026-08-26-release-01/img
 *
 * One fresh context per screen, so no `localStorage` carries over and every
 * capture is a true first visit. SwiftShader because CI and this audit both
 * run without a GPU; take the screenshot before judging anything 3D.
 *
 * Writes `<viewport>-NN-<screen>.png`, the same stem `.txt` holding
 * `document.body.innerText`, and `log2.txt` with the console and network
 * transcript. `<viewport>-01-landing*` come from an earlier pass over the
 * bare URL with no hash.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const OUT = process.argv[2];
const BASE = 'https://rjdscott.github.io/sailflow/';
const screens = ['race', 'dock', 'log', 'drills', 'more'];
const viewports = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'phone', width: 390, height: 844 },
];

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});

const log = [];
for (const vp of viewports) {
  for (const [idx, screen] of screens.entries()) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.name === 'phone',
      hasTouch: vp.name === 'phone',
    });
    const page = await ctx.newPage();
    const msgs = [];
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') msgs.push(`[${m.type()}] ${m.text()}`);
    });
    page.on('pageerror', (e) => msgs.push(`[pageerror] ${e.message}`));
    page.on('requestfailed', (r) =>
      msgs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`)
    );

    await page.goto(`${BASE}#/${screen}`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(5000);

    const stem = `${OUT}/${vp.name}-${String(idx + 2).padStart(2, '0')}-${screen}`;
    await page.screenshot({ path: `${stem}.png` });
    const txt = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync(`${stem}.txt`, txt);

    log.push(`\n## ${vp.name} ${vp.width}x${vp.height} — #/${screen}`);
    log.push(`title: ${await page.title()}  url: ${page.url()}  chars: ${txt.length}`);
    log.push(`mentions "tier": ${/tier/i.test(txt)}`);
    log.push(`mentions "version": ${(txt.match(/\d+\.\d+\.\d+/g) || []).join(', ') || 'none'}`);
    log.push(`console/network (${msgs.length}):`);
    for (const m of [...new Set(msgs)]) log.push(`  ${m}`);
    await ctx.close();
  }
}

fs.writeFileSync(`${OUT}/log2.txt`, log.join('\n'));
console.log(log.join('\n'));
await browser.close();
