/**
 * Tuning-guide lookup for the disagreement panel (ADR 0008).
 *
 * Guides live under `data/tuning/` as one JSON per source, named
 * `<guideId>-<boatId>.json`, and are enumerated with `import.meta.glob` —
 * adding a guide is a file, not a code change (`data/tuning/README.md`).
 * A guide is "not loaded" when its `bands` array is empty, which is what
 * removing the transcription leaves behind, so the panel can say "reference
 * tables not loaded" instead of inventing numbers.
 *
 * ponytail: eager glob, so every guide is in the main bundle. Two files is
 * ~30 kB; switch to a lazy per-guide `import()` if the directory ever grows
 * past a handful.
 */
import { activeBoat } from './boat';

/** A guide id is whatever is in front of the boat id in the filename. */
export type GuideId = string;

/** Guide race-mode settings are free text ("14 in - Max", "25%"), never numbers. */
export type GuideRace = Record<string, string | null>;

export interface GuideTargets {
  bsKt: number | null;
  heelDeg: number | null;
  leechTelltale: string | null;
}

export interface GuideBand {
  label: string;
  twsMinKt: number;
  /** `null` on the open-ended top band ("20+ kt"). */
  twsMaxKt: number | null;
  uppersTurns: number | null;
  lowersTurns: number | null;
  uppersGauge: number | string | null;
  lowersGauge: number | string | null;
  rakeMm: number | null;
  forestayMm: number | null;
  race: GuideRace;
  targets: GuideTargets;
  notes?: string | null;
}

export interface Guide {
  source: { label: string; id: string; title: string; url: string; revision: string };
  base: { uppers: string; lowers: string; rakeMm: number | null; forestayMm: number | null };
  bands: GuideBand[];
}

/** One entry per file found under `data/tuning/`. */
export interface GuideEntry {
  /** Filename stem in front of the boat id: `north-j70.json` → `north`. */
  id: GuideId;
  /** Filename stem after the last hyphen: `north-j70.json` → `j70`. */
  boatId: string;
  /** Short display name, from the file's `source.label`. */
  label: string;
  /** `null` when the file's `bands` array is empty (transcription removed). */
  guide: Guide | null;
}

const FILES: Record<string, Guide> = import.meta.glob('../../data/tuning/*.json', {
  eager: true,
  import: 'default',
});

/** Sorted by filename, so the panel's column order is the same everywhere. */
const ENTRIES: GuideEntry[] = Object.keys(FILES)
  .sort()
  .map((path) => {
    const stem = path.slice(path.lastIndexOf('/') + 1).replace(/\.json$/, '');
    const cut = stem.lastIndexOf('-');
    const guide = FILES[path];
    const loaded = Array.isArray(guide.bands) && guide.bands.length > 0;
    return {
      id: stem.slice(0, cut),
      boatId: stem.slice(cut + 1),
      label: guide.source?.label ?? stem.slice(0, cut),
      guide: loaded ? guide : null,
    };
  });

/**
 * Every guide committed for a boat, loaded or not. Empty is a real answer,
 * and the one a second class starts life with: the disagreement panel says
 * "no guide for this boat" rather than quoting another class's tables.
 */
export function guidesFor(boatId: string = activeBoat.id): GuideEntry[] {
  return ENTRIES.filter((e) => e.boatId === boatId);
}

export const GUIDE_IDS: GuideId[] = guidesFor().map((e) => e.id);

export const GUIDE_LABELS: Record<GuideId, string> = Object.fromEntries(
  ENTRIES.map((e) => [e.id, e.label]),
);

/** The loaded guide, or `null` when its table is absent/empty. */
export function guideFor(id: GuideId): Guide | null {
  return ENTRIES.find((e) => e.id === id)?.guide ?? null;
}

/**
 * The band covering `twsKt`. Bands are half-open [min, max): below the first
 * band clamps to the first, above the last clamps to the last, and a gap
 * between bands (Quantum has 4-5 kt and 23-24 kt) resolves upward to the next
 * band rather than guessing a value nobody published.
 */
export function bandFor(guide: Guide, twsKt: number): GuideBand {
  const hit = guide.bands.find((b) => b.twsMaxKt === null || twsKt < b.twsMaxKt);
  return hit ?? guide.bands[guide.bands.length - 1];
}

/** Representative TWS of a band: its midpoint, or its floor when open-ended. */
function midpoint(b: GuideBand): number {
  return b.twsMaxKt === null ? b.twsMinKt : (b.twsMinKt + b.twsMaxKt) / 2;
}

/** Piecewise-linear over sorted (x, y) anchors, clamped flat outside the range. */
function interp(points: [number, number][], x: number): number | null {
  if (points.length === 0) return null;
  const first = points[0];
  const last = points[points.length - 1];
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (x <= x1) return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return last[1];
}

function anchors(guide: Guide, key: 'uppersTurns' | 'lowersTurns'): [number, number][] {
  return guide.bands
    .filter((b) => typeof b[key] === 'number')
    .map((b) => [midpoint(b), b[key] as number] as [number, number]);
}

/**
 * Shroud turns interpolated linearly between band midpoints. Bands publish a
 * step function; the rig does not, and the panel compares against a continuous
 * model. Null when the guide publishes no turns at all.
 */
export function interpolatedTurns(
  guide: Guide,
  twsKt: number,
): { uppersTurns: number | null; lowersTurns: number | null } {
  return {
    uppersTurns: interp(anchors(guide, 'uppersTurns'), twsKt),
    lowersTurns: interp(anchors(guide, 'lowersTurns'), twsKt),
  };
}

export interface GuideRecommendation {
  band: GuideBand;
  uppersTurns: number | null;
  lowersTurns: number | null;
  /** Guide rake/headstay figure in its own unit, or null when unpublished. */
  rakeNote: string | null;
  race: GuideRace;
  targets: GuideTargets;
}

export function guideRecommendation(guide: Guide, twsKt: number): GuideRecommendation {
  const band = bandFor(guide, twsKt);
  const rakeMm = band.rakeMm ?? guide.base.rakeMm;
  const forestayMm = band.forestayMm ?? guide.base.forestayMm;
  const rakeNote =
    rakeMm !== null && rakeMm !== undefined
      ? `${rakeMm} mm rake`
      : forestayMm !== null && forestayMm !== undefined
        ? `${forestayMm} mm forestay`
        : null;
  return {
    band,
    ...interpolatedTurns(guide, twsKt),
    rakeNote,
    race: band.race,
    targets: band.targets,
  };
}

/**
 * True where the model was fitted against North's published base settings
 * (calibration stage 4 uses the 8-10 and 12-16 kt bands). Outside these the
 * gap between model and guide is information, not error.
 */
export function isCalibratedBand(twsKt: number): boolean {
  return (twsKt >= 8 && twsKt < 10) || (twsKt >= 12 && twsKt < 16);
}

export interface GuideStatus {
  loaded: boolean;
  revision: string;
}

export function referenceStatus(): Record<GuideId, GuideStatus> {
  const status: Record<GuideId, GuideStatus> = {};
  for (const e of ENTRIES)
    status[e.id] = { loaded: e.guide !== null, revision: e.guide?.source?.revision ?? '' };
  return status;
}
