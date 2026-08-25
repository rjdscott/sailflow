# Phase 04: Shell — onboarding, URLs, persistence, keyboard

## Goal

A stranger knows what Sailflow is in one line, any scenario has a URL,
sessions persist, and the desktop student has keys. Closes M-01, M-05,
M-10, M-12, M-13, M-14, M-22, M-25, M-26, L-01, L-03, L-04.

## Tasks

- [x] One-line purpose lede on Race + About card first on More + `<meta name="description">`.
- [x] Router v2: `#/race?tws=10&twa=42&sea=1&crew=300&set=jib&r=...` round-trips conditions + trim; `#/drills/<id>/<seed>`; Back returns to the list; per-route `<title>`; scroll reset.
- [x] Persist conditions/trim/forecast in localStorage (try/catch).
- [x] Keyboard: `[`/`]` nudge focused slider, `1–5` points of sail, `o` apply optimum, `?` help sheet.
- [x] Readout explainers (tap a readout label), vocabulary pass ("Flat", "Height").
- [x] Simple/Advanced moves to More (global), Race keeps a shortcut.
- [x] Honesty links open in-app (bundled markdown) when offline.
- [x] Printable tuning card (print stylesheet for Dock).
- [x] `#/kit` dev-only; version + changelog in More; Toast replaces `confirm()`.

## Verification

```sh
make check
```

## Artifacts

- `src/ui/router.svelte.ts` v2 + tests, `CHANGELOG.md`.

## Progress log

### 2026-08-25 — shell landed

`make check` green (754 tests, 0 svelte-check errors, prov-check clean) and
`pnpm build` verified: the Kit screen's invented numbers are gone from the
production bundle.

**Router v2** (`src/ui/router.svelte.ts` + `router.test.ts`).
`parseHash` now returns `{ screen, params }`; `buildHash` is its inverse, and
the drills path segments (`#/drills/<template>/<seed>`) are lifted into the
same flat `params` bag as a query string, so a consumer reads one shape
whichever form the link took. `Route`, `ROUTES` and `router.route` are
unchanged, so every existing caller still compiles. `navigate(route, params?)`
pushes a history entry — that is the hook the drills screen calls on open so
Back returns to the list — and `replaceParams` rewrites the query with
`history.replaceState`, which is what the debounced scenario writer uses so a
slider drag does not bury Back. Per-route `document.title` ("Race · Sailflow")
and `scrollTo({ top: 0 })` happen on the hashchange, not on a param rewrite.
`kit` is filtered out of the live route list unless `import.meta.env.DEV`, and
an unknown slug warns on the console before falling back to Race.

**Scenario + session** (`src/ui/scenario.ts` + test). Pure encode/decode of
condition and race trim, plus the `sailflow.session.v1` read/write, all
validated: a URL is user input, and a stored blob is a URL that was user input
yesterday. Every number is snapped onto its control's grid from
`data/boats/j70.json`, so a hostile link cannot hand the solver an off-grid
value. `r=` is a dot-joined string in a documented, append-only key order.
`App.svelte` restores storage first and then applies the URL over the top (a
link someone sent you beats what this browser was last doing), re-applies on
`hashchange`, and writes both sinks from one 400 ms debounced effect.

**Keyboard** (`src/ui/keys.ts` + test, `ShortcutsSheet.svelte`). The keystroke
→ intent mapping is pure and tested; Race holds the six-line switch that runs
it. `[`/`]` are not in it: they nudge whichever slider has focus and live in
`Slider.svelte`, the only thing that knows the step. A range input is
deliberately *not* a "typing target", so the bracket keys work where they are
needed and `1`–`5` do not fire mid-word in the log.

**Not done here, on purpose.**

- `track()` is wired for apply-optimum (Race) and rig commit (Dock). The
  `log.saved`, `drill.started` and `drill.checked` counters belong to files
  phases 02/03 own — one `track()` call each, in `Log.svelte`'s save handler
  and the drills store.
- Opening a drill must call `router.navigate('drills', { template, seed })`
  and the drills screen must read `router.params` for Back to work; the router
  side is done and tested, the store side is phase 01/02's.
- "Log this trim" fills the draft and navigates to Log; the Log screen still
  needs the user to press "New entry" to open the pre-filled form, because
  `openNew()` is local to `Log.svelte` (phase 03).
- Race's apply-optimum tween reads `prefersReducedMotion` from `svelte/motion`,
  which does not see the new `data-motion` override. One `settings.motion`
  read in that `duration` callback closes it.
- M-26 (say what Apply optimum moved) is listed in this phase's goal but was
  delivered elsewhere; M-05's link semantics for the nav (`<a href>` instead of
  `<button>`) were not, and are still open.
