/**
 * The committed rig, class rule C.9.5(a): once the boat leaves the dock the
 * forestay and shrouds are frozen until racing finishes for the day. Race
 * mode reads this to lock its dock controls.
 *
 * Persisted so a phone that sleeps on the way to the start line still knows
 * what was committed. localStorage is wrapped — iOS private mode throws.
 */
import type { DockControls, Forecast } from '../../core/types';

export interface RigLock {
  setup: DockControls;
  /** ISO 8601, local clock at commit time. */
  committedAt: string;
  forecast: Forecast;
}

const KEY = 'sailflow.rigLock.v1';

function read(): RigLock | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    if (typeof v !== 'object' || v === null) return null;
    const lock = v as RigLock;
    return typeof lock.committedAt === 'string' && typeof lock.setup?.upperTurns === 'number'
      ? lock
      : null;
  } catch {
    return null;
  }
}

function write(value: RigLock | null): void {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch {
    // ignore: no persistence available (private mode, quota, etc.)
  }
}

/* eslint-disable svelte/prefer-svelte-reactivity --
   These Dates are transient locals for a calendar comparison, never stored in
   $state, so SvelteDate's reactivity would buy nothing. The lock itself is
   persisted as an ISO string. */

/** Same local calendar day as `now`. A lock from yesterday is not a lock. */
export function isToday(iso: string, now: Date = new Date()): boolean {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) && d.toDateString() === now.toDateString();
}

class RigLockStore {
  locked: RigLock | null = $state.raw(read());
  /** Why the last unlock happened. Phase 06 puts this in the tuning log. */
  lastUnlockReason: string | null = $state.raw(null);

  get lockedToday(): boolean {
    return this.locked !== null && isToday(this.locked.committedAt);
  }

  commit(setup: DockControls, forecast: Forecast, at: Date = new Date()): RigLock {
    const lock: RigLock = { setup, forecast, committedAt: at.toISOString() };
    this.locked = lock;
    write(lock);
    return lock;
  }

  unlock(reason: string): void {
    this.lastUnlockReason = reason;
    this.locked = null;
    write(null);
  }
}

export const rigLock = new RigLockStore();
