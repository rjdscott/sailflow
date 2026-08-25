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

describe('SolverClient progress', () => {
  it('delivers every progress message before the result, and none after', async () => {
    let onmessage: ((e: MessageEvent) => void) | undefined;
    const post = (data: unknown) => onmessage?.({ data } as MessageEvent);
    const fakeWorker = {
      postMessage: (m: unknown) => {
        const id = (m as { id: number }).id;
        queueMicrotask(() => {
          for (const done of [1, 2, 3])
            post({ type: 'progress', id, protocolVersion: 1, done, total: 3 });
          post({ type: 'ok', id, protocolVersion: 1, result: [] });
          // Late progress for a settled request must be ignored, not thrown.
          post({ type: 'progress', id, protocolVersion: 1, done: 4, total: 3 });
        });
      },
      addEventListener: (_: string, fn: (e: MessageEvent) => void) => {
        onmessage = fn;
      },
    } as unknown as Worker;

    const { SolverClient } = await import('./client');
    const client = new SolverClient(fakeWorker);
    const seen: number[] = [];
    let resolved = false;
    await client
      .request<DockScoreRequest>(
        { type: 'dockScore', setups: [], forecast: undefined!, progress: true },
        {
          onProgress: (done, total) => {
            expect(resolved).toBe(false); // never after the result
            expect(total).toBe(3);
            seen.push(done);
          },
        },
      )
      .then((r) => {
        resolved = true;
        return r;
      });
    await new Promise((r) => setTimeout(r, 0)); // let the late message land
    expect(seen).toEqual([1, 2, 3]);
  });

  it('resolves normally when the caller passes no onProgress', async () => {
    let onmessage: ((e: MessageEvent) => void) | undefined;
    const fakeWorker = {
      postMessage: (m: unknown) => {
        const id = (m as { id: number }).id;
        queueMicrotask(() => {
          onmessage?.({
            data: { type: 'progress', id, protocolVersion: 1, done: 1, total: 2 },
          } as MessageEvent);
          onmessage?.({ data: { type: 'ok', id, protocolVersion: 1, result: [] } } as MessageEvent);
        });
      },
      addEventListener: (_: string, fn: (e: MessageEvent) => void) => {
        onmessage = fn;
      },
    } as unknown as Worker;
    const { SolverClient } = await import('./client');
    await expect(
      new SolverClient(fakeWorker).request<DockScoreRequest>({
        type: 'dockScore',
        setups: [],
        forecast: undefined!,
      }),
    ).resolves.toEqual([]);
  });
});

describe('SolverClient', () => {
  it('posts a structured-clone-safe copy of the request and correlates the reply', async () => {
    const posted: unknown[] = [];
    let onmessage: ((e: MessageEvent) => void) | undefined;
    const fakeWorker = {
      postMessage: (m: unknown) => {
        posted.push(m);
        structuredClone(m); // throws on proxies/functions
        queueMicrotask(() =>
          onmessage?.({
            data: { type: 'ok', id: (m as { id: number }).id, protocolVersion: 1, result: null },
          } as MessageEvent),
        );
      },
      addEventListener: (_: string, fn: (e: MessageEvent) => void) => {
        onmessage = fn;
      },
    } as unknown as Worker;
    const { SolverClient } = await import('./client');
    const client = new SolverClient(fakeWorker);
    // A getter-bearing object stands in for a reactive proxy: JSON keeps the value, drops the accessor.
    const proxyLike = new Proxy({ upperTurns: 1, lowerTurns: 0, forestayMm: 0 }, {});
    const result = await client.request<import('./protocol').OptimalRequest>({
      type: 'optimal',
      dock: proxyLike,
      condition: { twsKt: 10, twaDeg: 45, seaState: 1, crewKg: 300, sailset: 'jib' },
      optimiseTwa: false,
    });
    expect(result).toBeNull();
    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ id: 1, protocolVersion: 1, dock: { upperTurns: 1 } });
  });
});
