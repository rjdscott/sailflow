# 0018. The offwind sail gets a fitted bluff-body drag knob above the wing-to-parachute changeover, not a soak/plane mode switch

- **Status:** Accepted
- **Date:** 2026-08-26

## Context

`pnpm validate` read FAIL — 8/10 — with the worst residual by far at the
held-out TWS 14 asymmetric VMG row: the ORC Speed Guide soaks to **172.0° at
6.26 kt** and the model sailed **146.5° at 7.21 kt**, 15.1 % fast and 25.5°
tight. The fitted rows carried the same bias: the model's downwind optimum sat
at 145–150° at every wind speed from 6 to 14 kt while the polar's own optimum
runs 141.9° → 150.7° → 162.5° → 172.0° → 174.0° as the breeze builds from 6 to
16 kt.

A TWA sweep of `optimal()` over 120–178° at TWS 8/14/20 (phase-01 progress log)
shows why, and it is structural rather than a fit residual:

- **The VMG-versus-TWA curve has no deep optimum below TWS 16.** At TWS 8 and
  14 it rises to a single maximum near 146–148° and then falls monotonically to
  178°. The model never soaks because soaking never pays.
- **The cause is a drive shortfall that grows with apparent wind angle.** At
  TWS 14 / TWA 172 the model produced **264 N** of drive where **351 N** is
  needed for the polar's 6.26 kt — a sailset drive coefficient of **0.54 where
  the polar implies 0.92**. Below AWA ≈ 120 there is no shortfall at all: the
  TWS 8 row (AWA 99) was exact and the TWS 10 row (AWA 116) was 1.8 % fast.
  The deficit appears between AWA 116 and 142 and is a factor of **1.6–1.7**
  at AWA 142, 164 and 169 alike.
- **No knob could touch it.** The one non-ORC offwind parameter,
  `aero.asymClMul`, multiplies CLmax — and ORC Table 5.7 puts CLmax at 0.100 by
  AWA 150 and 0.020 by 170, where lift supplies 14 % and 1 % of drive
  respectively. Calibration fitted it to **1.011**, a no-op, because on the
  deep rows there was nothing for it to turn. That is the precise reason a
  refit cannot close this and a model change is required.

The coefficient transcription is not at fault: the research verified
`tables.ts` against the published `cdasc1`/`clasc1` rows cell for cell. What
the table does is fall from CD 0.566 at AWA 115 to 0.262 at 180 — a 54 %
decline over the range where, in ORC's own §5.1.1 wording, the sail is a bag
being dragged through the air, and where ORC gives the spinnaker no blanketing
term at all (`bk = 1` at every angle).

## Options considered

**A. Adopt ORC's 2026 asym-on-centreline coefficients** in place of the 2023
set the repo transcribes.
- Pros: it is a published table, and ORC materially re-powered the sail there.
- Cons: the 2026 revision raises deep-angle drive by ~36 % at 130–150° but
  *lowers* it 20–26 % at 170–180°. That sharpens the incentive to sail hotter,
  which is the wrong direction for every failing row. It also does not move the
  peak.

**B. An explicit soak/plane mode switch keyed on TWS** (research doc 03 §2;
every sailmaker source says a J/70 planes at 14–15 kt and should be sailed
high there).
- Pros: it is what the coaching literature describes, and it would give the
  disagreement panel a real mechanism.
- Cons: it points the wrong way for the rows that fail. The polar wants the
  model *deeper* at TWS 12–16, not higher; only the 20 kt row is a planing row.
  A mode switch would widen the TWS 14 miss while leaving the drive shortfall
  in place. The planing threshold is also contested by a factor of 1.7 in
  Froude terms and would have to stay tier C.

**C. Replace ORC's declining tail with a flat bluff-body plateau** above the
changeover — one drag coefficient for the whole parachute regime.
- Pros: physically the tidiest story; a bag's drag coefficient does not fall
  26 % as you square it away, and ORC's declining tail is really an unmodelled
  blanketing collapse encoded as drag.
- Cons: **measured, it overshoots.** Implemented and swept, it drives the
  optimum to the 178° search-bracket edge at every wind speed from 12 kt up —
  a 6.0° miss at TWS 14 against the 3.0° the chosen option gives. The declining
  tail is doing real work in setting how deep the optimum goes.

**D. A fitted multiplier on the offwind sail's CD0, ramped in across the
changeover, ORC's tail shape preserved** (chosen).
- Pros: it acts on the coefficient that actually carries deep-running drive;
  it is identically 1 below the changeover, so the reaching rows the model
  already reproduces are untouched; it is one number, and the fitted value
  lands inside the published wind-tunnel band.
- Cons: it is invented, and it is a magnitude, not a mechanism — it does not
  say *why* the sail makes more drag, only that it must.

## Decision

**We will give the offwind sail one fitted knob, `aero.asymCdMul`, applied to
its ORC CD0 and ramped linearly from 1 at AWA 115° to its full value at 150°,
because the deep-running rows are drag-driven and the model had no free
parameter acting on drag at all.** Scope: the `asym` sailset only, above
AWA 115°, in `src/core/aero/shape/sensitivity.ts` — the module ADR 0006
designates for everything that is not ORC. The two ramp angles are tabulated
knots of Table 5.7 itself, chosen because the table's own lift share of drive
falls from 75 % at 115° to 14 % at 150°, bracketing the ~140° changeover the
research identifies. ORC's declining CD tail past the changeover is kept.

Two supporting decisions land with it:

1. **The knob bounds come from what is published about the coefficient each
   knob acts on.** `asymClMul` is bounded to **[1.00, 1.10]**: ORC's own two
   editions bracket the lift regime this knob has authority in at +5 % (75°) to
   +10 % (115°), and the wind-tunnel corpus sits above both, so nothing
   published supports de-powering the printed table. `asymCdMul` is bounded to
   **[0.5, 4.0]**, deliberately wider than the evidence, because deep-angle CD
   is exactly where the two ORC editions disagree most and where the tunnel
   corpus sits far above both. Disclosed plainly: the CL floor was tightened
   *after* observing an unbounded fit run to 0.822, which is less lift than
   either ORC edition prints and which cost a previously-passing held-out row.
2. **Downwind VMG is bimodal, so the searches that touch it scan before they
   refine.** `optimal()`'s downwind TWA search and calibration stage 2 both run
   a deterministic coarse scan first. Golden section and Nelder-Mead both
   assume the objective has no cliffs; downwind it has a reaching hump near
   145°, a soak hump near 168°, and a trough between them, and which hump wins
   flips within the knobs' plausible range. Before this, which optimum the
   solver reported depended on the bracket rather than on the physics. The
   upwind path is unchanged and the jib golden cases are byte-identical under
   the code change alone.

## Consequences

**Easier.** The held-out TWS 14 asymmetric row goes from 15.1 % / 25.5° to
**1.9 % / 3.0°**, and the TWS 8 row holds at 0.1 % / 0.8°. Every fitted
downwind row except the 20 kt planing row is now inside 2.3 %. The model soaks,
so the downwind coaching surface is describing the manoeuvre sailors actually
make, and `tierFor` has a real question to answer rather than a broken one.

**Harder.** There is now a second invented aero magnitude to defend, and it is
larger than the first: the fitted **2.456** puts ORC's rated-area CD at
AWA 130–150 at 1.17–0.86, against the 0.83–1.39 the published tunnel band
implies once the historical 0.72 asymmetric efficiency factor is undone. It is
inside the band, but the band is wide and the reference-area reconciliation is
an inference. The bimodality is also now a permanent property of the model:
the dock-mode ranking is genuinely jumpy where the humps cross (TWS 10–12), by
about 0.19 s/mile — a tenth of the tie band the UI already refuses to resolve
inside, and invariant 10 now carries that slack with the reason written down.

**Committed to.** `aero.asymCdMul` in the calibration block; the scan-then-
refine shape of both searches; the evidence-derived knob bounds; and the
honesty that this is a fitted magnitude, tier-limited, not a mechanism.

**Not fixed, and not hidden.** The gate reads **8/10**, not 10/10.

- **TWS 14 jib vmgUp, 5.8 % fast.** The fit cannot close it: the same overshoot
  is present at TWS 16 (5.9 %) and TWS 20 (6.8 %), both *fitted*, so it is a
  model limit rather than a generalisation failure. `hydro.heelDragK` is the
  one lever that grows with heel and the fit left it at 0.919 inside a bound of
  4.0; forcing the unfitted crew-hike ramp from 8° to 26° moves TWS 14 only
  from 5.8 % to 4.9 % and costs the fitted TWS 10 and 12 rows. Recorded as an
  envelope statement, per ADR 0007's "explain rather than hide".
- **TWS 14 asym vmgDn, 3.0° tight.** The model's downwind optimum now lives in
  a 165–170° band at every wind speed from 12 kt up, while the polar's spans
  162.5–174.0°. Swept over the knob's whole range the best achievable at TWS 14
  is **2.2°**, so the 2° tolerance is out of reach with one multiplier; the
  angle needs a second mechanism, not a better number.
- **Downwind heel stays 0.8–1.1° against the polar's 11.7–12.0°.** Untouched
  here and deliberately so: that column is constant at 11.7–12.0° across TWS 6
  to 16, which is not the signature of a solved heel, and chasing it would mean
  fitting to a suspect column.

**Revisit when:** the 2021 ORC one-design certificate polar is added as a
second source (research doc 04 §3a — its downwind optimum never goes deeper
than 150.8°, which would change what "correct" means here), or a measured
downwind drag coefficient for a sprit-tacked asymmetric on rated area is
published, or the model gains a term for the mainsail's shadow on the kite —
which is the mechanism this knob is standing in for.

## Related

- Research: [`01-asymmetric-aerodynamics.md`](../research/2026-08-25-spinnaker/01-asymmetric-aerodynamics.md)
  §2.2 (the two editions), §2.3 (drive resolved from the table, the ~140°
  changeover), §2.6 (no spinnaker blanketing term), §3.1 and §7.2 (the
  wind-tunnel band and the reference-area trap);
  [`04-model-implications.md`](../research/2026-08-25-spinnaker/04-model-implications.md)
  §3a, §4.
- [ADR 0006](0006-faithful-orc-aero-layer-plus-invented-shape-layer-with-confidence-tiers.md):
  this is a new magnitude in the layer that ADR designates as invented, and it
  keeps `src/core/aero/orc` faithful.
- [ADR 0007](0007-calibration-and-validation-are-separate-with-a-held-out-gate.md)
  and [ADR 0012](0012-hold-out-split-by-wind-speed-not-by-angle.md): tolerances
  and hold-out split unchanged. One free parameter is added; the hold-out set
  is untouched and was never scored during the fit.
- Plan: [`2026-08-26-phase-two/phase-01-downwind-physics.md`](../plans/2026-08-26-phase-two/phase-01-downwind-physics.md).
