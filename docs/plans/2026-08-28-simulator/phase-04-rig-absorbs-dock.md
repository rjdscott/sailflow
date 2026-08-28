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

- [ ] `panels/Rig.svelte` — forecast line, regret readout, two sheets,
  suggest + commit row, committed state, copy above.
- [ ] `dock/ForecastCard.svelte`, `RegretCard.svelte`, `SuggestButton.svelte`,
  `CommitButton.svelte` — reused as-is or trimmed; delete what the sheet
  makes redundant.
- [ ] `dock/store.svelte.ts` — drop its own sea/crew; read `conditions`.
  Tests updated.
- [ ] `RigPrintCard.svelte` from Dock's print card.
- [ ] Delete `screens/Dock.svelte`, the `#/sim/dock` sub-route, the Dock
  `TopBar` locked-chip; `router` test for the redirect updated.
- [ ] Tour card 2 final copy (phase 02 wrote the interim).
- [ ] Log's "Open in Dock" → opens `#/sim` with `f=` and scrolls to the Rig
  panel (`panelSection('rig')`).
- [ ] Playwright: commit → sliders disabled + `aria-disabled`; unlock →
  enabled; snapshot at 1440 and 390.

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

