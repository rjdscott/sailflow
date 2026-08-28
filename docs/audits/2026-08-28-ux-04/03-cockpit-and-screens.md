# 03 — Cockpit components and the other screens

<a id="h-03"></a>
## H-03 · Phone cold load: the numbers are below the fold

**Evidence.** `m3-race-full.png` (Playwright, iPhone 13, 390×844):
`document.documentElement.scrollHeight` = **5076 px**. Order on screen:
title + tier segmented (190 px) → lede → five point-of-sail chips on two rows →
stepper + Edit → hero card with 3D/Plan tabs and the plan drawing (~900 px) →
Main/Jib/Helm/Rig tab strip → **instrument band** at ≈ 1400 px. The viewport
is 844 px. `Race.svelte:594-611` sets `.hero-boat { order: 1 }`,
`.tabs { order: 2 }`, `.bar { order: 3 }` deliberately.

**Impact.** A first-time phone user sees a boat drawing and no number. The
band is what the screen exists to show; the hero is what it looks like.

**Fix.** Phone order: header → conditions band (right half of the new band)
→ boat band (left half) → hero → panels. Cap the phone hero at
`min(56vw, 300px)` so band + hero fit one 844 px viewport.

<a id="h-04"></a>
## H-04 · Downwind VMG displays as a negative number

**Evidence.** Click `Run`: VMG cell reads `−4.95 kt`, sub-line `target −4.99
+0.03`, and `%POLAR 99 %`. `InstrumentBar.svelte:73` flips `better` to
`'less'` for `vmgDown`, but the value itself is rendered signed.

**Impact.** No instrument on a real boat shows negative VMG; a sailor reads
`−4.95` as broken and `+0.03` as "I am slower" when they are faster.

**Fix.** Render `|vmg|` with a direction glyph in the unit slot (`4.95 kt ↓`)
and label the delta "to optimum (+ = optimum makes more VMG to leeward)".
Keep the signed value in the solver and the share link.

<a id="m-04"></a>
## M-04 · Learn tier: hero draws the boat in the bottom third

**Evidence.** Desktop, `Learn` pressed: the instrument band grows to a two-line
verdict + three large cells, the hero keeps its `presets.ts` framing, and the
boat's masthead sits at ~y 570 of a 790 px viewport with the top ~330 px of
the hero empty water-less black (screenshot `ss_7302y1via`).

**Fix.** Re-run the `presets.ts` fit on hero resize (it already fits on
preset change per #101); `ResizeObserver` on `.hero-boat`.

<a id="m-05"></a>
## M-05 · Log empty state does not say what a log is for

`screens/Log.svelte` empty card: "Record the wind, the rig you sailed and what
was fast, while you still remember it." True, but it does not say the entry
comes back as a Dock forecast / Race condition later. **Fix:** one more
sentence: "Next time you open Dock with a similar forecast, the setup you
logged is the first suggestion."

<a id="m-06"></a>
## M-06 · `Lull` / `Shift` / `Replay a gust` look like state, not simulation

Actions bar, desktop: three outline buttons in the same style as `Base trim`
and `Copy link`. They *animate the conditions* (`puffPlayer.svelte.ts`);
nothing says so until pressed. **Fix:** group them under a small "Simulate"
label with a ▶ glyph on each; on the new band the TWS cell should pulse while
a replay runs.

<a id="m-07"></a>
## M-07 · Phone tab bar carries a wordmark row

`BottomNav.svelte:9` `<p class="wordmark">Sailflow</p>` above the five tabs:
~40 px of an 844 px viewport, on the screen already 5076 px tall (H-03).
**Fix:** delete it; the title is in the header.

<a id="l-02"></a>
## L-02 · Race lede truncates on phone

`Race.svelte:583-587` ellipsises "Trim for the wind in front of you, and see
what the move is worth." to "…and see what the move …" at 390 px
(`m2-race-top.png`). A truncated sentence in the one place that explains the
screen. **Fix:** shorten to "Trim for the wind in front of you." or let it wrap.
