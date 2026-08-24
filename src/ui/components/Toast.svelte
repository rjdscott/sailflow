<script lang="ts">
  let {
    message,
    open = $bindable(false),
    durationMs = 3000,
  }: {
    message: string;
    open?: boolean;
    durationMs?: number;
  } = $props();

  $effect(() => {
    if (!open) return;
    const t = setTimeout(() => (open = false), durationMs);
    return () => clearTimeout(t);
  });
</script>

{#if open}
  <div class="toast" role="status" aria-live="polite">
    {message}
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    left: 50%;
    bottom: calc(56px + var(--space-4) + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    background: var(--ink);
    color: var(--bg);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius);
    font-size: var(--text-sm);
    max-width: calc(100% - var(--space-8));
    text-align: center;
    z-index: 10;
  }
</style>
