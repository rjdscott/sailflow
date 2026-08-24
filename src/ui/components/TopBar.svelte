<script lang="ts">
  import type { Snippet } from 'svelte';
  import Toggle from './Toggle.svelte';

  let {
    title,
    lock,
    tier,
  }: {
    title: string;
    lock?: Snippet;
    tier?: Snippet;
  } = $props();
</script>

<header class="top-bar">
  <div class="left">
    <h1>{title}</h1>
    {#if lock}{@render lock()}{/if}
  </div>
  <div class="right">
    {#if tier}{@render tier()}{/if}
    <Toggle />
  </div>
</header>

<style>
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: var(--hit-min);
    padding-block: var(--space-2);
  }

  .left,
  .right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  h1 {
    margin: 0;
    font-size: var(--text-lg);
  }
</style>
