# Phase 04 — Rig panel absorbs the Dock

**Goal.** Everything the Dock did is on the Simulator's Rig panel: the
forecast band (min / likely / max wind, sea, crew — the last two now read
from the conditions band, not duplicated), expected regret, `Suggest a
setup`, and `Commit for today`. `Dock.svelte` and the `#/sim/dock` sub-route
are deleted. ADR 0021 §Decision items 3–4.

## Rig panel layout (Race density)

```
RIG                                      ┌ rig elevation ┐
Forecast  8 – 16 kt · likely 12   [edit] │  (existing)   │
Expected regret  0.4 s/mi  B  [by wind ▸]│               │
Upper shrouds  ─────●─────  +3.0 turns ? └───────────────┘
Lower shrouds  ─────●─────  +2.0 turns ?   Bend 61 · Sag 19
Forestay       ●──────────   0 mm      ?   Rake 0 · Prebend 50
[Suggest a setup]   [Commit for today 🔒]
Not committed — free to explore. Once you leave the dock the class rule
freezes these; Commit greys them and stamps the log.
```

- Forecast `edit` opens a `Sheet` with the three wind sliders
  (`ForecastCard` content); sea and crew are the band's.
- `by wind ▸` opens the regret-by-wind-speed table (`RegretCard` content)
  and the model-vs-guides rows for the rig, in a `Sheet`.
- `Commit for today` = existing `CommitButton` logic; committed state greys
  the three sliders, shows `Committed 08:42 · Unlock`, and the band's
  `Committed: 8–16 kt` chip behaviour from `ConditionsStrip.takeForecast`
  moves to the forecast line ("Sail the likely wind").
- Print card: `Dock.svelte`'s `.print-card` becomes `RigPrintCard.svelte`
  rendered from the Rig panel's `Print` action.
- Learn density: forecast line + regret + sliders only; suggest/commit
  under a `Setup` disclosure like the other panels.

## Tasks

- [x] `panels/Rig.svelte` — forecast line, regret readout, three sheets
  (wind, regret, gear chart), suggest + commit under `Setup`, committed
  state, copy above.
- [x] `dock/ForecastCard.svelte`, `RegretCard.svelte`, `SuggestButton.svelte`,
  `CommitButton.svelte` — trimmed to sheet/panel content; `RigSliders.svelte`
  deleted (`ControlRow` grew a `tick`/`hint` pass-through instead).
- [x] `dock/store.svelte.ts` — drops its own sea/crew and reads `conditions`;
  `wind` + a `forecast` getter. Tests updated.
- [x] `RigPrintCard.svelte` from Dock's print card, mounted by `Print`.
- [x] Delete `screens/Dock.svelte`, the `#/sim/dock` sub-route and `params.sub`,
  the Dock `TopBar` locked-chip; `router`, `share` and `dock` tests updated.
- [x] Tour card 2 final copy — recommended in the progress log; the file is
  phase 02's.
- [x] Log's "Open in Dock" → `#/sim` (phase 03 did the route); an old
  `#/dock?f=` link now scrolls to the Rig panel (`panelSection('rig')`).
- [x] Playwright: commit → `aria-disabled` + disabled steppers; reload → still
  committed; unlock → enabled; regret sheet; gear-chart sheet; layout at 1440
  and 390.

## Verification

```sh
make check
pnpm test -- src/ui/dock src/ui/race/panels
pnpm test:ui
```

Manual: 1440 — Suggest → top setup applied to sliders → sag and jib entry
change in the Headsail panel → BSP moves. Commit → greyed. Reload → still
greyed (rigLock persisted). 390 — Rig panel ≤ one viewport at Learn.

## Artifacts

- `src/ui/screens/Dock.svelte` deleted; `RigPrintCard.svelte` created;
  updated Rig panel and dock store tests.

## Progress log

### 2026-08-28 — the Rig panel absorbs the Dock

**Built.** `src/ui/race/panels/Rig.svelte` is the fourth sail system with the
whole of the Dock in it, in the sketch's order: forecast line
(`8 – 16 kt · likely 12`, `edit` → a `Sheet` of the three wind sliders,
`Sail the likely wind` → `conditions.twsKt`, shown only when the two differ);
an `InstrumentCell` expected-regret readout with its tier badge and
`by wind ▸` → a `Sheet` with `RegretCard` and the regret-by-wind table; the
three shroud/forestay controls as `ControlRow`s with the guide's published
turns as the track tick and its band in the hint; and a `Setup` disclosure
holding `Suggest a setup` (+ `Back to my rig`), `Commit for today`,
`Print tuning card`, `Gear chart` and the shroud-turn drawing.
`screens/Dock.svelte` (526 lines), `dock/RigSliders.svelte` (158) and the
`sim/dock` branch in `App.svelte` are gone; `RigPrintCard.svelte` is new and
mounted only by `Print`.

**The chain works** (1440, dev): uppers 0 → +3 turns moves prebend 50 → 56 mm,
headstay sag 19 → 16 mm on the Headsail panel, BSP 5.2 → 5.1 kt and VMG
3.85 → 3.80 kt — one screen, cause to effect. `Race.svelte`'s `syncDock` feeds
`dock.setup` to the solver whenever the rig is not committed, which is what
makes that true.

**`Race.svelte` lines touched** (three, kept single-line so phase 01 merges
clean): the `import { dock }` line; `race.syncDock(… : dock.setup)` in place of
`… : null`; and `TopBar title="Simulator"`. The Dock "Committed" chip lives in
`ConditionsStrip.svelte`, which phase 01 deletes, so nothing was done to it
here.

**Sea state and crew** now have one home. `DockStore.wind` is the band;
`DockStore.forecast` is a getter that reads `conditions` for the other two, so
changing sea state on the instrument band re-scores the rig. `App.svelte` seeds
`conditions` from an old `#/dock?f=` link's sea/crew when the link does not name
them in its own right.

**Left out, deliberately.** The regret sheet does not repeat the
model-vs-guides rows: `Race.svelte` already renders that panel on the same
screen (compact, with its own full-table sheet), and a second copy would mean a
second `ModelOptimumStore` and double the worker traffic for the same numbers.
The Dock's per-slider "optimum at 8 kt / at 16 kt" chips went too — the regret
sheet's table is the same information, per wind speed, better laid out. The
phone commit bar's two-tap arming (`DockStore.arm/disarm/armed`,
`COMMIT_ARM_MS`) died with the bar; unlock keeps its two-tap.

**Gate not met: the Rig panel at Learn / 390 px is 1472 px, against the ≤ 844
budget.** Measured on `main` at 0885843 first: the panel was already **1323 px**
there, so the merge added ~150 px (the forecast line, the regret row, the guide
hints) to a panel that was 1.6 viewports before it. The cost at Learn is
`ControlRow`'s inline explainers — ~130 px per control, which is what the Learn
tier *is* (ADR 0015) — plus the 289 px rig elevation. At the race tier the panel
is 1005 px. Mainsail at Learn / 390 is 1808 px, so the Rig panel is not the
outlier the budget assumed. This is exactly ADR 0021's revisit trigger ("the Rig
panel's content at Learn density exceeds one phone viewport and the panel needs
to split again"); it wants a decision in phase 05, not a silent trim of the
teaching copy here.

**`Setup` is closed by default at every tier**, like Mainsail's and Headsail's.
Open at the race tier it put the cockpit at 2155 px against `race.spec`'s
1600 px one-short-scroll gate (ADR 0016) at 1920×1080. A first attempt bound
`open={settings.mode === 'analyse'}` — don't: a reactive `open` on `<details>`
is re-applied on the next render and snaps the disclosure shut a second after
the reader opens it (caught by `onboarding.spec`, reproduced by hand).

**Tour card 2, recommended copy** (`onboarding/steps.ts` is phase 02's — the
card that replaces "Dock, then Race"):

> **One screen, one rig.** Everything is on the Simulator: the wind you are
> sailing in on the instrument band, and on the Rig panel the wind band you
> tuned for, the three turns, and what committing to one setup costs across the
> day. Turn a shroud and watch the headstay sag, the jib entry and the speed
> move with it.
>
> *Hint:* Commit for today freezes the three — class rule C.9.5(a) locks the
> standing rigging from leaving the dock until racing has finished.

**Gates.** `make check` green. `pnpm test` 1276 passed / 77 files. `pnpm test:ui`
73 passed. Screenshots at
`phase04-1440.png`, `phase04-390.png`, `phase04-committed.png`. The Learn/390
height gate is the one miss, above.

