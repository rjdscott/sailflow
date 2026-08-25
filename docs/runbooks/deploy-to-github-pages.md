# Deploy to GitHub Pages

## When to use

After merging to `main`, or to check the Pages deploy is configured
correctly on a fresh repo. Deploys are automatic; this runbook is for
verifying and troubleshooting, not for triggering one by hand.

## Steps

1. Deploys are automatic on every push to `main`, via
   `.github/workflows/pages.yml`. Nothing reaches `main` without `ci.yml`
   green on the PR, and that includes the `ui-smoke` job: a production build
   and the Playwright suite (`pnpm test:ui`) in the pinned
   `mcr.microsoft.com/playwright:v1.62.1-noble` image, with the 3D hero
   screenshot baseline under `tests/ui/race-3d.spec.ts-snapshots/`. A
   baseline that drifts on purpose is regenerated in that same image:

   ```bash
   docker run --rm --ipc=host -v "$PWD":/w -w /w -e CI=1 \
     mcr.microsoft.com/playwright:v1.62.1-noble npx playwright test --update-snapshots=all
   ```
 To trigger one without a push:

   ```bash
   gh workflow run pages.yml
   gh run watch
   ```

2. The workflow builds with the Pages base path, so the `<script>`/`<link>`
   tags and the manifest resolve under `/sailflow/`, not `/`:

   ```bash
   GITHUB_PAGES=1 pnpm build
   ```

   Confirm the base path landed:

   ```bash
   grep -o 'src="/sailflow/assets/[^"]*"' dist/index.html
   grep -o '"start_url":"[^"]*"' dist/manifest.webmanifest   # "./" — base-agnostic on purpose
   ```

3. One-time repo setup, if Pages has never been enabled: Settings → Pages →
   Source → "GitHub Actions". Without this the workflow's `deploy` job fails
   with `Get Pages site failed`. Check current state:

   ```bash
   gh api repos/rjdscott/sailflow/pages --jq '.html_url, .source'
   # https://rjdscott.github.io/sailflow/
   # {"branch":"main","path":"/"}
   ```

4. Verify the live deploy after the workflow finishes:

   ```bash
   gh run list --workflow=pages.yml --limit 1
   curl -sI https://rjdscott.github.io/sailflow/ | head -1   # HTTP/2 200
   ```

5. Offline check on a phone (no browser automation available for this —
   walk it by hand): open the Pages URL, let it load fully once, put the
   phone in airplane mode, reload. The app should still load — that is
   acceptance criterion 1 from `docs/initial-prompt.md`.

## Failure modes

- **`Get Pages site failed. Please verify that the repository has Pages
  enabled`**: Pages source is not set to "GitHub Actions" yet. Fix in
  Settings → Pages, then re-run the workflow (step 1).
- **Deployed site 404s on every asset, or shows the dev-mode `/` build**:
  the workflow built without `GITHUB_PAGES=1`, so assets point at `/assets/`
  instead of `/sailflow/assets/`. Check the `build` step in
  `.github/workflows/pages.yml` still sets the env var.
- **Deployed site loads once, then a later visit shows a mix of old and new
  assets (blank page, console errors about missing chunks)**: a stale
  service worker served an old `index.html` pointing at asset hashes the new
  deploy deleted. See `release-and-pwa-cache-bust.md` — this is the
  documented cache-bust path, not a Pages problem.
- **`gh workflow run pages.yml` errors `HTTP 404: Not Found`**: run it from
  a clone with the workflow already on `main` (the workflow file must exist
  on the default branch to be dispatchable), or pass `--ref <branch>`.

## Last verified

- **Last verified:** 2026-08-25 against 44212a3.
- Detail: step 1's CI gate and step 4 re-run after PR #65. Earlier pass, against a55d993: Step 2's build and grep were
  run locally. Steps 3 and 4 were confirmed against the live repo: Pages is
  enabled with source `{"branch":"main","path":"/"}` at
  `https://rjdscott.github.io/sailflow/`, and `gh run list --workflow=pages.yml`
  shows recent runs completing `success`. Step 1 (`gh workflow run`) and the
  step 5 phone offline check were not executed in this pass.
