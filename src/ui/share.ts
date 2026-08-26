/**
 * The share URL: one versioned, compact query that carries the whole state a
 * sailor is looking at — condition, sail plan, every race, gennaker and dock
 * control, the forecast, and the density tier (ADR 0019).
 *
 * A link pasted into a group chat has to keep working after the app has moved
 * on, so the query names its own version in `s=` and `decodeShare` runs it
 * through `MIGRATIONS` up to `SHARE_VERSION` before reading a single field.
 * Adding a control is additive (a new slot on the end of a group); changing
 * the meaning of an existing one is a version bump plus a migration entry, and
 * nothing else is allowed.
 *
 * Every value is an integer or a half-step decimal, grouped into one param per
 * control block with `_` between the fields, so the query stays short enough
 * to survive a chat client and readable enough to hand-edit in an address bar.
 * Pure: no DOM except `shareUrl` and `copyText` at the bottom, which say so.
 */
import { boatFor, isBoatId } from '../lib/boat';
import type {
  BoatDefinition,
  Condition,
  ControlSpec,
  DockControls,
  DownControls,
  Forecast,
  RaceControls,
  SailSet,
  SeaState,
} from '../core/types';
import { snap } from './format';
import { buildHash, type Params, type Route } from './router.svelte';
import type { Mode } from './stores/settings.svelte';

/**
 * Control specs for a class. A link's values are snapped to the stops of the
 * boat *the link names*, not to the default class's: a J/24 jib lead runs to a
 * different number of holes, and snapping its link to the J/70's grid would
 * quietly move the trim the sender was looking at.
 */
function specsFor(boat: BoatDefinition): Record<string, ControlSpec> {
  return boat.controls as Record<string, ControlSpec>;
}

/** The class a caller means when it names none. */
const defaultBoat = (): BoatDefinition => boatFor(undefined);

/** Bump only for a change no migration can express as a rewrite of the query. */
export const SHARE_VERSION = 1;

/**
 * Field order inside each group. **Append only** — a reordering silently
 * reinterprets every link already in the wild, which is the one failure this
 * whole module exists to prevent. `share.test.ts` asserts that every control
 * in `data/boats/j70.json` appears in exactly one of these, so a control added
 * to the boat file fails the suite until it is added here too.
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

export const DOWN_KEYS = [
  'kiteHalyard',
  'tackLine',
  'kiteSheet',
  'sprit',
] as const satisfies readonly (keyof DownControls)[];

export const DOCK_KEYS = [
  'upperTurns',
  'lowerTurns',
  'forestayMm',
] as const satisfies readonly (keyof DockControls)[];

/**
 * `_`, not `.`: dock turns move in half-steps, so a dot separator cannot tell
 * `-1.5_0` from `-1_5_0`. v0 links used dots for `r=`, which was safe only
 * because every race control is an integer; the v0 migration rewrites them.
 */
const SEP = '_';

const TIERS: readonly Mode[] = ['learn', 'race', 'analyse'];

/** Everything a link carries. Every part is optional: a hand-written link may
 *  name one field, and a Dock link never has a trim. */
export interface ShareState {
  /**
   * The class the trim belongs to. Additive in v1 (ADR 0019): a link written
   * before this field existed carries no `boat`, and the absent value means
   * exactly what it meant then — the default class. So no version bump and no
   * migration entry; the schema did not change meaning, it grew a field.
   */
  boat?: string;
  /** Partial: a log entry knows the wind it was sailed in but not the angle. */
  condition?: Partial<Condition>;
  race?: RaceControls;
  down?: DownControls;
  dock?: DockControls;
  forecast?: Forecast;
  tier?: Mode;
}

export interface DecodedShare {
  /** The version the link declared, before migration. 0 = a pre-`s=` link. */
  version: number;
  /**
   * The class named by the link, or null when it named none *or* named one
   * this build does not carry. Null means "use the default": a crewmate on an
   * older build opening a J/24 link should get the app, not a blank screen.
   */
  boat: string | null;
  condition: Partial<Condition>;
  race: RaceControls | null;
  down: DownControls | null;
  dock: DockControls | null;
  forecast: Forecast | null;
  tier: Mode | null;
}

// --------------------------------------------------------------- migrations

/**
 * `version → rewrite that produces the next version's query`. Applied in
 * ascending order until the params are at `SHARE_VERSION`, so a v0 link goes
 * through every step rather than being read by a parser that never saw it.
 *
 * A migration rewrites the **query**, not the decoded object: that keeps the
 * reader a single parser for the current schema, however old the link is.
 */
export const MIGRATIONS: Record<number, (p: Params) => Params> = {
  // v0: the pre-share scenario link (`?tws=…&r=30.60.0.…`, no `s=`). Only the
  // separator changed — the field order was already `RACE_KEYS`, and every
  // other group is new and simply absent.
  0: (p) => (p.r === undefined ? p : { ...p, r: p.r.replace(/\./g, SEP) }),
};

/** Run a query up to `SHARE_VERSION`. An unknown future version is left alone
 *  and read best-effort: dropping a link outright is the worse failure. */
export function migrate(params: Params): { params: Params; version: number } {
  const version = Number(params.s ?? 0);
  if (!Number.isFinite(version) || version < 0) return { params, version: 0 };
  let out = params;
  for (let v = version; v < SHARE_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (step) out = step(out);
  }
  return { params: out, version };
}

// ------------------------------------------------------------------ groups

/** Legal value for a control id: snapped to its own grid, clamped to its own
 *  range. A link is user input, so nothing reaches a store unsnapped. */
function toSpec(specs: Record<string, ControlSpec>, id: string, value: number): number {
  const s = specs[id];
  return s ? snap(value, s.min, s.max, s.step) : value;
}

/** `30_60_0_…`: one legal value per key, in the group's own order. */
function encodeGroup<T>(keys: readonly (keyof T)[], values: T): string {
  return keys.map((k) => String(values[k])).join(SEP);
}

/**
 * The inverse, or null. Length has to match exactly: a group one field short
 * is a link from a version this parser does not understand, and half-applying
 * it would put a control somewhere its owner never set it.
 */
function decodeGroup<T>(
  keys: readonly string[],
  text: string | undefined,
  specs: Record<string, ControlSpec>,
): T | null {
  if (text === undefined) return null;
  const parts = text.split(SEP);
  if (parts.length !== keys.length) return null;
  const out: Record<string, number> = {};
  for (const [i, key] of keys.entries()) {
    const v = Number(parts[i]);
    if (!Number.isFinite(v)) return null;
    out[key] = toSpec(specs, key, v);
  }
  return out as T;
}

// ----------------------------------------------------------------- validators
//
// A stored session blob is a URL that was user input yesterday, so the session
// store (`./scenario.ts`) validates through these too rather than keeping a
// second, drifting copy of the same rules.

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const seaStateOf = (v: number): SeaState => clamp(Math.round(v), 0, 4) as SeaState;

/** A whole race trim from a plain object, or null if any field is missing. */
export function normaliseRace(
  value: unknown,
  boat: BoatDefinition = defaultBoat(),
): RaceControls | null {
  if (typeof value !== 'object' || value === null) return null;
  const specs = specsFor(boat);
  const src = value as Record<string, unknown>;
  const out = {} as RaceControls;
  for (const key of RACE_KEYS) {
    const v = num(src[key]);
    if (v === null) return null;
    out[key] = toSpec(specs, key, v);
  }
  return out;
}

/** A hand-written link may carry one field, so every field is optional. */
export function normaliseCondition(
  value: unknown,
  boat: BoatDefinition = defaultBoat(),
): Partial<Condition> {
  if (typeof value !== 'object' || value === null) return {};
  const src = value as Record<string, unknown>;
  const out: Partial<Condition> = {};
  const tws = num(src.twsKt);
  if (tws !== null) out.twsKt = clamp(Math.round(tws), 2, 30);
  const twa = num(src.twaDeg);
  if (twa !== null) out.twaDeg = clamp(Math.round(twa), 0, 180);
  const sea = num(src.seaState);
  if (sea !== null) out.seaState = seaStateOf(sea);
  const crew = num(src.crewKg);
  if (crew !== null) out.crewKg = clamp(Math.round(crew), boat.crew.minKg, boat.crew.maxKg);
  if (src.sailset === 'jib' || src.sailset === 'asym') out.sailset = src.sailset as SailSet;
  return out;
}

export function normaliseForecast(
  value: unknown,
  boat: BoatDefinition = defaultBoat(),
): Forecast | null {
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
    seaState: seaStateOf(sea),
    crewKg: clamp(crew, boat.crew.minKg, boat.crew.maxKg),
  };
}

// -------------------------------------------------------------- encode/decode

/** Short keys, because this string is meant to be read in an address bar. */
export function encodeShare(state: ShareState): Params {
  const p: Params = { s: String(SHARE_VERSION) };
  if (state.boat) p.boat = state.boat;
  const c = state.condition;
  if (c) {
    // Field by field: a link that omits the angle is asking for "this wind,
    // wherever you are pointing", which is exactly what a log entry knows.
    if (c.twsKt !== undefined) p.tws = String(c.twsKt);
    if (c.twaDeg !== undefined) p.twa = String(c.twaDeg);
    if (c.seaState !== undefined) p.sea = String(c.seaState);
    if (c.crewKg !== undefined) p.crew = String(c.crewKg);
    if (c.sailset !== undefined) p.set = c.sailset;
  }
  if (state.race) p.r = encodeGroup(RACE_KEYS, state.race);
  if (state.down) p.w = encodeGroup(DOWN_KEYS, state.down);
  if (state.dock) p.d = encodeGroup(DOCK_KEYS, state.dock);
  if (state.forecast) {
    const f = state.forecast;
    p.f = [f.minKt, f.likelyKt, f.maxKt, f.seaState, f.crewKg].join(SEP);
  }
  if (state.tier) p.t = state.tier;
  return p;
}

export function decodeShare(raw: Params): DecodedShare {
  const { params, version } = migrate(raw);
  // Resolve the class first: every value below is snapped to *its* stops and
  // clamped to *its* crew range.
  const boatId = isBoatId(params.boat) ? params.boat : null;
  const boat = boatFor(boatId ?? undefined);
  const specs = specsFor(boat);
  const cond: Record<string, unknown> = {};
  if (params.tws !== undefined) cond.twsKt = Number(params.tws);
  if (params.twa !== undefined) cond.twaDeg = Number(params.twa);
  if (params.sea !== undefined) cond.seaState = Number(params.sea);
  if (params.crew !== undefined) cond.crewKg = Number(params.crew);
  if (params.set !== undefined) cond.sailset = params.set;

  const f = params.f?.split(SEP).map(Number);
  const tier = TIERS.find((t) => t === params.t) ?? null;

  return {
    version,
    // Validated against the registry, not passed through: an unknown class
    // reads as null so the caller falls back rather than asking the worker to
    // load a boat that does not exist.
    boat: boatId,
    condition: normaliseCondition(cond, boat),
    race: decodeGroup<RaceControls>(RACE_KEYS, params.r, specs),
    down: decodeGroup<DownControls>(DOWN_KEYS, params.w, specs),
    dock: decodeGroup<DockControls>(DOCK_KEYS, params.d, specs),
    // The forecast is validated by the same function the session store uses:
    // it is five loose numbers with no control spec to snap them onto.
    forecast:
      f?.length === 5
        ? normaliseForecast({
            minKt: f[0],
            likelyKt: f[1],
            maxKt: f[2],
            seaState: f[3],
            crewKg: f[4],
          })
        : null,
    tier,
  };
}

// ------------------------------------------------------------------ DOM only

/**
 * The absolute link for a screen. DOM-only (it reads `location` for the
 * deployment's own base path, which a hash router has no other way to know).
 */
export function shareUrl(route: Route, state: ShareState): string {
  const { origin, pathname, search } = location;
  return `${origin}${pathname}${search}${buildHash(route, encodeShare(state))}`;
}

/**
 * Clipboard, with the pre-`navigator.clipboard` fallback for the browsers and
 * insecure contexts that still have no async clipboard — and for a permission
 * the user has denied, which rejects rather than throwing at load. Returns
 * false when neither worked, so the caller can show the link instead of
 * claiming a copy that never happened.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // no async clipboard here, or the permission was refused
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    // Off-screen but focusable: `display: none` cannot be selected.
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
