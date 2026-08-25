# Phase 01: Tokens v2 and cockpit primitives

## Goal

A dark-first instrument palette and the five primitives every panel is
built from, visible together on `#/kit`, with contrast enforced by a test
in both themes, before any screen changes.

## Tasks

- [x] `src/ui/tokens.css` v2: dark-first surfaces (#121212–#1E1E1E range, never pure black), text ≥ #E0E0E0, one accent hue, red/green reserved for telltale streaming/stalled, amber caution; light theme retained through the same token names; `--tier` attribute hooks. `tabular-nums` on the instrument container.
- [x] `scripts/contrast_check.mjs` (or vitest) — parses both token blocks, asserts 4.5:1 text and 3:1 non-text pairs (track, thumb, gauge stroke, focus ring on every surface). Wired into `make docs-check` or `pnpm test`.
- [x] `src/ui/instruments/gauges.ts` (pure): scale/band maths for bullet gauge (target bug, 3 single-hue ranges, reversed order for lower-is-better, symbol mode when scale does not start at zero), heel bands by TWS (8/12/14°, prov: North J/70 upwind tips), `pctOfTarget`. Tests.
- [x] `src/ui/instruments/history.ts` (pure): fixed-size ring buffer of solve samples keyed by condition; sparkline points; reset on condition change. Tests.
- [x] `src/ui/components/{InstrumentCell,BulletGauge,Sparkline,Panel,DensityToggle}.svelte`. InstrumentCell = label · value · unit · optional target bug · optional trend · tier badge · labelled delta ("Δ vs optimum"). Panel = header, `data-tier`, controls slot, visual slot, instrument column slot; `container-type: inline-size`.
- [x] `settings.mode` migration: `simple`→`learn`, `advanced`→`race`, new `analyse`; `Toggle`/`TopBar` switched to DensityToggle. Tests for migration.
- [x] `#/kit` renders every primitive in all three tiers and both themes.
- [x] Playwright (new dev dep, pinned image) layout smoke: kit page at 1280×720 and 1440×900 has no vertical scroll. CI job `ui-smoke`.

## Verification

```sh
make check
pnpm exec playwright test --project=chromium   # kit layout
```

## Artifacts

- `src/ui/tokens.css`, `scripts/contrast_check.mjs`, `src/ui/instruments/{gauges,history}.ts` + tests, five components, `tests/ui/kit.spec.ts`, `.github/workflows/ci.yml` (ui-smoke job).

## Progress log

- **2026-08-25 — tokens v2, primitives, density tiers, Playwright smoke landed.**
  Two Opus agents in worktrees (A: tokens/tiers/Playwright, B: instruments
  and components), merged with one trivial Kit.svelte overlap. `make check`
  green (927 tests); contrast gate (`scripts/contrast_check.mjs`, in
  `docs-check`) passes all 68 pairs in both palettes — light `--line-strong`,
  `--muted`, `--warn` darkened for the new `--surface-2`. Decisions: dark is
  the `:root` default with light as the override; `--bug` equals the accent
  (one-hue rule) but is its own token; `settings.mode` default is `race`,
  `simple`/`advanced` migrate on read; `KIT_ENABLED` opts Kit into a
  production build via `?kit=1` for the smoke; `heelBands` lo/hi = target
  ± 1.5° read off North's 14–17° big-breeze spread; `bulletBands` and
  `sparkPoints` exported beyond spec because they are branchy geometry.
  Pitfall: `pnpm test:ui` ran against a stale `dist/` and failed until
  `pnpm build` — script now builds first.
