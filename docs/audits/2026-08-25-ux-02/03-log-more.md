# Log and More

Findings on the tuning log and the settings screen. Log was out of scope for
ux-01 and for the ux-excellence plan
(`docs/plans/2026-08-25-ux-excellence/README.md:22`); nothing here is a
re-report.

<a id="h-05"></a>

### H-05 — The log entry form overflows horizontally at every breakpoint and opens as a wall of zeros

**Evidence — overflow.** `log-desktop-new-entry.jpg`: the Forecast row's third
field, "Max (kt)", is clipped at the right window edge and a document-level
horizontal scrollbar runs the full width of the viewport, under the nav rail too,
so it is the page scrollbar. `src/ui/screens/Log.svelte:460-463` is `.row {
display: flex; gap: var(--space-2) }` with no `flex-wrap`, no `flex-basis` and no
`min-width: 0`, holding three `NumberField`s (`:187-191`). `src/ui/log/NumberField.svelte`
renders a bare `<input type="number">` (`:19`) whose styles (`:31-39`) set
padding, min-height and border but no width, and `NumberField.svelte:17` is a
`<label class="field">` so Log's scoped `.field input` rule at `:445-451` cannot
reach it — visible in the screenshot, where Date and Venue show a hairline and
Min/Likely/Max do not. Flex items default to `min-width: auto` on a form control,
so each field floors at the input's ~20ch intrinsic width. Measured off the
screenshot: Min 866–1076, Likely 1086–1294, ~208 px each in a ~460 px card, so
~644 px is demanded. The two-field Actual row (~426 px) fits, exactly the
predicted boundary. The author already had the fix: `.row.wrap` at `:465-467`
sets `flex-wrap: wrap` and is applied only to the optional race grid (`:225`), so
the eleven race fields are fine and the two three-up rows — Forecast (`:187-191`)
and Dock setup (`:212-216`) — are not. Not desktop-only: below 1024 px the same
`editor()` snippet renders inside `Sheet.svelte` (`:43-44`, `max-width: 480px`,
`--space-4` padding, no `overflow-x` guard), giving ~350 px of content for ~544 px
of fields on a 390 px phone. The `<dialog>` UA `overflow: auto` means the row
scrolls sideways *inside* the sheet rather than breaking the page, so the third
field is off-screen until the sheet is scrolled sideways. Also in that file:
`NumberField.svelte:34` sets `border: 1px solid var(--surface)`, the same colour
as the card it sits on (`tokens.css:21`/`:65`), so the hairline is 1:1 contrast in
both themes, inconsistent with `Log.svelte:449`.

**Evidence — zeros.** `emptyEntry()` (`Log.svelte:33-49`) seeds `forecast {0,0,0}`,
`actual {0,0}`, `crewKg: 0`, `dock {0,0,0}`, matching the screenshot where all six
visible numeric inputs read `0`. `handleSave` (`:124-140`) validates none of them;
only `date` (`:178`) and `venue` (`:183`) carry `required`, and `NumberField`'s
`required` prop defaults false (`:7`) and is never passed, so a save of all zeros
succeeds. `toJson` (`src/lib/logExport.ts:9-11`) serialises whatever is stored and
import's `validateRow` only type-checks numbers, so 0 round-trips as genuine data.
The prefill path exists but fires only from a Dock commit
(`Dock.svelte:25-38` → `logStoreUi.setDraft`), and `closeEditor()` (`:118-122`)
destroys it on cancel — see [M-04](#m-04).

**Impact.** The brief makes the log a first-class feature and the phone the
primary device, and the flagship capture form is clipped on desktop and worse in
the phone sheet — the exact one-handed, wet-fingers context
(`docs/initial-prompt.md:104`) — while breaking the app's own layout contract
(`src/app.css:6`, "one column, 16 px gutters") on the one screen every other
screen respects. The zeros are worse than blanks: they look like data, they
survive `handleSave` unchallenged, and they export to JSON/CSV as a genuine 0 kt
forecast and a 0 kg crew, poisoning the one dataset the app promises to
accumulate over a season.

**Fix.** `.row { display: grid; grid-template-columns: repeat(auto-fit,
minmax(7rem, 1fr)); gap: var(--space-2) }` — `auto-fit` makes `.row.wrap` and its
one use redundant, delete both — plus `min-width: 0` on `.field` (grid items also
default to `min-width: auto`) and `width: 100%` on the input in `NumberField`. Set
that file's border to `var(--line)` while there. Seed the form from live state
rather than zeros — `conditions` for forecast, sea state and crew,
`rigLock.locked?.setup` for the dock row when no draft is present — and let a
field be genuinely empty (`value: null`), refusing save on a blank forecast.

**Effort.** S (layout) + M (prefill and validation).

**Lenses.** first-run, log-more, desktop-study.

<a id="h-06"></a>

### H-06 — The log editor shallow-copies the entry, so Cancel keeps the edits and a Dock draft writes into the committed rig

**Evidence.** `src/ui/screens/Log.svelte:111` `form = { ...entry }` and `:102`
`form = { ...emptyEntry(), ...logStoreUi.draft }` are one-level spreads. Svelte's
`proxy()` returns any value already carrying `STATE_SYMBOL` unchanged, so
`form.forecast`, `form.actual` and `form.dock` remain the identical child proxies
from `logStoreUi.entries` (`src/ui/log/store.svelte.ts:21`) and `logStoreUi.draft`
(`:22`). `bind:value` at `Log.svelte:188-190, 195-196, 213-215` writes straight
through, and `closeEditor()` (`:118-122`) only flips `editorOpen` — it reverts
nothing, and the list card has already re-rendered with the abandoned numbers
(`:294`, `windLine`). The Dock path holds by a longer chain than a skim suggests:
`DockStore.commit()` (`dock/store.svelte.ts:167`) does pass
`$state.snapshot(this.setup)`, so `dock.setup` is not aliased — but
`rigLock.commit()` (`stores/rigLock.svelte.ts:64-69`) stores that snapshot object
by reference under `$state.raw`, and `Dock.svelte:36` hands the same object to
`setDraft`, which spreads only one level (`log/store.svelte.ts:73`). So typing in
the log form's Upper/Lower/Forestay boxes mutates `rigLock.locked.setup`, and
`Race.svelte:33` `race.syncDock(rigLock.locked!.setup)` →
`race/store.svelte.ts:186` `Object.assign` copies it in on Race's next mount. Two
bounds: nothing corrupt reaches disk — both `LogStore` implementations
(`src/lib/logStore.ts`) return freshly deserialized objects from `list()` and
`rigLock.write()` serialized at commit time — and `App.svelte:27-32` routes with
`{#if}`, so returning to Log remounts and `onMount → load()` (`Log.svelte:91-93`)
rebuilds the list. Scope: only the three nested groups leak. `date`, `venue`,
`seaState`, `crewKg`, `notes` and `fast` are primitives on `form`'s own object and
Cancel does revert them, and `raceForm` (`:104,:113`) is a flat copy of numbers
and is safe.

**Impact.** Cancel does not cancel — and half-reverts, leaving a card mixing
reverted and abandoned values, which is worse than a clean failure. On the Dock
path, editing a log entry silently rewrites the rig the app believes was committed
under class rule C.9.5 — the one value both personas are told is frozen for the
day — and Race picks the mutated number up on its next mount.

**Fix.** One line at each site: `form = $state.snapshot(entry)` at `:111` and the
same around the draft merge at `:102`. `$state.snapshot()` already deep-clones, so
no `structuredClone` wrapper is needed.

**Effort.** S.

**Lenses.** log-more.

<a id="m-04"></a>

### M-04 — Dock's "starts a log entry" is a volatile in-memory draft nothing surfaces

**Evidence.** `src/ui/dock/CommitButton.svelte:48` and
`src/ui/screens/Dock.svelte:173` both print "Locks the rig for the day and starts
a log entry." `commit()` at `Dock.svelte:26-38` calls `dock.commit()` then
`logStoreUi.setDraft({...})` and returns — no navigation, no toast, no persisted
record (Toast is imported only in `Log.svelte` and `Kit.svelte`; Dock has none).
The draft is `draft: LogDraft = $state({})` on a module singleton
(`src/ui/log/store.svelte.ts:22,81`), never read from or written to storage; grep
for `setDraft|clearDraft|.draft` returns exactly three call sites —
`Dock.svelte:27` (write), `Log.svelte:102` (read, inside `openNew()`) and
`Log.svelte:121` (clear, inside `closeEditor()`, bound to Cancel at `:245`). The
Log empty state (`:277-279`, `log-desktop-empty.jpg`) reads "NO ENTRIES YET /
Record the wind, the rig you sailed and what was fast, while you still remember
it." and the desktop editor column says "Pick an entry to edit it, or start a new
one" (`:311`) — neither mentions a pending commit, and there is no badge on the
Log nav item. Inconsistent discard: the phone Sheet's own dismiss
(`bind:open={editorOpen}`) does not route through `closeEditor()`, so the draft
survives a sheet dismiss but not the Cancel button.

Bounds that matter for severity. Nothing is destroyed: `rigLock.commit()`
(`stores/rigLock.svelte.ts:64-69`) writes `{setup, forecast, committedAt}` to
`sailflow.rigLock.v1` and clears only on explicit `unlock()`, and the forecast the
draft copies is that same object (`Dock.svelte:29-36`). After a reload the
committed rig is still rendered on Dock's Committed card
(`CommitButton.svelte:28-33`). But nothing surfaces `rigLock.locked.forecast`
anywhere — every consumer reads `.setup` — and `dock.forecast` resets to its
hardcoded defaults (`dock/store.svelte.ts:23`), so the five forecast fields are
unreachable through the UI once the draft is dropped, short of unlocking the rig.

**Impact.** The one automated link in the Race → Dock → Log → Drills loop states a
promise that produces nothing durable, and no UI ever hints the draft exists. The
happy path (commit, go to Log, tap New entry, same session) works exactly as
advertised; a reload, tab discard or one tap on Cancel silently drops the prefill.

**Fix.** No new storage key is needed — `rigLock` already persists every field.
Seed `Log.svelte:102` from `rigLock.locked`, mapped the way `Dock.svelte:28-37`
maps it, when the draft is empty, and drop `clearDraft()` from the Cancel path.
Add a "Today's commit is waiting to be logged" card at the top of Log with a
one-tap Finish, and a Toast on commit that says the loop closed. Alternative with
fewer moving parts: on commit write a real `LogEntry` via `logStoreUi.add()` with
empty `notes`/`fast` and change the copy to "Locks the rig and files today's log
entry — finish it tonight".

**Effort.** S–M.

**Lenses.** ia-navigation, desktop-study, log-more.

<a id="m-07"></a>

### M-07 — A failed log read renders as "No entries yet" and a failed save says nothing

**Evidence.** `src/lib/logStore.ts:97-102` and `:107-114` reject on `onerror` and
`list/put/remove/clear` (`:154-172`) propagate. `Log.svelte:92` fires
`void logStoreUi.load();` and `:173` `void handleSave();`, discarding the
rejections, and `store.svelte.ts:26-31,34-44` have no try/catch.
`Log.svelte:276-280` renders the "No entries yet" card purely on
`entries.length === 0`. A grep for `catch|error|unhandledrejection|svelte:boundary`
across `Log.svelte` and the app shell returns nothing — there is no error state on
this screen at all. Three calibrations: eviction (the iOS case) deletes the data,
so an empty store returns `[]` successfully and the empty card is *correct*; only
a blocked or erroring `indexedDB.open` shows an empty log while data still exists.
A rejected `put` throws at `Log.svelte:136`, so `notify()` and `closeEditor()` at
`:137-139` never run and the modal stays open with the typed entry intact — that
is unexplained, not silent, and nothing is lost. The one genuinely silent-loss
path is the opposite implementation: `writeAll` (`logStore.ts:61-66`) swallows the
failure with a `console.warn`, so `localStorageLogStore.put` resolves, the toast
says "Entry saved", the editor closes and the entry is absent from the list. That
route is reachable only where `indexedDB` is undefined (`chooseLogStore`,
`:270-275`).

**Impact.** On a blocked store a sailor with a season of entries is shown an empty
log under the copy "Record the wind… while you still remember it". On the
localStorage fallback a save can report success and store nothing. Neither
failure has any surface.

**Fix.** Give `LogUiStore` an `error: string | null = $state(null)` set in a catch
around `load`/`add`/`update`/`remove` — all four writers route through it — render
it in place of the empty card, and `notify()` the failure on save instead of
closing the editor. Stop `writeAll` swallowing, or the localStorage branch stays
silent no matter what the UI does.

**Effort.** S.

**Lenses.** log-more.

<a id="m-08"></a>

### M-08 — The log's race and dock fields drop the units, ranges and steps the app already defines, and no path fills them

**Evidence.** `Log.svelte:19-31` hand-rolls a second control list
(`{ key: 'backstay', label: 'Backstay' }` …) and renders it at `:227` as
`<NumberField label={f.label} bind:value={raceForm[f.key]} />` — no `step`, no
`unit` — while `NumberField.svelte:2-14` has no `min`/`max` prop at all and
defaults `step = 0.1`, `unit = ''`. Sibling rows in the same form do carry units
(`:188-190` kt, `:208` kg step 1, `:213-215` turns/turns/mm), so the
inconsistency is visible inside one form. `data/boats/j70.json` defines every
bound — backstay 0–100 % step 5, traveller −100–100 % step 5, jibLead 0–10 holes
step 1, upperTurns −6–6 turns step 0.5, forestayMm 0–40 mm step 2 — already
exported as `CONTROLS` (`src/ui/race/store.svelte.ts:26`) and consumed by
`ControlPanel.svelte:80-90`. The hand-rolled table has already drifted:
`Log.svelte:215` uses `step={1}` for forestay where the spec says 2. Nothing
fills these fields either: the only writer of `logStoreUi.setDraft` in the app is
`Dock.svelte:27` and it passes `dock` only, so the eleven race values are always
hand-typed even though the live trim is sitting in `race.controls.race` as exactly
that `RaceControls` shape (`race/store.svelte.ts:138-142`). Nothing on Race
references `logStoreUi`. Blast radius is bounded: the section is opt-in behind an
`includeRace` checkbox in a `<details>` (`:218-231`), nothing reads `entry.race`
back into Race (the only consumers are `logExport.ts:80` type-checking and
`:123-133` CSV columns), and `openEdit` (`:109-116`) can load any entry back, so
nothing is permanent.

**Impact.** The Yachtmaster reading "Backstay 65 %" on Race meets a unitless
spinner stepping 0.1 with no bound here and cannot tell which number the log
wants; entries land with values that map onto no control. And the workflow that
turns a rehearsal into a record — "this is what was fast, save it" — requires
transcribing eleven values into a form on another screen, which nobody does twice.
The reverse trip does not exist either.

**Fix.** Delete `RACE_FIELDS` and drive both rows off `CONTROLS`, passing
`min`/`max`/`step`/`unit` through `NumberField` (add the two props and put them on
the `<input>`) — this net-deletes code and removes the drift; note native
`min`/`max` blocks submit, it does not clamp typed values. Then close the loop
with two buttons: "Save this trim to the log" on Race calling
`logStoreUi.setDraft({ race: $state.snapshot(race.controls.race), … })`, and
"Load into Race" on a log entry doing the inverse via `Object.assign` plus
`conditions.apply`. The types already line up.

**Effort.** M.

**Lenses.** log-more, desktop-study.

<a id="m-19"></a>

### M-19 — The log entry the daily ritual depends on starts from a blank 20-field form (opportunity)

**Evidence.** `Log.svelte:33-47` (`emptyEntry`) and `:49-64` (`emptyRace`) zero
every field — date aside, that is forecast min/likely/max, actual min/max, sea
state, crew kg, three dock values and eleven race controls, all typed by hand.
Meanwhile `sailflow.rigLock.v1` already persists `{ setup, committedAt, forecast }`
(`src/ui/stores/rigLock.svelte.ts:11-16`) and the Race store holds the trim
actually sailed. `log-desktop-empty.jpg` shows the empty state offering only a
blank "New entry" button (`Log.svelte:260`); there is no path from Dock or Race
into the log at all, since the only cross-screen navigation in the app is
`More.svelte:49`.

**Impact.** `docs/initial-prompt.md` calls the tuning log "a first-class feature…
this is where the app becomes useful beyond the simulator", and the plan's success
metric is use before every regatta day. The habit the whole product aims at is
gated behind a twenty-field form filled in on a phone, in sunlight, after racing —
the highest-friction moment available. Friction there, not missing features, is
what will keep the log empty.

**Fix.** `emptyEntry()` seeds `date`, `forecast` and `dock` from `rigLock.locked`
when it exists, and "New entry" offers `includeRace` checked and populated from
the current race controls, leaving the user to type only actual wind, sea state
and what was fast. Add a "Log this day" button on Dock beside the commit and on
Race. Both are reads of state that already exists in stores. Composes with
[M-04](#m-04) and [M-08](#m-08).

**Effort.** S.

**Lenses.** drills-engagement.

<a id="m-20"></a>

### M-20 — The log is write-only, and it records no outcome, so nothing closes the loop (opportunity)

**Evidence.** `Log.svelte:282-300` renders every entry as one flat `<ul>`; the only
ordering is `store.svelte.ts:26-31` `sort((a,b) => b.date - a.date)`. There is no
search input, no filter, no grouping, no venue index and no wind-band selector
anywhere in the file. `windLine` (`src/ui/format.ts:42-47`) picks actual *or*
forecast and shows one range — never both, never the delta, though the entry
stores both. Grepping `logStoreUi` across `src/` returns only `Log.svelte` and
`Dock.svelte:27` (a write); no screen loads a past entry back into Dock or Race.
`src/lib/logStore.ts:14-28` defines `LogEntry` as `{ date, venue, forecast, actual,
seaState, crewKg, dock, race?, notes, fast }` — no result field, no measured boat
speed, no snapshot of what the model predicted that day, and no record of the Dock
regret or the model-vs-guide divergence that was on screen at commit, which
`docs/initial-prompt.md:100` asks for explicitly ("Log every divergence to a local
history so patterns are visible over time").

**Impact.** The pre-regatta question both personas actually have — "what did I run
at this venue last time it blew 14–18?" — cannot be asked, and after a season the
log is a reverse-chronological wall of cards to be read linearly. Without an
outcome column it can never answer the question that would retire the disagreement
panel: did the model's tune actually beat the guide's tune? The brief's claim that
this is where the app becomes useful beyond the simulator does not hold while
nothing consumes the data.

**Fix.** In order: (1) one `<input type="search">` filtering venue and notes over
the already-in-memory array; (2) show forecast and actual on the entry card with
the delta, since both are stored; (3) an "Open on the Dock" button setting
`dock.setup = entry.dock`; (4) add `result` (finish positions, or a 1–5
speed-vs-fleet rating) plus a stored snapshot of the model's predicted target
BSP/VMG at the *actual* wind. Then a "log vs model" strip can show accumulated
bias per wind band — real hold-out data arriving for free from the only sensor the
product has.

**Effort.** M.

**Lenses.** log-more, strategy.

<a id="m-21"></a>

### M-21 — Import merges irreversibly and there is no reset, though `clear()` is already implemented

**Evidence.** `Log.svelte:157-166` reads any picked `.json` and calls
`logStoreUi.import(text)`, which loops `await this.store.put(e)`
(`store.svelte.ts:56-61`) — a straight merge by id into the live log with no
preview, no confirmation and no undo. `fromJson` validates shape but not
provenance, so importing the wrong export, or the same file with regenerated ids,
silently duplicates the season. The only removal path is per-entry two-tap Delete
inside the editor (`Log.svelte:142-151`). `LogStore.clear()` exists in the
interface and both implementations (`src/lib/logStore.ts:34, 89-91, 178-182`) and
is called from nowhere in `src/`; More's Data card (`More.svelte:38-52`) offers a
theme control, a status list and "Open the log".

**Impact.** A misdirected import is unrecoverable except by deleting entries one
at a time, two taps each. A user handing the device on, or hitting the corrupt-data
path, has no way to start clean, while the Data card asserts "on this device only,
nothing is uploaded" and gives no control over that data.

**Fix.** Wire the existing `clear()` to a two-step "Delete all log entries" button
on More's Data card, and make import state its count in a confirm before writing —
`Imported n entries` is already computed at `Log.svelte:163-165`, so move it in
front of the write.

**Effort.** S.

**Lenses.** log-more.

<a id="m-22"></a>

### M-22 — The three honesty links are network-only in an app specified to work offline

**Evidence.** `More.svelte:10` `const REPO =
'https://github.com/rjdscott/sailflow/blob/main'`; `:67-71` links PROVENANCE.md,
ASSUMPTIONS.md and validation/report.md there — the only three links on the screen
(`more-desktop.jpg`). The service worker precaches
`'**/*.{js,css,html,svg,ico,png,webmanifest}'` (`vite.config.ts:20-23`): no
markdown, and these files are not in the built bundle at all. The brief states
primary use is "on a dock… possibly with wet fingers and no signal"
(`docs/initial-prompt.md:104`) and "PWA with a service worker so it works fully
offline after first load" (`:111`). The links carry no external-link cue and no
`rel="noopener"`, and open GitHub's markdown viewer.

**Impact.** CLAUDE.md's cut order says provenance documentation is never cut, yet
the only route to it is dead in the exact place the app is meant to be used, and
on a standalone PWA it throws the user out to a browser tab. Every confidence tier
the app shows points at an explanation the user cannot open at the boat park.

**Fix.** Import the three markdown files as build-time strings (Vite `?raw`) and
render them in the existing `Sheet`, so they precache with the bundle. Minimum
interim: label them "opens on GitHub — needs signal" and add `rel="noopener"`.

**Effort.** M.

**Lenses.** log-more.

<a id="m-23"></a>

### M-23 — The log's empty state is inert while Export/Import take equal billing

**Evidence.** `log-desktop-empty.jpg`: the empty card is a heading and one
sentence with no button, and the desktop right column adds "Pick an entry to edit
it, or start a new one" — also with no button (`Log.svelte:276-280`, `:311`).
`phone-drills-log-more.jpg`, middle panel: the toolbar wraps to two rows — New
entry / Export JSON / Export CSV, then Import — filling the top third of a 390 px
screen above an empty log. All four render unconditionally (`Log.svelte:259-274`);
Export CSV on an empty log downloads a header-only file
(`logExport.ts:146-150`) and Export JSON downloads `[]`, with no warning. The
three quiet buttons share one visual weight, so "Import" — destructive per
[M-21](#m-21) — reads the same as "Export CSV".

**Impact.** A beginner's first view of the log is four tool buttons and a sentence
with nothing to press, and the one action that matters at zero entries — Import,
i.e. restoring a log on a new phone — is the least explained. Two of the four
buttons cannot do anything useful in that state.

**Fix.** Hide or disable the two Export buttons while `entries.length === 0`; move
the primary action into the empty card ("Log your first day", plus "or import a
log you exported before") and collapse Export/Import into one "Backup" disclosure
once entries exist.

**Effort.** S.

**Lenses.** log-more.

<a id="l-02"></a>

### L-02 — Drill progress is invisible, unexportable and unresettable on More (opportunity)

**Evidence.** `more-desktop.jpg` shows the Data card listing only "Storage:
IndexedDB, on this device only", the two loaded tuning-guide revisions, and
"Export JSON, export CSV and import live in the log toolbar". The drills key
`sailflow.drills.v1` (`src/lib/drills.ts:157`) is not mentioned, cannot be
exported alongside the log, and cannot be cleared; a grep of `src/` shows
export/import wired only for the log (`src/lib/logStore.ts`). The platforms that
lean on progress make it inspectable: Lichess's puzzle dashboard is a first-class
screen (https://lichess.fandom.com/wiki/Puzzles) and chess.com surfaces personal
bests on the profile
(https://support.chess.com/en/articles/8608686-how-do-puzzles-work-on-chess-com).

**Impact.** Progress a user cannot see, carry to a new phone or reset is progress
they will not value — and once a streak exists ([M-18](01-drills.md#m-18)) it
becomes progress they can lose silently to a cleared cache. It also contradicts
the app's data-transparency posture, which enumerates every other stored artefact.

**Fix.** One row in More's Data card ("Drill progress: 3 of 10 attempted, on this
device only"), fold `sailflow.drills.v1` into the existing log JSON export/import
so one file carries everything, and add a confirm-guarded "Reset drill progress".

**Effort.** S.

**Lenses.** drills-engagement.

<a id="l-03"></a>

### L-03 — More is a settings dead end: no units, no reduced-motion override, About buried

**Evidence.** `More.svelte:18-74` is the whole screen — a theme segmented control,
a read-only Data list, an About paragraph and three links, with nothing below the
fold (`more-desktop.jpg`). `settings.svelte.ts:39-51` persists exactly two things,
`mode` and `theme`. Motion is delegated entirely to the OS: `More.svelte:32-35`
says "Animation is reduced automatically when your system's reduce-motion setting
is on", and the only implementation is `@media (prefers-reduced-motion)` at
`tokens.css:100`, `Readouts.svelte:235` and `PlanView.svelte:547`, so a user who
wants the boat to stop moving must change an OS setting. Units are hardcoded (kt,
kg, mm, turns, %) with no alternative. About (`:59-66`) is a single unbroken
100-word paragraph — "documented ORC VPP parametric aero model",
"rig-bend-to-sail-shape sensitivity layer", "held-out points", "CFD-based tools" —
honest for the Yachtmaster, unreadable for the phone beginner. On a 390 px phone
that block starts at ~71 % of the viewport, below Appearance and Data
(`phone-drills-log-more.jpg`), so the app's strongest differentiator is the last
card on the last nav item.

**Impact.** The screen answers "what is this" for one of the two personas and "how
do I change it" for neither.

**Fix.** Three additions to the existing card stack: a Motion segmented control
(Auto / Reduced) writing a third key in `settings.svelte.ts` and a `data-motion`
attribute the `prefers-reduced-motion` rules also honour; a crew-weight kg/lb
toggle (kt and mm are class-standard, lb is not optional for the US fleet); and a
one-sentence plain-language lead above the About paragraph ("A practice tool, not
a measurement — every number tells you how much to trust it"). Move the About card
to the top of the column — see [M-01](04-shell-and-strategy.md#m-01).

**Effort.** M.

**Lenses.** log-more.

<a id="l-04"></a>

### L-04 — No release surface: v0.1.0 since the initial commit, no changelog, native `confirm()` as the update UX

**Evidence.** `package.json:4` still reads `"version": "0.1.0"` at HEAD `ee8e84e`,
38 PRs after the initial commit; `vite.config.ts:12` pipes it into
`VITE_APP_VERSION`, which `More.svelte:9` renders as "Sailflow v0.1.0"
(`more-desktop.jpg`) with no link to what changed and no build date or commit. No
`CHANGELOG.md` exists at the repo root. `src/main.ts:17` handles updates with
`if (confirm('A new version of Sailflow is available. Reload now?'))`, flagged in
its own comment as a known shortcut.

**Impact.** A returning user cannot tell whether the fixes they reported shipped,
and a user on a dock cannot tell whether the service worker served them a stale
build — the version string is a constant, so it is not even diagnostic. Shipping
continuously with no visible cadence also removes the only free retention mechanic
an offline PWA has: a reason to reopen it. There is no build stamp to quote in a
bug report either — see [M-29](04-shell-and-strategy.md#m-29).

**Fix.** Bump `package.json` per merged batch, add `CHANGELOG.md`, render a
"What's new in v{VERSION}" line on More linking to the release notes, and append
the build stamp to the version line. Replace the native `confirm()` with the
in-app toast the comment already anticipates.

**Effort.** S.

**Lenses.** strategy.
