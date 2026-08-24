/**
 * Hull resistance: viscous (ITTC-57 + form factor), residuary (base curve with
 * per-Froude-bin fitted multipliers), and the heel increment.
 *
 * J/70 sits at/outside DSYHS bounds; residuary is fitted to the polar (ADR 0007).
 * The Delft series (Gerritsma 1981, Keuning & Katgert 2008) is regressed over
 * L/B 2.76-5.00, B/Tc 2.46-19.4, LCB/LCF and prismatic ranges that a 6.7 m
 * planing sportboat with L^3/disp ~ 380 sits well outside, so the published
 * polynomial coefficients are not used: an out-of-range regression is a
 * confident wrong answer. Instead a smooth dimensionless base curve stands in
 * and the five `hydro.rrMul.fnNN` knobs carry the fit to the class polar.
 *
 * Wetted-surface change with heel is deliberately ignored: for a hull this
 * beamy the change is a few percent and it is not separable from the heel drag
 * knob below, which absorbs it.
 */
import type { BoatDefinition } from '../types';
import { G, NU_WATER, RHO_WATER, knob } from '../internal';

/** Froude number on waterline length: Fn = V / sqrt(g * Lwl). */
export function froude(boat: BoatDefinition, vMs: number): number {
  return vMs / Math.sqrt(G * boat.hull.lwlM);
}

/** Reynolds number on waterline length. */
export function reynolds(boat: BoatDefinition, vMs: number): number {
  return (Math.abs(vMs) * boat.hull.lwlM) / NU_WATER;
}

/**
 * ITTC-57 model-ship correlation line: Cf = 0.075 / (log10(Re) - 2)^2.
 * prov: ITTC 1957.
 */
export function frictionCoeff(re: number): number {
  // Below Re 1e4 the line diverges (log10(Re) -> 2) while the boat is moving
  // at micrometres per second. Return 0 there; Rv is ~0 at that speed anyway.
  // prov: assumed (numerical guard, not physics).
  if (!(re > 1e4)) return 0;
  return 0.075 / (Math.log10(re) - 2) ** 2;
}

/** Viscous resistance Rv = 0.5 * rho * V^2 * S * Cf * (1 + k), N. */
export function viscousResistance(boat: BoatDefinition, vMs: number): number {
  // prov: assumed. Form factor 0.1 is the usual first guess for a slender
  // canoe body; ITTC recommends measuring it, which we cannot.
  const formFactor = knob(boat, 'hydro.formFactor', 0.1);
  const cf = frictionCoeff(reynolds(boat, vMs));
  return 0.5 * RHO_WATER * vMs * vMs * boat.hull.wettedM2 * cf * (1 + formFactor);
}

/**
 * Residuary resistance base curve, Rr / (disp * g) against Froude number.
 * prov: assumed. Shape typical of DSYHS light-displacement hulls: negligible
 * below Fn 0.2, wave-making hump through 0.4-0.5, flattening as the hull
 * starts to lift. Anchored at (0, 0) so resistance is exactly zero at rest.
 */
const RR_FN = [0, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6]; // prov: assumed base curve (see docstring above)
const RR_COEFF = [0, 0.0002, 0.0008, 0.002, 0.004, 0.0075, 0.014, 0.025, 0.04, 0.056, 0.07, 0.082];

/** Froude bins carrying the fitted multipliers. prov: app convention. */
const MUL_FN = [0.2, 0.3, 0.4, 0.5, 0.6];
const MUL_KNOBS = [
  'hydro.rrMul.fn20',
  'hydro.rrMul.fn30',
  'hydro.rrMul.fn40',
  'hydro.rrMul.fn50',
  'hydro.rrMul.fn60',
];

/** Piecewise-linear interpolation, clamped (constant) outside the table. */
function lerpTable(xs: number[], ys: number[], x: number): number {
  if (x <= xs[0]) return ys[0];
  const last = xs.length - 1;
  if (x >= xs[last]) return ys[last];
  let i = 1;
  while (xs[i] < x) i++;
  const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
  return ys[i - 1] + t * (ys[i] - ys[i - 1]);
}

/** The fitted residuary multiplier at this Froude number (1 when unfitted). */
export function residuaryMultiplier(boat: BoatDefinition, fn: number): number {
  // prov: assumed. Fallback 1 = "use the base curve unmodified".
  const ys = MUL_KNOBS.map((name) => knob(boat, name, 1));
  return lerpTable(MUL_FN, ys, fn);
}

/** Residuary resistance, N. */
export function residuaryResistance(boat: BoatDefinition, vMs: number): number {
  const fn = froude(boat, vMs);
  const base = lerpTable(RR_FN, RR_COEFF, fn) * boat.hull.dispKg * G;
  // prov: assumed. Planing relief: fraction of Rr shed as the hull lifts,
  // ramped in from Fn 0.5 to Fn 1.0. Fallback 0 = no relief until fitted.
  const relief = Math.min(1, Math.max(0, knob(boat, 'hydro.planingRelief', 0)));
  const ramp = Math.min(1, Math.max(0, (fn - 0.5) / 0.5));
  return base * residuaryMultiplier(boat, fn) * (1 - relief * ramp);
}

/**
 * Heel drag increment, N: Rheel = k * heel^2 * Rv, heel in radians.
 * prov: assumed. Stands in for the asymmetric-waterline and extra-wetted-area
 * penalties, neither of which is separable at this level of model.
 */
export function heelResistance(boat: BoatDefinition, vMs: number, heelDeg: number): number {
  // prov: assumed. 0.5 puts ~6 % on Rv at 20 deg of heel.
  const k = knob(boat, 'hydro.heelDragK', 0.5);
  const heelRad = (heelDeg * Math.PI) / 180;
  return k * heelRad * heelRad * viscousResistance(boat, vMs);
}
