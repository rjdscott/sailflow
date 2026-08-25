/**
 * Tuning log persistence. Two implementations behind the same `LogStore`
 * interface: `localStorageLogStore` (MVP, still used as a fallback) and
 * `indexedDbLogStore` (Phase 08, preferred — iOS Safari PWAs can evict
 * localStorage but IndexedDB is the durable option). `chooseLogStore` picks
 * whichever the runtime supports.
 *
 * localStorage access is wrapped in try/catch — iOS Safari PWAs can throw in
 * private contexts, and stored data can be corrupted or hand-edited.
 */

import type { DockControls, RaceControls, SeaState } from '../core/types';

/**
 * A number the sailor may not have recorded. `null` is "not recorded" — 0
 * cannot say that, because 0 kt and 0 kg are values a form can produce by
 * accident and an export cannot tell apart from data (audit ux-02 H-05).
 * `dock` is exempt: 0 turns / 0 mm is the base tune, a real setting.
 */
export type LogNumber = number | null;

/**
 * `draft` — filed by a Dock commit, wind and outcome still to come.
 * `complete` — the sailor has been through the form and saved it.
 */
export type LogStatus = 'draft' | 'complete';

/** What happened. Empty strings / null until the racing is over. */
export interface LogOutcome {
  /** Free text: "3, 1, 7" or "mid-fleet upwind, good downwind". */
  result: string;
  /** Overall placing for the day, when there is one. */
  placing: LogNumber;
}

export const LOG_SCHEMA_VERSION = 2;

export interface LogEntry {
  id: string;
  v: 2;
  date: string;
  venue: string;
  forecast: { minKt: LogNumber; likelyKt: LogNumber; maxKt: LogNumber };
  actual: { minKt: LogNumber; maxKt: LogNumber };
  seaState: SeaState;
  crewKg: LogNumber;
  dock: DockControls;
  race?: RaceControls;
  notes: string;
  /** What was fast — the outcome field the form has always had. */
  fast: string;
  status: LogStatus;
  outcome: LogOutcome;
  createdAt: string;
}

/**
 * v1 → v2: add `status` and `outcome`. Applied on read rather than as an
 * IndexedDB version bump — the keyPath and store shape are unchanged, so
 * there is nothing for `onupgradeneeded` to do, and migrating on read also
 * covers rows arriving from an old export. Idempotent: a v2 row passes
 * through untouched.
 */
export function migrateEntry(raw: unknown): LogEntry {
  const e = raw as LogEntry & { v: number };
  if (e.v === LOG_SCHEMA_VERSION && e.status && e.outcome) return e;
  return {
    ...e,
    v: LOG_SCHEMA_VERSION,
    status: e.status ?? 'complete',
    outcome: e.outcome ?? { result: '', placing: null },
  };
}

/** One entry per committed day, so a second commit updates rather than duplicates. */
export function draftId(date: string): string {
  return `draft-${date}`;
}

export interface LogStore {
  list(): Promise<LogEntry[]>;
  put(e: LogEntry): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

/** crypto.randomUUID when available, else a counter+time fallback. UI-only: core may not touch Date. */
let fallbackCounter = 0;
export function nextId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  fallbackCounter += 1;
  return `${Date.now()}-${fallbackCounter}`;
}

function readAll(key: string): LogEntry[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`logStore: corrupt data at ${key} (not an array), resetting`);
      return [];
    }
    return parsed.map(migrateEntry);
  } catch (err) {
    console.warn(`logStore: failed to read ${key}`, err);
    return [];
  }
}

/**
 * Throws on failure. It used to swallow into a console.warn, which let the
 * UI toast "Entry saved" over a write that never happened (audit ux-02 M-07).
 */
function writeAll(key: string, entries: LogEntry[]): void {
  localStorage.setItem(key, JSON.stringify(entries));
}

export function localStorageLogStore(key = 'sailflow.log.v1'): LogStore {
  return {
    async list(): Promise<LogEntry[]> {
      return readAll(key);
    },
    async put(e: LogEntry): Promise<void> {
      const entries = readAll(key);
      const idx = entries.findIndex((x) => x.id === e.id);
      if (idx >= 0) entries[idx] = e;
      else entries.push(e);
      writeAll(key, entries);
    },
    async remove(id: string): Promise<void> {
      writeAll(
        key,
        readAll(key).filter((x) => x.id !== id),
      );
    },
    async clear(): Promise<void> {
      writeAll(key, []);
    },
  };
}

const STORE_NAME = 'log';

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error as Error);
  });
}

function openDb(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
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

/**
 * One-time copy of any localStorage-resident entries into a freshly opened
 * IndexedDB store. localStorage is left untouched (per the migration
 * contract) — a `<lsKey>.migrated` marker key stops it re-copying on every
 * open. `put` is idempotent by id, so a lost/duplicated marker just re-copies
 * harmlessly rather than corrupting anything.
 */
async function migrateFromLocalStorage(db: IDBDatabase, lsKey: string): Promise<void> {
  const migratedFlag = `${lsKey}.migrated`;
  try {
    if (localStorage.getItem(migratedFlag)) return;
  } catch {
    return; // no localStorage in this context — nothing to migrate
  }
  const entries = readAll(lsKey);
  if (entries.length > 0) {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const e of entries) store.put(e);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error as Error);
    });
  }
  try {
    localStorage.setItem(migratedFlag, '1');
  } catch {
    // best-effort marker; a re-run just re-copies (harmless, see above)
  }
}

/** IndexedDB-backed LogStore: db `sailflow` (or `dbName`), store `log`, keyPath `id`. */
export function indexedDbLogStore(dbName = 'sailflow', lsKey = 'sailflow.log.v1'): LogStore {
  let dbPromise: Promise<IDBDatabase> | undefined;
  function db(): Promise<IDBDatabase> {
    if (!dbPromise) {
      dbPromise = openDb(dbName).then(async (opened) => {
        await migrateFromLocalStorage(opened, lsKey);
        return opened;
      });
    }
    return dbPromise;
  }

  return {
    async list(): Promise<LogEntry[]> {
      const conn = await db();
      const store = conn.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
      return (await idbRequest(store.getAll())).map(migrateEntry);
    },
    async put(e: LogEntry): Promise<void> {
      const conn = await db();
      const store = conn.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
      await idbRequest(store.put(e));
    },
    async remove(id: string): Promise<void> {
      const conn = await db();
      const store = conn.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
      await idbRequest(store.delete(id));
    },
    async clear(): Promise<void> {
      const conn = await db();
      const store = conn.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
      await idbRequest(store.clear());
    },
  };
}

let persistRequested = false;

/** Best-effort `navigator.storage.persist()`, called at most once per session. */
function requestPersistentStorage(): void {
  if (persistRequested) return;
  persistRequested = true;
  try {
    void navigator.storage?.persist?.();
  } catch {
    // unsupported or blocked — the log still works, just evictable
  }
}

/** Which engine `chooseLogStore` picks here. Shown on the settings screen. */
export function logStoreEngine(): 'IndexedDB' | 'localStorage' {
  return typeof indexedDB === 'undefined' ? 'localStorage' : 'IndexedDB';
}

/** IndexedDB when the runtime supports it, else localStorage. */
export function chooseLogStore(): LogStore {
  if (logStoreEngine() === 'localStorage') return localStorageLogStore();
  requestPersistentStorage();
  return indexedDbLogStore();
}
