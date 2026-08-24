/**
 * Sail plan geometry: area, centre of effort height and chord distribution
 * from the class-measured girths in the boat JSON.
 *
 * Main and jib are integrated as a girth trapezoid up the luff (the same
 * shape the class measurement points describe). The asymmetric uses the
 * IMS/ORC spinnaker area formula SPA = SL x (SF + 4 x SMG) / 6, which is
 * Simpson's rule over foot / half / head with head width zero; the chord
 * distribution is the matching parabola so `chordAt` and `areaM2` agree.
 *
 * Areas land within a few per cent of `ratedAreaM2`, which is exposed
 * alongside so callers can show the disagreement rather than hide it.
 */
import type { BoatDefinition, SailId } from '../types';
import type { SailGeometry } from '../internal';
import { knob } from '../internal';

export interface SailPlanGeometry extends SailGeometry {
  /** Class rated area, m². Exposed so callers can show the model-vs-rated delta. */
  ratedAreaM2: number;
  /** Height of the tack above the waterline, m. */
  tackHeightM: number;
}

/** One girth station: fractional height up the luff, chord in metres. */
interface Station {
  h: number;
  c: number;
}

/** Reads a numeric dimension from a SailDef, in metres (source is mm). */
function mm(boat: BoatDefinition, sail: SailId, key: string): number {
  const v = boat.sails[sail][key];
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw new Error(`sails.${sail}.${key}: missing or not a number`);
  return v / 1000;
}

/**
 * Girth stations for main and jib. Fractional heights are the class
 * measurement points: quarter, half, three-quarter, upper (7/8), top.
 * prov: J/70 Class Rules sail measurement points (boat JSON dimensions).
 */
function girthStations(boat: BoatDefinition, sail: SailId): Station[] {
  if (sail === 'main')
    return [
      { h: 0, c: mm(boat, sail, 'footMm') },
      { h: 0.25, c: mm(boat, sail, 'quarterMm') }, // prov: J/70 Class Rules sail measurement points
      { h: 0.5, c: mm(boat, sail, 'halfMm') },
      { h: 0.75, c: mm(boat, sail, 'threeQuarterMm') }, // prov: J/70 Class Rules sail measurement points
      { h: 0.875, c: mm(boat, sail, 'upperMm') }, // prov: upper girth is the 7/8 point
      { h: 1, c: mm(boat, sail, 'topMm') },
    ];
  return [
    { h: 0, c: mm(boat, sail, 'lpMm') }, // prov: LP stands in for the jib foot chord
    { h: 0.25, c: mm(boat, sail, 'quarterMm') },
    { h: 0.5, c: mm(boat, sail, 'halfMm') },
    { h: 0.75, c: mm(boat, sail, 'threeQuarterMm') }, // prov: J/70 Class Rules sail measurement points
    { h: 1, c: mm(boat, sail, 'topMm') },
  ];
}

/** Piecewise-linear chord between girth stations, clamped outside [0,1]. */
function interpStations(st: Station[], h: number): number {
  const x = Math.min(1, Math.max(0, h));
  for (let i = 1; i < st.length; i++) {
    const a = st[i - 1];
    const b = st[i];
    if (x <= b.h) return a.c + ((b.c - a.c) * (x - a.h)) / (b.h - a.h);
  }
  return st[st.length - 1].c;
}

/**
 * Exact area and first moment of a piecewise-linear chord distribution over
 * the fractional height, per unit span. On a segment where the chord is
 * linear, integral(h·c)dh = d·[h0·(c0+c1)/2 + d·(c0/6 + c1/3)].
 */
function integrate(st: Station[]): { area: number; moment: number } {
  let area = 0;
  let moment = 0;
  for (let i = 1; i < st.length; i++) {
    const a = st[i - 1];
    const b = st[i];
    const d = b.h - a.h;
    area += ((a.c + b.c) / 2) * d;
    moment += d * ((a.h * (a.c + b.c)) / 2 + d * (a.c / 6 + b.c / 3));
  }
  return { area, moment };
}

/**
 * Asym chord as the parabola through (0, foot), (1/2, half girth), (1, 0).
 * Its integral is exactly the ORC spinnaker area formula.
 */
function asymParabola(foot: number, half: number): { a: number; b: number; d: number } {
  const a = foot;
  const d = 4 * (a / 2 - half); // prov: solved from c(1/2)=half, c(1)=0
  const b = -a - d;
  return { a, b, d };
}

export function sailGeometry(boat: BoatDefinition, sail: SailId): SailPlanGeometry {
  const ratedAreaM2 = boat.sails[sail].ratedAreaM2;

  if (sail === 'asym') {
    const luff = mm(boat, sail, 'luffMm');
    const leech = mm(boat, sail, 'leechMm');
    const spanM = (luff + leech) / 2; // prov: ORC SL = mean of spinnaker luff and leech
    const { a, b, d } = asymParabola(mm(boat, sail, 'footMm'), mm(boat, sail, 'halfMm'));
    const area = a + b / 2 + d / 3;
    const moment = a / 2 + b / 3 + d / 4;
    const tackHeightM = knob(boat, 'geom.asymTackHeightM', 0.7); // prov: assumed, tack on the sprit
    return {
      areaM2: area * spanM,
      ceHeightM: (moment / area) * spanM + tackHeightM,
      spanM,
      tackHeightM,
      ratedAreaM2,
      chordAt: (h) => {
        const x = Math.min(1, Math.max(0, h));
        return Math.max(0, a + b * x + d * x * x);
      },
    };
  }

  const st = girthStations(boat, sail);
  const spanM = sail === 'main' ? boat.rig.pM : mm(boat, sail, 'luffMm');
  const { area, moment } = integrate(st);
  // prov: assumed. Boom ~0.9 m above the waterline; jib tack a little lower.
  const tackHeightM =
    sail === 'main' ? knob(boat, 'geom.boomHeightM', 0.9) : knob(boat, 'geom.jibTackHeightM', 0.55);

  return {
    areaM2: area * spanM,
    ceHeightM: (moment / area) * spanM + tackHeightM,
    spanM,
    tackHeightM,
    ratedAreaM2,
    chordAt: (h) => interpStations(st, h),
  };
}
