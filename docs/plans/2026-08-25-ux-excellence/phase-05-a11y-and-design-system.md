# Phase 05: Accessibility and design system

## Goal

Every control works from a keyboard and a screen reader, every badge
explains itself on touch, and the palette stops using the interactive
colour for non-interactive things. Closes M-08, M-13, M-16, M-17, M-06,
L-02.

## Tasks

- [x] Slider readout: click/Enter opens the numeric editor; blur on empty
      restores the previous value (M-08).
- [x] Sliders expose unit, guide band and lock reason via
      `aria-valuetext` / `aria-describedby` (M-17).
- [x] Segmented control and picture tabs: roving tabindex, arrow keys (M-17).
- [x] `ConfidenceBadge`: tap/focus opens a popover with the tier meaning;
      neutral colour, not accent (M-13).
- [x] Padlock as an SVG icon using `currentColor` (M-16).
- [x] Guide deltas: neutral colour + a one-line legend (M-06).
- [x] Slider trough and chip border contrast ≥ 3:1 (L-02).
- [x] Tests: keyboard model of the segmented control; badge popover opens on
      Enter.

## Verification

```sh
make check
```

Manual: tab through Race with the keyboard only; VoiceOver/TalkBack pass on
one phone.

## Artifacts

- Updated `Slider.svelte`, `ConfidenceBadge.svelte`, `Segmented.svelte`.
- New `src/ui/components/logic.ts` (+ test), `LockIcon.svelte`, `Tabs.svelte`.

## Progress log

### 2026-08-25 — shared components, tokens (M-08, M-13, M-16, M-17, L-02)

Scope was `src/ui/components/**`, `src/ui/tokens.css`, `src/app.css` only;
`race/`, `dock/`, `disagree/` and `screens/` belong to other agents this phase.

**M-08 — slider readout.** `Slider.svelte` readout is now `onclick`-driven, so
Enter and Space work through the button's native click; the 500 ms long-press
stays. The editor is a `type="number"` input with `inputmode="decimal"` and
`min`/`max`/`step`, focused and selected on mount by a one-line action (it was
never focused before, so `blur` could never fire and `editing` could stick).
Escape cancels, Enter commits, and commit routes through `parseEdit()` in
`components/logic.ts`, which returns the previous value for an empty or
non-finite field instead of committing `Number('') === 0`.

**M-17 — sliders.** The range carries `aria-valuetext` from `valueText()`
("70 %, guide 60–75 %"), `aria-describedby` pointing at the hint and the lock
note, and `aria-disabled` instead of `disabled`, so a committed rig stays
focusable and readable (the `if (locked)` guard now also restores the DOM
value). The lock note is always rendered when locked and `.sr-only` until
tapped, so the reason is in the accessibility tree without a second copy of the
text; the lock toggle gained `aria-expanded`/`aria-controls` and reads "Why
{label} is locked".

**M-17 — composites.** `Segmented.svelte` gained roving tabindex and
Arrow/Home/End via `rovingIndex()`; selection follows focus, as `radiogroup`
implies. The Race sea-state and sail-set rows already use `Segmented`
(`ConditionsStrip.svelte:63,73`), so they inherit it — no separate markup to
fix. Log, More, Kit and the Dock forecast card use it too.

**Picture tabs.** `Race.svelte` is not ours, so the keyboard model went into a
new `components/Tabs.svelte`: it renders the tab strip only (styles copied from
`Race.svelte:200-223`, so it drops in unchanged) and leaves the panels with the
screen. Adoption in Race is a straight swap of the `<div class="tabs">…</div>`
block for
`<Tabs tabs={TABS} bind:selected={tab} ariaLabel="Pictures" idPrefix="pic" />`
— the existing panes already use `id="pic-pane-{i}"` /
`aria-labelledby="pic-tab-{i}"`, which is exactly what `Tabs` emits. The panes
themselves still need `tabindex="0"` so a keyboard user can scroll the drawing;
that is Race's to add.

**M-13 — confidence badge.** Now a `<button>` with `aria-expanded` that toggles
an absolutely-positioned card (no `<details>`), closed on Escape and on an
outside pointerdown. The same one-line tier note is the button's accessible
name, so the meaning is never hover-only. Copy lives in `TIER_NOTE`: A
"polar-derived number", B "direction and band, calibrated", C "direction only,
uncalibrated". Colours dropped `--accent`: A is filled `--muted` with `--ink`, B
is a `--line-strong` hairline, C is the same dashed. Target is 24×24 px, not 44:
the badge sits inline inside a label beside the readout, and a 44 px `.hit-44`
overlay would swallow presses meant for its neighbour.

**M-16 — padlock.** New `LockIcon.svelte`, a stroked 16 px `currentColor` path,
used by the slider's lock overlay (coloured `--ink-2`). Two emoji sites are
outside this agent's ownership and still say 🔒:
`src/ui/race/ControlPanel.svelte:123` and `src/ui/screens/Dock.svelte:53`. Both
are a drop-in `<LockIcon />` from `../components/LockIcon.svelte`.

**L-02 — contrast.** Measured with the WCAG 1.4.11 relative-luminance formula:

| token | value | vs `--surface` | vs `--bg` |
|-------|-------|----------------|-----------|
| `--muted` light, was `#cbd3de` | `#7d8794` | 1.37 → **3.31** | 3.64 |
| `--muted` dark, was `#2f3a47` | `#6b7686` | 1.51 → **3.80** | 4.17 |
| `--line-strong` light (new) | `#838d9b` | **3.05** | 3.36 |
| `--line-strong` dark (new) | `#5f6b7a` | **3.22** | 3.54 |

`--line` is unchanged and stays the decorative card hairline; `.chip` in
`app.css` now uses `--line-strong`. The audit's suggested `#9aa5b5` only reaches
2.26:1 against `--surface`, so it was darkened further. The "?" buttons named in
L-02 live in `ControlPanel.svelte` — `--line-strong` is there for that agent.

**M-06 skipped** — the guide-delta colour and legend live in
`src/ui/disagree/Panel.svelte`, owned by another agent this phase. Left
unticked.

**Tests.** `src/ui/components/logic.test.ts`, 14 cases: `rovingIndex` wrap /
Home / End / keys-it-doesn't-own / empty group; `parseEdit` snap, clamp,
restore-on-empty-or-garbage, deliberate zero; `valueText` band and single-tick
forms; `nextOpen` toggle vs dismiss; `TIER_NOTE` covers A/B/C. No
`@testing-library/svelte` in the tree and the vitest run has no DOM
environment, so the logic is pure and the components stay thin.

**Prop API.** All additions optional and backwards compatible: `Slider` gained
`guide?: [number, number]` (band for `aria-valuetext`; falls back to the
existing `tick` when absent) and `lockReason?: string` (defaults to "Committed
at the dock, rule C.9.5."). `Segmented` and `ConfidenceBadge` are unchanged.

`make check` green: docs, lint, svelte-check 0 errors 0 warnings, 634 tests.
- 2026-08-25 — Merged as PR #30. Emoji swaps in ControlPanel/Dock and Tabs adoption in Race handed to the phase-02 UI PR and the phase-03 latency PR; M-06 to the latency PR. Phase 🟢.

### 2026-08-25 — Race-side adoption, closed from phase 02

The three items phase 05 left for the owners of `race/` and `screens/`:

- **M-16.** `ControlPanel.svelte`'s 🔒 is now `<LockIcon />`, in an inline-flex
  `.locked-note`. `screens/Dock.svelte:53` is still emoji — a different agent's
  file this phase.
- **M-17 picture tabs.** `Race.svelte` swapped its local `<div class="tabs">`
  block and the matching CSS for
  `<Tabs tabs={TABS} bind:selected={tab} ariaLabel="Pictures" idPrefix="pic" />`,
  exactly the drop-in phase 05 described, and added `tabindex="0"` to all three
  panes so a keyboard user can scroll the drawings.
- **L-02.** The "?" buttons in `ControlPanel.svelte` use `--line-strong`.

M-06 is still open: it lives in `src/ui/disagree/Panel.svelte`.
