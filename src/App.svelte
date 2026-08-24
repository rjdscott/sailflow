<script lang="ts">
  import './app.css';
  import { router } from './ui/router.svelte';
  import { settings } from './ui/stores/settings.svelte';
  import BottomNav from './ui/components/BottomNav.svelte';
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

<div class="shell">
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
  <BottomNav />
</div>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    flex: 1;
    padding-block: var(--space-3);
  }
</style>
