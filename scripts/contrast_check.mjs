#!/usr/bin/env node
/**
 * WCAG contrast gate for src/ui/tokens.css (cockpit phase 01 / ADR 0015).
 *
 * Reads the two full palettes out of the stylesheet — `:root` (dark, the
 * default) and `:root[data-theme='light']` — and asserts the floors below in
 * both. No dependencies: it is a hex parser, a luminance formula and a table.
 *
 * Run by `make docs-check`, so a hand-tuned hex that drops a slider trough
 * under 3:1 fails CI rather than shipping.
 *
 * Floors (WCAG 2.2 SC 1.4.3 text, SC 1.4.11 non-text):
 *   4.5:1  --ink, --instrument on --bg / --surface / --surface-2
 *   4.5:1  --ink-2 on --bg / --surface
 *   4.5:1  --on-accent on --accent
 *   3:1    --line-strong, --muted, --accent, --bug, --focus, --good, --warn,
 *          --bad on --bg / --surface / --surface-2
 *   3:1    --surface, --surface-2 on --accent (the confidence badge's own fill,
 *          sitting on the accent Apply button)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const TOKENS = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'ui', 'tokens.css');

/** The declarations of one `<selector> { ... }` block, as name -> hex. */
function block(css, selector) {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`tokens.css: no "${selector} {" block`);
  const body = css.slice(start, css.indexOf('}', start));
  const out = {};
  for (const [, name, hex] of body.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    out[name] = hex;
  }
  return out;
}

function rgb(hex) {
  const h =
    hex.length === 4
      ? [...hex.slice(1)].map((c) => c + c).join('')
      : hex.slice(1, 7); /* #rgb, #rrggbb, #rrggbbaa */
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

/** Relative luminance, WCAG 2.x definition. */
function luminance(hex) {
  const [r, g, b] = rgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const SURFACES = ['--bg', '--surface', '--surface-2'];

/** [foreground, [backgrounds], minimum ratio] */
const RULES = [
  ['--ink', SURFACES, 4.5],
  ['--instrument', SURFACES, 4.5],
  ['--ink-2', ['--bg', '--surface'], 4.5],
  ['--on-accent', ['--accent'], 4.5],
  ...['--line-strong', '--muted', '--accent', '--bug', '--focus', '--good', '--warn', '--bad'].map(
    (fg) => [fg, SURFACES, 3],
  ),
  /* The confidence badge paints its own surface rather than inheriting one, so
     its letter is --ink on --surface / --surface-2 — both already gated above.
     What is not gated anywhere else is the badge sitting *on* the accent Apply
     button: its fill has to stay a visible chip against --accent, or the tier
     is a smudge again (audit ux-03 H-10, which measured 1.06:1 when the badge
     was transparent and composited onto the button).

     Deliberately not a row: `--ink` on `--muted`, which the audit asked for.
     --muted must also clear 3:1 on --surface-2, and no grey satisfies both —
     4.5:1 against --ink forces --muted below #6a6a70, which is 2.89:1 on
     --surface-2. That impossibility is why tier A moved off --muted rather
     than the token being retuned. */
  ['--surface', ['--accent'], 3],
  ['--surface-2', ['--accent'], 3],
];

const css = readFileSync(TOKENS, 'utf-8');
const palettes = [
  ['dark  (:root)', block(css, ':root')],
  ["light (:root[data-theme='light'])", block(css, ":root[data-theme='light']")],
];

let failures = 0;

for (const [label, tokens] of palettes) {
  console.log(`\n${label}`);
  console.log('  fg              on              ratio   min   ');
  console.log('  ' + '-'.repeat(46));
  for (const [fg, bgs, min] of RULES) {
    for (const bg of bgs) {
      const missing = [fg, bg].filter((t) => !tokens[t]);
      if (missing.length) {
        console.log(`  ${fg.padEnd(15)} ${bg.padEnd(15)} MISSING ${missing.join(', ')}`);
        failures += 1;
        continue;
      }
      const ratio = contrast(tokens[fg], tokens[bg]);
      const ok = ratio >= min;
      if (!ok) failures += 1;
      console.log(
        `  ${fg.padEnd(15)} ${bg.padEnd(15)} ${ratio.toFixed(2).padStart(5)}  ${min.toFixed(1)}   ` +
          `${ok ? 'ok' : 'FAIL'}  ${tokens[fg]} on ${tokens[bg]}`,
      );
    }
  }
}

console.log(
  failures === 0
    ? '\ncontrast_check: all pairs pass\n'
    : `\ncontrast_check: ${failures} pair(s) below the floor\n`,
);
process.exit(failures === 0 ? 0 : 1);
