# Verdict: the kite's maths is closer to the photographs than its picture is — the loft throws away the clew height the geometry computes, so the drawn corner sits on the deck at every sheet setting, and two of five camera presets and the whole desktop plan view are broken independently of the sail

- **Lens:** adversarial review of the 3D hero and the 2D plan view at every point of sail, both tacks' conventions, desktop and phone; the gennaker measured against a photo survey of 14 J/70s
- **Commit:** 60913b4

**Judgement.** The owner's report was "the clew of the spinnaker is too low
when sailing downwind", and it is right for a reason nobody had found.
`kiteGeometry` pins the clew on the published leech/foot circle and lifts it
from 0.67 m to 2.08 m above the sheer as the sheet eases; that band (0.08–0.24
of mast height) overlaps what the photographs show (0.12–0.30, median 0.19).
The loft never draws it. Every section is lofted in a horizontal plane at the
luff's height and the leech vector's vertical component is discarded, so the
drawn corner is at tack height, 0.2 m, at every sheet setting, and the foot is a
horizontal line hanging below the sheer. Easing the sheet, the one thing the
clew construction was written to show, moves the drawn corner by 0.000 m
([C-02](01-gennaker.md#c-02)). Fixing that is a rise term in the loft, not a
constant, and only after it lands is there anything to re-fit against the
photographs (foot sag, [M-08](01-gennaker.md#m-08); flying edge lengths, a
later item).

Around the sail, the scene has defects a sailor meets before trim is even in
question. The SAIL cell in the conditions band hoists a gennaker over a
close-hauled mainsheet and drops it without restoring one
([C-01](03-3d-scene-and-cameras.md#c-01)). "Up the luff" fits its camera about
11 m under the water at every state ([H-10](03-3d-scene-and-cameras.md#h-10));
"Helm" skips the fit and shows a third of the main over half a canvas of sky
([H-06](03-3d-scene-and-cameras.md#h-06)). On desktop the plan view draws the
mast 0.77 m too far aft against the boat file's own J
([H-11](02-plan-view.md#h-11)), clips the kite's luff off the top of the frame
in all six kite states ([H-02](02-plan-view.md#h-02)), draws it as a bowtie on
the reaches ([H-03](02-plan-view.md#h-03)), and cuts the transom, the heel tag,
the caption and the explainer off the card ([H-01](02-plan-view.md#h-01),
[H-05](02-plan-view.md#h-05)). On a phone both gennaker chips are off-screen
and the selected chip is never styled ([H-07](04-phone-and-chrome.md#h-07),
[H-08](04-phone-and-chrome.md#h-08)).

What holds: twist sign and ramp, camber and draft magnitudes and their response
to every upwind control, jib leech at the spreader tip, boom length, tack
mirroring, the wind rose at all nine angles, telltale pairing and per-station
ordering, and the kite's tack height, luff side versus apparent wind angle, and
fore-and-aft clew position, all inside the photographed bands. The gennaker's
edge lengths, half width and ORC area are genuinely asserted against published
numbers.

**Scope.** `src/ui/three/**`, `src/ui/race/PlanView.svelte`,
`src/ui/race/boat.ts`, `src/ui/race/rigLayout.ts`,
`src/ui/race/ConditionsBand.svelte`, `src/ui/race/store.svelte.ts`, the hero
card in `SailHero.svelte`, and the constants they draw from in
`src/core/shape/flying.ts`, as rendered by `pnpm build` + `vite preview` at
1440×900 and 390×844 (Playwright Chromium). Nine states: TWA 40/60/90 under
the jib; 110/135/150/170 under the gennaker at the class downwind trim; 150 at
full trim and full ease. TWS 12 kt, starboard tack, motion off, telltales
frozen. Out of scope: solver correctness, the aero tables, port-tack rendering,
Drills, Log, Dock.

**Method.** Two adversarial fan-outs (156 agents). Five finders reviewed the
non-kite surfaces and three the gennaker, each returning findings with
file:line and screenshot evidence; every candidate then faced two independent
refuters, a sailor/sailmaker lens and a code lens, and survived only if neither
refuted it. 33 of 74 candidates survived; the refuted ones are listed in the
finding docs where a reader might otherwise expect them. Three refuted items are
carried as owner judgement with the split stated ([H-12](01-gennaker.md#h-12),
[M-07](03-3d-scene-and-cameras.md#m-07), [L-02](03-3d-scene-and-cameras.md#l-02)). Reference photographs were collected by web
search, restricted to J/70s, and measured by eye against the visible mast
([05-photo-survey.md](05-photo-survey.md)); two were re-measured
independently and agreed within 0.03 of mast height. The screenshot set is
reproducible with `node scripts/shoot_matrix.mjs <dir>`.

**Findings.** 2 Critical · 12 High · 12 Medium · 3 Low. Reading order:
[01-gennaker.md](01-gennaker.md), [02-plan-view.md](02-plan-view.md),
[03-3d-scene-and-cameras.md](03-3d-scene-and-cameras.md),
[04-phone-and-chrome.md](04-phone-and-chrome.md). Punchlist in
[todo.md](todo.md).

**Top risks.**
1. The trainer's downwind picture teaches a clew on the deck and a foot in
   the water, at every trim, on every surface but the plan view (C-02).
2. A control on the main instrument band produces a sail plan the boat cannot
   carry, in either direction (C-01).
3. Two of five camera chips render unusable pictures unconditionally
   (H-10, H-06), and the desktop plan view is clipped on three sides
   (H-01, H-02, H-05).
4. Honesty drift in `kite.ts`: fitted constants justified by a clew rise the
   picture does not contain (M-09), prov-tagged constants that draw nothing
   (M-10), and register rows missing for the sheet band and the twist pair
   (M-12).
