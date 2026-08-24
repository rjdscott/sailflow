# Phase 09: Desktop layout and visual excellence

- **Status:** 🟡 In progress

## Goal

The app reads as one calm, tasteful instrument on a 390 px phone in sunlight
and on a 1440 px laptop where people study for weeks before a regatta. No
clipped drawings, no labels colliding with curves, no dead whitespace, no
wrapped numerals. Desktop is a real layout, not a stretched phone column.

## Design spec (binding for this phase)

### Layout
- Breakpoints: `sm` < 720 (phone), `md` 720–1023 (tablet, two columns),
  `lg` ≥ 1024 (desktop: 72 px left nav rail + content, max content width
  1280, 24 px gutters). Bottom tab bar on `sm`/`md`; left rail on `lg` with
  the same five items, icon + label, active state bar.
- Screen grid on `lg`: `.screen` is `grid-template-columns: 7fr 5fr` with
  named areas; primary column = pictures/hero, secondary = controls/forms.
  Cards (`.card`) are the only container: `--surface` bg, 12 px radius,
  1 px `--line` border, 16/20 px padding, no drop shadows.
- Vertical rhythm 8 px; section titles 12 px uppercase tracking 0.06em
  `--ink-2`; never more than two type sizes on one card.

### Type and colour
- Numerals: `font-variant-numeric: tabular-nums`; hero readouts 40/44 px
  with unit in 14 px `--ink-2` on the same line (`5.2 kt`, `42°`,
  `3.87 kt`). Labels 13 px. Body 15 px.
- Palette: ink on white/surface; one accent for interactive; `--good`,
  `--warn`, `--bad` only for meaning. Add `--line` (hairline) and `--muted`
  (fill for tracks/axes) tokens. Sail/rig drawings use `--ink` strokes with
  `--accent` for the flying shape only; guide/reference geometry in
  `--muted`.
- Dark theme: same structure; surfaces `#141A22`, lines `#26303B`.

### Race screen
- Top: title row (screen name, Simple/Advanced segmented). Conditions as a
  single chip row (`10 kt · 42° · Ripple · 300 kg`) with an `Edit` chip;
  presets move into the conditions sheet.
- Hero band (`.card`): three readouts in a row (BSP, TWA as "Height", VMG)
  each with a tier badge; a second quiet row heel · leeway · AWA · flat.
- Pictures: a tabbed card (Sections | Rig | Plan) on `sm`; on `lg` the
  three pictures sit side by side in the primary column, each in its own
  card with a 4:3 fixed aspect; drawings scale to the card (SVG
  `viewBox` + `width:100%`), never clip, never overflow.
- **SailSections**: per sail, three stacked sections ¼ ½ ¾ (¾ on top),
  identical chord length, curves drawn from a common luff line, twist shown
  as rotation about the luff. Draft/position/twist numbers go in a compact
  table under the drawing (mono 12 px), never on the curve. A faint
  reference shape (base trim) in `--muted` behind the live curve.
- **RigElevation**: mast, boom, forestay sag (×5 badge), rake arrow; three
  numbers under the drawing.
- **PlanView**: hull, sails, TWA/AWA arrows with labels, four telltales.
- Coach line: an "insight" card with a small icon, one sentence, and a
  "why" disclosure; never the phrase "noise floor".
- Controls: grouped cards (Sheets, Rig, Halyards, Downwind); each slider row
  = label, value, track with tick at guide/base, ? button 36 px inside a
  44 px hit area. Simple mode shows five; Advanced all.

### Dock screen
- `lg`: forecast card + rig sliders in the secondary column; regret hero
  card (big number, "at 8 kt / at 16 kt" pair, sparkline with axis labels)
  and the per-TWS table in the primary column. Commit is a sticky footer
  action on `sm`, an inline primary button on `lg`.

### Log / Drills / More
- Log: entries as cards with a two-line summary; `lg` list left, editor
  right. Drills: 2-column card grid on `md`, 3 on `lg`; drill view = Race
  layout with locked controls muted. More: settings groups as cards.

### Accessibility and motion
- 44 px targets, visible focus rings (`--accent` 2 px outline offset 2),
  contrast ≥ 4.5:1 text and ≥ 3:1 UI, `prefers-reduced-motion` honoured,
  landmarks (`nav`, `main`, `h1` per screen), tab order sane.

## Tasks

- [x] Tokens + shell: `--line`, `--muted`, breakpoints, left rail on `lg`, `.screen`/`.card` primitives, focus rings [O]
- [x] Race screen rebuilt to spec incl. SailSections/RigElevation/PlanView redraw [O]
- [ ] Dock, Log, Drills, More desktop layouts to spec [O]
- [ ] Browser verification at 390 and 1440, light and dark, all five screens; defects logged here
- [ ] `make check` green; deploy; live check

## Verification

```bash
make check
pnpm build && pnpm preview   # 390×844 and 1440×900, both themes, every screen
```

## Artifacts

`src/app.css`, `src/ui/tokens.css`, `src/App.svelte`, `src/ui/components/NavRail.svelte`, redrawn `src/ui/race/*.svelte`, screen layouts.

## Progress log

- 2026-08-25 — Phase added after owner review of the live Race screen (clipped sections, colliding labels, dead whitespace) and the requirement that desktop study sessions are first-class. Spec above written by Fable; executed by two Opus agents in worktrees (shell + Race; other screens).
- 2026-08-25 — Shell + Race shipped. Tokens gained `--line`, `--muted`,
  `--font-mono`, `--rail-w`, `--content-max`, `--gutter`; `src/app.css` now
  carries the shared class contract (`.screen`, `.col-primary`,
  `.col-secondary`, `.screen-head`, `.stack`, `.card`, `.section-title`,
  `.hero-number`/`.hero-unit`, `.chip-row`/`.chip`, `.hit-44`, `.mono`,
  `.lg-only`/`.lg-hide`). `NavRail.svelte` and `BottomNav.svelte` share
  `components/navItems.ts`; both render always and CSS picks one at 1024, so
  there is no JS breakpoint state. Race rebuilt: conditions chip row (presets
  moved into the sheet), tabbed pictures on phone, hero plan-view card plus a
  sections/rig pair on desktop, sticky metrics strip in the secondary column,
  insight card with a "why" disclosure. Drawings redrawn resolution-independent
  (`viewBox` + `width:100%; height:auto`), every number moved off the curves
  into tables underneath. `SECTION_LAYOUT` in `race/geometry.ts` is the single
  source of the section-drawing numbers and `geometry.test.ts` proves no
  clamped section escapes the viewBox — that test caught real clipping at the
  first row spacing. Browser verification (task 4) still outstanding: this was
  executed without a browser.
