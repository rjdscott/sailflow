#!/usr/bin/env node
/**
 * Generate PROVENANCE.md and ASSUMPTIONS.md from data/**.json.
 * Run: node scripts/provenance.mjs        (writes)
 *      node scripts/provenance.mjs --check (fails if stale)
 * Hand-written prose lives above the <!-- generated --> marker in each file.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';

const MARK = '<!-- generated: do not edit below this line -->';

/**
 * Boats and polars are enumerated, never named — same rule the tuning guides
 * already follow. Naming `j70.json` here was the bug this file's own runbook
 * warned about: a second boat was invisible to `make docs-check`, so its
 * numbers could land with no provenance rows and nothing would say so.
 * Sorted, so the generated output does not depend on directory order.
 */
function loadDir(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => ({ file, data: JSON.parse(readFileSync(`${dir}/${file}`, 'utf8')) }));
}

const boats = loadDir('data/boats').map((b) => b.data);
const polars = loadDir('data/polar');
/** The class every doc means when it names no other: the one the gates run on. */
const DEFAULT_BOAT_ID = 'j70';

// Tuning guides are enumerated, never named: adding one is a file, not a code
// change (data/tuning/README.md). Sorted so this file's output is stable.
const TUNING_DIR = 'data/tuning';
const guides = readdirSync(TUNING_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((file) => ({ file, guide: JSON.parse(readFileSync(`${TUNING_DIR}/${file}`, 'utf8')) }));

/**
 * Schema gate for `data/tuning/*.json`. A malformed guide fails `make check`
 * here rather than rendering as a blank column in the disagreement panel.
 * Kept to the shape the UI actually reads (`src/lib/reference.ts`); prose
 * fields are free-form by design.
 */
function checkGuides() {
  const problems = [];
  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
  const nullOr = (v, ok) => v === null || ok(v);
  for (const { file, guide: g } of guides) {
    const at = `${TUNING_DIR}/${file}`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]+\.json$/.test(file))
      problems.push(`${at}: name must be <guide-id>-<boat-id>.json, lowercase`);
    if (g.schemaVersion !== 1) problems.push(`${at}: schemaVersion must be 1`);
    const s = g.source ?? {};
    for (const k of ['label', 'id', 'title', 'url', 'retrieved', 'copyright'])
      if (typeof s[k] !== 'string' || s[k] === '') problems.push(`${at}: source.${k} is required`);
    if (typeof s.revision !== 'string') problems.push(`${at}: source.revision must be a string`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.retrieved ?? ''))
      problems.push(`${at}: source.retrieved must be YYYY-MM-DD (ADR 0008)`);
    if (typeof g.base !== 'object' || g.base === null) problems.push(`${at}: base is required`);
    if (!Array.isArray(g.bands)) {
      problems.push(`${at}: bands must be an array (empty = transcription removed)`);
      continue;
    }
    let prevMin = -Infinity;
    for (const [i, b] of g.bands.entries()) {
      const where = `${at}: bands[${i}]`;
      if (typeof b.label !== 'string' || b.label === '') problems.push(`${where}.label is required`);
      if (!isNum(b.twsMinKt)) problems.push(`${where}.twsMinKt must be a number (kt)`);
      if (!nullOr(b.twsMaxKt, isNum))
        problems.push(`${where}.twsMaxKt must be a number or null (open-ended top band)`);
      if (isNum(b.twsMinKt) && isNum(b.twsMaxKt) && b.twsMaxKt <= b.twsMinKt)
        problems.push(`${where}: twsMaxKt must be above twsMinKt`);
      if (isNum(b.twsMinKt) && b.twsMinKt < prevMin)
        problems.push(`${where}: bands must be ordered by twsMinKt ascending`);
      if (isNum(b.twsMinKt)) prevMin = b.twsMinKt;
      for (const k of ['uppersTurns', 'lowersTurns', 'rakeMm', 'forestayMm'])
        if (!nullOr(b[k], isNum)) problems.push(`${where}.${k} must be a number or null`);
      for (const k of ['race', 'targets'])
        if (typeof b[k] !== 'object' || b[k] === null) problems.push(`${where}.${k} is required`);
    }
    if (g.bands.length > 0 && g.bands[g.bands.length - 1].twsMaxKt !== null)
      problems.push(`${at}: the last band must be open-ended (twsMaxKt: null)`);
  }
  if (problems.length) {
    for (const p of problems) console.error(`error: ${p}`);
    console.error(`\n${problems.length} problem(s). Schema: ${TUNING_DIR}/README.md`);
    process.exit(1);
  }
}

checkGuides();
// Written by calibration/fit.ts. Absent before the first fit, and the
// calibrated-parameter table degrades to knob + value when it is. The default
// class keeps the unsuffixed name (see `RESIDUALS_FILE` in calibration/fit.ts).
function residualsPathFor(boat) {
  return boat.id === DEFAULT_BOAT_ID
    ? 'calibration/residuals.json'
    : `calibration/residuals-${boat.id}.json`;
}

function residualsFor(boat) {
  const at = residualsPathFor(boat);
  return existsSync(at) ? JSON.parse(readFileSync(at, 'utf8')) : null;
}

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function provenanceBody() {
  const out = [];
  out.push('## Sources', '');
  out.push('| Id | Title | Retrieved | Edition | URL |', '|---|---|---|---|---|');
  // Deduped by id: two classes measured from the same rule book cite one row.
  const seen = new Set();
  for (const boat of boats)
    for (const [id, s] of Object.entries(boat.sources)) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(`| \`${id}\` | ${s.title} | ${s.retrieved} | ${s.edition ?? ''} | <${s.url}> |`);
    }
  for (const t of [...guides.map((g) => g.guide), ...polars.map((p) => p.data)]) {
    const s = t.source;
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(
      `| \`${s.id}\` | ${s.title} | ${s.retrieved} | ${s.revision ?? s.vppVersion ?? ''} | <${s.url}> |`,
    );
  }
  for (const boat of boats) {
    out.push('', `## Boat definition: \`data/boats/${boat.id}.json\``, '');
    out.push('| Path | Value | Kind | Source | Note |', '|---|---|---|---|---|');
    for (const [path, e] of Object.entries(boat.provenance).sort()) {
      const v = get(boat, path);
      out.push(`| \`${path}\` | ${v} | ${e.kind} | \`${e.source}\` | ${e.note ?? ''} |`);
    }
  }
  out.push('', '## Reference tables', '');
  for (const { file, guide } of guides)
    out.push(
      `- \`${TUNING_DIR}/${file}\`: ${guide.bands.length} wind bands, retrieved ${guide.source.retrieved},` +
        ` © ${guide.source.copyright}. Settings only; no prose reproduced.`,
    );
  for (const { file, data: polar } of polars)
    out.push(
      `- \`data/polar/${file}\`: ${polar.rows.length} rows at TWS ${polar.twsKt.join('/')} kt, ${polar.source.vppVersion}, issued ${polar.source.issued}.`,
    );
  return out.join('\n') + '\n';
}

function assumptionsBody() {
  const out = [];
  // One class keeps the flat headings every existing link and quote points at;
  // a second one gets a sub-heading per class so the two cannot be confused.
  const many = boats.length > 1;

  out.push('## Assumed boat parameters', '');
  for (const boat of boats) {
    if (many) out.push(`### \`data/boats/${boat.id}.json\``, '');
    out.push('| Path | Value | Note |', '|---|---|---|');
    for (const [path, e] of Object.entries(boat.provenance).sort())
      if (e.kind === 'assumed') out.push(`| \`${path}\` | ${get(boat, path)} | ${e.note ?? ''} |`);
    if (many) out.push('');
  }

  out.push('', '## Calibrated free parameters', '');
  for (const boat of boats) {
    if (many) out.push(`### \`data/boats/${boat.id}.json\``, '');
    const residuals = residualsFor(boat);
    const cal = Object.entries(boat.calibration);
    if (!cal.length) {
      out.push(
        many
          ? `_Not fitted yet. Run \`pnpm calibrate --boat ${boat.id}\`; until then this class` +
              ' sails on the reference boat\'s knob defaults.'
          : '_None yet. Populated by `calibration/fit.ts` in phase 02._',
      );
      if (many) out.push('');
      continue;
    }
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
          ` (ADR ${residuals.adr ?? '0007'}). Per-point residuals: \`${residualsPathFor(boat)}\`.`,
      );
    if (many) out.push('');
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
