import { describe, expect, it } from 'vitest';
import { DEFAULT_ROUTE, parseHash } from './router.svelte';

describe('parseHash', () => {
  it('defaults to race with no hash', () => {
    expect(parseHash('')).toBe(DEFAULT_ROUTE);
    expect(parseHash('#/')).toBe('race');
  });

  it('parses every known route', () => {
    expect(parseHash('#/dock')).toBe('dock');
    expect(parseHash('#/log')).toBe('log');
    expect(parseHash('#/drills')).toBe('drills');
    expect(parseHash('#/more')).toBe('more');
    expect(parseHash('#/kit')).toBe('kit');
  });

  it('falls back to the default route for an unknown hash', () => {
    expect(parseHash('#/nope')).toBe(DEFAULT_ROUTE);
    expect(parseHash('#/race/extra')).toBe('race');
  });
});
