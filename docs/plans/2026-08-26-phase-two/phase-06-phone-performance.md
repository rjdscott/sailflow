# Phase 06: Phone performance

- **Status:** 🔵 Not started

## Goal

A mid-range phone opens Race in under two seconds on 4G, drags a slider at
60 fps, and leaves no WebGL context behind when it navigates away. Closes
the ux-03 P2 performance findings.

## Tasks

- [ ] M-21: dispose WebGL contexts and the Race DOM tree on navigation; leak test in Playwright (context count before/after ×5 visits).
- [ ] M-22: do not fetch three.js on phones where the hero is below the fold; plan view first, 3D on demand.
- [ ] M-24: buffer reuse in `SailView3D` — update positions in place, no per-frame geometry rebuild.
- [ ] M-25: `DEBOUNCE_MS` from 80 to the measured solve time + margin; instruments must not trail the slider.
- [ ] M-20: phone first screen — collapse title/lede/chips so the hero and the first control are visible without scrolling.
- [ ] Remaining ux-03 P2/P3 items triaged in the audit's `todo.md`: fixed, or deferred with a reason.
- [ ] CI: phone-profile Lighthouse or `bundle_check` threshold for the phone entry path.

## Verification

```bash
make check
pnpm test:ui
node scripts/bundle_check.mjs
```

## Artifacts

Updated `tests/ui/*.spec.ts`, `scripts/bundle_baseline.json`, ticked
`docs/audits/2026-08-25-ux-03/todo.md`.

## Progress log
