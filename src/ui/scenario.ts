/**
 * The session store: the condition, trim and forecast this browser was last
 * looking at, in one versioned localStorage key (audit ux-02 M-05).
 *
 * The URL half of the addressable scenario moved to `./share.ts` when the link
 * grew a version and the rest of the control set (ADR 0019); this file is what
 * survives a reload with no link. Both sinks validate through the same
 * `normalise*` functions, because a stored blob is a URL that was user input
 * yesterday: anything unparseable is dropped rather than half-applied, and
 * every number is snapped to its control's legal grid.
 */
import type { Condition, Forecast, RaceControls } from '../core/types';
import { normaliseCondition, normaliseForecast, normaliseRace } from './share';

export const SESSION_KEY = 'sailflow.session.v1';

export interface Session {
  condition?: Partial<Condition>;
  race?: RaceControls;
  forecast?: Forecast;
}

/** Whatever survived validation. A partial restore beats a lost session. */
export function readSession(): Session {
  let parsed: unknown;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    parsed = JSON.parse(raw);
  } catch {
    return {}; // private mode, quota, or a blob from a future version
  }
  if (typeof parsed !== 'object' || parsed === null) return {};
  const src = parsed as Record<string, unknown>;
  const out: Session = {};
  const condition = normaliseCondition(src.condition);
  if (Object.keys(condition).length) out.condition = condition;
  const race = normaliseRace(src.race);
  if (race) out.race = race;
  const forecast = normaliseForecast(src.forecast);
  if (forecast) out.forecast = forecast;
  return out;
}

export function writeSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore: no persistence available. The session still works, it just ends.
  }
}
