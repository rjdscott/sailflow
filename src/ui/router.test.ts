import { describe, expect, it, vi } from 'vitest';
import { buildHash, DEFAULT_ROUTE, hashSlug, parseHash } from './router.svelte';

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

  // Phase 04 folded the Dock into the Rig panel, so `#/dock` is the Simulator
  // outright — no sub-path — and the forecast the link carries is what the Rig
  // panel opens on.
  it('resolves the old dock link to the simulator, forecast intact', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(parseHash('#/dock?s=1&f=8_12_16_1_300')).toEqual({
      screen: 'sim',
      params: { s: '1', f: '8_12_16_1_300' },
    });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    // The dead sub-path is not a screen of its own any more, and does not
    // become a stray param either.
    expect(parseHash('#/sim/dock').params).toEqual({});
    expect(parseHash('#/sim').params).toEqual({});
  });

  // Which slug the link used is how the Rig panel knows to scroll itself into
  // view for a Dock link (`Router.landedFrom`).
  it('reports the slug a link was written with', () => {
    expect(hashSlug('#/dock?f=8_12_16_1_300')).toBe('dock');
    expect(hashSlug('#/sim?tws=10')).toBe('sim');
    expect(hashSlug('#/')).toBe('');
    expect(hashSlug('')).toBe('');
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
