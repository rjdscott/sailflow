import { describe, expect, it } from 'vitest';
import { History } from './history';

describe('History', () => {
  it('returns samples oldest to newest', () => {
    const h = new History();
    for (const bs of [4, 5, 6]) h.push('k', { bs });
    expect(h.series('bs')).toEqual([4, 5, 6]);
  });

  it('keeps only the last `size` samples', () => {
    const h = new History(3);
    for (const bs of [1, 2, 3, 4, 5]) h.push('k', { bs });
    expect(h.series('bs')).toEqual([3, 4, 5]);
  });

  it('defaults to 24 samples', () => {
    const h = new History();
    for (let i = 0; i < 30; i++) h.push('k', { bs: i });
    expect(h.series('bs')).toHaveLength(24);
    expect(h.series('bs')[0]).toBe(6);
  });

  it('throws the buffer away when the condition changes', () => {
    const h = new History();
    h.push('8kt', { bs: 4 });
    h.push('8kt', { bs: 5 });
    h.push('14kt', { bs: 6 });
    expect(h.series('bs')).toEqual([6]);
    expect(h.key).toBe('14kt');
  });

  it('skips NaN and missing fields rather than drawing a hole', () => {
    const h = new History();
    h.push('k', { bs: 4 });
    h.push('k', { bs: NaN });
    h.push('k', { vmg: 3 });
    h.push('k', { bs: 6 });
    expect(h.series('bs')).toEqual([4, 6]);
    expect(h.series('vmg')).toEqual([3]);
  });

  it('is empty before the first push and after a reset', () => {
    const h = new History();
    expect(h.key).toBeNull();
    expect(h.series('bs')).toEqual([]);
    h.push('k', { bs: 4 });
    h.reset();
    expect(h.key).toBeNull();
    expect(h.series('bs')).toEqual([]);
  });
});
