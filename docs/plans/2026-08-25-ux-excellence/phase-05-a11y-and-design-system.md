# Phase 05: Accessibility and design system

## Goal

Every control works from a keyboard and a screen reader, every badge
explains itself on touch, and the palette stops using the interactive
colour for non-interactive things. Closes M-08, M-13, M-16, M-17, M-06,
L-02.

## Tasks

- [ ] Slider readout: click/Enter opens the numeric editor; blur on empty
      restores the previous value (M-08).
- [ ] Sliders expose unit, guide band and lock reason via
      `aria-valuetext` / `aria-describedby` (M-17).
- [ ] Segmented control and picture tabs: roving tabindex, arrow keys (M-17).
- [ ] `ConfidenceBadge`: tap/focus opens a popover with the tier meaning;
      neutral colour, not accent (M-13).
- [ ] Padlock as an SVG icon using `currentColor` (M-16).
- [ ] Guide deltas: neutral colour + a one-line legend (M-06).
- [ ] Slider trough and chip border contrast ≥ 3:1 (L-02).
- [ ] Tests: keyboard model of the segmented control; badge popover opens on
      Enter.

## Verification

```sh
make check
```

Manual: tab through Race with the keyboard only; VoiceOver/TalkBack pass on
one phone.

## Artifacts

- Updated `Slider.svelte`, `ConfidenceBadge.svelte`, `Segmented.svelte`.

## Progress log

_None yet._
