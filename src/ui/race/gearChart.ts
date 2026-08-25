/**
 * The wind-range gear chart — "the single most-used artefact in the sport"
 * (research 02 §2.5) — read straight off the committed tuning-guide JSON.
 *
 * Pure: the table's rows and cells, and which row the current wind lands in.
 * Nothing here interprets a setting; a guide cell is the guide's own words
 * ("14 in - Max", "Snug", "6 holes showing in front of car") or a blank where
 * that guide publishes nothing, never a number this app invented.
 */
import { bandFor, guideFor, type Guide, type GuideBand, type GuideId } from '../../lib/reference';

export interface GearColumn {
  key: string;
  label: string;
}

/**
 * Rig turns first, then the trim controls in the order the panels use them.
 * Both guides publish the same shape of table, so one column list serves both
 * and a guide that omits a column shows blanks rather than being reshaped.
 */
export const GEAR_COLUMNS: GearColumn[] = [
  { key: 'uppersTurns', label: 'Uppers' },
  { key: 'lowersTurns', label: 'Lowers' },
  { key: 'forestay', label: 'Forestay' },
  { key: 'backstay', label: 'Backstay' },
  { key: 'traveller', label: 'Traveller' },
  { key: 'vang', label: 'Vang' },
  { key: 'outhaul', label: 'Outhaul' },
  { key: 'cunningham', label: 'Cunningham' },
  { key: 'jibLead', label: 'Jib lead' },
  { key: 'inhauler', label: 'Inhauler' },
];

export interface GearRow {
  label: string;
  twsMinKt: number;
  twsMaxKt: number | null;
  /** One cell per `GEAR_COLUMNS` entry, guide's own words or an em dash. */
  cells: string[];
}

/** Turns from base read with their sign, so +2 is not confused with 2. */
function turns(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return v > 0 ? `+${v}` : String(v);
}

function cell(band: GuideBand, guide: Guide, key: string): string {
  if (key === 'uppersTurns') return turns(band.uppersTurns);
  if (key === 'lowersTurns') return turns(band.lowersTurns);
  if (key === 'forestay') {
    const mm = band.forestayMm ?? band.rakeMm ?? guide.base.forestayMm ?? guide.base.rakeMm;
    return mm === null || mm === undefined ? '—' : `${mm} mm`;
  }
  return band.race[key] ?? '—';
}

export function gearRows(guide: Guide): GearRow[] {
  return guide.bands.map((band) => ({
    label: band.label,
    twsMinKt: band.twsMinKt,
    twsMaxKt: band.twsMaxKt,
    cells: GEAR_COLUMNS.map((c) => cell(band, guide, c.key)),
  }));
}

export interface GearChart {
  /** Guide title and revision, so the table can never be read unattributed. */
  source: { title: string; url: string; revision: string };
  base: string;
  columns: GearColumn[];
  rows: GearRow[];
}

/** The chart for one guide, or `null` when that guide's table is not loaded. */
export function gearChart(id: GuideId): GearChart | null {
  const guide = guideFor(id);
  if (!guide) return null;
  return {
    source: guide.source,
    base: `Base ${guide.base.uppers} uppers / ${guide.base.lowers} lowers`,
    columns: GEAR_COLUMNS,
    rows: gearRows(guide),
  };
}

/**
 * Index of the row the current wind lands in, or −1 when there is no table.
 * Uses the same half-open band matching as the disagreement panel, so the
 * highlighted row and the guide comparison can never point at different bands.
 */
export function rowFor(chart: GearChart | null, twsKt: number): number {
  if (!chart || chart.rows.length === 0) return -1;
  const hit = chart.rows.findIndex((r) => r.twsMaxKt === null || twsKt < r.twsMaxKt);
  return hit === -1 ? chart.rows.length - 1 : hit;
}

/** `bandFor`'s label for a wind speed, for the "you are here" line. */
export function bandLabel(id: GuideId, twsKt: number): string | null {
  const guide = guideFor(id);
  return guide ? bandFor(guide, twsKt).label : null;
}
