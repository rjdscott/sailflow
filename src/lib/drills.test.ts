import { describe, expect, it } from 'vitest';
import {
  MEDAL_BANDS,
  RACE_KEYS,
  SEED_TRIES,
  START_LOSS_MIN_PCT,
  TEMPLATES,
  coachLine,
  distanceSteps,
  fixedControls,
  generateDrill,
  generateDrillAsync,
  guideNoteFor,
  lossPct,
  medalFor,
  objectiveKt,
  optimalTwaDeg,
  perControlDelta,
  scoreDrill,
  snapControl,
  type Drill,
  type DrillClient,
} from './drills';
import { TRIM_CONTROLS, type TrimControl } from '../worker/protocol';
import type { BoatDefinition, RaceControls, SolveResult } from '../core/types';
// The generator is validated against the real physics, not a stub: an
// authoring gate that ran on a stub would pass a drill the solver cannot
// grade. This is the only place `src/lib` reaches into `src/core`, and it is
// test-only — the app still goes through the worker protocol (ADR 0003).
import { geometryFor } from '../core/solve/equilibrium';
import { optimalTrim } from '../core/solve/optimalTrim';
import { trimmed } from '../core/solve/trimmed';
import j70 from '../../data/boats/j70.json';

const boat = j70 as unknown as BoatDefinition;
const GEOM = geometryFor(boat);
const CONTROLS = j70.controls as Record<string, { min: number; max: number; step: number }>;

/** A `DrillClient` that runs the real solver in-process. */
const coreClient = {
  request: (req: {
    type: string;
    controls: { dock: never; race: RaceControls };
    condition: never;
    fixed?: readonly string[];
  }) =>
    Promise.resolve(
      req.type === 'trimmed'
        ? trimmed(boat, req.controls, req.condition, GEOM)
        : optimalTrim(boat, req.controls, req.condition, { fixed: req.fixed }, GEOM),
    ),
} as unknown as DrillClient;

const tiered = (v: number) => ({ value: v, tier: 'A' as const });
const solveOf = (vmgKt: number, bsKt = vmgKt * 1.4) =>
  ({ vmgKt: tiered(vmgKt), bsKt: tiered(bsKt) }) as unknown as SolveResult;

const upwindDrill = {
  objective: 'vmg' as const,
  condition: { twsKt: 10, twaDeg: 42, seaState: 1 as const, crewKg: 280, sailset: 'jib' as const },
  free: ['backstay', 'mainsheet'] as TrimControl[],
};

describe('generateDrill', () => {
  it('is deterministic: the same seed always yields the same drill', () => {
    for (const t of TEMPLATES) {
      const a = generateDrill(t, 3);
      const b = generateDrill(t, 3);
      expect(b).toEqual(a);
      expect(a.id).toBe(`${t.id}#3`);
    }
  });

  it('varies with the seed and with the template', () => {
    const t = TEMPLATES[0];
    const seeds = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((s) => JSON.stringify(generateDrill(t, s).start)),
    );
    expect(seeds.size).toBeGreaterThan(1);
    // Two templates on the same seed must not share a PRNG stream.
    const first = generateDrill(TEMPLATES[0], 1);
    const second = generateDrill(TEMPLATES[1], 1);
    expect(second.start).not.toEqual(first.start);
  });

  it('samples inside the template ranges and lands on the legal grid', () => {
    for (const t of TEMPLATES) {
      for (let s = 1; s <= SEED_TRIES; s++) {
        const d = generateDrill(t, s);
        expect(d.condition.twsKt).toBeGreaterThanOrEqual(t.conditions.twsKt[0]);
        expect(d.condition.twsKt).toBeLessThanOrEqual(t.conditions.twsKt[1]);
        expect(t.conditions.seaState).toContain(d.condition.seaState);
        expect(d.condition.sailset).toBe(t.conditions.sailset);
        for (const [key, value] of Object.entries(d.start)) {
          const spec = CONTROLS[key];
          expect(value, `${d.id}.${key}`).toBeGreaterThanOrEqual(spec.min);
          expect(value, `${d.id}.${key}`).toBeLessThanOrEqual(spec.max);
          expect(snapControl(key, value), `${d.id}.${key} off step`).toBe(value);
        }
      }
    }
  });

  it('moves every fault control off the base, in the sign the template asks for', () => {
    for (const t of TEMPLATES) {
      for (const f of t.faults) {
        // Over seeds, at least one must actually move (a clamp can eat one).
        const moved = [1, 2, 3, 4, 5, 6, 7, 8]
          .map((s) => generateDrill(t, s).start[f.control] - t.base[f.control])
          .filter((d) => d !== 0);
        expect(moved.length, `${t.id}.${f.control} never moves`).toBeGreaterThan(0);
        if (f.sign)
          for (const d of moved) expect(Math.sign(d), `${t.id}.${f.control}`).toBe(f.sign);
      }
    }
  });

  it('takes the TWA from the ORC polar when the template asks for the optimum', () => {
    // data/polar/orc-j70.json: jib vmgUp is 40.7 deg at 8 kt, 41.2 at 10 kt.
    expect(optimalTwaDeg(8, 'jib')).toBeCloseTo(40.7, 6);
    expect(optimalTwaDeg(9, 'jib')).toBe(41); // interpolated, rounded to 0.1
    expect(optimalTwaDeg(2, 'jib')).toBeCloseTo(44.1, 6); // clamped below the table
    expect(optimalTwaDeg(30, 'jib')).toBeCloseTo(38.3, 6); // clamped above it
    expect(optimalTwaDeg(6, 'asym')).toBeCloseTo(141.9, 6);
    const d = generateDrill(TEMPLATES[0], 1);
    expect(d.condition.twaDeg).toBe(optimalTwaDeg(d.condition.twsKt, 'jib'));
  });
});

describe('the committed J/70 template set', () => {
  it('has at least eight templates with unique ids across all three tiers', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(8);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    expect(new Set(TEMPLATES.map((t) => t.tier))).toEqual(new Set([1, 2, 3]));
  });

  it('names only controls the solver can feel as fault or free controls', () => {
    // Audit ux-02 H-03: the shape layer never reads the halyards, the inhauler
    // or any gennaker control, so a drill built on them has no feedback loop.
    for (const t of TEMPLATES) {
      for (const c of t.free) expect(TRIM_CONTROLS, `${t.id} free ${c}`).toContain(c);
      for (const f of t.faults) {
        expect(TRIM_CONTROLS, `${t.id} fault ${f.control}`).toContain(f.control);
        expect(t.free, `${t.id}: fault ${f.control} is not free`).toContain(f.control);
      }
      expect(new Set(t.free).size).toBe(t.free.length);
      expect(t.free.length).toBeGreaterThan(0);
    }
  });

  it('bases every template inside the boat definition and on the step grid', () => {
    for (const t of TEMPLATES) {
      const all = { ...t.base, ...t.dock } as Record<string, number>;
      for (const [key, value] of Object.entries(all)) {
        const spec = CONTROLS[key];
        expect(spec, `${t.id}: unknown control ${key}`).toBeDefined();
        expect(value, `${t.id}.${key}`).toBeGreaterThanOrEqual(spec.min);
        expect(value, `${t.id}.${key}`).toBeLessThanOrEqual(spec.max);
      }
      expect(Object.keys(t.base).sort()).toEqual([...RACE_KEYS].sort());
    }
  });

  it('poses every drill in the 6-20 kt band the model is fitted over', () => {
    for (const t of TEMPLATES) {
      expect(t.conditions.twsKt[0], t.id).toBeGreaterThanOrEqual(6);
      expect(t.conditions.twsKt[1], t.id).toBeLessThanOrEqual(20);
      expect(t.conditions.twsKt[0]).toBeLessThanOrEqual(t.conditions.twsKt[1]);
    }
  });

  it('gives every template a brief, a hint and a provenance note', () => {
    for (const t of TEMPLATES) {
      expect(t.brief.length, t.id).toBeGreaterThan(40);
      expect(t.hint.length, t.id).toBeGreaterThan(20);
      expect(t.prov.length, t.id).toBeGreaterThan(20);
    }
  });
});

describe('validity against the real solver', () => {
  // Audit ux-02 H-02: eight of the ten v1 drills paid a medal for zero input.
  // This is the authoring gate that stops that shipping again — it runs the
  // physics, so a shape-layer change that makes a drill free re-breaks CI.
  it.each(TEMPLATES.map((t) => [t.id, t] as const))(
    '%s has a costly, converged start within the seed budget',
    async (_id, template) => {
      const g = await generateDrillAsync(coreClient, template, 1, SEED_TRIES);
      expect(g.valid).toBe(true);
      expect(g.startLossPct).toBeGreaterThanOrEqual(START_LOSS_MIN_PCT);
      expect(g.startResult.converged).toBe(true);
      // The key is reachable from the start using only the free controls.
      for (const c of fixedControls(template.free))
        expect(g.optimum.race[c]).toBe(g.drill.start[c]);
      // And the start is not already on it.
      expect(distanceSteps(g.drill.start, g.optimum.race, g.drill.free)).toBeGreaterThan(0);
    },
    30000,
  );

  it('scores the answer key itself as gold', async () => {
    const t = TEMPLATES[0];
    const g = await generateDrillAsync(coreClient, t, 1);
    const s = scoreDrill(
      { race: g.optimum.race, result: g.optimum.result },
      { race: g.optimum.race, result: g.optimum.result },
      g.drill,
    );
    expect(s.distanceSteps).toBe(0);
    expect(s.lossPct).toBe(0);
    expect(s.medal).toBe('gold');
  });

  it('scores the untouched start below gold on every template', async () => {
    for (const t of TEMPLATES) {
      const g = await generateDrillAsync(coreClient, t, 1);
      const s = scoreDrill(
        { race: g.drill.start, result: g.startResult },
        { race: g.optimum.race, result: g.optimum.result },
        g.drill,
      );
      expect(s.medal, `${t.id} is winnable without touching a control`).not.toBe('gold');
    }
  }, 60000);
});

describe('scoreDrill', () => {
  const race: RaceControls = {
    backstay: 40,
    mainsheet: 60,
    traveller: 0,
    cunningham: 0,
    outhaul: 50,
    vang: 0,
    jibSheet: 50,
    jibLead: 5,
    inhauler: 0,
    mainHalyard: 50,
    jibHalyard: 50,
  };
  const key = { race, result: solveOf(5) };

  it('measures distance as legal steps over the free controls only', () => {
    // backstay step is 5 %, mainsheet 5 %, and `outhaul` is locked here.
    const user = { ...race, backstay: 50, mainsheet: 55, outhaul: 0 };
    expect(distanceSteps(user, race, ['backstay', 'mainsheet'])).toBe(3);
    expect(distanceSteps(user, race, ['backstay'])).toBe(2);
  });

  it('bands the medal on distance, with loss as the second gate', () => {
    const at = (steps: number, vmg: number) =>
      scoreDrill(
        { race: { ...race, backstay: race.backstay + steps * 5 }, result: solveOf(vmg) },
        key,
        upwindDrill,
      ).medal;
    expect(at(0, 4.99)).toBe('gold');
    expect(at(2, 4.9)).toBe('silver'); // 2 steps, 2.0 % loss
    expect(at(5, 4.75)).toBe('bronze'); // 5 steps, 5.0 % loss
    expect(at(6, 4.99)).toBe('none'); // right on the numbers, wrong shape
    // Loss demotes a trim that is on the key's shape but measurably slow: at
    // 2 steps and 5 % loss the silver band's loss ceiling (3 %) is breached.
    expect(at(2, 4.75)).toBe('bronze');
  });

  it('awards gold for matching or beating the key however far the controls sit', () => {
    // The key is a local optimum from the start, so a learner can land
    // somewhere better than the descent ever looked.
    const s = scoreDrill(
      { race: { ...race, backstay: 100 }, result: solveOf(5.2) },
      key,
      upwindDrill,
    );
    expect(s.distanceSteps).toBe(12);
    expect(s.lossPct).toBe(0);
    expect(s.medal).toBe('gold');
  });

  it('reports the loss percent, clamped to [0, 100]', () => {
    expect(lossPct(solveOf(4.75), solveOf(5), upwindDrill)).toBeCloseTo(5, 10);
    expect(lossPct(solveOf(5.4), solveOf(5), upwindDrill)).toBe(0);
    expect(lossPct(solveOf(0.0001), solveOf(5), upwindDrill)).toBeLessThanOrEqual(100);
  });

  it('uses magnitude downwind, where both VMGs are negative', () => {
    const dn = {
      ...upwindDrill,
      condition: { ...upwindDrill.condition, twaDeg: 145, sailset: 'asym' as const },
    };
    expect(objectiveKt(solveOf(-5), dn)).toBe(5);
    expect(lossPct(solveOf(-4.9), solveOf(-5), dn)).toBeCloseTo(2, 10);
    // Sailing up the course under the kite is a total loss, not a small one.
    expect(lossPct(solveOf(4.9), solveOf(-5), dn)).toBe(100);
    expect(lossPct(solveOf(-4.9), solveOf(5), upwindDrill)).toBe(100);
  });

  it('scores boat speed when the objective says so', () => {
    const reach = { ...upwindDrill, objective: 'speed' as const };
    expect(objectiveKt(solveOf(3, 7), reach)).toBe(7);
    expect(lossPct(solveOf(3, 6.3), solveOf(3, 7), reach)).toBeCloseTo(10, 10);
  });

  it('keeps the documented band edges', () => {
    expect(MEDAL_BANDS.map((b) => [b.medal, b.maxSteps, b.maxLossPct])).toEqual([
      ['gold', 0, 1],
      ['silver', 2, 3],
      ['bronze', 5, 6],
    ]);
    expect(medalFor(0, 0)).toBe('gold');
    expect(medalFor(3, 0)).toBe('bronze');
    expect(medalFor(99, 0)).toBe('none');
  });
});

describe('model versus guide', () => {
  it('quotes the guide beside the model answer for a published control', () => {
    // North publishes a traveller setting in every band; the model's optimum
    // is a number. Both are shown; the grade stays the model's (decision 32).
    const note = guideNoteFor(
      { condition: { ...upwindDrill.condition, twsKt: 14 }, free: ['traveller'] },
      { ...({ traveller: 20 } as RaceControls) },
    );
    expect(note).toMatch(/North/);
    expect(note).toMatch(/traveller/i);
    expect(note).toMatch(/20/);
    expect(note).toMatch(/graded on the model/i);
  });

  it('says nothing when no guide publishes a value for any free control', () => {
    expect(
      guideNoteFor({ condition: upwindDrill.condition, free: ['mainsheet'] }, {} as RaceControls),
    ).toBeUndefined();
  });
});

describe('perControlDelta', () => {
  const base: RaceControls = {
    backstay: 40,
    mainsheet: 50,
    traveller: 0,
    cunningham: 0,
    outhaul: 50,
    vang: 0,
    jibSheet: 50,
    jibLead: 5,
    inhauler: 0,
    mainHalyard: 50,
    jibHalyard: 50,
  };

  it('rounds each delta into whole control steps, signed toward the optimum', () => {
    const opt = { ...base, backstay: 30, jibLead: 7 };
    expect(
      perControlDelta(base, opt, ['backstay', 'jibLead']).map((d) => [d.key, d.steps]),
    ).toEqual([
      ['backstay', -2],
      ['jibLead', 2],
    ]);
  });

  it('sorts by absolute step count, largest first, and only over free controls', () => {
    const opt = { ...base, backstay: 45, mainsheet: 75, vang: 0, outhaul: 20 };
    const out = perControlDelta(base, opt, ['backstay', 'mainsheet', 'vang']);
    expect(out.map((d) => d.key)).toEqual(['mainsheet', 'backstay', 'vang']);
    expect(out.map((d) => d.steps)).toEqual([5, 1, 0]);
    expect(out.some((d) => d.key === 'outhaul')).toBe(false);
  });

  it('phrases the largest delta as one imperative coach line', () => {
    const out = perControlDelta(base, { ...base, mainsheet: 25, backstay: 45 }, [
      'mainsheet',
      'backstay',
    ]);
    expect(coachLine(out)).toBe('Less mainsheet: 5 clicks.');
    expect(coachLine(perControlDelta(base, base, ['backstay']))).toMatch(/optimum/);
    expect(coachLine([])).toMatch(/VMG alone/);
  });
});

describe('fixedControls', () => {
  it('is every trim control the drill does not hand the learner', () => {
    const drill = { free: ['backstay', 'mainsheet'] } as Pick<Drill, 'free'>;
    const fixed = fixedControls(drill.free);
    expect(fixed).not.toContain('backstay');
    expect(fixed).not.toContain('mainsheet');
    expect(fixed.length).toBe(TRIM_CONTROLS.length - 2);
  });
});
