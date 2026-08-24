import { describe, expect, it } from 'vitest';
import j70 from '../../data/boats/j70.json';
import type { BoatDefinition } from '../core/types';
import { baseDock, baseRace } from '../core/shape/base';
import { handle } from './solver.worker';

const boat = j70 as unknown as BoatDefinition;
const cond = { twsKt: 10, twaDeg: 42, seaState: 1 as const, crewKg: 300, sailset: 'jib' as const };

describe('solver worker dispatch', () => {
  it('rejects a protocol mismatch', () => {
    const r = handle({
      protocolVersion: 2 as unknown as 1,
      id: 1,
      type: 'trimmed',
      controls: { dock: baseDock(), race: baseRace() },
      condition: cond,
    });
    expect(r.type).toBe('error');
  });
  it('errors before a boat is loaded', () => {
    const r = handle({
      protocolVersion: 1,
      id: 2,
      type: 'trimmed',
      controls: { dock: baseDock(), race: baseRace() },
      condition: cond,
    });
    expect(r).toMatchObject({ type: 'error', id: 2 });
  });
  it('rejects an invalid boat', () => {
    const bad = { ...boat, sails: {} } as unknown as BoatDefinition;
    expect(handle({ protocolVersion: 1, id: 3, type: 'loadBoat', boat: bad }).type).toBe('error');
  });
  it('loads a boat then solves trimmed, optimal and dockScore, all JSON-safe', () => {
    expect(handle({ protocolVersion: 1, id: 4, type: 'loadBoat', boat })).toMatchObject({
      type: 'ok',
      result: null,
    });
    const t = handle({
      protocolVersion: 1,
      id: 5,
      type: 'trimmed',
      controls: { dock: baseDock(), race: baseRace() },
      condition: cond,
    });
    expect(t).toMatchObject({ type: 'ok', id: 5 });
    const o = handle({
      protocolVersion: 1,
      id: 6,
      type: 'optimal',
      dock: baseDock(),
      condition: cond,
      optimiseTwa: false,
    });
    expect(o).toMatchObject({ type: 'ok', id: 6 });
    const d = handle({
      protocolVersion: 1,
      id: 7,
      type: 'dockScore',
      setups: [baseDock()],
      candidates: [baseDock(), { upperTurns: 2, lowerTurns: 1, forestayMm: 0 }],
      forecast: { minKt: 10, likelyKt: 10, maxKt: 10, seaState: 1, crewKg: 300 },
    });
    expect(d).toMatchObject({ type: 'ok', id: 7 });
    for (const r of [t, o, d]) {
      const json = JSON.stringify(r);
      expect(json).not.toMatch(/NaN|Infinity/);
      expect(JSON.parse(json)).toEqual(r);
    }
  });
});
