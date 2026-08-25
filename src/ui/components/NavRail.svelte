<script lang="ts">
  import { router } from '../router.svelte';
  import { NAV_ITEMS } from './navItems';
</script>

<nav class="nav-rail" aria-label="Primary">
  <!-- The product name, once, where every screen can see it (audit ux-02 M-01). -->
  <p class="wordmark">Sailflow</p>
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
  .nav-rail {
    position: fixed;
    inset-block: 0;
    left: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-1);
    width: var(--rail-w);
    padding-block: var(--space-4);
    background: var(--surface);
    border-right: 1px solid var(--line);
  }

  .wordmark {
    margin: 0 0 var(--space-2);
    color: var(--ink-2);
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.02em;
    text-align: center;
  }

  button {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-height: 60px;
    padding: var(--space-1);
    background: none;
    border: none;
    color: var(--ink-2);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  /* Active state bar on the rail edge, so the current screen is legible from
     the corner of your eye without relying on colour alone. */
  button.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: var(--accent);
  }

  button.active {
    color: var(--accent);
  }
</style>
