/**
 * The twelve solver invariants (plan phase 02).
 *
 * These are statements about signs, symmetry and monotonicity, not about
 * magnitudes: they must hold with an empty `calibration` block and still hold
 * after the fit lands. Nothing here reads the reference polar.
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
import { boat } from './compare';
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

// Type-level guard: the boat file really is a BoatDefinition.
const _typed: BoatDefinition = boat;
void _typed;
