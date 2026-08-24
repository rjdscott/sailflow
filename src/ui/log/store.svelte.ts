/**
 * Reactive wrapper around LogStore for the Log screen. Persistence itself
 * lives in src/lib/logStore.ts (localStorage now, IndexedDB in Phase 08) —
 * this class just holds the loaded list as Svelte state and re-loads after
 * every write, since a localStorage-backed store is small enough that
 * re-reading is simpler than patching state in place.
 */

import { localStorageLogStore, nextId, type LogEntry, type LogStore } from '../../lib/logStore';
import { download, fromJson, toCsv, toJson } from '../../lib/logExport';

/** Partial entry Dock mode can pre-fill before the log form opens. */
export type LogDraft = Partial<LogEntry>;

export interface ImportSummary {
  added: number;
  reasons: string[];
}

class LogUiStore {
  entries: LogEntry[] = $state([]);
  draft: LogDraft = $state({});

  constructor(private store: LogStore = localStorageLogStore()) {}

  async load(): Promise<void> {
    const list = await this.store.list();
    this.entries = list
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  /** Create a new entry. Fills id/createdAt if the caller didn't set them. */
  async add(
    entry: Omit<LogEntry, 'id' | 'createdAt'> & Partial<Pick<LogEntry, 'id' | 'createdAt'>>,
  ): Promise<void> {
    const full: LogEntry = {
      ...entry,
      id: entry.id ?? nextId(),
      createdAt: entry.createdAt ?? new Date().toISOString(),
    };
    await this.store.put(full);
    await this.load();
  }

  async update(entry: LogEntry): Promise<void> {
    await this.store.put(entry);
    await this.load();
  }

  async remove(id: string): Promise<void> {
    await this.store.remove(id);
    await this.load();
  }

  async import(text: string): Promise<ImportSummary> {
    const { entries, reasons } = fromJson(text);
    for (const e of entries) await this.store.put(e);
    await this.load();
    return { added: entries.length, reasons };
  }

  exportJson(): void {
    download('sailflow-log.json', toJson(this.entries), 'application/json');
  }

  exportCsv(): void {
    download('sailflow-log.csv', toCsv(this.entries), 'text/csv');
  }

  /** Dock mode can call this to hand a partially-filled entry to the log form. */
  setDraft(partial: LogDraft): void {
    this.draft = { ...this.draft, ...partial };
  }

  clearDraft(): void {
    this.draft = {};
  }
}

export const logStoreUi = new LogUiStore();
