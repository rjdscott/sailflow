/**
 * Dock controls + backstay -> rig state (bend curve, sag, rake, prebend,
 * shroud and forestay tensions).
 *
 * INVENTED layer. There is no published J/70 turns-to-tension or
 * tension-to-sag data, so every coupling here is a sign-correct linear or
 * inverse relation with a calibration knob for its magnitude (ADR 0006,
 * research finding 2). What is tested and guaranteed:
 *
 *   backstay      up -> bend up, sag down, forestay tension up
 *   upper turns   up -> upper tension up, forestay tension up
 *   lower turns   up -> prebend down (tighter lowers straighten the mast;
 *                       this is the sign the North guide implies when it
 *                       pairs looser lowers with more pre-bend and a softer
 *                       lower panel)
 *   forestay mm   up -> rake up, forestay tension down, sag up
 *
 * Pure and deterministic: no Date, no Math.random.
 */
import type { BoatDefinition, DockControls, RigState } from '../types';
import { knob } from '../internal';
import { backstayGeometry, forestayGeometry } from '../geometry/rig';
import { beamPeakMm, bendCurveMm } from './beam';

const DEG = Math.PI / 180;

/** Backstay tension at 100 %, N. */
export function backstayMaxN(boat: BoatDefinition): number {
  // prov: assumed. 4:1 purchase (Class Rules F.4.2 backstay purchase max 4)
  // hauled hard by one crew; no published J/70 backstay load exists.
  return knob(boat, 'rig.backstayMaxN', 4000);
}

export function rigState(boat: BoatDefinition, dock: DockControls, backstayPct: number): RigState {
  const bs = Math.min(100, Math.max(0, backstayPct));
  const backstayN = (bs / 100) * backstayMaxN(boat);

  // --- shroud tensions -----------------------------------------------------
  // prov: assumed. North base is Loos PT-2 22 uppers / 12 lowers on 5 mm
  // 1x19; read off the gauge that is roughly 350 kgf and 160 kgf. The PT-2
  // scale is non-linear and the conversion was not verified against a Loos
  // table, so both are assumptions, not published numbers.
  const upperBaseN = knob(boat, 'rig.upperBaseN', 3400);
  const lowerBaseN = knob(boat, 'rig.lowerBaseN', 1600);
  // prov: assumed. One turnbuckle turn ~ 220 N on 5 mm 1x19 over a J/70
  // shroud length; order-of-magnitude only.
  const turnsToN = knob(boat, 'rig.turnsToN', 220);
  const upperN = Math.max(0, upperBaseN + dock.upperTurns * turnsToN);
  const lowerN = Math.max(0, lowerBaseN + dock.lowerTurns * turnsToN);

  // --- rake ----------------------------------------------------------------
  const fs = forestayGeometry(boat, dock.forestayMm);
  const bsGeom = backstayGeometry(boat);

  // --- forestay tension ----------------------------------------------------
  // The backstay's pull is reacted by the forestay; the geometric leverage is
  // the ratio of the two sines about the mast, damped by an efficiency knob
  // because part of the load goes into mast bend and mast compression.
  const sinBackstay = Math.sin(bsGeom.angleFromMastDeg * DEG);
  const sinForestay = Math.sin(fs.angleFromMastDeg * DEG);
  const leverage = sinForestay > 1e-6 ? sinBackstay / sinForestay : 0;
  const forestayN = Math.max(
    100, // prov: assumed floor, keeps the sag division finite
    knob(boat, 'rig.forestayBaseN', 1500) + // prov: assumed, dock base with backstay off
      knob(boat, 'rig.upperToForestayK', 0.3) * (upperN - upperBaseN) + // prov: assumed, swept spreaders carry uppers into the forestay
      knob(boat, 'rig.backstayToForestayK', 0.7) * leverage * backstayN + // prov: assumed efficiency
      knob(boat, 'rig.forestayLenToNPerMm', -15) * dock.forestayMm, // prov: assumed, a longer forestay is a slacker one
  );

  // --- sag -----------------------------------------------------------------
  // sag = k · load / tension: the string-under-lateral-load relation, with a
  // fixed reference luff load because rigState has no wind input.
  const sagMm = (knob(boat, 'rig.sagK', 45) * knob(boat, 'rig.sagLoadN', 2000)) / forestayN; // prov: assumed both

  // --- prebend and bend ----------------------------------------------------
  // Prebend is parameterised directly in mm because that is the unit tuning
  // guides publish (North: 1 1/2 - 2 1/2 in aft bend at the spreaders).
  const prebendMm = Math.max(
    0,
    // prov: per-class, default from the North J/70 guide base 1.5-2.5 in,
    // midpoint ~50 mm. A class whose guide calls a different base prebend
    // sets this knob; leaving it is borrowing the reference boat's rig.
    knob(boat, 'rig.prebendBaseMm', 50) +
      knob(boat, 'rig.prebendPerUpperTurnMm', 2) * dock.upperTurns + // prov: assumed, swept spreaders add bend as uppers come on
      knob(boat, 'rig.prebendPerLowerTurnMm', -6) * dock.lowerTurns, // prov: assumed, tighter lowers straighten
  );
  const bendMm = bendCurveMm(boat, prebendMm + beamPeakMm(boat, backstayN * sinBackstay));

  return { bendMm, sagMm, rakeMm: fs.rakeMm, prebendMm, forestayN, upperN, lowerN };
}

/** Peak fore-aft bend of a rig state, mm. Convenience for the shape layer. */
export function peakBendMm(rig: RigState): number {
  return rig.bendMm.reduce((m, v) => (Math.abs(v) > Math.abs(m) ? v : m), 0);
}
