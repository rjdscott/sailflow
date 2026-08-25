import { describe, expect, it } from 'vitest';
import { heelBands } from '../instruments/gauges';
import { panelOrder, powerState, schedule, SEQUENCE_IDS, SEQUENCES, type SequenceId } from './puff';

describe('SEQUENCES', () => {
  it('gust builds 8 to 14 and settles at 10 over six steps', () => {
    const tws = SEQUENCES.gust.steps.map((s) => s.twsKt);
    expect(tws).toEqual([8, 10, 12, 14, 12, 10]);
  });

  it('lull is the mirror: 14 down to 8, back to 12', () => {
    const tws = SEQUENCES.lull.steps.map((s) => s.twsKt);
    expect(tws[0]).toBe(14);
    expect(Math.min(...(tws as number[]))).toBe(8);
    expect(tws[tws.length - 1]).toBe(12);
  });

  it('shift moves the angle and never the wind speed', () => {
    for (const step of SEQUENCES.shift.steps) {
      expect(step.twsKt).toBeUndefined();
      expect(Math.abs(step.twaOffsetDeg!)).toBeLessThanOrEqual(8);
    }
    expect(SEQUENCES.shift.steps.map((s) => s.twaOffsetDeg)).toContain(8);
    expect(SEQUENCES.shift.steps.map((s) => s.twaOffsetDeg)).toContain(-8);
  });

  it('every sequence is six steps and every step has a label', () => {
    for (const id of SEQUENCE_IDS) {
      expect(SEQUENCES[id].steps).toHaveLength(6);
      for (const s of SEQUENCES[id].steps) expect(s.label).not.toBe('');
    }
  });
});

describe('powerState', () => {
  const band = heelBands(12);

  it('full power and under the heel band is underpowered', () => {
    expect(powerState({ flat: 1, heelDeg: band.lo - 2, twsKt: 12 })).toBe('under');
  });

  it('flattened sails are overpowered whatever the heel', () => {
    expect(powerState({ flat: 0.8, heelDeg: band.target, twsKt: 12 })).toBe('over');
  });

  it('heel past the top of the band is overpowered at full power', () => {
    expect(powerState({ flat: 1, heelDeg: band.hi + 1, twsKt: 12 })).toBe('over');
  });

  it('heel sign does not matter: the other tack is the same boat', () => {
    expect(powerState({ flat: 1, heelDeg: -(band.hi + 1), twsKt: 12 })).toBe('over');
  });

  it('in the band, or partly flattened, is the transition', () => {
    expect(powerState({ flat: 1, heelDeg: band.target, twsKt: 12 })).toBe('transition');
    expect(powerState({ flat: 0.95, heelDeg: band.lo - 2, twsKt: 12 })).toBe('transition');
  });

  it('the band moves with the wind: 12 degrees is over in 6 kt, not in 16', () => {
    expect(powerState({ flat: 1, heelDeg: 12, twsKt: 6 })).toBe('over');
    expect(powerState({ flat: 1, heelDeg: 12, twsKt: 16 })).not.toBe('over');
  });
});

describe('panelOrder', () => {
  it('follows Ingham: body first light, controls first in the transition', () => {
    expect(panelOrder('under')).toEqual(['helm', 'mainsail', 'headsail']);
    expect(panelOrder('transition')).toEqual(['mainsail', 'helm', 'headsail']);
    expect(panelOrder('over')).toEqual(['mainsail', 'headsail', 'helm']);
  });

  it('always names all three panels exactly once', () => {
    for (const state of ['under', 'transition', 'over'] as const) {
      expect(new Set(panelOrder(state)).size).toBe(3);
    }
  });
});

describe('schedule', () => {
  it('spaces the steps evenly from zero', () => {
    const steps = schedule('gust', 900);
    expect(steps.map((s) => s.atMs)).toEqual([0, 900, 1800, 2700, 3600, 4500]);
    expect(steps.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('is deterministic: no clock, so two calls agree exactly', () => {
    for (const id of SEQUENCE_IDS as SequenceId[]) {
      expect(schedule(id, 750)).toEqual(schedule(id, 750));
    }
  });

  it('carries the sequence through unchanged', () => {
    expect(schedule('gust', 100).map((s) => s.twsKt)).toEqual(
      SEQUENCES.gust.steps.map((s) => s.twsKt),
    );
  });
});
