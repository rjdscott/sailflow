import { describe, expect, it, vi } from 'vitest';
import { buildHash, DEFAULT_ROUTE, parseHash } from './router.svelte';

describe('parseHash', () => {
  it('defaults to the simulator with no hash', () => {
    expect(parseHash('').screen).toBe(DEFAULT_ROUTE);
    expect(parseHash('#/').screen).toBe('sim');
  });

  it('parses every known route', () => {
    expect(parseHash('#/sim').screen).toBe('sim');
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

  it('reads the scenario out of the query string', () => {
    const { screen, params } = parseHash('#/sim?tws=18&twa=42&sea=2&crew=320&set=jib&r=30.70.20');
    expect(screen).toBe('sim');
    expect(params).toEqual({
      tws: '18',
      twa: '42',
      sea: '2',
      crew: '320',
      set: 'jib',
      r: '30.70.20',
    });
  });

  // ADR 0021 merged Dock and Race into one Simulator page. Links to both are
  // in group chats and in the tuning log, so they resolve rather than warn.
  it('resolves the old race link to the simulator, query untouched', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { screen, params } = parseHash('#/race?s=1&tws=10&twa=42&r=30_60_0');
    expect(screen).toBe('sim');
    expect(params).toEqual({ s: '1', tws: '10', twa: '42', r: '30_60_0' });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('resolves the old dock link to the simulator sub-path, query untouched', () => {
    expect(parseHash('#/dock?s=1&f=8_12_16_1_300')).toEqual({
      screen: 'sim',
      params: { sub: 'dock', s: '1', f: '8_12_16_1_300' },
    });
    // And the sub-path spells itself the same way when written out in full.
    expect(parseHash('#/sim/dock').params).toEqual({ sub: 'dock' });
    expect(parseHash('#/sim').params).toEqual({});
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
  it('round-trips a scenario', () => {
    const params = { tws: '18', twa: '42', sea: '2', crew: '320', set: 'asym', r: '30.70.-20' };
    expect(parseHash(buildHash('sim', params)).params).toEqual(params);
  });

  it('writes the sub-path out of the query and round-trips it', () => {
    const params = { sub: 'dock', tws: '18' };
    expect(buildHash('sim', params)).toBe('#/sim/dock?tws=18');
    expect(parseHash(buildHash('sim', params)).params).toEqual(params);
  });

  it('round-trips a drill', () => {
    const params = { template: 'backstay-too-loose', seed: '4711' };
    expect(buildHash('drills', params)).toBe('#/drills/backstay-too-loose/4711');
    expect(parseHash(buildHash('drills', params))).toEqual({ screen: 'drills', params });
  });

  it('omits an empty query', () => {
    expect(buildHash('sim')).toBe('#/sim');
    expect(buildHash('sim', { tws: '' })).toBe('#/sim');
  });
});
