# Phase 04: Melges 24 — close what the sources allow

- **Status:** 🔵 Not started

## Goal

The Melges 24's gate improves from 7/10 as far as its sources permit, with
every remaining miss attributed (unfitted knob, polar spread, sail tag) and
every unset per-class knob either sourced or documented.

## Tasks

- [ ] One more sourcing pass for an M24 tuning guide and class crib sheet (Melges/North/Quantum/UK) — WebFetch with retrieval dates; if nothing public, record the attempt in the runbook's failure modes and stop.
- [ ] Fit the six unfitted rig/shape knobs against the polar alone where the polar constrains them (stage 2 only), leave the guide-dependent ones at the J/70 defaults with `kind: assumed` notes; re-run `SAILFLOW_BOAT=m24 pnpm calibrate/golden/validate`.
- [ ] Sail tag for the fixed-angle rows: derive from the ORC RMS `Area_*` columns per row if the feed carries them, else keep the sail-plan assignment and its note.
- [ ] `instruments.stripeIn*` for the M24 from its spreader geometry (class rules publish it); per-class heel-target gauge anchors from whatever source phase 04 finds, else the reference values with the fallback stated on screen.
- [ ] Drill templates for the M24 if a class crib sheet surfaces; otherwise the no-drills state stays and says why.
- [ ] `add-a-boat-class.md` bumped with whatever this phase learned.

## Verification

```bash
make check
SAILFLOW_BOAT=m24 pnpm validate
pnpm golden && git diff --exit-code validation/golden/j70
```

## Artifacts

Updated `data/boats/m24.json`, `calibration/` per-boat outputs, `validation/report-m24.md`, runbook.

## Progress log
