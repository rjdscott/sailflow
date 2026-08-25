<script lang="ts">
  import { router } from '../router.svelte';
  import { navItems } from './navItems';

  const items = $derived(navItems(router.route));
</script>

<!-- The product name, once, above the tabs (audit ux-02 M-01). -->
<p class="wordmark">Sailflow</p>

<nav class="bottom-nav" aria-label="Primary">
  {#each items as tab (tab.route)}
    <a href={tab.href} class:active={tab.current} aria-current={tab.current ? 'page' : undefined}>
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
    </a>
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

  a {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-height: var(--hit-min);
    color: var(--ink-2);
    font-size: var(--text-xs);
    text-decoration: none;
  }

  /* Same 3 px indicator as the rail, on the edge nearest the content, so the
     current tab is not colour alone (research §3 principle 10). */
  a.active::before {
    content: '';
    position: absolute;
    top: 0;
    left: var(--space-3);
    right: var(--space-3);
    height: 3px;
    border-radius: 0 0 3px 3px;
    background: var(--accent);
  }

  a.active {
    color: var(--accent);
  }
</style>
