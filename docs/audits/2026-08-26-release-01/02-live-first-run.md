# Live site, first run

https://rjdscott.github.io/sailflow/ driven with headless Chromium
(`@playwright/test` 1.62.1, `--use-gl=swiftshader --enable-unsafe-swiftshader`),
one fresh browser context per screen so nothing carries over in
`localStorage`, `networkidle` plus 5 s settle before every capture. Screens
reached by hash (`#/race`, `#/dock`, `#/log`, `#/drills`, `#/more`) at
1920×1080 and 390×844.

Reproduce with [`sweep.mjs`](sweep.mjs), run from the repo root:

```bash
node docs/audits/2026-08-26-release-01/sweep.mjs docs/audits/2026-08-26-release-01/img
```

Raw capture in [`img/`](img/): `log2.txt` is the console and network
transcript, `<viewport>-NN-<screen>.png` the screenshot,
`<viewport>-NN-<screen>.txt` the captured `document.body.innerText`.
`<viewport>-01-landing*` are an earlier pass over the bare URL with no hash.

## What was verified clean

- **No console errors and no failed requests, on any screen, at either
  viewport.** `img/log2.txt`: every `console/network (N)` line reads `(0)`
  except desktop Race, which logs two SwiftShader messages —
  `GL Driver Message (OpenGL, Performance, …): GPU stall due to ReadPixels` —
  an artefact of the software renderer, not the app.
- **The 3D hero renders.** `img/desktop-01-landing.png` and
  `img/phone-01-landing.png` show the lofted main, jib, telltales and hull
  under SwiftShader. ADR 0014's perf gate did not fall back to the plan view
  on either viewport.
- **The A/B/C confidence tiers are explained on a reachable screen.**
  More → About: "Every output carries a confidence tier — A is a number, B is
  a direction and a band, C is a direction only"
  (`img/desktop-06-more.txt`, `img/phone-06-more.png`).
- **Every screen sets a distinct document title** (`Race · Sailflow`,
  `Dock · Sailflow`, …) and Race round-trips its whole scenario into the URL
  on first paint —
  `#/race?tws=10&twa=42&sea=1&crew=300&set=jib&r=30.60.0.20.50.30.60.5.30.50.50`.

## Context, not a defect

More reads **Sailflow v0.2.0** at both viewports (`img/log2.txt`,
`mentions "version": 0.2.0`; `img/phone-06-more.png`). The live site is the
last `main` deploy; `package.json` at this commit is already `0.3.0` and ships
when the release PR merges. Out of scope by the scope contract; recorded so a
later reader does not re-find it.

---

<a id="m-10"></a>

## M-10 — Log on a desktop is 85 % empty and shows two empty states that contradict each other

`img/desktop-04-log.png`, 1920×1080, cold. All content sits in the top 260 px;
the remaining ~820 px is bare background. Two cards state the empty case
differently, side by side (`img/desktop-04-log.txt`):

```
NO ENTRIES YET
Record the wind, the rig you sailed and what was fast, while you still remember it.
[Start today's entry]
Or restore a log you exported before, under Backup.

NEW ENTRY
Pick an entry to edit it, or start a new one.
```

The right-hand card invites the reader to "pick an entry to edit" on a screen
whose other card has just said there are none. The phone build does not show
the second card at all (`img/phone-04-log.png`), so this is the desktop
two-column layout rendering its detail pane's placeholder.

**Impact.** Log is one of five tabs. A stranger who opens it lands on the
emptiest screen in the app and gets two different instructions.

**Fix.** Code. Suppress the detail-pane placeholder while the list is empty,
and let the empty state own the column. Left for the owner.

---

<a id="m-11"></a>

## M-11 — "Tier" names three unrelated things, and the word never appears on the screen that uses it most

Captured on the live site:

- **Confidence tier**, More → About: "a confidence tier — A is a number, B is
  a direction and a band, C is a direction only" (`img/desktop-06-more.txt`).
- **Drill difficulty tier**, Drills: `TIER 1 — THE OBVIOUS ONE`,
  `TIER 2 — TWO CONTROLS THAT FIGHT`, `TIER 3 — THE WHOLE RIG`
  (`img/desktop-05-drills.txt`, `img/desktop-05-drills.png`).
- **Density tier**, More → Settings, describing the Learn/Race/Analyse control:
  "Race adds the eleven-control panel, … and the **tier-3 drills**"
  (`img/desktop-06-more.txt`) — which collides with the second meaning in the
  same sentence.

Meanwhile Race, the screen carrying 21 bare `A`/`B`/`C` badges
(`img/desktop-01-landing.png`), never prints the word: `img/log2.txt` reports
`mentions "tier": false` for `#/race` at both viewports, and `true` only for
`#/drills` and `#/more`.

**Impact.** A stranger on Race sees 21 unlabelled capital letters with no
search term to look them up by, then meets the word "tier" on Drills attached
to something else entirely. The explanation exists and is good; the vocabulary
does not connect it to the badges.

**Fix.** Code/copy. Label the badges' explainer with the word ("confidence
tier"), and pick a different noun for drill difficulty. Left for the owner.

---

<a id="l-12"></a>

## L-12 — The one line that tells a stranger what Race is for is on the phone and not the desktop

Phone, directly under the `Race` heading (`img/phone-01-landing.png`):

> Trim for the wind in front of you, and see what the move is worth.

Desktop at 1920×1080 has no such line: `img/desktop-01-landing.txt` runs
`Race` → `Learn Race Analyse` → `Close-hauled …` with nothing in between, and
`img/desktop-01-landing.png` confirms the heading sits directly on the chip
row. Drills keeps its lede at both widths (`img/desktop-05-drills.png`); Dock
has none at either (`img/phone-03-dock.txt` opens `Dock` → `EXPECTED
REGRET`), so Race is the only screen where the copy exists and one viewport
drops it.

**Impact.** The desktop is the wider surface with more room for the sentence
and is where an engineer following the README's **Live** link will land. It is
the viewport that drops the orientation copy.

**Fix.** Code. Show the screen lede at all widths, or move it into the
heading block. Left for the owner.

---

<a id="l-13"></a>

## L-13 — Dock prints its primary metric's name twice

`img/desktop-03-dock.png` and `img/desktop-03-dock.txt`:

```
EXPECTED REGRET
EXPECTED REGRET
B
0.4
s/mi
```

The panel title and the metric label are the same string, stacked. Visible at
both viewports.

**Fix.** Code. Drop one. Left for the owner.

---

<a id="l-14"></a>

## L-14 — On the phone the wordmark sits between the content and the tab bar, cutting the last line

`img/phone-06-more.png`: the "Sailflow" wordmark renders as a strip
immediately above the bottom tab bar, over the scrolling content — the
sentence behind it reads "… still being built. It applies everywhere, not just
on this" and is cut mid-word. Same on `img/phone-01-landing.png`, where it
overlaps the hero caption "Sails lofted from the solved sections; hull
illustrative, not a measured J/70. Bend, sag and rake drawn true."

On the desktop the wordmark is in the left rail, where nothing scrolls under
it (`img/desktop-04-log.png`).

**Impact.** Cosmetic, but it is the app's own name doing the clipping, on the
viewport the brief calls mobile-first.

**Fix.** Code. Give the wordmark the tab bar's opaque background, or add its
height to the scroll container's bottom padding. Left for the owner.
