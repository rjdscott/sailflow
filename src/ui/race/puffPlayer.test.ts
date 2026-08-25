import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SolveResult } from '../../core/types';
import { conditions } from '../stores/conditions.svelte';
import { optimum } from './optimum.svelte';
import { SEQUENCES } from './puff';
import { PuffPlayer, PUFF_STEP_MS } from './puffPlayer.svelte';
import { race } from './store.svelte';

/** A solve powered up enough to read as the transition at 12 kt. */
function solved(heelDeg: number, flat = 1): SolveResult {
  return {
    converged: true,
    iters: 6,
    bsKt: { value: 6, tier: 'A' },
    vmgKt: { value: 4.4, tier: 'A' },
    heelDeg: { value: heelDeg, tier: 'A' },
    leewayDeg: { value: 3, tier: 'B' },
    aero: {
      flat,
      reef: 1,
      twistEff: 12,
      awaDeg: 22,
      awsKt: 14,
      fxN: 300,
      fyN: 900,
      mxNm: 1200,
      ceHeightM: 4,
    },
    rig: {
      bendMm: new Array(11).fill(0),
      sagMm: 10,
      rakeMm: 600,
      prebendMm: 40,
      forestayN: 1,
      upperN: 1,
      lowerN: 1,
    },
    shape: {},
    instruments: {
      leechStallFrac: { value: 0.5, tier: 'C' },
      helmLoad: { value: 0.4, tier: 'C' },
      pctPolar: { value: 98, tier: 'A' },
    },
    residuals: [0, 0, 0],
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  conditions.apply({ twsKt: 11, twaDeg: 42, seaState: 1, crewKg: 300, sailset: 'jib' });
  race.result = solved(12);
  optimum.busy = false;
  optimum.stale = false;
});

afterEach(() => {
  vi.useRealTimers();
  race.result = null;
});

describe('PuffPlayer', () => {
  it('walks the sequence, one condition per step', () => {
    const p = new PuffPlayer();
    p.start('gust');
    expect(p.playing).toBe(true);
    expect(conditions.twsKt).toBe(8);

    vi.advanceTimersByTime(PUFF_STEP_MS);
    expect(conditions.twsKt).toBe(10);
    vi.advanceTimersByTime(PUFF_STEP_MS);
    expect(conditions.twsKt).toBe(12);
  });

  it('restores the condition exactly when the sequence finishes', () => {
    const p = new PuffPlayer();
    p.start('gust');
    vi.advanceTimersByTime(PUFF_STEP_MS * SEQUENCES.gust.steps.length + 10);
    expect(p.playing).toBe(false);
    expect(conditions.twsKt).toBe(11);
    expect(conditions.twaDeg).toBe(42);
  });

  it('restores the condition on cancel, mid-flight', () => {
    const p = new PuffPlayer();
    p.start('gust');
    vi.advanceTimersByTime(PUFF_STEP_MS * 2);
    expect(conditions.twsKt).not.toBe(11);

    p.cancel();
    expect(conditions.twsKt).toBe(11);
    expect(conditions.twaDeg).toBe(42);
    expect(p.playing).toBe(false);
    expect(p.lit).toEqual([]);
  });

  it('a cancel with nothing playing is a no-op, and cancelling twice is safe', () => {
    const p = new PuffPlayer();
    p.cancel();
    expect(conditions.twsKt).toBe(11);
    p.start('gust');
    p.cancel();
    p.cancel();
    expect(conditions.twsKt).toBe(11);
  });

  it('shifts the angle off the angle it started from, never off the last step', () => {
    const p = new PuffPlayer();
    p.start('shift');
    expect(conditions.twaDeg).toBe(46); // +4
    vi.advanceTimersByTime(PUFF_STEP_MS);
    expect(conditions.twaDeg).toBe(50); // +8 from 42, not +8 from 46
    p.cancel();
    expect(conditions.twaDeg).toBe(42);
  });

  it('lights the panels in the order the power state calls for', () => {
    const p = new PuffPlayer();
    race.result = solved(20); // heel well over the band: overpowered
    p.start('gust');
    expect(p.power).toBe('over');
    expect(p.lit).toEqual(['mainsail', 'headsail', 'helm']);
    expect(p.litIndex('helm')).toBe(2);
    expect(p.litIndex('mainsail')).toBe(0);
    p.cancel();
  });

  it('lights nothing before the first solve has landed', () => {
    const p = new PuffPlayer();
    race.result = null;
    p.start('gust');
    expect(p.power).toBeNull();
    expect(p.lit).toEqual([]);
    p.cancel();
  });

  it('waits for the optimum search rather than stepping past its answer', () => {
    const p = new PuffPlayer();
    p.start('gust');
    optimum.busy = true;
    vi.advanceTimersByTime(PUFF_STEP_MS);
    expect(conditions.twsKt).toBe(8); // still on step one

    optimum.busy = false;
    vi.advanceTimersByTime(250);
    expect(conditions.twsKt).toBe(10);
    p.cancel();
  });

  it('ignores a second start while one is playing', () => {
    const p = new PuffPlayer();
    p.start('gust');
    p.start('lull');
    expect(p.seq).toBe('gust');
    p.cancel();
  });
});
