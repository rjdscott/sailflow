<script lang="ts">
  import type { Snippet } from 'svelte';
  import Toggle from './Toggle.svelte';

  let {
    title,
    lock,
    tier,
    mode = false,
  }: {
    title: string;
    lock?: Snippet;
    tier?: Snippet;
    /** Show the Simple/Advanced chip. Opt-in: it is a global setting that
        lives in More, and on a screen it does not change it reads as broken
        (audit ux-02 M-12). */
    mode?: boolean;
  } = $props();
</script>

<header class="screen-head">
  <div class="left">
    <h1>{title}</h1>
    {#if lock}{@render lock()}{/if}
  </div>
  <div class="right">
    {#if tier}{@render tier()}{/if}
    {#if mode}<Toggle />{/if}
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
