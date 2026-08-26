import { describe, expect, it } from 'vitest';
import { activeBoat } from '../../lib/boat';
import { BASE_RACE, BASE_RACE_DOWN, PRESETS } from './conditions.svelte';

/**
 * The preset numbers are read off the J/70 guides. On another class they are
 * only a starting point, and a starting point the sliders cannot express is a
 * trim the user can never get back to — the same failure `validateBoat`
 * catches for `baseRace` and `share.ts` catches for a link's values.
 */
describe('presets', () => {
  it('lands every control on a stop the active class actually has', () => {
    for (const p of PRESETS) {
      for (const [key, value] of Object.entries(p.race)) {
        const spec = activeBoat.controls[key];
        expect(spec, `${p.id}: no control named ${key}`).toBeDefined();
        expect(value, `${p.id}.${key} below min`).toBeGreaterThanOrEqual(spec.min);
        expect(value, `${p.id}.${key} above max`).toBeLessThanOrEqual(spec.max);
        const steps = (value - spec.min) / spec.step;
        expect(
          Math.abs(steps - Math.round(steps)),
          `${p.id}.${key} off the step grid`,
        ).toBeLessThan(1e-6);
      }
    }
  });

  it('keeps crew weight inside the class limits', () => {
    for (const p of PRESETS) {
      expect(p.condition.crewKg, p.id).toBeGreaterThanOrEqual(activeBoat.crew.minKg);
      expect(p.condition.crewKg, p.id).toBeLessThanOrEqual(activeBoat.crew.maxKg);
    }
  });

  it('takes the base trim from the boat file, not from a literal', () => {
    // The datum the solver measures every shape delta against. Two "base
    // trims" that disagree is the bug this shares one object to prevent.
    expect(BASE_RACE).toEqual(activeBoat.baseRace);
    expect(BASE_RACE_DOWN.mainsheet).toBe(activeBoat.baseRaceDown.mainsheet);
  });

  it('eases the mainsheet for the kite, whatever the class publishes', () => {
    const downwind = PRESETS.find((p) => p.id === 'downwind')!;
    expect(downwind.race.mainsheet).toBe(activeBoat.baseRaceDown.mainsheet);
    expect(downwind.race.mainsheet).toBeLessThan(BASE_RACE.mainsheet);
  });
});
