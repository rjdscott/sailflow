import { describe, expect, it } from 'vitest';
import type { Instruments, SolveResult } from '../../core/types';
import { verdict } from './verdict';

const INSTRUMENTS: Instruments = {
  leechStallFrac: { value: 0.55, tier: 'C', sign: 1 },
  jibLeechStripe: { value: 1.1, tier: 'C', sign: 1 },
  helmLoad: { value: 0.6, tier: 'C', sign: 1 },
  pctPolar: { value: 98, tier: 'A' },
};

function result(
  over: Partial<SolveResult> = {},
  instruments: Partial<Instruments> = {},
): SolveResult {
  return {
    converged: true,
    iters: 8,
    bsKt: { value: 6, tier: 'A' },
    vmgKt: { value: 4.5, tier: 'A' },
    heelDeg: { value: 14, tier: 'B', band: [12, 16] },
    leewayDeg: { value: 3, tier: 'B', band: [2, 4] },
    aero: {
      flat: 1,
      reef: 1,
      twistEff: 12,
      awaDeg: 22,
      awsKt: 11,
      fxN: 300,
      fyN: 900,
      mxNm: 3000,
      ceHeightM: 3.6,
    },
    rig: {
      bendMm: [],
      sagMm: 10,
      rakeMm: 0,
      prebendMm: 40,
      forestayN: 3000,
      upperN: 2000,
      lowerN: 1000,
    },
    shape: {},
    instruments: { ...INSTRUMENTS, ...instruments },
    residuals: [0, 0, 0],
    ...over,
  };
}

describe('verdict', () => {
  it('says so before the first solve', () => {
    expect(verdict({ result: null, objective: 'vmgUp' })).toBe('Solving…');
  });

  it('leads with a failed solve, whatever the gap', () => {
    expect(
      verdict({
        result: result({ converged: false }),
        target: { vmgKt: 4.9 },
        objective: 'vmgUp',
      }),
    ).toBe('Solver did not settle');
  });

  it('says the optimum is still coming when there is no target', () => {
    expect(verdict({ result: result(), objective: 'vmgUp' })).toBe('Finding the optimum…');
  });

  it('is on target inside the display resolution', () => {
    expect(verdict({ result: result(), target: { vmgKt: 4.51 }, objective: 'vmgUp' })).toBe(
      'On target.',
    );
  });

  it('reports the gap with the cue that explains it', () => {
    const v = verdict({
      result: result({}, { leechStallFrac: { value: 0.85, tier: 'C', sign: 1 } }),
      target: { vmgKt: 4.7 },
      objective: 'vmgUp',
    });
    expect(v).toBe('0.20 kt below target: main leech stalled, ease');
  });

  it('tells an under-trimmed main from a stalled one, upwind only', () => {
    const under = { leechStallFrac: { value: 0.1, tier: 'C' as const, sign: 1 as const } };
    expect(
      verdict({ result: result({}, under), target: { vmgKt: 4.7 }, objective: 'vmgUp' }),
    ).toContain('main leech flowing, trim on');
    // On a reach the same reading is just a sail that is eased, as it should be.
    expect(
      verdict({ result: result({}, under), target: { bsKt: 6.2 }, objective: 'speed' }),
    ).not.toContain('flowing');
  });

  it('falls through to the jib, then the helm, then the coach line', () => {
    const quietMain = { leechStallFrac: { value: 0.5, tier: 'C' as const, sign: 1 as const } };
    const hooked = {
      ...quietMain,
      jibLeechStripe: { value: 0.2, tier: 'C' as const, sign: 1 as const },
    };
    expect(
      verdict({ result: result({}, hooked), target: { vmgKt: 4.7 }, objective: 'vmgUp' }),
    ).toContain('jib leech hooked, lead aft');

    const heavy = { ...quietMain, helmLoad: { value: 1.5, tier: 'C' as const, sign: 1 as const } };
    expect(
      verdict({ result: result({}, heavy), target: { vmgKt: 4.7 }, objective: 'vmgUp' }),
    ).toContain('heavy helm, flatten');

    expect(
      verdict({
        result: result({}, quietMain),
        target: { vmgKt: 4.7 },
        objective: 'vmgUp',
        coach: 'More backstay: +0.05 kt VMG, main is too full for this load.',
      }),
    ).toBe('0.20 kt below target: More backstay: +0.05 kt VMG, main is too full for this load.');
  });

  it('states the gap alone when nothing explains it', () => {
    expect(
      verdict({
        result: result({}, { leechStallFrac: { value: 0.5, tier: 'C', sign: 1 } }),
        target: { vmgKt: 4.7 },
        objective: 'vmgUp',
      }),
    ).toBe('0.20 kt below target.');
  });

  it('signs the gap the same way downwind, where VMG is negative', () => {
    const dn = result({ vmgKt: { value: -3.0, tier: 'B', band: [-3.2, -2.8] } });
    // −3.2 kt is further towards the leeward mark: the target is faster.
    expect(verdict({ result: dn, target: { vmgKt: -3.2 }, objective: 'vmgDown' })).toContain(
      '0.20 kt below target',
    );
    // And a target that is slower reads above, not below.
    expect(verdict({ result: dn, target: { vmgKt: -2.8 }, objective: 'vmgDown' })).toContain(
      '0.20 kt above target',
    );
  });

  it('reads boat speed on a reach', () => {
    expect(
      verdict({
        result: result({}, { leechStallFrac: { value: 0.5, tier: 'C', sign: 1 } }),
        target: { bsKt: 6.3 },
        objective: 'speed',
      }),
    ).toBe('0.30 kt below target.');
  });
});
