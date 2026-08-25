# Phase 04 — Verify and close out

## Goal

Live walk of both features on Pages at the two target sizes; docs current.

## Tasks

- [x] Pages live-verified at 1920×1080 (one short scroll — doc 1539 px, hero ≥ 480 px; the "all on screen" target was retired, ADR 0016 amendment) and 1536×864 (primary controls in first viewport, one scroll to Rig); no internal scrollbars; kite drawn on Run and answering its sheet.
- [x] ux-03 `todo.md`: tick M-01 and M-04 with PR numbers.
- [x] `CHANGELOG.md` entry; runbooks touched if steps changed (none: no operational step changed).
- [x] Plan README state section; memory note.

## Verification

`make check`; `gh run list --workflow=pages.yml --limit 1`.

## Artifacts

Progress logs; CHANGELOG.

## Follow-ups

Post-plan work that belongs to this plan's surface but earns no new phase.

### Downwind mainsail ease (next-block item 1)

- 2026-08-25 — **Investigation, before coding.** Owner report: at 150° TWA
  under the kite the drawn boom sits at the upwind sheet mapping's angle and
  the optimum leaves the mainsheet where it was. Measured what the code
  actually does, over TWA 95–175° × TWS 5–20 kt, from both the base trim and
  the heavy-air preset:

  - `boomAngle(60, 0)` = 19.6°. That *is* the base trim's boom angle, and the
    mapping is right about it: boom angle is set by sheet length and traveller
    position, not by the wind. The picture is honest; the **trim** is upwind.
    Nothing in the app eases the main when you go downwind except the Downwind
    preset (mainsheet 20) — tapping "Broad reach" or "Run", or dragging TWA,
    carries a beat's mainsheet under the kite.
  - The solver is *not* insensitive to the mainsheet downwind, as assumed:
    `sheetingEffect` runs on the main at every AWA, and between 135° and 165°
    the descent already eases the sheet to 5–20 % (boom 60–87°), which is the
    right direction. But past ~165°, and at 165°/20 kt, it flips to
    **mainsheet 100 / vang 100 — boom 6°, pinned on the centreline on a dead
    run**, worth 0.006 kt. That is the real defect behind the report.
  - Root cause of the flip: the mainsheet's only route into a downwind solve
    is `sheetingEffect`'s multiplier on the main's **CLmax**, and past ~150°
    AWA the ORC main makes almost no lift (research `01` §2.6: no downwind
    blanketing anywhere in the model for a sloop; the deep-angle collapse is
    in the coefficient tables). The stall drag term is switched off past 90°
    AWA on purpose. So downwind the descent has no boom-angle gradient worth
    the name; what it is really climbing is **leech twist**, and it labels the
    result "mainsheet". A boom on the centreline under a kite is that
    mislabelling made visible.

- 2026-08-25 — **Decision, before coding.** Three things, and one deliberate
  non-change:

  1. **Do not make `boomAngle` a function of TWA.** Boom angle is sheet length
     and traveller, full stop; a wind term there would be invented physics in
     `src/core`, would double-count against `sheetingEffect` (which subtracts
     the sheeting angle from AWA to get angle of attack), and would put the
     drawn boom and the solved boom at different angles. Rejected.
  2. **`optimalTrim` says what it does not solve.** Under `sailset: 'asym'`
     the mainsheet leaves the active set and is reported in a new
     `OptimalTrimResult.notSolved`. `race.mainsheet` stays exactly where the
     sailor left it, so the reported `result` is still precisely the solve at
     the reported `race` and the "never worse than the start" invariant holds
     untouched. The UI draws **no optimum bug** on a not-solved row and says
     so in words instead — the upwind value is never presented as an answer.
  3. **The eased downwind mainsheet becomes boat data, not a UI preset.**
     `data/boats/j70.json` gains `baseRaceDown.mainsheet` = 15 (boom ≈ 67°,
     mid the 60–80° band). `prov: assumed`, from research `03` §2.1 (`T3`,
     "Mainsheet out past the corner of the boat, traveller centred") and §2.2
     (`T2`, "a small S turn in the battens around the shrouds" — the leech
     bearing on the leeward shroud). Tier C: a cue, not a solve. The Downwind
     preset and the point-of-sail chip both read it, so tapping "Broad reach"
     or "Run" from a beat eases the main and the drawn boom is right without
     waiting for a search.

  Only the mainsheet is prescribed. The traveller keeps its tick: it has a
  real gradient downwind, and the guides contradict each other on it (centred
  in light air `T3`, all the way down when planing `T5`), so the model's
  answer is worth more than a cue there.

  `src/core` change is the descent's active set and a reported field — no
  aero, no new number in the physics. `pnpm validate` is expected to be
  byte-identical; the hold-out gate is failing on `main` before this change
  (TWS 14 `jib vmgUp` 5.8 %, `asym vmgDn` 15.1 %, both pre-existing and
  recorded in `ASSUMPTIONS.md`) and must fail identically after.

- 2026-08-26 — **Done**, branch `fix/downwind-main-ease`. Shipped as decided,
  with two additions the investigation did not foresee:

  - The kite also goes up from a **scenario link** (`#/race?…&set=asym`), not
    only from a chip — and that is the URL the 3D baseline itself uses. So the
    "kite up ⇒ ease the main" rule is one method, `race.hoistKite()`, called
    from `setPointOfSail` on the jib→asym crossing and from `App.applyUrl`
    when a link names the kite but carries no `r=` trim of its own. A link
    that *does* carry trim is obeyed exactly, as before.
  - `data/boats/j70.json` grew `baseRaceDown` (one key), so the Downwind
    preset stops restating the number. Its `provenance` row regenerates
    `PROVENANCE.md` / `ASSUMPTIONS.md`.

  Gates: `make check` green (1150 passed, 3 skipped). `node
  scripts/bundle_check.mjs` OK — entry 134 853 B gzip, +810 B on baseline
  (the provenance note), limit 136 091 B. `pnpm validate`: every polar and
  dock number in `validation/report.md` byte-identical; only the timestamp and
  the boat geometry hash moved (`60104ed1` → `39464adf`, the extra JSON key;
  an earlier version of this entry recorded a hash that never existed).
  Hold-out gate still fails exactly as it did before the change — TWS 14
  `jib vmgUp` 5.8 % / 1.8°, `asym vmgDn` 15.1 % / 25.5° — both pre-existing
  and already described in `ASSUMPTIONS.md`. The golden corpus was **not**
  regenerated here, so from this PR it was skipped (`boatHash` mismatch →
  `it.skip`) — audit docs-consistency-01 H-03; fixed in its remediation.

  `pnpm test:ui` 31 passed. The kite baseline
  (`race-3d-kite-leeward-chromium-linux.png`) is regenerated in the pinned
  image: the boom swings 20° → 67° and 4.0 % of its pixels change (2.3 % past
  the colour threshold), which sat just inside `maxDiffPixelRatio: 0.03` and
  so passed *without* being regenerated — worth knowing, that tolerance would
  hide a boom this wrong. The jib baseline was reverted: regenerating it moved
  6 pixels of SwiftShader noise and no silhouette.

  Not done, deliberately: the traveller keeps its tick downwind (it has a real
  gradient and the guides contradict each other on it); `boomAngle` is
  untouched in both copies; no ADR — this decides nothing that would cost a
  day to unwind, and it is an application of ADR 0006's tiering and ADR 0017's
  "the solver has no calibrated downwind model, so the answer is a labelled
  tier-C cue" rather than a new fork.

## Progress log

- 2026-08-25 — Live walk of `1be7c2e` on Pages (headless Chromium, production URL): 1920×1080 doc 1539 px, hero 768×1112 with WebGL on, zero elements with an internal scroller; 1536×864 hero band 1416×480, first sail controls in the first viewport; Broad reach shows the Gennaker panel and the reworked kite from astern (luff bowed, leech straight at the time — it bulges since #80, clew inboard/aft). ux-03 M-01 and M-04 ticked (#70). Next-block list in the plan README state section (downwind main ease first).

## Follow-ups

- 2026-08-25 — ux-03 M-23 done (#78): the honesty markdown and the secondary screens left the first-load chunk. `PROVENANCE.md`, `ASSUMPTIONS.md` and `validation/report.md` are `await import('...?raw')` inside More's document sheet, and Log, Drills and More are `{#await import()}` in `App.svelte` the way Kit already was; Race and Dock stay static. First load 134066 → 92736 B gzip (−41330 B). `bundle_check.mjs` now sums every chunk `index.html` names — the split leaves four first-load chunks, not one — and `scripts/bundle_baseline.json` is lowered to match, which retires this plan's phase-05 note that its ASSUMPTIONS rows were riding in the entry. New `tests/ui/more.spec.ts` covers the three sheets; it caught a real bug on the way in (`$state` proxied the DOCS entry, so the `openDoc === doc` in-flight guard never matched and the sheet sat on "Loading…" — `$state.raw` now).
- 2026-08-26 — Owner (with a J/70 photo): "the top of the sail is not open enough, the leech is too closed at the top" when sheeting. Cause: the leech ran straight into the masthead, so every upper section's chord pointed inboard and easing the sheet could not open the head. Leech now bulges to leeward/forward on a profile peaking at ~63 % height, 0.4 m trimmed → 1.1 m eased, cloth length held at 8.8 m by solving the chord numerically; the loft's foot wedge below the clew is excluded from the leech-length test (it is foot, not leech). Sections at 33 knots. `ASSUMPTIONS.md` row added.
- 2026-08-26 — Audit docs-consistency-01 (#81) reviewed every doc surface against the code: 19 H / 36 M / 24 L. Remediation in #82 (code: report gate rows, validate exit code, golden fail-not-skip, `TACK_TRAVEL_M` 0.3, `LUFF_FORWARD_FRACTION` rename, `BASE_DOWN` into boat data, sheeting-equality test) and #83 (docs: ADR notes 0001–0017, plan statuses, README, CHANGELOG 0.2.0 cut, runbooks, ASSUMPTIONS/PROVENANCE bullets). Owner decisions left open in its `todo.md` P2.
- 2026-08-26 — #83 changed a provenance *note* in `data/boats/j70.json` and the boat hash moved (`ef59f52b` → `3e958aa9`), so the golden test failed on `main` exactly as #82 designed it to. Corpus regenerated (#84; results byte-identical). Follow-up: the hash should cover the numeric boat data only, not provenance prose — a note edit is not a geometry change.
- 2026-08-26 — Audit docs-consistency-01 P2 owner decisions settled (#85). Displayed numbers changed: `pctPolar` now takes the lower of its grid tier and its numerator's tier, so it reads B under the kite and drops the band when it is A (M-07); the dock regret is capped at tier B by design, because the lap time it sums includes a downwind leg the model does not fit (M-06). Kept as coded, with the reasoning recorded in ADR 0009: the pmf's 5 % floor is 5 % of the peak weight (M-05), and `T*(w)` still folds the scored setups in, which is what keeps regret non-negative and monotone (M-04). Documented rather than changed: the `--range-*` bullet-gauge bands are a decorative backdrop and stay outside the 3:1 gate, with ADR 0015's promise narrowed to `contrast_check.mjs`'s own list (M-11). Dropped: `validation/report.md`'s commit stamp, which could only ever name the pre-merge commit it was generated on (M-09). Fixed: the plan view samples `leechAt` and draws the same bulged leech as the 3D hero (M-25b). Golden corpus regenerated — tier and band lines only, no value moved; `pnpm validate` still FAIL — 8/10.
