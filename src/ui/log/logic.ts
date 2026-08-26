/**
 * Pure logic for the tuning log screen: what a new entry starts from, how an
 * entry is ordered and labelled in the list, and the forecast-vs-actual
 * delta. No DOM, no runes — unit-testable without mounting a component.
 */
import type { ControlSpec, DockControls, RaceControls, SeaState } from '../../core/types';
import type { LogEntry, LogNumber } from '../../lib/logStore';
import type { RigLock } from '../stores/rigLock.svelte';
import type { Route } from '../router.svelte';
import type { ShareState } from '../share';
import { boat } from '../dock/logic';
import { fmt } from '../format';

/** The boat's own control specs — same source the Race and Dock sliders read. */
export const SPECS = boat.controls as Record<string, ControlSpec>;

function keysOfMode(mode: string): string[] {
  return Object.keys(SPECS).filter((k) => SPECS[k].mode === mode);
}

export const DOCK_KEYS = keysOfMode('dock') as (keyof DockControls)[];
export const RACE_KEYS = keysOfMode('race') as (keyof RaceControls)[];

export function emptyRace(): RaceControls {
  return Object.fromEntries(RACE_KEYS.map((k) => [k, 0])) as unknown as RaceControls;
}

/**
 * What a new entry starts from. Nothing here is invented: the rig and the
 * forecast come from the committed lock, the venue from the last entry the
 * sailor filed, the date from today. Anything with no source stays `null`,
 * which renders as an empty field rather than a fake 0 (audit ux-02 H-05).
 */
export function prefillEntry(opts: {
  lock?: RigLock | null;
  last?: LogEntry | null;
  today: string;
}): LogEntry {
  const { lock, last, today } = opts;
  const f = lock?.forecast;
  return {
    id: '',
    v: 2,
    date: today,
    venue: last?.venue ?? '',
    forecast: {
      minKt: f?.minKt ?? null,
      likelyKt: f?.likelyKt ?? null,
      maxKt: f?.maxKt ?? null,
    },
    actual: { minKt: null, maxKt: null },
    seaState: (f?.seaState ?? last?.seaState ?? 0) as SeaState,
    crewKg: f?.crewKg ?? last?.crewKg ?? null,
    dock: lock ? { ...lock.setup } : { upperTurns: 0, lowerTurns: 0, forestayMm: 0 },
    race: undefined,
    notes: '',
    fast: '',
    status: 'complete',
    outcome: { result: '', placing: null },
    createdAt: '',
  };
}

/** Drafts first (they are the thing still owed), then newest date first. */
export function sortEntries(entries: LogEntry[]): LogEntry[] {
  return entries
    .slice()
    .sort(
      (a, b) =>
        Number(b.status === 'draft') - Number(a.status === 'draft') ||
        b.date.localeCompare(a.date) ||
        b.createdAt.localeCompare(a.createdAt),
    );
}

/** "Today · in progress" for a draft filed today; null for a finished entry. */
export function draftLabel(entry: LogEntry, today: string): string | null {
  if (entry.status !== 'draft') return null;
  return entry.date === today ? 'Today · in progress' : 'In progress';
}

function band(lo: LogNumber, hi: LogNumber): string | null {
  return lo === null || hi === null ? null : `${fmt(lo, 0)}–${fmt(hi, 0)}`;
}

function delta(actual: LogNumber, forecast: LogNumber): string | null {
  if (actual === null || forecast === null) return null;
  const d = actual - forecast;
  if (d === 0) return null;
  return `${d > 0 ? '+' : '−'}${fmt(Math.abs(d), 0)}`;
}

/**
 * "forecast 8–16 · sailed 9–14 kt (min +1, max −2)". Null when either band is
 * incomplete — half a comparison is worse than none.
 */
export function deltaLine(entry: LogEntry): string | null {
  const f = band(entry.forecast.minKt, entry.forecast.maxKt);
  const a = band(entry.actual.minKt, entry.actual.maxKt);
  if (!f || !a) return null;
  const parts = [
    delta(entry.actual.minKt, entry.forecast.minKt) &&
      `min ${delta(entry.actual.minKt, entry.forecast.minKt)}`,
    delta(entry.actual.maxKt, entry.forecast.maxKt) &&
      `max ${delta(entry.actual.maxKt, entry.forecast.maxKt)}`,
  ].filter(Boolean);
  const tail = parts.length ? ` (${parts.join(', ')})` : ' (as forecast)';
  return `forecast ${f} · sailed ${a} kt${tail}`;
}

/** Midpoint of a recorded band, or null when either end is missing. */
function midKt(lo: LogNumber, hi: LogNumber): number | null {
  if (lo === null || hi === null) return null;
  return Math.round((lo + hi) / 2);
}

/**
 * One log entry as a share link's state (ADR 0019): "here is the day I
 * sailed — open it and see what the model makes of it."
 *
 * What the entry does *not* know is left out rather than invented: it has no
 * true wind angle and no sail plan, so the link carries neither and the
 * recipient's own angle stands. The wind is the sailed band's midpoint where
 * one was recorded and the forecast's likely value otherwise — the same
 * precedence `windLine` uses in the list, so the chip and the link agree.
 *
 * The route follows what is in the entry: a trim opens on Race, a rig-and-
 * forecast-only entry opens on Dock, which is the screen that answers it.
 */
export function entryShare(entry: LogEntry): { route: Route; state: ShareState } {
  const twsKt = midKt(entry.actual.minKt, entry.actual.maxKt) ?? entry.forecast.likelyKt;
  const { minKt, likelyKt, maxKt } = entry.forecast;
  const complete = minKt !== null && likelyKt !== null && maxKt !== null && entry.crewKg !== null;
  return {
    route: entry.race ? 'race' : 'dock',
    state: {
      condition: {
        ...(twsKt === null ? {} : { twsKt }),
        seaState: entry.seaState,
        ...(entry.crewKg === null ? {} : { crewKg: entry.crewKg }),
      },
      race: entry.race,
      dock: entry.dock,
      forecast: complete
        ? {
            minKt: minKt!,
            likelyKt: likelyKt!,
            maxKt: maxKt!,
            seaState: entry.seaState,
            crewKg: entry.crewKg!,
          }
        : undefined,
    },
  };
}

/** "3, 1, 7 · placing 4" — whatever the sailor recorded, or null. */
export function outcomeLine(entry: LogEntry): string | null {
  const placing = entry.outcome.placing;
  const parts = [entry.outcome.result.trim(), placing === null ? '' : `placing ${placing}`].filter(
    Boolean,
  );
  return parts.length ? parts.join(' · ') : null;
}
