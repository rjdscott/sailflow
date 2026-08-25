# Phase 06: Content and comparison

## Goal

What the benchmark tools teach and Sailflow does not yet: a helm-balance
readout, an A/B trim comparison, a picture of how to measure shroud turns,
and control explainers with a diagram. Closes M-12, M-18, M-19, M-20, M-23,
L-01, L-03. Lowest priority; may be deferred behind Epic 2 work.

## Tasks

- [ ] Helm/rudder-angle readout from the solver's yaw balance (tier B) (M-18).
- [ ] "Pin this trim" → ghost outline + delta readouts against the pinned
      state (M-19).
- [ ] Dock: shroud measurement illustration + "how to apply turns" sheet
      (M-20).
- [ ] Explainers: title, one diagram each, what-it-changes list (L-03).
- [ ] Simple mode: hide the sail-section table and the disagreement solve
      (M-12, M-23).
- [ ] Tests for the yaw-balance readout math.

## Verification

```sh
make check
```

## Artifacts

- New explainer assets under `src/ui/explain/`.

## Progress log

_None yet._
