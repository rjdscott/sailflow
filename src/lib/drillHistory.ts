/**
 * Drill attempt history: every Check, kept forever, per template.
 *
 * Same shape as `logStore` — an interface with an IndexedDB implementation
 * and a localStorage fallback, chosen at runtime (ADR 0010) — because the
 * same constraint applies: iOS Safari PWAs evict localStorage but keep
 * IndexedDB, and a practice history that vanishes takes the spacing schedule
 * with it.
 *
 * v1 stored `Record<drillId, lowestLossPct>` under `sailflow.drills.v1` and
 * nothing else: no date, no attempt count, no control distance (audit ux-02
 * M-17). Those bests are migrated in on first open as one synthetic attempt
 * each, with `distanceSteps: null` — v1 never measured it and inventing a
 * number would be a lie.
 */
import type { Medal } from './drills';

export interface DrillAttempt {
  /** Unique per attempt. */
  id: string;
  templateId: string;
  /** The seed the drill was generated from. `0` for a migrated v1 best. */
  seed: number;
  /** ISO 8601, local clock at the moment Check was pressed. */
  at: string;
  /** L1 control distance from the answer key. `null` for a migrated v1 best. */
  distanceSteps: number | null;
  lossPct: number;
  medal: Medal;
  hintUsed: boolean;
  /** Milliseconds from opening the drill to pressing Check. */
  ms: number;
}

export interface DrillHistory {
  list(): Promise<DrillAttempt[]>;
  add(a: DrillAttempt): Promise<void>;
  clear(): Promise<void>;
}

/** v1 key, read once for migration and then left alone. */
export const V1_BEST_KEY = 'sailflow.drills.v1';
const LS_KEY = 'sailflow.drills.v2';
const STORE_NAME = 'drillAttempts';

/** crypto.randomUUID when available, else a counter+time fallback. */
let fallbackCounter = 0;
export function attemptId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  fallbackCounter += 1;
  return `${Date.now()}-${fallbackCounter}`;
}

/**
 * The v1 best-score map turned into one attempt per drill. `at` is injected so
 * the caller (and the test) decides the clock; the medal is recomputed from
 * the stored loss, which is all v1 kept.
 */
export function migratedAttempts(raw: string | null, at: string, medalOf: (loss: number) => Medal) {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
  const out: DrillAttempt[] = [];
  for (const [templateId, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    out.push({
      id: `v1:${templateId}`,
      templateId,
      seed: 0,
      at,
      distanceSteps: null,
      lossPct: v,
      medal: medalOf(v),
      hintUsed: false,
      ms: 0,
    });
  }
  return out;
}

function readLs(key: string): DrillAttempt[] {
  // No storage at all (node, a worker) is not a corruption: say nothing.
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`drillHistory: corrupt data at ${key} (not an array), resetting`);
      return [];
    }
    return parsed as DrillAttempt[];
  } catch (err) {
    console.warn(`drillHistory: failed to read ${key}`, err);
    return [];
  }
}

function writeLs(key: string, attempts: DrillAttempt[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(attempts));
  } catch (err) {
    console.warn(`drillHistory: failed to write ${key}`, err);
  }
}

/** Reads the v1 map, returns the attempts it implies, and marks it migrated. */
function takeV1(at: string, medalOf: (loss: number) => Medal): DrillAttempt[] {
  const flag = `${V1_BEST_KEY}.migrated`;
  try {
    if (localStorage.getItem(flag)) return [];
    const attempts = migratedAttempts(localStorage.getItem(V1_BEST_KEY), at, medalOf);
    localStorage.setItem(flag, '1');
    return attempts;
  } catch {
    return []; // no localStorage in this context — nothing to migrate
  }
}

export function localStorageDrillHistory(
  key = LS_KEY,
  now: () => string = () => new Date().toISOString(),
  medalOf: (loss: number) => Medal = lossMedal,
): DrillHistory {
  let migrated = false;
  function all(): DrillAttempt[] {
    const stored = readLs(key);
    if (migrated) return stored;
    migrated = true;
    const v1 = takeV1(now(), medalOf);
    if (v1.length === 0) return stored;
    const merged = [...stored, ...v1.filter((a) => !stored.some((s) => s.id === a.id))];
    writeLs(key, merged);
    return merged;
  }
  return {
    async list() {
      return all();
    },
    async add(a) {
      writeLs(key, [...all(), a]);
    },
    async clear() {
      writeLs(key, []);
    },
  };
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error as Error);
  });
}

function openDb(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Its own database, not a second store inside `sailflow`: logStore opens
    // that one at version 1, and a version bump under it throws VersionError
    // and takes the tuning log down with it.
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error as Error);
  });
}

export function indexedDbDrillHistory(
  dbName = 'sailflow-drills',
  now: () => string = () => new Date().toISOString(),
  medalOf: (loss: number) => Medal = lossMedal,
): DrillHistory {
  let dbPromise: Promise<IDBDatabase> | undefined;
  function db(): Promise<IDBDatabase> {
    if (!dbPromise) {
      dbPromise = openDb(dbName).then(async (opened) => {
        const v1 = takeV1(now(), medalOf);
        if (v1.length) {
          const tx = opened.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          // `put` is keyed on `v1:<id>`, so a lost migration marker re-copies
          // the same rows instead of duplicating them.
          for (const a of v1) store.put(a);
          await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error as Error);
          });
        }
        return opened;
      });
    }
    return dbPromise;
  }
  return {
    async list() {
      const conn = await db();
      const store = conn.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
      return idbRequest(store.getAll());
    },
    async add(a) {
      const conn = await db();
      const store = conn.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
      await idbRequest(store.put(a));
    },
    async clear() {
      const conn = await db();
      const store = conn.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
      await idbRequest(store.clear());
    },
  };
}

/** IndexedDB when the runtime supports it, else localStorage. */
export function chooseDrillHistory(): DrillHistory {
  return typeof indexedDB === 'undefined' ? localStorageDrillHistory() : indexedDbDrillHistory();
}

/**
 * v1 kept only a loss percent, so a migrated attempt's medal has to come from
 * loss alone. The v1 bands, unchanged, so an old gold stays gold.
 * prov: assumed (the v1 `MEDAL_BANDS`).
 */
export function lossMedal(lossPct: number): Medal {
  if (lossPct <= 1 + 1e-9) return 'gold';
  if (lossPct <= 3 + 1e-9) return 'silver';
  if (lossPct <= 6 + 1e-9) return 'bronze';
  return 'none';
}

export interface DrillBest {
  attempts: number;
  /** Lowest loss recorded. */
  lossPct: number;
  /** Lowest control distance recorded, or `null` if only v1 bests exist. */
  distanceSteps: number | null;
  /** Best medal earned, by band order. */
  medal: Medal;
  /** ISO of the most recent attempt. */
  lastAt: string;
}

const MEDAL_RANK: Record<Medal, number> = { gold: 3, silver: 2, bronze: 1, none: 0 };

/** Per-template roll-up of the attempt list, for the drill cards and spacing. */
export function bestByTemplate(attempts: readonly DrillAttempt[]): Record<string, DrillBest> {
  const out: Record<string, DrillBest> = {};
  for (const a of attempts) {
    const cur = out[a.templateId];
    if (!cur) {
      out[a.templateId] = {
        attempts: 1,
        lossPct: a.lossPct,
        distanceSteps: a.distanceSteps,
        medal: a.medal,
        lastAt: a.at,
      };
      continue;
    }
    cur.attempts += 1;
    cur.lossPct = Math.min(cur.lossPct, a.lossPct);
    if (a.distanceSteps !== null)
      cur.distanceSteps =
        cur.distanceSteps === null ? a.distanceSteps : Math.min(cur.distanceSteps, a.distanceSteps);
    if (MEDAL_RANK[a.medal] > MEDAL_RANK[cur.medal]) cur.medal = a.medal;
    if (a.at > cur.lastAt) cur.lastAt = a.at;
  }
  return out;
}
