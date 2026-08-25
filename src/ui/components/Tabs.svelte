<script lang="ts">
  import { rovingIndex } from './logic';

  /**
   * Tab strip with the keyboard model the `tablist` role promises: one tab
   * stop, arrows/Home/End move selection and focus (audit ux-01 M-17).
   *
   * It renders the strip only — the panels stay with the screen that owns
   * them, each `id="{idPrefix}-pane-{i}"` and `aria-labelledby="{idPrefix}-tab-{i}"`.
   */
  let {
    tabs,
    selected = $bindable(0),
    ariaLabel,
    idPrefix,
  }: {
    tabs: readonly string[];
    selected?: number;
    ariaLabel?: string;
    idPrefix: string;
  } = $props();

  let btns: HTMLButtonElement[] = [];

  function onKeyDown(e: KeyboardEvent): void {
    const next = rovingIndex(e.key, selected, tabs.length);
    if (next === null) return;
    e.preventDefault();
    selected = next;
    btns[next]?.focus();
  }
</script>

<div class="tabs" role="tablist" aria-label={ariaLabel}>
  {#each tabs as name, i (name)}
    <button
      bind:this={btns[i]}
      type="button"
      role="tab"
      id="{idPrefix}-tab-{i}"
      aria-selected={selected === i}
      aria-controls="{idPrefix}-pane-{i}"
      tabindex={selected === i ? 0 : -1}
      class:active={selected === i}
      onclick={() => (selected = i)}
      onkeydown={onKeyDown}
    >
      {name}
    </button>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    gap: var(--space-1);
    margin-bottom: var(--space-3);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--line);
  }

  button {
    flex: 1;
    min-height: var(--hit-min);
    border: none;
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink-2);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  button.active {
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
</style>
