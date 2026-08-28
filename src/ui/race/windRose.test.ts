import { describe, expect, it } from 'vitest';
import { angleAt, clampTwa, stepTwa, TWA_MAX, TWA_MIN } from './windRose';

describe('clampTwa', () => {
  it('snaps to a whole degree', () => {
    expect(clampTwa(42.4)).toBe(42);
    expect(clampTwa(42.5)).toBe(43);
  });

  it('holds the range the solver is asked for', () => {
    expect(clampTwa(0)).toBe(TWA_MIN);
    expect(clampTwa(-90)).toBe(TWA_MIN);
    expect(clampTwa(999)).toBe(TWA_MAX);
  });
});

describe('angleAt', () => {
  const cx = 50;
  const cy = 50;

  it('reads straight up as head to wind and straight down as a run', () => {
    // Straight up is 0°, which is inside the range, so it clamps to the beat.
    expect(angleAt(cx, cy, cx, cy - 30)).toBe(TWA_MIN);
    expect(angleAt(cx, cy, cx, cy + 30)).toBe(TWA_MAX);
  });

  it('reads abeam as 90° on either side', () => {
    expect(angleAt(cx, cy, cx + 30, cy)).toBe(90);
    expect(angleAt(cx, cy, cx - 30, cy)).toBe(90);
  });

  it('reads the diagonals as 45° and 135°', () => {
    expect(angleAt(cx, cy, cx + 30, cy - 30)).toBe(45);
    expect(angleAt(cx, cy, cx + 30, cy + 30)).toBe(135);
    expect(angleAt(cx, cy, cx - 30, cy + 30)).toBe(135);
  });

  it('does not care how far out the pointer is, only which way', () => {
    expect(angleAt(cx, cy, cx + 5, cy + 5)).toBe(angleAt(cx, cy, cx + 500, cy + 500));
  });

  it('reads the centre itself as the tightest legal angle', () => {
    expect(angleAt(cx, cy, cx, cy)).toBe(TWA_MIN);
  });
});

describe('stepTwa', () => {
  it('moves one degree per arrow key, five with shift', () => {
    expect(stepTwa(42, 'ArrowRight', false)).toBe(43);
    expect(stepTwa(42, 'ArrowDown', false)).toBe(43);
    expect(stepTwa(42, 'ArrowLeft', false)).toBe(41);
    expect(stepTwa(42, 'ArrowUp', false)).toBe(41);
    expect(stepTwa(42, 'ArrowRight', true)).toBe(47);
    expect(stepTwa(42, 'ArrowLeft', true)).toBe(37);
  });

  it('stops at the ends rather than wrapping', () => {
    expect(stepTwa(TWA_MIN, 'ArrowLeft', true)).toBe(TWA_MIN);
    expect(stepTwa(TWA_MAX, 'ArrowRight', true)).toBe(TWA_MAX);
  });

  it('jumps to the ends on Home and End', () => {
    expect(stepTwa(90, 'Home', false)).toBe(TWA_MIN);
    expect(stepTwa(90, 'End', false)).toBe(TWA_MAX);
  });

  it('returns null for a key the rose does not own', () => {
    expect(stepTwa(90, 'a', false)).toBeNull();
    expect(stepTwa(90, 'Tab', false)).toBeNull();
  });
});
