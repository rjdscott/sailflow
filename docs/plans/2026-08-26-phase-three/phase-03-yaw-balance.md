# Phase 03: Yaw balance in the core, rudder angle on the helm

- **Status:** 🔵 Not started

## Goal

`SolveResult` carries a yaw balance (aero centre of effort fore-aft vs the
hull's centre of lateral resistance) and a derived rudder angle with a tier,
and the Helm panel reads it — closing ux-excellence 06 / phase-two 02 task 5
with a number that has a source, or a tier C that says which input is missing.

## Tasks

- [ ] `BoatDefinition` gains what a yaw balance needs: sail CE fore-aft per sail (from the sail plan geometry already in `sailplan.ts`), keel/CLR position, rudder area and rudder-to-CLR arm. Source from class rules and certificates for J/70 and M24; `kind: assumed` with the formula where a class rule does not publish it. `validateBoat` covers the new fields.
- [ ] `src/core/solve/yaw.ts`: yaw moment from the aero side force at the combined CE vs hydro side force at the CLR; rudder angle from the moment over rudder lift slope × area × arm. Pure, deterministic, `prov:` on every literal; tier B when all inputs are published/derived, C otherwise (`tierFor` rule + tests).
- [ ] Invariants: helm load sign follows heel (weather helm grows with heel at fixed trim); moving the jib lead aft / easing main reduces weather helm; zero at zero side force.
- [ ] Worker protocol: additive field; golden corpus regenerated (values only, tier field for the new output).
- [ ] Helm panel: rudder-angle readout beside heel, with the explainer text that currently says there is no rudder angle replaced by the real one.
- [ ] ADR if the CE/CLR representation is a fork (lever-arm model vs ORC's own yaw treatment).

## Verification

```bash
make check
pnpm test:ui
pnpm validate   # unchanged — yaw is a readout, not a force in the equilibrium
```

## Artifacts

`src/core/solve/yaw.ts` + tests, boat-file rows with provenance, Helm panel readout, `ASSUMPTIONS.md` rows.

## Progress log
