# Verdict: not category-leading — the trainer grades against a fabricated answer key, and nothing tells a stranger what the app is for

- **Lens:** category-leading UX ("easy and intuitive") + learning science and engagement for Drills, every screen, both personas
- **Commit:** ee8e84e

Three answers to the three questions. **Is it category-leading and intuitive?**
Not yet, and the gap is not polish. After ux-01's remediation the individual
screens are well made — tiered numbers, honest disclosures, a real optimiser on
Race — but the product around them is unnamed and unsequenced: no purpose
sentence anywhere in the app, the default route is the densest screen, the tab
order runs the loop backwards, exactly one in-content link exists in five screens
([M-01](04-shell-and-strategy.md#m-01)), and nothing — not a drill, not a
scenario, not a condition — has an address or survives a reload
([M-05](04-shell-and-strategy.md#m-05)). **Are the drills best practice?** No.
They are the weakest surface in the product and four of this audit's seven Highs
are in them: the answer key is a hardcoded constant rather than an optimum
([H-01](01-drills.md#h-01)), the medal is uncorrelated with the skill and 8 of 10
drills award one for zero input ([H-02](01-drills.md#h-02)), two drills cannot be
played at all ([H-03](01-drills.md#h-03)), and on at least two the imperative
inverts the drill's own written coaching ([H-04](01-drills.md#h-04)). **What
next?** In order: make the drills honest (H-01 through H-04, plus the CI gate in
[M-27](04-shell-and-strategy.md#m-27) that gives the bands a real error floor),
fix the log's two defects ([H-05](03-log-more.md#h-05),
[H-06](03-log-more.md#h-06)) since the log is the feature the brief calls
first-class and it currently overflows and un-cancels, then name the product and
wire the loop (M-01, M-05, M-04). Downwind ([M-28](04-shell-and-strategy.md#m-28))
and instrumentation ([M-30](04-shell-and-strategy.md#m-30)) are the two strategic
bets after that.

**Scope.** Every screen (`src/ui/screens/*`, `src/ui/race/**`, `src/ui/dock/**`,
`src/ui/drills/**`, `src/ui/log/**`, `src/lib/drills.ts`,
`data/drills/j70-static.json`), first-run experience, navigation, and the Drills
learning loop as a whole. Out: solver accuracy, and items already open in ux-01's
todo unless re-observed. Full contract in [`scope.md`](scope.md).

**Method.** Fan-out, seven lenses on Opus (first-run/intuitiveness, information
architecture + navigation, drills pedagogy, drills engagement + benchmark, log +
more screens, desktop study-session flow, product strategy "what next"); one
adversarial refuter per High/Critical on Opus; synthesis by Fable. Refuters ran
the shipped solver over every drill, swept every free control across its legal
grid, and re-ran `optimalTrim` from three starting trims, so the numbers in
[H-02](01-drills.md#h-02), [H-03](01-drills.md#h-03),
[H-04](01-drills.md#h-04) and [H-07](02-race-dock.md#h-07) are reproductions, not
inferences. Where a refuter corrected the original evidence, the corrected version
is what is published; **one High was refuted outright** — a metrics-band overprint
that turned out to be a stale screenshot of an intermediate build and does not
reproduce at this commit — and eleven more were downgraded to Medium or Low.
Evidence screenshots in `evidence/`, from the dev build at this commit; phone
Race/Dock shots predate ux-01 and are marked `-pre-ux01`.

**Findings: 0 C, 7 H, 30 M, 5 L.** Punchlist in [`todo.md`](todo.md); details in
[`01-drills.md`](01-drills.md), [`02-race-dock.md`](02-race-dock.md),
[`03-log-more.md`](03-log-more.md),
[`04-shell-and-strategy.md`](04-shell-and-strategy.md).

**Top five risks**

1. [H-01](01-drills.md#h-01) — the drill answer key is `baseRace()`, a fixed
   table tagged `prov: assumed`, identical at 6 kt and 20 kt. Every per-control
   coaching line is the learner's distance from a constant, printed as the expert
   answer. `optimalTrim.ts:4-11` names this defect verbatim; Race was migrated,
   Drills was not.
2. [H-02](01-drills.md#h-02) — 8 of 10 drills hand out a medal before the learner
   touches a control and 2 award Gold, while the bands (gold ≤ 1 %) sit inside the
   model's own 1.6 % held-out error. The medal measures nothing, and it
   contradicts the coach line in the same viewport.
3. [H-04](01-drills.md#h-04) — the descent optimum says *more* backstay in 6 kt
   flat water and *less* in 20 kt, against briefs that say the opposite, with no
   disagreement panel on the screen that speaks in imperatives.
4. [H-06](03-log-more.md#h-06) — `form = { ...entry }` leaves the nested proxies
   live, so Cancel keeps the edits and typing in the log's dock row rewrites
   `rigLock.locked.setup` — the one value both personas are told is frozen for the
   day — which Race then reads on its next mount.
5. [H-07](02-race-dock.md#h-07) — Race's optimum is path-dependent (traveller
   target spans −5 to +30 at one condition and rig, depending only on where the
   sliders were) while the Why copy claims the search runs "from where your
   sliders are now".

**Drills verdict.** Judged as a training product rather than as a screen, the
drills fail on all four requirements of deliberate practice. *A task the learner
cannot already do*: the starts are not wrong — 8 of 10 medal untouched, and
correcting the key does not rescue it, since 4 of 9 upwind drills sit inside the
gold band at their own start. *An attempt before the answer*: the hint names the
direction and order of every free control, unconditionally, on open
([M-02](01-drills.md#m-02)). *Immediate, specific, correct feedback*: the coach
line is fabricated (H-01), it prescribes no-op moves on the drills whose named
control the shape layer never reads (H-03), and it unmounts on the first slider
movement after the learner reads it ([M-06](01-drills.md#m-06)). *Repetition with
spacing*: persistence is `Record<drillId, lowestLossPct>` — no date, no attempt
count — so ten static drills exhaust in one sitting and the research's own
top-ranked mechanic has nothing to be built on later
([M-17](01-drills.md#m-17)). None of this is expensive to fix, and the pieces
mostly exist: `optimalTrim` is written and wired to the worker, `Slider` already
takes a ghost-tick `target`, `<details>` is already in `DrillView`, and the
disagreement panel is already built. What is missing is that Drills was never
migrated onto them.

**Benchmark.** The drills-engagement lens found four mechanics that are table
stakes in the puzzle-trainer category and absent here, all local-only and none
needing a backend. Retention: Duolingo calls Streaks "the single most effective
retention lever in the product", reporting significant Day-1/7/14 retention lifts
with Day-7 the largest
(https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/);
chess.com's Daily Puzzle "maintains a streak that resets if not completed within
48 hours of release"
(https://support.chess.com/en/articles/8608686-how-do-puzzles-work-on-chess-com);
Brilliant pairs a daily challenge archive with "daily streaks and progress
tracking" (https://brilliant.org/daily-problems/archives/,
https://brilliant.org/help/using-brilliant/). Sailflow writes no date at all, so
it cannot add a streak retroactively ([M-18](01-drills.md#m-18)). Hint economics:
chess.com charges for the hint — "If you make your first correct move after using
a hint, you won't earn any progression points" — and Lichess Puzzle Streak reveals
the solution only when the run ends (https://lichess.org/streak); Sailflow gives
it away free, before the attempt (M-02). Diagnosis and resurfacing: Lichess's
puzzle dashboard rates a player by theme, shows the three strongest and three
weakest, and lets you replay failures and drill a weak theme
(https://lichess.fandom.com/wiki/Puzzles, https://lichess.org/training), and
chess.com's Custom Puzzles expose "success percentages by theme"; Sailflow keeps
one best-loss float per drill and never re-offers anything (M-17). Guided entry:
Virtual Regatta Inshore fronts its Academy with explicit training challenges
before free play (https://www.virtualregatta.com/en/inshore-game/), and its race
UI turns speed green when VMG is optimal
(https://vrinshore.zendesk.com/hc/en-us/articles/360012273900-The-game-interface),
while North U's Trim Simulator "Magic Wand… automatically calculates optimum
upwind boat trim… allowing users to compare their manual trim adjustments against
ideal configurations"
(https://www.northsails.com/sailing/en/2018/03/developing-tools-to-help-visualize-performance);
Sailflow's drill screen shows three bare readouts with no target, no
distance-to-goal and no ghost tick, though Race already has the component
([M-16](01-drills.md#m-16)). None of the four needs new physics.
