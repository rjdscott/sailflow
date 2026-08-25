import { describe, expect, it } from 'vitest';
import type { LogEntry, LogStore } from '../../lib/logStore';
import { toJson } from '../../lib/logExport';
import type { RigLock } from '../stores/rigLock.svelte';
import { LogUiStore } from './store.svelte';

/** In-memory LogStore. `fail` makes every call reject, like a blocked IndexedDB. */
function fakeStore(): LogStore & { rows: Map<string, LogEntry>; fail: boolean } {
  const rows = new Map<string, LogEntry>();
  const api = {
    rows,
    fail: false,
    async list() {
      if (api.fail) throw new Error('store blocked');
      // A real store deserialises, so callers never get the stored object back.
      return structuredClone([...rows.values()]);
    },
    async put(e: LogEntry) {
      if (api.fail) throw new Error('store blocked');
      rows.set(e.id, structuredClone(e));
    },
    async remove(id: string) {
      if (api.fail) throw new Error('store blocked');
      rows.delete(id);
    },
    async clear() {
      if (api.fail) throw new Error('store blocked');
      rows.clear();
    },
  };
  return api;
}

function lock(over: Partial<RigLock> = {}): RigLock {
  return {
    setup: { upperTurns: 3, lowerTurns: -1, forestayMm: 20 },
    committedAt: '2026-08-25T22:00:00.000Z',
    forecast: { minKt: 6, likelyKt: 10, maxKt: 14, seaState: 2, crewKg: 285 },
    ...over,
  };
}

function entry(over: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'a',
    v: 2,
    date: '2026-08-20',
    venue: 'Sandringham',
    forecast: { minKt: 8, likelyKt: 12, maxKt: 16 },
    actual: { minKt: 9, maxKt: 14 },
    seaState: 1,
    crewKg: 260,
    dock: { upperTurns: 2, lowerTurns: 1, forestayMm: 10 },
    notes: '',
    fast: '',
    status: 'complete',
    outcome: { result: '', placing: null },
    createdAt: '2026-08-20T10:00:00.000Z',
    ...over,
  };
}

describe('startDraft (Dock commit → a real log entry)', () => {
  it('persists a draft entry carrying the committed rig and forecast', async () => {
    const store = fakeStore();
    const ui = new LogUiStore(store);
    await ui.startDraft(lock());

    expect(store.rows.size).toBe(1);
    const [draft] = [...store.rows.values()];
    expect(draft.status).toBe('draft');
    expect(draft.date).toBe('2026-08-25');
    expect(draft.dock).toEqual({ upperTurns: 3, lowerTurns: -1, forestayMm: 20 });
    expect(draft.forecast).toEqual({ minKt: 6, likelyKt: 10, maxKt: 14 });
    expect(draft.crewKg).toBe(285);
    // the outcome is still owed
    expect(draft.actual).toEqual({ minKt: null, maxKt: null });
  });

  it('lists the draft first, ahead of a newer finished entry', async () => {
    const store = fakeStore();
    const ui = new LogUiStore(store);
    await store.put(entry({ id: 'done', date: '2026-08-26' }));
    await ui.startDraft(lock());
    expect(ui.entries.map((e) => e.status)).toEqual(['draft', 'complete']);
  });

  it('updates today’s draft on a second commit instead of filing a duplicate', async () => {
    const store = fakeStore();
    const ui = new LogUiStore(store);
    await ui.startDraft(lock());
    const id = [...store.rows.keys()][0];
    // the sailor has typed a venue into the draft in the meantime
    await ui.update({ ...store.rows.get(id)!, venue: 'Black Rock' });

    await ui.startDraft(lock({ setup: { upperTurns: 5, lowerTurns: 0, forestayMm: 0 } }));
    expect(store.rows.size).toBe(1);
    expect(store.rows.get(id)!.dock.upperTurns).toBe(5);
    expect(store.rows.get(id)!.venue).toBe('Black Rock');
  });

  it('never aliases the committed rig, so editing the entry cannot rewrite it', async () => {
    const store = fakeStore();
    const ui = new LogUiStore(store);
    const committed = lock();
    await ui.startDraft(committed);

    // what the editor would do: bind to the loaded entry and type
    ui.entries[0].dock.upperTurns = 99;
    ui.entries[0].forecast.minKt = 99;
    expect(committed.setup.upperTurns).toBe(3);
    expect(committed.forecast.minKt).toBe(6);
  });

  it('is completed by saving it through the form', async () => {
    const store = fakeStore();
    const ui = new LogUiStore(store);
    await ui.startDraft(lock());
    const draft = ui.entries[0];
    await ui.update({ ...draft, status: 'complete', actual: { minKt: 7, maxKt: 13 } });
    expect(store.rows.size).toBe(1);
    expect(ui.entries[0].status).toBe('complete');
  });
});

describe('storage failures surface (audit ux-02 M-07)', () => {
  it('a failed read leaves an error, not a silently empty log', async () => {
    const store = fakeStore();
    const ui = new LogUiStore(store);
    store.fail = true;
    expect(await ui.load()).toBe(false);
    expect(ui.error).toContain('read the log');
    expect(ui.entries).toEqual([]);
  });

  it('a failed save reports false so the editor can stay open', async () => {
    const store = fakeStore();
    const ui = new LogUiStore(store);
    store.fail = true;
    expect(await ui.add(entry())).toBe(false);
    expect(ui.error).toContain('save the entry');
  });

  it('clears the error once a call succeeds', async () => {
    const store = fakeStore();
    const ui = new LogUiStore(store);
    store.fail = true;
    await ui.load();
    store.fail = false;
    await ui.load();
    expect(ui.error).toBeNull();
  });
});

describe('import (audit ux-02 M-21)', () => {
  it('parses without writing, so the count can be shown first', () => {
    const store = fakeStore();
    const ui = new LogUiStore(store);
    const preview = ui.parseImport(toJson([entry({ id: 'x' }), entry({ id: 'y' })]));
    expect(preview.entries).toHaveLength(2);
    expect(store.rows.size).toBe(0);
  });

  it('merge keeps existing entries; replace clears them first', async () => {
    const store = fakeStore();
    const ui = new LogUiStore(store);
    await ui.add(entry({ id: 'mine' }));
    const preview = ui.parseImport(toJson([entry({ id: 'theirs' })]));

    await ui.applyImport(preview, 'merge');
    expect([...store.rows.keys()].sort()).toEqual(['mine', 'theirs']);

    await ui.applyImport(ui.parseImport(toJson([entry({ id: 'theirs' })])), 'replace');
    expect([...store.rows.keys()]).toEqual(['theirs']);
  });
});

describe('reset', () => {
  it('deletes every entry', async () => {
    const store = fakeStore();
    const ui = new LogUiStore(store);
    await ui.add(entry({ id: 'a' }));
    await ui.add(entry({ id: 'b' }));
    expect(await ui.reset()).toBe(true);
    expect(ui.entries).toEqual([]);
    expect(store.rows.size).toBe(0);
  });
});
