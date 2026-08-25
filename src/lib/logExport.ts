/**
 * Tuning log JSON/CSV export + import. Pure data functions except
 * `download`, which touches the DOM (Blob + anchor click) and is UI-only.
 */

import type { DockControls, RaceControls } from '../core/types';
import { LOG_SCHEMA_VERSION, migrateEntry, type LogEntry } from './logStore';

export function toJson(entries: LogEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export interface ImportResult {
  entries: LogEntry[];
  reasons: string[];
}

const SEA_STATES = new Set([0, 1, 2, 3, 4]);

function isDockControls(v: unknown): v is DockControls {
  if (typeof v !== 'object' || v === null) return false;
  const d = v as Record<string, unknown>;
  return (
    typeof d.upperTurns === 'number' &&
    typeof d.lowerTurns === 'number' &&
    typeof d.forestayMm === 'number'
  );
}

const RACE_FIELDS: (keyof RaceControls)[] = [
  'backstay',
  'mainsheet',
  'traveller',
  'cunningham',
  'outhaul',
  'vang',
  'jibSheet',
  'jibLead',
  'inhauler',
  'mainHalyard',
  'jibHalyard',
];

function isRaceControls(v: unknown): v is RaceControls {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return RACE_FIELDS.every((f) => typeof r[f] === 'number');
}

/** A recorded number, or `null` for "not recorded" (see LogNumber). */
function isLogNumber(v: unknown): boolean {
  return typeof v === 'number' || v === null;
}

/** Validate one row; returns a reason string if invalid, undefined if ok. */
function validateRow(row: unknown, i: number): string | undefined {
  if (typeof row !== 'object' || row === null) return `row ${i}: not an object`;
  const e = row as Record<string, unknown>;
  // v1 rows are accepted and migrated on the way in (migrateEntry).
  if (e.v !== 1 && e.v !== LOG_SCHEMA_VERSION) {
    return `row ${i}: unsupported version ${JSON.stringify(e.v)}`;
  }
  if (e.status !== undefined && e.status !== 'draft' && e.status !== 'complete') {
    return `row ${i}: invalid status`;
  }
  if (typeof e.id !== 'string' || !e.id) return `row ${i}: missing id`;
  if (typeof e.date !== 'string') return `row ${i}: missing date`;
  if (typeof e.venue !== 'string') return `row ${i}: missing venue`;
  const f = e.forecast as Record<string, unknown> | undefined;
  if (
    typeof f !== 'object' ||
    f === null ||
    !isLogNumber(f.minKt) ||
    !isLogNumber(f.likelyKt) ||
    !isLogNumber(f.maxKt)
  ) {
    return `row ${i}: invalid forecast`;
  }
  const a = e.actual as Record<string, unknown> | undefined;
  if (typeof a !== 'object' || a === null || !isLogNumber(a.minKt) || !isLogNumber(a.maxKt)) {
    return `row ${i}: invalid actual`;
  }
  if (!SEA_STATES.has(e.seaState as number)) return `row ${i}: invalid seaState`;
  if (!isLogNumber(e.crewKg)) return `row ${i}: missing crewKg`;
  const o = e.outcome as Record<string, unknown> | undefined;
  if (o !== undefined && (typeof o.result !== 'string' || !isLogNumber(o.placing))) {
    return `row ${i}: invalid outcome`;
  }
  if (!isDockControls(e.dock)) return `row ${i}: invalid dock`;
  if (e.race !== undefined && !isRaceControls(e.race)) return `row ${i}: invalid race`;
  if (typeof e.notes !== 'string') return `row ${i}: missing notes`;
  if (typeof e.fast !== 'string') return `row ${i}: missing fast`;
  if (typeof e.createdAt !== 'string') return `row ${i}: missing createdAt`;
  return undefined;
}

/** Parse an exported JSON string, dropping malformed rows rather than failing whole. */
export function fromJson(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { entries: [], reasons: ['not valid JSON'] };
  }
  if (!Array.isArray(parsed)) {
    return { entries: [], reasons: ['not an array'] };
  }
  const entries: LogEntry[] = [];
  const reasons: string[] = [];
  parsed.forEach((row, i) => {
    const reason = validateRow(row, i);
    if (reason) reasons.push(reason);
    else entries.push(migrateEntry(row));
  });
  return { entries, reasons };
}

/** `null` (not recorded) exports as an empty cell, never as a 0. */
const CSV_COLUMNS: [string, (e: LogEntry) => string | number][] = [
  ['id', (e) => e.id],
  ['v', (e) => e.v],
  ['date', (e) => e.date],
  ['venue', (e) => e.venue],
  ['status', (e) => e.status],
  ['forecast.minKt', (e) => e.forecast.minKt ?? ''],
  ['forecast.likelyKt', (e) => e.forecast.likelyKt ?? ''],
  ['forecast.maxKt', (e) => e.forecast.maxKt ?? ''],
  ['actual.minKt', (e) => e.actual.minKt ?? ''],
  ['actual.maxKt', (e) => e.actual.maxKt ?? ''],
  ['seaState', (e) => e.seaState],
  ['crewKg', (e) => e.crewKg ?? ''],
  ['dock.upperTurns', (e) => e.dock.upperTurns],
  ['dock.lowerTurns', (e) => e.dock.lowerTurns],
  ['dock.forestayMm', (e) => e.dock.forestayMm],
  ['race.backstay', (e) => e.race?.backstay ?? ''],
  ['race.mainsheet', (e) => e.race?.mainsheet ?? ''],
  ['race.traveller', (e) => e.race?.traveller ?? ''],
  ['race.cunningham', (e) => e.race?.cunningham ?? ''],
  ['race.outhaul', (e) => e.race?.outhaul ?? ''],
  ['race.vang', (e) => e.race?.vang ?? ''],
  ['race.jibSheet', (e) => e.race?.jibSheet ?? ''],
  ['race.jibLead', (e) => e.race?.jibLead ?? ''],
  ['race.inhauler', (e) => e.race?.inhauler ?? ''],
  ['race.mainHalyard', (e) => e.race?.mainHalyard ?? ''],
  ['race.jibHalyard', (e) => e.race?.jibHalyard ?? ''],
  ['notes', (e) => e.notes],
  ['fast', (e) => e.fast],
  ['outcome.result', (e) => e.outcome.result],
  ['outcome.placing', (e) => e.outcome.placing ?? ''],
  ['createdAt', (e) => e.createdAt],
];

/** RFC 4180 field escaping: quote if it contains a comma, quote, or newline. */
function csvField(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(entries: LogEntry[]): string {
  const header = CSV_COLUMNS.map(([name]) => csvField(name)).join(',');
  const rows = entries.map((e) => CSV_COLUMNS.map(([, get]) => csvField(get(e))).join(','));
  return [header, ...rows].join('\r\n');
}

/** Trigger a browser download. DOM-only, not used from tests. */
export function download(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
