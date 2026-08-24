/**
 * Append-only local history of model-vs-guide disagreements.
 *
 * The brief asks for every divergence to be logged so patterns are visible
 * over time. This is a diagnostic breadcrumb trail, not the tuning log — it is
 * localStorage (small, synchronous, disposable), capped, and every access is
 * wrapped because iOS Safari throws in private contexts.
 */
import type { GuideId } from './reference';
import type { SeaState } from '../core/types';

const KEY = 'sailflow.divergence.v1';
const CAP = 500;

export interface DivergenceRow {
  /** ISO timestamp. */
  at: string;
  twsKt: number;
  seaState: SeaState;
  crewKg: number;
  model: { uppersTurns: number; lowersTurns: number; bsKt: number; twaDeg: number };
  guide: GuideId;
  guideTurns: { uppers: number; lowers: number };
  delta: { uppers: number; lowers: number };
}

function read(): DivergenceRow[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as DivergenceRow[]) : [];
  } catch {
    return [];
  }
}

function write(rows: DivergenceRow[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    // ignore: no persistence available (private mode, quota, etc.)
  }
}

export function listDivergences(): DivergenceRow[] {
  return read();
}

export function clearDivergences(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** A disagreement worth recording is at least one full turn on either shroud. */
function isDivergent(row: DivergenceRow): boolean {
  return Math.abs(row.delta.uppers) >= 1 || Math.abs(row.delta.lowers) >= 1;
}

/**
 * Append `row` if it disagrees by >= 1 turn and isn't a repeat of the last
 * entry for the same guide and wind speed. Slider drags fire continuously;
 * without the dedupe the history is 500 copies of one moment. Returns whether
 * the row was stored.
 */
export function logDivergence(row: DivergenceRow): boolean {
  if (!isDivergent(row)) return false;
  const rows = read();
  const prev = [...rows].reverse().find((r) => r.guide === row.guide && r.twsKt === row.twsKt);
  if (
    prev &&
    prev.delta.uppers === row.delta.uppers &&
    prev.delta.lowers === row.delta.lowers &&
    prev.model.uppersTurns === row.model.uppersTurns &&
    prev.model.lowersTurns === row.model.lowersTurns
  ) {
    return false;
  }
  rows.push(row);
  write(rows.slice(-CAP));
  return true;
}

export interface DivergenceSummary {
  count: number;
  meanUppers: number;
  meanLowers: number;
}

/** Mean signed delta per guide: which way the model leans, and how often. */
export function divergenceSummary(): Partial<Record<GuideId, DivergenceSummary>> {
  const out: Partial<Record<GuideId, DivergenceSummary>> = {};
  for (const row of read()) {
    const s = (out[row.guide] ??= { count: 0, meanUppers: 0, meanLowers: 0 });
    s.count += 1;
    s.meanUppers += (row.delta.uppers - s.meanUppers) / s.count;
    s.meanLowers += (row.delta.lowers - s.meanLowers) / s.count;
  }
  return out;
}
