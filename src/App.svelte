<script lang="ts">
  import './app.css';
  import { KIT_ENABLED, router } from './ui/router.svelte';
  import { settings } from './ui/stores/settings.svelte';
  import BottomNav from './ui/components/BottomNav.svelte';
  import NavRail from './ui/components/NavRail.svelte';
  // The Simulator's two halves stay static: the cockpit is the default route,
  // and Dock is the same page's temporary `sim/dock` sub-path until the Rig
  // panel absorbs it (ADR 0021, plan phase 04). Log, Drills and More are
  // dynamic (audit ux-03 M-23) — see the markup below.
  import Race from './ui/screens/Race.svelte';
  import Dock from './ui/screens/Dock.svelte';
  import Toast from './ui/components/Toast.svelte';
  import { conditions } from './ui/stores/conditions.svelte';
  import { race } from './ui/race/store.svelte';
  import { dock } from './ui/dock/store.svelte';
  import { readSession, writeSession } from './ui/scenario';
  import { decodeShare, encodeShare } from './ui/share';
  import { tour } from './ui/onboarding/tour.svelte';

  $effect(() => {
    const theme = settings.theme === 'auto' ? undefined : settings.theme;
    if (theme) document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');
  });

  // The density tier on <html> alongside data-theme, so CSS can vary spacing
  // and what it hides per tier without a component reading the store.
  $effect(() => {
    document.documentElement.setAttribute('data-tier', settings.mode);
  });

  $effect(() => {
    const motion = settings.motion;
    if (motion === 'system') document.documentElement.removeAttribute('data-motion');
    else document.documentElement.setAttribute('data-motion', motion);
  });

  // --- Scenario: URL and session (audit ux-02 M-05) ------------------------
  // Storage first, then the URL over the top: a link someone sent you beats
  // whatever this browser was last doing, and a plain `#/sim` keeps the
  // session it had. Both are validated in `scenario.ts`; nothing here trusts
  // either enough to skip that.
  function restore(): void {
    const stored = readSession();
    if (stored.condition) Object.assign(conditions, stored.condition);
    if (stored.race) Object.assign(race.controls.race, stored.race);
    if (stored.forecast) Object.assign(dock.forecast, stored.forecast);
    applyUrl();
  }

  /**
   * A share link is applied on the whole Simulator, both halves (ADR 0019): an
   * old `#/dock` link carries a forecast and a rig, a `#/race` link carries a
   * trim, and both live in stores the whole app reads. What a link never sets
   * is the *rig the cockpit solves* — that is the recipient's own committed
   * tune under class rule C.9.5, and `race.syncDock` would overwrite it anyway.
   */
  function applyUrl(): void {
    if (router.route !== 'sim') return;
    const {
      boat,
      condition,
      race: trim,
      down,
      dock: setup,
      forecast,
      tier,
    } = decodeShare(router.params);
    // The class first, and nothing else on this pass: every value below is in
    // the named class's units, and the stores were seeded from the previous
    // one. The reload re-enters here with the same URL and the right boat, so
    // the trim is applied exactly once, against the class that owns it.
    // `decodeShare` only ever returns a registered id, so this cannot loop.
    if (boat && boat !== settings.boatId) {
      settings.setBoatId(boat);
      location.reload();
      return;
    }
    // A link that names the kite but carries no `r=` has specified the sail
    // plan and not the trim, so it lands on the trim for that sail plan rather
    // than on a beat's mainsheet with a spinnaker up (`race.hoistKite`).
    if (condition.sailset === 'asym' && conditions.sailset !== 'asym' && !trim) race.hoistKite();
    Object.assign(conditions, condition);
    if (trim) Object.assign(race.controls.race, trim);
    if (down && race.controls.down) Object.assign(race.controls.down, down);
    if (setup) Object.assign(dock.setup, setup);
    if (forecast) Object.assign(dock.forecast, forecast);
    if (tier) settings.setMode(tier);
  }

  restore();

  $effect(() => {
    window.addEventListener('hashchange', applyUrl);
    return () => window.removeEventListener('hashchange', applyUrl);
  });

  // One debounced writer for both sinks: a slider drag must not put sixty
  // entries in history or sixty writes through localStorage.
  const WRITE_MS = 400;
  let writeTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const condition = conditions.value;
    const trim = $state.snapshot(race.controls.race);
    const down = $state.snapshot(race.controls.down);
    const setup = $state.snapshot(dock.setup);
    const forecast = $state.snapshot(dock.forecast);
    const tier = settings.mode;
    const shareable = router.route === 'sim';
    clearTimeout(writeTimer);
    writeTimer = setTimeout(() => {
      writeSession({ condition, race: trim, forecast });
      // Merged over whatever is already there, so the hero's own `?view=` and
      // `?freeze=` survive a slider drag rewriting the trim.
      if (shareable) {
        router.replaceParams({
          ...router.params,
          ...encodeShare({
            boat: settings.boatId,
            condition,
            race: trim,
            down,
            dock: setup,
            forecast,
            tier,
          }),
        });
      }
    }, WRITE_MS);
    return () => clearTimeout(writeTimer);
  });

  // A new build is precached. The service worker takes over on the next
  // navigation either way (`registerType: 'autoUpdate'`), so this is an
  // in-app toast with a shortcut, not the blocking confirm() it replaces.
  let updateReady = $state(false);

  $effect(() => {
    // PROD-gated so `pnpm dev` skips SW churn; the virtual module only exists
    // in a real build, hence the dynamic import and the catch.
    if (!import.meta.env.PROD) return;
    void import('virtual:pwa-register')
      .then(({ registerSW }) => registerSW({ onNeedRefresh: () => (updateReady = true) }))
      .catch((err: unknown) => console.warn('PWA registration failed', err));
  });
</script>

<!-- Both navigations are always rendered; CSS picks one at 1024 px. No JS
     breakpoint state, so there is nothing to get out of sync on resize. -->
<div class="shell">
  <div class="rail-slot"><NavRail /></div>

  <main class:cockpit-wide={router.route === 'sim' && router.params.sub !== 'dock'}>
    {#if router.route === 'sim'}
      <!-- One route, two halves for now: `#/sim/dock` is where an old `#/dock`
           link lands so nothing is lost mid-plan. Phase 04 folds the Dock into
           the Rig panel and this branch goes with it (ADR 0021). Any other
           sub-path falls through to the cockpit rather than a blank screen. -->
      {#if router.params.sub === 'dock'}
        <Dock />
      {:else}
        <Race />
      {/if}
      <!-- Log, Drills and More are secondary tabs: a visitor lands on the
           Simulator and most never open them, so they are chunks fetched on
           navigation rather than entry-chunk weight everyone pays for
           (ux-03 M-23). The service worker precaches them, so an offline dock
           still opens them. -->
    {:else if router.route === 'log'}
      {#await import('./ui/screens/Log.svelte') then Log}
        <Log.default />
      {/await}
    {:else if router.route === 'drills'}
      {#await import('./ui/screens/Drills.svelte') then Drills}
        <Drills.default />
      {/await}
    {:else if router.route === 'more'}
      {#await import('./ui/screens/More.svelte') then More}
        <More.default />
      {/await}
    {:else if KIT_ENABLED && router.route === 'kit'}
      <!-- Component-demo state with invented numbers. Dev always, production
           only behind `?kit=1` (see KIT_ENABLED in router.svelte.ts), so the
           layout smoke can reach it. It stays a dynamic import, so a normal
           production visit never downloads the chunk (L-01). -->
      {#await import('./ui/screens/Kit.svelte') then Kit}
        <Kit.default />
      {/await}
    {/if}
  </main>

  <div class="tabbar-slot"><BottomNav /></div>
</div>

<!-- First run only, and a chunk rather than entry weight: `tour.mounted` starts
     false for anyone who has dismissed it, so a returning visitor never
     fetches this. The `await` is unresolved while the chunk loads, so the
     cockpit paints and the first solve runs behind it. `mounted` and not
     `open`: see `tour.svelte.ts`. -->
{#if tour.mounted}
  {#await import('./ui/onboarding/Tour.svelte') then Tour}
    <Tour.default />
  {/await}
{/if}

<Toast
  message="A new version of Sailflow is ready."
  bind:open={updateReady}
  durationMs={20000}
  action={{ label: 'Reload', onclick: () => location.reload() }}
/>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    flex: 1;
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
    padding-inline: max(var(--gutter), env(safe-area-inset-left));
    padding-block: var(--space-4) var(--space-8);
    padding-top: max(var(--space-4), env(safe-area-inset-top));
  }

  .rail-slot {
    display: none;
  }

  /* The tab bar, not the <nav> inside it, is the sticky box: the wrapper is a
     flex child of .shell, so it has the full page height to slide along. */
  .tabbar-slot {
    position: sticky;
    bottom: 0;
    z-index: 5;
  }

  @media (min-width: 720px) {
    main {
      max-width: 900px;
    }
  }

  @media (min-width: 1024px) {
    .shell {
      padding-left: var(--rail-w);
    }

    .rail-slot {
      display: block;
    }

    .tabbar-slot {
      display: none;
    }

    main {
      max-width: var(--content-max);
      padding-block: var(--space-6);
    }

    /* The cockpit only: it fills the window past the rail up to its own cap.
       A 1920 px monitor was giving 640 px of it back to the margins while the
       panels scrolled inside themselves (ADR 0016, audit ux-03 M-01). */
    main.cockpit-wide {
      max-width: var(--cockpit-max);
    }
  }
</style>
