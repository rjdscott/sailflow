# Reshoot the README screenshots

## When to use

The two images in `README.md` (`docs/img/sim-desktop.png`,
`docs/img/sim-phone.png`) no longer show what the app looks like — after a
layout change, a release, or a rename that puts stale words in the picture.
Not for the Playwright pixel baselines under `tests/ui/**-snapshots/`: those
are regenerated in a pinned docker image, see `deploy-to-github-pages.md`.

## Steps

1. Build the app the shots are of, and serve it on the port the tooling uses.
   **Without** `GITHUB_PAGES=1` — that build is based at `/sailflow/` and a
   preview of it serves a blank page at `/`:

   ```bash
   pnpm build
   npx vite preview --host 127.0.0.1 --port 4318 --strictPort
   ```

   Leave it running in its own terminal. If the port is busy, find out what is
   on it before reusing it (`ss -ltnp | grep 4318`): a preview of a *different*
   checkout will happily serve a different app and the shot will look right and
   be wrong.

2. Shoot the desktop image — the whole cockpit at 1440 px, which is where the
   two-column grid is (`.cockpit`, so the fixed nav rail is not in the frame):

   ```bash
   node scripts/screenshot.mjs --out docs/img/sim-desktop.png --width 1440
   ```

   Expect `wrote docs/img/sim-desktop.png (1440x900 @1x, race tier)` and a
   1320 × ~1920 file.

3. Shoot the phone image — 390 px wide at 2×, tall enough to carry the
   conditions, the boat's numbers and the picture. `--viewport` shoots the
   window rather than the `.cockpit` element, so the tab bar is in the frame:

   ```bash
   node scripts/screenshot.mjs --out docs/img/sim-phone.png \
     --width 390 --height 1180 --scale 2 --viewport 1
   ```

   Expect a 780 × 2360 file. Below 720 px nothing in the layout reads the
   viewport *height* (the hero is capped at `min(56vw, 300px)`), so a taller
   window shows more of the same page rather than a different one.

4. Look at both files before committing them. Then update the caption and the
   `alt` text in `README.md` if what they claim has changed — a caption that
   describes the previous screenshot is worse than no caption.

5. Other tiers and states, for a plan's progress log rather than the README:
   `--tier learn` (or `analyse`), `--url 'http://127.0.0.1:4318/#/log'`,
   `--selector '.bar'` for one band, `--scale 2` for a retina shot.

## Failure modes

- **`hero did not report ready; shooting anyway`, then a timeout on
  `.bar .cells`.** The preview is serving a `GITHUB_PAGES=1` build, or a build
  from another checkout. Rebuild with a plain `pnpm build` and restart the
  preview (2026-08-28, phase 05 — the release build for the cache-bust step
  was still in `dist/`).
- **The picture is the 2D plan view, not the 3D boat.** The script forces
  `sailflow.hero.v1 = '3d'`, but a machine with no working WebGL still falls
  back. Check `chromium --version` and run the UI suite first; if
  `tests/ui/race-3d.spec.ts` passes, the 3D path works on this box.
- **A `fullPage` shot has an empty left column.** The nav rail is fixed, so a
  stitched full-page capture paints it once. Shoot the `.cockpit` element
  (the default) or a viewport that fits what you want.
- **The numbers differ between two shots of the same build.** They should not:
  the store opens on `DEFAULT_CONDITION` and the solver is deterministic. If
  they do, the shot was taken before the optimum search landed — the script
  waits 3 s after the first solve, which is enough on a laptop and has not
  been exercised on a cold CI box.

## Last verified

- **Last verified:** 2026-08-28 against the phase 05 branch
  (`feat/simulator-polish-0-5-0`), by reshooting both README images with these
  exact commands.
