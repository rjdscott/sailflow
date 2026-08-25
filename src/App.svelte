<script lang="ts">
  import './app.css';
  import { KIT_ENABLED, router } from './ui/router.svelte';
  import { settings } from './ui/stores/settings.svelte';
  import BottomNav from './ui/components/BottomNav.svelte';
  import NavRail from './ui/components/NavRail.svelte';
  import Race from './ui/screens/Race.svelte';
  import Dock from './ui/screens/Dock.svelte';
  import Log from './ui/screens/Log.svelte';
  import Drills from './ui/screens/Drills.svelte';
  import More from './ui/screens/More.svelte';
  import Toast from './ui/components/Toast.svelte';
  import { conditions } from './ui/stores/conditions.svelte';
  import { race } from './ui/race/store.svelte';
  import { dock } from './ui/dock/store.svelte';
  import { decodeScenario, encodeScenario, readSession, writeSession } from './ui/scenario';

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
  // whatever this browser was last doing, and a plain `#/race` keeps the
  // session it had. Both are validated in `scenario.ts`; nothing here trusts
  // either enough to skip that.
  function restore(): void {
    const stored = readSession();
    if (stored.condition) Object.assign(conditions, stored.condition);
    if (stored.race) Object.assign(race.controls.race, stored.race);
    if (stored.forecast) Object.assign(dock.forecast, stored.forecast);
    applyUrl();
  }

  function applyUrl(): void {
    if (router.route !== 'race') return;
    const { condition, race: trim } = decodeScenario(router.params);
    Object.assign(conditions, condition);
    if (trim) Object.assign(race.controls.race, trim);
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
    const forecast = $state.snapshot(dock.forecast);
    const onRace = router.route === 'race';
    clearTimeout(writeTimer);
    writeTimer = setTimeout(() => {
      writeSession({ condition, race: trim, forecast });
      if (onRace) router.replaceParams(encodeScenario(condition, trim));
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

  <main class:cockpit-wide={router.route === 'race'}>
    {#if router.route === 'race'}
      <Race />
    {:else if router.route === 'dock'}
      <Dock />
    {:else if router.route === 'log'}
      <Log />
    {:else if router.route === 'drills'}
      <Drills />
    {:else if router.route === 'more'}
      <More />
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

    /* Race only: the cockpit fills the window past the rail up to its own cap.
       A 1920 px monitor was giving 640 px of it back to the margins while the
       panels scrolled inside themselves (ADR 0016, audit ux-03 M-01). */
    main.cockpit-wide {
      max-width: var(--cockpit-max);
    }
  }
</style>
