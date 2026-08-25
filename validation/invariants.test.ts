/**
 * The eighteen solver invariants (12 from the MVP plan phase 02; 13 added with
 * the per-control trim optimum, ux-excellence phase 02; 14 with the backstay
 * direction fix; 15-18 with the cockpit instrument outputs).
 *
 * These are statements about signs, symmetry and monotonicity, not about
 * magnitudes: they must hold with an empty `calibration` block and still hold
 * after the fit lands. Invariant 18 is the one exception — `pctPolar` is a
 * ratio against the reference polar, so it has to read it — and it asserts a
 * band taken from the model's own published residuals, not a new tolerance.
 */
import { describe, expect, it } from 'vitest';
import type {
  BoatDefinition,
  Condition,
  DockControls,
  Forecast,
  RaceControls,
  SailSet,
  SeaState,
} from '../src/core/types';
import { validateBoat } from '../src/core/boat/validate';
import { hydroForces } from '../src/core/hydro';
import { addedResistanceWaves } from '../src/core/hydro/waves';
import { crewArmM } from '../src/core/hydro/righting';
import { peakBendMm, rigState } from '../src/core/rig/state';
import { baseDock, baseRace } from '../src/core/shape/base';
import { flyingShape } from '../src/core/shape/flying';
import { geometryFor, solveEquilibrium } from '../src/core/solve/equilibrium';
import { optimal } from '../src/core/solve/optimal';
import { scoreDockSetups } from '../src/core/solve/dock';
import { trimmed } from '../src/core/solve/trimmed';
import { TRIM_CONTROLS, optimalTrim, snap } from '../src/core/solve/optimalTrim';
import {
  angleRows,
  boat,
  HELD_OUT_TWS,
  loadPolar,
  POLAR_CREW_KG,
  POLAR_SEA_STATE,
  vmgRows,
} from './compare';
import j70 from '../data/boats/j70.json';

const GEOM = geometryFor(boat);
const CREW_KG = 320;

const cond = (twsKt: number, twaDeg: number, sailset: SailSet = 'jib', seaState: SeaState = 1) =>
  ({ twsKt, twaDeg, seaState, crewKg: CREW_KG, sailset }) satisfies Condition;

const controls = (dock: DockControls = baseDock(), race: RaceControls = baseRace()) => ({
  dock,
  race,
});

/** Eight conditions spanning the printed polar range, both sail sets. */
const CONDITIONS: Condition[] = [
  cond(6, 44),
  cond(8, 42),
  cond(10, 42),
  cond(12, 40),
  cond(16, 38),
  cond(20, 38),
  cond(10, 90),
  cond(14, 150, 'asym'),
];

// ---------------------------------------------------------------------------
// 1. Determinism
// ---------------------------------------------------------------------------

describe('1. determinism', () => {
  it('the same request twice gives deep-equal results', () => {
    const c = cond(12, 42);
    expect(trimmed(boat, controls(), c)).toEqual(trimmed(boat, controls(), c));
    const opts = { optimiseTwa: true } as const;
    expect(optimal(boat, baseDock(), c, opts)).toEqual(optimal(boat, baseDock(), c, opts));
  });

  it('call order does not change either result', () => {
    const a = cond(8, 42);
    const b = cond(18, 150, 'asym');
    const ab = [trimmed(boat, controls(), a), trimmed(boat, controls(), b)];
    const ba = [trimmed(boat, controls(), b), trimmed(boat, controls(), a)];
    expect(ab[0]).toEqual(ba[1]);
    expect(ab[1]).toEqual(ba[0]);
  });
});

// ---------------------------------------------------------------------------
// 2. Mirror symmetry
// ---------------------------------------------------------------------------

describe('2. mirror symmetry', () => {
  for (const [twa, sail] of [
    [42, 'jib'],
    [90, 'jib'],
    [150, 'asym'],
  ] as const) {
    it(`TWA ${twa} mirrors to −${twa}`, () => {
      const stbd = trimmed(boat, controls(), cond(12, twa, sail));
      const port = trimmed(boat, controls(), cond(12, -twa, sail));
      expect(port.bsKt.value).toBeCloseTo(stbd.bsKt.value, 10);
      expect(port.heelDeg.value).toBeCloseTo(-stbd.heelDeg.value, 10);
      expect(port.leewayDeg.value).toBeCloseTo(-stbd.leewayDeg.value, 10);
    });
  }
});

// ---------------------------------------------------------------------------
// 3. Residuals
// ---------------------------------------------------------------------------

describe('3. residuals', () => {
  it.each(CONDITIONS)('converges with max |residual| < 1e-5 at $twsKt kt / $twaDeg°', (c) => {
    const r = trimmed(boat, controls(), c, GEOM);
    expect(r.converged).toBe(true);
    expect(Math.max(...r.residuals.map(Math.abs))).toBeLessThan(1e-5);
  });
});

// ---------------------------------------------------------------------------
// 4. Resistance
// ---------------------------------------------------------------------------

describe('4. resistance', () => {
  const resistance = (bsKt: number, seaState: SeaState = 1) =>
    hydroForces(boat, { bsKt, heelDeg: 0, leewayDeg: 0, seaState, crewKg: CREW_KG }).resistanceN;

  it('is zero at rest', () => {
    expect(resistance(0)).toBe(0);
  });

  it('is strictly increasing from 1 to 12 kt', () => {
    let prev = resistance(1) - 1;
    for (let v = 1; v <= 12; v += 0.5) {
      const r = resistance(v);
      expect(r, `resistance at ${v} kt`).toBeGreaterThan(prev);
      prev = r;
    }
  });

  it('added wave resistance is >= 0, zero in a flat sea, and rises with sea state', () => {
    for (const v of [1, 3, 5, 7]) {
      expect(addedResistanceWaves(boat, v, 0)).toBe(0);
      let prev = -1;
      for (const ss of [0, 1, 2, 3, 4] as const) {
        const w = addedResistanceWaves(boat, v, ss);
        expect(w, `waves at ${v} m/s, sea state ${ss}`).toBeGreaterThanOrEqual(0);
        expect(w, `waves at ${v} m/s, sea state ${ss}`).toBeGreaterThan(prev);
        prev = w;
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Righting
// ---------------------------------------------------------------------------

describe('5. righting', () => {
  const rm = (crewKg: number, heelDeg: number) =>
    hydroForces(boat, { bsKt: 5, heelDeg, leewayDeg: 3, seaState: 1, crewKg }).rightingNm;

  it('increases with crew weight', () => {
    let prev = -Infinity;
    for (let kg = boat.crew.minKg; kg <= boat.crew.maxKg; kg += 5) {
      const v = rm(kg, 15);
      expect(v, `RM at ${kg} kg`).toBeGreaterThan(prev);
      prev = v;
    }
  });

  it('never puts the crew CG outboard of the lifeline (beam/2)', () => {
    expect(crewArmM(boat)).toBeLessThanOrEqual(boat.hull.beamM / 2);
  });

  it('increases with heel out to 30°', () => {
    let prev = -Infinity;
    for (let phi = 0; phi <= 30; phi += 1) {
      const v = rm(CREW_KG, phi);
      expect(v, `RM at ${phi}°`).toBeGreaterThan(prev);
      prev = v;
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Depowering
// ---------------------------------------------------------------------------

describe('6. depowering', () => {
  it('heeling moment is non-increasing as flat falls from 1 to 0.5', () => {
    for (const c of [cond(10, 42), cond(14, 42), cond(18, 40)]) {
      let prev = Infinity;
      for (let flat = 1; flat >= 0.5 - 1e-9; flat -= 0.05) {
        const eq = solveEquilibrium(
          boat,
          { condition: c, tune: { flat, reef: 1, twistEffDeg: 10 } },
          GEOM,
        );
        expect(eq.aero.mxNm, `Mx at ${c.twsKt} kt, flat ${flat.toFixed(2)}`).toBeLessThanOrEqual(
          prev * (1 + 1e-6),
        );
        prev = eq.aero.mxNm;
      }
    }
  });

  it('the optimal flat is non-increasing with TWS upwind', () => {
    let prev = Infinity;
    for (const tws of [6, 8, 10, 12, 14, 16, 18, 20]) {
      const flat = optimal(boat, baseDock(), cond(tws, 45), { optimiseTwa: true }, GEOM).aero.flat;
      // prov: assumed 1 % slack; `flat` comes out of a golden-section search.
      expect(flat, `optimal flat at ${tws} kt`).toBeLessThanOrEqual(prev + 0.01);
      prev = flat;
    }
  });
});

// ---------------------------------------------------------------------------
// 7. VMG optimum sits inside the bracket
// ---------------------------------------------------------------------------

describe('7. VMG optimum is interior', () => {
  for (const tws of [6, 10, 14, 20]) {
    it(`TWS ${tws}: upwind in (35, 60), downwind in (120, 178), |VMG| <= bs`, () => {
      const up = optimal(boat, baseDock(), cond(tws, 45), { optimiseTwa: true }, GEOM);
      expect(up.twaDeg).toBeGreaterThan(35);
      expect(up.twaDeg).toBeLessThan(60);
      expect(Math.abs(up.vmgKt.value)).toBeLessThanOrEqual(up.bsKt.value);

      const dn = optimal(boat, baseDock(), cond(tws, 150, 'asym'), { optimiseTwa: true }, GEOM);
      expect(dn.twaDeg).toBeGreaterThan(120);
      expect(dn.twaDeg).toBeLessThan(178);
      expect(Math.abs(dn.vmgKt.value)).toBeLessThanOrEqual(dn.bsKt.value);
    });
  }
});

// ---------------------------------------------------------------------------
// 8. Rig sign-correctness over the full control range
// ---------------------------------------------------------------------------

describe('8. rig signs over the full control range', () => {
  const sweep = (spec: { min: number; max: number }, n = 12) =>
    Array.from({ length: n + 1 }, (_, i) => spec.min + ((spec.max - spec.min) * i) / n);

  it('backstay up: peak bend up, sag down, main half-draft down, main twist up', () => {
    let prev: { bend: number; sag: number; draft: number; twist: number } | null = null;
    for (const backstay of sweep(boat.controls.backstay)) {
      const rig = rigState(boat, baseDock(), backstay);
      const main = flyingShape(boat, rig, { ...baseRace(), backstay }, 'main');
      const now = {
        bend: peakBendMm(rig),
        sag: rig.sagMm,
        draft: main.half.draft,
        twist: main.half.twistDeg,
      };
      if (prev) {
        expect(now.bend, `peak bend at ${backstay} %`).toBeGreaterThan(prev.bend);
        expect(now.sag, `sag at ${backstay} %`).toBeLessThan(prev.sag);
        expect(now.draft, `main half draft at ${backstay} %`).toBeLessThan(prev.draft);
        expect(now.twist, `main half twist at ${backstay} %`).toBeGreaterThan(prev.twist);
      }
      prev = now;
    }
  });

  it('forestay length up: rake up', () => {
    let prev = -Infinity;
    for (const forestayMm of sweep(boat.controls.forestayMm)) {
      const rake = rigState(boat, { ...baseDock(), forestayMm }, 30).rakeMm;
      expect(rake, `rake at ${forestayMm} mm`).toBeGreaterThan(prev);
      prev = rake;
    }
  });

  it('upper turns up: forestay tension up', () => {
    let prev = -Infinity;
    for (const upperTurns of sweep(boat.controls.upperTurns)) {
      const rig = rigState(boat, { ...baseDock(), upperTurns }, 30);
      expect(rig.forestayN, `forestay N at ${upperTurns} turns`).toBeGreaterThan(prev);
      prev = rig.forestayN;
    }
  });

  // src/core/rig/state.ts header: "lower turns up -> prebend down (tighter
  // lowers straighten the mast)". That documented sign is what is asserted.
  it('lower turns up: prebend down', () => {
    let prev = Infinity;
    for (const lowerTurns of sweep(boat.controls.lowerTurns)) {
      const rig = rigState(boat, { ...baseDock(), lowerTurns }, 30);
      expect(rig.prebendMm, `prebend at ${lowerTurns} turns`).toBeLessThan(prev);
      prev = rig.prebendMm;
    }
  });
});

// ---------------------------------------------------------------------------
// 9. Dock controls are immutable in race mode
// ---------------------------------------------------------------------------

describe('9. race trim cannot move the dock rig', () => {
  it('rake and shroud tensions depend only on the dock controls', () => {
    const dock: DockControls = { upperTurns: 2, lowerTurns: 1, forestayMm: 20 };
    const ref = trimmed(boat, controls(dock), cond(12, 42), GEOM).rig;
    const races: RaceControls[] = [
      baseRace(),
      { ...baseRace(), backstay: 0, mainsheet: 0, outhaul: 0, vang: 0, cunningham: 0 },
      { ...baseRace(), backstay: 100, mainsheet: 100, outhaul: 100, vang: 100, cunningham: 100 },
      { ...baseRace(), jibLead: 10, inhauler: 100, jibHalyard: 100, traveller: -100 },
    ];
    for (const race of races) {
      const rig = trimmed(boat, controls(dock, race), cond(12, 42), GEOM).rig;
      expect(rig.rakeMm).toBe(ref.rakeMm);
      expect(rig.upperN).toBe(ref.upperN);
      expect(rig.lowerN).toBe(ref.lowerN);
    }
  });

  it('RaceControls shares no key with DockControls (compile-time)', () => {
    type Overlap = Extract<keyof RaceControls, keyof DockControls>;
    // If a dock key ever appears on RaceControls this stops type-checking.
    const disjoint = true satisfies [Overlap] extends [never] ? true : never;
    expect(disjoint).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 10. Dock scoring
// ---------------------------------------------------------------------------

describe('10. dock score', () => {
  const setups: DockControls[] = [
    { upperTurns: 0, lowerTurns: 0, forestayMm: 0 },
    { upperTurns: 4, lowerTurns: 2, forestayMm: 0 },
    { upperTurns: -3, lowerTurns: -2, forestayMm: 30 },
  ];
  const forecast = (minKt: number, likelyKt: number, maxKt: number): Forecast => ({
    minKt,
    likelyKt,
    maxKt,
    seaState: 1,
    crewKg: CREW_KG,
  });

  it('a single-TWS forecast gives non-negative regret, zero for the winner', () => {
    const scored = scoreDockSetups(boat, setups, forecast(12, 12, 12), setups);
    const regrets = scored.map((s) => s.expectedRegretSPerMile.value);
    for (const r of regrets) expect(r).toBeGreaterThanOrEqual(0);
    expect(Math.min(...regrets)).toBeCloseTo(0, 9);
  });

  it('a wider forecast never scores a setup better than a narrow one', () => {
    const narrow = scoreDockSetups(boat, setups, forecast(12, 12, 12), setups);
    const wide = scoreDockSetups(boat, setups, forecast(8, 12, 16), setups);
    for (let i = 0; i < setups.length; i++)
      expect(
        wide[i].expectedRegretSPerMile.value,
        `setup ${JSON.stringify(setups[i])}`,
      ).toBeGreaterThanOrEqual(narrow[i].expectedRegretSPerMile.value - 1e-9);
  });
});

// ---------------------------------------------------------------------------
// 11. Protocol round-trip
// ---------------------------------------------------------------------------

/** Every number finite, nothing undefined, anywhere in the tree. */
function badLeaves(v: unknown, path = '$'): string[] {
  if (typeof v === 'number') return Number.isFinite(v) ? [] : [`${path} = ${v}`];
  if (v === undefined) return [`${path} = undefined`];
  if (Array.isArray(v)) return v.flatMap((x, i) => badLeaves(x, `${path}[${i}]`));
  if (v !== null && typeof v === 'object')
    return Object.entries(v).flatMap(([k, x]) => badLeaves(x, `${path}.${k}`));
  return [];
}

describe('11. protocol round-trip', () => {
  it('every result survives JSON with no NaN, Infinity or undefined', () => {
    const results: unknown[] = [
      ...CONDITIONS.map((c) => trimmed(boat, controls(), c, GEOM)),
      optimal(boat, baseDock(), cond(12, 45), { optimiseTwa: true }, GEOM),
      optimal(boat, baseDock(), cond(12, 150, 'asym'), { optimiseTwa: true }, GEOM),
      scoreDockSetups(
        boat,
        [baseDock()],
        { minKt: 10, likelyKt: 12, maxKt: 14, seaState: 1, crewKg: CREW_KG },
        [baseDock(), { upperTurns: 4, lowerTurns: 2, forestayMm: 0 }],
      ),
    ];
    for (const r of results) {
      expect(badLeaves(r)).toEqual([]);
      const round = JSON.parse(JSON.stringify(r)) as unknown;
      expect(badLeaves(round)).toEqual([]);
      expect(round).toEqual(r);
    }
  });
});

// ---------------------------------------------------------------------------
// 12. Boat validator
// ---------------------------------------------------------------------------

describe('12. boat validator', () => {
  const broken = (mutate: (b: Record<string, unknown>) => void) => {
    const clone = structuredClone(j70) as unknown as Record<string, unknown>;
    mutate(clone);
    return validateBoat(clone);
  };

  it('accepts the committed J/70', () => {
    expect(validateBoat(j70)).toEqual([]);
  });

  it('rejects a control outside the class purchase limits', () => {
    const p = broken((b) => {
      const c = (b.controls as Record<string, Record<string, number>>).backstay;
      c.purchaseMin = 0;
      c.purchaseMax = 8;
    });
    expect(p.some((m) => m.includes('backstay') && m.includes('purchase'))).toBe(true);
  });

  it('rejects a missing sail', () => {
    const p = broken((b) => {
      delete (b.sails as Record<string, unknown>).jib;
    });
    expect(p.some((m) => m.startsWith('sails.jib'))).toBe(true);
  });

  it('rejects a negative stiffness-like number', () => {
    const p = broken((b) => {
      (b.hull as Record<string, number>).gmM = -0.676;
    });
    expect(p).toContain('hull.gmM: must be positive');
  });

  it('rejects a non-finite calibration value', () => {
    const p = broken((b) => {
      (b.calibration as Record<string, unknown>)['hydro.rrMul.fn30'] = 'nope';
    });
    expect(p.some((m) => m.startsWith('calibration.'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 13. Per-control trim optimum
// ---------------------------------------------------------------------------

describe('13. per-control trim optimum', () => {
  /** Deliberately bad trim: over-flat, over-vanged, sheets eased, lead aft. */
  const mistrim: RaceControls = {
    ...baseRace(),
    backstay: 90,
    mainsheet: 20,
    traveller: -60,
    vang: 90,
    outhaul: 100,
    jibSheet: 20,
    jibLead: 10,
  };

  /** The objective optimalTrim claims to maximise, read off a solve. */
  const objective = (c: Condition, r: { vmgKt: { value: number }; bsKt: { value: number } }) => {
    const twa = Math.abs(c.twaDeg);
    if (twa < 90 && c.sailset === 'jib') return r.vmgKt.value;
    if (twa >= 90 && c.sailset === 'asym') return -r.vmgKt.value;
    return r.bsKt.value;
  };

  for (const c of [cond(10, 42), cond(16, 38), cond(10, 90), cond(14, 150, 'asym')]) {
    it(`TWS ${c.twsKt} TWA ${c.twaDeg}: never worse than the start, on the grid, mirror-symmetric`, () => {
      const start = trimmed(boat, controls(baseDock(), mistrim), c, GEOM);
      const o = optimalTrim(boat, controls(baseDock(), mistrim), c, {}, GEOM);

      // Never worse than where it started, and the reported solve is the
      // solve at the reported controls.
      expect(objective(c, o.result)).toBeGreaterThanOrEqual(objective(c, start));
      expect(o.result.bsKt.value).toBeCloseTo(
        trimmed(boat, controls(baseDock(), o.race), c, GEOM).bsKt.value,
        12,
      );

      // Every control legal, and only the trim controls touched.
      for (const k of Object.keys(o.race) as (keyof RaceControls)[]) {
        expect(o.race[k]).toBe(snap(boat.controls[k], o.race[k]));
        if (!(TRIM_CONTROLS as readonly string[]).includes(k)) expect(o.race[k]).toBe(mistrim[k]);
      }

      // Same answer on the other tack.
      const p = optimalTrim(
        boat,
        controls(baseDock(), mistrim),
        { ...c, twaDeg: -c.twaDeg },
        {},
        GEOM,
      );
      expect(p.race).toEqual(o.race);

      // Deterministic, and a fixed point of itself when it converged early.
      expect(optimalTrim(boat, controls(baseDock(), mistrim), c, {}, GEOM)).toEqual(o);
    });
  }
});

// ---------------------------------------------------------------------------
// 14. Backstay follows the tuning guides' direction
// ---------------------------------------------------------------------------

/**
 * Backstay off in light air, backstay on in breeze — the one thing every
 * tuning guide for the boat agrees on, and the thing the model got backwards
 * (audit ux-02 H-04: the per-control optimum wanted 80 % backstay at 6 kt on
 * flat water and 15 % at 20 kt).
 *
 * Scored at the rig the North guide publishes for each band, because that is
 * the only state at which the guides' backstay numbers are claims about the
 * same boat. Thresholds are one-sided bands well clear of the published
 * numbers, not the numbers themselves: prov: `data/tuning/quantum-j70.json`
 * publishes backstay 25 % at and below 12 kt and 90 % at 20-23 kt, and the
 * model is not calibrated against either guide. Only the direction is asserted.
 */
describe('14. backstay direction matches the tuning guides', () => {
  /**
   * Rig and trim as the North guide publishes them for the band, everything
   * except the backstay. prov: data/tuning/north-j70.json — the <6/6-8 kt rows
   * (uppers -2, lowers -1, outhaul "Loose", vang "0%", traveller above centre,
   * jib lead 4-5 holes) and the 20+ kt row (uppers 6, lowers 5, outhaul 100 %,
   * vang 100 %, traveller 4-6 in below centre). The percentages are this app's
   * own reading of the guide's words onto the 0-100 scales, as in `baseRace()`.
   *
   * The trim matters as much as the rig: scored from `baseRace()` alone the
   * model gets the direction right by accident. H-04 shows up once the other
   * ten controls are already set for the band, which is the state a sailor is
   * actually in when they reach for the backstay.
   */
  const LIGHT: RaceControls = {
    ...baseRace(),
    traveller: 15,
    cunningham: 0,
    outhaul: 25,
    vang: 0,
    jibSheet: 50,
    jibLead: 4,
  };
  const HEAVY: RaceControls = {
    ...baseRace(),
    traveller: -30,
    cunningham: 60,
    outhaul: 100,
    vang: 100,
    jibSheet: 70,
    jibLead: 4,
  };
  const LIGHT_RIG: DockControls = { upperTurns: -2, lowerTurns: -1, forestayMm: 20 };
  const HEAVY_RIG: DockControls = { upperTurns: 6, lowerTurns: 5, forestayMm: 0 };

  const bestBackstay = (c: Condition, dock: DockControls, race: RaceControls) =>
    optimalTrim(boat, controls(dock, race), c, {}, GEOM).race.backstay;

  const light = () => bestBackstay({ ...cond(6, 44), seaState: 0 }, LIGHT_RIG, LIGHT);
  const heavy = () => bestBackstay(cond(20, 38), HEAVY_RIG, HEAVY);

  it('is 40 % or less at 6 kt on flat water (guide: 25 %)', () => {
    expect(light()).toBeLessThanOrEqual(40);
  });

  it('is 60 % or more at 20 kt (guide: 90 %)', () => {
    expect(heavy()).toBeGreaterThanOrEqual(60);
  });

  it('is strictly more backstay at 20 kt than at 6 kt', () => {
    expect(heavy()).toBeGreaterThan(light());
  });
});

// ---------------------------------------------------------------------------
// 15-18. Instrument outputs (cockpit phase 02)
// ---------------------------------------------------------------------------

/**
 * The four cockpit instruments are tier C re-expressions of the invented
 * sheeting and flying-shape layers (three of them) plus one ratio against the
 * reference polar. Nothing here asserts a magnitude those layers do not earn:
 * 15-17 are directions, and 18 is a band read off the model's own published
 * residuals, not a new accuracy claim.
 */
describe('15. main leech stall rises with mainsheet', () => {
  // Trimming the sheet closes the boom towards the centreline, which raises
  // the angle of attack, which is the deviation the stall meter reads.
  for (const c of [cond(6, 42), cond(12, 42), cond(20, 40)]) {
    it(`TWS ${c.twsKt}: non-decreasing across mainsheet 20 / 60 / 100 %`, () => {
      let prev = -Infinity;
      for (const mainsheet of [20, 60, 100]) {
        const r = trimmed(boat, controls(baseDock(), { ...baseRace(), mainsheet }), c, GEOM);
        const f = r.instruments.leechStallFrac.value;
        expect(f, `stall at mainsheet ${mainsheet} %`).toBeGreaterThanOrEqual(prev);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
        prev = f;
      }
      // And the top of the range is genuinely more stalled than the bottom.
      expect(prev).toBeGreaterThan(0);
    });
  }
});

describe('16. jib leech stripe moves outboard as the lead goes aft', () => {
  it('strictly increases across the lead car', () => {
    const c = cond(12, 42);
    let prev = -Infinity;
    for (const jibLead of [0, 2, 4, 6, 8, 10]) {
      const r = trimmed(boat, controls(baseDock(), { ...baseRace(), jibLead }), c, GEOM);
      const s = r.instruments.jibLeechStripe;
      expect(s, `stripe at jib lead ${jibLead}`).toBeDefined();
      expect(s!.value, `stripe at jib lead ${jibLead}`).toBeGreaterThan(prev);
      prev = s!.value;
    }
  });

  it('is absent under the kite: there is no jib to read', () => {
    const r = trimmed(boat, controls(), cond(14, 150, 'asym'), GEOM);
    expect('jibLeechStripe' in r.instruments).toBe(false);
  });
});

describe('17. helm load rises as the crew comes off the rail', () => {
  it('increases as crew weight is removed at a fixed trim', () => {
    const race = baseRace();
    let prev = -Infinity;
    for (const crewKg of [320, 280, 240, 200]) {
      const r = trimmed(boat, controls(baseDock(), race), { ...cond(12, 42), crewKg }, GEOM);
      expect(r.instruments.helmLoad.value, `helm at ${crewKg} kg`).toBeGreaterThan(prev);
      prev = r.instruments.helmLoad.value;
    }
  });

  it('is weather-positive on both tacks', () => {
    const stbd = trimmed(boat, controls(), cond(12, 42), GEOM).instruments.helmLoad.value;
    const port = trimmed(boat, controls(), cond(12, -42), GEOM).instruments.helmLoad.value;
    expect(stbd).toBeGreaterThan(0);
    expect(port).toBeCloseTo(stbd, 10);
  });
});

/**
 * 18. `pctPolar` on the rows the calibration was fitted to.
 *
 * The tolerance is ±10 points, not ADR 0007's 3 %/5 %. Those tolerances are
 * the *held-out* gate; the fit rows themselves already miss them, and
 * `validation/report.md` records why (the upwind speed plateau and the
 * asymmetric optimum angle, both in ASSUMPTIONS.md "where the model is
 * honestly weak"). Its largest fit-row boat-speed residual is 10.8 %, so ±10
 * on this reading is a guard against a regression in the lookup or the solve,
 * which is what an invariant can honestly claim here — not a re-statement of
 * a gate this model does not pass on these rows.
 *
 * The tier asserted is the sail's, not a flat A: `pctPolar` takes the lower
 * of the grid tier and the tier of the boat speed it divides, so a fit row
 * under the kite reads B (audit docs-consistency-01 M-07). Every row here is
 * inside the printed grid, which is what a C would disprove.
 */
describe('18. pctPolar on the calibration fit rows', () => {
  const polar = loadPolar();
  if (!polar) {
    it.skip('reference polar not present', () => {});
  } else {
    const fitTws = polar.twsKt.filter((t) => !HELD_OUT_TWS.includes(t));
    for (const tws of fitTws) {
      it(`TWS ${tws}: every fitted row reads 100 ± 10 % of polar, in grid`, () => {
        const rows = [...vmgRows(polar, tws), ...angleRows(polar, tws)];
        expect(rows.length, 'no fitted rows at this TWS').toBeGreaterThan(0);
        for (const row of rows) {
          const r = optimal(
            boat,
            baseDock(),
            {
              twsKt: tws,
              twaDeg: row.twaDeg,
              seaState: POLAR_SEA_STATE,
              crewKg: POLAR_CREW_KG,
              sailset: row.sail,
            },
            { optimiseTwa: false },
            GEOM,
          );
          const p = r.instruments.pctPolar;
          const label = `${row.sail} ${row.kind} ${row.twaDeg}° -> ${p.value.toFixed(1)} %`;
          expect(p.tier, label).toBe(row.sail === 'jib' ? 'A' : 'B');
          expect(Math.abs(p.value - 100), label).toBeLessThanOrEqual(10);
        }
      });
    }
  }
});

// Type-level guard: the boat file really is a BoatDefinition.
const _typed: BoatDefinition = boat;
void _typed;
