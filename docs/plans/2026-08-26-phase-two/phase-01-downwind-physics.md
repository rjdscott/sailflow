# Phase 01: Downwind physics passes its own gate

- **Status:** 🔵 Not started

## Goal

`pnpm validate` reads PASS on all ten gated rows, with the downwind VMG rows
inside 3 % / 2° because the model sails the polar's gybe angle, not because
the tolerance moved. Downwind boat speed leaves tier B for A inside the
polar grid; the optimum downwind angle leaves tier C.

## Tasks

- [ ] Reproduce the miss in a test: TWS 14 `asym vmgDn` solves to 146.5° and 7.21 kt where the polar soaks to 172° at 6.26 kt (model fast and tight); write the failing invariant first.
- [ ] Diagnose: sweep `optimal()` over TWA 120–180 at TWS 8/14/20 and plot VMG; establish whether the VMG objective has no deep-soak optimum at all (aero over-rewards hot angles) or the optimum exists and the search misses it.
- [ ] ADR at the fork: ORC's own spinnaker aero coefficients and `flat` floor (research doc 04 §3a, `FLAT_MIN_SPINNAKER` 0.53 already in) versus an explicit soak/plane mode switch keyed on TWS (research doc 03 §2; planing threshold contested, keep tier C).
- [ ] Implement the chosen model in `src/core/aero/orc/`; every new literal `prov:`-tagged or in `ASSUMPTIONS.md`.
- [ ] Recalibrate (`pnpm calibrate`) on the ADR 0012 fit set only; hold-out untouched.
- [ ] Upwind TWS 14 residual (5.8 % / 1.8°): decide refit vs envelope statement; if the fit cannot close it, the report must name it as a known limit rather than widen tolerance.
- [ ] `tierFor`: downwind `bs` A inside the grid, optimum TWA B; demote rules updated with tests.
- [ ] Regenerate golden corpus; jib cases must be byte-identical unless the ADR says otherwise.
- [ ] `validation/report.md`, README "Known limitation" paragraph, `ASSUMPTIONS.md` weak-points section updated in the same PR.

## Verification

```bash
make check
pnpm validate            # exit 0, verdict PASS — 10/10
pnpm golden && git diff --stat validation/golden   # jib files unchanged
```

## Artifacts

New ADR under `docs/adr/`, updated `validation/report.md` with PASS,
`calibration/residuals.json`, golden corpus.

## Progress log
