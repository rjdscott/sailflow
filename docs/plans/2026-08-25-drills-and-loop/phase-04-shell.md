# Phase 04: Shell — onboarding, URLs, persistence, keyboard

## Goal

A stranger knows what Sailflow is in one line, any scenario has a URL,
sessions persist, and the desktop student has keys. Closes M-01, M-05,
M-10, M-12, M-13, M-14, M-22, M-25, M-26, L-01, L-03, L-04.

## Tasks

- [ ] One-line purpose lede on Race + About card first on More + `<meta name="description">`.
- [ ] Router v2: `#/race?tws=10&twa=42&sea=1&crew=300&set=jib&r=...` round-trips conditions + trim; `#/drills/<id>/<seed>`; Back returns to the list; per-route `<title>`; scroll reset.
- [ ] Persist conditions/trim/forecast in localStorage (try/catch).
- [ ] Keyboard: `[`/`]` nudge focused slider, `1–5` points of sail, `o` apply optimum, `?` help sheet.
- [ ] Readout explainers (tap a readout label), vocabulary pass ("Flat", "Height").
- [ ] Simple/Advanced moves to More (global), Race keeps a shortcut.
- [ ] Honesty links open in-app (bundled markdown) when offline.
- [ ] Printable tuning card (print stylesheet for Dock).
- [ ] `#/kit` dev-only; version + changelog in More; Toast replaces `confirm()`.

## Verification

```sh
make check
```

## Artifacts

- `src/ui/router.svelte.ts` v2 + tests, `CHANGELOG.md`.

## Progress log

_None yet._
