# Shell and strategy

App-wide navigation, routing and persistence, then the product-strategy findings
that are about what to build next rather than what is wrong now.

<a id="m-01"></a>

### M-01 — No onboarding, no purpose statement, and the loop is not visible anywhere

**Evidence.** `grep -rniE "onboard|first[- ]run|welcome|tour|hasSeen|introSeen"
src/` returns zero matches; `src/ui/stores/settings.svelte.ts` persists only
`sailflow.mode` and `sailflow.theme`, so no first-run state exists.
`src/ui/router.svelte.ts:9` sets `DEFAULT_ROUTE: Route = 'race'`, and
`src/ui/components/navItems.ts:13-19` orders the tabs Race, Dock, Log, Drills,
More — the loop backwards, with Log (empty for everyone on day one,
`log-desktop-empty.jpg`) third and Drills, the only screen with a bounded guided
first task, fourth. `src/ui/components/TopBar.svelte:17` renders `<h1>{title}</h1>`
and every screen passes a screen name (`Race.svelte:206`, `More.svelte:16`), so
the product name is never the heading; `NavRail.svelte:6-30` and `BottomNav` are
nav buttons only, no wordmark. Race carries no purpose sentence, though the
pattern exists one screen away (`Drills.svelte:25-27`, `<p class="lede">Each drill
is a real condition with a deliberately wrong setup…`). `index.html` (13 lines)
has no `<meta name="description">`. The rig precondition is invisible: with
nothing committed, `race.syncDock(null)` falls back to `BASE_DOCK`
(`race/store.svelte.ts:29,185-187`) and the only signal is the string "not
committed, free to explore" at `ControlPanel.svelte:156-158`, in the last card of
the control stack — and in Simple mode, the default, nothing on the landing screen
mentions the Dock at all. The loop is four dead ends: `grep router.navigate` over
`src/` returns exactly one call outside the two nav components, `More.svelte:49`
("Open the log"). Dock never links to Race after committing, Race never links to
Dock or Log, Drills never links to Race, and Log entries are click-to-edit only
(`Log.svelte:283-299`) despite storing `dock` and optional `race` control sets.
Drill conditions are the same `Condition` shape Race consumes
(`src/lib/drills.ts:25` vs `conditions.svelte.ts:111-127`), so carrying one across
is a two-line call.

Three mitigations that cap this at M rather than H. `settings.svelte.ts:39`
defaults `mode` to `'simple'` and `ControlPanel.svelte:31,49` restricts Simple to
five controls, so a stranger sees five sliders, not the eleven in
`race-desktop-closehauled.jpg` (which shows the Advanced segment active — not
first-run state), plus an actionable coach line. `index.html:8` is
`<title>Sailflow</title>`, so the tab does name the product. And
`vite.config.ts:28` already sets the manifest `description: 'J/70 rig-tune and
sail-trim trainer'`.

**Impact.** Both personas bounce for different reasons: the Yachtmaster cannot
tell whether this is a toy or an instrument without finding the honesty paragraph
three taps away, and the phone beginner sees an unlabelled cockpit with no first
task. The C.9.5 commit-and-live-with-it mechanic — the thing that makes this not a
trim toy — is invisible until they go looking. The four-screen loop is presented
as four unrelated tabs, with nothing but tab adjacency saying they connect.

**Fix.** Reuse the existing `.lede` pattern from `Drills.svelte:25` for a one-line
purpose statement on Race; no localStorage flag and no dismiss state needed. Add
`<meta name="description">` to `index.html`, move the About card to the top of
More's primary column, and put a small wordmark at the top of `NavRail`. Reorder
the tabs to Dock, Race, Drills, Log, More to match the loop, and add a one-line
banner on Race when `!rigLock.lockedToday` — "No rig committed today — sailing the
base tune" with a button calling `router.navigate('dock')` — above the fold in
both modes. Then three one-line handoffs, each reusing existing stores: "Take this
condition to Race" on `DrillView`/`ScoreSheet` (`conditions.apply(drill.condition)`
+ `router.navigate('race')`), "Load this setup" on a Log entry, "Log today" on
Dock's committed card.

**Effort.** M.

**Lenses.** first-run, ia-navigation.

<a id="m-05"></a>

### M-05 — Nothing is addressable: no URL for a drill or a scenario, no persistence, static `<title>`

**Evidence.** `src/ui/router.svelte.ts:12` `parseHash` is
`hash.replace(/^#\/?/,'').split('?')[0].split('/')[0]` — it discards every segment
after the first and the whole query string — and `ROUTES` (`:6`) is six screens.
`navigate()` (`:31-33`) only ever writes `#/<route>`; nothing else in `src/`
touches `location` or `history`. Which drill is open lives only in `drills.current`
(`src/ui/drills/store.svelte.ts:37`); `open()` (`:48-51`) and `close()` (`:53-57`)
mutate it with no URL write, and `Drills.svelte:22-23` swaps list → `DrillView` on
that field, with `DrillView.svelte:47` the only exit. So platform Back never
returns to the list — it leaves the drill open and jumps to the previous tab —
and a refresh at `#/drills` lands on the list with the in-memory trim gone.
Condition and trim are not stored either: `conditions.svelte.ts` and
`race/store.svelte.ts` are plain `$state` with no `localStorage` access, and
`dock/store.svelte.ts:23` resets its forecast to hardcoded defaults, while the app
*does* persist which of three picture tabs was last open (`Race.svelte:109-132`),
plus mode, theme, the rig lock and drill bests. Route changes have no web
semantics: `index.html:8` is a static `<title>Sailflow</title>` and nothing
assigns `document.title`; `NavRail.svelte:8-12` and `BottomNav.svelte:8-12` render
each destination as `<button onclick={() => router.navigate(tab.route)}>`; and
`App.svelte:24-42` swaps the `<main>` subtree with no `tabindex="-1"`, no focus
call, no live region and no skip link (`app.css:212` defines `.sr-only` and
nothing uses it for one). The only comparison affordance in the app is one level
of undo (`race/store.svelte.ts:189-200`).

Bounds: "Back exits the site" is a property of the hash router on a first history
entry, not of opening a drill, and nothing is destroyed when Back leaves a drill —
`close()` is not called, so tapping Drills again restores it mid-trim. The
"← All drills" link is `--text-sm` (13 px) but carries `min-height: var(--hit-min)`
(44 px), so the tap target is compliant.

**Impact.** A coach cannot send "do this drill" as a link and a student cannot
bookmark one. The whole scenario a study session builds — 18 kt, chop, 300 kg,
eleven trimmed sliders — dies on any reload, and mobile Safari discards PWA tabs
routinely, so the phone persona loses it without doing anything; the first two
minutes of every evening session go on rebuilding it by hand, and Dock pays a
fresh multi-second scoring pass for a forecast it scored yesterday. Every history
entry and bookmark for six screens reads "Sailflow", buttons instead of anchors
kill middle-click and open-in-new-tab, and for a screen-reader or keyboard user
the page content changes with no announcement and focus stranded on the nav.

**Fix.** Extend `parseHash` to return `{ route, param }` with one optional
sub-segment (`#/drills/<id>`) and have `drills.open/close` navigate rather than
mutate — `parseHash` already splits on `/`, so this is a return-shape change plus
a lookup; the same segment later serves Log entry ids. Encode condition plus race
controls into the query (`#/race?c=…`, a short packed string, not raw JSON),
restore on load and update debounced, which buys bookmarkable scenarios, shareable
links and side-by-side compare in two windows. Persist `{condition, race, down}`
and `dock.forecast/setup` under one versioned key using the try/catch wrapper
already in `rigLock.svelte.ts:19-42`, validating on read with a fallback to
defaults. Render nav items as `<a href="#/{route}">` (keeps `aria-current`, gains
link semantics; `hashchange` still drives the router), set `document.title =
"<Screen> · Sailflow"` in `App.svelte`'s existing `$effect`, give `<main>`
`tabindex="-1"` and focus it on route change, and add one `.sr-only` skip link.

**Effort.** M.

**Lenses.** ia-navigation, desktop-study.

<a id="m-12"></a>

### M-12 — Simple/Advanced is a global mode rendered per screen, inert on two of five

**Evidence.** `src/ui/components/TopBar.svelte:23` renders `<Toggle />`
unconditionally, so every screen's header carries it. Neither `Log.svelte` nor
`More.svelte` reads `settings.mode` — grep finds `settings` in More only for
`theme` and in Log only inside the string "Race settings (optional)".
`more-desktop.jpg` and `phone-drills-log-more.jpg` show "Simple | Advanced" pinned
top-right of Log and More, while More's own Appearance card carries an
identically-styled `Segmented` for theme (`More.svelte:22-31`) and no mode row at
all.

**Impact.** The switch reads as a per-screen view control but is a persisted
global preference (`settings.svelte.ts:9,43-46`), so pressing it on Log or More
appears to do nothing and teaches the user it is decorative — right before they
reach Race, where it hides six of eleven sliders. On More the user sees two
identical segmented controls, one of which changes the page and one of which does
not, and a user hunting for "where do I turn on the advanced stuff" finds only
Appearance.

**Fix.** Make `TopBar`'s toggle opt-in via a prop and keep one instance on the
three screens the mode changes (Race, Dock, Drills); drop it from Log and More.
Add a mode row to More's settings card with a one-line description of what
Advanced adds.

**Effort.** S.

**Lenses.** ia-navigation.

<a id="m-13"></a>

### M-13 — No keyboard shortcuts, on a tool whose primary persona studies at a desktop (opportunity)

**Evidence.** Grep for key handlers across `src/` returns only component-local
ones: `Segmented.svelte:51` and `Tabs.svelte:46` (roving arrows),
`Slider.svelte:101-102` (Enter/Escape in the inline editor) and
`ConfidenceBadge.svelte:41-42` (Escape). There is no global handler in
`App.svelte`, no shortcut list and no hints on the actions a study session repeats:
the point-of-sail chips (`ConditionsStrip.svelte:29-39`), the ± wind stepper
(`:43-58`), Apply optimum / Back to my trim (`Race.svelte:167-173`), Check / Try
again / Next drill (`DrillView.svelte:157-164`, `ScoreSheet.svelte:60-61`).

**Impact.** A pre-regatta study session is "sweep the wind range at each point of
sail and watch what moves" — with no shortcuts that is a mouse round-trip per
knot, per angle, per apply. The desktop rail's only advantage over the phone is
width.

**Fix.** One `svelte:window` keydown handler in `App.svelte`, ignored when the
target is an input or a dialog is open: `1–5` route switching, `[`/`]` wind ±1 kt,
`←/→` point of sail, `a` apply optimum, `u` undo, `Enter` check in a drill, `?`
opening a Sheet listing them. About 30 lines and one help sheet.

**Effort.** M.

**Lenses.** ia-navigation.

<a id="m-14"></a>

### M-14 — Scroll position carries across tab switches

**Evidence.** `src/ui/router.svelte.ts:31-33` sets `location.hash` and nothing
else; `App.svelte:24-42` swaps the rendered screen with no `scrollTo` and no saved
offset per route. Because `#/drills` matches no element id, the browser leaves the
document scroll offset untouched across the change. The screens are long enough
for this to bite: Race on desktop runs well past the fold
(`race-desktop-closehauled.jpg` is cut off mid-slider column) and the Drills list
is ten cards in three tiered sections (`drills-desktop-list.jpg`).

**Impact.** Scroll to the bottom of Race's slider column, tap Drills, and the list
opens mid-Tier-2 with its heading and lede off-screen — the beginner sees a wall
of cards with no context, and on the phone it looks like the app dropped them
somewhere arbitrary. Returning to Log's entry list puts you at whatever offset the
previous screen had, not where you were reading.

**Fix.** In `App.svelte`, on `router.route` change, store the outgoing
`window.scrollY` in a per-route map and restore the incoming one
(`scrollTo({ top, behavior: 'instant' })`), defaulting to 0 on a first visit. One
`$effect`, one `Map`.

**Effort.** S.

**Lenses.** ia-navigation.

<a id="m-27"></a>

### M-27 — The polar hold-out gate FAILs and CI never notices (strategy)

**Evidence.** `validation/report.md` gate section: "**FAIL** — 21/25 gated rows
inside tolerance", worst residual 15.1 % boat speed and 25.5° VMG angle (TWS 14
asym vmgDn). The report header stamps commit `fac5333` while HEAD is `ee8e84e`, so
the committed report is already stale. `Makefile:41` keeps validation out of the
gate — `validate: ## Polar validation, local only (placeholder for later)` — while
`check: docs-check lint typecheck test`, and `.github/workflows/ci.yml` runs only
`make setup` + `make check`, so nothing on any push or PR re-runs the polar
harness. Decision log #17 records this as deliberate ("Gate runs locally … CI runs
invariants + golden").

**Impact.** The loudest claim in the product — "calibrated against the ORC polar
with held-out points", rendered verbatim on More's About card — is backed by an
artefact no automated step keeps honest. Any solver change can silently move a
passing row into FAIL, or push a FAIL row further out, and the first person to
find out is a reader of a markdown file nobody regenerates. It is also the
prerequisite for [H-02](01-drills.md#h-02)'s medal bands, which must be wider than
the held-out error to mean anything.

**Fix.** Add a CI job running `pnpm validate` that diffs the regenerated report
against the committed one row-by-row and fails on *regression* rather than on
absolute FAIL — the four current FAIL rows become a frozen, named baseline that
can only shrink. Publish the same per-row table in-app so a user can see which TWS
bands are gated-green before trusting a number in them.

**Effort.** M.

**Lenses.** strategy.

<a id="m-28"></a>

### M-28 — Downwind is the largest modelling deficit and it is where the coach emits noise (strategy)

**Evidence.** `validation/report.md`: asym vmgDn misses by 15.1 % boat speed and
25.5° angle at TWS 14 (held-out), 10.8 % / 13.8° at TWS 12, 9.0 % at TWS 20;
modelled downwind heel is 0.6–2.0° against a printed 11.7–12.0° at *every* TWS.
Its "Honest weaknesses" section: "The asymmetric is tier C for anything but speed
… no tack-line, sprit or rotation model" and "the 20 kt asymmetric row is a
planing row and this is a displacement model". `race-desktop-run.jpg` shows the
consequence: at TWA 149° the coach reads "Ease backstay: +0.01 kt VMG, you are
giving away power up top" with HEEL 1° badged C — a recommendation at 1/500th of
the displayed BSP precision. Only 1 of 10 drills is downwind
(`t3-10-asym-angle`), and it is one of the two inert drills in
[H-03](01-drills.md#h-03). The ux-excellence phase-03 log also records downwind
VMG-vs-TWA as multi-modal at 16 kt.

**Impact.** Half of every race is downwind, and on that half the app is a
confident-looking instrument with no discriminating power: it recommends moves
worth 0.01 kt, reports 1° of heel where the reference says 12°, and offers one
drill that cannot be played. The brief's cut order puts downwind first under time
pressure, which has effectively happened by default rather than by decision — and
the deficit is now permanent until funded.

**Fix.** Make downwind the next physics epic, scoped by the same hold-out gate: a
tack-line/sprit/rotation term for the asym, a downwind righting-moment path so
heel stops reading ~1°, and a `hydro.planingRelief` fit so the TWS 20 row is
in-range rather than declared out-of-range. Until that lands, suppress coach
recommendations whose predicted VMG gain is below the solver's own resolution
downwind, and say why.

**Effort.** L.

**Lenses.** strategy.

<a id="m-29"></a>

### M-29 — No in-app feedback path, so "this felt wrong" never reaches the owner (strategy)

**Evidence.** `src/ui/screens/More.svelte:10` defines exactly one outbound
constant, `const REPO = 'https://github.com/rjdscott/sailflow/blob/main'`, used
for three read-only markdown links (`more-desktop.jpg`). A grep across `src/` and
`index.html` for `feedback`, `issues/new` or any GitHub issue URL returns nothing.
There is no report affordance on Race, Dock, Drills or the disagreement panel.

**Impact.** The app's central claim is that it shows where the model and the
guides disagree and refuses to resolve it silently — but when a sailor who has
actually sailed the boat knows which side is right, there is no channel. The only
route is: notice the repo link, have a GitHub account, reconstruct the condition
from memory. Every correction from the exact expert user the product is built for
is lost, which is also the cheapest source of the calibration evidence
`ASSUMPTIONS.md` says does not exist.

**Fix.** One "This felt wrong" link per solving screen, pointing at
`https://github.com/rjdscott/sailflow/issues/new` with title and body pre-filled
by URL-encoding the current condition, dock tune, race controls, tier badges and
`VITE_APP_VERSION` (which needs [L-04](03-log-more.md#l-04) to be diagnostic). No
backend, no upload, no PII — the user sees the whole payload in the GitHub compose
box before submitting, which fits the "nothing is uploaded" promise already
printed on More.

**Effort.** S.

**Lenses.** strategy.

<a id="m-30"></a>

### M-30 — Zero usage instrumentation, so every prioritisation decision is an audit guess (strategy)

**Evidence.** No analytics of any kind: grep across `src/` and `index.html` for
`analytics`, `telemetry`, `plausible`, `umami` returns nothing. The only stored
behavioural signal is the drill best-score map (`src/lib/drills.ts:157`).
`More.svelte`'s Data card states "IndexedDB, on this device only. Nothing is
uploaded." Two whole audits and 38 merged PRs of remediation have been driven
entirely by expert inspection, with no measurement of what anyone actually did.

**Impact.** There is no way to know which drills are opened and abandoned, which
of the eleven race controls are never dragged, whether Simple mode is ever used,
or where the phone persona drops out — so the roadmap keeps being set by whichever
lens an auditor happened to run. That is the most expensive way to choose work,
and it gets worse as surface area grows.

**Fix.** Privacy-preserving and local-first, or not at all: a local-only counter
store using the existing try/catch localStorage pattern, surfaced *to the user*
rather than to a server — a "your practice" panel on Drills (attempts, medals,
controls never moved) and the same object included in the log's JSON export. It
stays inside the no-upload promise, it is engagement content in its own right, and
a user filing an issue under [M-29](#m-29) can voluntarily paste it.

**Effort.** M.

**Lenses.** strategy.

<a id="l-01"></a>

### L-01 — The `#/kit` design-system scratch screen ships in production

**Evidence.** `src/ui/router.svelte.ts:6` lists `'kit'` in `ROUTES` and
`src/App.svelte:12,37-38` imports and renders `Kit.svelte`, so the 188-line
component is in the shipped bundle. `navItems.ts:13-19` has no entry for it and
`grep -rn "'kit'" src/` finds no link, so nothing in the UI reaches it — but
`https://rjdscott.github.io/sailflow/#/kit` does. The screen is component-demo
state (`Kit.svelte:15-17`) with invented numbers (5.2 kt, Draft 12.4 %, Twist 9°)
carrying no tier badge and no provenance, and `Kit.svelte:126-131` renders a live
second `BottomNav` and `NavRail` inside a demo card, so the page shows two sets of
navigation. Separately, `router.svelte.ts:13` maps any unrecognised slug to
`DEFAULT_ROUTE` with no message, and `router.test.ts:18-21` asserts that as
intended.

**Impact.** A shared or mistyped URL lands a visitor on a page of fabricated
numbers with no tiers, on a product whose stated position is that no number
appears without a provenance tag or an ASSUMPTIONS row; the duplicated nav makes
the app look broken. It is also dead weight in a bundle that must work offline on
a phone. And a stale deep link (`#/dril`) drops the user on Race with no
indication their link was wrong.

**Fix.** Gate the route and the import on `import.meta.env.DEV` so `kit` leaves
`ROUTES` and `Kit.svelte` tree-shakes out of the production build; unknown hashes
then fall through to `DEFAULT_ROUTE` as they already do. Add a one-line Toast on
the redirect ("That link didn't match a screen — showing Race") so it is visible.

**Effort.** S.

**Lenses.** first-run, ia-navigation.

<a id="l-05"></a>

### L-05 — A second class is blocked by eight hardcoded boat imports

**Evidence.** `grep -rn "boats/j70.json" src | grep -v test` returns eight
non-test import sites: `src/ui/race/RigElevation.svelte:2`,
`src/ui/race/ConditionsStrip.svelte:2`, `src/ui/race/store.svelte.ts:9`,
`src/ui/drills/DrillView.svelte:9`, `src/ui/race/boat.ts:14`,
`src/ui/dock/logic.ts:14`, `src/ui/solverClient.ts:8`, `src/lib/drills.ts:13`.
`docs/runbooks/add-a-boat-class.md` says so in its own preamble — "the boat
definition is not pluggable yet … imported by file path from seven places in
`src/` … Expect a real PR, not a five-minute edit" — and step 3 notes
`scripts/provenance.mjs` reads `data/boats/j70.json` by name, not a glob, so a
second boat is invisible to `make docs-check`. Decision log #13 committed to "one
BoatDefinition JSON per boat, no plugin abstraction".

**Impact.** The largest available reach lever — J/24, Melges 24, Etchells, all
with published tuning guides and ORC polars — is gated behind a mechanical
refactor whose price is proportional to screen count, and screen count grows every
block. Doing it after Epic 2 adds three-dimensional rendering and more drill
surfaces costs several times what it costs now.

**Fix.** One `src/lib/boat.ts` exporting the active `BoatDefinition` (a
module-level constant today, a store when a picker exists); repoint all eight
sites at it; glob the provenance script over `data/boats/*.json`. No plugin
system, no config — just remove the file-path coupling before it multiplies, and
the second class becomes a data PR as decision #13 intended.

**Effort.** M.

**Lenses.** strategy.
