/**
 * ORC windage force model: hull, mast, rigging, crew.
 *
 * Source: ORC VPP Documentation 2023 §5.3 and Table 5.10,
 * https://orc.org/uploads/files/ORC-VPP-Documentation-2023.pdf
 *
 * Each element gets its own dynamic head based on the apparent wind speed at
 * its own centre of effort height (§5.3), a frontal and a side reference area,
 * and a drag coefficient blended between the AWA 0 and AWA 90 values by
 * eq (5.26). The result is pure drag, aligned with the apparent wind, which is
 * then resolved into drive and heeling components exactly as the sail forces
 * are (eqs 5.50/5.51 with CL = 0).
 */
import { RHO_AIR } from '../../internal';
import {
  CREW_AREF_FRONT_M2,
  CREW_AREF_SIDE_PER_HEAD_M2,
  CREW_ZCE_OFFSET_M,
  HSA_HEEL_FACTOR,
  HULL_ZCE_FACTOR,
  SPREADER_FACTOR_WINDAGE,
  WINDAGE_CD,
} from './tables';

export interface WindageElement {
  name: string;
  /** Centre of effort height above the water plane, m. */
  zceM: number;
  cdFront: number;
  aFrontM2: number;
  cdSide: number;
  aSideM2: number;
}

export interface WindageGeometry {
  /** Height of the base of I above the water, m. */
  hbiM: number;
  /** Average freeboard, upright, m. */
  fbavM: number;
  /** Maximum beam, m. */
  beamM: number;
  loaM: number;
  /** Foretriangle height I, m. */
  iM: number;
  /** Static effective mast height ehm = max(P*tf + BAS, I, ISP), m. */
  ehmM: number;
  /** Mast transverse diameter (frontal), m. */
  mastFrontM: number;
  /** Mast longitudinal diameter (side), m. */
  mastSideM: number;
  /** Rigging wire diameter, m. */
  wireDiaM: number;
  /** Number of movable crew (Mvblcrew). */
  crewCount: number;
  /** Mainsail reduction factor rfm, 1 = full main. */
  rfm: number;
  heelDeg: number;
}

/**
 * Build the five Table 5.10 elements for a sloop.
 * prov: ORC VPP 2023 Table 5.10, §5.3, §5.3.1
 */
export function windageElements(g: WindageGeometry): WindageElement[] {
  const sinPhi = Math.abs(Math.sin((g.heelDeg * Math.PI) / 180));
  const rfm = Math.min(1, Math.max(0, g.rfm));

  // HULL. prov: Table 5.10 HULL row; AREF(0) = FBAV*B, AREF(90) = f(HSA0, phi).
  // HSA0 = fb * LOA (eq 5.27); heeled growth via the pre-2017 eq (5.28).
  const hsa0 = g.fbavM * g.loaM;
  const hsa = hsa0 + HSA_HEEL_FACTOR * (g.beamM / 2) * sinPhi * g.loaM;
  const hull: WindageElement = {
    name: 'hull',
    zceM: HULL_ZCE_FACTOR * (g.fbavM + g.beamM * sinPhi),
    cdFront: WINDAGE_CD.hullFront,
    aFrontM2: g.fbavM * g.beamM,
    cdSide: WINDAGE_CD.hullSide,
    aSideM2: hsa,
  };

  // MAST-Sail: the portion of mast behind the (reefed) mainsail.
  // MAST-Bare: the exposed remainder. The ZCE expressions are transcribed
  // verbatim from Table 5.10 including the bare-mast one, which reads
  // HBI + EHM*(1-rfm)/2 rather than measuring from the top of the reefed main.
  const hSail = g.ehmM * rfm;
  const hBare = g.ehmM * (1 - rfm);
  const mastSail: WindageElement = {
    name: 'mast-sail',
    zceM: g.hbiM + hSail / 2,
    cdFront: WINDAGE_CD.mastSailFront,
    aFrontM2: hSail * g.mastFrontM,
    cdSide: WINDAGE_CD.mastSailSide,
    aSideM2: hSail * g.mastSideM,
  };
  const mastBare: WindageElement = {
    name: 'mast-bare',
    zceM: g.hbiM + hBare / 2,
    cdFront: WINDAGE_CD.mastBareFront,
    aFrontM2: hBare * g.mastFrontM,
    cdSide: WINDAGE_CD.mastBareSide,
    aSideM2: hBare * g.mastSideM,
  };

  // RIGGING. AREF = I * wire diameter (eq 5.32); Cd0 = Cd * (1 + 0.2) for
  // spreaders (eq 5.33). SIMPLIFIED: ORC derives the wire diameter from the
  // default rigging weight (eq 5.31); the J/70 wire size is published
  // (rig.wire "5 mm 1x19") so it is used directly via the aero.wireDiaM knob.
  const aRig = g.iM * g.wireDiaM;
  const cdRig = WINDAGE_CD.rigging * (1 + SPREADER_FACTOR_WINDAGE);
  const rigging: WindageElement = {
    name: 'rigging',
    zceM: g.hbiM + g.iM / 2,
    cdFront: cdRig,
    aFrontM2: aRig,
    cdSide: cdRig,
    aSideM2: aRig,
  };

  // CREW. Since 2019 the drag is based on the default crew *count*, not the
  // declared crew weight, so crewKg is deliberately not an input here.
  const crew: WindageElement = {
    name: 'crew',
    zceM: g.hbiM + CREW_ZCE_OFFSET_M + (g.beamM / 2) * sinPhi,
    cdFront: WINDAGE_CD.crew,
    aFrontM2: CREW_AREF_FRONT_M2,
    cdSide: WINDAGE_CD.crew,
    aSideM2: CREW_AREF_SIDE_PER_HEAD_M2 * g.crewCount,
  };

  return [hull, mastSail, mastBare, rigging, crew];
}

export interface WindageResult {
  /** Total windage drag along the apparent wind, N (always >= 0). */
  dragN: number;
  /** Component along the course, N (negative = retarding). */
  frN: number;
  /** Component perpendicular to the mast plane, N (positive = heeling). */
  fhN: number;
  /** Heeling moment about the water plane, N·m. */
  mhNm: number;
}

/**
 * Sum the windage elements.
 *
 * @param els       elements from `windageElements`
 * @param awaDeg    apparent wind angle at the sailplan CE, degrees, 0..180
 * @param awsAtM    apparent wind speed at a given height, m/s (wind gradient)
 *
 * D = sum_n q_n * (Cd_front*A_front*|cos b| + Cd_side*A_side*|sin b|)
 * prov: ORC VPP 2023 §5.3, eqs (5.25) and (5.26). eq (5.26) writes the frontal
 * term as `Cd_front*A_front*cos(b)^sgn(90-b)`; with the drag necessarily
 * positive on both sides of 90 deg this is |cos b|, which is what is used.
 */
export function windageForces(
  els: readonly WindageElement[],
  awaDeg: number,
  awsAtM: (zM: number) => number,
): WindageResult {
  const b = (Math.abs(awaDeg) * Math.PI) / 180;
  const cosB = Math.cos(b);
  const sinB = Math.sin(b);
  let dragN = 0;
  let mhNm = 0;
  for (const e of els) {
    const v = awsAtM(Math.max(0, e.zceM));
    const q = 0.5 * RHO_AIR * v * v;
    const d = q * (e.cdFront * e.aFrontM2 * Math.abs(cosB) + e.cdSide * e.aSideM2 * Math.abs(sinB));
    dragN += d;
    // FH of a pure drag force, eq (5.51) with CL = 0.
    mhNm += d * sinB * e.zceM;
  }
  return { dragN, frN: -dragN * cosB, fhN: dragN * sinB, mhNm };
}
