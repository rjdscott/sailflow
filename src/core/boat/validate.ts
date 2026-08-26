import type {
  BoatDefinition,
  ControlSpec,
  DownControls,
  ProvenanceEntry,
  RaceControls,
  SailId,
} from '../types';

/**
 * Validate a boat JSON before the solver touches it. Returns a list of
 * problems; empty means valid. Hand-rolled on purpose: the schema is one
 * file and a dependency would be bigger than this function.
 *
 * The bar (phase 05): **every field the solver reads is checked here, and a
 * missing one is an error rather than a silent default.** The failure this
 * prevents is specific — an absent number reads as `undefined`, becomes `NaN`
 * one multiply later, and surfaces as a solver that will not converge on a
 * new class with no clue as to why. `boat.test.ts` runs this over every
 * registered class, so a boat cannot reach the app without passing it.
 *
 * What is deliberately *not* required: the `calibration` knobs. Those have
 * documented defaults in the modules that read them (`knob()`), and a class
 * that has not been fitted yet is a legitimate state — it sails on the
 * reference boat's knobs and says so, rather than refusing to load.
 */
export function validateBoat(raw: unknown): string[] {
  const p: string[] = [];
  if (!isObj(raw)) return ['boat: not an object'];
  const b = raw as Partial<BoatDefinition>;

  if (b.schemaVersion !== 1) p.push(`schemaVersion: expected 1, got ${String(b.schemaVersion)}`);
  if (typeof b.id !== 'string' || !b.id) p.push('id: missing');

  for (const [section, keys] of Object.entries(REQUIRED_NUMBERS)) {
    const obj = (b as Record<string, unknown>)[section];
    if (!isObj(obj)) {
      p.push(`${section}: missing`);
      continue;
    }
    for (const k of keys) {
      const v = obj[k];
      if (typeof v !== 'number' || !Number.isFinite(v))
        p.push(`${section}.${k}: not a finite number`);
      else if (v <= 0) p.push(`${section}.${k}: must be positive`);
    }
  }

  if (isObj(b.crew)) {
    const c = b.crew;
    if (typeof c.minKg === 'number' && typeof c.maxKg === 'number' && c.minKg >= c.maxKg)
      p.push('crew: minKg must be < maxKg');
    if (c.maxLegsOut !== 2) p.push('crew.maxLegsOut: class rule allows exactly 2');
  }

  if (typeof b.rig?.wire !== 'string' || !b.rig.wire)
    p.push('rig.wire: missing (aero/orc/forces.ts reads the shroud diameter from it)');

  const sails = b.sails;
  if (!isObj(sails)) p.push('sails: missing');
  else
    for (const id of ['main', 'jib', 'asym'] as const) {
      const s = sails[id];
      if (!isObj(s)) {
        p.push(`sails.${id}: missing`);
        continue;
      }
      if (typeof s.ratedAreaM2 !== 'number' || s.ratedAreaM2 <= 0)
        p.push(`sails.${id}.ratedAreaM2: must be positive`);
      if (!ORC_TABLES.has(String(s.orcTable))) p.push(`sails.${id}.orcTable: unknown table`);
      // The girths `geometry/sailplan.ts` integrates. It throws on a missing
      // one, which is a stack trace rather than an answer — catch it here.
      for (const k of REQUIRED_GIRTHS[id]) {
        const v = s[k];
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0)
          p.push(`sails.${id}.${k}: not a finite girth in mm (read by geometry/sailplan.ts)`);
      }
    }

  const controls = b.controls;
  if (!isObj(controls)) p.push('controls: missing');
  else {
    for (const id of REQUIRED_CONTROLS) if (!(id in controls)) p.push(`controls.${id}: missing`);
    for (const [id, spec] of Object.entries(controls)) p.push(...checkControl(id, spec));
  }

  p.push(...checkBaseTrim(b));

  if (!isObj(b.calibration)) p.push('calibration: missing (may be empty)');
  else
    for (const [k, v] of Object.entries(b.calibration))
      if (typeof v !== 'number' || !Number.isFinite(v)) p.push(`calibration.${k}: not finite`);

  p.push(...checkPolar(b));
  p.push(...checkProvenance(b));
  return p;
}

/**
 * `baseRace` and `baseRaceDown` are the datum every shape delta is measured
 * against (`shape/base.ts`) *and* the trim the sliders open on. They were the
 * one block the solver read that nothing checked: a boat missing `baseRace`
 * hands `toOrc.ts` a set of `undefined`s and every delta comes back `NaN`.
 *
 * Values are checked against the control's own range, not just for finiteness
 * — a base trim outside the slider's stops is a boat the user can never
 * return to.
 */
function checkBaseTrim(b: Partial<BoatDefinition>): string[] {
  const p: string[] = [];
  const controls = isObj(b.controls) ? b.controls : {};
  const inRange = (where: string, key: string, v: unknown): void => {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      p.push(`${where}.${key}: not a finite number`);
      return;
    }
    const spec = controls[key] as Partial<ControlSpec> | undefined;
    if (spec && typeof spec.min === 'number' && typeof spec.max === 'number')
      if (v < spec.min || v > spec.max)
        p.push(`${where}.${key}: ${v} is outside controls.${key} [${spec.min}, ${spec.max}]`);
  };

  if (!isObj(b.baseRace)) p.push('baseRace: missing (the datum shape deltas are measured against)');
  else for (const k of RACE_CONTROLS) inRange('baseRace', k, b.baseRace[k]);

  const down = b.baseRaceDown;
  if (!isObj(down)) p.push('baseRaceDown: missing (the base state once the kite is up)');
  else {
    inRange('baseRaceDown', 'mainsheet', down.mainsheet);
    for (const k of DOWN_CONTROLS) inRange('baseRaceDown', k, down[k]);
  }
  return p;
}

/**
 * The reference polar, when one is attached. Absent is legal — a class with no
 * published polar still sails (`reference/polar.ts` reports no target rather
 * than inventing one) — but a *malformed* one is not: it would interpolate to
 * nonsense and report it as a percentage of target.
 */
function checkPolar(b: Partial<BoatDefinition>): string[] {
  const polar = b.polar;
  if (polar === undefined) return [];
  const p: string[] = [];
  if (!isObj(polar)) return ['polar: not an object'];
  const tws = (polar as { twsKt?: unknown }).twsKt;
  if (!Array.isArray(tws) || tws.length === 0) p.push('polar.twsKt: missing or empty');
  else if (tws.some((t, i) => typeof t !== 'number' || (i > 0 && t <= (tws[i - 1] as number))))
    p.push('polar.twsKt: must be numbers in ascending order');
  const rows = (polar as { rows?: unknown }).rows;
  if (!Array.isArray(rows) || rows.length === 0) p.push('polar.rows: missing or empty');
  const source = (polar as { source?: unknown }).source;
  if (!isObj(source) || typeof source.url !== 'string' || !source.url)
    // prov: ADR 0008 — committed third-party data names its source and retrieval date.
    p.push('polar.source.url: a committed polar must name where it came from (ADR 0008)');
  return p;
}

function checkControl(id: string, spec: unknown): string[] {
  const p: string[] = [];
  if (!isObj(spec)) return [`controls.${id}: not an object`];
  const s = spec as Partial<ControlSpec>;
  if (!['dock', 'race', 'down'].includes(String(s.mode))) p.push(`controls.${id}.mode: invalid`);
  for (const k of ['min', 'max', 'step'] as const)
    if (typeof s[k] !== 'number' || !Number.isFinite(s[k]))
      p.push(`controls.${id}.${k}: not finite`);
  if (typeof s.min === 'number' && typeof s.max === 'number' && s.min >= s.max)
    p.push(`controls.${id}: min must be < max`);
  if (typeof s.step === 'number' && s.step <= 0) p.push(`controls.${id}.step: must be positive`);
  if (s.purchaseMin !== undefined || s.purchaseMax !== undefined) {
    const lo = s.purchaseMin ?? s.purchaseMax ?? 0;
    const hi = s.purchaseMax ?? s.purchaseMin ?? 0;
    if (lo < 1 || hi < lo) p.push(`controls.${id}: purchase range invalid`);
  }
  return p;
}

/** Every numeric leaf outside `calibration`/`provenance`/`sources` needs a provenance row. */
function checkProvenance(b: Partial<BoatDefinition>): string[] {
  const p: string[] = [];
  const prov = b.provenance;
  if (!isObj(prov)) return ['provenance: missing'];
  const sources = isObj(b.sources) ? b.sources : {};
  for (const [path, entry] of Object.entries(prov)) {
    const e = entry as Partial<ProvenanceEntry>;
    if (!PROV_KINDS.has(String(e.kind))) p.push(`provenance.${path}.kind: invalid`);
    if (typeof e.source !== 'string' || !(e.source in sources))
      p.push(`provenance.${path}.source: unknown source "${String(e.source)}"`);
  }
  for (const leaf of numericLeaves(b, PROV_SKIP))
    if (!(leaf in prov)) p.push(`provenance: no entry for ${leaf}`);
  return p;
}

/**
 * Top-level blocks the provenance walk skips. `calibration` is fitted output,
 * `provenance`/`sources` are the prose itself, and `polar` is a separately
 * committed reference table that carries its own `source` block and its own
 * section in `PROVENANCE.md` — restating 182 printed cells as provenance rows
 * inside the boat file would duplicate it, not document it.
 */
const PROV_SKIP = ['calibration', 'provenance', 'sources', 'schemaVersion', 'polar'];

export function numericLeaves(obj: unknown, skipTop: string[] = [], prefix = ''): string[] {
  if (!isObj(obj)) return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (!prefix && skipTop.includes(k)) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'number') out.push(path);
    else if (isObj(v)) out.push(...numericLeaves(v, [], path));
  }
  return out;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Every numeric field the solver reads off `hull`, `rig` and `crew`. Kept in
 * step with the modules by grep: `grep -rn "boat\.hull\.\|boat\.rig\.\|
 * boat\.crew\." src/core`. `minDryWeightKg` and the spar outer dimensions are
 * here because the boat file carries them and the app quotes them, not
 * because the solver integrates them — a class rule gives them for free and a
 * blank is more likely an oversight than a decision.
 */
const REQUIRED_NUMBERS: Record<string, string[]> = {
  hull: [
    'loaM',
    'lwlM',
    'beamM',
    'bwlM',
    'draftM',
    'dispKg',
    'minDryWeightKg',
    'wettedM2',
    'keelAreaM2',
    'keelSpanM',
    'kgM',
    'gmM',
  ],
  rig: [
    'iM',
    'jM',
    'pM',
    'eM',
    'mastLenM',
    'spreaderZM',
    'spreaderLenM',
    'sweepDeg',
    'chainplateYM',
    'boomOuterMm',
    'bowspritOuterMm',
  ],
  crew: ['minKg', 'maxKg', 'minCount'],
};

/**
 * The girths `geometry/sailplan.ts` integrates, per sail. Main and jib are
 * girth trapezoids up the luff; the asym is the ORC spinnaker-area parabola,
 * which needs only luff, leech, foot and half girth.
 */
const REQUIRED_GIRTHS: Record<SailId, string[]> = {
  main: ['luffMm', 'footMm', 'quarterMm', 'halfMm', 'threeQuarterMm', 'upperMm', 'topMm'],
  jib: ['luffMm', 'lpMm', 'quarterMm', 'halfMm', 'threeQuarterMm', 'topMm'],
  asym: ['luffMm', 'leechMm', 'footMm', 'halfMm'],
};

const RACE_CONTROLS: (keyof RaceControls)[] = [
  'backstay',
  'mainsheet',
  'traveller',
  'cunningham',
  'outhaul',
  'vang',
  'jibSheet',
  'jibLead',
  'inhauler',
  'mainHalyard',
  'jibHalyard',
];

const DOWN_CONTROLS: (keyof DownControls)[] = ['kiteHalyard', 'tackLine', 'kiteSheet', 'sprit'];

const REQUIRED_CONTROLS = [
  'upperTurns',
  'lowerTurns',
  'forestayMm',
  'backstay',
  'mainsheet',
  'traveller',
  'cunningham',
  'outhaul',
  'vang',
  'jibSheet',
  'jibLead',
  'inhauler',
  'mainHalyard',
  'jibHalyard',
];

const ORC_TABLES = new Set(['5.1', '5.4', '5.6', '5.7', '5.8']); // prov: ORC VPP 2023 coefficient table numbers (types.ts SailDef.orcTable)
const PROV_KINDS = new Set(['published', 'measured', 'derived', 'assumed']);
