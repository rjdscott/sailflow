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

export interface LogEntry {
  id: string;
  v: 1;
  date: string;
  venue: string;
  forecast: { minKt: number; likelyKt: number; maxKt: number };
  actual: { minKt: number; maxKt: number };
  seaState: SeaState;
  crewKg: number;
  dock: DockControls;
  race?: RaceControls;
  notes: string;
  fast: string;
  createdAt: string;
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
    return parsed as LogEntry[];
  } catch (err) {
    console.warn(`logStore: failed to read ${key}`, err);
    return [];
  }
}

function writeAll(key: string, entries: LogEntry[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(entries));
  } catch (err) {
    console.warn(`logStore: failed to write ${key}`, err);
  }
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
      return idbRequest(store.getAll());
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

/** IndexedDB when the runtime supports it, else localStorage. */
export function chooseLogStore(): LogStore {
  if (typeof indexedDB === 'undefined') return localStorageLogStore();
  requestPersistentStorage();
  return indexedDbLogStore();
}
