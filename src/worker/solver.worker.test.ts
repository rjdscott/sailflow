import { describe, expect, it } from 'vitest';
import j70 from '../../data/boats/j70.json';
import type { BoatDefinition } from '../core/types';
import { baseDock, baseRace } from '../core/shape/base';
import { handle } from './solver.worker';
import type { Response } from './protocol';

const boat = j70 as unknown as BoatDefinition;
const cond = { twsKt: 10, twaDeg: 42, seaState: 1 as const, crewKg: 300, sailset: 'jib' as const };

describe('solver worker dispatch', () => {
  it('rejects a protocol mismatch', () => {
    const r = handle({
      protocolVersion: 2 as unknown as 1,
      id: 1,
      type: 'trimmed',
      controls: { dock: baseDock(), race: baseRace(boat) },
      condition: cond,
    });
    expect(r.type).toBe('error');
  });
  it('errors before a boat is loaded', () => {
    const r = handle({
      protocolVersion: 1,
      id: 2,
      type: 'trimmed',
      controls: { dock: baseDock(), race: baseRace(boat) },
      condition: cond,
    });
    expect(r).toMatchObject({ type: 'error', id: 2 });
  });
  it('rejects an invalid boat', () => {
    const bad = { ...boat, sails: {} } as unknown as BoatDefinition;
    expect(handle({ protocolVersion: 1, id: 3, type: 'loadBoat', boat: bad }).type).toBe('error');
  });
  it('loads a boat then solves trimmed, optimal, optimalTrim and dockScore, all JSON-safe', () => {
    expect(handle({ protocolVersion: 1, id: 4, type: 'loadBoat', boat })).toMatchObject({
      type: 'ok',
      result: null,
    });
    const t = handle({
      protocolVersion: 1,
      id: 5,
      type: 'trimmed',
      controls: { dock: baseDock(), race: baseRace(boat) },
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
    const ot = handle({
      protocolVersion: 1,
      id: 8,
      type: 'optimalTrim',
      controls: { dock: baseDock(), race: { ...baseRace(boat), backstay: 90, mainsheet: 20 } },
      condition: cond,
    });
    expect(ot).toMatchObject({ type: 'ok', id: 8 });
    const d = handle({
      protocolVersion: 1,
      id: 7,
      type: 'dockScore',
      setups: [baseDock()],
      candidates: [baseDock(), { upperTurns: 2, lowerTurns: 1, forestayMm: 0 }],
      forecast: { minKt: 10, likelyKt: 10, maxKt: 10, seaState: 1, crewKg: 300 },
    });
    expect(d).toMatchObject({ type: 'ok', id: 7 });
    for (const r of [t, o, ot, d]) {
      const json = JSON.stringify(r);
      expect(json).not.toMatch(/NaN|Infinity/);
      expect(JSON.parse(json)).toEqual(r);
    }
  });
  it('emits progress before the result, only when the request asks for it', () => {
    expect(handle({ protocolVersion: 1, id: 10, type: 'loadBoat', boat }).type).toBe('ok');
    const req = {
      protocolVersion: 1 as const,
      id: 11,
      type: 'dockScore' as const,
      setups: [baseDock()],
      candidates: [baseDock(), { upperTurns: 2, lowerTurns: 1, forestayMm: 0 }],
      forecast: { minKt: 10, likelyKt: 11, maxKt: 12, seaState: 1 as const, crewKg: 300 },
    };

    const silent: unknown[] = [];
    handle(req, (r) => silent.push(r));
    expect(silent).toEqual([]);

    const sent: Response[] = [];
    const res = handle({ ...req, id: 12, progress: true }, (r) => sent.push(r));
    expect(res).toMatchObject({ type: 'ok', id: 12 });
    // 2 candidates x 3 wind speeds, every message JSON-safe and correlated.
    expect(sent).toHaveLength(6);
    expect(sent.at(-1)).toEqual({
      protocolVersion: 1,
      id: 12,
      type: 'progress',
      done: 6,
      total: 6,
    });
    for (const m of sent) expect(JSON.parse(JSON.stringify(m))).toEqual(m);
  });
});
