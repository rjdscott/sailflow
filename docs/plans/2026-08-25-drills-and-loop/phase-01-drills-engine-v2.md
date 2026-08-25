# Phase 01: Drills engine v2

## Goal

Drills are generated from fault templates, validated against the model,
scored on distance to the optimum in control space plus loss, and remember
every attempt (ADR 0013).

## Tasks

- [x] Schema v2 in `src/lib/drills.ts`: `DrillTemplate { id, tier, title, brief, hint, controls: FaultSpec[], conditions: ConditionRange, objective }`, `FaultSpec { control, offsetSteps: [min,max] | 'random-sign' }`; `generateDrill(template, seed)` deterministic (seeded PRNG in `src/lib`, never `src/core`).
- [x] Validity: generated start must lose ≥ threshold vs `optimalTrim`; resample up to N; test.
- [x] Scoring v2: `distanceSteps` over free controls (legal-step L1), `lossPct`; medal by distance bands (0 / ≤2 / ≤5 steps, prov: assumed) with loss as tie-break; C-tier drills judged on distance only.
- [x] Attempt history in IndexedDB (`LogStore` pattern): `{ templateId, seed, at, distance, lossPct, hintUsed, ms }`; migration of `best` scores.
- [x] Spacing: SM-2-lite per template (ease, interval); `nextDue()` picks the drill; export/reset from More.
- [x] Convert the surviving hand-written drills into templates; keep their titles.
- [x] Tests for generator determinism, validity, scoring bands, SM-2 schedule.

## Verification

```sh
make check
```

## Artifacts

- `data/drills/j70-templates.json`, `src/lib/drills.ts` v2, `src/lib/spacing.ts` + tests.

## Progress log

- **2026-08-25 — engine v2 landed, `make check` green (775 tests).**

  **Shipped.** `src/lib/prng.ts` (mulberry32 + FNV-1a `hashSeed`, never in
  `src/core`); `src/lib/drills.ts` v2 (`DrillTemplate`, `generateDrill`,
  `generateDrillAsync`, `scoreDrill`, `distanceSteps`, `lossPct`,
  `guideNoteFor`, `optimalTwaDeg`); `src/lib/drillHistory.ts` (IndexedDB with
  a localStorage fallback, `sailflow.drills.v1` → v2 migration);
  `src/lib/spacing.ts` (SM-2-lite, `now` injected);
  `data/drills/j70-templates.json` (nine templates);
  `src/ui/drills/store.svelte.ts` rewritten around `open(template, seed?)`.

  **Schema deviations from the task line above**, all deliberate: faults live
  in `faults[]` (not `controls[]`) and carry `steps: [min,max]` plus an
  optional `sign` rather than a `'random-sign'` sentinel — omitting `sign` is
  the random case, which is one fewer concept. Templates also carry `dock` and
  `base` (the trim faults are applied to, and the value every locked control
  sits at) and a `prov` string; the generator needs both and neither belongs
  in code. `conditions.twaDeg` accepts `'optimal'`, which resolves to the ORC
  Speed Guide's VMG-optimal angle at the sampled TWS
  (`data/polar/orc-j70.json`) — every committed template uses it, so no drill
  ships a hand-guessed beat angle.

  **The `fixed` option (H-01).** Filtering `TRIM_CONTROLS` client-side is not
  possible: `optimalTrim` descends over its own list. So `OptimalTrimOptions`
  and `OptimalTrimRequest` gained an additive `fixed?` — controls the descent
  holds at their incoming value — the worker passes it through, and three
  tests in `optimalTrim.test.ts` cover it (holds what it is given, moves
  nothing when given everything, ignores unknown names). No other change to
  `src/core` or `src/worker`.

  **What the physics forced on the template set.** Sweeping every free control
  from each candidate base showed the model is far flatter than the drill copy
  assumed: at 8–19 kt the whole backstay range is worth 2–6 % VMG, the vang
  0.3–1.4 %, the outhaul 0.1–5 %, the cunningham exactly 0, while the mainsheet
  (22–76 %), jib sheet (10–33 %) and traveller (5–24 %) carry everything. Worse,
  the *cheap* direction is over-flattening: the model's optimum at every
  condition tested is mainsheet ≈ 80, backstay 20–65 rising with wind,
  traveller +20 light to −25 at 20 kt, so cranking on backstay costs almost
  nothing while easing a sheet costs a lot. The first eight candidate
  templates, written as "over-trimmed" drills in the v1 spirit, produced start
  losses of 0.1–2.3 % — below the 3 % validity gate, i.e. unwinnable-by-being-
  unloseable, the exact H-02 defect in a new schema.

  Fix: every template's `base` is now the model's own `optimalTrim` answer at
  its condition and dock tune, and the faults push *away* from it — sheets
  eased, car dropped, backstay and outhaul over-applied. All nine now clear
  3 % on 7–8 of the first 8 seeds. The runbook records the method so the next
  author does not rediscover it.

  **Drills dropped or re-authored** (v1 → v2, nine templates, ≥ 8 as required):
  - `t3-12-halyards-draft` — **dropped**, replaced by `t2-12-car-and-lead`.
    Free controls were both halyards and the cunningham: VMG moved 0.00000 kt
    over the entire legal grid (H-03).
  - `t3-09-inhauler-pointing` — **re-authored** as `t3-09-fine-slot`. The
    inhauler moves the drawn entry angle only; the drill now runs on jib
    sheet, lead, mainsheet and traveller.
  - `t3-10-asym-angle` — **dropped**, no replacement. Its free controls were
    `kiteSheet` and `tackLine`, which never reach the shape function, and no
    gennaker control is in `TRIM_CONTROLS`, so no answer key can exist. The
    set is upwind-only until the shape layer reads the kite (the cut order
    puts downwind first anyway). Nothing is C-tier now.
  - `t1-flat-06-backstay` — **re-authored** as `t1-06-light-air-power`. The
    model cannot separate light-air backstay settings (H-04), so the drill
    would have taught a number the solver cannot support.
  - `t2-flat-14-depower` — **inverted** into `t2-14-over-depowered`: at 13–15 kt
    the model's optimum is a powered-up rig, so over-depowering is the fault.
  - `t2-chop-16-vang-outhaul` → `t2-16-flat-and-open`, `t1-chop-08-twist` →
    `t1-08-chop-jib`, `t2-10-jib-lead-aft` → `t2-10-slot`, `t3-18-bow-down` →
    `t3-18-whole-rig`: kept, with `cunningham` and `vang` dropped from every
    free list (both under the medal band) and faults resized.
  - `data/drills/j70-static.json` deleted; nothing else imported it.

  **Model vs guide (decision log row 32).** `guideNoteFor` looks up North then
  Quantum for the drill's TWS band and, where a guide publishes a setting for
  one of the free controls, returns a line naming the published value, the
  model's optimum and the fact that the grade is the model's. `DrillScore`
  carries it as `guideNote` and the score sheet renders it in the same warn
  strip as the C-tier caveat. The disagreement is shown, never resolved.

  **Scoring.** Medal = first band where distance ≤ (0 / 2 / 5 steps) *and*
  loss ≤ (1 / 3 / 6 %), so the shape decides the grade and a slow boat still
  cannot buy gold; matching or beating the key's objective is gold outright,
  because the key is a local optimum reached from the drill's own start and a
  learner can legitimately land outside it.

  **Not in this phase** (phase 02 owns the screens): ghost target ticks and
  the "show the optimum" button (M-16), the streak/daily-challenge surface
  (M-18), and the More-screen export/reset for the history — the store exposes
  `best`, `due` and `startLossPct` for all of it. `DrillView`, `ScoreSheet`,
  `DrillCard` and `Drills.svelte` got only the edits the new store API forced,
  plus the `<details>` hint gate (M-02) that makes `hintUsed` mean something
  and the stale-score marking (M-06).