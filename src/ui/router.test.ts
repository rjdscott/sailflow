import { describe, expect, it, vi } from 'vitest';
import { buildHash, DEFAULT_ROUTE, parseHash } from './router.svelte';

describe('parseHash', () => {
  it('defaults to race with no hash', () => {
    expect(parseHash('').screen).toBe(DEFAULT_ROUTE);
    expect(parseHash('#/').screen).toBe('race');
  });

  it('parses every known route', () => {
    expect(parseHash('#/dock').screen).toBe('dock');
    expect(parseHash('#/log').screen).toBe('log');
    expect(parseHash('#/drills').screen).toBe('drills');
    expect(parseHash('#/more').screen).toBe('more');
    // Dev-only screen; vitest runs with DEV set, production strips it (L-01).
    expect(parseHash('#/kit').screen).toBe('kit');
  });

  it('falls back to the default route for an unknown hash, and says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(parseHash('#/nope').screen).toBe(DEFAULT_ROUTE);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('reads the race scenario out of the query string', () => {
    const { screen, params } = parseHash('#/race?tws=18&twa=42&sea=2&crew=320&set=jib&r=30.70.20');
    expect(screen).toBe('race');
    expect(params).toEqual({
      tws: '18',
      twa: '42',
      sea: '2',
      crew: '320',
      set: 'jib',
      r: '30.70.20',
    });
  });

  it('reads template and seed out of a drill path', () => {
    expect(parseHash('#/drills/backstay-too-loose/4711').params).toEqual({
      template: 'backstay-too-loose',
      seed: '4711',
    });
    expect(parseHash('#/drills/backstay-too-loose').params).toEqual({
      template: 'backstay-too-loose',
    });
    expect(parseHash('#/drills').params).toEqual({});
  });
});

describe('buildHash', () => {
  it('round-trips a race scenario', () => {
    const params = { tws: '18', twa: '42', sea: '2', crew: '320', set: 'asym', r: '30.70.-20' };
    expect(parseHash(buildHash('race', params)).params).toEqual(params);
  });

  it('round-trips a drill', () => {
    const params = { template: 'backstay-too-loose', seed: '4711' };
    expect(buildHash('drills', params)).toBe('#/drills/backstay-too-loose/4711');
    expect(parseHash(buildHash('drills', params))).toEqual({ screen: 'drills', params });
  });

  it('omits an empty query', () => {
    expect(buildHash('dock')).toBe('#/dock');
    expect(buildHash('race', { tws: '' })).toBe('#/race');
  });
});
