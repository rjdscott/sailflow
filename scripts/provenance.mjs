#!/usr/bin/env node
/**
 * Generate PROVENANCE.md and ASSUMPTIONS.md from data/**.json.
 * Run: node scripts/provenance.mjs        (writes)
 *      node scripts/provenance.mjs --check (fails if stale)
 * Hand-written prose lives above the <!-- generated --> marker in each file.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const MARK = '<!-- generated: do not edit below this line -->';
const boat = JSON.parse(readFileSync('data/boats/j70.json', 'utf8'));
const north = JSON.parse(readFileSync('data/tuning/north-j70.json', 'utf8'));
const quantum = JSON.parse(readFileSync('data/tuning/quantum-j70.json', 'utf8'));
const polar = JSON.parse(readFileSync('data/polar/orc-j70.json', 'utf8'));
// Written by calibration/fit.ts. Absent before the first fit, and the
// calibrated-parameter table degrades to knob + value when it is.
const RESIDUALS = 'calibration/residuals.json';
const residuals = existsSync(RESIDUALS) ? JSON.parse(readFileSync(RESIDUALS, 'utf8')) : null;

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function provenanceBody() {
  const out = [];
  out.push('## Sources', '');
  out.push('| Id | Title | Retrieved | Edition | URL |', '|---|---|---|---|---|');
  for (const [id, s] of Object.entries(boat.sources))
    out.push(`| \`${id}\` | ${s.title} | ${s.retrieved} | ${s.edition ?? ''} | <${s.url}> |`);
  for (const t of [north, quantum, polar]) {
    const s = t.source;
    out.push(
      `| \`${s.id}\` | ${s.title} | ${s.retrieved} | ${s.revision ?? s.vppVersion ?? ''} | <${s.url}> |`,
    );
  }
  out.push('', `## Boat definition: \`data/boats/${boat.id}.json\``, '');
  out.push('| Path | Value | Kind | Source | Note |', '|---|---|---|---|---|');
  for (const [path, e] of Object.entries(boat.provenance).sort()) {
    const v = get(boat, path);
    out.push(`| \`${path}\` | ${v} | ${e.kind} | \`${e.source}\` | ${e.note ?? ''} |`);
  }
  out.push('', '## Reference tables', '');
  out.push(
    `- \`data/tuning/north-j70.json\`: ${north.bands.length} wind bands, © ${north.source.copyright}. Settings only; no prose reproduced.`,
    `- \`data/tuning/quantum-j70.json\`: ${quantum.bands.length} wind bands, © ${quantum.source.copyright}. Settings only.`,
    `- \`data/polar/orc-j70.json\`: ${polar.rows.length} rows at TWS ${polar.twsKt.join('/')} kt, ${polar.source.vppVersion}, issued ${polar.source.issued}.`,
  );
  return out.join('\n') + '\n';
}

function assumptionsBody() {
  const out = [];
  out.push('## Assumed boat parameters', '');
  out.push('| Path | Value | Note |', '|---|---|---|');
  for (const [path, e] of Object.entries(boat.provenance).sort())
    if (e.kind === 'assumed') out.push(`| \`${path}\` | ${get(boat, path)} | ${e.note ?? ''} |`);
  out.push('', '## Calibrated free parameters', '');
  const cal = Object.entries(boat.calibration);
  if (!cal.length) out.push('_None yet. Populated by `calibration/fit.ts` in phase 02._');
  else {
    const stageOf = new Map();
    for (const s of residuals?.stages ?? [])
      for (const k of s.knobs) stageOf.set(k.name, { stage: s.stage, name: s.name, loss: s.lossEnd });
    out.push('| Knob | Value | Stage | Fit loss |', '|---|---|---|---|');
    for (const [k, v] of cal) {
      const s = stageOf.get(k);
      out.push(
        `| \`${k}\` | ${Number(v.toPrecision(6))} | ${s ? `${s.stage} ${s.name}` : 'unfitted'} | ${
          s ? s.loss.toPrecision(4) : ''
        } |`,
      );
    }
    if (residuals)
      out.push(
        '',
        `Fit set: TWS ${residuals.fitTws.join('/')} kt; held out: TWS ${residuals.heldOutTws.join('/')} kt` +
          ` (ADR ${residuals.adr ?? '0007'}). Per-point residuals: \`${RESIDUALS}\`.`,
      );
  }
  return out.join('\n') + '\n';
}

function render(file, defaultHead, body) {
  const head = existsSync(file) ? readFileSync(file, 'utf8').split(MARK)[0] : defaultHead;
  return head.trimEnd() + '\n\n' + MARK + '\n\n' + body;
}

const files = {
  'PROVENANCE.md': render(
    'PROVENANCE.md',
    `# Provenance

Every number the app uses, where it came from, when it was retrieved, and
whether it is published, measured, derived or assumed. Third-party settings
are committed by decision (ADR 0008); this file attributes them and does not
reproduce any prose from the source documents.

Kinds: **published** (printed in a source), **measured** (from an
instrument), **derived** (computed from published values by a stated
method), **assumed** (no source; see ASSUMPTIONS.md).
`,
    provenanceBody(),
  ),
  'ASSUMPTIONS.md': render(
    'ASSUMPTIONS.md',
    `# Assumptions

Free parameters and assumed values, their current numbers, and how each was
chosen. Where calibration fits a value, the fit residual and hold-out
residual are recorded here by \`calibration/fit.ts\`.

The rig-bend-to-sail-shape sensitivity layer (\`src/core/aero/shape\`) is
invented for this app: sign-correct by construction and tested for it,
magnitude unknown. Outputs that depend on it carry tier B or C (ADR 0006).
`,
    assumptionsBody(),
  ),
};

let stale = false;
for (const [file, text] of Object.entries(files)) {
  const cur = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (process.argv.includes('--check')) {
    if (cur !== text) {
      console.error(`error: ${file} is stale. Run: node scripts/provenance.mjs`);
      stale = true;
    }
  } else if (cur !== text) {
    writeFileSync(file, text);
    console.log(`updated ${file}`);
  }
}
process.exit(stale ? 1 : 0);
