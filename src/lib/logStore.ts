/**
 * Tuning log persistence. localStorage impl for the MVP; IndexedDB impl
 * lands in Phase 08 behind the same LogStore interface.
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
