# Phase 06: Phone performance

- **Status:** 🟢 Completed

## Goal

A mid-range phone opens Race in under two seconds on 4G, drags a slider at
60 fps, and leaves no WebGL context behind when it navigates away. Closes
the ux-03 P2 performance findings.

## Tasks

- [x] M-21: dispose WebGL contexts and the Race DOM tree on navigation; leak test in Playwright (context count before/after ×5 visits).
- [x] M-22: do not fetch three.js on phones where the hero is below the fold; plan view first, 3D on demand.
- [x] M-24: buffer reuse in `SailView3D` — update positions in place, no per-frame geometry rebuild.
- [x] M-25: `DEBOUNCE_MS` from 80 to the measured solve time + margin; instruments must not trail the slider.
- [x] M-20: phone first screen — collapse title/lede/chips so the hero and the first control are visible without scrolling.
- [x] Remaining ux-03 P2/P3 items triaged in the audit's `todo.md`: fixed, or deferred with a reason.
- [x] CI: phone-profile Lighthouse or `bundle_check` threshold for the phone entry path. *(Resolved as a Playwright gate rather than a new threshold — see the log.)*

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

- 2026-08-26 — phase started on `perf/phone`, off `main` at `b3d0e4a`.

- 2026-08-26 — **the five findings landed, each with a measured before/after.**
  Every number below is from `vite preview` in the pinned Playwright image on
  this machine, taken twice: once with the branch's changes and once with
  `src/ui/three/` restored to `HEAD`, so the pairs are the same harness on the
  same build.

  **M-21 — WebGL contexts and the detached Race tree.** Two changes.
  `SailView3D`'s cleanup now calls `renderer.forceContextLoss()` before
  `dispose()` — `dispose()` frees three's caches but leaves the GL context
  alive, and a live context pins its canvas, which pins the whole unmounted
  Race subtree. And `hasWebGL()` moved to a `<script module>` memo in
  `SailHero`, so the throwaway probe canvas is built once per page load rather
  than once per mount (the hero mounts twice per visit, both responsive
  layouts). The cleanup's hand-written material list was replaced by a
  `scene.traverse` that disposes geometry *and* material: the list had drifted
  and was missing the hull, deck and water materials and the `GridHelper`'s,
  and a traverse cannot go out of date.
  Measured over Race ↔ Dock ×5, counting `getContext('webgl*')` against
  `webglcontextlost`: **before**, contexts held 2 → 4 → 6 → 8 → 10 → **12**,
  none ever released. **After**, 2 → 2 → 2 → 2 → 2 → **2** (one taken and one
  released per visit; the memoised probe context is collected, so it can go to
  1). Chromium's ceiling is about sixteen, so the before was ~8 visits from
  eviction.

  **M-22 — the phone no longer downloads three.js it was not asked for.**
  The audit's premise had already half-moved: H-11 put the hero above the fold
  on the phone, so at 390×844 the hero rect is now `y 208–691` against an 844
  px viewport, not 372 px below it. An `IntersectionObserver` alone therefore
  fires immediately and saves nothing. Two changes instead:
  `SailHero`'s width-only `ResizeObserver` gate became an
  `IntersectionObserver` on the same slot (a `display: none` copy and an
  off-screen hero both fall out for free, and it latches rather than tracks —
  re-gating on scroll would rebuild the scene every time the hero left the
  viewport); and, with no stored preference, `(pointer: coarse), (max-width:
  719px)` opens on the **plan view**. Desktop is untouched, the choice
  persists, and the `3D` toggle is right above the picture.
  Measured at 390×844: `SailView3D-*.js` requests on first load **2 → 0**.
  First-load JS for a phone is **236.9 KB gzip → 97.6 KB gzip**, a 59 %
  reduction: 139.3 KB of renderer is no longer on the default route's critical
  path. On the audit's own 3G profile that chunk was 3.2 s of download
  competing with the solver for the same CPU. Desktop still fetches it on
  first load and still draws the canvas — asserted in the same spec.
  This does not need an ADR: ADR 0014 already names the 2D plan view as the
  designed state when 3D is not shown, and its Constraints say a 380 px phone
  must still work. Unwinding is the one predicate in `readHero()`.

  **M-24 — the hero reuses its buffers instead of rebuilding them.** Three
  changes, all in `SailView3D`. `setLines` gained `applySail`'s reuse path
  (write into the existing `position` array, `needsUpdate`, recompute the
  bounding sphere; reallocate only when the vertex count moves).
  `buildTelltales` got the same treatment across its six attributes — through
  a drag the ribbon count is fixed and only the roots and directions move. And
  the mast and boom tubes are rebuilt only when `r.mast` / `r.boom` actually
  differ from the points the current tube was built from: mast bend moves with
  the backstay and shroud turns, so on a mainsheet or jib drag both rebuilds
  were pure churn.
  Measured over a 20-step, ~1 s slider drag, patching `createBuffer` and
  `deleteBuffer`: **before 300 created / 300 destroyed; after 0 / 0.** (The
  audit measured 285/285 for the same drag on a laptop.) `bufferData` uploads
  remain — that is the in-place write doing its job.

  **M-25 — the numbers stop trailing the finger.** The worker round trip for
  `trimmed`, measured by wrapping `Worker.prototype.postMessage` and
  correlating ids across a 25-step drag, is a **1.4–2.0 ms median** (n = 36 per
  run, min 0.4, p90 8.8–11.9, one >100 ms outlier per run at worker cold
  start). `DEBOUNCE_MS` goes **80 → 20** — one frame plus margin for the p90,
  not the median. The eight-solve coach probe pass keeps the old 80 ms as a
  new `PROBE_DEBOUNCE_MS` and now runs on its own trailing timer, cancelled by
  the next `request()`: it answers "what should I move next", which is a
  question about a trim you have stopped changing, and without the split a
  one-second drag would post ~150 worker requests. Settle time after the last
  input drops from ~105 ms to ~25 ms, inside research §3 principle 7's ~100 ms.
  Two vitest cases cover it: one asserts the trimmed solve has landed and the
  probe burst has *not* at `DEBOUNCE_MS`, the other that a second move inside
  the probe window leaves exactly one probe burst rather than two.

  **M-20 — the phone first screen.** All CSS, all inside Race's
  `@media (max-width: 719px)` block, so ADR 0016's one-screen promise — a
  desktop promise — is untouched. The `h1` drops to `--text-lg` (the tab bar
  already names the route, in the accent colour, permanently on screen); the
  lede is hidden (a first-visit sentence that costs two lines on every visit
  after, with Drills one tab away); and the four *read-only* condition chips
  (TWA, sea state, crew, sail plan) are hidden, because each is a display of a
  value the Edit sheet beside them already sets, and TWA is drawn on the plan
  view anyway. What stays inline is what you touch: the point-of-sail row, the
  ±1 kt wind stepper, Edit, and the committed-forecast chip.
  Measured at 390×844, `scrollY: 0`: head **302 px → 176 px**; hero
  `302–786` → **`208–691`**; the sticky panel-tab strip `802–862` (below the
  fold, under the tab bar) → **`707–767`**, clear of it. The first screen is
  now title, chips, stepper, the whole picture with its TWA/AWA/heel readouts
  and draft/twist table, and the panel strip — no scrolling.

- 2026-08-26 — **ux-03 P3 lows closed, and the release-01 phone wordmark.**
  L-01 (`DrillCard`): the Due chip is suppressed at `attempts === 0`.
  `spacing.ts` is right that a never-practised drill is the most overdue thing
  there is and the featured drill depends on it, so the schedule is unchanged
  and only the chip moved — "Not attempted" already carries that state.
  L-02 (`PuffReplay`): the Lull/Shift chip outline goes to `--line-strong`,
  the one control boundary the earlier sweep missed.
  L-03 (`RigElevation`): the `dims` toggle moved out of the `<dl>` into a
  `.dims` flex wrapper that holds the list and the button, so the paint is
  identical and the definition list is a valid content model again.
  L-04 (`Log`): `margin-bottom: var(--space-4)` on the toolbar row.
  L-05 (`vite.config.ts`): `Kit-*.js` / `Kit-*.css` join `SailView3D-*` in
  `workbox.globIgnores`. Verified: `grep -c "Kit-" dist/sw.js` is **0**, down
  from a precache entry every PWA install paid 3.8 KB gzip for.
  release-01 **L-14**: the wordmark strip is `--surface`, which is also the
  card colour, so its `--line` top edge (1.28:1) was invisible and a sentence
  scrolling under it simply stopped mid-word — the app's own name reading as a
  rendering fault. `--line-strong` gives it the edge that makes the overlap
  legible as chrome. Nothing was ever unreachable: measured at 390×844 at the
  end of the scroll, `main` ends at 766 px and the sticky bar is back in flow
  from 766, so the last line always clears. What remains is the ordinary
  sticky-bar overlay every tab bar has.

- 2026-08-26 — **CI: no new threshold, and why.** The phase asked for a
  phone-profile Lighthouse run or a `bundle_check` threshold on the phone
  entry path. Neither is the cheap deterministic option here.
  `bundle_check.mjs` sums the chunks `index.html` names, which is the same set
  on both devices — a "phone entry" number would be the desktop number, and
  the thing that actually changed is *which* chunks a phone fetches at
  runtime. Lighthouse in CI adds a browser run and a score that moves with
  runner load. Instead the gate is an assertion in
  `tests/ui/phone-perf.spec.ts`: at 390 px, zero `SailView3D` requests on
  first load, and a request once the `3D` toggle is tapped. CI already runs
  the whole Playwright suite (`.github/workflows/ci.yml:57`) in the pinned
  image, so this costs one test and no workflow change. The same spec gates
  the context count and the buffer churn.
  `scripts/bundle_baseline.json` is deliberately **not** re-baselined: the
  first-load set measures 97,612 B against the committed 97,482 B, +130 B and
  well inside the 2,048 B tolerance. The reduction this phase earned is on the
  phone's *runtime* fetch, not the entry set, and it is recorded above rather
  than by moving a number the gate is meant to hold still.
  `FIRST_FRAME_BUDGET_MS` is untouched.

- 2026-08-26 — **gates green.** `make check` exits 0; `pnpm test:ui` 49/49
  passing, including the five new `phone-perf` cases and both 3D screenshot
  baselines unchanged (no regeneration needed, so the docker image was not
  required); `node scripts/bundle_check.mjs` OK. Phase marked 🟢.
