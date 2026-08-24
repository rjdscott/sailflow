# Phase 03: Design system + app shell

- **Status:** 🔵 Not started

## Goal

Tokens, primitives, and a hash-routed 5-tab shell at 380 px in light and dark, built against a stub worker, so UI phases start the moment the solver lands.

## Tasks

- [ ] `src/ui/tokens.css` (sun-readable light, dark, type scale, spacing, 44 px targets) [S]
- [ ] Primitives: Slider (native range, purchase-derived step, readout, tick, lock), Readout, ConfidenceBadge, Toggle, BottomNav, Sheet, Toast [S]
- [ ] Shell: hash routes #/race #/dock #/log #/drills #/more, top bar (Simple/Advanced, lock, tier), #/kit dev route [S]
- [ ] Stub worker client returning fixed SolveResult [S]
- [ ] ADR 0011 (2D only Epic 1)

## Verification

```bash
make check
pnpm build && pnpm preview  # open /#/kit at 380px, both themes
```

## Artifacts

`src/ui/tokens.css`, `src/ui/components/*.svelte`, `src/ui/App.svelte` with routes

## Progress log

