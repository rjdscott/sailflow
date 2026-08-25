import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  count,
  exportJson,
  reset,
  snapshot,
  TELEMETRY_EVENTS,
  TELEMETRY_LABELS,
  track,
  type TelemetryCounts,
} from './telemetry';

beforeEach(async () => {
  await reset();
});

describe('telemetry counters', () => {
  it('starts at zero for every event in the enum', async () => {
    const s = await snapshot();
    expect(Object.keys(s).sort()).toEqual([...TELEMETRY_EVENTS].sort());
    expect(Object.values(s).every((n) => n === 0)).toBe(true);
  });

  it('counts each event independently and cumulatively', async () => {
    await count('view.race');
    await count('view.race');
    await count('drill.started');

    const s = await snapshot();
    expect(s['view.race']).toBe(2);
    expect(s['drill.started']).toBe(1);
    expect(s['view.dock']).toBe(0);
  });

  it('survives sequential counts of every event', async () => {
    for (const e of TELEMETRY_EVENTS) await count(e);
    const s = await snapshot();
    expect(Object.values(s)).toEqual(TELEMETRY_EVENTS.map(() => 1));
  });

  it('track() increments without the caller awaiting', async () => {
    track('dock.commit');
    // track is fire-and-forget; count() with the same plumbing settles the queue.
    await count('dock.commit');
    expect((await snapshot())['dock.commit']).toBe(2);
  });
});

describe('exportJson', () => {
  it('is versioned JSON holding the full snapshot', async () => {
    await count('log.saved');
    const parsed = JSON.parse(await exportJson()) as { v: number; counts: TelemetryCounts };
    expect(parsed.v).toBe(1);
    expect(parsed.counts['log.saved']).toBe(1);
    expect(parsed.counts).toEqual(await snapshot());
  });
});

describe('reset', () => {
  it('puts every counter back to zero', async () => {
    await count('race.applyOptimum');
    await reset();
    expect((await snapshot())['race.applyOptimum']).toBe(0);
  });
});

describe('labels', () => {
  it('names every event, so the More card cannot render an undefined row', () => {
    for (const e of TELEMETRY_EVENTS) expect(TELEMETRY_LABELS[e]).toBeTruthy();
  });
});

describe('no network path (M-30: local-first or not at all)', () => {
  it('the module source contains no way to send anything off the device', () => {
    const src = readFileSync(fileURLToPath(new URL('./telemetry.ts', import.meta.url)), 'utf8');
    // Comments in the module talk *about* fetch, so strip them before matching.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const banned of [
      /\bfetch\s*\(/,
      /sendBeacon/,
      /XMLHttpRequest/,
      /WebSocket/,
      /EventSource/,
    ])
      expect(code).not.toMatch(banned);
  });
});
