/**
 * Shared plumbing for the validation harness: boat + polar loading, the
 * ADR 0007 tolerances, and one function that runs the model against one
 * printed polar row.
 *
 * `validation/` only ever READS (ADR 0007). Nothing here writes calibration.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import j70 from '../data/boats/j70.json';
import polarJson from '../data/polar/orc-j70.json';
import type { BoatDefinition, PolarTable, SailSet, SeaState } from '../src/core/types';
import { baseDock } from '../src/core/shape/base';
import { geometryFor } from '../src/core/solve/equilibrium';
import { optimal } from '../src/core/solve/optimal';

/**
 * The boat the harness gates, with its reference polar attached the same way
 * `src/lib/boat.ts` attaches one for the app — the solver reads `boat.polar`
 * for `pctPolar`, so a harness boat without it would gate a different model
 * from the one that ships.
 */
export const boat = { ...j70, polar: polarJson as PolarTable } as unknown as BoatDefinition;

/** Cached once: sail geometry never varies within a run. */
const GEOM = geometryFor(boat);

export const POLAR_PATH = fileURLToPath(new URL('../data/polar/orc-j70.json', import.meta.url));

// ---------------------------------------------------------------------------
// Reference polar
// ---------------------------------------------------------------------------

export interface PolarRow {
  twsKt: number;
  sail: SailSet;
  kind: 'vmgUp' | 'angle' | 'vmgDn';
  twaDeg: number;
  bsKt: number;
  vmgKt: number;
  heelDeg: number;
}

export interface Polar {
  twsKt: number[];
  rows: PolarRow[];
  source: { title: string; url: string; vppVersion?: string; issued?: string };
}

/** The committed ORC Speed Guide polar, or null when the file is absent. */
export function loadPolar(): Polar | null {
  try {
    return JSON.parse(readFileSync(POLAR_PATH, 'utf8')) as Polar;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// ADR 0007: the gate. Changing any of these requires superseding that ADR.
// ---------------------------------------------------------------------------

/** Held-out VMG rows: 3 % on boat speed, 2° on the VMG angle. */
export const TOL_VMG_BS_FRAC = 0.03;
export const TOL_VMG_TWA_DEG = 2;
/** Held-out 60/90/120 rows: 5 % on boat speed (tier B). */
export const TOL_ANGLE_BS_FRAC = 0.05;

/** TWS the calibration never sees. Everything else is fitted (ADR 0012). */
export const HELD_OUT_TWS: readonly number[] = [8, 14];
/** The printed fixed-TWA rows. Gated at the held-out TWS only (ADR 0012). */
export const GATE_ANGLES: readonly number[] = [60, 90, 120];

/**
 * The sailing condition the polar is replayed at. The ORC Speed Guide prints
 * no sea state or crew weight, so both are this app's convention:
 * class-maximum crew hiking hard, and sea state 1 (ripple) because an ORC VPP
 * polar always carries some added resistance in waves.
 * prov: assumed. Calibration must import these so the fit and the gate agree.
 */
export const POLAR_SEA_STATE: SeaState = 1;
export const POLAR_CREW_KG = boat.crew.maxKg;

// ---------------------------------------------------------------------------
// Hashes, so a golden corpus can tell whether the boat moved under it
// ---------------------------------------------------------------------------

function sha8(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 8);
}

/**
 * Hash of the boat data the solver reads: everything except the fitted
 * calibration block and the provenance prose. A note edit is not a geometry
 * change (#84 regenerated the corpus over one), so `provenance` and `sources`
 * stay out; `boat/validate.ts` checks them, the solver never reads them.
 *
 * `polar` stays out too, and for a different reason: it is not part of the
 * boat file at all, it is a separately committed reference table attached at
 * load (`BoatDefinition.polar`). It was outside this hash before it rode on
 * the boat object and it stays outside now — `validation/polar.test.ts` is
 * what guards the table itself.
 */
export function boatHash(b: BoatDefinition = boat): string {
  const { calibration: _c, provenance: _p, sources: _s, polar: _pol, ...rest } = b;
  void [_c, _p, _s, _pol];
  return sha8(JSON.stringify(rest));
}

/** Hash of the calibration block alone, key order normalised. */
export function calibHash(): string {
  const keys = Object.keys(boat.calibration).sort();
  return sha8(JSON.stringify(keys.map((k) => [k, boat.calibration[k]])));
}

// ---------------------------------------------------------------------------
// Model vs polar
// ---------------------------------------------------------------------------

export interface Comparison {
  label: string;
  twsKt: number;
  sail: SailSet;
  kind: PolarRow['kind'];
  /** True when this TWS was withheld from the fit. */
  heldOut: boolean;
  polar: { twaDeg: number; bsKt: number; heelDeg: number };
  model: { twaDeg: number; bsKt: number; heelDeg: number; vmgKt: number; flat: number };
  converged: boolean;
  bsErrFrac: number;
  /** null for fixed-angle rows: the angle is an input, not an output. */
  twaErrDeg: number | null;
  limitBsFrac: number;
  limitTwaDeg: number | null;
  pass: boolean;
}

/**
 * Run the solver against one polar row. VMG rows optimise TWA; printed-angle
 * rows are solved at the printed angle. Race trim is optimised in both cases,
 * from the tuning-guide base dock setup.
 */
export function compareRow(row: PolarRow): Comparison {
  const optimiseTwa = row.kind !== 'angle';
  const r = optimal(
    boat,
    baseDock(),
    {
      twsKt: row.twsKt,
      twaDeg: row.twaDeg,
      seaState: POLAR_SEA_STATE,
      crewKg: POLAR_CREW_KG,
      sailset: row.sail,
    },
    { optimiseTwa },
    GEOM,
  );

  const bsErrFrac = Math.abs(r.bsKt.value - row.bsKt) / row.bsKt;
  const twaErrDeg = optimiseTwa ? Math.abs(Math.abs(r.twaDeg) - row.twaDeg) : null;
  const limitBsFrac = optimiseTwa ? TOL_VMG_BS_FRAC : TOL_ANGLE_BS_FRAC;
  const limitTwaDeg = optimiseTwa ? TOL_VMG_TWA_DEG : null;

  return {
    label: `TWS ${row.twsKt} ${row.sail} ${row.kind === 'angle' ? `${row.twaDeg}°` : row.kind}`,
    twsKt: row.twsKt,
    sail: row.sail,
    kind: row.kind,
    heldOut: HELD_OUT_TWS.includes(row.twsKt),
    polar: { twaDeg: row.twaDeg, bsKt: row.bsKt, heelDeg: row.heelDeg },
    model: {
      twaDeg: Math.abs(r.twaDeg),
      bsKt: r.bsKt.value,
      heelDeg: Math.abs(r.heelDeg.value),
      vmgKt: r.vmgKt.value,
      flat: r.aero.flat,
    },
    converged: r.converged,
    bsErrFrac,
    twaErrDeg,
    limitBsFrac,
    limitTwaDeg,
    pass:
      r.converged &&
      bsErrFrac <= limitBsFrac &&
      (limitTwaDeg === null || (twaErrDeg ?? 0) <= limitTwaDeg),
  };
}

/** The upwind (jib) and downwind (asym) VMG rows at one TWS. */
export function vmgRows(polar: Polar, twsKt: number): PolarRow[] {
  const up = polar.rows.find((r) => r.twsKt === twsKt && r.sail === 'jib' && r.kind === 'vmgUp');
  const dn = polar.rows.find((r) => r.twsKt === twsKt && r.sail === 'asym' && r.kind === 'vmgDn');
  return [up, dn].filter((r): r is PolarRow => r !== undefined);
}

/**
 * The printed 60/90/120° rows at one TWS. The Speed Guide prints fixed-angle
 * rows for the jib table only (the asymmetric table prints its VMG row
 * alone), so all three come back as jib rows and are solved as such.
 */
export function angleRows(polar: Polar, twsKt: number): PolarRow[] {
  return GATE_ANGLES.map((a) =>
    polar.rows.find((r) => r.twsKt === twsKt && r.kind === 'angle' && r.twaDeg === a),
  ).filter((r): r is PolarRow => r !== undefined);
}

/** Every row the gate is defined over: all rows at the held-out wind speeds (ADR 0012). */
export function gateRows(polar: Polar): PolarRow[] {
  const out: PolarRow[] = [];
  for (const tws of HELD_OUT_TWS) out.push(...vmgRows(polar, tws), ...angleRows(polar, tws));
  return out;
}

/** Fixed-width table of comparisons, for a failure message or the report. */
export function table(rows: Comparison[]): string {
  const head = ['row', 'polar bs', 'model bs', 'bs err', 'polar twa', 'model twa', 'twa err', ''];
  const body = rows.map((c) => [
    c.label + (c.heldOut ? ' *' : ''),
    c.polar.bsKt.toFixed(2),
    c.model.bsKt.toFixed(2),
    `${(c.bsErrFrac * 100).toFixed(1)}%`,
    c.polar.twaDeg.toFixed(1),
    c.model.twaDeg.toFixed(1),
    c.twaErrDeg === null ? '-' : c.twaErrDeg.toFixed(1),
    c.pass ? 'ok' : 'FAIL',
  ]);
  const w = head.map((_, i) => Math.max(...[head, ...body].map((r) => r[i].length)));
  const line = (r: string[]) =>
    r
      .map((v, i) => v.padEnd(w[i]))
      .join('  ')
      .trimEnd();
  return [line(head), ...body.map(line)].join('\n');
}
