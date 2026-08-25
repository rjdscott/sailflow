/**
 * Local-first usage counters (audit ux-02 M-30).
 *
 * Counts a fixed enum of events into IndexedDB db `sailflow.telemetry.v1`, on
 * this device only. There is deliberately **no network path** out of this
 * module: no `fetch`, no `sendBeacon`, no socket — `telemetry.test.ts` asserts
 * that against the source text, so adding one fails the suite. If counters
 * ever need to leave the device, that is an ADR, not a patch.
 *
 * The whole map lives under one key, so a count is one get + one put inside a
 * single transaction and a snapshot is one get. Ten counters do not need an
 * index.
 */

export const TELEMETRY_EVENTS = [
  'view.race',
  'view.dock',
  'view.log',
  'view.drills',
  'view.more',
  'view.kit',
  'drill.started',
  'drill.checked',
  'race.applyOptimum',
  'race.abCompare',
  'race.puffReplay',
  'race.mode',
  'dock.commit',
  'log.saved',
] as const;

export type TelemetryEvent = (typeof TELEMETRY_EVENTS)[number];

/** Human labels for the More screen. Same order as `TELEMETRY_EVENTS`. */
export const TELEMETRY_LABELS: Record<TelemetryEvent, string> = {
  'view.race': 'Race opened',
  'view.dock': 'Dock opened',
  'view.log': 'Log opened',
  'view.drills': 'Drills opened',
  'view.more': 'More opened',
  'view.kit': 'Kit opened',
  'drill.started': 'Drills started',
  'drill.checked': 'Drills checked',
  'race.applyOptimum': 'Apply optimum used',
  'race.abCompare': 'A/B compares',
  'race.puffReplay': 'Puff replays',
  'race.mode': 'Modes chosen',
  'dock.commit': 'Rig committed',
  'log.saved': 'Log entries saved',
};

export type TelemetryCounts = Record<TelemetryEvent, number>;

const DB_NAME = 'sailflow.telemetry.v1';
const STORE = 'counts';
const KEY = 'all';

function zeroed(): TelemetryCounts {
  return Object.fromEntries(TELEMETRY_EVENTS.map((e) => [e, 0])) as TelemetryCounts;
}

let dbPromise: Promise<IDBDatabase> | undefined;

function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error as Error);
    });
  }
  return dbPromise;
}

function available(): boolean {
  return typeof indexedDB !== 'undefined';
}

/** Increment one counter. Rejects only if IndexedDB itself fails; see `track`. */
export async function count(event: TelemetryEvent): Promise<void> {
  if (!available()) return;
  const conn = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = conn.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const get = store.get(KEY);
    // Chained inside the request callback, not after an `await`: an IndexedDB
    // transaction commits as soon as control returns to the event loop.
    get.onsuccess = () => {
      const counts = { ...zeroed(), ...(get.result as Partial<TelemetryCounts> | undefined) };
      counts[event] = (counts[event] ?? 0) + 1;
      store.put(counts, KEY);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error as Error);
  });
}

/** Fire-and-forget `count`. What UI code calls: a counter is never worth a broken screen. */
export function track(event: TelemetryEvent): void {
  void count(event).catch((err: unknown) => console.warn('telemetry: count failed', err));
}

/** Every counter, zero-filled, so callers never branch on "not seen yet". */
export async function snapshot(): Promise<TelemetryCounts> {
  if (!available()) return zeroed();
  const conn = await db();
  const stored = await new Promise<Partial<TelemetryCounts> | undefined>((resolve, reject) => {
    const req = conn.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result as Partial<TelemetryCounts> | undefined);
    req.onerror = () => reject(req.error as Error);
  });
  return { ...zeroed(), ...stored };
}

/** The snapshot as pretty JSON — what the "Export usage JSON" button saves. */
export async function exportJson(): Promise<string> {
  return JSON.stringify({ v: 1, counts: await snapshot() }, null, 2);
}

/** Back to all zeros. */
export async function reset(): Promise<void> {
  if (!available()) return;
  const conn = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = conn.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error as Error);
  });
}
