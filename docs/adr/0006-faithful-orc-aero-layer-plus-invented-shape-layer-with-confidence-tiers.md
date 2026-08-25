# 0006. A faithful ORC aero layer plus an explicitly invented shape-sensitivity layer, with confidence tiers on every output

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

The brief asks `core/aero` to "implement the ORC coefficient model against a
parametric flying shape" (draft, twist, entry, exit at three heights). The ORC
VPP Documentation 2023 sail model (§5.1.1) takes area, centre-of-effort height
and a CLmax/CD0 envelope versus apparent wind angle; its only trim inputs are
the scalars `flat` and `reef` and a discrete low/medium/high coefficient set
by rig adjustability (§5.1.2). There is no documented path from sail shape to
coefficients, and no public evidence maps J/70 rig settings to flying shape.
The app must still respond to every control with a visible shape change and a
speed number, and must not present invented magnitudes as ORC-derived.

## Options considered

**A. Present the whole aero model as "ORC"**: cite section numbers, feed shape
parameters in through undocumented heuristics.
- Pros: simple story.
- Cons: false provenance; a Grand Prix sailor finds one wrong case and
  dismisses the whole tool.

**B. Drop shape entirely, expose only flat/reef**: pure ORC.
- Pros: honest, simple.
- Cons: the app cannot teach trim; backstay, outhaul, jib lead do nothing
  visible.

**C. Two named layers** (chosen): `aero/orc` implements the documented model
verbatim with citations and takes only flat/reef/twist; `aero/shape` and
`shape/toOrc` are our own sign-correct heuristics that map controls to flying
shape and flying shape to small deltas on CLmax, CD0, CE height and twist,
every magnitude a calibration knob. Outputs carry a confidence tier.

## Decision

**We will keep the ORC coefficient model faithful and separate, layer an
invented shape-sensitivity model on top with every gain exposed as a knob,
and stamp every output with a tier — A (a number you may quote), B (direction
and a band), C (direction only) — computed by one function `tierFor()`,
because that is the only way to respond to every control and stay honest
about which numbers rest on evidence.** Upwind jib boat speed and VMG are A
inside the polar range; heel and leeway B; asymmetric speed B, its heel and
leeway C; any output whose shape-layer influence exceeds a threshold is
demoted one tier; anything outside the polar TWS range is demoted.

## Consequences

Easier: the README and UI can say exactly which numbers are ORC, which are
fitted, and which are invented; the Rust engine can replace the shape layer
without touching the ORC layer. Harder: two layers to calibrate; some
answers are deliberately vague. Committed to: `prov:` tags on every literal,
the header "INVENTED, not ORC" on the shape files, and the tier rules in
`src/core/solve/tierFor.ts`. Risk accepted: the shape layer may be wrong in
magnitude; it is tested for sign only.

**Revisit when:** measured flying-shape data for the J/70 (photogrammetry or
sailmaker design-suite output) becomes available, or ORC publishes a
shape-aware sail model.

### Consequences — 2026-08-26 note (audit docs-consistency-01)

"`prov:` tags on every literal" is enforced by `scripts/prov_check.py` for
`src/core` only; `src/ui/three`, `src/ui/race` and `src/ui/instruments` carry
tags by hand and `ASSUMPTIONS.md`'s prose is honour code. Widening the checker
is on audit docs-consistency-01's punchlist (H-14).

## Related

- Research: [01-adversarial-review §1, 2, 4](../research/2026-08-25-sailing-sim-landscape/01-adversarial-review.md)
- [ADR 0007](0007-calibration-and-validation-are-separate-with-a-held-out-gate.md)
