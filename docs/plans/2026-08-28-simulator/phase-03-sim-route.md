# Phase 03 — Route `sim` and the four-item nav

**Goal.** `#/sim` is the app's primary URL; `#/race` and `#/dock` still
resolve (ADR 0019 migration); the nav is Simulator · Log · Drills · More;
the screen title is "Simulator". No Dock content moves yet — that is phase
04; this phase makes the shell ready for it.

## Tasks

- [ ] `router.svelte.ts` — `ROUTES` gains `sim`; `DEFAULT_ROUTE = 'sim'`;
  `parseHash` maps `race` → `sim` (params kept) and `dock` → `sim` with the
  Dock's forecast params carried under the existing `f=` key; tests.
- [ ] `share.ts` — migration table entry: links written before this phase
  still parse; `buildHash` writes `sim`; tests.
- [ ] `navItems.ts` — four items, `sim` icon = the Race triangle; tests.
- [ ] `App.svelte` — route table; `Dock.svelte` still mounts behind a
  temporary `#/sim/dock` sub-route until phase 04 deletes it (so nothing is
  lost mid-plan).
- [ ] `TopBar` title "Simulator"; README and `docs/initial-prompt.md`
  references updated; `CHANGELOG.md` entry.
- [ ] Drills' "Open in Race" and Log's "Open in Dock" links point at `sim`.

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

