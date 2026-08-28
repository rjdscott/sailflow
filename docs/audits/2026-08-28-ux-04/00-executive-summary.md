# Verdict: the cockpit is good, the wind is not — the one input every other number depends on is the smallest, most remote control on the screen, and nothing on entry tells a sailor it exists

- **Lens:** adversarial end-to-end UX from the base URL, first-time sailor, phone and desktop; every component scored 1–5
- **Commit:** b853efc

**Judgement.** A sailor lands on `/`, gets three tour cards about Dock, tiers
and Apply optimum, and is then dropped into a cockpit whose wind, angle, sea
state and crew live in a 28 px chip rail at the far top-right on desktop, and
collapse to `10 kt` + a button labelled `Edit` on a phone. Sea state and wind
angle are never visible on a phone without tapping `Edit`. The numbers the
sailor came for (BSP, %polar, VMG) are below the fold on a phone cold load.
That is the whole of the complaint the owner relayed ("didn't know about the
setup to change the wind"), and the evidence reproduces it on both form
factors. Everything downstream — panels, hero, honesty surfaces, Dock, Drills
— is in good shape (3–5) and needs polish, not rework.

**Scope.** `src/ui/**` as rendered at `http://localhost:5199/` at 1440×900
(Chrome) and 390×844 (Playwright iPhone 13), cold session, every route,
Learn/Race/Analyse tiers, upwind and downwind. Out of scope: solver
correctness, provenance, `src/core`.

**Method.** Inline, one reviewer. Browser walk with screenshots, then
file:line for every finding. Prior punchlists (ux-01..03, release-01) were
read so nothing here re-reports a fixed item.

**Findings.** 0 Critical · 4 High · 9 Medium · 3 Low. Scorecard in
[02-scorecard.md](02-scorecard.md); the conditions redesign the owner asked
for is specified in [01-entry-and-conditions.md](01-entry-and-conditions.md)
§ Proposed layout.

**Top risks.**
1. **H-01** Conditions controls are remote, tiny, and on a phone mostly
   hidden. The app's primary input reads as an afterthought.
2. **H-02** The first-run tour never mentions conditions. A stranger is not
   told the one thing they must do first.
3. **H-03** Phone cold load puts the instrument band ~1400 px down a 5076 px
   page; the screen's purpose is invisible on first paint.
4. **H-04** Downwind VMG is displayed as a negative number (`−4.95 kt`), which
   a sailor reads as a bug.
