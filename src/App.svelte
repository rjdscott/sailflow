<script lang="ts">
  import './app.css';
  import { router } from './ui/router.svelte';
  import { settings } from './ui/stores/settings.svelte';
  import BottomNav from './ui/components/BottomNav.svelte';
  import NavRail from './ui/components/NavRail.svelte';
  import Race from './ui/screens/Race.svelte';
  import Dock from './ui/screens/Dock.svelte';
  import Log from './ui/screens/Log.svelte';
  import Drills from './ui/screens/Drills.svelte';
  import More from './ui/screens/More.svelte';
  import Kit from './ui/screens/Kit.svelte';

  $effect(() => {
    const theme = settings.theme === 'auto' ? undefined : settings.theme;
    if (theme) document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');
  });
</script>

<!-- Both navigations are always rendered; CSS picks one at 1024 px. No JS
     breakpoint state, so there is nothing to get out of sync on resize. -->
<div class="shell">
  <div class="rail-slot"><NavRail /></div>

  <main>
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
    {:else if router.route === 'kit'}
      <Kit />
    {/if}
  </main>

  <div class="tabbar-slot"><BottomNav /></div>
</div>

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
  }
</style>
