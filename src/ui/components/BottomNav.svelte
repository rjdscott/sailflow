<script lang="ts">
  import { router } from '../router.svelte';
  import { NAV_ITEMS } from './navItems';
</script>

<!-- The product name, once, above the tabs (audit ux-02 M-01). -->
<p class="wordmark">Sailflow</p>

<nav class="bottom-nav" aria-label="Primary">
  {#each NAV_ITEMS as tab (tab.route)}
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
        <path d={tab.icon} />
      </svg>
      <span>{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .wordmark {
    margin: 0;
    padding: 2px 0;
    background: var(--surface);
    border-top: 1px solid var(--line);
    color: var(--ink-2);
    font-size: var(--text-xs);
    font-weight: 700;
    text-align: center;
  }

  .bottom-nav {
    display: flex;
    height: 56px;
    background: var(--surface);
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
