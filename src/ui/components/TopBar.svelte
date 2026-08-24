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

<header class="screen-head">
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
  .left,
  .right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
</style>
