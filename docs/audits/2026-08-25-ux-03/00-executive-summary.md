# Verdict: the cockpit is built but not delivered to the screen — its central visual renders in a zero-pixel box, its honesty panel is clipped away, and both of ADR 0014's safety gates are inert

- **Lens:** cockpit UX per ADR 0015, accessibility, phone, performance and the 3D hero
- **Commit:** 6bf6dd0

ADR 0015's bet was that a control and its consequence should sit within one
saccade. The panels, the cell contract and the tiers are all built to that
shape — and then the layout takes the consequence away. On the desktop screen
the ADR calls primary, the Mainsail, Headsail and Rig visuals resolve to
`height: 0px` while their SVGs sit in the DOM at 333, 320 and 289 px
([H-01](01-race-cockpit.md#h-01)), so the one thing the rebuild existed to
deliver is invisible at every scroll position and in every tier; the
model-vs-guides panel is `overflow: hidden` in the same grid, showing 13 % of
itself and cutting off before a single Model/North/Quantum number, which defeats
CLAUDE.md's honesty rule on the primary layout
([H-03](01-race-cockpit.md#h-03)); and committing a rig — the flow the app pushes
you into with a banner and a CTA — is rewarded with a gear-chart header over zero
rows ([H-04](01-race-cockpit.md#h-04)). None of these is a hard failure, which is
why all three shipped: the DOM is right, the tests query the DOM, and the pixels
are wrong. The second theme is ADR-committed controls that do not run. ADR 0014's
first-frame gate times a warm second frame — 1.0 ms at 1× CPU, 12.7 ms at 20×,
against a 50 ms budget — so it can never trip and the 2D fallback is unreachable
on the low-end phone it exists to protect ([H-12](04-performance-3d.md#h-12));
and `prefers-reduced-motion` never reaches the WebGL hero at all, which renders
at 60 fps and tweens its camera under an OS reduce preference, against an ADR
commitment that phase 04 ticks as delivered and that More's own copy tells the
user is honoured ([H-09](02-accessibility.md#h-09)). Both were hidden by tests
that pin `sailflow.motion` to `'off'`, the one branch that works. The third theme
is that the cockpit's own affordances turn on you: the confidence badge is a
`<button>` inside the Apply optimum `<button>`, so asking what "B" means rewrites
five sliders and announces nothing ([H-06](02-accessibility.md#h-06),
[H-08](02-accessibility.md#h-08)), and on the phone the hero is 1045 px down
under a sticky strip that scrolls you past it with no way back
([H-11](03-phone.md#h-11)). Against ADR 0015's revisit trigger — "audit ux-03
finds novices fail the Learn tier" — the answer is narrower than the trigger
implies: Learn is not failing as a concept, but it ellipsises the control names
its own spec says it spells out ([M-04](01-race-cockpit.md#m-04)), it is tighter
than Race for panel content ([M-01](01-race-cockpit.md#m-01)), and it grades in a
unit ("clicks") that appears on nothing ([M-03](01-race-cockpit.md#m-03)). The
panel grouping itself held up under every lens; no finding argues for a fifth
panel or a different split.

**Scope.** The Race cockpit (`src/ui/screens/Race.svelte`, `src/ui/race/**`,
`src/ui/instruments/*`, `src/ui/three/*`, the shared cockpit primitives), the
shell, and phase 06's restyle of Dock, Log, Drills and More as reached from the
cockpit. Out: solver accuracy and physics, the IA of Dock/Log/Drills, and ticked
ux-02 items unless re-observed. Full contract in [`scope.md`](scope.md).

**Method.** Fan-out, five lenses on Opus (novice in the Learn tier, expert
trimmer in the Analyse tier, accessibility, phone, performance and the 3D hero),
one adversarial refuter on Opus per High, synthesis by Fable. Every number here
is a Playwright reproduction against the production build at this commit, with a
fresh browser context per shot because the app persists tier, conditions and trim
in `localStorage`. Refuters re-measured rather than re-read: the reduced-motion
finding is settled by an md5 A/B of four canvas frames under `'system'` versus
`'off'`, the safe-area finding by a real CDP inset override rather than a CSS
stand-in, the leak by `Performance.getMetrics` with GC forced before every read.
**No High was refuted outright, and six were corrected in ways that changed the
finding.** [H-01](01-race-cockpit.md#h-01)'s diagnosis was wrong (the
`max-height` cap is not the cause; the collapsed grid row is), and
[H-06](02-accessibility.md#h-06) was found to have a second, worse call site on
Dock that its proposed one-file fix would have missed. **Nine findings were
downgraded from High to Medium** — among them the panel scroll
([M-01](01-race-cockpit.md#m-01)), where the claim "the controls can never be on
screen with their own cue" was disproved by scrolling to offset 135 and
photographing four sliders beside the cue; the WebGL leak
([M-21](04-performance-3d.md#m-21)), where the "permanently black hero" impact
was disproved at 50 visits and 100 leaked contexts; and the tab-bar safe area
([M-15](03-phone.md#m-15)), where "taps swallowed by iOS" is not what the home
indicator reserves. Where a refuter corrected the evidence, the corrected version
is what is published and the reason is in the finding text. Evidence in
`evidence/`: lens shots prefixed by lens, refuter reproductions by `verify-`.

**Findings: 0 C, 12 H, 25 M, 5 L.** Punchlist in [`todo.md`](todo.md); details in
[`01-race-cockpit.md`](01-race-cockpit.md),
[`02-accessibility.md`](02-accessibility.md), [`03-phone.md`](03-phone.md),
[`04-performance-3d.md`](04-performance-3d.md). Phase 06's audit task closes
C/H in-phase, so all twelve Highs are P0.

**Top five risks**

1. [H-01](01-race-cockpit.md#h-01) — the `.visual` grid item computes to 0 px in
   the Mainsail, Headsail and Rig panels at 1280 and 1440, in both Learn and
   Race, while its children measure 333/320/289 px. ADR 0015's Decision clause
   is unmet on the layout it names as primary, and the failure is invisible to
   any test that queries the DOM.
2. [H-03](01-race-cockpit.md#h-03) — the disagreement panel shows 158 px of 1257,
   `overflow: hidden` with no scroll, and cuts mid-sentence before any number or
   Δ. The app states a disagreement exists and then withholds both sides.
   Present in the default Race tier, not just Analyse, and opening it also adds
   820 px of empty page.
3. [H-12](04-performance-3d.md#h-12) + [H-09](02-accessibility.md#h-09) — two
   ADR 0014 commitments are asserted by docs, ticked by the plan, and inert in
   the product. The perf gate measures the wrong frame by a factor of 20; the
   reduced-motion freeze consults a setting instead of the media query, and
   More's shipped copy tells the user otherwise.
4. [H-06](02-accessibility.md#h-06) — a `<button>` inside a `<button>` makes the
   help affordance destructive: one click or Enter on the tier badge applies the
   optimum over the user's trim, with no announcement
   ([H-08](02-accessibility.md#h-08)). The same nesting on Dock applies a rig
   setup the sailor then physically turns on the boat.
5. [H-04](01-race-cockpit.md#h-04) + [H-05](01-race-cockpit.md#h-05) — the two
   places the cockpit teaches something and gets it backwards: a gear chart that
   renders a header over zero rows after the commit flow, and a puff replay that
   says "underpowered" at 15° of heel and only says "overpowered" once the gust
   has left.

**What is not broken.** The panel grouping by sail system survived all five
lenses; no finding proposes a fifth panel, a different split, or a return to
Simple/Advanced, so ADR 0015's core decision stands and only its density tier is
questioned ([M-07](01-race-cockpit.md#m-07)). The solver is fast — 2.4 ms median
round trip, which is why the 80 ms debounce is the thing to cut
([M-25](04-performance-3d.md#m-25)) rather than the physics. And phase 06's phone
work is closer to right than the desktop work: below 1280 px the visuals render,
the panels do not clip, the drill band lays out correctly, and the disagreement
panel reads in full. Nearly every High in this audit is a `@media (min-width:
1280px)` block.
