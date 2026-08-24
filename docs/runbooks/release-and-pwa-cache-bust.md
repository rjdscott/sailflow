# Release and PWA cache bust

## When to use

Cutting a release, or a user reports "the app looks stuck on an old
version" after a deploy. Covers how the service worker updates itself, and
the one manual escape hatch when it doesn't.

## How the update path works (read this before you "fix" anything)

`vite-plugin-pwa` is configured with `registerType: 'autoUpdate'`
(`vite.config.ts`). On every build, Workbox fingerprints every asset and
writes a fresh `dist/sw.js` with `self.skipWaiting()` and `clientsClaim()`
baked in — confirm with:

```bash
grep -o 'self.skipWaiting(),[a-zA-Z.]*clientsClaim()' dist/sw.js
```

That means a new service worker installs and takes control of already-open
tabs without waiting for them to close. `src/main.ts` registers
`virtual:pwa-register` and calls `registerSW({ onNeedRefresh })`; when the
browser detects a new `sw.js` mid-session, `onNeedRefresh` fires a
`confirm()` and reloads the page on "OK". So in the normal case, **cache
busting is automatic**: bump the version, deploy, and open tabs get prompted
within one Workbox update check (on load, and periodically thereafter).

## Steps

1. Bump the version — this is the number shown in More → "Sailflow v…"
   (`src/ui/screens/More.svelte`, sourced from `import.meta.env.VITE_APP_VERSION`,
   injected in `vite.config.ts` from `package.json`):

   ```bash
   pnpm version --no-git-tag-version patch   # or minor / major
   ```

2. Build and confirm the precache manifest actually changed (new content
   hashes force every asset URL to differ, which is what makes the update
   detectable at all):

   ```bash
   GITHUB_PAGES=1 pnpm build
   grep -o '"assets/index-[a-zA-Z0-9_-]*\.js"' dist/sw.js
   ```

3. Deploy as usual (`deploy-to-github-pages.md`). Once live, a tab that was
   already open picks up the new `sw.js` on its next Workbox update check
   (page load, or the browser's background interval) and shows the reload
   confirm from step "How the update path works" above.

4. **Manual bust**, if a user is stuck anyway (stale tab that was never
   revisited, or a bug in the update flow): have them do one of —
   - Close every tab for the site, then reopen it (a fully closed PWA drops
     the old service worker's held clients).
   - DevTools → Application → Service Workers → Unregister, then hard
     reload.
   - On iOS Safari (PWA installed to home screen, no devtools): remove the
     app from the home screen and re-add it. There is no in-app "clear
     cache" affordance; don't build one speculatively before it's needed.

## Failure modes

- **Version number in More doesn't change after a release.** `npm version`
  only rewrites `package.json`; if the build ran before the version bump
  (stale terminal, cached CI checkout) the injected constant is the old
  number. Confirm with `grep '"version"' package.json` before building.
- **`onNeedRefresh` never fires, even after a real deploy.** Workbox only
  checks for an updated `sw.js` on navigation and roughly every hour in the
  background — it is not instant. Force a check without waiting: DevTools →
  Application → Service Workers → "Update" (or reload the tab).
- **Reload loop / "new version available" every reload.** Two service
  workers registered for different scopes (e.g. once at `/` from a local
  `pnpm preview` and once at `/sailflow/` from Pages) fight over the same
  origin in dev tools. Unregister both and reload once.

## Last verified

- **Last verified:** 2026-08-25 against a55d993. `self.skipWaiting()` /
  `clientsClaim()` and the precache manifest were confirmed by grepping a
  local `GITHUB_PAGES=1 pnpm build` output. The live "stuck on an old
  version" recovery steps have not been exercised against a real deploy in
  this pass.
