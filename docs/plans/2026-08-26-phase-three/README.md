# Phase three: the last physics between the J/70 and a PASS

- **Status:** 🔵 Not started

## Goal

`pnpm validate` reads PASS — 10/10 for the J/70 because the model sails the
polar's gybe angle, not because the tolerance moved; the one core output the
UI has been waiting on (a yaw balance) exists so the helm reads a rudder
angle; and the Melges 24 is as well-fitted as its sources allow, with every
gap named.

## Scope

Five phases, physics first. Phase 00 is diagnosis only and ends in an ADR;
nothing downstream starts until that fork is written down. Non-goals stay
those of the brief: multiplayer, race simulation, tactics, starts, accounts,
any backend. No tolerance is widened, no hold-out row is fitted, ever.

## Status

| NN | Phase | Status | Last update |
|----|-------|--------|-------------|
| 00 | [Downwind angle: find the second mechanism](phase-00-downwind-angle-diagnosis.md) | 🔵 Not started | none |
| 01 | [Downwind angle: implement it, pass the gate](phase-01-downwind-angle-mechanism.md) | 🔵 Not started | none |
| 02 | [Upwind speed plateau: envelope or fix](phase-02-upwind-plateau.md) | 🔵 Not started | none |
| 03 | [Yaw balance in the core, rudder angle on the helm](phase-03-yaw-balance.md) | 🔵 Not started | none |
| 04 | [Melges 24: close what the sources allow](phase-04-melges-fit.md) | 🔵 Not started | none |

Order: 00 → 01, then 02 ∥ 03 ∥ 04 (disjoint files: hydro / new core module / M24 data). Release v0.5.0 and a `release-02` audit close the plan, as phase-two's close-out did.

## Where the residual is, in numbers (from ADR 0018 and phase-two 01)

- TWS 14 `asym vmgDn`: model 6.38 kt at **169.0°**, polar 6.26 kt at **172.0°**
  — 1.9 % / **3.0°** against 3 % / 2°. The model's downwind optimum sits in a
  165–170° band at every TWS ≥ 12 while the polar's spans 162.5–174°. Swept
  over the parachute-drag knob's whole range the best reachable is 2.2°, so
  **one multiplier cannot do it**.
- Downwind heel: model 0.8–1.1° vs polar 11.7–12.0° — constant across TWS
  6–16, so not a solved column; not a fitting target.
- Downwind VMG is bimodal (reach hump ~145°, soak ~168°); the searches scan a
  grid before refining. Whatever phase 01 adds must keep that.
- TWS 14 `jib vmgUp`: 5.8 % fast, 1.7° wide; the same 5.9–6.8 % overshoot
  sits on the *fitted* 16 and 20 kt rows. `hydro.heelDragK` fitted to 0.919
  inside [0, 4]; the crew-hike ramp 8° → 26° buys 5.8 → 4.9 % and costs the
  fitted 10/12 kt rows.

## Candidate mechanisms for phase 00 to test (not decide here)

1. **Heel-coupled drive under the kite.** The polar heels 12° on a run; the
   model 1°. If the ORC spinnaker force model's heel terms (the 21.5° ceiling,
   the `sin(heel)` projection) are the missing coupling, the soak optimum
   moves with heel — but the polar's constant heel column is suspect (ADR
   0018), so this needs the 2021 ORC one-design certificate polar as a second
   source before it is trusted (research 2026-08-25-spinnaker doc 04 §3a).
2. **Twist function applicability under spinnaker.** ORC's effective-twist
   depower is applied to the offwind sail set as it is upwind; the source does
   not say it should be. Turning it off past the changeover changes the shape
   of the VMG curve, not just its height.
3. **Apparent-wind-angle–dependent parachute changeover.** The ramp is fixed at
   AWA 115–150°; the phase-two sweep tried four windows and rejected them on
   fit loss, but only with a fixed CL tail. Re-sweep with mechanism 2 in.
4. **A second polar source.** If the 2021 certificate's optimum never goes
   deeper than 150.8°, "correct" changes and so does the gate. That is an ADR
   0012 amendment, not a model change; phase 00 must say which it is.

## Critical files

`src/core/aero/orc/{forces,depower}.ts`, `src/core/aero/shape/sensitivity.ts`,
`src/core/hydro/{righting,resistance}.ts`, `src/core/solve/{optimal,equilibrium,instruments,tierFor}.ts`,
`calibration/fit.ts`, `validation/{compare,report,invariants.test}.ts`,
`data/boats/{j70,m24}.json`, `data/polar/`, `src/ui/race/panels/Helm.svelte`,
`src/ui/instruments/gauges.ts`.

## Top risks

1. **The polar itself is the disagreement.** Two ORC editions put the soak
   optimum 20° apart. Phase 00 may conclude the target, not the model, is
   what moves; that is an ADR, and the README's "known limitation" is
   rewritten either way.
2. **A second mechanism moves the jib rows.** Anything touching the ORC aero
   past the changeover must leave the jib golden corpus byte-identical; the
   gate for phase 01 says so.
3. **Yaw balance needs data the boat files lack.** CE fore-aft, CLR, rudder
   area and arm are not in either boat file. Phase 03 sources them from the
   class rules and certificates or ships tier C with the row that says why.
4. **Melges 24 sourcing.** Six knobs are unfitted for want of a guide; if no
   guide surfaces, phase 04 fits what the polar alone constrains and states
   the rest.

## Implements

- ADRs 0006, 0007, 0012, 0017, 0018, 0020. New ADRs expected at the phase 00
  fork (mechanism vs second source) and at phase 03 (where yaw data lives).
- Research: `docs/research/2026-08-25-spinnaker/` (doc 01 §2 aero, doc 04
  §3a, §4), `docs/plans/2026-08-26-phase-two/phase-01-downwind-physics.md`
  progress log (the sweeps already done — do not repeat them).
- Carries forward: phase-two 02 task 5 (rudder angle), phase-two 05 open
  items, `docs/audits/2026-08-26-release-01/todo.md` code items
  (M-11 drill "Tier" naming, M-17 `engines`/`packageManager`, L-08).
