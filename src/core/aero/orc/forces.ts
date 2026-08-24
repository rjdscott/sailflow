/**
 * ORC aerodynamic force model: apparent wind -> sailset coefficients -> forces.
 *
 * Source: ORC VPP Documentation 2023,
 * https://orc.org/uploads/files/ORC-VPP-Documentation-2023.pdf
 * §5.4 (aggregation, CE height, induced drag), §5.5 (resolution of forces),
 * §5.6 (blanketing), §7.1 (apparent wind with heel and gradient).
 *
 * Deviations from ORC are marked SIMPLIFIED or INVENTED at the point of use.
 * Every literal carries a `prov:` tag. Free parameters are read through
 * `knob()` so the calibration block stays the single source of truth.
 *
 * Frames. Returned `fxN` is along the course (positive = drive), `fyN` is
 * athwartships (positive = to leeward on the current tack, so it flips sign
 * with the sign of TWA), `mxNm` is the heeling moment about the water plane.
 */
import type { AeroState, BoatDefinition, SailDef, SailId, SailSet } from '../../types';
import type { AeroInput, ShapeDeltas } from '../../internal';
import { KT_TO_MS, RHO_AIR, knob } from '../../internal';
import { fcoefOf, lerpTable, sailCoeffs, type CoeffSet, type OrcSail } from './coeffs';
import { efficiencyCoeff, reduction, sailsetCd, sailsetCl, clampFlat } from './depower';
import { jibTwistCeDropM, twistCeFactor } from './twist';
import { windageElements, windageForces } from './windage';
import {
  EFF_SPAN,
  KHEFF_AWA,
  KHEFF_VALUE,
  MAIN_CEH_CONST,
  ROACH_NORM,
  TF_BASE,
  TF_GAIN,
  WIND_Z0_M,
  WIND_Z_REF_M,
} from './tables';
import { ZERO_DELTAS, applyShapeDeltas, twistCeFactorInvented } from '../shape/sensitivity';

/**
 * Minimal geometry the aero model needs from a sail.
 *
 * `geometry/sailplan.ts` exports `sailGeometry(boat, sail): SailGeometry`,
 * whose `areaM2`/`ceHeightM` are exactly these fields. It is injected rather
 * than imported so this module builds and tests standalone; the solver wires
 * it in with
 *   `aeroForces(boat, input, { main: sailGeometry(boat, 'main'), ... })`.
 */
export interface AeroGeometry {
  areaM2: number;
  ceHeightM: number;
}

/** Which sails are carried for each sailset. prov: ORC VPP 2023 §7.2 */
const SAILS_OF: Record<SailSet, readonly SailId[]> = {
  jib: ['main', 'jib'],
  asym: ['main', 'asym'],
};

function dim(sail: SailDef, key: string, fallback: number): number {
  const v = sail[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Luff/span length of a sail, m: P for the main, measured luff otherwise. */
function spanOf(boat: BoatDefinition, id: SailId): number {
  if (id === 'main') return boat.rig.pM;
  return dim(boat.sails[id], 'luffMm', 0) / 1000;
}

/**
 * Fallback sail geometry used when `geometry/sailplan.ts` is not injected.
 *
 * area = rated area; CE height = 0.39 * span + 0.9 m above the water plane.
 * prov: assumed. The 0.39 coefficient is the historical ORC default mainsail
 * CE fraction of P (ORC VPP 2023 §5.2.1: "for a mainsail with default girths,
 * CEH = 0.39P ... with the present defaults CEH = 0.40P"), and the +0.9 m is a
 * stand-in for the boom-above-water offset. This is a placeholder, not a
 * measurement, and is superseded by the injected geometry.
 */
export function fallbackGeometry(boat: BoatDefinition, id: SailId): AeroGeometry {
  return {
    areaM2: boat.sails[id].ratedAreaM2,
    ceHeightM: 0.39 * spanOf(boat, id) + 0.9, // prov: ORC VPP 2023 §5.2.1 default mainsail CE fraction (0.39); +0.9 m boom-above-water offset is assumed
  };
}

/**
 * True wind speed at height z.
 * VTz = VTzref * log(z/z0) / log(zref/z0)
 * prov: ORC VPP 2023 §7.1, eq (7.1)
 */
export function windAt(vtRefMs: number, zM: number): number {
  const z = Math.max(zM, WIND_Z0_M * 1.0001); // prov: assumed, numerical guard against log(0) at the roughness height
  return (vtRefMs * Math.log(z / WIND_Z0_M)) / Math.log(WIND_Z_REF_M / WIND_Z0_M);
}

export interface ApparentWind {
  awsMs: number;
  /** Unsigned apparent wind angle, degrees, 0..180. */
  awaDeg: number;
}

/**
 * Apparent wind triangle with the ORC heel correction: only the component of
 * the true wind perpendicular to the yacht's track is multiplied by cos(heel),
 * because the VPP resolves the aerodynamic force relative to the mast plane.
 *
 *   beta_A = atan2(VT*sin(beta_T)*cos(phi), VT*cos(beta_T) + Vs)
 *   VA     = sqrt((VT*sin(beta_T)*cos(phi))^2 + (VT*cos(beta_T) + Vs)^2)
 *
 * prov: ORC VPP 2023 §7.1, eqs (7.2) and (7.3)
 */
export function apparentWind(
  vtMs: number,
  twaDeg: number,
  vsMs: number,
  heelDeg: number,
): ApparentWind {
  const t = (Math.abs(twaDeg) * Math.PI) / 180;
  const phi = (Math.abs(heelDeg) * Math.PI) / 180;
  const perp = vtMs * Math.sin(t) * Math.cos(phi);
  const along = vtMs * Math.cos(t) + vsMs;
  return {
    awsMs: Math.hypot(perp, along),
    awaDeg: (Math.atan2(perp, along) * 180) / Math.PI,
  };
}

/**
 * Mainsail roach parameter.
 *   upper 3/4 area = P/8 * (MQW + 2*MHW + 1.5*MTW + MUW + 0.5*MHB)
 *   roach = (upper34 / (0.375*P*MQW) - 1) / 0.844
 * prov: ORC VPP 2023 §5.2.1, eqs (5.3) and (5.4)
 */
export function roachOf(boat: BoatDefinition): number {
  const m = boat.sails.main;
  const p = boat.rig.pM;
  const mqw = dim(m, 'quarterMm', 0) / 1000;
  const mhw = dim(m, 'halfMm', 0) / 1000;
  const mtw = dim(m, 'threeQuarterMm', 0) / 1000;
  const muw = dim(m, 'upperMm', 0) / 1000;
  const mhb = dim(m, 'topMm', 0) / 1000;
  const denom = 0.375 * p * mqw; // prov: ORC VPP 2023 §5.2.1, eq (5.4)
  if (denom <= 0) return EFF_SPAN.roachRef; // prov: ORC VPP 2023 §5.4.3 reference roach
  const upper34 = (p / 8) * (mqw + 2 * mhw + 1.5 * mtw + muw + 0.5 * mhb);
  return Math.max(0, (upper34 / denom - 1) / ROACH_NORM); // negative roach counts as zero
}

/**
 * Blanketing factor bk. For a sloop the mainsail factor is identically 1
 * (fm = 0, no mizzen staysail) and the spinnaker factor is 1 at all angles;
 * only the jib is blanketed, above AWA 135.
 * prov: ORC VPP 2023 §5.6.1, §5.6.2, §5.6.3
 */
function blanketing(id: SailId, awaDeg: number, fj: number): number {
  if (id !== 'jib' || awaDeg <= 135) return 1; // prov: ORC VPP 2023 §5.6.2 (blanketing starts at AWA 135)
  return 1 - (fj * (awaDeg - 135)) / 45;
}

/** Which ORC coefficient table a sail id uses. */
function tableOf(id: SailId): OrcSail {
  return id;
}

interface Aggregate {
  arefM2: number;
  clMax: number;
  cd0Max: number;
  kpp: number;
  /** Force-weighted CE height above the water plane, m. */
  zceWaterM: number;
  fcdj: number;
}

/**
 * Weighted superposition of the individual sail coefficients, eqs (5.35),
 * (5.36), (5.38), (5.41). Aref is the total (reduced) sail area.
 * prov: ORC VPP 2023 §5.4.1, §5.4.2, §5.4.3
 */
function aggregate(
  ids: readonly SailId[],
  geo: Record<string, AeroGeometry>,
  areaScale: Record<string, number>,
  awaDeg: number,
  sets: Record<string, CoeffSet>,
  fcoef: number,
  fj: number,
  /** Per-sail multiplier on CLmax; 1 leaves the ORC table untouched. */
  clMul: Record<string, number>,
): Aggregate {
  let arefM2 = 0;
  let sumCl = 0;
  let sumCd = 0;
  let sumKpp = 0;
  let sumZceNum = 0;
  let sumZceDen = 0;
  let jibParasite = 0;
  let totalParasite = 0;

  for (const id of ids) {
    const a = geo[id].areaM2 * areaScale[id];
    if (a <= 0) continue;
    const table = sailCoeffs(tableOf(id), awaDeg, sets[id], fcoef);
    const c = { ...table, clMax: table.clMax * (clMul[id] ?? 1) };
    const bk = blanketing(id, Math.abs(awaDeg), fj);
    arefM2 += a;
    sumCl += c.clMax * bk * a;
    sumCd += c.cd0 * bk * a;
    sumKpp += c.kp * c.clMax * c.clMax * bk * a;
    // eq (5.38): weight by the partial force coefficient sqrt(CL^2 + CD0^2).
    const partial = Math.hypot(c.clMax, c.cd0);
    sumZceNum += geo[id].ceHeightM * partial * bk * a;
    sumZceDen += partial * bk * a;
    const par = c.cd0 * bk * a;
    totalParasite += par;
    if (id === 'jib') jibParasite += par;
  }

  if (arefM2 <= 0) {
    return { arefM2: 0, clMax: 0, cd0Max: 0, kpp: 0, zceWaterM: 0, fcdj: 0 };
  }
  const clMax = sumCl / arefM2;
  const cd0Max = sumCd / arefM2;
  const kpp = clMax === 0 ? 0 : sumKpp / (arefM2 * clMax * clMax);
  return {
    arefM2,
    clMax,
    cd0Max,
    kpp,
    zceWaterM: sumZceDen === 0 ? 0 : sumZceNum / sumZceDen,
    fcdj: totalParasite === 0 ? 0 : jibParasite / totalParasite,
  };
}

/**
 * Total aerodynamic forces on the sailplan plus windage.
 *
 * @param geom optional injected sail geometry (from `geometry/sailplan.ts`).
 *             When absent, `fallbackGeometry` is used for the sails involved.
 */
export function aeroForces(
  boat: BoatDefinition,
  input: AeroInput,
  geom?: Partial<Record<SailId, AeroGeometry>>,
): AeroState {
  const { rig } = boat;
  const ids = SAILS_OF[input.sailset];

  // ---- knobs -------------------------------------------------------------
  // prov: assumed. Not published for the J/70; every one is a calibration
  // knob so a measurement can replace it without touching this code.
  const basM = knob(boat, 'aero.basM', 0.8); // boom above sheer, m
  const hbiM = knob(boat, 'aero.hbiM', 0.75); // base of I above water, m
  const fbavM = knob(boat, 'aero.fbavM', 0.62); // average freeboard, m
  const mastFrontM = knob(boat, 'aero.mastFrontM', 0.075); // mast transverse dia, m
  const mastSideM = knob(boat, 'aero.mastSideM', 0.115); // mast longitudinal dia, m
  // prov: boat.rig.wire "5 mm 1x19" (J/70 Class Rules), expressed in m.
  const wireDiaM = knob(boat, 'aero.wireDiaM', 0.005);
  const crewCount = knob(boat, 'aero.crewCount', boat.crew.minCount);
  // Coefficient set, 0 = low / 1 = medium / 2 = high (§5.1.2, Tables 5.2, 5.5).
  // Default 1 (medium) for both: the J/70 has a backstay but no runners and no
  // forestay adjustment while racing (Class Rules C.9.5), which is exactly the
  // "backstay fitted, no running backstays" row that ORC blends with fcoef.
  const mainSet = knob(boat, 'aero.mainSet', 1) as CoeffSet;
  const jibSet = knob(boat, 'aero.jibSet', 1) as CoeffSet;
  // INVENTED knob, see shape/sensitivity.ts.
  const twistCeGain = knob(boat, 'aero.twistCeGain', 0.004);

  const sets: Record<string, CoeffSet> = { main: mainSet, jib: jibSet, asym: 0 };
  // prov: assumed. CALIBRATION KNOB, not ORC. Table 5.6 is a generic
  // asymmetric on a centreline tack; the J/70's sail on a fixed sprit is a
  // different animal and the class polar's running rows cannot be reached
  // with the table as printed. Fallback 1 = use ORC unmodified.
  const clMul: Record<string, number> = {
    main: 1,
    jib: 1,
    asym: knob(boat, 'aero.asymClMul', 1),
  };

  // ---- geometry ----------------------------------------------------------
  const geo: Record<string, AeroGeometry> = {};
  for (const id of ids) geo[id] = geom?.[id] ?? fallbackGeometry(boat, id);

  // ---- de-powering -------------------------------------------------------
  const flat = clampFlat(input.tune.flat);
  const reef = Math.min(1, Math.max(0, input.tune.reef));
  const red = reduction(reef, input.sailset);
  const areaScale: Record<string, number> = {
    main: red.mainAreaScale,
    jib: red.foreAreaScale,
    asym: red.foreAreaScale,
  };

  // Reduced rig geometry. prov: ORC VPP 2023 Figure 5.4 (P_r = P*rfm,
  // frac_r = IG_r/(P_r + BAS), over_r = LPG_r/J).
  const pRed = rig.pM * red.rfm;
  const fractionality = rig.iM / Math.max(1e-6, pRed + basM);
  const lpgM = dim(boat.sails.jib, 'lpMm', 0) / 1000;
  const overlap = (lpgM * (input.sailset === 'jib' ? red.ftj : 1)) / rig.jM;
  const fcoef = fcoefOf(fractionality);
  const roach = roachOf(boat);

  // Jib blanketing factor fj = (Ajib - min(Ajib, Afore)) / Ajib, with the
  // foretriangle area Afore = I*J/2. prov: ORC VPP 2023 §5.6.2
  const aJib = boat.sails.jib.ratedAreaM2;
  const aFore = (rig.iM * rig.jM) / 2;
  const fj = aJib > 0 ? (aJib - Math.min(aJib, aFore)) / aJib : 0;

  // ---- apparent wind, two passes ----------------------------------------
  // The CE height sets the gradient height, and the gradient sets the AWA that
  // sets the CE height. ORC iterates this inside the VPP loop; two passes from
  // the area-weighted CE converge to well under a millimetre here.
  // ponytail: two passes, not a loop. Add a loop if a residual ever needs it.
  const vtRefMs = input.twsKt * KT_TO_MS;
  const vsMs = input.bsKt * KT_TO_MS;
  let areaW = 0;
  let areaSum = 0;
  for (const id of ids) {
    const a = geo[id].areaM2 * areaScale[id];
    areaW += geo[id].ceHeightM * a;
    areaSum += a;
  }
  let zRef = areaSum > 0 ? areaW / areaSum : hbiM;
  let aw = apparentWind(windAt(vtRefMs, zRef), input.twaDeg, vsMs, input.heelDeg);
  let agg = aggregate(ids, geo, areaScale, aw.awaDeg, sets, fcoef, fj, clMul);
  zRef = agg.zceWaterM > 0 ? agg.zceWaterM : zRef;
  aw = apparentWind(windAt(vtRefMs, zRef), input.twaDeg, vsMs, input.heelDeg);
  agg = aggregate(ids, geo, areaScale, aw.awaDeg, sets, fcoef, fj, clMul);

  const awaAbs = aw.awaDeg;

  // ---- shape layer (INVENTED, see shape/sensitivity.ts) ------------------
  const deltas: ShapeDeltas = input.deltas ?? ZERO_DELTAS;
  const twistEff = input.tune.twistEffDeg + deltas.dTwistDeg;
  const shaped = applyShapeDeltas(
    {
      clMax: agg.clMax,
      cd0: agg.cd0Max,
      ceH: agg.zceWaterM,
      twist: input.tune.twistEffDeg,
    },
    deltas,
  );

  // ---- effective rig height ---------------------------------------------
  // eff_span_corr, eq (5.42).
  const effSpanCorr =
    EFF_SPAN.base +
    EFF_SPAN.roachGain * (roach - EFF_SPAN.roachRef) +
    EFF_SPAN.outerGain *
      (EFF_SPAN.innerBase +
        EFF_SPAN.fracGain * fractionality +
        EFF_SPAN.overlapGain * overlap -
        EFF_SPAN.innerRef);

  // b = highest point of the sailplan above the deck: mainsail head
  // (P_r + BAS) or jib head (IG); if the jib head is higher, the average.
  // prov: ORC VPP 2023 §5.4.3, eq (5.45)
  const mainHead = pRed + basM;
  const jibHead = rig.iM;
  const bM = jibHead > mainHead ? (mainHead + jibHead) / 2 : mainHead;
  const bMaxM = bM + hbiM;

  let cheff: number;
  if (input.sailset === 'jib') {
    // eq (5.43): cheff_upwind = eff_span_corr * kheff(AWA)
    cheff = effSpanCorr * lerpTable(KHEFF_AWA, KHEFF_VALUE, awaAbs);
  } else {
    // eq (5.44): with a spinnaker the effective height is independent of AWA.
    // tf = 0.16 * Zm/P + 0.94 with Zm the mainsail centroid above the boom.
    const zmM = Math.max(0, geo.main.ceHeightM - MAIN_CEH_CONST * rig.pM - basM - hbiM);
    const tf = TF_GAIN * (zmM / rig.pM) + TF_BASE;
    const heffMaxSpi = rig.pM * tf + basM + hbiM;
    cheff = (heffMaxSpi / bMaxM) * reef;
  }
  const heffM = Math.max(0.5, cheff * bMaxM); // eq (5.45)

  // ---- coefficients ------------------------------------------------------
  const ceEff = efficiencyCoeff(agg.kpp, agg.arefM2, heffM); // eq (5.46)
  const cl = sailsetCl(shaped.clMax, flat); // eq (5.48)
  const cd = sailsetCd(shaped.cd0, shaped.clMax, flat, agg.fcdj, ceEff); // eq (5.47)

  // ---- centre of effort --------------------------------------------------
  // Work in ORC's frame (above the base of I) so eqs (5.49) and (5.57) apply
  // to the same reference the doc uses, then convert back to the water plane.
  let zceOrc = Math.max(0, shaped.ceH - hbiM);
  zceOrc *= twistCeFactor(flat, fractionality); // eq (5.49)
  zceOrc *= twistCeFactorInvented(twistEff, twistCeGain); // INVENTED
  if (input.sailset === 'jib') zceOrc -= jibTwistCeDropM(red.ftj, rig.iM); // eq (5.40)
  zceOrc = Math.max(0, zceOrc);
  // eq (5.57) moment arm: HBI + ZCE * REEF.
  const armM = hbiM + zceOrc * reef;

  // ---- resolution of forces ---------------------------------------------
  const beta = (awaAbs * Math.PI) / 180;
  const cr = cl * Math.sin(beta) - cd * Math.cos(beta); // eq (5.50)
  const ch = cl * Math.cos(beta) + cd * Math.sin(beta); // eq (5.51)
  const q = 0.5 * RHO_AIR * aw.awsMs * aw.awsMs;
  const frSails = cr * q * agg.arefM2; // eq (5.52)
  const fhSails = ch * q * agg.arefM2; // eq (5.53)
  const mhSails = fhSails * armM; // eq (5.57)

  // ---- windage -----------------------------------------------------------
  // ehm = max(P*tf + BAS, I, ISP); ISP is not carried in the boat definition.
  const tfStatic = TF_GAIN * (Math.max(0, geo.main.ceHeightM - basM - hbiM) / rig.pM) + TF_BASE;
  const ehmM = Math.max(rig.pM * tfStatic + basM, rig.iM);
  const wind = windageForces(
    windageElements({
      hbiM,
      fbavM,
      beamM: boat.hull.beamM,
      loaM: boat.hull.loaM,
      iM: rig.iM,
      ehmM,
      mastFrontM,
      mastSideM,
      wireDiaM,
      crewCount,
      rfm: red.rfm,
      heelDeg: input.heelDeg,
    }),
    awaAbs,
    (z) => {
      const vt = windAt(vtRefMs, z);
      return apparentWind(vt, input.twaDeg, vsMs, input.heelDeg).awsMs;
    },
  );

  // ---- totals ------------------------------------------------------------
  // eqs (5.54)-(5.56). The cos(heel) projects the mast-plane heeling moment
  // onto the upright water-plane axis that `HydroState.rightingNm` is measured
  // about; ORC eq (5.57) omits it because it never leaves the mast plane.
  const sgn = input.twaDeg < 0 ? -1 : 1;
  const cosHeel = Math.cos((Math.abs(input.heelDeg) * Math.PI) / 180);

  return {
    flat,
    reef,
    twistEff,
    awaDeg: sgn * awaAbs,
    awsKt: aw.awsMs / KT_TO_MS,
    fxN: frSails + wind.frN,
    fyN: sgn * (fhSails + wind.fhN),
    mxNm: sgn * (mhSails + wind.mhNm) * cosHeel,
    ceHeightM: armM,
  };
}
