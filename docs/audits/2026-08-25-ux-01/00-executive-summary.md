# Verdict: not yet excellent — core loop severed, five user-visible defects, strong bones

- **Lens:** UX + UI excellence, Race + Dock, both personas
- **Commit:** 0b5a923

The primitives are good: one card container, one accent colour, a confidence tier
on nearly every number, provenance hints under the Dock sliders, an honest
model-vs-guides panel. What is missing is the wire between the two screens. The
Dock commit never reaches Race — `race.controls.dock` is seeded to `{0,0,0}` and
never written again, while `ControlPanel.svelte:121` prints "🔒 committed for the
day" as a constant string. Every BSP/VMG/heel/coach number on Race is solved for
a base rig the user is not sailing, and the screen asserts the opposite. That
one defect ([C-01](01-race.md#c-01)) is the whole product loop, and it is
plan-complete on paper (`docs/plans/2026-08-25-mvp-analyser/phase-05-dock-mode.md:14`
ticks "Lock indicator + unlock-with-warning in Race"). Below it sit five Highs
that are each a visible defect rather than polish: a sign painted onto a
non-negative quantity, a sticky band that sits on the controls it serves, a busy
flag shared between two actions, disclosure markers deleted app-wide, and the
app's one actionable number shipping without the confidence tier every passive
readout carries.

**Scope.** Race (`src/ui/screens/Race.svelte`, `src/ui/race/**`), Dock
(`src/ui/screens/Dock.svelte`, `src/ui/dock/**`), shared primitives
(`src/ui/components/**`, `src/ui/tokens.css`, `src/app.css`).
`src/ui/disagree/**` is not in the scope list but is imported by both in-scope
screens and rendered in the in-scope screenshots, so its findings are kept. Out:
Log, Drills, More, `src/core` physics, PWA shell.

**Method.** Fan-out, six lenses (advanced-desktop, beginner-phone, visual-design,
a11y-interaction, competitor-benchmark, workflow-honesty) on Opus; one
adversarial refuter per High/Critical on Opus; synthesis by Fable. Evidence
screenshots in `evidence/`, taken on a 1440×900 desktop window and a 390 px
iframe harness against the dev server at this commit. Where a refuter corrected
the original evidence, the corrected version is what is published; nine findings
were downgraded from High to Medium or Low on refutation, and one (M-09) had its
prescribed fix reversed because the fix would have shipped fabricated numbers.

**Findings: 1 C, 5 H, 23 M, 3 L.** Punchlist in [`todo.md`](todo.md); details in
[`01-race.md`](01-race.md), [`02-dock.md`](02-dock.md),
[`03-shared.md`](03-shared.md).

**Top five risks**

1. [C-01](01-race.md#c-01) — Race solves the wrong boat and says it is the right
   one. Ship-blocker; the cross-screen promise in the brief does not exist.
2. [H-05](01-race.md#h-05) — the coach line carries no tier, and its sign is
   inverted downwind: at the Downwind preset's TWA 145° VMG is negative, and
   `bestProbe` maximises it, so the app recommends the move that slows progress
   to the leeward mark.
3. [H-01](02-dock.md#h-01) — a hardcoded minus makes every regret render
   negative, inverting the ranking of the Dock's primary comparison table.
4. [H-04](03-shared.md#h-04) — `summary { display: flex }` removes the disclosure
   marker everywhere, so the honesty centrepiece (Model vs tuning guides) looks
   like an empty grey card to both personas.
5. [H-02](01-race.md#h-02) — the sticky desktop metrics band is an opaque overlay
   on the slider column it was added to support, killing ~120 px of the primary
   interaction surface at every scroll offset.

**What the benchmark says.** The competitor lens found three capabilities that
are table stakes elsewhere and absent here. First, a target state. The North U
Trim Simulator has a "Magic Wand" that "automatically calculates optimum upwind
boat trim for a selected true wind speed, allowing users to compare their manual
trim adjustments against ideal configurations and see performance differences"
(https://www.northsails.com/sailing/en/2018/03/developing-tools-to-help-visualize-performance),
and its controls are "all connected so the user can work towards their target
boat speed for selected TWS" (https://northu.com/sailtrimsimulator/). Virtual
Regatta Inshore does the same in a game idiom: "If your VMG is optimal, your
speed turns green", and when it is not "a visual indicator appears showing you
the optimal VMG"
(https://vrinshore.zendesk.com/hc/en-us/articles/360012273900-The-game-interface).
Sailflow shows BSP and VMG as bare numbers with a tier and no reference, and its
only guidance is a one-step ±1-click gradient probe ([M-09](01-race.md#m-09)).
Second, balance feedback: North U "shows rudder angle, which signals whether
helm is excessive—indicating that sail trim adjustments are needed for better
balance"; Sailflow has no helm or rudder term at all ([M-18](01-race.md#m-18)).
Third, pictures with the numbers. The North J/70 tuning guide pairs every
setting with annotated photos and a companion video — how to hold the main
halyard to the mast track to measure prebend, where the spreader trim marks go
(https://www.northsails.com/en-us/blogs/north-sails-blog/j70-tuning-guide) —
while Sailflow's Dock, the screen `docs/initial-prompt.md:29` calls "the mode
nobody else has built", is three sliders and one line of text with no diagram at
all ([M-20](02-dock.md#m-20)). Smaller, cheaper: SailRhythm's "Intuitive Wind
Visualization" where "arrow length represents wind speed"
(https://www.sailrhythm.com/) against Sailflow's fixed-length arrow
([M-21](01-race.md#m-21)), and Virtual Regatta's always-available sail-switch
button against a kite control double-gated behind Advanced mode and a checkbox
([M-22](01-race.md#m-22)). None of these needs new physics. All of them are the
difference between an instrument that reports and a trainer that teaches.
