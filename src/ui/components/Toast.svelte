<script lang="ts">
  let {
    message,
    open = $bindable(false),
    durationMs = 3000,
    action,
  }: {
    message: string;
    open?: boolean;
    durationMs?: number;
    /** Optional single action, e.g. "Reload" on the PWA update toast. */
    action?: { label: string; onclick: () => void };
  } = $props();

  $effect(() => {
    if (!open) return;
    const t = setTimeout(() => (open = false), durationMs);
    return () => clearTimeout(t);
  });
</script>

{#if open}
  <div class="toast" role="status" aria-live="polite">
    <span>{message}</span>
    {#if action}
      <button type="button" onclick={action.onclick}>{action.label}</button>
    {/if}
  </div>
{/if}

<style>
  .toast {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
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

  .toast button {
    flex: none;
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border: 1px solid currentColor;
    border-radius: var(--radius);
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
</style>
