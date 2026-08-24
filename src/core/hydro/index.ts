/**
 * Hydrodynamic forces on the hull: resistance, side force, righting moment.
 *
 * Pure and deterministic. Everything fitted goes through `knob()` so the
 * boat's `calibration` block stays the single source of truth; every literal
 * carries a `prov:` tag in the module that owns it.
 */
import type { HydroForcesFn, HydroState } from '../internal';
import { KT_TO_MS } from '../internal';
import { heelResistance, residuaryResistance, viscousResistance } from './resistance';
import { inducedDrag, sideForce } from './keel';
import { crewRighting, hullRighting } from './righting';
import { addedResistanceWaves } from './waves';

export const hydroForces: HydroForcesFn = (boat, input): HydroState => {
  const vMs = input.bsKt * KT_TO_MS;

  const viscousN = viscousResistance(boat, vMs);
  const residuaryN = residuaryResistance(boat, vMs);
  const heelN = heelResistance(boat, vMs, input.heelDeg);
  const wavesN = addedResistanceWaves(boat, vMs, input.seaState);

  const sideForceN = sideForce(boat, vMs, input.heelDeg, input.leewayDeg);
  const inducedN = inducedDrag(boat, vMs, input.heelDeg, sideForceN);

  const hullRmNm = hullRighting(boat, input.heelDeg);
  const crewRmNm = crewRighting(boat, input.crewKg, input.heelDeg);

  return {
    resistanceN: viscousN + residuaryN + inducedN + heelN + wavesN,
    sideForceN,
    rightingNm: hullRmNm + crewRmNm,
    parts: { viscousN, residuaryN, inducedN, heelN, wavesN, hullRmNm, crewRmNm },
  };
};

export { froude, reynolds, frictionCoeff, residuaryMultiplier } from './resistance';
export { crewArmM } from './righting';
export { HS_BY_SEA_STATE, significantHeightM } from './waves';
