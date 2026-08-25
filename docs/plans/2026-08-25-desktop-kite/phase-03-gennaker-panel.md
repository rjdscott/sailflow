# Phase 03 — Gennaker panel

## Goal

Under the kite the Headsail slot is the Gennaker panel: kite sheet, tack
line, halyard, sprit, with the kite section stack and a luff-curl cue
beside them; the Helm panel loses its Kite section. Under the jib nothing
changes.

## Tasks

- [x] `src/ui/race/panels/Gennaker.svelte`: same `Panel` contract; controls `kiteSheet, tackLine, kiteHalyard, sprit` (`race.controls.down`), tier C badges, "direction only" note; visual = kite section stack + a `LuffCurl` cue (curling / flying / collapsed from `kite.ts`); instruments = none in Race, the kite's draft/twist cells in Analyse.
- [x] `Race.svelte`: render `Gennaker` in the `jib` grid area when `conditions.sailset === 'asym'`, else `Headsail`; panel id stays `headsail` so `j`, PanelTabs and the puff replay keep working (`panelControlsId('headsail')`).
- [x] `Helm.svelte`: remove the Kite section and the `race.downwind` checkbox (the panel swap replaces it); update `keys.ts`/help sheet copy if they mention it.
- [x] Coach line / verdict: under the kite the sentence names the kite sheet, not the jib.
- [x] Tests: store test that the panel swap follows `sailset`; Playwright: choosing Run shows the Gennaker heading and four kite sliders, `j` focuses the first; choosing Close-hauled restores Headsail.
- [x] Progress log.

## Verification

`make check`; `pnpm test:ui`.

## Artifacts

`src/ui/race/panels/Gennaker.svelte`, `src/ui/race/LuffCurl.svelte`, `src/ui/screens/Race.svelte`,
`src/ui/race/panels/Helm.svelte`, tests.

## Progress log

### 2026-08-25 — the Headsail slot carries whichever sail is up

`src/ui/race/panels/Gennaker.svelte` renders in the `jib` grid area under
`conditions.sailset === 'asym'`, `Headsail` otherwise. It keeps the *headsail*
ids — `headsail-title`, `panelControlsId('headsail')` — so `j`, `panelSection`,
the phone tab strip and `puffPlayer.litIndex('headsail')` never learn which
sail is up. The Race.svelte edit is the four-line `{#if}` and one import;
no layout CSS was touched.

**What the panel shows.** Four sliders through `ControlRow` with `tier="C"` and
no optimum bug — sheet first, then tack line, halyard, sprit, because the sheet
is the trim and the other three are set around it. Under them the direction-only
banner, which says what ADR 0017 says and *why*: ORC gives the spinnaker
`bk(β) = 1` at every angle and a sloop's mainsail factor of 1, so the VPP
carries no main-shadow term at all — which is exactly the mechanism the sprit
and the tack line exist to fight (research 01 §ORC, 04 §6 row 8). The panel says
that in one sentence rather than implying the sliders are inert for no reason.
The visual is `SailSectionStack sail="asym"` beside a new `LuffCurl.svelte`,
which reads `kiteGeometry(down, BARE_SPAR, tackSide(twa)).curl` — the same
tier-C threshold the 3D hero's limp luff ribbons and the plan view's dashed
outline read, computed the way `PlanView` computes it. Instruments: none in
Learn or Race; in Analyse the kite's ½ draft and ¾ twist off `result.shape.asym`,
tier C, passed as a prop rather than as a child snippet so the other two tiers
get a two-column panel instead of a three-column one with an empty rail.

**The mode line is the research, not decoration.** `src/ui/race/downwind.ts`
maps `race.mode` × TWS to one short playbook line plus a band caveat (doc 03
§2). The caveats are the findings: the plane line is withheld below 13 kt, the
tack-up rotation below 9 kt, wing-on-wing below 10 kt, and — the one that
matters — above 15 kt the curl cue is *withdrawn*, because "ease to the curl"
is a displacement technique and a trainer showing it as universal teaches the
wrong thing in breeze (doc 03 §3). Soaking shows the tack ease as the band the
corpus actually gives, 0–12 in across four J/70 sources, never a number (§4).

**Coach line.** `verdict.ts` gains `DOWNWIND_CUE`, "sail to the polar angle,
and sheet to the curl", as the *last* resort: an instrument cue still wins,
then the probe's own sentence, then this. It names the kite sheet because
downwind there is no jib up to name — and the store now skips `jibLead` in its
probes under `asym`, which also saves two solves an answer. The jib cue in
`cue()` could never fire there anyway: `instrumentsFor` omits `jibLeechStripe`
under the kite and `optimalTrim` already drops jib controls from its active
set, so this closes the gap rather than patching a symptom.

**Helm.** The Kite section, the `advanced && !kiteUp` "show" checkbox and
`race.downwind` are gone — grepped first, the flag had exactly one reader.
`SHORTCUTS` now says `j` reaches "the Headsail controls (Gennaker under the
kite)", and the phone's tab strip labels that tab **Kite** under `asym`, since a
tab reading "Jib" that scrolls to the Gennaker panel is a small lie.

**Tests.** `downwind.test.ts` holds the band logic and the copy's two claims.
`verdict.test.ts` holds the priority order and that the downwind line never says
"jib". `store.test.ts` gains the no-jib-probe invariant. Playwright: Run →
Gennaker heading, four named kite sliders, `j` on the first one, no Headsail
heading; Close-hauled → back. **No new store test for the swap itself**, and
that is deliberate rather than skipped: the repo has no component-test harness,
so the only vitest-shaped assertion available would be
`sailset === 'asym' ⇒ Gennaker`, which is the `{#if}` restated. What the swap
actually keys off is already held — `RaceStore.setPointOfSail` is asserted to
set `asym` for Run and `jib` for the reaches — and the swap itself is a real
browser assertion in Playwright.

**Gates.** `make check` green (docs-check, lint, typecheck, 1136 vitest across
72 files). `pnpm test:ui` 31/31, including both 3D screenshot baselines
byte-identical — the hero was not touched.

**Bundle.** `bundle_check` reported +3505 B against the committed baseline and
failed. Re-measured HEAD first, per the warning phase 02 left in
`bundle_baseline.json`: this branch's HEAD already builds at 127114 B, 1730 B
above the 125384 recorded, because phases 01 and 02 landed after that
measurement. **The change's own cost is +1775 B gzip**, inside the 2048 B
tolerance. Baseline raised to 128889 with that arithmetic in the history row.
Nothing crossed the lazy boundary: `three/kite.ts` was already in the entry for
the plan view, and `SailView3D` is unchanged at 138.8 KB gzip.

**Known, and left.** The Gennaker panel is the only way to the downwind
controls now, so under the jib they are unreachable — which is the owner's
decision and matches the sail that is up, but it does mean a dock-side "what
does the sprit do" needs a Run chip first. The Analyse cells read `shape.asym`,
which is a set of constants: `asymShape(boat)` takes only the boat, so they
are the same in every condition and trim (the AWA dependence doc 02 measures
is the available upgrade, per `flying.ts`'s note), and the explainer says so
rather than letting a live-looking number imply otherwise.
