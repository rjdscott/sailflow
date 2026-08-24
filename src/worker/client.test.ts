import { describe, expect, it } from 'vitest';
import { stubClient } from './client';
import type { DockScoreRequest, LoadBoatRequest, OptimalRequest, TrimmedRequest } from './protocol';
import type { DockControls } from '../core/types';

describe('stubClient', () => {
  const client = stubClient();

  it('resolves loadBoat to null', async () => {
    const result = await client.request<LoadBoatRequest>({ type: 'loadBoat', boat: undefined! });
    expect(result).toBeNull();
  });

  it('resolves trimmed to a converged tier-A SolveResult', async () => {
    const result = await client.request<TrimmedRequest>({
      type: 'trimmed',
      controls: undefined!,
      condition: undefined!,
    });
    expect(result.converged).toBe(true);
    expect(result.bsKt.tier).toBe('A');
    expect(result.bsKt.value).toBeCloseTo(6.2);
  });

  it('resolves optimal to a SolveResult plus twaDeg/race', async () => {
    const result = await client.request<OptimalRequest>({
      type: 'optimal',
      dock: undefined!,
      condition: undefined!,
      optimiseTwa: true,
    });
    expect(result.converged).toBe(true);
    expect(typeof result.twaDeg).toBe('number');
    expect(result.race.mainsheet).toBeDefined();
  });

  it('resolves dockScore to one DockScore per setup', async () => {
    const setups: DockControls[] = [
      { upperTurns: 6, lowerTurns: 4, forestayMm: 0 },
      { upperTurns: 7, lowerTurns: 5, forestayMm: 5 },
    ];
    const result = await client.request<DockScoreRequest>({
      type: 'dockScore',
      setups,
      forecast: undefined!,
    });
    expect(result).toHaveLength(2);
    expect(result[0].setup).toEqual(setups[0]);
    expect(result[1].setup).toEqual(setups[1]);
  });
});
