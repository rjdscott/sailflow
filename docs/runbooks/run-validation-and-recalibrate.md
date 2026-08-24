# Run validation and recalibrate

## When to use

After any change under `src/core/`, `data/boats/j70.json`, or `data/polar/`;
before opening the PR. Also when a new polar or tuning-guide revision lands.

## Steps

1. Invariants and golden replay (these run in CI too):

   ```bash
   pnpm vitest run validation
   ```

2. The polar hold-out gate and the committed report (local only, ~40 s):

   ```bash
   pnpm validate
   git diff --stat validation/report.md
   ```

   The gate is ADR 0007 tolerances on ADR 0012's split (all rows at TWS 8
   and 14 held out). A FAIL is reported, not hidden; commit the report
   either way and explain a FAIL in the PR.

3. If the fit needs redoing (a knob or a data file changed):

   ```bash
   pnpm calibrate          # ~3–4 min, deterministic; writes data/boats/j70.json calibration block + calibration/residuals.json
   node scripts/provenance.mjs   # regenerates ASSUMPTIONS.md table
   pnpm golden             # regenerates validation/golden/*.json (hashes change)
   pnpm validate
   make check
   ```

4. Read `validation/report.md` "Model optimum vs North base settings" and
   "Honest weaknesses" before merging; if a row moved from ok to FAIL, say so
   in the phase progress log.

## Failure modes

- **2026-08-25** — first fit passed held-out VMG rows but missed every reaching
  row by 7–15 %: the fit set had no Fn 0.5–0.7 rows. Fixed by ADR 0012
  (split by wind speed). Symptom: good VMG, bad 60/90/120°.
- **2026-08-25** — stage-4 rig knobs ran to values that clamped the mainsail
  flat (`shape.bendToDraft` 1.78). `calibration/fit.ts` now bounds them and
  `shapeHeadroom()` throws if a bound binds. Symptom: backstay does nothing.
- **2026-08-25** — `optimal()` at a fixed 90° minimised speed (VMG objective
  with cos 90° ≈ 0). Fixed-angle solves now maximise boat speed. Symptom:
  every 90° row ~40 % slow.
- Golden replay skipping with "run pnpm golden": the boat or calibration hash
  changed; regenerate deliberately, never by accident.

- **Last verified:** 2026-08-25 against 4d50e8f
