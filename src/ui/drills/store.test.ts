import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DrillStore, dailySeed } from './store.svelte';
import { TEMPLATES, type DrillClient } from '../../lib/drills';
import type { DrillAttempt, DrillHistory } from '../../lib/drillHistory';
import type { OptimalTrimResult, RaceControls, SolveResult } from '../../core/types';
import { settings } from '../stores/settings.svelte';

const tiered = (v: number) => ({ value: v, tier: 'A' as const });

/**
 * A client that answers `trimmed` with a VMG derived from the trim (so a
 * better trim really is faster) and `optimalTrim` with a fixed answer key two
 * mainsheet clicks off the base. No worker, no physics.
 */
function fakeClient(optimumRace: RaceControls, optimumVmg = 5) {
  const calls: { type: string; fixed?: readonly string[] }[] = [];
  const client: DrillClient = {
    request(req: unknown) {
      const r = req as { type: string; controls: { race: RaceControls }; fixed?: string[] };
      calls.push({ type: r.type, fixed: r.fixed });
      if (r.type === 'trimmed') {
        // Slow in proportion to how far the mainsheet is from the key.
        const off = Math.abs(r.controls.race.mainsheet - optimumRace.mainsheet) / 5;
        return Promise.resolve({
          converged: true,
          iters: 3,
          bsKt: tiered(6),
          vmgKt: tiered(optimumVmg - off * 0.25),
        } as unknown as SolveResult);
      }
      return Promise.resolve({
        race: optimumRace,
        result: { converged: true, iters: 3, bsKt: tiered(6), vmgKt: tiered(optimumVmg) },
        moved: ['mainsheet'],
        iters: 9,
      } as unknown as OptimalTrimResult);
    },
  } as unknown as DrillClient;
  return { client, calls };
}

function fakeHistory(initial: DrillAttempt[] = []) {
  const attempts = [...initial];
  const history: DrillHistory = {
    async list() {
      return [...attempts];
    },
    async add(a) {
      attempts.push(a);
    },
    async clear() {
      attempts.length = 0;
    },
  };
  return { history, attempts };
}

/** The template the fake key is built for: two free controls, mainsheet first. */
const template = TEMPLATES.find((t) => t.free.includes('mainsheet'))!;
const keyRace = { ...template.base } as RaceControls;

const NOW = new Date('2026-08-25T09:00:00.000Z');
const now = () => NOW;

beforeEach(() => {
  settings.mode = 'simple';
});
afterEach(() => vi.useRealTimers());

describe('DrillStore.open', () => {
  it('generates a drill, keeps the answer key, and holds the locked controls', async () => {
    const { client, calls } = fakeClient(keyRace);
    const { history } = fakeHistory();
    const store = new DrillStore(client, history, now);
    await store.open(template, 1);

    expect(store.current?.templateId).toBe(template.id);
    expect(store.current?.seed).toBe(1);
    expect(store.controls).toEqual(store.current?.start);
    expect(store.loading).toBe(false);
    // The key request holds every control the drill does not hand over.
    const optimal = calls.find((c) => c.type === 'optimalTrim')!;
    for (const c of template.free) expect(optimal.fixed).not.toContain(c);
    expect(optimal.fixed!.length).toBeGreaterThan(0);
  });

  it('is deterministic: the same seed reopens the same drill', async () => {
    const { client } = fakeClient(keyRace);
    const store = new DrillStore(client, fakeHistory().history, now);
    await store.open(template, 4);
    const first = { ...store.current!.start };
    await store.open(template, 4);
    expect(store.current!.start).toEqual(first);
  });

  it('defaults to the daily seed, which is stable within a calendar day', () => {
    expect(dailySeed(new Date('2026-08-25T01:00:00'))).toBe(
      dailySeed(new Date('2026-08-25T23:00:00')),
    );
    expect(dailySeed(new Date('2026-08-25T01:00:00'))).not.toBe(
      dailySeed(new Date('2026-08-26T01:00:00')),
    );
  });
});

describe('DrillStore.check', () => {
  it('scores against the key, records the attempt, and refreshes the roll-up', async () => {
    const { client } = fakeClient(keyRace);
    const { history, attempts } = fakeHistory();
    const store = new DrillStore(client, history, now);
    await store.open(template, 1);
    await store.check();

    expect(store.score).toBeDefined();
    expect(store.score!.distanceSteps).toBeGreaterThan(0);
    expect(store.score!.medal).not.toBe('gold'); // the start is a validated fault
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      templateId: template.id,
      seed: 1,
      at: NOW.toISOString(),
      hintUsed: false,
      medal: store.score!.medal,
    });
    expect(store.best[template.id].attempts).toBe(1);
  });

  it('awards gold once the learner sits on the key', async () => {
    vi.useFakeTimers();
    const { client } = fakeClient(keyRace);
    const store = new DrillStore(client, fakeHistory().history, now);
    await store.open(template, 1);
    store.controls = { ...keyRace };
    store.solve();
    await vi.advanceTimersByTimeAsync(200);
    await store.check();
    expect(store.score!.distanceSteps).toBe(0);
    expect(store.score!.lossPct).toBe(0);
    expect(store.score!.medal).toBe('gold');
  });

  it('records that the hint was read, and clears the flag on the next drill', async () => {
    const { client } = fakeClient(keyRace);
    const { history, attempts } = fakeHistory();
    const store = new DrillStore(client, history, now);
    await store.open(template, 1);
    store.revealHint();
    await store.check();
    expect(attempts[0].hintUsed).toBe(true);
    expect(store.score!.hintUsed).toBe(true);
    await store.open(template, 2);
    expect(store.hintUsed).toBe(false);
  });
});

describe('DrillStore.solve', () => {
  it('marks an existing score stale instead of deleting it (M-06)', async () => {
    vi.useFakeTimers();
    const { client } = fakeClient(keyRace);
    const store = new DrillStore(client, fakeHistory().history, now);
    await store.open(template, 1);
    await store.check();
    const scored = store.score;

    store.controls.mainsheet = store.controls.mainsheet === 0 ? 5 : 0;
    store.solve();
    expect(store.score).toBe(scored); // coach line still on screen
    expect(store.scoreStale).toBe(true);

    await store.check();
    expect(store.scoreStale).toBe(false);
  });
});

describe('DrillStore.next', () => {
  it('walks the visible tier list only, and stops at its end (M-03)', async () => {
    const { client } = fakeClient(keyRace);
    const store = new DrillStore(client, fakeHistory().history, now);
    const visible = store.visible;
    expect(visible.every((t) => t.tier <= 2)).toBe(true);
    expect(visible.length).toBeLessThan(store.templates.length);

    await store.open(visible[0], 1);
    store.next();
    await Promise.resolve();
    await Promise.resolve();
    expect(store.template?.id).toBe(visible[1].id);

    await store.open(visible[visible.length - 1], 1);
    store.next();
    expect(store.template).toBeUndefined();
    expect(store.endNote).toMatch(/Advanced/);
  });

  it('reaches tier 3 in advanced mode', () => {
    const { client } = fakeClient(keyRace);
    const store = new DrillStore(client, fakeHistory().history, now);
    settings.mode = 'advanced';
    expect(store.visible.some((t) => t.tier === 3)).toBe(true);
  });
});

describe('DrillStore spacing', () => {
  it('puts never-attempted templates in the due list', async () => {
    const { client } = fakeClient(keyRace);
    const store = new DrillStore(client, fakeHistory().history, now);
    await store.refresh();
    expect(store.due).toHaveLength(store.templates.length);
    expect(store.due.every((s) => s.overdueDays >= 0)).toBe(true);
  });

  it('offers a Today drill the current mode can actually see', async () => {
    const { client } = fakeClient(keyRace);
    const store = new DrillStore(client, fakeHistory().history, now);
    await store.refresh();
    const visible = store.visible;
    const first = store.due.find((s) => visible.some((v) => v.id === s.templateId))!;
    expect(store.today!.id).toBe(first.templateId);
    expect(visible.some((t) => t.id === store.today!.id)).toBe(true);
  });
});

describe('DrillStore.visible ordering', () => {
  it('is tier-ordered, and Simple mode stops at tier 2 (M-03)', () => {
    const { client } = fakeClient(keyRace);
    const store = new DrillStore(client, fakeHistory().history, now);

    settings.mode = 'simple';
    const simple = store.visible;
    expect(simple.map((t) => t.tier)).toEqual([...simple.map((t) => t.tier)].sort());
    expect(simple.some((t) => t.tier === 3)).toBe(false);

    settings.mode = 'advanced';
    const advanced = store.visible;
    expect(advanced.map((t) => t.tier)).toEqual([...advanced.map((t) => t.tier)].sort());
    // Advanced is the same list plus tier 3, in the same relative order.
    expect(advanced.filter((t) => t.tier <= 2).map((t) => t.id)).toEqual(simple.map((t) => t.id));
    expect(advanced.some((t) => t.tier === 3)).toBe(true);
  });
});

describe('DrillStore history export and reset', () => {
  it('exports every attempt and resets the roll-up with the store (L-02)', async () => {
    const { client } = fakeClient(keyRace);
    const store = new DrillStore(client, fakeHistory().history, now);
    await store.open(template, 1);
    await store.check();

    const dump = JSON.parse(await store.exportHistory()) as { v: number; attempts: unknown[] };
    expect(dump.v).toBe(2);
    expect(dump.attempts).toHaveLength(1);
    expect(store.streak).toBe(1);

    await store.resetHistory();
    expect(store.best).toEqual({});
    expect(store.streak).toBe(0);
    expect(JSON.parse(await store.exportHistory())).toMatchObject({ attempts: [] });
  });
});

describe('DrillStore.check personal best', () => {
  it('carries the previous best distance so the sheet can name it', async () => {
    vi.useFakeTimers();
    const { client } = fakeClient(keyRace);
    const store = new DrillStore(client, fakeHistory().history, now);

    await store.open(template, 1);
    await store.check();
    const first = store.score!.distanceSteps;
    expect(store.score!.prevBestSteps).toBeNull();
    expect(store.score!.isBest).toBe(true);

    // Sitting on the key is closer than the fault start, so it is a new best.
    store.controls = { ...keyRace };
    store.solve();
    await vi.advanceTimersByTimeAsync(200);
    await store.check();
    expect(store.score!.prevBestSteps).toBe(first);
    expect(store.score!.isBest).toBe(true);
  });
});
