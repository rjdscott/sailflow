/**
 * Reactive wrapper around LogStore for the Log screen. Persistence itself
 * lives in src/lib/logStore.ts (IndexedDB when available, localStorage
 * fallback) — this class just holds the loaded list as Svelte state and
 * re-loads after every write, since the log is small enough that re-reading
 * is simpler than patching state in place.
 *
 * Every storage call goes through `guard`, so a blocked or failing store
 * leaves a message in `error` for the screen to render instead of an empty
 * list or a lying toast (audit ux-02 M-07).
 */

import { chooseLogStore, draftId, nextId, type LogEntry, type LogStore } from '../../lib/logStore';
import { download, fromJson, toCsv, toJson } from '../../lib/logExport';
import { sortEntries } from './logic';
import type { RigLock } from '../stores/rigLock.svelte';

/** Partial entry another screen can pre-fill before the log form opens. */
export type LogDraft = Partial<LogEntry>;

export interface ImportSummary {
  added: number;
  reasons: string[];
}

/** Parsed-but-not-yet-written import, so the count can be shown first (M-21). */
export interface ImportPreview {
  entries: LogEntry[];
  reasons: string[];
}

/** Transient local, straight to a string: no Date is ever held in $state. */
const nowIso = (): string => new Date().toISOString();

export class LogUiStore {
  entries: LogEntry[] = $state([]);
  draft: LogDraft = $state({});
  /** Last storage failure, in words the Log screen can render. */
  error: string | null = $state.raw(null);

  constructor(private store: LogStore = chooseLogStore()) {}

  /** Runs a storage call, turning a rejection into `error` and `false`. */
  private async guard(what: string, fn: () => Promise<void>): Promise<boolean> {
    try {
      await fn();
      this.error = null;
      return true;
    } catch (err) {
      this.error = `Could not ${what} — ${err instanceof Error ? err.message : String(err)}. Your entries are still on this device; try again, or export a backup.`;
      return false;
    }
  }

  async load(): Promise<boolean> {
    return this.guard('read the log', async () => {
      this.entries = sortEntries(await this.store.list());
    });
  }

  /** Create a new entry. Fills id/createdAt if the caller didn't set them. */
  async add(
    entry: Omit<LogEntry, 'id' | 'createdAt'> & Partial<Pick<LogEntry, 'id' | 'createdAt'>>,
  ): Promise<boolean> {
    const full: LogEntry = {
      ...entry,
      id: entry.id || nextId(),
      createdAt: entry.createdAt || nowIso(),
    };
    return this.guard('save the entry', async () => {
      await this.store.put(full);
      this.entries = sortEntries(await this.store.list());
    });
  }

  async update(entry: LogEntry): Promise<boolean> {
    return this.guard('save the entry', async () => {
      await this.store.put(entry);
      this.entries = sortEntries(await this.store.list());
    });
  }

  async remove(id: string): Promise<boolean> {
    return this.guard('delete the entry', async () => {
      await this.store.remove(id);
      this.entries = sortEntries(await this.store.list());
    });
  }

  /**
   * Committing the rig files a real, persisted entry — status `'draft'` — so the
   * promise on the commit button ("starts a log entry") survives a reload
   * (audit ux-02 M-04). One entry per committed day: a second commit updates
   * it rather than filing a duplicate, keeping whatever has been typed since.
   *
   * ponytail: deterministic `draft-<date>` id instead of a lookup index. If
   * multi-boat logging ever lands, key it on boat + date.
   */
  async startDraft(lock: RigLock): Promise<boolean> {
    const date = lock.committedAt.slice(0, 10);
    const id = draftId(date);
    return this.guard('start the log entry', async () => {
      const list = await this.store.list();
      const base: LogEntry = list.find((e) => e.id === id) ?? {
        id,
        v: 2,
        date,
        venue: '',
        forecast: { minKt: null, likelyKt: null, maxKt: null },
        actual: { minKt: null, maxKt: null },
        seaState: lock.forecast.seaState,
        crewKg: null,
        dock: { upperTurns: 0, lowerTurns: 0, forestayMm: 0 },
        notes: '',
        fast: '',
        status: 'draft',
        outcome: { result: '', placing: null },
        createdAt: nowIso(),
      };
      // Copied field by field: the lock object is shared with rigLock and
      // Race, and an entry aliasing it would let the log form rewrite the
      // committed rig (audit ux-02 H-06). Three numbers deep, so a spread is
      // a real copy here.
      await this.store.put({
        ...base,
        date,
        status: 'draft',
        forecast: {
          minKt: lock.forecast.minKt,
          likelyKt: lock.forecast.likelyKt,
          maxKt: lock.forecast.maxKt,
        },
        seaState: lock.forecast.seaState,
        crewKg: lock.forecast.crewKg,
        dock: { ...lock.setup },
      });
      this.entries = sortEntries(await this.store.list());
    });
  }

  /** Parse without writing, so the screen can show the count and ask first. */
  parseImport(text: string): ImportPreview {
    return fromJson(text);
  }

  /**
   * `merge` puts each row by id (idempotent, replaces on a matching id);
   * `replace` clears the log first. Both are asked for explicitly (M-21).
   */
  async applyImport(preview: ImportPreview, mode: 'merge' | 'replace'): Promise<ImportSummary> {
    await this.guard('import the log', async () => {
      if (mode === 'replace') await this.store.clear();
      for (const e of preview.entries) await this.store.put(e);
      this.entries = sortEntries(await this.store.list());
    });
    return { added: this.error ? 0 : preview.entries.length, reasons: preview.reasons };
  }

  /** Delete every entry. Two-step confirm lives in the UI (M-21). */
  async reset(): Promise<boolean> {
    return this.guard('reset the log', async () => {
      await this.store.clear();
      this.entries = sortEntries(await this.store.list());
    });
  }

  exportJson(): void {
    download('sailflow-log.json', toJson(this.entries), 'application/json');
  }

  exportCsv(): void {
    download('sailflow-log.csv', toCsv(this.entries), 'text/csv');
  }

  /** Another screen can call this to hand a partially-filled entry to the form. */
  setDraft(partial: LogDraft): void {
    this.draft = { ...this.draft, ...partial };
  }

  clearDraft(): void {
    this.draft = {};
  }
}

export const logStoreUi = new LogUiStore();
