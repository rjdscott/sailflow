<script lang="ts">
  import { router, type Route } from '../router.svelte';

  const tabs: { route: Route; label: string }[] = [
    { route: 'race', label: 'Race' },
    { route: 'dock', label: 'Dock' },
    { route: 'log', label: 'Log' },
    { route: 'drills', label: 'Drills' },
    { route: 'more', label: 'More' },
  ];

  const icons: Record<string, string> = {
    race: 'M4 18 L12 4 L20 18 L12 14 Z',
    dock: 'M3 20 L21 20 M6 20 V8 L18 8 V20 M9 8 V4 H15 V8',
    log: 'M5 3 H19 V21 L12 18 L5 21 Z',
    drills: 'M12 3 V21 M5 8 H19 M5 16 H19',
    more: 'M5 12 H5.01 M12 12 H12.01 M19 12 H19.01',
  };
</script>

<nav class="bottom-nav" aria-label="Primary">
  {#each tabs as tab (tab.route)}
    <button
      type="button"
      class:active={router.route === tab.route}
      aria-current={router.route === tab.route ? 'page' : undefined}
      onclick={() => router.navigate(tab.route)}
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d={icons[tab.route]} />
      </svg>
      <span>{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .bottom-nav {
    position: sticky;
    bottom: 0;
    display: flex;
    height: 56px;
    background: var(--surface);
    border-top: 1px solid color-mix(in srgb, var(--ink) 12%, transparent);
    padding-bottom: env(safe-area-inset-bottom);
  }

  button {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-height: var(--hit-min);
    background: none;
    border: none;
    color: var(--ink-2);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  button.active {
    color: var(--accent);
  }
</style>
