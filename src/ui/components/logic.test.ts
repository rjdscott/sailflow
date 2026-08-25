import { describe, expect, it } from 'vitest';
import { nextOpen, parseEdit, rovingIndex, TIER_NOTE, valueText } from './logic';

describe('rovingIndex', () => {
  it('moves forward and wraps past the end', () => {
    expect(rovingIndex('ArrowRight', 0, 3)).toBe(1);
    expect(rovingIndex('ArrowRight', 2, 3)).toBe(0);
    expect(rovingIndex('ArrowDown', 1, 3)).toBe(2);
  });

  it('moves back and wraps past the start', () => {
    expect(rovingIndex('ArrowLeft', 1, 3)).toBe(0);
    expect(rovingIndex('ArrowLeft', 0, 3)).toBe(2);
    expect(rovingIndex('ArrowUp', 0, 5)).toBe(4);
  });

  it('jumps to the ends', () => {
    expect(rovingIndex('Home', 3, 5)).toBe(0);
    expect(rovingIndex('End', 0, 5)).toBe(4);
  });

  it('leaves keys it does not own alone', () => {
    for (const key of ['Tab', 'Enter', ' ', 'a', 'Escape', 'PageDown']) {
      expect(rovingIndex(key, 1, 3)).toBeNull();
    }
  });

  it('is a no-op on an empty group', () => {
    expect(rovingIndex('ArrowRight', 0, 0)).toBeNull();
  });
});

describe('parseEdit', () => {
  const spec = [-6, 6, 0.5] as const;

  it('snaps a typed value to the step', () => {
    expect(parseEdit('4.3', 0, ...spec)).toBe(4.5);
    expect(parseEdit(' -2 ', 0, ...spec)).toBe(-2);
  });

  it('clamps outside the range', () => {
    expect(parseEdit('99', 0, ...spec)).toBe(6);
    expect(parseEdit('-99', 0, ...spec)).toBe(-6);
  });

  it('restores the previous value rather than committing zero', () => {
    // The M-08 bug: Number('') === 0, so +4.0 turns became 0.0.
    expect(parseEdit('', 4, ...spec)).toBe(4);
    expect(parseEdit('   ', 4, ...spec)).toBe(4);
    expect(parseEdit('abc', 4, ...spec)).toBe(4);
    expect(parseEdit('NaN', 4, ...spec)).toBe(4);
    expect(parseEdit('Infinity', 4, ...spec)).toBe(4);
  });

  it('still accepts a deliberate zero', () => {
    expect(parseEdit('0', 4, ...spec)).toBe(0);
  });
});

describe('valueText', () => {
  it('reads the value the way the screen shows it', () => {
    expect(valueText(70, 0, '%')).toBe('70 %');
    expect(valueText(0, 1, 'turns')).toBe('0.0 turns');
  });

  it('adds a guide band', () => {
    expect(valueText(70, 0, '%', [60, 75])).toBe('70 %, guide 60–75 %');
  });

  it('adds a single guide value when only a tick is known', () => {
    expect(valueText(3, 1, 'turns', 4)).toBe('3.0 turns, guide 4.0 turns');
    expect(valueText(3, 1, 'turns', [4, 4])).toBe('3.0 turns, guide 4.0 turns');
  });
});

describe('nextOpen', () => {
  it('toggles on the trigger and closes on everything else', () => {
    expect(nextOpen(false, 'toggle')).toBe(true);
    expect(nextOpen(true, 'toggle')).toBe(false);
    expect(nextOpen(true, 'escape')).toBe(false);
    expect(nextOpen(true, 'outside')).toBe(false);
    expect(nextOpen(false, 'escape')).toBe(false);
  });
});

describe('TIER_NOTE', () => {
  it('explains every tier the badge can render', () => {
    for (const tier of ['A', 'B', 'C'] as const) {
      expect(TIER_NOTE[tier].length).toBeGreaterThan(10);
    }
  });
});
