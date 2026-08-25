/**
 * The addressable scenario (audit ux-02 M-05): condition + race trim, encoded
 * into `#/race?tws=…&r=…` and into one versioned localStorage key.
 *
 * Both directions are pure functions over plain objects so they are testable
 * without a DOM, and both validate: a URL is user input, and a stored blob is
 * a URL that was user input yesterday. Anything unparseable is dropped rather
 * than half-applied, and every number is snapped to its control's legal grid.
 */
import boat from '../../data/boats/j70.json';
import type {
  Condition,
  ControlSpec,
  Forecast,
  RaceControls,
  SailSet,
  SeaState,
} from '../core/types';
import type { Params } from './router.svelte';
import { snap } from './format';

const SPECS = boat.controls as Record<string, ControlSpec>;

/**
 * Field order of the compact `r=` string. **Append only** — reordering
 * silently reinterprets every link and log entry already in the wild.
 */
export const RACE_KEYS = [
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
] as const satisfies readonly (keyof RaceControls)[];

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function toSpec(id: string, value: number): number {
  const s = SPECS[id];
  return s ? snap(value, s.min, s.max, s.step) : value;
}

/** `30.70.-20.…`: one legal value per race control, in `RACE_KEYS` order. */
export function encodeRace(race: RaceControls): string {
  return RACE_KEYS.map((k) => String(race[k])).join('.');
}

export function decodeRace(text: string): RaceControls | null {
  const parts = text.split('.');
  if (parts.length !== RACE_KEYS.length) return null;
  const out = {} as RaceControls;
  for (const [i, key] of RACE_KEYS.entries()) {
    const v = Number(parts[i]);
    if (!Number.isFinite(v)) return null;
    out[key] = toSpec(key, v);
  }
  return out;
}

/** Same validation for a URL query and for a stored blob. */
export function normaliseRace(value: unknown): RaceControls | null {
  if (typeof value !== 'object' || value === null) return null;
  const src = value as Record<string, unknown>;
  const out = {} as RaceControls;
  for (const key of RACE_KEYS) {
    const v = num(src[key]);
    if (v === null) return null;
    out[key] = toSpec(key, v);
  }
  return out;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const seaState = (v: number): SeaState => clamp(Math.round(v), 0, 4) as SeaState;

/** A hand-written link may carry one field, so every field is optional. */
export function normaliseCondition(value: unknown): Partial<Condition> {
  if (typeof value !== 'object' || value === null) return {};
  const src = value as Record<string, unknown>;
  const out: Partial<Condition> = {};
  const tws = num(src.twsKt);
  if (tws !== null) out.twsKt = clamp(Math.round(tws), 2, 30);
  const twa = num(src.twaDeg);
  if (twa !== null) out.twaDeg = clamp(Math.round(twa), 0, 180);
  const sea = num(src.seaState);
  if (sea !== null) out.seaState = seaState(sea);
  const crew = num(src.crewKg);
  if (crew !== null) out.crewKg = clamp(Math.round(crew), boat.crew.minKg, boat.crew.maxKg);
  if (src.sailset === 'jib' || src.sailset === 'asym') out.sailset = src.sailset as SailSet;
  return out;
}

export function normaliseForecast(value: unknown): Forecast | null {
  if (typeof value !== 'object' || value === null) return null;
  const src = value as Record<string, unknown>;
  const min = num(src.minKt);
  const likely = num(src.likelyKt);
  const max = num(src.maxKt);
  const sea = num(src.seaState);
  const crew = num(src.crewKg);
  if (min === null || likely === null || max === null || sea === null || crew === null) return null;
  return {
    minKt: clamp(min, 0, 40),
    likelyKt: clamp(likely, 0, 40),
    maxKt: clamp(max, 0, 40),
    seaState: seaState(sea),
    crewKg: clamp(crew, boat.crew.minKg, boat.crew.maxKg),
  };
}

/** Short keys: this string is meant to be read and edited in an address bar. */
export function encodeScenario(condition: Condition, race: RaceControls): Params {
  return {
    tws: String(condition.twsKt),
    twa: String(condition.twaDeg),
    sea: String(condition.seaState),
    crew: String(condition.crewKg),
    set: condition.sailset,
    r: encodeRace(race),
  };
}

export function decodeScenario(params: Params): {
  condition: Partial<Condition>;
  race: RaceControls | null;
} {
  const raw: Record<string, unknown> = {};
  if (params.tws !== undefined) raw.twsKt = Number(params.tws);
  if (params.twa !== undefined) raw.twaDeg = Number(params.twa);
  if (params.sea !== undefined) raw.seaState = Number(params.sea);
  if (params.crew !== undefined) raw.crewKg = Number(params.crew);
  if (params.set !== undefined) raw.sailset = params.set;
  return {
    condition: normaliseCondition(raw),
    race: params.r === undefined ? null : decodeRace(params.r),
  };
}

// ------------------------------------------------------------- session store

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
