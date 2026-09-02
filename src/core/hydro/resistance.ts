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
 * Heeled residuary increment, N: the extra wave-making a hull does once it is
 * sailing on its side.
 *
 * The heel law is published, and it is Delft's, not ORC's. Keuning &
 * Sonnenberg 1998 give the increment at 20 deg of heel, non-dimensionalised on
 * displacement weight and tabulated against Froude number, and scale it to any
 * other heel angle by
 *
 *   dRrh(phi) = dRrh(20 deg) * 6.0 * phi^1.7,   phi in RADIANS
 *
 * which is normalised at 20 deg by construction: 6 * (20*pi/180)^1.7 = 1.0025.
 * prov: Keuning & Sonnenberg 1998, "Approximation of the hydrodynamic forces on
 * a sailing yacht based on the Delft Systematic Yacht Hull Series", 15th HISWA
 * Symposium (TU Delft report 1175-P). See PROVENANCE.md for the transcription
 * chain: the 1998 paper is not available online and the constant, the exponent
 * and the radian convention are taken from four independent secondary sources
 * that agree, plus the 20 deg self-normalisation, which pins all three.
 *
 * NOT ORC. ORC's VPP has published no closed-form heel drag since the 2013
 * hydro model: 2023 §6.4 says only that heeled viscous and residuary drag are
 * recomputed by re-running the hull's hydrostatics heeled. The closed-form
 * heel multiplier in ORC VPP 2012 §6.4.2.1 eqs [73]-[77] is a different model
 * (a hull-form-dependent exponent, not a universal 1.7) and a superseded
 * edition, so it is not what this cites.
 *
 * DEVIATION, deliberate, and for the same reason the upright residuary
 * polynomial is not used (module docstring): dRrh(20 deg) is itself a
 * regression in Lwl/Bwl, Bwl/Tc and LCB. It needs the canoe-body draft Tc and
 * LCB, neither of which is a measured field on the boat file, and its
 * published *scale factor* is genuinely unresolved — transcriptions of the
 * same table divide the coefficients by 100, by 1000, or not at all, a factor
 * of 1000 in the answer. A number whose order of magnitude the sources
 * contradict is not provenance. So dRrh(20 deg) is carried by one fitted drag
 * coefficient on the hull's own dynamic pressure and wetted surface,
 *
 *   dRrh(20 deg) = heelDragK * 0.5 * rho * V^2 * S
 *
 * which makes `hydro.heelDragK` readable as exactly what it is: the drag
 * coefficient the hull picks up at the heel angle the published law is
 * normalised on. Only the heel law is claimed as published; its Froude
 * dependence is assumed (ASSUMPTIONS.md, `hydro.heelDragK`).
 *
 * This replaced an assumed k*heel^2*Rv (ADR 0022), which was wrong twice: the
 * exponent, and the anchor. Anchoring the increment on *viscous* drag put a
 * factor Cf(1+k) ~ 0.0029 inside the knob, so even at its calibration bound of
 * 4.0 the old form could reach a heeled drag coefficient of only 0.0016 —
 * about half what the polar's upwind speed plateau needs. That is why the fit
 * read as "no knob closes it" rather than "the knob is anchored wrong".
 */
export function heelResistance(boat: BoatDefinition, vMs: number, heelDeg: number): number {
  // prov: assumed. Fallback 0.001, i.e. the heeled hull picks up about a third
  // of its own flat-plate friction coefficient again at 20 deg of heel.
  const k = knob(boat, 'hydro.heelDragK', 0.001);
  const heelRad = (Math.abs(heelDeg) * Math.PI) / 180;
  // prov: Keuning & Sonnenberg 1998, see docstring. 6.0 and 1.7 are published.
  const heelLaw = 6.0 * Math.pow(heelRad, 1.7);
  return k * heelLaw * 0.5 * RHO_WATER * vMs * vMs * boat.hull.wettedM2;
}
