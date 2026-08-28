# Phase 03 — Route `sim` and the four-item nav

**Goal.** `#/sim` is the app's primary URL; `#/race` and `#/dock` still
resolve (ADR 0019 migration); the nav is Simulator · Log · Drills · More;
the screen title is "Simulator". No Dock content moves yet — that is phase
04; this phase makes the shell ready for it.

## Tasks

- [x] `router.svelte.ts` — `ROUTES` gains `sim`; `DEFAULT_ROUTE = 'sim'`;
  `parseHash` maps `race` → `sim` (params kept) and `dock` → `sim` with the
  Dock's forecast params carried under the existing `f=` key; tests.
- [x] `share.ts` — migration table entry: links written before this phase
  still parse; `buildHash` writes `sim`; tests. *(No entry and no version bump
  were needed — see the progress log.)*
- [x] `navItems.ts` — four items, `sim` icon = the Race triangle; tests.
- [x] `App.svelte` — route table; `Dock.svelte` still mounts behind a
  temporary `#/sim/dock` sub-route until phase 04 deletes it (so nothing is
  lost mid-plan).
- [x] `TopBar` title "Simulator"; README and `docs/initial-prompt.md`
  references updated; `CHANGELOG.md` entry. *(Tab title only — the `<h1>` is
  handed off, see the progress log.)*
- [x] Drills' "Open in Race" and Log's "Open in Dock" links point at `sim`.

## Verification

```sh
make check
pnpm test -- src/ui/router src/ui/share src/ui/components/navItems
```

Manual: paste a pre-phase `#/race?s=1&…` link → lands on `#/sim` with the
same trim; paste a `#/dock?f=…` link → `#/sim/dock` with the forecast.

## Artifacts

- Updated router, share, navItems + tests; CHANGELOG entry.

## Progress log

2026-08-28 — Built by Opus on `feat/sim-route`, in a worktree off `main`
(0ddfe17), alongside phase 01 on its own branch. Phase 01 owns
`src/ui/race/**`, `Race.svelte`, `DrillView.svelte`, `explain.ts` and
`app.css`; none of them are touched here.

- `router.svelte.ts`: `ROUTES` is now `sim · log · drills · more · kit`;
  `DEFAULT_ROUTE = 'sim'`; `TITLES.sim = 'Simulator'`. `race` and `dock` left
  `ROUTES` and became an `ALIASES` table, so `buildHash` can never write them
  again and the type checker found every caller that named one. `#/race?…` →
  `sim` with the query verbatim; `#/dock?…` → `sim` with `sub=dock`. The
  sub-path rides in `params.sub` and `buildHash` lifts it back out to the
  path, the same trick `drills` already used for `template`/`seed` — so
  `App.svelte`'s debounced writer preserves `#/sim/dock?…` for free. An alias
  no longer warns; an unknown slug still does, now naming the Simulator.
- **No share migration entry, and no version bump.** ADR 0019's table
  rewrites the *query*; this change moved the *route*. The groups, their
  order and their meaning are identical, so a v1 link decodes to the same
  state it always did and a v0 dot-separated link still goes through
  `MIGRATIONS[0]`. Spending a version number on an identity rewrite would
  burn the one number ADR 0019 says to save for a real break. Four tests in
  `share.test.ts` ("links written before the Simulator merge") assert the
  whole link — hash and query together — lands the same state, so the claim
  is held by the suite rather than by this paragraph.
- `navItems.ts`: four items, Simulator first, keeping the Race triangle.
- `App.svelte`: one `sim` branch with `params.sub === 'dock'` picking `Dock`
  and anything else falling through to the cockpit; `cockpit-wide` follows
  the cockpit rather than the route. `applyUrl` and the share writer now gate
  on `route === 'sim'`, so an old Dock link still lands its `d=`/`f=`.
- `log/logic.ts`: `entryShare` returns `sim` for every entry — one screen
  answers both now. `CopyLink`'s default route and Dock's own copy button
  follow. `telemetry.ts`: `view.race` + `view.dock` collapse to `view.sim`
  ("Simulator opened"); counts already in a device's IndexedDB blob under the
  old keys stop being read rather than being migrated — a usage counter is
  not worth a migration, and that is written next to the enum.
- Docs: CHANGELOG under Unreleased; README gains the `#/sim` sentence and its
  architecture line drops "dock"; `docs/initial-prompt.md` gets a one-line
  superseded note under "the app has two modes" rather than a rewrite — it is
  the original brief and stays a record. The "Dock mode"/"Race mode" prose and
  the screenshots are phase 05's task, not duplicated here.

**Handed to phase 04 (or whoever retitles the cockpit).**
`<TopBar title="Race" mode />` is on line 278 of `src/ui/screens/Race.svelte`,
which phase 01 owns this week, so the `<h1>` still reads "Race" while the
browser tab reads "Simulator". One-word change when that file is free.
Likewise `src/ui/race/panels/Rig.svelte:113` still links to `#/dock`; it works
through the alias and phase 04 deletes it with the panel.

**Gates.** `make check` green (77 files / 1275 tests). `pnpm test -- src/ui/router
src/ui/share src/ui/components/navItems` green. `pnpm test:ui` green, 69
passed, no snapshot re-baseline needed — the only PNG baselines are the 3D
hero and nothing in them moved. Two Playwright specs were updated for the new
names: `share.spec.ts` expects `#/sim?` in a copied link, and
`phone-perf.spec.ts` bounces off Log instead of Dock to unmount the hero.
Manual check against `pnpm dev --port 5198`, fresh browser context each time:
`#/race?s=1&boat=j70&tws=10&…&t=race` → `#/sim?` with the same query and
backstay 30 / mainsheet 60 / jib lead 5 as sent; `#/dock` → `#/sim/dock?…`
with the Dock screen mounted; `#/sim/dock` direct → same; `#/nope` → `#/sim`
with a console warning. Nav reads Simulator · Log · Drills · More; tab title
"Simulator · Sailflow".

