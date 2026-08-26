<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    open = $bindable(false),
    title,
    children,
  }: {
    open?: boolean;
    title?: string;
    children?: Snippet;
  } = $props();

  /* The heading was inside the dialog but not attached to it, so every sheet
     in the app — eighteen explainers, the gear chart, the tour — was announced
     as an unnamed dialog. */
  const uid = $props.id();

  let dialogEl: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialogEl) return;
    if (open && !dialogEl.open) dialogEl.showModal();
    if (!open && dialogEl.open) dialogEl.close();
  });

  function onDialogClose(): void {
    open = false;
  }

  function onBackdropClick(e: MouseEvent): void {
    if (e.target === dialogEl) open = false;
  }
</script>

<dialog
  bind:this={dialogEl}
  onclose={onDialogClose}
  onclick={onBackdropClick}
  class="sheet"
  aria-labelledby={title ? `${uid}-title` : undefined}
>
  <div class="sheet-content">
    {#if title}<h2 id="{uid}-title">{title}</h2>{/if}
    {@render children?.()}
  </div>
</dialog>

<style>
  .sheet {
    border: none;
    padding: 0;
    margin: auto auto 0;
    width: 100%;
    max-width: 480px;
    border-radius: var(--radius) var(--radius) 0 0;
    background: var(--bg);
    color: var(--ink);
  }

  .sheet::backdrop {
    background: rgb(0 0 0 / 0.4);
  }

  .sheet-content {
    padding: var(--space-4);
    padding-bottom: max(var(--space-4), env(safe-area-inset-bottom));
  }

  h2 {
    margin: 0 0 var(--space-3);
    font-size: var(--text-lg);
  }
</style>
