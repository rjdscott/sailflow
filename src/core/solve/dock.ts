/**
 * Dock mode scoring (ADR 0009). A rig setup is committed for the day; the
 * breeze then lands somewhere in the forecast. Score = expected regret in
 * seconds per mile of windward-leeward, with race trim re-optimised at every
 * wind speed (dock cost is what race trim cannot recover).
 *
 *   T(S, w)     = 1/VMGup(S, w) + 1/VMGdn(S, w)     hours per mile up + down
 *   T*(w)       = min over setups S' of T(S', w)
 *   regret(S,w) = (T(S,w) − T*(w)) · 3600
 *   Score(S)    = Σ_w p(w) · regret(S, w)
 */
import type {
  BoatDefinition,
  DockControls,
  DockRegret,
  DockScore,
  Forecast,
  SailId,
} from '../types';
import { geometryFor } from './equilibrium';
import { optimal } from './optimal';
import { tierFor, tiered } from './tierFor';
import type { AeroGeometry } from '../aero/orc/forces';

/** Triangular pmf on a 1-kt grid. ponytail: triangular; user-supplied bins if asked. */
export function forecastPmf(f: Forecast): { twsKt: number; p: number }[] {
  const lo = Math.round(f.minKt);
  const hi = Math.round(f.maxKt);
  const mode = Math.min(hi, Math.max(lo, f.likelyKt));
  if (hi <= lo) return [{ twsKt: lo, p: 1 }];
  const raw: { twsKt: number; p: number }[] = [];
  for (let w = lo; w <= hi; w++) {
    const p =
      w <= mode
        ? mode === lo
          ? 1
          : (w - lo) / (mode - lo)
        : mode === hi
          ? 1
          : (hi - w) / (hi - mode);
    raw.push({ twsKt: w, p: Math.max(p, 0.05) }); // prov: assumed floor so range ends count
  }
  const sum = raw.reduce((a, b) => a + b.p, 0);
  return raw.map((r) => ({ twsKt: r.twsKt, p: r.p / sum }));
}

/**
 * Lap-time memo per boat. The solver is pure and deterministic, so a lap
 * time depends only on (setup, wind, sea state, crew). Without this every
 * slider move recomputes T*(w) over the whole candidate grid.
 */
const lapCache = new WeakMap<BoatDefinition, Map<string, number>>();

export function lapTimeHours(
  boat: BoatDefinition,
  setup: DockControls,
  f: Forecast,
  twsKt: number,
  geom: Record<SailId, AeroGeometry>,
): number {
  let m = lapCache.get(boat);
  if (!m) lapCache.set(boat, (m = new Map()));
  const key = `${setup.upperTurns}|${setup.lowerTurns}|${setup.forestayMm}|${twsKt}|${f.seaState}|${f.crewKg}`;
  const hit = m.get(key);
  if (hit !== undefined) return hit;
  const t = lapTimeHoursUncached(boat, setup, f, twsKt, geom);
  m.set(key, t);
  return t;
}

/**
 * Coarser golden-section budgets than `optimal`'s defaults (12 flat, 16 TWA),
 * used for lap-time scoring only. Dock scoring runs hundreds of these per
 * screen, and at the defaults the first score took ~10.5 s on a desktop.
 *
 * prov: assumed, from a measured sweep over three setups × four wind speeds:
 * 7/8 costs 0.35 % worst-case lap-time error against the full budget, which
 * moves an expected-regret figure by at most 0.18 s/mile — under a tenth of
 * the 2 s/mile tie band the UI already refuses to resolve inside. Guarded by
 * `solve.test.ts` ("dock coarse solve budgets").
 */
export const DOCK_ITERS = { flat: 7, twa: 8 } as const;

/** Hours per mile of windward-leeward for a setup at one wind speed. */
export function lapTimeHoursUncached(
  boat: BoatDefinition,
  setup: DockControls,
  f: Forecast,
  twsKt: number,
  geom: Record<SailId, AeroGeometry>,
  iters: { flat: number; twa: number } = DOCK_ITERS,
): number {
  const base = { twsKt, seaState: f.seaState, crewKg: f.crewKg };
  const up = optimal(
    boat,
    setup,
    { ...base, twaDeg: 45, sailset: 'jib' }, // prov: assumed, canonical upwind TWA for lap-time scoring
    { optimiseTwa: true, iters },
    geom,
  );
  const dn = optimal(
    boat,
    setup,
    { ...base, twaDeg: 150, sailset: 'asym' }, // prov: assumed, canonical downwind TWA for lap-time scoring
    { optimiseTwa: true, iters },
    geom,
  );
  const vmgUp = Math.max(0.1, up.vmgKt.value); // prov: assumed, VMG floor to avoid divide-by-zero
  const vmgDn = Math.max(0.1, -dn.vmgKt.value);
  return 1 / vmgUp + 1 / vmgDn;
}

/** Coarse legal grid of dock setups used to find T*(w). prov: assumed ranges from guides */
export function candidateGrid(): DockControls[] {
  const out: DockControls[] = [];
  for (const upperTurns of [-3, -1, 0, 2, 4, 6])
    for (const lowerTurns of [-2, 0, 1, 2, 3, 5])
      for (const forestayMm of [0, 15, 30]) out.push({ upperTurns, lowerTurns, forestayMm }); // prov: assumed grid step, from tuning-guide adjustment ranges
  return out;
}

export function scoreDockSetups(
  boat: BoatDefinition,
  setups: DockControls[],
  forecast: Forecast,
  candidates: DockControls[] = candidateGrid(),
  geom: Record<SailId, AeroGeometry> = geometryFor(boat),
  /** Called after each lap solve. Reporting only — it cannot change the result. */
  onProgress?: (done: number, total: number) => void,
): DockScore[] {
  const pmf = forecastPmf(forecast);
  const all = dedupe([...candidates, ...setups]);
  // T(S, w) for every candidate and wind speed; T*(w) is the column minimum.
  const total = all.length * pmf.length;
  let done = 0;
  const times = all.map((s) =>
    pmf.map(({ twsKt }) => {
      const t = lapTimeHours(boat, s, forecast, twsKt, geom);
      onProgress?.(++done, total);
      return t;
    }),
  );
  const best = pmf.map((_, j) => {
    let bi = 0;
    for (let i = 1; i < all.length; i++) if (times[i][j] < times[bi][j]) bi = i;
    return { t: times[bi][j], setup: all[bi] };
  });

  return setups.map((setup) => {
    const i = all.findIndex((s) => same(s, setup));
    const perTws: DockRegret[] = pmf.map(({ twsKt }, j) => ({
      twsKt,
      regretSPerMile: Math.max(0, (times[i][j] - best[j].t) * 3600),
      optimum: best[j].setup,
    }));
    const expected = perTws.reduce((a, r, j) => a + pmf[j].p * r.regretSPerMile, 0);
    const worst = perTws.reduce((a, r) => (r.regretSPerMile > a.regretSPerMile ? r : a), perTws[0]);
    const tier = tierFor('dockRegret', { sailset: 'jib', twsKt: forecast.maxKt });
    return {
      setup,
      expectedRegretSPerMile: tiered(expected, tier, 0.2), // prov: assumed, wider uncertainty band for dock regret (tier B)
      atMin: perTws[0],
      atMax: perTws[perTws.length - 1],
      worst,
      perTws,
    };
  });
}

function same(a: DockControls, b: DockControls): boolean {
  return (
    a.upperTurns === b.upperTurns && a.lowerTurns === b.lowerTurns && a.forestayMm === b.forestayMm
  );
}

function dedupe(list: DockControls[]): DockControls[] {
  const out: DockControls[] = [];
  for (const s of list) if (!out.some((o) => same(o, s))) out.push(s);
  return out;
}
