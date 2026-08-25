#!/usr/bin/env node
/**
 * First-load budget gate (ADR 0014).
 *
 * The 3D sail view is allowed to be heavy because it is lazily imported: the
 * app's first load is supposed to be unchanged by it. That promise is only
 * worth something if something checks it, so this asserts the total gzip size
 * of the chunks `index.html` actually loads — the entry plus anything it
 * `modulepreload`s — against a committed baseline, and prints every other
 * chunk for the record.
 *
 * Run: pnpm build && node scripts/bundle_check.mjs
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const ASSETS = join(DIST, 'assets');

const baseline = JSON.parse(readFileSync('scripts/bundle_baseline.json', 'utf8'));

let html;
try {
  html = readFileSync(join(DIST, 'index.html'), 'utf8');
} catch {
  console.error('bundle-check: no dist/index.html — run `pnpm build` first.');
  process.exit(1);
}

const chunks = readdirSync(ASSETS)
  .filter((f) => f.endsWith('.js'))
  .map((name) => {
    const bytes = readFileSync(join(ASSETS, name));
    return {
      name,
      raw: bytes.length,
      gzip: gzipSync(bytes, { level: 9 }).length,
      entry: html.includes(name),
    };
  })
  .sort((a, b) => b.gzip - a.gzip);

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
for (const c of chunks) {
  console.log(
    `${c.entry ? '*' : ' '} ${c.name.padEnd(42)} ${kb(c.raw).padStart(9)} raw  ${kb(c.gzip).padStart(9)} gzip`,
  );
}

const three = chunks.find((c) => /SailView3D/.test(c.name));
if (three) console.log(`\nthree.js hero chunk: ${kb(three.gzip)} gzip (lazy, not on first load)`);
else console.log('\nthree.js hero chunk: not emitted');

/* Every chunk index.html names — the entry plus its `modulepreload`ed shared
   chunks — is fetched before the app renders, so the budget is their sum, not
   the biggest one. Splitting a screen out of the entry only counts as a win if
   it leaves the first-load set entirely (ux-03 M-23). */
const entries = chunks.filter((c) => c.entry);
if (entries.length === 0) {
  console.error('bundle-check: index.html names no JS chunk in dist/assets.');
  process.exit(1);
}

const first = entries.reduce((n, c) => n + c.gzip, 0);
const limit = baseline.entryGzipBytes + baseline.toleranceBytes;
const delta = first - baseline.entryGzipBytes;
console.log(
  `\nfirst load (${entries.length} chunk${entries.length === 1 ? '' : 's'}: ` +
    `${entries.map((c) => c.name).join(', ')}): ${first} B gzip, ` +
    `baseline ${baseline.entryGzipBytes} B (${delta >= 0 ? '+' : ''}${delta} B), limit ${limit} B`,
);

if (first > limit) {
  console.error(
    `bundle-check: FAIL — the first load grew ${delta} B past the ` +
      `${baseline.toleranceBytes} B tolerance. Either it belongs behind a dynamic import, ` +
      'or raise scripts/bundle_baseline.json deliberately in this PR.',
  );
  process.exit(1);
}

console.log('bundle-check: OK');
