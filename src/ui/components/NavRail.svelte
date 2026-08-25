<script lang="ts">
  import { router } from '../router.svelte';
  import { navItems } from './navItems';

  // Real links, not buttons: the rail is a set of destinations, so it is
  // middle-clickable, copyable and keyboard-navigable as one (phase 06).
  const items = $derived(navItems(router.route));
</script>

<nav class="nav-rail" aria-label="Primary">
  <!-- The product name, once, where every screen can see it (audit ux-02 M-01). -->
  <p class="wordmark">Sailflow</p>
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

  a {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-height: 60px;
    padding: var(--space-1);
    color: var(--ink-2);
    font-size: var(--text-xs);
    text-decoration: none;
  }

  /* Active state bar on the rail edge, so the current screen is legible from
     the corner of your eye without relying on colour alone. 3 px of --accent,
     which the token gate holds at 3:1 on --surface in both palettes. */
  a.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: var(--accent);
  }

  a.active {
    color: var(--accent);
  }
</style>
