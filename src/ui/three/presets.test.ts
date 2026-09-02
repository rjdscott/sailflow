import { describe, expect, it } from 'vitest';
import { isPreset, PRESET_HINT, PRESET_LABEL, PRESET_ORDER, PRESET_SHORT } from './presets';

/**
 * H-09. The hero's five camera chips wrapped to a second row on a phone — 96 px
 * of chrome above a 218 px picture — because two labels were long. The short
 * table is what keeps them on one 44 px line, so its lengths are the invariant.
 */
describe('PRESET_SHORT', () => {
  it('covers every preset, and only the presets', () => {
    expect(Object.keys(PRESET_SHORT).sort()).toEqual([...PRESET_ORDER].sort());
  });

  it('keeps each label inside the one-row budget', () => {
    for (const id of PRESET_ORDER) {
      expect(PRESET_SHORT[id].length, id).toBeLessThanOrEqual(7);
      expect(PRESET_SHORT[id].length, id).toBeLessThanOrEqual(PRESET_LABEL[id].length);
    }
  });

  it('shortens only the two that did not fit, and stays unique', () => {
    const changed = PRESET_ORDER.filter((id) => PRESET_SHORT[id] !== PRESET_LABEL[id]);
    expect(changed).toEqual(['luff', 'top']);
    expect(new Set(Object.values(PRESET_SHORT)).size).toBe(PRESET_ORDER.length);
  });

  it('leaves the long form on the chip, in the hint', () => {
    for (const id of PRESET_ORDER) expect(PRESET_HINT[id].length).toBeGreaterThan(20);
    expect(isPreset('luff')).toBe(true);
  });
});
